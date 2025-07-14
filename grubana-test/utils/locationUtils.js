// Utility functions for location and distance calculations

/**
 * Calculate distance between two points in miles using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in miles
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 3959; // Radius of Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Filter food trucks by distance from user location
 * @param {Array} trucks - Array of food truck objects
 * @param {Object} userLocation - User's location {latitude, longitude}
 * @param {number} maxDistance - Maximum distance in miles
 * @returns {Array} Filtered array of trucks within distance
 */
export const filterTrucksByDistance = (trucks, userLocation, maxDistance) => {
  if (!userLocation || !trucks.length) return trucks;
  
  return trucks.filter(truck => {
    if (!truck.lat || !truck.lng) return false;
    
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      truck.lat,
      truck.lng
    );
    
    return distance <= maxDistance;
  });
};

/**
 * Format distance for display
 * @param {number} distance - Distance in miles
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance) => {
  if (distance < 0.1) return 'Very close';
  if (distance < 1) return `${(distance * 5280).toFixed(0)} ft away`;
  return `${distance.toFixed(1)} mi away`;
};

/**
 * Default distance settings for different contexts
 */
export const DISTANCE_SETTINGS = {
  MAP_SCREEN_DEFAULT: 25,     // Default distance for map screen
  DASHBOARD_MAX: 30,          // Max distance for dashboard
  PING_RADIUS: 50,           // Max radius for ping notifications
  NEARBY_THRESHOLD: 5,        // "Nearby" threshold
  DISTANCE_OPTIONS: [10, 15, 25, 35, 50], // Available filter options
};

/**
 * Check if a truck is considered "nearby"
 * @param {Object} userLocation - User's location
 * @param {Object} truckLocation - Truck's location
 * @returns {boolean} True if truck is nearby
 */
export const isTruckNearby = (userLocation, truckLocation) => {
  if (!userLocation || !truckLocation) return false;
  
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    truckLocation.lat,
    truckLocation.lng
  );
  
  return distance <= DISTANCE_SETTINGS.NEARBY_THRESHOLD;
};
