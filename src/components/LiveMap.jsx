import React, { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  HeatmapLayer,
  Marker,
} from "@react-google-maps/api";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import PinDrop from "../utils/pinDrop";
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

const LiveMap = ({ isLoaded }) => {
  const [pins, setPins] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [userLocation, setUserLocation] = useState(null);
  const [mapZoom, setMapZoom] = useState(4);
  const mapRef = useRef(null);

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
        })).filter(event => 
          event.latitude && 
          event.longitude && 
          (event.status === 'published' || event.status === 'active')
        );

        console.log("🎉 LiveMap: Active events fetched:", eventsData);
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

        {/* Event markers (yellow stars) */}
        {events.map((event) => (
          <Marker
            key={event.id}
            position={{ lat: event.latitude, lng: event.longitude }}
            icon={getEventIcon(event.status)}
            title={`Event: ${event.title} - ${event.date}`}
          />
        ))}

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
    </>
  );
};

export default LiveMap;
