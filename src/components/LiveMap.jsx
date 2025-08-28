import React, { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  HeatmapLayer,
  Marker,
} from "@react-google-maps/api";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import PinDrop from "../utils/pinDrop";
import EventModal from "./EventModal";
import "../assets/LiveMap.css";

const containerStyle = {
  width: "100%",
  height: "500px",
};

// Default center - will be updated with user location
const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795, // Center of USA as fallback
};

// Simplified event marker icon with 2 colors and smaller size
const getEventIcon = (eventStatus) => {
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

// Create HTML marker for custom styling
const createCustomMarker = (position, content, map) => {
  const marker = new google.maps.OverlayView();
  marker.clickListeners = []; // Store click listeners
  marker.position = position; // Store the position
  
  marker.onAdd = function() {
    const div = document.createElement('div');
    div.innerHTML = content;
    div.style.position = 'absolute';
    div.style.cursor = 'pointer';
    
    // Add both click and touch events for mobile compatibility
    const handleInteraction = (e) => {
      e.preventDefault(); // Prevent default behavior
      e.stopPropagation(); // Stop event bubbling
      this.clickListeners.forEach(callback => callback());
    };
    
    div.addEventListener('click', handleInteraction);
    div.addEventListener('touchend', handleInteraction);
    
    const panes = this.getPanes();
    panes.overlayMouseTarget.appendChild(div);
    this.div = div;
  };
  
  marker.draw = function() {
    const overlayProjection = this.getProjection();
    const sw = overlayProjection.fromLatLngToDivPixel(this.position);
    const div = this.div;
    if (div) {
      div.style.left = (sw.x - 20) + 'px'; // Center the 40px icon
      div.style.top = (sw.y - 20) + 'px';
    }
  };
  
  marker.onRemove = function() {
    if (this.div) {
      this.div.parentNode.removeChild(this.div);
      this.div = null;
    }
  };
  
  // Add method to attach click listeners
  marker.addClickListener = function(callback) {
    this.clickListeners.push(callback);
  };
  
  marker.setMap(map);
  return marker;
};

const LiveMap = ({ isLoaded }) => {
  const [pins, setPins] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [userLocation, setUserLocation] = useState(null);
  const [mapZoom, setMapZoom] = useState(4);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const mapRef = useRef(null);
  const eventMarkersRef = useRef({});

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 LiveMap: Auth state changed:', user ? user.uid : 'null');
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Create custom event markers with organization logos
  useEffect(() => {
    console.log('🎨 LiveMap: Custom marker useEffect triggered');
    console.log('🎨 LiveMap: mapRef.current:', !!mapRef.current);
    console.log('🎨 LiveMap: window.google:', !!window.google);
    console.log('🎨 LiveMap: events.length:', events.length);
    console.log('🎨 LiveMap: isLoaded:', isLoaded);
    
    if (!mapRef.current || !window.google || !events.length || !isLoaded) {
      console.log('🎨 LiveMap: Skipping marker creation - missing requirements');
      return;
    }

    console.log('🎨 LiveMap: Creating custom event markers for', events.length, 'events');

    // Clear existing event markers
    Object.values(eventMarkersRef.current).forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null);
      }
    });
    eventMarkersRef.current = {};

    // Create custom markers for each event
    events.forEach(event => {
      const position = new window.google.maps.LatLng(event.latitude, event.longitude);
      const eventId = event.id;

      console.log('🎉 LiveMap: Creating event marker for:', event.title, 'at position:', position);

      // Check if event has embedded organizer logo URL
      if (event.organizerLogoUrl) {
        console.log('🎨 LiveMap: Using embedded logo for event:', eventId);
        createCustomEventMarker(event, position, event.organizerLogoUrl);
      } else if (currentUser && currentUser.uid === event.organizerId && currentUser.logoUrl) {
        console.log('🎨 LiveMap: Using current user logo for own event:', eventId);
        createCustomEventMarker(event, position, currentUser.logoUrl);
      } else if (event.organizerId) {
        // Try to fetch organizer logo
        getDoc(doc(db, 'users', event.organizerId))
          .then(organizerDoc => {
            if (organizerDoc.exists() && organizerDoc.data().logoUrl) {
              console.log('🎨 LiveMap: Fetched organizer logo for event:', eventId);
              createCustomEventMarker(event, position, organizerDoc.data().logoUrl);
            } else {
              console.log('🎨 LiveMap: No logo found, using basic marker for event:', eventId);
              createBasicEventMarker(event, position);
            }
          })
          .catch(error => {
            console.log('🔒 LiveMap: Permission denied fetching organizer data, using basic marker:', eventId);
            createBasicEventMarker(event, position);
          });
      } else {
        console.log('🎨 LiveMap: No organizer ID, using basic marker for event:', eventId);
        createBasicEventMarker(event, position);
      }
    });

    // Cleanup function
    return () => {
      Object.values(eventMarkersRef.current).forEach(marker => {
        if (marker.setMap) {
          marker.setMap(null);
        }
      });
      eventMarkersRef.current = {};
    };
  }, [events, currentUser, isLoaded]); // Fixed dependencies

  // Helper function to create custom event marker with logo
  const createCustomEventMarker = (event, position, logoUrl) => {
    console.log('🎨 LiveMap: Event status for', event.id, ':', event.status);
    
    // More robust status color logic with better fallbacks
    let statusColor = '#2196F3'; // Default to blue
    
    switch(event.status?.toLowerCase()) {
      case 'upcoming':
      case 'published':
        statusColor = '#2196F3'; // Blue
        break;
      case 'active':
      case 'live':
        statusColor = '#FF6B35'; // Orange
        break;
      case 'completed':
      case 'finished':
        statusColor = '#4CAF50'; // Green
        break;
      default:
        console.log('🟡 LiveMap: Unknown event status, using blue:', event.status);
        statusColor = '#2196F3'; // Default to blue instead of grey
    }

    const customMarkerContent = `
      <div style="
        width: 40px; 
        height: 40px; 
        border-radius: 50%; 
        border: 3px solid ${statusColor}; 
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        background: white;
        position: relative;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      ">
        <img src="${logoUrl}" style="
          width: 100%; 
          height: 100%; 
          object-fit: cover;
        " />
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 16px;
          height: 16px;
          background: #FFD700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          border: 2px solid white;
          font-size: 10px;
        ">⭐</div>
      </div>
    `;

    const customMarker = createCustomMarker(position, customMarkerContent, mapRef.current);
    customMarker.addClickListener(() => {
      console.log('🎉 LiveMap: Custom event marker clicked:', event.id);
      handleEventClick(event);
    });

    eventMarkersRef.current[event.id] = customMarker;
  };

  // Helper function to create basic event marker (fallback)
  const createBasicEventMarker = (event, position) => {
    const basicIcon = getEventIcon(event.status);
    
    const marker = new window.google.maps.Marker({
      position,
      map: mapRef.current,
      icon: basicIcon,
      title: `Event: ${event.title}`,
      zIndex: 1000
    });

    marker.addListener('click', () => {
      console.log('🎉 LiveMap: Basic event marker clicked:', event.id);
      handleEventClick(event);
    });

    eventMarkersRef.current[event.id] = marker;
  };

  // Geolocation effect to center map on user's location
  useEffect(() => {
    console.log('🌍 LiveMap: Attempting to get user location...');
    
    if (!navigator.geolocation) {
      console.log('⚠️ LiveMap: Geolocation not supported by this browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes cache
    };

    const successCallback = (position) => {
      const { latitude, longitude } = position.coords;
      console.log('✅ LiveMap: User location detected:', { latitude, longitude });
      
      const newLocation = { lat: latitude, lng: longitude };
      setUserLocation(newLocation);
      setMapCenter(newLocation);
      setMapZoom(12); // Zoom in when we have user location
      
      // If map is already loaded, update its center
      if (mapRef.current) {
        console.log('🗺️ LiveMap: Updating map center to user location');
        mapRef.current.panTo(newLocation);
        mapRef.current.setZoom(12);
      }
    };

    const errorCallback = (error) => {
      console.log('❌ LiveMap: Geolocation error:', error.message);
      // Keep default center as fallback
      setMapZoom(4);
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const unsubscribe = onSnapshot(collection(db, "pings"), 
      (snapshot) => {
        const pinData = snapshot.docs.map((doc) => doc.data());
        setPins(pinData);
      },
      (error) => {
        console.log('📋 LiveMap: Pings collection not accessible, continuing without pin data');
        setPins([]);
      }
    );

    return () => unsubscribe();
  }, [isLoaded]);

  // Fetch events for display on mobile kitchen owner map
  useEffect(() => {
    if (!isLoaded) return;

    const unsubscribe = onSnapshot(collection(db, "events"), 
      (snapshot) => {
        const eventsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })).filter(event => {
          const hasLocation = event.latitude && event.longitude;
          const validStatus = event.status === 'published' || 
                             event.status === 'active' || 
                             event.status === 'upcoming' ||
                             event.status === 'live';
          
          console.log('🔍 LiveMap: Event filter check:', {
            id: event.id,
            title: event.title,
            status: event.status,
            hasLocation,
            validStatus,
            included: hasLocation && validStatus
          });
          
          return hasLocation && validStatus;
        });

        console.log("🎉 LiveMap: Active events fetched:", eventsData.length, 'events');
        console.log("🎉 LiveMap: Events details:", eventsData.map(e => ({ id: e.id, title: e.title, status: e.status })));
        setEvents(eventsData);
      },
      (error) => {
        console.error('❌ LiveMap: Events listener error:', error);
        if (error.code === 'permission-denied') {
          console.log('📋 User may not have permission to read events collection');
          setEvents([]); // Set empty array as fallback
        }
      }
    );

    return () => unsubscribe();
  }, [isLoaded]);

  const handleMapClick = async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const notes = prompt("Describe your food request (optional):");
    const cuisine = prompt("What cuisine are you requesting? (e.g., tacos, bbq, asian)");

    if (auth.currentUser) {
      await PinDrop({
        lat,
        lng,
        userId: auth.currentUser.uid,
        notes,
        cuisine: cuisine?.toLowerCase() || "any",
      });
      alert("Pin drop added!");
    } else {
      alert("Please log in to drop a pin.");
    }
  };

  // Event click handler for modal
  const handleEventClick = (event) => {
    console.log('🎉 LiveMap: Event clicked for details:', event.id);
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const filteredPins = pins.filter((pin) =>
    selectedCuisine === "all" ? true : pin.cuisine === selectedCuisine
  );

  const heatmapData = filteredPins.map(
    (pin) => new window.google.maps.LatLng(pin.location.lat, pin.location.lng)
  );

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <>
      <div className="cuisine-filter-wrapper">
        <label htmlFor="cuisineFilter">Filter by Cuisine: </label>
        <select
          id="cuisineFilter"
          value={selectedCuisine}
          onChange={(e) => setSelectedCuisine(e.target.value)}
        >
          <option value="all">All</option>
          <option value="mexican">Mexican</option>
          <option value="bbq">BBQ</option>
          <option value="asian">Asian</option>
          <option value="desserts">Desserts</option>
          <option value="vegan">Vegan</option>
        </select>
      </div>

      <GoogleMap
        mapContainerClassName="google-map-container"
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onClick={handleMapClick}
        onLoad={(map) => {
          mapRef.current = map;
          console.log('🗺️ LiveMap: Map loaded with center:', mapCenter);
          
          // If we already have user location, center on it
          if (userLocation) {
            console.log('🎯 LiveMap: Centering on user location after map load');
            map.panTo(userLocation);
            map.setZoom(12);
          }
        }}
      >
        {/* Pin markers for food requests */}
        {filteredPins.map((pin, idx) => (
          <Marker
            key={idx}
            position={pin.location}
            title={pin.notes || "Food Request"}
          />
        ))}

        {/* Event markers are now handled by custom markers in useEffect - old basic markers commented out
        {events.map((event) => (
          <Marker
            key={event.id}
            position={{ lat: event.latitude, lng: event.longitude }}
            icon={getEventIcon(event.status)}
            title={`Event: ${event.title} - ${event.date}`}
            onClick={() => handleEventClick(event)}
          />
        ))}
        */}

        {heatmapData.length > 0 && (
          <HeatmapLayer data={heatmapData} options={{ radius: 30 }} />
        )}
      </GoogleMap>
      
      {/* Event Status Legend - moved below map to avoid obstruction */}
      {events.length > 0 && (
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
                <strong>Not Active</strong> - Draft, published, completed, or cancelled
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {selectedEvent && (
        <EventModal 
          event={selectedEvent}
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onApply={() => {
            // Handle application logic here if needed for customer view
            console.log('Customer viewing event details:', selectedEvent.id);
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </>
  );
};

export default LiveMap;
