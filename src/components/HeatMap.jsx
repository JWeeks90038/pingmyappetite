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
    const fetchAllTruckNames = async () => {
      const updatedNames = {};
      for (const truck of truckLocations) {
        const userId = truck.uid || truck.id;
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        updatedNames[truck.id] = userDoc.exists()
          ? userDoc.data().truckName || "Food Truck"
          : "Food Truck";
      }
      //console.log("Resolved truck names:", updatedNames);
      setTruckNames(updatedNames);
    };
    fetchAllTruckNames();
  }, [truckLocations, currentUser]);

 const getTruckIcon = (kitchenType) => {
  if (window.google) {
    const type = (kitchenType || 'truck').toLowerCase();
    let url = "/truck-icon.png";
    if (type === "trailer") url = "/trailer-icon.png";
    if (type === "cart") url = "/cart-icon.png";
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

const updateTruckMarkers = useCallback(() => {
  if (!window.google || !mapRef.current) return;

  const now = Date.now();
  const currentTruckIds = new Set();

  console.log('🗺️ HeatMap: Updating truck markers, found trucks:', truckLocations.length);

  truckLocations.forEach((truck) => {
    console.log('🗺️ HeatMap: Processing truck:', truck.id, {
      isLive: truck.isLive,
      visible: truck.visible,
      lastActive: truck.lastActive,
      timeSinceActive: truck.lastActive ? now - truck.lastActive : 'N/A'
    });

    // More lenient check for truck visibility - allow showing trucks even if some fields are missing
    const shouldShow = truck.lat && truck.lng && truck.visible !== false && truck.isLive !== false;
    
    // Only hide if explicitly set to false or if truck is very stale
    const isStale = truck.lastActive && (now - truck.lastActive > ONLINE_THRESHOLD);
    
    if (!shouldShow || isStale) {
      console.log('🗺️ HeatMap: Hiding truck', truck.id, 'shouldShow:', shouldShow, 'isStale:', isStale);
      if (markerRefs.current[truck.id]) {
        markerRefs.current[truck.id].setMap(null);
        delete markerRefs.current[truck.id];
      }
      return;
    }

    const position = { lat: truck.lat, lng: truck.lng };
    const truckName = truckNames[truck.id] || "Food Truck";
    currentTruckIds.add(truck.id);

    if (!markerRefs.current[truck.id]) {
      console.log('🗺️ HeatMap: Creating new marker for truck', truck.id);
      const marker = new window.google.maps.Marker({
        position,
        map: mapRef.current,
        title: truckName,
        icon: getTruckIcon(truck.kitchenType),
      });
      
      // Add click listener for truck markers
      marker.addListener('click', () => {
        console.log('🗺️ HeatMap: Truck marker clicked:', truck.id);
        if (onTruckMarkerClick) {
          onTruckMarkerClick(truck);
        }
      });
      
      markerRefs.current[truck.id] = marker;
    } else {
      console.log('🗺️ HeatMap: Updating existing marker for truck', truck.id);
      animateMarkerTo(markerRefs.current[truck.id], position);
      markerRefs.current[truck.id].setTitle(truckName);
    }
  });

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
