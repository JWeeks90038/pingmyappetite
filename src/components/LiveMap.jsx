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

const center = {
  lat: 34.0522,
  lng: -118.2437,
};

const LiveMap = ({ isLoaded }) => {
  const [pins, setPins] = useState([]);
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const mapRef = useRef(null);

  useEffect(() => {
    if (!isLoaded) return;

    const unsubscribe = onSnapshot(collection(db, "pings"), (snapshot) => {
      const pinData = snapshot.docs.map((doc) => doc.data());
      setPins(pinData);
    });

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
        center={center}
        zoom={12}
        onClick={handleMapClick}
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        {filteredPins.map((pin, idx) => (
          <Marker
            key={idx}
            position={pin.location}
            title={pin.notes || "Food Request"}
          />
        ))}

        {heatmapData.length > 0 && (
          <HeatmapLayer data={heatmapData} options={{ radius: 30 }} />
        )}
      </GoogleMap>
    </>
  );
};

export default LiveMap;
