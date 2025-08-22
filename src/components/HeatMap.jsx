import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { GoogleMap, HeatmapLayer } from "@react-google-maps/api";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import HeatMapKey from "./HeatmapKey"; // Assuming you have a HeatMapKey component
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
  const [truckNames, setTruckNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 34.0522, lng: -118.2437 });
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      //console.log("Auth state changed. Current user:", user);
      setCurrentUser(user || null);
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
        (error) => console.error("Geolocation error:", error),
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
    const sw = overlayProjection.fromLatLngToDivPixel(position);
    const div = this.div;
    div.style.left = (sw.x - 20) + 'px'; // Center the 40px icon
    div.style.top = (sw.y - 20) + 'px';
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

  const animateMarkerTo = useCallback((marker, newPosition) => {
    marker.setPosition(newPosition);
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
    const isOwnerViewingOwnTruck = currentUser && truck.id === currentUser.uid;
    const shouldShow = hasCoordinates && (isExplicitlyVisible && isExplicitlyLive || isOwnerViewingOwnTruck);
    
    // Also hide if truck is very stale (regardless of other flags), but not for owner viewing own truck
    const isStale = truck.lastActive && (now - truck.lastActive > ONLINE_THRESHOLD);
    const shouldHideStale = isStale && !isOwnerViewingOwnTruck;
    
    console.log('🗺️ HeatMap: Visibility check for truck', truck.id, {
      hasCoordinates,
      isExplicitlyVisible,
      isExplicitlyLive,
      isOwnerViewingOwnTruck,
      shouldShow,
      isStale: isStale,
      shouldHideStale
    });
    
    if (!shouldShow || shouldHideStale) {
      console.log('🗺️ HeatMap: Hiding truck', truck.id, 'shouldShow:', shouldShow, 'shouldHideStale:', shouldHideStale);
      if (markerRefs.current[truck.id]) {
        markerRefs.current[truck.id].setMap(null);
        delete markerRefs.current[truck.id];
      }
      continue;
    }

    const position = { lat: truck.lat, lng: truck.lng };
    const truckName = truckNames[truck.id] || "Food Truck";
    currentTruckIds.add(truck.id);

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

    if (!markerRefs.current[truck.id]) {
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
        marker = new window.google.maps.Marker({
          position,
          map: mapRef.current,
          title: truckName,
          icon: icon,
        });
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
      
      markerRefs.current[truck.id] = marker;
    } else {
      console.log('🗺️ HeatMap: Updating existing marker for truck', truck.id);
      const marker = markerRefs.current[truck.id];
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
        marker.setTitle(truckName);
        marker.setIcon(icon);
      }
    }
  }

  // Clean up markers for trucks that no longer meet criteria
  Object.keys(markerRefs.current).forEach((id) => {
    if (!currentTruckIds.has(id)) {
      console.log('🗺️ HeatMap: Cleaning up marker for truck', id);
      markerRefs.current[id].setMap(null);
      delete markerRefs.current[id];
    }
  });
}, [truckLocations, truckNames, animateMarkerTo, onTruckMarkerClick]);
  
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
            }}
            onClick={() => setShowCuisineModal(true)}
          >
            Cuisine Filters
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

  </div>
 );
}

export default HeatMap;
