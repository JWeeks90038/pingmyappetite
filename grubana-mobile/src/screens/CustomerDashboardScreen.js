import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Modal,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../components/AuthContext';
import ContactFormModal from '../components/ContactFormModal';
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
  const [events, setEvents] = useState([]); // Add events state
  const [selectedEvent, setSelectedEvent] = useState(null); // Add selected event state
  const [showEventModal, setShowEventModal] = useState(false); // Add event modal state
  const [currentUser, setCurrentUser] = useState(null); // Add current user state
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [demandPins, setDemandPins] = useState([]); // Add demand pins state
  const [customerPings, setCustomerPings] = useState([]); // Add customer pings state
  const [showCuisineModal, setShowCuisineModal] = useState(false); // Cuisine filter modal
  const [excludedCuisines, setExcludedCuisines] = useState([]); // Excluded cuisines (empty = show all)
  const [showContactModal, setShowContactModal] = useState(false); // Contact form modal
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [toastOpacity] = useState(new Animated.Value(0));
  const [showDemandPinModal, setShowDemandPinModal] = useState(false);
  const [demandPinLocation, setDemandPinLocation] = useState(null);
  const [demandPinCuisine, setDemandPinCuisine] = useState('');
  
  const mapRef = useRef(null);
  const sendingRef = useRef(false);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast({ visible: false, message: '', type: 'success' });
    });
  };

  const handleDemandPinPress = (coordinate) => {
    setDemandPinLocation(coordinate);
    setShowDemandPinModal(true);
  };

  const handleCreateDemandPin = async () => {
    if (!user) {
      showToast('Please log in to drop demand pins', 'error');
      return;
    }

    if (!demandPinCuisine.trim()) {
      showToast('Please enter what type of food you\'re craving', 'error');
      return;
    }

    try {
      const pinData = {
        userId: user.uid,
        username: username || user.displayName || 'Anonymous',
        latitude: demandPinLocation.latitude,
        longitude: demandPinLocation.longitude,
        cuisineRequest: demandPinCuisine.trim(),
        timestamp: serverTimestamp(),
        id: uuidv4(),
      };

      await addDoc(collection(db, 'demandPins'), pinData);

      setDemandPins(prev => [...prev, {
        ...pinData,
        timestamp: new Date(),
      }]);

      showToast('Demand pin dropped! Trucks can see your request.', 'success');
      setShowDemandPinModal(false);
      setDemandPinCuisine('');
    } catch (error) {
      showToast('Failed to drop demand pin', 'error');
    }
  };

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
                setUsername(user.displayName || '');
      }
    };
    
    fetchUserInfo();
  }, [user]);

  // Get user location
  useEffect(() => {
    const getUserLocation = async () => {
                  if (!useGeoLocation) {
                setUserLocation({
          latitude: 39.8283,
          longitude: -98.5795,
          latitudeDelta: 15,
          longitudeDelta: 15,
        });
        return;
      }

      try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setUserLocation({
            latitude: 39.8283,
            longitude: -98.5795,
            latitudeDelta: 15,
            longitudeDelta: 15,
          });
          showToast('Location permission denied. Showing nationwide view. Enable location services for better experience.', 'info');
          return;
        }

                const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000,
        });
        
                const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setUserLocation(newLocation);
              } catch (error) {
                        // Use default location as fallback
        const fallbackLocation = {
          latitude: 39.8283,
          longitude: -98.5795,
          latitudeDelta: 15,
          longitudeDelta: 15,
        };
        
        setUserLocation(fallbackLocation);
        showToast(`Unable to get your current location. Showing nationwide view.`, 'error');
      }
    };

    // Always attempt to get location when component mounts or useGeoLocation changes
    getUserLocation();
  }, [useGeoLocation]);

  // Animate map to new location when userLocation changes
  useEffect(() => {
    if (userLocation && mapRef.current && mapReady) {
            mapRef.current.animateToRegion(userLocation, 1000);
    }
  }, [userLocation, mapReady]);

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
        
        // DEBUG: Show ALL trucks for debugging
        const debugShowAll = true;
        const finalShouldShow = debugShowAll || shouldShow;
        if (finalShouldShow) {
          // Apply distance filter if user location is available
          if (userLocation) {
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              data.lat,
              data.lng
            );
            
                        // DEBUG: Relax distance filter for debugging
            const debugMaxDistance = 1000; // Much larger radius for debugging
            const maxDistance = debugShowAll ? debugMaxDistance : MAX_DISTANCE_MILES;
            
            if (distance <= maxDistance) {
              trucks.push({
                id: doc.id,
                ...data,
                coordinate: {
                  latitude: data.lat,
                  longitude: data.lng,
                },
                distance: distance
              });
                          } else {
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
        } else {
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
      showToast('Please select a cuisine type', 'error');
      sendingRef.current = false;
      return;
    }

    if (dailyPingCount >= 3) {
      showToast('You can only send 3 pings in a 24-hour period.', 'error');
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
        showToast('Manual address geocoding not implemented yet. Please use current location.', 'error');
        sendingRef.current = false;
        setLoading(false);
        return;
      } else {
        showToast('Please provide a location', 'error');
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
      showToast('Ping sent successfully!', 'success');
    } catch (error) {
      showToast('Failed to send ping', 'error');
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  // Load events
  useEffect(() => {
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
          
                    return hasLocation && validStatus;
        });

                setEvents(eventsData);
      },
      (error) => {
                if (error.code === 'permission-denied') {
                    setEvents([]); // Set empty array as fallback
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Load demand pins
  useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "demandPins"), 
      (snapshot) => {
        const pinsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })).filter(pin => {
          // Only show pins from the last 24 hours
          const pinTime = pin.timestamp?.toDate() || new Date(pin.timestamp);
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return pinTime > twentyFourHoursAgo;
        });

                setDemandPins(pinsData);
      },
      (error) => {
                if (error.code === 'permission-denied') {
                    setDemandPins([]); // Set empty array as fallback
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Load customer pings for map display
  useEffect(() => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const unsubscribe = onSnapshot(collection(db, "pings"), 
      (snapshot) => {
        const pingsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })).filter(ping => {
          // Only show pings from the last 24 hours
          const pingTimestamp = ping.timestamp?.toDate ? ping.timestamp.toDate() : null;
          const isRecent = pingTimestamp && pingTimestamp > oneDayAgo;
          // Ensure we have valid coordinates
          const lat = Number(ping.lat ?? ping.latitude);
          const lng = Number(ping.lng ?? ping.longitude);
          const hasValidCoords = isFinite(lat) && isFinite(lng);
          
                    return isRecent && hasValidCoords;
        });
        setCustomerPings(pingsData);
      },
      (error) => {
                if (error.code === 'permission-denied') {
                    setCustomerPings([]); // Set empty array as fallback
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Cuisine filtering functions
  const isCuisineExcluded = (cuisineId) => {
    return excludedCuisines.includes(cuisineId?.toLowerCase());
  };

  const handleCuisineSelect = (cuisineId) => {
    setExcludedCuisines(prev => {
      if (prev.includes(cuisineId)) {
        // Remove from excluded (show this cuisine)
                return prev.filter(id => id !== cuisineId);
      } else {
        // Add to excluded (hide this cuisine)
                return [...prev, cuisineId];
      }
    });
  };

  const handleApplyCuisineFilter = () => {
        setShowCuisineModal(false);
  };

  const filterPingsByCuisine = (pings) => {
    if (excludedCuisines.length === 0) {
      return pings; // Show all if no exclusions
    }

    return pings.filter(ping => {
      const pingCuisine = ping.cuisineType?.toLowerCase();
      const isExcluded = excludedCuisines.some(excluded => {
        const excludedLower = excluded.toLowerCase();
        // Check exact match and common variations
        return pingCuisine === excludedLower || 
               pingCuisine?.includes(excludedLower) ||
               excludedLower.includes(pingCuisine);
      });
      return !isExcluded; // Include if NOT excluded
    });
  };

  // Handle event marker press
  const handleEventPress = (event) => {
        setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Handle map press to add demand pins
  const handleMapPress = async (event) => {
    if (!user) {
      showToast('Please log in to drop demand pins', 'error');
      return;
    }

    const { latitude, longitude } = event.nativeEvent.coordinate;
    handleDemandPinPress({ latitude, longitude });
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
        <View style={styles.headerTop}>
          <Image 
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => setShowContactModal(true)}
          >
            <Ionicons name="help-circle-outline" size={24} color="#2c6f57" />
            <Text style={styles.contactButtonText}>Contact Us</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>
          Welcome{username ? `, ${username}` : ''}!
        </Text>
        <Text style={styles.subtitle}>Send a ping to nearby trucks</Text>
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
        <View style={styles.mapHeader}>
          <Text style={styles.sectionTitle}>Live Map</Text>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowCuisineModal(true)}
          >
            <Ionicons name="filter" size={20} color="#FF6B35" />
            <Text style={styles.filterButtonText}>
              Filter{excludedCuisines.length > 0 ? ` (${excludedCuisines.length} hidden)` : ''}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.mapInstructions}>
          🎯 Tap anywhere on the map to drop a demand pin and let trucks know what you're craving!
        </Text>
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={userLocation || {
              latitude: 39.8283,
              longitude: -98.5795,
              latitudeDelta: 15,
              longitudeDelta: 15,
            }}
            onMapReady={() => {
                            setMapReady(true);
            }}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
              {/* Business Markers */}
              {(() => {
                                return foodTrucks.map((truck) => {
                                    return (
                    <Marker
                      key={truck.id}
                      coordinate={truck.coordinate}
                      title={truck.truckName || 'Business'}
                      description={truck.cuisine || 'Business'}
                    >
                      <View style={styles.truckMarker}>
                        <Ionicons name="restaurant" size={20} color="#fff" />
                      </View>
                    </Marker>
                  );
                });
              })()}

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

              {/* Demand Pins */}
              {demandPins.map((pin) => (
                <Marker
                  key={pin.id}
                  coordinate={{
                    latitude: pin.latitude,
                    longitude: pin.longitude,
                  }}
                  title={`🍽️ ${pin.cuisineRequest}`}
                  description={`Requested by ${pin.username}`}
                >
                  <View style={styles.demandPinMarker}>
                    <Ionicons name="location" size={20} color="#FF6B35" />
                  </View>
                </Marker>
              ))}

              {/* Customer Ping Markers */}
              {(() => {
                const filteredPings = filterPingsByCuisine(customerPings);
                                return filteredPings.map((ping) => {
                  return (
                  <Marker
                    key={ping.id}
                    coordinate={{
                      latitude: Number(ping.lat ?? ping.latitude),
                      longitude: Number(ping.lng ?? ping.longitude),
                    }}
                    title={`🍴 ${ping.cuisineType || 'Food Request'}`}
                    description={`Ping by ${ping.username || 'Customer'} - ${ping.address || 'Location'}`}
                  >
                    <View style={styles.pingMarker}>
                      <Ionicons name="radio" size={18} color="#fff" />
                    </View>
                  </Marker>
                  );
                });
              })()}

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
            <Text style={styles.statNumber}>{demandPins.length}</Text>
            <Text style={styles.statLabel}>Demand Pins</Text>
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

      {/* Cuisine Filter Modal */}
      <Modal
        visible={showCuisineModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCuisineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cuisineModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Cuisine</Text>
              <TouchableOpacity onPress={() => setShowCuisineModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.cuisineModalSubtitle}>
              Tap cuisines to hide them from the map. All cuisines show by default.
            </Text>
            
            <ScrollView style={styles.cuisineList}>
              {CUISINE_TYPES.map((cuisine) => (
                <TouchableOpacity
                  key={cuisine.value}
                  style={[
                    styles.cuisineItem,
                    isCuisineExcluded(cuisine.value) && styles.cuisineItemExcluded
                  ]}
                  onPress={() => handleCuisineSelect(cuisine.value)}
                >
                  <Text style={styles.cuisineEmoji}>{cuisine.emoji || '🍽️'}</Text>
                  <Text style={[
                    styles.cuisineLabel,
                    isCuisineExcluded(cuisine.value) && styles.cuisineLabelExcluded
                  ]}>
                    {cuisine.label}
                  </Text>
                  {isCuisineExcluded(cuisine.value) && (
                    <Ionicons name="eye-off" size={20} color="#666" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => setExcludedCuisines([])}
              >
                <Text style={styles.clearFiltersText}>Show All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.applyFilterButton}
                onPress={handleApplyCuisineFilter}
              >
                <Text style={styles.applyFilterText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Demand Pin Modal */}
      <Modal
        visible={showDemandPinModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDemandPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Drop Demand Pin</Text>
              <TouchableOpacity onPress={() => setShowDemandPinModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              What type of food are you craving at this location?
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Tacos, BBQ, Asian, etc."
                value={demandPinCuisine}
                onChangeText={setDemandPinCuisine}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDemandPinModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCreateDemandPin}
              >
                <Text style={styles.confirmButtonText}>Drop Pin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Form Modal */}
      <ContactFormModal 
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
      />

      {/* Toast Notification */}
      {toast.visible && (
        <Animated.View 
          style={[
            styles.toast, 
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { opacity: toastOpacity }
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
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
    borderBottomWidth: 3,
    borderBottomColor: '#000000',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
    borderWidth: 2,
    borderColor: '#000000',
    borderTopWidth: 4,
    borderTopColor: '#4682b4', // Blue accent top border
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
  mapInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
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
  demandPinMarker: {
    backgroundColor: '#FF6B35',
    padding: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pingMarker: {
    backgroundColor: '#9b59b6',
    padding: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  // Demand Pin Modal Styles
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#2c6f57',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Toast Notification Styles
  toast: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastSuccess: {
    backgroundColor: '#4CAF50',
  },
  toastError: {
    backgroundColor: '#f44336',
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CustomerDashboardScreen;
