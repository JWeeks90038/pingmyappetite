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
import HeatMapKey from "./HeatMapKey"; // Assuming you have a HeatMapKey component
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

const HeatMap = ({isLoaded, onMapLoad}) => {
  const db = getFirestore();
  const auth = getAuth();
  

  const [currentUser, setCurrentUser] = useState(null);
  const [pingData, setPingData] = useState([]);
  const [truckLocations, setTruckLocations] = useState([]);
  const [truckNames, setTruckNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 34.0522, lng: -118.2437 });
  const [filters, setFilters] = useState({
    mexican: true,
    bbq: true,
    sushi: true,
    american: true,
    vegan: true,
    italian: true,
    chinese: true,
    desserts: true, // New cuisine
    drinks: true,   // New cuisine
    indian: true,   // New cuisine
  });

  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const infoWindowRef = useRef(null);
  const heatmapRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed. Current user:", user);
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
          console.log("User geolocation detected:", position.coords);
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
      console.log("Filtered ping data:", data);
      setPingData(data);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    console.log("Attempting to fetch data from Firestore...");
    const unsubscribe = onSnapshot(collection(db, "truckLocations"), (snapshot) => {
      console.log("Pings data fetched successfully:", snapshot.docs.map((doc) => doc.data()));
      const trucks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("Truck locations fetched:", trucks);
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
      console.log("Resolved truck names:", updatedNames);
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

  const ONLINE_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds

const updateTruckMarkers = useCallback(() => {
  if (!window.google || !mapRef.current) return;

  const now = Date.now();
  const currentTruckIds = new Set();

  truckLocations.forEach((truck) => {
    // Only show trucks that are live, visible, and recently active
    if (
      !truck.isLive ||
      !truck.visible ||
      !truck.lastActive ||
      now - truck.lastActive > ONLINE_THRESHOLD
    ) {
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
      const marker = new window.google.maps.Marker({
        position,
        map: mapRef.current,
        title: truckName,
        icon: getTruckIcon(truck.kitchenType),
      });
      markerRefs.current[truck.id] = marker;
    } else {
      animateMarkerTo(markerRefs.current[truck.id], position);
      markerRefs.current[truck.id].setTitle(truckName);
    }
  });

  Object.keys(markerRefs.current).forEach((id) => {
    if (!currentTruckIds.has(id)) {
      markerRefs.current[id].setMap(null);
      delete markerRefs.current[id];
    }
  });
}, [truckLocations, truckNames, animateMarkerTo]);
  
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
      console.log("Map loaded");
      throttledUpdateTruckMarkers();
    }
  }, [mapReady, truckLocations, truckNames, throttledUpdateTruckMarkers]);

  const toggleCuisine = (cuisine) => {
    setFilters((prev) => {
      const updated = {
        ...prev,
        [cuisine]: !prev[cuisine], // Toggle the filter for the selected cuisine
      };
      console.log("Updated filters:", updated);
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
    if (!pingData.length || !window.google || !mapRef.current) return [];
  
    const bounds = mapRef.current.getBounds();
    if (!bounds) return [];
  
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
  
        const latLng = new window.google.maps.LatLng(lat, lng);
        if (!mapRef.current.getBounds()?.contains(latLng)) return false;
  
        const timestamp = ping.timestamp?.toDate?.();
        if (!timestamp || timestamp <= oneDayAgo) return false;
  
        return true;
      })
      .map((ping) => {
        const lat = Number(ping.lat ?? ping.latitude);
        const lng = Number(ping.lng ?? ping.longitude);
        return new window.google.maps.LatLng(lat, lng);
      });
  
    console.log("Filtered heatmap points:", data.length);
    return data;
  }, [pingData, filters, mapRef.current]);
  
useEffect(() => {
  if (!mapRef.current || !window.google) return;

  if (heatmapRef.current) {
    heatmapRef.current.setMap(null); // Remove existing layer
    heatmapRef.current = null;
  }

  if (!combinedHeatmapData.length) return;

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
}, [combinedHeatmapData]);

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
      {mapReady && combinedHeatmapData.length === 0 && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <h3>No data available for the selected filters.</h3>
        </div>
      )}
    </GoogleMap>

    <HeatMapKey />

    <div style={{ marginTop: "16px", marginBottom: "10px" }}>
      {Object.keys(filters).map((cuisine) => (
        <FilterButton
          key={cuisine}
          label={cuisine}
          active={filters[cuisine]}
          onClick={() => toggleCuisine(cuisine)}
        />
      ))}
    </div>
  </div>
);
};

export default HeatMap;
