/**
 * TruckTaggingService
 * Handles tagging food trucks in foodie photos
 */

import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';

class TruckTaggingService {
  
  /**
   * Get nearby food trucks for tagging
   * @param {Object} location - User's location
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Promise<Array>} Array of nearby food trucks
   */
  async getNearbyTrucksForTagging(location, radiusKm = 10) {
    try {
   
      
      const trucksQuery = query(
        collection(db, 'foodTrucks'),
        where('approved', '==', true),
        limit(50)
      );

      const snapshot = await getDocs(trucksQuery);
      const allTrucks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter by distance if location is provided
      if (location && location.latitude && location.longitude) {
        const nearbyTrucks = allTrucks.filter(truck => {
          if (!truck.location || !truck.location.latitude || !truck.location.longitude) {
            return false;
          }

          const distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            truck.location.latitude,
            truck.location.longitude
          );

          return distance <= radiusKm;
        });

  
        return nearbyTrucks.map(truck => ({
          id: truck.id,
          truckName: truck.truckName || truck.name || 'Unknown Truck',
          cuisineType: truck.cuisineType || 'Food',
          location: truck.location,
          distance: this.calculateDistance(
            location.latitude,
            location.longitude,
            truck.location.latitude,
            truck.location.longitude
          )
        })).sort((a, b) => a.distance - b.distance); // Sort by distance
      }

      // If no location, return all trucks
  
      return allTrucks.map(truck => ({
        id: truck.id,
        truckName: truck.truckName || truck.name || 'Unknown Truck',
        cuisineType: truck.cuisineType || 'Food',
        location: truck.location
      }));

    } catch (error) {
   
      return [];
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in kilometers
    return Math.round(d * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Convert degrees to radians
   * @param {number} deg - Degrees
   * @returns {number} Radians
   */
  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Search trucks by name for tagging
   * @param {string} searchTerm - Search term
   * @param {Array} trucks - Array of trucks to search
   * @returns {Array} Filtered trucks
   */
  searchTrucksByName(searchTerm, trucks) {
    if (!searchTerm || searchTerm.length < 2) {
      return trucks.slice(0, 10); // Return first 10 if no search term
    }

    const filtered = trucks.filter(truck => 
      truck.truckName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.cuisineType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.slice(0, 10); // Limit results
  }
}

export default new TruckTaggingService();