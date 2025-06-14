import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext'; // To get user plan info

const LocationUpdate = () => {
  const { user, userRole } = useAuth(); // Get user and their plan
  const [location, setLocation] = useState(null);
  const [manualLocation, setManualLocation] = useState("");

  useEffect(() => {
    // If the user is on the All Access plan, use geolocation
    if (userRole === 'owner' && user.plan === 'all-access') {
      // Use browser geolocation
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error(error);
        }
      );
    }
  }, [user, userRole]);

  const handleLocationChange = (e) => {
    setManualLocation(e.target.value); // Update manual location
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Save manual location or handle logic for Basic users
    //console.log("Submitted Location: ", manualLocation);
  };

  return (
    <div>
      {userRole === 'owner' && user.plan === 'basic' ? (
        <form onSubmit={handleSubmit}>
          <label>Enter your truck's location:</label>
          <input
            type="text"
            value={manualLocation}
            onChange={handleLocationChange}
            placeholder="Enter address or coordinates"
            required
          />
          <button type="submit">Save Location</button>
        </form>
      ) : (
        <div>
          <h3>Your Current Location:</h3>
          {location ? (
            <p>Lat: {location.latitude}, Long: {location.longitude}</p>
          ) : (
            <p>Loading location...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationUpdate;
