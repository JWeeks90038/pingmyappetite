import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, HeatmapLayer, Marker, InfoWindow } from '@react-google-maps/api';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { useGoogleMaps } from './MobileGoogleMapsWrapper';
import './EventOrganizerMap.css';

const LIBRARIES = ['visualization', 'places'];

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '10px',
  border: '2px solid #e0e0e0'
};

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795 // Center of USA
};

const EventOrganizerMap = ({ organizerData }) => {
  const { user } = useAuth();
  const { isLoaded: mapsLoaded, loadError: mapsError } = useGoogleMaps();
  const [map, setMap] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [events, setEvents] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [pingData, setPingData] = useState([]);
  const [truckNames, setTruckNames] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(4);
  const [isPlacingEvent, setIsPlacingEvent] = useState(false);
  const [tempEventMarker, setTempEventMarker] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEventData, setNewEventData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    isRecurring: false,
    recurringPattern: 'weekly', // weekly, monthly, daily
    recurringEndDate: ''
  });
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const heatmapRef = useRef(null);

  console.log('🗺️ EventOrganizerMap: Rendering with:', { 
    user: user?.uid, 
    eventsCount: events.length, 
    trucksCount: trucks.length,
    isMapLoaded,
    mapsLoaded,
    userLocation: userLocation ? 'DETECTED' : 'NOT_DETECTED',
    mapCenter,
    mapZoom,
    mapsError: mapsError?.message,
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'SET' : 'NOT SET',
    googleMapsAvailable: !!window.google?.maps
  });

  // Geolocation functionality to center map on user's location
  useEffect(() => {
    console.log('🌍 EventOrganizerMap: Attempting to get user location...');
    
    if (!navigator.geolocation) {
      console.log('⚠️ Geolocation not supported by this browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes cache
    };

    const successCallback = (position) => {
      const { latitude, longitude } = position.coords;
      console.log('✅ User location detected:', { latitude, longitude });
      
      const newLocation = { lat: latitude, lng: longitude };
      setUserLocation(newLocation);
      setMapCenter(newLocation);
      setMapZoom(12); // Zoom in when we have user location
      
      // If map is already loaded, update its center
      if (mapRef.current) {
        console.log('🗺️ Updating map center to user location');
        mapRef.current.panTo(newLocation);
        mapRef.current.setZoom(12);
      }
    };

    const errorCallback = (error) => {
      console.log('❌ Geolocation error:', error.message);
      // Use organizer's address if available as fallback
      if (organizerData?.latitude && organizerData?.longitude) {
        console.log('🏢 Using organizer address as fallback location');
        const organizerLocation = { 
          lat: organizerData.latitude, 
          lng: organizerData.longitude 
        };
        setMapCenter(organizerLocation);
        setMapZoom(12);
        
        if (mapRef.current) {
          mapRef.current.panTo(organizerLocation);
          mapRef.current.setZoom(12);
        }
      }
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  }, [organizerData]);

  // Update map center when events are loaded
  useEffect(() => {
    if (events.length > 0 && !userLocation) {
      console.log('🎯 Using first event location as map center');
      const firstEvent = events[0];
      const eventLocation = { lat: firstEvent.latitude, lng: firstEvent.longitude };
      setMapCenter(eventLocation);
      setMapZoom(12);
      
      if (mapRef.current) {
        mapRef.current.panTo(eventLocation);
        mapRef.current.setZoom(12);
      }
    }
  }, [events, userLocation]);

  // Advanced truck icon function (from HeatMap)
  const getTruckIcon = (kitchenType, coverUrl = null) => {
    if (window.google) {
      const type = (kitchenType || 'truck').toLowerCase();
      let url = "/truck-icon.png";
      
      // Use cover photo if available, otherwise use default icons
      if (coverUrl) {
        // For cover photos, we'll create a custom HTML marker
        return { 
          type: 'custom',
          coverUrl: coverUrl,
          size: 40
        };
      } else {
        if (type === "trailer") url = "/trailer-icon.png";
        if (type === "cart") url = "/cart-icon.png";
      }
      
      return {
        url,
        scaledSize: new window.google.maps.Size(40, 40),
      };
    }
    return null;
  };

  // Simplified event marker with 2 colors and smaller size
  const getEventMarkerIcon = (eventStatus) => {
    if (!window.google) return null;
    
    // Simple 2-color system: Yellow for active events, Gray for everything else
    const fillColor = eventStatus === 'active' ? '#FFD700' : '#9E9E9E';

    return {
      path: "M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2Z", // Star shape
      fillColor: fillColor,
      fillOpacity: 0.9,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 2, // Smaller size (was 3)
      anchor: { x: 12, y: 12 }
    };
  };

  // Filter events for display - hide completed non-recurring events
  const getVisibleEvents = (events) => {
    return events.filter(event => {
      // Always show non-completed events
      if (event.status !== 'completed') {
        return true;
      }
      
      // For completed events, only show if they are recurring
      // Recurring events have a recurringPattern or recurringId
      return event.recurringPattern || event.recurringId;
    });
  };

  // Truck marker icon
  const truckMarkerIcon = {
    url: "/truck-icon.png",
    scaledSize: window.google ? new window.google.maps.Size(40, 40) : null,
  };

  // Create custom HTML marker (from HeatMap)
  const createCustomMarker = (position, content, map) => {
    const marker = {
      position,
      map,
      content,
      visible: true
    };

    // Create custom overlay
    class CustomMarker extends window.google.maps.OverlayView {
      constructor(position, content, map) {
        super();
        this.position = position;
        this.content = content;
        this.div = null;
        this.setMap(map);
      }

      onAdd() {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.cursor = 'pointer';
        div.innerHTML = this.content;
        this.div = div;
        const panes = this.getPanes();
        panes.overlayMouseTarget.appendChild(div);
      }

      draw() {
        const overlayProjection = this.getProjection();
        const sw = overlayProjection.fromLatLngToDivPixel(this.position);
        const div = this.div;
        div.style.left = sw.x - 20 + 'px';
        div.style.top = sw.y - 20 + 'px';
      }

      onRemove() {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      }

      hide() {
        if (this.div) {
          this.div.style.visibility = 'hidden';
        }
      }

      show() {
        if (this.div) {
          this.div.style.visibility = 'visible';
        }
      }

      toggle() {
        if (this.div) {
          this.div.style.visibility = this.div.style.visibility === 'hidden' ? 'visible' : 'hidden';
        }
      }

      toggleDOM() {
        if (this.getMap()) {
          this.setMap(null);
        } else {
          this.setMap(this.map);
        }
      }

      setPosition(position) {
        this.position = position;
        this.draw();
      }

      addClickListener(callback) {
        if (this.div) {
          this.div.addEventListener('click', callback);
        }
      }
    }

    return new CustomMarker(position, content, map);
  };

  // Handle map click for placing event markers
  const handleMapClick = (event) => {
    if (!isPlacingEvent) return;
    
    const clickedLocation = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    
    console.log('🎯 EventOrganizerMap: Placing event marker at:', clickedLocation);
    setTempEventMarker(clickedLocation);
    setShowEventForm(true);
    
    // Get address from coordinates (reverse geocoding)
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { location: clickedLocation },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            setNewEventData(prev => ({
              ...prev,
              location: results[0].formatted_address
            }));
          }
        }
      );
    }
  };

  // Start event placement mode
  const startEventPlacement = () => {
    console.log('🎯 Starting event placement mode');
    setIsPlacingEvent(true);
    setTempEventMarker(null);
    setShowEventForm(false);
  };

  // Cancel event placement
  const cancelEventPlacement = () => {
    console.log('❌ Cancelling event placement');
    setIsPlacingEvent(false);
    setTempEventMarker(null);
    setShowEventForm(false);
    setNewEventData({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      isRecurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: ''
    });
  };

  // Save new event (with recurring support)
  const saveNewEvent = async () => {
    if (!tempEventMarker || !newEventData.title) {
      alert('Please fill in the event title');
      return;
    }

    try {
      console.log('💾 Saving new event:', newEventData, tempEventMarker);
      
      const baseEventDoc = {
        title: newEventData.title,
        description: newEventData.description,
        date: newEventData.date,
        time: newEventData.time,
        location: newEventData.location,
        latitude: tempEventMarker.lat,
        longitude: tempEventMarker.lng,
        organizerId: user.uid,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        isRecurring: newEventData.isRecurring,
        recurringPattern: newEventData.recurringPattern
      };

      if (newEventData.isRecurring && newEventData.recurringEndDate) {
        // Create multiple events for recurring pattern
        const startDate = new Date(newEventData.date);
        const endDate = new Date(newEventData.recurringEndDate);
        const eventsToCreate = [];
        
        let currentDate = new Date(startDate);
        let eventCount = 0;
        const maxEvents = 52; // Limit to prevent too many events
        
        while (currentDate <= endDate && eventCount < maxEvents) {
          const eventDoc = {
            ...baseEventDoc,
            date: currentDate.toISOString().split('T')[0],
            recurringId: `${user.uid}_${Date.now()}`, // Group recurring events
            recurringIndex: eventCount
          };
          eventsToCreate.push(eventDoc);
          
          // Calculate next date based on pattern
          switch (newEventData.recurringPattern) {
            case 'daily':
              currentDate.setDate(currentDate.getDate() + 1);
              break;
            case 'weekly':
              currentDate.setDate(currentDate.getDate() + 7);
              break;
            case 'monthly':
              currentDate.setMonth(currentDate.getMonth() + 1);
              break;
          }
          eventCount++;
        }
        
        // Create all recurring events
        for (const eventDoc of eventsToCreate) {
          await addDoc(collection(db, 'events'), eventDoc);
        }
        
        console.log(`✅ Created ${eventsToCreate.length} recurring events`);
        alert(`Successfully created ${eventsToCreate.length} recurring events!`);
        
      } else {
        // Create single event
        await addDoc(collection(db, 'events'), baseEventDoc);
        console.log('✅ Single event saved successfully');
      }
      
      cancelEventPlacement();
      
    } catch (error) {
      console.error('❌ Error saving event:', error);
      alert('Error saving event. Please try again.');
    }
  };

  // Cancel/Remove an existing event
  const cancelEvent = async (eventId, eventTitle) => {
    if (!eventId) {
      alert('Unable to cancel event - missing event ID');
      return;
    }

    const confirmMessage = `Are you sure you want to permanently delete "${eventTitle}"?\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('🗑️ Cancelling event:', eventId);
      
      // Delete the event from Firestore
      await deleteDoc(doc(db, 'events', eventId));
      
      console.log('✅ Event cancelled successfully');
      alert('Event has been successfully deleted.');
      
      // Close the info window
      setSelectedEvent(null);
      
    } catch (error) {
      console.error('❌ Error cancelling event:', error);
      alert('Error cancelling event. Please try again.');
    }
  };

  // Update event status
  const updateEventStatus = async (eventId, newStatus, eventTitle) => {
    if (!eventId) {
      alert('Unable to update event - missing event ID');
      return;
    }

    try {
      console.log('🔄 Updating event status:', eventId, 'to', newStatus);
      
      // Update the event status in Firestore
      await updateDoc(doc(db, 'events', eventId), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      console.log('✅ Event status updated successfully');
      
      // Update the selected event state to reflect the change immediately
      setSelectedEvent(prev => prev ? { ...prev, status: newStatus } : null);
      
    } catch (error) {
      console.error('❌ Error updating event status:', error);
      alert('Error updating event status. Please try again.');
    }
  };

  // Fetch truck names for better UX (from HeatMap)
  useEffect(() => {
    const fetchTruckNames = async () => {
      const truckNamesData = {};
      
      // Fetch user documents to get business names
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'owner')
      );
      
      const snapshot = await getDocs(usersQuery);
      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        truckNamesData[doc.id] = {
          businessName: userData.businessName || userData.username || 'Unknown Truck',
          kitchenType: userData.kitchenType || 'truck',
          coverUrl: userData.coverPhotoUrl || null
        };
      });
      
      console.log('🚛 EventOrganizerMap: Using truck names from location data:', truckNamesData);
      setTruckNames(truckNamesData);
    };

    fetchTruckNames();
  }, []);

  // Fetch ping data for heatmap (optional - gracefully fails if no permissions)
  useEffect(() => {
    if (!user) return;

    console.log('📍 EventOrganizerMap: Setting up ping data listener...');
    
    try {
      const unsubscribeRef = { current: null };
      
      const unsubscribe = onSnapshot(collection(db, 'pings'), 
        (snapshot) => {
          const pings = [];
          snapshot.docs.forEach(doc => {
            const ping = doc.data();
            if (ping.location && ping.location.lat && ping.location.lng) {
              pings.push({
                id: doc.id,
                ...ping,
                position: {
                  lat: ping.location.lat,
                  lng: ping.location.lng
                }
              });
            }
          });
          
          console.log('📍 EventOrganizerMap: Loaded ping data:', pings.length);
          setPingData(pings);
        },
        (error) => {
          console.log('📋 EventOrganizerMap: Ping data not accessible, continuing without heatmap data');
          setPingData([]);
        }
      );
      
      unsubscribeRef.current = unsubscribe;
      
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
      };
    } catch (error) {
      console.log('📋 EventOrganizerMap: Ping collection not available, continuing without heatmap data');
      setPingData([]);
    }
  }, [user]);

  // Enhanced truck locations with real-time updates  
  useEffect(() => {
    console.log('🚚 EventOrganizerMap: Setting up enhanced truck location query...');
    const trucksQuery = query(
      collection(db, 'users'),
      where('role', '==', 'owner')
    );

    const unsubscribe = onSnapshot(trucksQuery, 
      (snapshot) => {
        const trucksData = [];
        const heatmapPoints = [];

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.location && data.location.lat && data.location.lng) {
            // Check if truck is active (recent activity)
            const lastActivity = data.lastActivity?.toDate?.() || new Date(0);
            const isRecent = (Date.now() - lastActivity) < 24 * 60 * 60 * 1000; // 24 hours

            trucksData.push({
              id: doc.id,
              ...data,
              position: {
                lat: data.location.lat,
                lng: data.location.lng
              },
              isActive: data.isOnline || isRecent,
              lastActivity: lastActivity
            });

            // Add to heatmap with weight based on activity and pings
            if (window.google && window.google.maps && window.google.maps.LatLng) {
              const weight = (data.customerCount || 0) + (data.isOnline ? 2 : 0) + (isRecent ? 1 : 0);
              heatmapPoints.push({
                location: new window.google.maps.LatLng(data.location.lat, data.location.lng),
                weight: Math.max(1, weight) // Ensure minimum weight of 1
              });
            }
          }
        });

        console.log('🚚 EventOrganizerMap: Found trucks:', trucksData.length, 'heatmap points:', heatmapPoints.length);
        setTrucks(trucksData);
        setHeatmapData(heatmapPoints);
      },
      (error) => {
        console.error('❌ EventOrganizerMap: Trucks listener error:', error);
        if (error.code === 'permission-denied') {
          console.log('📋 User may not have permission to read users collection');
          setTrucks([]);
          setHeatmapData([]);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Advanced truck marker creation (from HeatMap)
  const updateTruckMarkers = useCallback(async () => {
    if (!mapRef.current || !window.google) return;

    console.log('🗺️ EventOrganizerMap: Updating truck markers, found trucks:', trucks.length);
    const currentTruckIds = new Set();

    for (const truck of trucks) {
      const truckName = truckNames[truck.id]?.businessName || truck.businessName || truck.username || 'Unknown Truck';
      const position = truck.position;
      
      console.log('🗺️ EventOrganizerMap: Processing truck:', truck.id, truck);

      // Get owner cover photo if available
      let ownerCoverUrl = null;
      try {
        if (truck.id && truckNames[truck.id]?.coverUrl) {
          ownerCoverUrl = truckNames[truck.id].coverUrl;
        }
      } catch (error) {
        console.error('🗺️ EventOrganizerMap: Error fetching owner data for cover photo:', error);
      }

      const truckMarkerId = `truck_${truck.id}`;
      currentTruckIds.add(truckMarkerId);

      // Check if truck should be visible (active within 24 hours)
      const shouldShow = truck.isActive;
      const lastActivity = truck.lastActivity;
      const isStale = lastActivity && (Date.now() - lastActivity) > 24 * 60 * 60 * 1000;

      console.log('🗺️ EventOrganizerMap: Visibility check for truck', truck.id, { shouldShow, isStale });

      if (!shouldShow || isStale) {
        console.log('🗺️ EventOrganizerMap: Hiding truck', truck.id, 'shouldShow:', shouldShow, 'isStale:', isStale);
        if (markerRefs.current[truckMarkerId]) {
          markerRefs.current[truckMarkerId].setMap(null);
          delete markerRefs.current[truckMarkerId];
        }
        continue;
      }

      if (!markerRefs.current[truckMarkerId]) {
        console.log('🗺️ EventOrganizerMap: Creating new marker for truck', truck.id);
        const icon = getTruckIcon(truck.kitchenType || truckNames[truck.id]?.kitchenType, ownerCoverUrl);
        let marker;
        
        // Check if we need to create a custom HTML marker for cover photos
        if (icon && icon.type === 'custom') {
          const customMarkerContent = `
            <div style="
              width: 40px; 
              height: 40px; 
              border-radius: 50%; 
              border: 2px solid #4CAF50; 
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              background: white;
            ">
              <img src="${icon.coverUrl}" style="
                width: 100%; 
                height: 100%; 
                object-fit: cover;
              " />
            </div>
          `;
          
          marker = createCustomMarker(position, customMarkerContent, mapRef.current);
        } else {
          // Create standard Google Maps marker
          const markerOptions = {
            position,
            map: mapRef.current,
            title: truckName,
          };
          
          // Only add icon if it's a valid Google Maps icon (not custom)
          if (icon && icon.type !== 'custom') {
            markerOptions.icon = icon;
          }
          
          marker = new window.google.maps.Marker(markerOptions);
        }
        
        // Handle click events (unified for both marker types)
        if (marker.addClickListener) {
          // Custom marker
          marker.addClickListener(() => {
            console.log('🗺️ EventOrganizerMap: Truck marker clicked:', truck.id);
            setSelectedTruck(truck);
          });
        } else {
          // Standard marker
          marker.addListener('click', () => {
            console.log('🗺️ EventOrganizerMap: Truck marker clicked:', truck.id);
            setSelectedTruck(truck);
          });
        }
        
        markerRefs.current[truckMarkerId] = marker;
      } else {
        console.log('🗺️ EventOrganizerMap: Updating existing marker for truck', truck.id);
        const marker = markerRefs.current[truckMarkerId];
        
        // Update position for both marker types
        if (marker.setPosition) {
          console.log('🗺️ EventOrganizerMap: Updating standard marker position');
          marker.setPosition(position);
        } else if (marker.setPosition) {
          console.log('🗺️ EventOrganizerMap: Updating custom marker position');
          marker.setPosition(position);
        }
      }
    }

    // Clean up markers for trucks that are no longer visible
    Object.keys(markerRefs.current).forEach(id => {
      if (id.startsWith('truck_') && !currentTruckIds.has(id)) {
        console.log('🗺️ EventOrganizerMap: Cleaning up truck marker for:', id);
        if (markerRefs.current[id]) {
          markerRefs.current[id].setMap(null);
          delete markerRefs.current[id];
        }
      }
    });
  }, [trucks, truckNames]);

  // Update markers when data changes
  useEffect(() => {
    if ((mapsLoaded || window.google?.maps) && mapRef.current) {
      updateTruckMarkers();
    }
  }, [mapsLoaded, updateTruckMarkers]);

  // Fetch organizer's events
  useEffect(() => {
    if (!user) return;

    console.log('🎭 EventOrganizerMap: Setting up events query for user:', user.uid);

    const eventsQuery = query(
      collection(db, 'events'),
      where('organizerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(event => event.latitude && event.longitude);

      console.log('🎪 EventOrganizerMap: Found events:', eventsData.length);
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Update markers when data changes
  useEffect(() => {
    if ((mapsLoaded || window.google?.maps) && mapRef.current) {
      updateTruckMarkers();
    }
  }, [mapsLoaded, updateTruckMarkers]);

  // Fetch organizer's events
  useEffect(() => {
    if (!user) return;

    console.log('🎭 EventOrganizerMap: Setting up events query for user:', user.uid);

    const eventsQuery = query(
      collection(db, 'events'),
      where('organizerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(eventsQuery, 
      (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(event => event.latitude && event.longitude);

        console.log('🎪 EventOrganizerMap: Found events:', eventsData.length);
        setEvents(eventsData);
      },
      (error) => {
        console.error('❌ EventOrganizerMap: Events listener error:', error);
        if (error.code === 'permission-denied') {
          console.log('📋 User may not have permission to read events collection');
          setEvents([]); // Set empty array as fallback
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  };

  return (
    <div className="event-organizer-map">
      <div style={{ marginBottom: '15px' }}>
        <h3>🗺️ Real-Time Event & Truck Activity Map</h3>
        <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#666', flexWrap: 'wrap' }}>
          {userLocation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '15px', height: '15px', background: '#4285F4', borderRadius: '50%', border: '2px solid white' }}></div>
              <span>Your Location</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', background: 'linear-gradient(45deg, #FF6B35, #FF3D00)', borderRadius: '50%' }}></div>
            <span>Your Events</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', background: 'linear-gradient(45deg, #4CAF50, #2E7D32)', borderRadius: '50%' }}></div>
            <span>Active Food Trucks</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', background: 'linear-gradient(45deg, red, orange, yellow)', borderRadius: '50%' }}></div>
            <span>Activity Heatmap</span>
          </div>
        </div>
      </div>
      
      {/* Event Placement Controls */}
      <div style={{ 
        marginBottom: '15px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e0e0e0' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0, color: '#333' }}>📍 Event Marker Tools</h4>
          
          {!isPlacingEvent ? (
            <button
              onClick={startEventPlacement}
              style={{
                backgroundColor: '#FF6B35',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🎯 Place New Event Marker
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ 
                color: '#FF6B35', 
                fontWeight: 'bold',
                backgroundColor: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '2px solid #FF6B35'
              }}>
                🎯 Click on the map to place your event marker
              </span>
              <button
                onClick={cancelEventPlacement}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="event-map-container">
        <div className="event-map-inner">
          {mapsError ? (
            <div style={{
              height: '500px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div>
                <h3>🗺️ Map Error</h3>
                <p>Failed to load Google Maps: {mapsError.message}</p>
                <p><small>Please check your internet connection and try again.</small></p>
              </div>
            </div>
          ) : !mapsLoaded && !window.google?.maps ? (
            <div style={{
              height: '500px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{
                  width: '50px',
                  height: '50px',
                  border: '4px solid #e0e0e0',
                  borderTop: '4px solid #FF6B35',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px'
                }}></div>
                <h3>🗺️ Loading Map...</h3>
                <p>Initializing Google Maps API</p>
              </div>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={mapZoom}
              options={mapOptions}
              onClick={handleMapClick}
              onLoad={(mapInstance) => {
                console.log('🗺️ EventOrganizerMap: GoogleMap onLoad called');
                setMap(mapInstance);
                setIsMapLoaded(true);
                mapRef.current = mapInstance;
                
                // If we have user location, center on it
                if (userLocation) {
                  console.log('🗺️ Centering map on user location');
                  mapInstance.panTo(userLocation);
                  mapInstance.setZoom(12);
                }
              }}
            >
              {/* Heatmap Layer for truck density */}
              {heatmapData.length > 0 && (
                <HeatmapLayer
                  data={heatmapData}
                  options={{
                    radius: 50,
                    opacity: 0.6,
                    gradient: [
                      'rgba(0, 255, 255, 0)',
                      'rgba(0, 255, 255, 1)',
                      'rgba(0, 191, 255, 1)',
                      'rgba(0, 127, 255, 1)',
                      'rgba(0, 63, 255, 1)',
                      'rgba(0, 0, 255, 1)',
                      'rgba(0, 0, 223, 1)',
                      'rgba(0, 0, 191, 1)',
                      'rgba(0, 0, 159, 1)',
                      'rgba(0, 0, 127, 1)',
                      'rgba(63, 0, 91, 1)',
                      'rgba(127, 0, 63, 1)',
                      'rgba(191, 0, 31, 1)',
                      'rgba(255, 0, 0, 1)'
                    ]
                  }}
                />
              )}

              {/* User Location Marker */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={{
                    path: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 3,
                    scale: 1.5,
                    anchor: { x: 12, y: 12 }
                  }}
                  title="Your Location"
                />
              )}

              {/* Temporary Event Marker (for placement) */}
              {tempEventMarker && (
                <Marker
                  position={tempEventMarker}
                  icon={{
                    path: "M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2Z",
                    fillColor: '#FF6B35',
                    fillOpacity: 0.9,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 4,
                    scale: 3,
                    anchor: { x: 12, y: 12 }
                  }}
                  animation={window.google?.maps?.Animation?.BOUNCE}
                  title="New Event Location"
                />
              )}

              {/* Event Markers - Distinctive Star Design with Smart Filtering */}
              {getVisibleEvents(events).map((event) => (
                <Marker
                  key={event.id}
                  position={{ lat: event.latitude, lng: event.longitude }}
                  icon={getEventMarkerIcon(event.status)}
                  onClick={() => setSelectedEvent(event)}
                  animation={event.status === 'active' ? window.google.maps.Animation.BOUNCE : null}
                />
              ))}

              {/* Truck Markers */}
              {trucks.map((truck) => (
                <Marker
                  key={truck.id}
                  position={truck.position}
                  icon={truckMarkerIcon}
                  onClick={() => setSelectedTruck(truck)}
                />
              ))}

              {/* Event Info Window */}
              {selectedEvent && (
                <InfoWindow
                  position={{ lat: selectedEvent.latitude, lng: selectedEvent.longitude }}
                  onCloseClick={() => setSelectedEvent(null)}
                >
                  <div style={{ maxWidth: '320px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#FF6B35' }}>🌟 {selectedEvent.title}</h4>
                    <p><strong>Date:</strong> {selectedEvent.date}</p>
                    
                    {/* Status with dropdown for updates */}
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Status: </strong>
                      <select
                        value={selectedEvent.status}
                        onChange={(e) => updateEventStatus(selectedEvent.id, e.target.value, selectedEvent.title)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          backgroundColor: selectedEvent.status === 'active' ? '#4CAF50' : 
                                         selectedEvent.status === 'published' ? '#2196F3' :
                                         selectedEvent.status === 'completed' ? '#9C27B0' :
                                         selectedEvent.status === 'cancelled' ? '#F44336' : '#9E9E9E',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="draft" style={{color: '#000'}}>Draft</option>
                        <option value="published" style={{color: '#000'}}>Published</option>
                        <option value="active" style={{color: '#000'}}>Active</option>
                        <option value="completed" style={{color: '#000'}}>Completed</option>
                      </select>
                    </div>
                    
                    <p><strong>Location:</strong> {selectedEvent.location}</p>
                    {selectedEvent.description && (
                      <p><strong>Description:</strong> {selectedEvent.description.substring(0, 100)}...</p>
                    )}
                    {selectedEvent.time && (
                      <p><strong>Time:</strong> {selectedEvent.time}</p>
                    )}
                    
                    <div style={{ 
                      marginTop: '15px', 
                      paddingTop: '10px', 
                      borderTop: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        📍 Your event - click status to update
                      </div>
                      <button
                        onClick={() => cancelEvent(selectedEvent.id, selectedEvent.title)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                      >
                        🗑️ Delete Event
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}

              {/* Truck Info Window */}
              {selectedTruck && (
                <InfoWindow
                  position={selectedTruck.position}
                  onCloseClick={() => setSelectedTruck(null)}
                >
                  <div style={{ maxWidth: '250px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>🚚 {selectedTruck.businessName || selectedTruck.username}</h4>
                    <p><strong>Cuisine:</strong> {selectedTruck.cuisineType || 'Not specified'}</p>
                    <p><strong>Status:</strong> <span style={{ color: '#4CAF50' }}>● Online</span></p>
                    {selectedTruck.customerCount && (
                      <p><strong>Activity:</strong> {selectedTruck.customerCount} customers nearby</p>
                    )}
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                      🎯 Potential vendor for your events
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>

        {/* Event Status Legend - moved below map */}
        {isMapLoaded && events.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            marginTop: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <h4 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '14px', 
              color: '#333',
              borderBottom: '1px solid #eee',
              paddingBottom: '8px'
            }}>
              ⭐ Event Status
            </h4>
            
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  backgroundColor: '#FFD700',
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
                }} />
                <span style={{ fontSize: '12px' }}>
                  <strong>Happening Now</strong> - Event is currently active
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  backgroundColor: '#9E9E9E',
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
                }} />
                <span style={{ fontSize: '12px' }}>
                  <strong>Not Active</strong> - Upcoming, completed recurring, or cancelled
                </span>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '10px', 
              fontSize: '11px', 
              color: '#666',
              fontStyle: 'italic',
              paddingTop: '8px',
              borderTop: '1px solid #f0f0f0'
            }}>
              💡 <strong>Smart Display:</strong> Completed single events disappear automatically • Recurring events stay visible when completed
            </div>
          </div>
        )}

        {/* Enhanced Heatmap Legend - moved below event status */}
        {isMapLoaded && heatmapData.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            marginTop: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <h4 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '14px', 
              color: '#333',
              borderBottom: '1px solid #eee',
              paddingBottom: '8px'
            }}>
              🔥 Activity Heatmap
            </h4>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '12px', background: 'linear-gradient(to right, rgba(0,255,255,0.6), rgba(0,255,0,0.6))', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px' }}>Low</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '12px', background: 'linear-gradient(to right, rgba(0,255,0,0.6), rgba(255,255,0,0.8))', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px' }}>Medium</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '12px', background: 'linear-gradient(to right, rgba(255,255,0,0.8), rgba(255,0,0,1))', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px' }}>High</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend and Stats */}
      <div className="map-stats-grid">
        <div className="map-stat-card" style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3D00)' }}>
          <h4 className="map-stat-label">🌟 Your Events</h4>
          <p className="map-stat-number">{getVisibleEvents(events).length}</p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            {events.filter(e => e.status === 'active').length} active • {events.filter(e => e.status === 'completed' && (e.recurringPattern || e.recurringId)).length} recurring
          </p>
        </div>
        <div className="map-stat-card" style={{ background: 'linear-gradient(135deg, #4CAF50, #2E7D32)' }}>
          <h4 className="map-stat-label">🚚 Active Trucks</h4>
          <p className="map-stat-number">{trucks.length}</p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            Real-time locations
          </p>
        </div>
        <div className="map-stat-card" style={{ background: 'linear-gradient(135deg, #2196F3, #1976D2)' }}>
          <h4 className="map-stat-label">🔥 Heat Activity</h4>
          <p className="map-stat-number">{heatmapData.length}</p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            Activity points
          </p>
        </div>
        <div className="map-stat-card" style={{ background: 'linear-gradient(135deg, #9C27B0, #7B1FA2)' }}>
          <h4 className="map-stat-label">📊 Total Reach</h4>
          <p className="map-stat-number">{trucks.reduce((sum, truck) => sum + (truck.customerCount || 0), 0)}</p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            Potential customers
          </p>
        </div>
      </div>
      
      {/* Event Creation Form Modal */}
      {showEventForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0, color: '#FF6B35' }}>🎯 Create New Event</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Event will be placed at: {tempEventMarker ? `${tempEventMarker.lat.toFixed(6)}, ${tempEventMarker.lng.toFixed(6)}` : ''}
            </p>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Event Title *
              </label>
              <input
                type="text"
                value={newEventData.title}
                onChange={(e) => setNewEventData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Description
              </label>
              <textarea
                value={newEventData.description}
                onChange={(e) => setNewEventData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your event..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={newEventData.date}
                  onChange={(e) => setNewEventData(prev => ({ ...prev, date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Time
                </label>
                <input
                  type="time"
                  value={newEventData.time}
                  onChange={(e) => setNewEventData(prev => ({ ...prev, time: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Location Address
              </label>
              <input
                type="text"
                value={newEventData.location}
                onChange={(e) => setNewEventData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Event address (auto-filled from map)"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            {/* Recurring Event Settings */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newEventData.isRecurring}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                    style={{ marginRight: '8px' }}
                  />
                  🔄 Make this a recurring event
                </label>
              </div>
              
              {newEventData.isRecurring && (
                <>
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Repeat Pattern
                      </label>
                      <select
                        value={newEventData.recurringPattern}
                        onChange={(e) => setNewEventData(prev => ({ ...prev, recurringPattern: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        End Date
                      </label>
                      <input
                        type="date"
                        value={newEventData.recurringEndDate}
                        onChange={(e) => setNewEventData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                    💡 This will create multiple events based on your pattern until the end date
                  </p>
                </>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelEventPlacement}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveNewEvent}
                style={{
                  backgroundColor: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventOrganizerMap;
