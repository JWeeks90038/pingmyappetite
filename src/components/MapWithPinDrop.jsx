import React from "react";
import { GoogleMap } from "@react-google-maps/api";
import { addPinDrop } from "../utils/addPinDrop";
import { auth } from "../firebase";

const containerStyle = {
  width: "100%",
  height: "500px"
};

const center = {
  lat: 32.7157,  // San Diego default
  lng: -117.1611
};

const MapWithPinDrop = ({ isLoaded }) => {
  const handleMapClick = async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    const notes = prompt("What kind of food do you want here?");

    if (auth.currentUser) {
      await addPinDrop({
        lat,
        lng,
        userId: auth.currentUser.uid,
        notes
      });
      alert("Your pin was added!");
    } else {
      alert("Please log in to drop a pin.");
    }
  };

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      onClick={handleMapClick}
    >
      {/* Optional: Add pins or overlays here */}
    </GoogleMap>
  );
};

export default MapWithPinDrop;
