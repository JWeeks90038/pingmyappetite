import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../components/AuthContext';
import { auth, db } from '../services/firebase';
import { CUISINE_TYPES } from '../constants/cuisineTypes';
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  getDocs,
  query,
  where,
  getDoc,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const CustomerDashboardScreen = () => {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [useGeoLocation, setUseGeoLocation] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [dailyPingCount, setDailyPingCount] = useState(0);
  const [pingError, setPingError] = useState('');
  const [activeDrops, setActiveDrops] = useState([]);
  const [foodTrucks, setFoodTrucks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  
  const mapRef = useRef(null);
  const sendingRef = useRef(false);

  // Get user info
  useEffect(() => {
    if (!user) return;
    
    const fetchUserInfo = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUsername(userData.displayName || '');
        } else {
          setUsername(user.displayName || '');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        setUsername(user.displayName || '');
      }
    };
    
    fetchUserInfo();
  }, [user]);

  // Get user location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Location permission is required to use this feature');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Error', 'Failed to get your location');
      }
    };

    if (useGeoLocation) {
      getUserLocation();
    }
  }, [useGeoLocation]);

  // Monitor daily ping count
  useEffect(() => {
    if (!user) return;

    const pingsRef = collection(db, 'pings');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      pingsRef,
      where('userId', '==', user.uid),
      where('timestamp', '>=', oneDayAgo)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDailyPingCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  // Monitor active drops
  useEffect(() => {
    if (!user) return;
    
    const now = Timestamp.now();
    const dropsRef = collection(db, 'drops');
    const q = query(dropsRef, where('expiresAt', '>', now));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDrops = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActiveDrops(fetchedDrops);
    });

    return () => unsubscribe();
  }, [user]);

  // Monitor food trucks with distance filtering
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, 'truckLocations'), (snapshot) => {
      const trucks = [];
      const nowMs = Date.now();
      const FIVE_MIN = 5 * 60 * 1000;
      const MAX_DISTANCE_MILES = 30; // 30 mile radius for dashboard

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const isLive = data.isLive === true;
        const visible = data.visible === true;
        const lastActive = data.lastActive || 0;
        const isStale = nowMs - lastActive > FIVE_MIN;

        if (isLive && visible && !isStale) {
          // Apply distance filter if user location is available
          if (userLocation) {
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              data.lat,
              data.lng
            );
            
            if (distance <= MAX_DISTANCE_MILES) {
              trucks.push({
                id: doc.id,
                ...data,
                coordinate: {
                  latitude: data.lat,
                  longitude: data.lng,
                },
                distance: distance
              });
            }
          } else {
            // If no user location, show all trucks
            trucks.push({
              id: doc.id,
              ...data,
              coordinate: {
                latitude: data.lat,
                longitude: data.lng,
              }
            });
          }
        }
      });

      setFoodTrucks(trucks);
    });

    return () => unsubscribe();
  }, [user, userLocation]);

  const handleSendPing = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;

    if (!user || !cuisineType) {
      Alert.alert('Error', 'Please select a cuisine type');
      sendingRef.current = false;
      return;
    }

    if (dailyPingCount >= 3) {
      Alert.alert('Limit Reached', 'You can only send 3 pings in a 24-hour period.');
      sendingRef.current = false;
      return;
    }

    setLoading(true);
    try {
      let lat, lng, address = '';

      if (useGeoLocation && userLocation) {
        lat = userLocation.latitude;
        lng = userLocation.longitude;
        
        // Get address from coordinates (you might want to use a geocoding service)
        address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      } else if (manualAddress.trim()) {
        // For now, we'll need to implement geocoding
        Alert.alert('Error', 'Manual address geocoding not implemented yet. Please use current location.');
        sendingRef.current = false;
        setLoading(false);
        return;
      } else {
        Alert.alert('Error', 'Please provide a location');
        sendingRef.current = false;
        setLoading(false);
        return;
      }

      const pingData = {
        userId: user.uid,
        username: username || user.displayName || '',
        lat,
        lng,
        cuisineType,
        timestamp: serverTimestamp(),
        address,
        pingId: uuidv4(),
      };

      await addDoc(collection(db, 'pings'), pingData);

      // Reset form
      setCuisineType('');
      Alert.alert('Success', 'Ping sent successfully!');
    } catch (error) {
      console.error('Error sending ping:', error);
      Alert.alert('Error', 'Failed to send ping');
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  // Calculate distance between two points in miles
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/grubana-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>
          Welcome{username ? `, ${username}` : ''}!
        </Text>
        <Text style={styles.subtitle}>Send a ping to nearby food trucks</Text>
      </View>

      {/* Ping Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Send a Ping</Text>
        
        <View style={styles.pingCount}>
          <Text style={[
            styles.pingCountText,
            { color: dailyPingCount >= 3 ? '#e74c3c' : '#333' }
          ]}>
            You've sent {dailyPingCount} of 3 pings today
          </Text>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Use my current location</Text>
            <Switch
              value={useGeoLocation}
              onValueChange={setUseGeoLocation}
              trackColor={{ false: '#ccc', true: '#2c6f57' }}
              thumbColor={useGeoLocation ? '#fff' : '#fff'}
            />
          </View>
        </View>

        {!useGeoLocation && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={manualAddress}
              onChangeText={setManualAddress}
              placeholder="Enter address"
              placeholderTextColor="#999"
            />
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Cuisine Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={cuisineType}
              onValueChange={setCuisineType}
              style={styles.picker}
            >
              <Picker.Item label="Select Cuisine" value="" />
              {CUISINE_TYPES.map((cuisine) => (
                <Picker.Item
                  key={cuisine.value}
                  label={cuisine.label}
                  value={cuisine.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (loading || dailyPingCount >= 3) && styles.buttonDisabled
          ]}
          onPress={handleSendPing}
          disabled={loading || dailyPingCount >= 3}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Ping</Text>
          )}
        </TouchableOpacity>

        {pingError ? (
          <Text style={styles.errorText}>{pingError}</Text>
        ) : null}
      </View>

      {/* Map */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Map</Text>
        {userLocation ? (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={userLocation}
              onMapReady={() => setMapReady(true)}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {/* Food Truck Markers */}
              {foodTrucks.map((truck) => (
                <Marker
                  key={truck.id}
                  coordinate={truck.coordinate}
                  title={truck.truckName || 'Food Truck'}
                  description={truck.cuisine || 'Food Truck'}
                >
                  <View style={styles.truckMarker}>
                    <Ionicons name="restaurant" size={20} color="#fff" />
                  </View>
                </Marker>
              ))}

              {/* Drop Markers */}
              {activeDrops.map((drop) => (
                <Marker
                  key={drop.id}
                  coordinate={{
                    latitude: drop.lat,
                    longitude: drop.lng,
                  }}
                  title={drop.title}
                  description={drop.description}
                >
                  <View style={styles.dropMarker}>
                    <Ionicons name="gift" size={16} color="#fff" />
                  </View>
                </Marker>
              ))}
            </MapView>
          </View>
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color="#2c6f57" />
            <Text style={styles.mapPlaceholderText}>Loading map...</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{foodTrucks.length}</Text>
            <Text style={styles.statLabel}>Active Trucks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{activeDrops.length}</Text>
            <Text style={styles.statLabel}>Active Drops</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{3 - dailyPingCount}</Text>
            <Text style={styles.statLabel}>Pings Left</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2c6f57',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f5e8',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 15,
  },
  pingCount: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  pingCountText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: '#2c6f57',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  mapContainer: {
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  mapPlaceholderText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  truckMarker: {
    backgroundColor: '#2c6f57',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  dropMarker: {
    backgroundColor: '#e74c3c',
    padding: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
    alignSelf: 'center',
  },
});

export default CustomerDashboardScreen;
