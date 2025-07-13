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

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [foodTrucks, setFoodTrucks] = useState([]);
  const [selectedTruck, setSelectedTruck] = useState(null);

  useEffect(() => {
    getCurrentLocation();
    const unsubscribe = listenToFoodTrucks();
    return unsubscribe;
  }, []);

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
      setFoodTrucks(trucks);
    });

    return unsubscribe;
  };

  const getDistanceFromUser = (truckLat, truckLng) => {
    if (!userLocation) return 'Unknown';

    const R = 6371; // Radius of Earth in km
    const dLat = (truckLat - userLocation.latitude) * Math.PI / 180;
    const dLng = (truckLng - userLocation.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(truckLat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return `${distance.toFixed(1)} km away`;
  };

  const getTruckIcon = (kitchenType) => {
    switch (kitchenType) {
      case 'trailer': return '🚚';
      case 'cart': return '🛒';
      default: return '🍕';
    }
  };

  const renderTruckItem = ({ item }) => (
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
          <Text style={styles.liveText}>🔴 LIVE</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Food Trucks Near You</Text>
        <Text style={styles.subtitle}>
          {userLocation 
            ? `Found ${foodTrucks.length} trucks nearby` 
            : 'Getting your location...'}
        </Text>
      </View>

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
            <Text style={styles.emptyText}>No food trucks are live right now</Text>
            <Text style={styles.emptySubtext}>Check back later!</Text>
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
    backgroundColor: '#2c6f57',
    padding: 20,
    paddingTop: 60,
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
