import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { 
  doc, 
  getDoc, 
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function LocationManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState('basic');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [autoLocationEnabled, setAutoLocationEnabled] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [businessHours, setBusinessHours] = useState({
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '10:00', close: '18:00', closed: false },
    sunday: { open: '10:00', close: '16:00', closed: false },
  });

  useEffect(() => {
    loadLocationData();
    
    // Set up real-time location tracking for pro/all-access users
    let locationSubscription = null;
    if (userPlan === 'pro' || userPlan === 'all-access') {
      startLocationTracking();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [userPlan]);

  const loadLocationData = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserPlan(userData.plan || 'basic');
        setIsOnline(userData.isOnline || false);
        setAutoLocationEnabled(userData.autoLocationEnabled || false);
        setManualAddress(userData.currentAddress || '');
        setBusinessHours(userData.businessHours || businessHours);
        
        if (userData.currentLocation) {
          setCurrentLocation(userData.currentLocation);
        }
      }
    } catch (error) {
      console.error('Error loading location data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    if (userPlan === 'basic') {
      Alert.alert(
        'Upgrade Required',
        'Real-time GPS tracking is available with Pro and All Access plans.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Upgrade') }
        ]
      );
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable location services for real-time tracking.');
        return;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location Required',
          'Please enable background location access for continuous tracking while the app is closed.'
        );
      }

      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 10, // Update when moved 10 meters
        },
        (location) => {
          updateLocationInFirebase(location);
        }
      );

      setAutoLocationEnabled(true);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        autoLocationEnabled: true
      });

      return subscription;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const stopLocationTracking = async () => {
    setAutoLocationEnabled(false);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      autoLocationEnabled: false
    });
  };

  const updateLocationInFirebase = async (location) => {
    try {
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(),
      };

      // Reverse geocode to get address
      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (reverseResults[0]) {
          const address = `${reverseResults[0].street || ''} ${reverseResults[0].city || ''}, ${reverseResults[0].region || ''}`.trim();
          locationData.address = address;
          setManualAddress(address);
        }
      } catch (reverseError) {
        console.log('Reverse geocoding failed:', reverseError);
      }

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        currentLocation: locationData,
        currentAddress: locationData.address || manualAddress,
        lastLocationUpdate: new Date()
      });

      setCurrentLocation(locationData);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const updateManualLocation = async () => {
    if (!manualAddress.trim()) {
      Alert.alert('Error', 'Please enter an address');
      return;
    }

    try {
      setLoading(true);
      
      // Geocode the address
      const results = await Location.geocodeAsync(manualAddress);
      if (results.length === 0) {
        Alert.alert('Error', 'Address not found. Please check and try again.');
        return;
      }

      const locationData = {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
        address: manualAddress,
        timestamp: new Date(),
        manual: true
      };

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        currentLocation: locationData,
        currentAddress: manualAddress,
        lastLocationUpdate: new Date()
      });

      setCurrentLocation(locationData);
      Alert.alert('Success', 'Location updated successfully!');
    } catch (error) {
      console.error('Error updating manual location:', error);
      Alert.alert('Error', 'Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isOnline: newStatus,
        lastStatusUpdate: new Date()
      });

      Alert.alert(
        'Status Updated',
        newStatus ? 'You are now visible to customers' : 'You are now offline'
      );
    } catch (error) {
      console.error('Error updating online status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const formatLocationUpdate = () => {
    if (!currentLocation) return 'No location set';
    
    const updateTime = currentLocation.timestamp?.toDate?.() || new Date(currentLocation.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - updateTime) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just updated';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c6f57" />
        <Text style={styles.loadingText}>Loading location settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Location Management</Text>
        </View>

        {/* Online Status */}
        <View style={styles.section}>
          <View style={styles.statusHeader}>
            <View style={styles.statusInfo}>
              <Text style={styles.sectionTitle}>Truck Status</Text>
              <Text style={[
                styles.statusText,
                { color: isOnline ? '#28a745' : '#dc3545' }
              ]}>
                {isOnline ? 'Online & Visible' : 'Offline'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: '#ccc', true: '#2c6f57' }}
              thumbColor={isOnline ? '#fff' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.statusDescription}>
            When online, customers can see your location and send you pings
          </Text>
        </View>

        {/* Current Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Location</Text>
          <View style={styles.locationInfo}>
            <Ionicons name="location" size={20} color="#2c6f57" />
            <View style={styles.locationText}>
              <Text style={styles.addressText}>
                {currentLocation?.address || manualAddress || 'No location set'}
              </Text>
              <Text style={styles.updateTime}>
                Last updated: {formatLocationUpdate()}
              </Text>
            </View>
          </View>
        </View>

        {/* GPS Tracking (Pro/All Access) */}
        {(userPlan === 'pro' || userPlan === 'all-access') ? (
          <View style={styles.section}>
            <View style={styles.featureHeader}>
              <Ionicons name="diamond" size={20} color="#2c6f57" />
              <Text style={styles.sectionTitle}>Real-Time GPS Tracking</Text>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Auto-update location</Text>
              <Switch
                value={autoLocationEnabled}
                onValueChange={(value) => {
                  if (value) {
                    startLocationTracking();
                  } else {
                    stopLocationTracking();
                  }
                }}
                trackColor={{ false: '#ccc', true: '#2c6f57' }}
                thumbColor={autoLocationEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={styles.featureDescription}>
              Your location will update automatically as you move, keeping customers informed of your exact position.
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.upgradePrompt}>
              <Ionicons name="diamond-outline" size={24} color="#666" />
              <Text style={styles.upgradeTitle}>Real-Time GPS Tracking</Text>
              <Text style={styles.upgradeText}>
                Upgrade to Pro or All Access for automatic location updates
              </Text>
              <TouchableOpacity style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Manual Location Update */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual Location Update</Text>
          <TextInput
            style={styles.addressInput}
            value={manualAddress}
            onChangeText={setManualAddress}
            placeholder="Enter your current address"
            multiline
          />
          <TouchableOpacity 
            onPress={updateManualLocation}
            style={styles.updateButton}
          >
            <Ionicons name="location" size={16} color="#fff" />
            <Text style={styles.updateButtonText}>Update Location</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="time" size={20} color="#2c6f57" />
            <Text style={styles.actionText}>Set Business Hours</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="notifications" size={20} color="#2c6f57" />
            <Text style={styles.actionText}>Location Alerts</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2c6f57',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  locationText: {
    flex: 1,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  updateTime: {
    fontSize: 14,
    color: '#666',
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  upgradePrompt: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 8,
  },
  upgradeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  upgradeButton: {
    backgroundColor: '#2c6f57',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginBottom: 15,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c6f57',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});
