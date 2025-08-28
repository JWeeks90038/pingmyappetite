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
  onAuthStateChanged,
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
  const [events, setEvents] = useState([]); // Add events state
  const [selectedEvent, setSelectedEvent] = useState(null); // Add selected event state
  const [showEventModal, setShowEventModal] = useState(false); // Add event modal state
  const [currentUser, setCurrentUser] = useState(null); // Add current user state
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
      const EIGHT_HOURS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds (consistent with web)
      const GRACE_PERIOD = 15 * 60 * 1000; // 15 minutes grace period
      const MAX_DISTANCE_MILES = 30; // 30 mile radius for dashboard

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const isLive = data.isLive === true;
        const visible = data.visible === true;
        const lastActive = data.lastActive || 0;
        const sessionStartTime = data.sessionStartTime || lastActive;
        
        // Enhanced visibility logic matching web version
        const timeSinceActive = nowMs - lastActive;
        const sessionDuration = nowMs - sessionStartTime;
        const isRecentlyActive = timeSinceActive <= GRACE_PERIOD;
        const withinEightHourWindow = sessionDuration < EIGHT_HOURS;
        
        // Show truck if visible and either recently active OR within 8-hour window
        const shouldShow = visible && (isRecentlyActive || withinEightHourWindow);

        if (shouldShow) {
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

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log('🔐 Mobile: Auth state changed:', authUser ? authUser.uid : 'null');
      setCurrentUser(authUser);
    });

    return () => unsubscribe();
  }, []);

  // Load events
  useEffect(() => {
    console.log('🎉 Mobile: Setting up events listener');
    
    const unsubscribe = onSnapshot(collection(db, "events"), 
      (snapshot) => {
        const eventsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })).filter(event => {
          const hasLocation = event.latitude && event.longitude;
          const validStatus = event.status === 'published' || 
                             event.status === 'active' || 
                             event.status === 'upcoming' ||
                             event.status === 'live';
          
          console.log('🔍 Mobile: Event filter check:', {
            id: event.id,
            title: event.title,
            status: event.status,
            hasLocation,
            validStatus,
            included: hasLocation && validStatus
          });
          
          return hasLocation && validStatus;
        });

        console.log("🎉 Mobile: Active events fetched:", eventsData.length, 'events');
        setEvents(eventsData);
      },
      (error) => {
        console.error('❌ Mobile: Events listener error:', error);
        if (error.code === 'permission-denied') {
          console.log('📋 User may not have permission to read events collection');
          setEvents([]); // Set empty array as fallback
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle event marker press
  const handleEventPress = (event) => {
    console.log('🎉 Mobile: Event marker pressed:', event.id);
    setSelectedEvent(event);
    setShowEventModal(true);
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

              {/* Event Markers */}
              {events.map((event) => {
                // Get status color for event border
                const getEventStatusColor = (status) => {
                  switch(status?.toLowerCase()) {
                    case 'upcoming':
                    case 'published':
                      return '#2196F3'; // Blue
                    case 'active':
                    case 'live':
                      return '#FF6B35'; // Orange
                    case 'completed':
                    case 'finished':
                      return '#4CAF50'; // Green
                    default:
                      return '#2196F3'; // Default to blue
                  }
                };

                return (
                  <Marker
                    key={event.id}
                    coordinate={{
                      latitude: event.latitude,
                      longitude: event.longitude,
                    }}
                    title={event.title}
                    description={`${event.eventType || 'Event'} - ${event.date}`}
                    onPress={() => handleEventPress(event)}
                  >
                    <View style={[
                      styles.eventMarker,
                      { borderColor: getEventStatusColor(event.status) }
                    ]}>
                      {event.organizerLogoUrl ? (
                        <Image 
                          source={{ uri: event.organizerLogoUrl }}
                          style={styles.eventMarkerImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="star" size={20} color="#FFD700" />
                      )}
                    </View>
                  </Marker>
                );
              })}
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

      {/* Event Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEventModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Event Details</Text>
            <TouchableOpacity 
              onPress={() => setShowEventModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {selectedEvent && (
            <ScrollView style={styles.modalContent}>
              {selectedEvent.organizerLogoUrl && (
                <Image 
                  source={{ uri: selectedEvent.organizerLogoUrl }}
                  style={styles.modalEventImage}
                  resizeMode="cover"
                />
              )}
              
              <View style={styles.modalEventInfo}>
                <Text style={styles.modalEventTitle}>{selectedEvent.title}</Text>
                <Text style={styles.modalEventType}>{selectedEvent.eventType || 'Event'}</Text>
                <Text style={styles.modalEventDate}>{selectedEvent.date}</Text>
                <Text style={styles.modalEventTime}>{selectedEvent.time}</Text>
                
                {selectedEvent.description && (
                  <View style={styles.modalEventDescription}>
                    <Text style={styles.modalEventDescriptionTitle}>Description</Text>
                    <Text style={styles.modalEventDescriptionText}>{selectedEvent.description}</Text>
                  </View>
                )}
                
                {selectedEvent.location && (
                  <View style={styles.modalEventLocation}>
                    <Text style={styles.modalEventLocationTitle}>Location</Text>
                    <Text style={styles.modalEventLocationText}>{selectedEvent.location}</Text>
                  </View>
                )}
                
                <View style={styles.modalEventStatus}>
                  <Text style={styles.modalEventStatusTitle}>Status</Text>
                  <View style={[styles.modalEventStatusBadge, {
                    backgroundColor: selectedEvent.status === 'active' ? '#FF6B35' :
                                   selectedEvent.status === 'upcoming' ? '#2196F3' :
                                   selectedEvent.status === 'published' ? '#2196F3' :
                                   selectedEvent.status === 'completed' ? '#4CAF50' : '#9E9E9E'
                  }]}>
                    <Text style={styles.modalEventStatusText}>
                      {selectedEvent.status?.charAt(0).toUpperCase() + selectedEvent.status?.slice(1) || 'Unknown'}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
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
  eventMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  eventMarkerImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
  },
  modalEventImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  modalEventInfo: {
    padding: 20,
  },
  modalEventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalEventType: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  modalEventDate: {
    fontSize: 16,
    color: '#2c6f57',
    fontWeight: '600',
    marginBottom: 5,
  },
  modalEventTime: {
    fontSize: 16,
    color: '#2c6f57',
    marginBottom: 15,
  },
  modalEventDescription: {
    marginBottom: 15,
  },
  modalEventDescriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalEventDescriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  modalEventLocation: {
    marginBottom: 15,
  },
  modalEventLocationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalEventLocationText: {
    fontSize: 16,
    color: '#666',
  },
  modalEventStatus: {
    marginBottom: 15,
  },
  modalEventStatusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalEventStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  modalEventStatusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default CustomerDashboardScreen;
