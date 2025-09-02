import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { calculateDistance, formatDistance, DISTANCE_SETTINGS } from '../utils/locationUtils';

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [foodTrucks, setFoodTrucks] = useState([]);
  const [allFoodTrucks, setAllFoodTrucks] = useState([]); // Store all trucks
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [maxDistance, setMaxDistance] = useState(DISTANCE_SETTINGS.MAP_SCREEN_DEFAULT); // Default 25 miles
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);
  
  // Status filtering states
  const [showOpenTrucks, setShowOpenTrucks] = useState(true);
  const [showClosedTrucks, setShowClosedTrucks] = useState(true);

  useEffect(() => {
    getCurrentLocation();
    const unsubscribe = listenToFoodTrucks();
    return unsubscribe;
  }, []);

  // Filter trucks by distance when userLocation or maxDistance changes
  useEffect(() => {
    if (!userLocation || allFoodTrucks.length === 0) {
      setFoodTrucks(allFoodTrucks);
      return;
    }

    const filteredTrucks = allFoodTrucks.filter(truck => {
      const distance = calculateDistanceLocal(
        userLocation.latitude, 
        userLocation.longitude, 
        truck.lat, 
        truck.lng
      );
      return distance <= maxDistance;
    });

    // Apply status filter
    const statusFilteredTrucks = filteredTrucks.filter(truck => {
      const truckStatus = getTruckStatus(truck);
      
      if (truckStatus === 'open' || truckStatus === 'busy') {
        return showOpenTrucks;
      } else if (truckStatus === 'closed') {
        return showClosedTrucks;
      }
      
      return true; // Show trucks with unknown status by default
    });

    setFoodTrucks(statusFilteredTrucks);
  }, [userLocation, allFoodTrucks, maxDistance, showOpenTrucks, showClosedTrucks]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to show your position.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your location.');
    }
  };

  const listenToFoodTrucks = () => {
    const trucksRef = collection(db, 'truckLocations');
    const q = query(trucksRef, where('isLive', '==', true), where('visible', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trucks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllFoodTrucks(trucks); // Store all trucks for filtering
    });

    return unsubscribe;
  };

  // Calculate distance between two points in miles
  const calculateDistanceLocal = calculateDistance;

  const getDistanceFromUser = (truckLat, truckLng) => {
    if (!userLocation) return 'Unknown';

    const distance = calculateDistanceLocal(
      userLocation.latitude, 
      userLocation.longitude, 
      truckLat, 
      truckLng
    );

    return formatDistance(distance);
  };

  const getTruckIcon = (kitchenType) => {
    switch (kitchenType) {
      case 'trailer': return '🚚';
      case 'cart': return '🛒';
      default: return '🍕';
    }
  };

  // Get truck status based on business hours
  const getTruckStatus = (truck) => {
    // If truck has explicit status, use it
    if (truck.status) {
      return truck.status;
    }

    // If truck has business hours, check if it's currently open
    if (truck.businessHours) {
      const now = new Date();
      const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const dayHours = truck.businessHours[currentDay];
      
      if (!dayHours || dayHours.closed) {
        return 'closed';
      }

      const currentTime = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
      
      // Simple time comparison (this could be enhanced with the same logic from MapScreen.js)
      // For now, assume open during business hours
      return 'open';
    }

    // Default to open if no business hours are set
    return 'open';
  };

  // Toggle truck status visibility
  const toggleTruckStatus = () => {
    if (showClosedTrucks && showOpenTrucks) {
      // Currently showing all - hide closed trucks
      setShowClosedTrucks(false);
    } else if (!showClosedTrucks && showOpenTrucks) {
      // Currently hiding closed - hide open trucks instead
      setShowClosedTrucks(true);
      setShowOpenTrucks(false);
    } else if (showClosedTrucks && !showOpenTrucks) {
      // Currently hiding open - show all trucks
      setShowOpenTrucks(true);
    }
  };

  const getStatusToggleText = () => {
    if (showClosedTrucks && showOpenTrucks) {
      return '🟢 Hide Closed';
    } else if (!showClosedTrucks && showOpenTrucks) {
      return '🔴 Show Closed';
    } else if (showClosedTrucks && !showOpenTrucks) {
      return '🟢 Show Open';
    }
    return '🟢 Hide Closed';
  };

  const renderTruckItem = ({ item }) => {
    const truckStatus = getTruckStatus(item);
    const statusEmoji = truckStatus === 'open' ? '🟢' : truckStatus === 'busy' ? '🟡' : '🔴';
    
    return (
      <TouchableOpacity
        style={styles.truckItem}
        onPress={() => setSelectedTruck(item)}
      >
        <View style={styles.truckHeader}>
          <Text style={styles.truckIcon}>{getTruckIcon(item.kitchenType)}</Text>
          <View style={styles.truckInfo}>
            <Text style={styles.truckName}>{item.truckName || 'Food Truck'}</Text>
            <Text style={styles.truckCuisine}>{item.cuisine || 'Various'}</Text>
            <Text style={styles.distance}>{getDistanceFromUser(item.lat, item.lng)}</Text>
          </View>
          <View style={styles.liveIndicator}>
            <Text style={styles.liveText}>{statusEmoji} {truckStatus.toUpperCase()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.title}>Live Food Trucks Near You</Text>
          <Text style={styles.subtitle}>
            {userLocation 
              ? `Found ${foodTrucks.length} trucks within ${maxDistance} miles` 
              : 'Getting your location...'}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowDistanceFilter(!showDistanceFilter)}
          >
            <Ionicons name="options" size={24} color="#2c6f57" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statusToggleButton}
            onPress={toggleTruckStatus}
          >
            <Text style={styles.statusToggleText}>{getStatusToggleText()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Distance Filter Controls */}
      {showDistanceFilter && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Show trucks within:</Text>
          <View style={styles.distanceButtons}>
            {DISTANCE_SETTINGS.DISTANCE_OPTIONS.map(distance => (
              <TouchableOpacity
                key={distance}
                style={[
                  styles.distanceButton,
                  maxDistance === distance && styles.distanceButtonActive
                ]}
                onPress={() => setMaxDistance(distance)}
              >
                <Text style={[
                  styles.distanceButtonText,
                  maxDistance === distance && styles.distanceButtonTextActive
                ]}>
                  {distance} mi
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.filterStats}>
            <Text style={styles.filterStatsText}>
              {allFoodTrucks.length - foodTrucks.length} trucks filtered out
            </Text>
          </View>
        </View>
      )}

      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={60} color="#ccc" />
        <Text style={styles.mapText}>Interactive Map</Text>
        <Text style={styles.mapSubtext}>
          Maps are not available in Expo Go.{'\n'}
          Use a development build for full map features.
        </Text>
      </View>

      <Text style={styles.listTitle}>Available Food Trucks:</Text>
      
      <FlatList
        data={foodTrucks}
        renderItem={renderTruckItem}
        keyExtractor={(item) => item.id}
        style={styles.truckList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {allFoodTrucks.length === 0 
                ? 'No food trucks are live right now'
                : `No food trucks within ${maxDistance} miles`
              }
            </Text>
            <Text style={styles.emptySubtext}>
              {allFoodTrucks.length === 0 
                ? 'Check back later!'
                : `Try increasing the distance filter or check back later`
              }
            </Text>
          </View>
        }
      />

      {selectedTruck && (
        <View style={styles.selectedTruckDetails}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>{selectedTruck.truckName}</Text>
            <TouchableOpacity onPress={() => setSelectedTruck(null)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.detailsCuisine}>{selectedTruck.cuisine}</Text>
          <Text style={styles.detailsDistance}>
            {getDistanceFromUser(selectedTruck.lat, selectedTruck.lng)}
          </Text>
          <Text style={styles.detailsLocation}>
            Lat: {selectedTruck.lat?.toFixed(4)}, Lng: {selectedTruck.lng?.toFixed(4)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2c6f57',
    padding: 20,
    paddingTop: 60,
  },
  headerMain: {
    flex: 1,
  },
  filterButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c6f57',
  },
  statusToggleText: {
    fontSize: 12,
    color: '#2c6f57',
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginTop: -10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  distanceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  distanceButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  distanceButtonActive: {
    backgroundColor: '#2c6f57',
    borderColor: '#2c6f57',
  },
  distanceButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  distanceButtonTextActive: {
    color: '#fff',
  },
  filterStats: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  filterStatsText: {
    fontSize: 12,
    color: '#999',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  mapPlaceholder: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  truckList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  truckItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  truckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  truckIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  truckInfo: {
    flex: 1,
  },
  truckName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  truckCuisine: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  distance: {
    fontSize: 12,
    color: '#999',
  },
  liveIndicator: {
    alignItems: 'center',
  },
  liveText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  selectedTruckDetails: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6f57',
  },
  detailsCuisine: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  detailsDistance: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  detailsLocation: {
    fontSize: 12,
    color: '#ccc',
  },
});
