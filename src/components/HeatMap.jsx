import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { GoogleMap, HeatmapLayer } from "@react-google-maps/api";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  getDoc,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import HeatMapKey from "./HeatmapKey"; // Assuming you have a HeatMapKey component
import EventModal from "./EventModal"; // Import EventModal component
//import Supercluster from "supercluster";
import { throttle } from "lodash";


// Function to dynamically calculate the radius based on zoom level
const calculateRadius = (zoom) => {
  return Math.max(10, 20 - (zoom - 12) * 2); // Adjust radius based on zoom
};

const mapContainerStyle = {
  width: "100%",
  height: "600px",
};

// Place the FilterButton component here
const FilterButton = React.memo(({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      margin: "0 8px 8px 0",
      padding: "8px 12px",
      backgroundColor: active ? "#4CAF50" : "#ccc",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    }}
  >
    {active ? `Hide ${label}` : `Show ${label}`}
  </button>
));

const HeatMap = ({isLoaded, onMapLoad, userPlan, onTruckMarkerClick}) => {
  const db = getFirestore();
  const auth = getAuth();

  const [currentUser, setCurrentUser] = useState(null);
  const [pingData, setPingData] = useState([]);
  const [truckLocations, setTruckLocations] = useState([]);
  const [events, setEvents] = useState([]); // Add events state
  const [showEvents, setShowEvents] = useState(true); // State for controlling event marker visibility
  const [truckNames, setTruckNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 34.0522, lng: -118.2437 });
  
  // EventModal and Application states
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationData, setApplicationData] = useState({
    vendorName: '',
    businessName: '',
    email: '',
    phone: '',
    foodType: '',
    description: '',
    experience: '',
    specialRequests: ''
  });
  
  const [filters, setFilters] = useState({
    american: true,
    "asian-fusion": true,
    bbq: true,
    burgers: true,
    chinese: true,
    coffee: true,
    desserts: true,
    drinks: true,
    greek: true,
    halal: true,
    healthy: true,
    indian: true,
    italian: true,
    korean: true,
    latin: true,
    mediterranean: true,
    mexican: true,
    pizza: true,
    seafood: true,
    southern: true,
    sushi: true,
    thai: true,
    vegan: true,
    wings: true,
  });

  // Modal state for cuisine filters (must be after filters)
  const [showCuisineModal, setShowCuisineModal] = useState(false);
  const [tempCuisineFilters, setTempCuisineFilters] = useState(filters);

  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const infoWindowRef = useRef(null);
  const heatmapRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user document to get role information
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('🎯 HeatMap: User data fetched:', userData.role);
            setCurrentUser({
              ...user,
              role: userData.role,
              plan: userData.plan
            });
          } else {
            console.log('🔍 HeatMap: No user document found, using auth user only');
            setCurrentUser(user);
          }
        } catch (error) {
          console.error('❌ HeatMap: Error fetching user data:', error);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          //console.log("User geolocation detected:", position.coords);
          setMapCenter(coords);
          if (mapRef.current) {
            mapRef.current.panTo(coords)
          }
        },
        (error) => {
          // Handle geolocation errors more gracefully
          switch(error.code) {
            case error.PERMISSION_DENIED:
              console.log("🗺️ HeatMap: Geolocation permission denied by user");
              break;
            case error.POSITION_UNAVAILABLE:
              console.log("🗺️ HeatMap: Geolocation position unavailable");
              break;
            case error.TIMEOUT:
              console.log("🗺️ HeatMap: Geolocation request timed out");
              break;
            default:
              console.log("🗺️ HeatMap: Unknown geolocation error:", error.message);
              break;
          }
        },
        { 
          enableHighAccuracy: true, // Requests high accuracy
          maximumAge: 10000, // Cache the location for 10 seconds
          timeout: 5000, // Timeout for the geolocation request
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = onSnapshot(collection(db, "pings"), (snapshot) => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const data = snapshot.docs
  .map((doc) => doc.data())
  .filter((ping) => {
    const timestamp = ping.timestamp?.toDate();
    return timestamp && timestamp > oneDayAgo;
  })
  .map((ping) => {
    const location = ping.location || { lat: 0, lng: 0 }; // Default to (0, 0) if location is missing
    return {
      ...ping,
      location: {
        lat: location.lat ?? location.latitude ?? 0,
        lng: location.lng ?? location.longitude ?? 0,
      },
    };
  });
      //console.log("Filtered ping data:", data);
      setPingData(data);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    //console.log("Attempting to fetch data from Firestore...");
    const unsubscribe = onSnapshot(collection(db, "truckLocations"), (snapshot) => {
      //console.log("Pings data fetched successfully:", snapshot.docs.map((doc) => doc.data()));
      const trucks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      //console.log("Truck locations fetched:", trucks);
      setTruckLocations(trucks);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch active events for display on map
  useEffect(() => {
    if (!currentUser) return;
    
    // Create user-specific query to avoid permission issues
    let eventsQuery;
    
    if (currentUser.role === 'event-organizer') {
      // Event organizers see only their own events
      eventsQuery = query(
        collection(db, "events"),
        where("organizerId", "==", currentUser.uid)
      );
    } else if (currentUser.role === 'owner') {
      // Food truck owners can read any events (per Firestore rules)
      // They see active and published events to apply to
      eventsQuery = query(
        collection(db, "events"),
        where("status", "in", ["published", "active"])
      );
    } else if (currentUser.role === 'customer') {
      // Customers can only read published events (per Firestore rules)
      eventsQuery = query(
        collection(db, "events"),
        where("status", "==", "published")
      );
    } else {
      // For other users, we'll handle this differently to avoid permission issues
      console.log('📋 Unknown user role detected, skipping events query to avoid permissions');
      setEvents([]);
      return;
    }
    
    const unsubscribe = onSnapshot(eventsQuery, 
      (snapshot) => {
        const eventsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })).filter(event => {
          // Check if event has location data
          const hasLocation = event.latitude && event.longitude;
          
          if (currentUser.role === 'event-organizer') {
            // For event organizers, show all their events (already filtered by query)
            return hasLocation;
          } else if (currentUser.role === 'owner') {
            // For food truck owners, show active and published events with location
            return hasLocation && (event.status === 'active' || event.status === 'published');
          } else if (currentUser.role === 'customer') {
            // For customers, show published events with location
            return hasLocation && event.status === 'published';
          }
          
          return false; // This shouldn't be reached due to early return above
        });
        
        console.log("🎉 HeatMap: Events fetched:", eventsData.length, "events for", currentUser.role || 'unknown role');
        setEvents(eventsData);
      },
      (error) => {
        console.error('❌ HeatMap: Events listener error:', error);
        console.log('📋 Event organizer may not have created events yet or index missing');
        setEvents([]); // Set empty array as fallback
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || truckLocations.length === 0) return;
    
    // Get truck names directly from truckLocation data (no user document access needed)
    const updatedNames = {};
    for (const truck of truckLocations) {
      // Use the truckName stored in the truck location document, with fallback
      updatedNames[truck.id] = truck.truckName || truck.name || "Food Truck";
    }
    console.log("🚛 HeatMap: Using truck names from location data:", updatedNames);
    setTruckNames(updatedNames);
    
    // For food truck owners, center the map on their truck's location
    if (currentUser.role === 'owner' && currentUser.uid) {
      const userTruck = truckLocations.find(truck => truck.id === currentUser.uid || truck.ownerUid === currentUser.uid);
      if (userTruck && userTruck.latitude && userTruck.longitude) {
        const truckCenter = { lat: userTruck.latitude, lng: userTruck.longitude };
        console.log("🗺️ HeatMap: Centering map on truck owner's location:", truckCenter);
        setMapCenter(truckCenter);
        if (mapRef.current) {
          mapRef.current.panTo(truckCenter);
        }
      }
    }
  }, [truckLocations, currentUser]);

// Create a circular icon using canvas to mimic borderRadius: "50%"
const createCircularIcon = (imageUrl, size = 40) => {
  return new Promise((resolve) => {
    // Validate imageUrl
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.log('Invalid image URL provided to createCircularIcon');
      resolve(null);
      return;
    }

    // Skip Firebase Storage URLs due to CORS restrictions
    const isFirebaseStorage = imageUrl.includes('firebasestorage.googleapis.com');
    if (isFirebaseStorage) {
      console.log('Skipping Firebase Storage URL due to CORS restrictions:', imageUrl);
      resolve(null);
      return;
    }

    const img = new Image();
    
    // Don't set crossOrigin for same-domain URLs or relative URLs
    const isSameDomain = imageUrl.includes(window.location.hostname);
    const isRelativeUrl = !imageUrl.startsWith('http');
    
    if (!isSameDomain && !isRelativeUrl) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;

        // Save the context
        ctx.save();
        
        // Create circular clipping path
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI); // Leave space for border
        ctx.clip();

        // Draw the image to fill the circle (like objectFit: "cover")
        const aspectRatio = img.width / img.height;
        let drawWidth = size;
        let drawHeight = size;
        let offsetX = 0;
        let offsetY = 0;

        if (aspectRatio > 1) {
          // Image is wider - scale by height
          drawHeight = size;
          drawWidth = size * aspectRatio;
          offsetX = (size - drawWidth) / 2;
        } else {
          // Image is taller - scale by width
          drawWidth = size;
          drawHeight = size / aspectRatio;
          offsetY = (size - drawHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        // Restore context to remove clipping
        ctx.restore();
        
        // Draw black border around the circle
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 1, 0, 2 * Math.PI);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        resolve(canvas.toDataURL());
      } catch (error) {
        console.log('Canvas error in createCircularIcon:', error.message);
        resolve(null);
      }
    };
    
    img.onerror = (error) => {
      console.log('Failed to load image for circular icon:', imageUrl, error);
      resolve(null);
    };
    
    // Add timeout to prevent hanging
    setTimeout(() => {
      if (!img.complete) {
        console.log('Image loading timeout for:', imageUrl);
        resolve(null);
      }
    }, 5000);
    
    img.src = imageUrl;
  });
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
    
    // Add click event listener to the div
    div.addEventListener('click', () => {
      this.clickListeners.forEach(callback => callback());
    });
    
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

// Event marker icon with 3-color system: Gray for draft, Yellow for active, Green for completed
const getEventIcon = (eventStatus, organizerLogoUrl = null) => {
  if (!window.google) return null;
  
  // If organization logo is available, return custom marker config
  if (organizerLogoUrl) {
    return {
      type: 'custom',
      logoUrl: organizerLogoUrl,
      status: eventStatus
    };
  }
  
  // 3-color system: Gray for draft, Yellow for active, Green for completed
  let fillColor = '#9E9E9E'; // Default gray for draft
  if (eventStatus === 'active') {
    fillColor = '#FFD700'; // Gold for active
  } else if (eventStatus === 'completed') {
    fillColor = '#4CAF50'; // Green for completed
  } else if (eventStatus === 'published') {
    fillColor = '#2196F3'; // Blue for published
  }

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

  const animateMarkerTo = useCallback((marker, newPosition) => {
    // Check if it's a custom marker (has div property) or standard marker
    if (marker && marker.div) {
      // Custom marker - update position and redraw
      console.log('🗺️ HeatMap: Updating custom marker position');
      marker.position = newPosition;
      marker.draw();
    } else if (marker && marker.setPosition) {
      // Standard Google Maps marker
      console.log('🗺️ HeatMap: Updating standard marker position');
      marker.setPosition(newPosition);
    } else {
      console.error('🗺️ HeatMap: Unknown marker type or missing setPosition method', marker);
    }
  }, []);

  const ONLINE_THRESHOLD = 8 * 60 * 60 * 1000; // 8 hours in milliseconds (consistent with mobile)

const updateTruckMarkers = useCallback(async () => {
  if (!window.google || !mapRef.current) return;

  const now = Date.now();
  const currentTruckIds = new Set();

  console.log('🗺️ HeatMap: Updating truck markers, found trucks:', truckLocations.length);

  for (const truck of truckLocations) {
    console.log('🗺️ HeatMap: Processing truck:', truck.id, {
      isLive: truck.isLive,
      visible: truck.visible,
      lastActive: truck.lastActive,
      timeSinceActive: truck.lastActive ? now - truck.lastActive : 'N/A'
    });

    // Since truckLocations can only be created by owners (per Firestore rules), we can trust this data
    // No need to verify role - this avoids permission errors

    // Stricter check for truck visibility - require explicit true values for isLive and visible
    const hasCoordinates = truck.lat && truck.lng;
    const isExplicitlyVisible = truck.visible === true;
    const isExplicitlyLive = truck.isLive === true;
    const shouldShow = hasCoordinates && isExplicitlyVisible && isExplicitlyLive;
    
    // Also hide if truck is very stale (regardless of other flags)
    const isStale = truck.lastActive && (now - truck.lastActive > ONLINE_THRESHOLD);
    
    console.log('🗺️ HeatMap: Visibility check for truck', truck.id, {
      hasCoordinates,
      isExplicitlyVisible,
      isExplicitlyLive,
      shouldShow,
      isStale
    });
    
    if (!shouldShow || isStale) {
      console.log('🗺️ HeatMap: Hiding truck', truck.id, 'shouldShow:', shouldShow, 'isStale:', isStale);
      if (markerRefs.current[truck.id]) {
        markerRefs.current[truck.id].setMap(null);
        delete markerRefs.current[truck.id];
      }
      continue;
    }

    const position = { lat: truck.lat, lng: truck.lng };
    const truckName = truckNames[truck.id] || "Food Truck";
    const truckMarkerId = `truck_${truck.id}`;
    currentTruckIds.add(truckMarkerId);

    // Fetch owner data to get cover photo for custom icon
    let ownerCoverUrl = null;
    try {
      const ownerUid = truck.ownerUid || truck.id;
      const ownerDoc = await getDoc(doc(db, "users", ownerUid));
      if (ownerDoc.exists()) {
        const ownerData = ownerDoc.data();
        ownerCoverUrl = ownerData.coverUrl || null;
      }
    } catch (error) {
      console.error('🗺️ HeatMap: Error fetching owner data for cover photo:', error);
      // Continue with default icon if owner data fetch fails
    }

    if (!markerRefs.current[truckMarkerId]) {
      console.log('🗺️ HeatMap: Creating new marker for truck', truck.id);
      const icon = getTruckIcon(truck.kitchenType, ownerCoverUrl);
      let marker;
      
      // Check if we need to create a custom HTML marker for cover photos
      if (icon && icon.type === 'custom') {
        const customMarkerContent = `
          <div style="
            width: 40px; 
            height: 40px; 
            border-radius: 50%; 
            border: 2px solid #000000; 
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
          console.log('🗺️ HeatMap: Truck marker clicked:', truck.id);
          if (onTruckMarkerClick) {
            onTruckMarkerClick(truck);
          }
        });
      } else {
        // Standard marker
        marker.addListener('click', () => {
          console.log('🗺️ HeatMap: Truck marker clicked:', truck.id);
          if (onTruckMarkerClick) {
            onTruckMarkerClick(truck);
          }
        });
      }
      
      markerRefs.current[truckMarkerId] = marker;
    } else {
      console.log('🗺️ HeatMap: Updating existing marker for truck', truck.id);
      const marker = markerRefs.current[truckMarkerId];
      const icon = getTruckIcon(truck.kitchenType, ownerCoverUrl);
      
      // For custom markers, we need to handle updates differently
      if (marker.div) {
        // Custom marker - update position
        marker.position = position;
        marker.draw(); // Redraw at new position
        
        // Update custom marker content if needed
        if (icon && icon.type === 'custom') {
          const customMarkerContent = `
            <div style="
              width: 40px; 
              height: 40px; 
              border-radius: 50%; 
              border: 2px solid #000000; 
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
          marker.div.innerHTML = customMarkerContent;
        }
      } else {
        // Standard marker
        animateMarkerTo(marker, position);
        const currentTruckName = truckNames[truck.id] || truck.truckName || truck.name || "Food Truck";
        marker.setTitle(currentTruckName);
        
        // Only set icon if it's a valid Google Maps icon (not custom)
        if (icon && icon.type !== 'custom') {
          marker.setIcon(icon);
        }
      }
    }
  }

  // Clean up markers for trucks that no longer meet criteria
  Object.keys(markerRefs.current).forEach((id) => {
    if (!currentTruckIds.has(id) && id.startsWith('truck_')) {
      console.log('🗺️ HeatMap: Cleaning up truck marker for:', id);
      markerRefs.current[id].setMap(null);
      delete markerRefs.current[id];
    }
  });

  // Create/update event markers
  if (showEvents) {
    for (const event of events) {
      const eventId = `event_${event.id}`;
      const position = { lat: event.latitude, lng: event.longitude };
      currentTruckIds.add(eventId);

      if (!markerRefs.current[eventId]) {
        console.log('🎉 HeatMap: Creating new event marker for:', event.id);
        
        // Start with basic icon, then upgrade to custom if logo is available
        const basicIcon = getEventIcon(event.status);
        
        const marker = new window.google.maps.Marker({
          position,
          map: mapRef.current,
          icon: basicIcon,
          title: `Event: ${event.title}`,
          animation: event.status === 'active' ? window.google.maps.Animation.BOUNCE : null,
          zIndex: 1000 // Higher than truck markers to ensure they're visible
        });

        // Event marker click handler
        marker.addListener('click', () => {
          console.log('🎉 HeatMap: Event marker clicked for modal:', event.id);
          handleEventClick(event);
        });
        
        markerRefs.current[eventId] = marker;
        
        // Fetch organizer logo asynchronously and upgrade marker if available
        if (event.organizerId) {
          getDoc(doc(db, 'users', event.organizerId))
            .then(organizerDoc => {
              if (organizerDoc.exists() && organizerDoc.data().logoUrl) {
                const organizerLogoUrl = organizerDoc.data().logoUrl;
                console.log('🎨 HeatMap: Upgrading event marker with organization logo:', event.id);
                
                // Create custom marker with organization logo
                const statusColor = event.status === 'active' ? '#FFD700' : 
                                   event.status === 'published' ? '#2196F3' : 
                                   event.status === 'completed' ? '#4CAF50' : '#9E9E9E';
                
                const customMarkerContent = `
                  <div style="
                    width: 40px; 
                    height: 40px; 
                    border-radius: 50%; 
                    border: 3px solid ${statusColor}; 
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    background: white;
                    position: relative;
                  ">
                    <img src="${organizerLogoUrl}" style="
                      width: 100%; 
                      height: 100%; 
                      object-fit: cover;
                    " />
                    <div style="
                      position: absolute;
                      top: -2px;
                      right: -2px;
                      width: 12px;
                      height: 12px;
                      background: ${statusColor};
                      border-radius: 50%;
                      border: 1px solid white;
                    "></div>
                  </div>
                `;
                
                // Remove old marker and create custom one
                if (markerRefs.current[eventId]) {
                  markerRefs.current[eventId].setMap(null);
                  
                  const customMarker = createCustomMarker(position, customMarkerContent, mapRef.current);
                  customMarker.addListener('click', () => {
                    console.log('🎉 HeatMap: Custom event marker clicked for modal:', event.id);
                    handleEventClick(event);
                  });
                  
                  markerRefs.current[eventId] = customMarker;
                }
              }
            })
            .catch(error => {
              console.log('🔒 HeatMap: Could not fetch organizer data for event:', event.id, error.message);
              // Continue with default icon if organizer data fetch fails
            });
        }
      } else {
        // Update existing event marker
        console.log('🎉 HeatMap: Updating event marker for:', event.id);
        const marker = markerRefs.current[eventId];
        
        // Check if this is a standard Google Maps marker (has setPosition method)
        if (marker.setPosition) {
          marker.setPosition(position);
          marker.setTitle(`Event: ${event.title}`);
          
          const icon = getEventIcon(event.status);
          marker.setIcon(icon);
          marker.setAnimation(event.status === 'active' ? window.google.maps.Animation.BOUNCE : null);
        } else {
          // This is a custom marker, recreate it with updated status
          marker.setMap(null);
          
          // Try to get organizer logo and recreate custom marker
          if (event.organizerId) {
            getDoc(doc(db, 'users', event.organizerId))
              .then(organizerDoc => {
                if (organizerDoc.exists() && organizerDoc.data().logoUrl) {
                  const organizerLogoUrl = organizerDoc.data().logoUrl;
                  const statusColor = event.status === 'active' ? '#FFD700' : 
                                     event.status === 'published' ? '#2196F3' : 
                                     event.status === 'completed' ? '#4CAF50' : '#9E9E9E';
                  
                  const customMarkerContent = `
                    <div style="
                      width: 40px; 
                      height: 40px; 
                      border-radius: 50%; 
                      border: 3px solid ${statusColor}; 
                      overflow: hidden;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                      background: white;
                      position: relative;
                    ">
                      <img src="${organizerLogoUrl}" style="
                        width: 100%; 
                        height: 100%; 
                        object-fit: cover;
                      " />
                      <div style="
                        position: absolute;
                        top: -2px;
                        right: -2px;
                        width: 12px;
                        height: 12px;
                        background: ${statusColor};
                        border-radius: 50%;
                        border: 1px solid white;
                      "></div>
                    </div>
                  `;
                  
                  const customMarker = createCustomMarker(position, customMarkerContent, mapRef.current);
                  customMarker.addListener('click', () => {
                    console.log('🎉 HeatMap: Updated custom event marker clicked for modal:', event.id);
                    handleEventClick(event);
                  });
                  
                  markerRefs.current[eventId] = customMarker;
                } else {
                  // Fallback to standard marker if logo not available
                  const basicIcon = getEventIcon(event.status);
                  const standardMarker = new window.google.maps.Marker({
                    position,
                    map: mapRef.current,
                    icon: basicIcon,
                    title: `Event: ${event.title}`,
                    animation: event.status === 'active' ? window.google.maps.Animation.BOUNCE : null,
                    zIndex: 1000
                  });
                  
                  standardMarker.addListener('click', () => {
                    handleEventClick(event);
                  });
                  
                  markerRefs.current[eventId] = standardMarker;
                }
              })
              .catch(error => {
                console.log('🔒 HeatMap: Could not fetch organizer data for update:', event.id, error.message);
                // Fallback to standard marker
                const basicIcon = getEventIcon(event.status);
                const standardMarker = new window.google.maps.Marker({
                  position,
                  map: mapRef.current,
                  icon: basicIcon,
                  title: `Event: ${event.title}`,
                  animation: event.status === 'active' ? window.google.maps.Animation.BOUNCE : null,
                  zIndex: 1000
                });
                
                standardMarker.addListener('click', () => {
                  handleEventClick(event);
                });
                
                markerRefs.current[eventId] = standardMarker;
              });
          }
        }
      }
    }
  }

  // Clean up event markers for events that no longer exist
  Object.keys(markerRefs.current).forEach((id) => {
    if (id.startsWith('event_') && !currentTruckIds.has(id)) {
      console.log('🎉 HeatMap: Cleaning up event marker for:', id);
      markerRefs.current[id].setMap(null);
      delete markerRefs.current[id];
    }
  });
}, [truckLocations, truckNames, events, showEvents, animateMarkerTo, onTruckMarkerClick]);
  
  // Function to toggle visibility of a truck marker
  const toggleVisibility = (truckId) => {
    setTruckLocations((prevLocations) => {
      return prevLocations.map((truck) =>
        truck.id === truckId
          ? { ...truck, visible: !truck.visible } // Toggle the visibility
          : truck
      );
    });
  };
    
  const throttledUpdateTruckMarkers = useCallback(
    throttle(updateTruckMarkers, 100), // Throttle to run every 100ms
    [truckLocations, truckNames, currentUser, animateMarkerTo]
  );
  
  useEffect(() => {
    if (mapReady) {
      //console.log("Map loaded");
      throttledUpdateTruckMarkers();
    }
  }, [mapReady, truckLocations, truckNames, throttledUpdateTruckMarkers]);

  const toggleCuisine = (cuisine) => {
    setFilters((prev) => {
      const updated = {
        ...prev,
        [cuisine]: !prev[cuisine], // Toggle the filter for the selected cuisine
      };
      //console.log("Updated filters:", updated);
      return updated;
    });
  };

   // Place the toggleTimeFilter function here
   const toggleTimeFilter = (time) => {
    setTimeFilter((prev) => ({
      ...prev,
      [time]: !prev[time], // Toggle the selected time filter
    }));
  };

  const combinedHeatmapData = useMemo(() => {
    if (!pingData.length || !window.google) return [];
  
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
    const data = pingData
      .filter((ping) => {
        const cuisineRaw = ping.cuisineType || "";
        const cuisine = cuisineRaw.toLowerCase().trim();
  
        if (!filters.hasOwnProperty(cuisine)) {
          console.warn("Unknown cuisine type:", cuisine);
          return false;
        }
  
        if (!filters[cuisine]) return false;
  
        let lat = Number(ping.lat ?? ping.latitude);
        let lng = Number(ping.lng ?? ping.longitude);
        if (!isFinite(lat) || !isFinite(lng)) return false;
  
        // Removed distance/bounds check - show all pings globally
  
        const timestamp = ping.timestamp?.toDate?.();
        if (!timestamp || timestamp <= oneDayAgo) return false;
  
        return true;
      })
      .map((ping) => {
        const lat = Number(ping.lat ?? ping.latitude);
        const lng = Number(ping.lng ?? ping.longitude);
        return new window.google.maps.LatLng(lat, lng);
      });
  
    //console.log("Filtered heatmap points:", data.length);
    return data;
  }, [pingData, filters]);
  
useEffect(() => {
  if (!mapRef.current || !window.google) return;

  if (heatmapRef.current) {
    heatmapRef.current.setMap(null); // Remove existing layer
    heatmapRef.current = null;
  }

  // Only show heatmap for Pro and All-Access plans
  if (userPlan === "basic" || !combinedHeatmapData.length) return;

  const newHeatmap = new window.google.maps.visualization.HeatmapLayer({
    data: combinedHeatmapData,
    map: mapRef.current,
    radius: calculateRadius(mapRef.current.getZoom() || 12),
    opacity: 0.6,
    gradient: [
      "rgba(0, 255, 255, 0)",
      "rgba(0, 255, 255, 1)",
      "rgba(0, 191, 255, 1)",
      "rgba(0, 127, 255, 1)",
      "rgba(0, 63, 255, 1)",
      "rgba(0, 0, 255, 1)",
      "rgba(255, 0, 0, 1)",
    ],
  });

  heatmapRef.current = newHeatmap;

  return () => {
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }
  };
}, [combinedHeatmapData, userPlan]);

  // Event Application Functions
  const handleEventClick = (event) => {
    console.log('🎉 HeatMap: Event clicked for application:', event.id);
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleApplyToEvent = () => {
    setShowEventModal(false);
    setShowApplicationForm(true);
    // Pre-fill application data with user info if available
    if (currentUser) {
      setApplicationData(prev => ({
        ...prev,
        email: currentUser.email || '',
        vendorName: currentUser.displayName || '',
        businessName: truckNames[currentUser.uid] || ''
      }));
    }
  };

  const handleApplicationSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEvent || !currentUser) {
      alert('Unable to submit application. Please try again.');
      return;
    }

    try {
      console.log('📝 Submitting application for event:', selectedEvent.id);
      
      const applicationDoc = {
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        organizerId: selectedEvent.organizerId,
        applicantId: currentUser.uid,
        vendorName: applicationData.vendorName,
        businessName: applicationData.businessName,
        email: applicationData.email,
        phone: applicationData.phone,
        foodType: applicationData.foodType,
        description: applicationData.description,
        experience: applicationData.experience,
        specialRequests: applicationData.specialRequests,
        status: 'pending',
        appliedAt: new Date(),
        createdAt: new Date()
      };

      await addDoc(collection(db, 'eventApplications'), applicationDoc);
      
      console.log('✅ Application submitted successfully');
      alert('Application submitted successfully! The event organizer will review your application.');
      
      // Reset form and close modals
      setShowApplicationForm(false);
      setSelectedEvent(null);
      setApplicationData({
        vendorName: '',
        businessName: '',
        email: '',
        phone: '',
        foodType: '',
        description: '',
        experience: '',
        specialRequests: ''
      });
      
    } catch (error) {
      console.error('❌ Error submitting application:', error);
      alert('Error submitting application. Please try again.');
    }
  };

  const closeApplicationForm = () => {
    setShowApplicationForm(false);
    setSelectedEvent(null);
    setApplicationData({
      vendorName: '',
      businessName: '',
      email: '',
      phone: '',
      foodType: '',
      description: '',
      experience: '',
      specialRequests: ''
    });
  };

return (
  <div>
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={mapCenter}
      zoom={12}
      onLoad={(map) => {
        mapRef.current = map;
        if (onMapLoad) onMapLoad(map);
        setMapReady(true);
      }}
    >
      {mapReady && combinedHeatmapData.length === 0 && userPlan !== "basic" && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <h3>No data available for the selected filters.</h3>
        </div>
      )}
    </GoogleMap>

    {/* Only show heatmap features for Pro and All-Access plans */}
    {userPlan === "pro" || userPlan === "all-access" ? (
      <>
        <HeatMapKey />

        <div style={{ marginTop: "16px", marginBottom: "10px" }}>
          <button
            style={{
              padding: "10px 18px",
              backgroundColor: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              marginRight: "10px"
            }}
            onClick={() => setShowCuisineModal(true)}
          >
            Cuisine Filters
          </button>
          
          <button
            style={{
              padding: "10px 18px",
              backgroundColor: showEvents ? "#FF6B35" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onClick={() => setShowEvents(!showEvents)}
          >
            {showEvents ? "Hide Events" : "Show Events"} ({events.length})
          </button>
        </div>
      </>
    ) : (
      <div style={{ 
        marginTop: "16px", 
        padding: "15px", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        textAlign: "center"
      }}>
        <h4 style={{ margin: "0 0 8px 0", color: "#666" }}>🎯 Heat Map Features</h4>
        <p style={{ margin: "0", fontSize: "0.9rem", color: "#666" }}>
          Upgrade to <strong>Pro</strong> or <strong>All-Access</strong> to see demand heat maps and cuisine filters that show where customers are requesting specific food types in real-time!
        </p>
      </div>
    )}

    {/* Cuisine Filters Modal - Only for Pro and All-Access */}
    {(userPlan === "pro" || userPlan === "all-access") && showCuisineModal && (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "24px 12px 24px 12px", // Reduce padding even more
          minWidth: "320px",
          width: "100%",
          maxWidth: "min(90vw, 680px)", // Combined max width constraints
          boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
          margin: "16px", // Add margin for small screens
          overflowX: "hidden", // Prevent horizontal scrolling
          overflow: "hidden", // Prevent all overflow
        }}>
          <h2 style={{marginTop:0}}>Select Cuisines</h2>
          <form
            onSubmit={e => {
              e.preventDefault();
              setFilters(tempCuisineFilters);
              setShowCuisineModal(false);
            }}
          >
            <div style={{
              maxHeight: "50vh",
              overflowY: "auto",
              overflowX: "hidden", // Prevent horizontal scrolling
              marginBottom: "18px",
              display: "grid",
              gridTemplateColumns: window.innerWidth < 600 ? "1fr" : "1fr 1fr", // Single column on mobile, two on desktop
              gap: "12px 16px", // Vertical and horizontal gap
              padding: "8px", // Add some padding for better touch targets
              width: "100%",
            }}>
              {Object.keys(filters).map((cuisine) => (
                <label key={cuisine} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "12px", // Increased gap between checkbox and text
                  fontSize: window.innerWidth < 600 ? "16px" : "14px", // Larger font on mobile for better readability
                  cursor: "pointer",
                  width: "100%",
                  minHeight: "44px", // Minimum touch target size for mobile
                  padding: "8px", // Add padding for better touch area
                  borderRadius: "4px", // Subtle border radius
                  transition: "background-color 0.2s ease",
                  backgroundColor: "transparent",
                  ...(window.innerWidth < 600 && {
                    border: "1px solid #e0e0e0", // Add border on mobile for better separation
                  })
                }}>
                  <input
                    type="checkbox"
                    checked={tempCuisineFilters[cuisine]}
                    onChange={() => setTempCuisineFilters(f => ({ ...f, [cuisine]: !f[cuisine] }))}
                    style={{
                      width: "18px", // Fixed width for consistency
                      height: "18px", // Fixed height for consistency
                      margin: "0", // Remove default margins
                      flexShrink: 0, // Prevent checkbox from shrinking
                      cursor: "pointer",
                    }}
                  />
                  <span style={{
                    flex: 1,
                    textAlign: "left",
                    lineHeight: "1.3",
                    wordBreak: "break-word", // Handle long text
                  }}>
                    {cuisine === 'asian-fusion' ? 'Asian Fusion' :
                     cuisine === 'bbq' ? 'BBQ' :
                     cuisine === 'coffee' ? 'Coffee & Café' :
                     cuisine === 'desserts' ? 'Desserts & Sweets' :
                     cuisine === 'drinks' ? 'Drinks & Beverages' :
                     cuisine === 'latin' ? 'Latin American' :
                     cuisine === 'sushi' ? 'Sushi & Japanese' :
                     cuisine === 'healthy' ? 'Healthy & Fresh' :
                     cuisine === 'southern' ? 'Southern Comfort' :
                     cuisine === 'vegan' ? 'Vegan & Vegetarian' :
                     cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                  </span>
                </label>
              ))}
            </div>
            <div style={{display: "flex", justifyContent: "flex-end", gap: "12px"}}>
              <button type="button" onClick={() => setShowCuisineModal(false)} style={{padding: "8px 16px", borderRadius: "4px", border: "none", background: "#ccc", color: "#333"}}>Cancel</button>
              <button type="submit" style={{padding: "8px 16px", borderRadius: "4px", border: "none", background: "#1976d2", color: "#fff", fontWeight: "bold"}}>Apply</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Event Status Legend - moved below map to avoid obstruction */}
    {events.length > 0 && showEvents && (
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
              backgroundColor: '#9E9E9E',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
            }} />
            <span style={{ fontSize: '12px' }}>
              <strong>Draft</strong> - Event not started yet
            </span>
          </div>
          
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
              <strong>Active</strong> - Event is happening now
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '14px',
              height: '14px',
              backgroundColor: '#4CAF50',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
            }} />
            <span style={{ fontSize: '12px' }}>
              <strong>Completed</strong> - Event has ended
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
        onApply={handleApplyToEvent}
      />
    )}

    {/* Application Form Modal */}
    {showApplicationForm && selectedEvent && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#FF6B35' }}>📝 Apply to: {selectedEvent.title}</h3>
            <button
              onClick={closeApplicationForm}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleApplicationSubmit}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={applicationData.vendorName}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, vendorName: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={applicationData.businessName}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, businessName: e.target.value }))}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={applicationData.email}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, email: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={applicationData.phone}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, phone: e.target.value }))}
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

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Food Type/Cuisine *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Mexican, BBQ, Asian Fusion, Desserts"
                  value={applicationData.foodType}
                  onChange={(e) => setApplicationData(prev => ({ ...prev, foodType: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Business Description *
                </label>
                <textarea
                  required
                  placeholder="Tell us about your food truck/business..."
                  value={applicationData.description}
                  onChange={(e) => setApplicationData(prev => ({ ...prev, description: e.target.value }))}
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

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Experience & Previous Events
                </label>
                <textarea
                  placeholder="Previous events, years in business, notable achievements..."
                  value={applicationData.experience}
                  onChange={(e) => setApplicationData(prev => ({ ...prev, experience: e.target.value }))}
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

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Special Requests or Requirements
                </label>
                <textarea
                  placeholder="Power requirements, space needs, special setup..."
                  value={applicationData.specialRequests}
                  onChange={(e) => setApplicationData(prev => ({ ...prev, specialRequests: e.target.value }))}
                  rows={2}
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
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '30px' }}>
              <button
                type="button"
                onClick={closeApplicationForm}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                📝 Submit Application
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

  </div>
 );
}

export default HeatMap;
