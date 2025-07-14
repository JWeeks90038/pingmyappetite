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
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  doc, 
  getDoc, 
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function LocationManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState('basic');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [autoLocationEnabled, setAutoLocationEnabled] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [businessHours, setBusinessHours] = useState({
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '10:00', close: '18:00', closed: false },
    sunday: { open: '10:00', close: '16:00', closed: false },
  });
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [selectedTimeType, setSelectedTimeType] = useState('open'); // 'open' or 'close'
  const [tempTime, setTempTime] = useState(new Date());
  const [locationAlertsEnabled, setLocationAlertsEnabled] = useState(false);
  const [showLocationAlertsModal, setShowLocationAlertsModal] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);

  useEffect(() => {
    loadLocationData();

    return () => {
      // Clean up location subscription when component unmounts
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Separate effect for handling location tracking based on user plan
  useEffect(() => {
    if (userPlan === 'pro' || userPlan === 'all-access') {
      if (autoLocationEnabled && !locationSubscription) {
        // Only start if auto location is enabled and no subscription exists
        startLocationTracking();
      }
    }
  }, [userPlan, autoLocationEnabled]);

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
        setLocationAlertsEnabled(userData.locationAlertsEnabled || false);
        setManualAddress(userData.currentAddress || '');
        setBusinessHours(userData.businessHours || businessHours);
        
        if (userData.currentLocation) {
          setCurrentLocation(userData.currentLocation);
        }
      }

      // Check notification permission status
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status === 'granted');
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
      console.log('LocationManagementScreen: Starting location tracking...');
      
      // Request foreground permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable location services for real-time tracking.');
        setAutoLocationEnabled(false);
        return;
      }

      console.log('LocationManagementScreen: Foreground permission granted');

      // For background tracking, request background permissions
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.log('LocationManagementScreen: Background permission not granted, continuing with foreground only');
        } else {
          console.log('LocationManagementScreen: Background permission granted');
        }
      } catch (backgroundError) {
        console.log('LocationManagementScreen: Background permission request failed:', backgroundError);
        // Continue without background permission
      }

      // Start watching position
      console.log('LocationManagementScreen: Creating location watcher...');
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 10, // Update when moved 10 meters
        },
        (location) => {
          console.log('LocationManagementScreen: Location update received');
          updateLocationInFirebase(location);
        }
      );

      console.log('LocationManagementScreen: Location tracking started successfully');
      setLocationSubscription(subscription);
      setAutoLocationEnabled(true);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        autoLocationEnabled: true
      });

      Alert.alert('Success', 'Real-time GPS tracking is now active!');
    } catch (error) {
      console.error('LocationManagementScreen: Error starting location tracking:', error);
      setAutoLocationEnabled(false);
      Alert.alert('Error', `Failed to start location tracking: ${error.message}`);
    }
  };

  const stopLocationTracking = async () => {
    try {
      console.log('LocationManagementScreen: Stopping location tracking...');
      
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
        console.log('LocationManagementScreen: Location subscription removed');
      }

      setAutoLocationEnabled(false);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        autoLocationEnabled: false
      });

      console.log('LocationManagementScreen: Location tracking stopped successfully');
      Alert.alert('Success', 'Real-time GPS tracking has been disabled.');
    } catch (error) {
      console.error('LocationManagementScreen: Error stopping location tracking:', error);
      Alert.alert('Error', `Failed to stop location tracking: ${error.message}`);
    }
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

  // Business Hours Functions
  const openBusinessHoursModal = () => {
    setShowBusinessHoursModal(true);
  };

  const closeBusinessHoursModal = () => {
    setShowBusinessHoursModal(false);
  };

  const openTimePicker = (day, timeType) => {
    setSelectedDay(day);
    setSelectedTimeType(timeType);
    
    // Convert time string to Date object
    const timeStr = businessHours[day][timeType];
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    setTempTime(date);
    
    setShowTimePickerModal(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePickerModal(false);
    }
    
    if (selectedTime) {
      setTempTime(selectedTime);
      if (Platform.OS === 'ios') {
        // For iOS, update immediately
        updateBusinessHours(selectedTime);
      } else {
        // For Android, update when picker closes
        updateBusinessHours(selectedTime);
      }
    }
  };

  const updateBusinessHours = (time) => {
    const timeStr = time.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    setBusinessHours(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [selectedTimeType]: timeStr
      }
    }));
  };

  const toggleDayClosed = (day) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day].closed
      }
    }));
  };

  const saveBusinessHours = async () => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        businessHours: businessHours,
        lastUpdated: new Date()
      });
      
      Alert.alert('Success', 'Business hours updated successfully!');
      setShowBusinessHoursModal(false);
    } catch (error) {
      console.error('Error saving business hours:', error);
      Alert.alert('Error', 'Failed to save business hours');
    }
  };

  // Notification Functions
  const requestNotificationPermission = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      setNotificationPermission(finalStatus === 'granted');
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const openLocationAlertsModal = async () => {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications to use location alerts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Notifications.openSettings?.() }
        ]
      );
      return;
    }
    setShowLocationAlertsModal(true);
  };

  const toggleLocationAlerts = async () => {
    try {
      const newStatus = !locationAlertsEnabled;
      setLocationAlertsEnabled(newStatus);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        locationAlertsEnabled: newStatus,
        lastUpdated: new Date()
      });

      if (newStatus) {
        // Schedule a test notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Location Alerts Enabled! 📍',
            body: 'Customers will now be notified when you arrive at popular locations.',
            data: { type: 'location_alert_enabled' },
          },
          trigger: { seconds: 2 },
        });
      }

      Alert.alert(
        'Success', 
        newStatus 
          ? 'Location alerts enabled! Customers will be notified when you arrive at popular locations.'
          : 'Location alerts disabled.'
      );
    } catch (error) {
      console.error('Error toggling location alerts:', error);
      Alert.alert('Error', 'Failed to update location alerts');
    }
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
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={openBusinessHoursModal}
          >
            <Ionicons name="time" size={20} color="#2c6f57" />
            <Text style={styles.actionText}>Set Business Hours</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={openLocationAlertsModal}
          >
            <Ionicons name="notifications" size={20} color="#2c6f57" />
            <Text style={styles.actionText}>Location Alerts</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Business Hours Modal */}
      <Modal
        visible={showBusinessHoursModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeBusinessHoursModal}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Business Hours</Text>
            <TouchableOpacity onPress={saveBusinessHours}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {Object.entries(businessHours).map(([day, hours]) => (
              <View key={day} style={styles.dayRow}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Text>
                  <Switch
                    value={!hours.closed}
                    onValueChange={() => toggleDayClosed(day)}
                    trackColor={{ false: '#ccc', true: '#2c6f57' }}
                    thumbColor={!hours.closed ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                {!hours.closed && (
                  <View style={styles.timeRow}>
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => openTimePicker(day, 'open')}
                    >
                      <Text style={styles.timeLabel}>Open</Text>
                      <Text style={styles.timeValue}>{hours.open}</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.timeSeparator}>to</Text>
                    
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => openTimePicker(day, 'close')}
                    >
                      <Text style={styles.timeLabel}>Close</Text>
                      <Text style={styles.timeValue}>{hours.close}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      {showTimePickerModal && (
        <Modal
          visible={showTimePickerModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.timePickerOverlay}>
            <View style={styles.timePickerContainer}>
              <View style={styles.timePickerHeader}>
                <TouchableOpacity onPress={() => setShowTimePickerModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.timePickerTitle}>
                  {selectedTimeType === 'open' ? 'Opening' : 'Closing'} Time
                </Text>
                <TouchableOpacity onPress={() => setShowTimePickerModal(false)}>
                  <Text style={styles.saveText}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={tempTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                style={styles.timePicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Location Alerts Modal */}
      <Modal
        visible={showLocationAlertsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocationAlertsModal(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Location Alerts</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.alertsStatus}>
              <Text style={styles.alertsStatusText}>
                Location Alerts are currently {locationAlertsEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>

            <View style={styles.alertsToggle}>
              <Text style={styles.alertsToggleLabel}>Enable Location Alerts</Text>
              <Switch
                value={locationAlertsEnabled}
                onValueChange={toggleLocationAlerts}
                trackColor={{ false: '#ccc', true: '#2c6f57' }}
                thumbColor={locationAlertsEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.alertsInfo}>
              <Text style={styles.alertsInfoTitle}>How it works:</Text>
              <Text style={styles.alertsInfoText}>
                • Customers will receive notifications when you arrive at popular locations
              </Text>
              <Text style={styles.alertsInfoText}>
                • Alerts are sent to users who have favorited your food truck
              </Text>
              <Text style={styles.alertsInfoText}>
                • Notifications include your current location and menu highlights
              </Text>
              <Text style={styles.alertsInfoText}>
                • You can customize alert frequency in your dashboard
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20, // Reduced from 100 to normal padding
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  saveText: {
    fontSize: 16,
    color: '#2c6f57',
    fontWeight: '600',
  },
  // Business Hours Modal styles
  dayRow: {
    marginBottom: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
  },
  timeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 80,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeSeparator: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 10,
  },
  // Time Picker Modal styles
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area for iOS
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timePicker: {
    height: 216,
  },
  // Location Alerts Modal styles
  alertsStatus: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  alertsStatusText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  alertsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 20,
  },
  alertsToggleLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  alertsInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
  },
  alertsInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  alertsInfoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 5,
  },
});
