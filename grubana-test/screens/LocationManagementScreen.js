import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal,
  Platform,
  Animated,
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
    monday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    tuesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    wednesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    thursday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    friday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    saturday: { open: '10:00 AM', close: '6:00 PM', closed: false },
    sunday: { open: '10:00 AM', close: '4:00 PM', closed: false },
  });
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [selectedTimeType, setSelectedTimeType] = useState('open'); // 'open' or 'close'
  const [tempTime, setTempTime] = useState(new Date());
  const [locationAlertsEnabled, setLocationAlertsEnabled] = useState(false);
  const [showLocationAlertsModal, setShowLocationAlertsModal] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);

  // Toast notification system (replaces Alert.alert)
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Custom modal system for confirmations (replaces Alert.alert)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState([]);

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
        // Load and normalize business hours to AM/PM format
        const loadedBusinessHours = userData.businessHours || businessHours;
        const normalizedBusinessHours = normalizeBusinessHoursToAMPM(loadedBusinessHours);
        setBusinessHours(normalizedBusinessHours);
        
        if (userData.currentLocation) {
          setCurrentLocation(userData.currentLocation);
        }
      }

      // Check notification permission status
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status === 'granted');
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  // Toast notification function (replaces simple Alert.alert)
  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
      });
    }, 3000);
  };

  // Custom modal function (replaces Alert.alert)
  const showCustomModal = (title, message, buttons = []) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalButtons(buttons.length > 0 ? buttons : [
      { text: 'OK', onPress: () => setModalVisible(false), style: 'default' }
    ]);
    setModalVisible(true);
  };

  const startLocationTracking = async () => {
    // Removed Basic plan restriction - all plans now get automatic GPS tracking
    
    try {
  
      
      // Request foreground permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToastMessage('Please enable location services for real-time tracking.', 'error');
        setAutoLocationEnabled(false);
        return;
      }

 

      // For background tracking, request background permissions
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
 
        } else {

        }
      } catch (backgroundError) {

        // Continue without background permission
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


      setLocationSubscription(subscription);
      setAutoLocationEnabled(true);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        autoLocationEnabled: true
      });

      showToastMessage('Real-time GPS tracking is now active!', 'success');
    } catch (error) {
    
      setAutoLocationEnabled(false);
      showToastMessage(`Failed to start location tracking: ${error.message}`, 'error');
    }
  };

  const stopLocationTracking = async () => {
    try {
 
      
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);

      }

      setAutoLocationEnabled(false);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        autoLocationEnabled: false
      });

  
      showToastMessage('Real-time GPS tracking has been disabled.', 'success');
    } catch (error) {
      showToastMessage(`Failed to stop location tracking: ${error.message}`, 'error');
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
 
      }

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        currentLocation: locationData,
        currentAddress: locationData.address || manualAddress,
        lastLocationUpdate: new Date()
      });

      setCurrentLocation(locationData);
    } catch (error) {

    }
  };

  const updateManualLocation = async () => {
    if (!manualAddress.trim()) {
      showToastMessage('Please enter an address', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Geocode the address
      const results = await Location.geocodeAsync(manualAddress);
      if (results.length === 0) {
        showToastMessage('Address not found. Please check and try again.', 'error');
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
      showToastMessage('Location updated successfully!', 'success');
    } catch (error) {

      showToastMessage('Failed to update location', 'error');
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

      showToastMessage(
        newStatus ? 'You are now visible to customers' : 'You are now offline',
        'success'
      );
    } catch (error) {
  
      showToastMessage('Failed to update status', 'error');
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

  // Function to normalize business hours to AM/PM format
  const normalizeBusinessHoursToAMPM = (hours) => {
    const normalizedHours = {};
    
    Object.keys(hours).forEach(day => {
      const dayHours = hours[day];
      normalizedHours[day] = {
        ...dayHours,
        open: convertTo12HourFormat(dayHours.open),
        close: convertTo12HourFormat(dayHours.close)
      };
    });
    
    return normalizedHours;
  };

  // Function to convert time string to 12-hour AM/PM format
  const convertTo12HourFormat = (timeStr) => {
    if (!timeStr) return '9:00 AM';
    
    // If already in 12-hour format, return as is
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      return timeStr;
    }
    
    // Convert from 24-hour format to 12-hour format
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) {
 
        return '9:00 AM';
      }
      
      let hour12 = hours;
      let period = 'AM';
      
      if (hours === 0) {
        hour12 = 12;
        period = 'AM';
      } else if (hours === 12) {
        hour12 = 12;
        period = 'PM';
      } else if (hours > 12) {
        hour12 = hours - 12;
        period = 'PM';
      }
      
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const converted = `${hour12}:${formattedMinutes} ${period}`;
      

      return converted;
    } catch (error) {
   
      return '9:00 AM';
    }
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
    
    const timeStr = businessHours[day][timeType];
    let date = new Date();
    
    // Handle both 12-hour (9:00 AM) and 24-hour (09:00) formats
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      // 12-hour format
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      
      if (period === 'PM' && hours !== 12) {
        hour24 = hours + 12;
      } else if (period === 'AM' && hours === 12) {
        hour24 = 0;
      }
      
      date.setHours(hour24, minutes, 0, 0);
    } else {
      // 24-hour format (legacy support)
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    
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
      hour12: true, 
      hour: 'numeric', 
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
      
      showToastMessage('Business hours updated successfully!', 'success');
      setShowBusinessHoursModal(false);
    } catch (error) {
  
      showToastMessage('Failed to save business hours', 'error');
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
   
      return false;
    }
  };

  const openLocationAlertsModal = async () => {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      showCustomModal(
        'Permission Required',
        'Please enable notifications to use location alerts.',
        [
          { text: 'Cancel', onPress: () => setModalVisible(false), style: 'cancel' },
          { text: 'Settings', onPress: () => {
            setModalVisible(false);
            Notifications.openSettings?.();
          }, style: 'default' }
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

      showToastMessage(
        newStatus 
          ? 'Location alerts enabled! Customers will be notified when you arrive at popular locations.'
          : 'Location alerts disabled.',
        'success'
      );
    } catch (error) {

      showToastMessage('Failed to update location alerts', 'error');
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

      {/* Toast Notification (replaces simple Alert.alert) */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
              backgroundColor: toastType === 'error' ? '#dc3545' : '#28a745'
            }
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Custom Modal (replaces Alert.alert) */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalContainer}>
            <Text style={styles.customModalTitle}>{modalTitle}</Text>
            <Text style={styles.customModalMessage}>{modalMessage}</Text>
            <View style={styles.customModalButtons}>
              {modalButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.customModalButton,
                    button.style === 'cancel' && styles.customModalButtonCancel
                  ]}
                  onPress={button.onPress}
                >
                  <Text style={[
                    styles.customModalButtonText,
                    button.style === 'cancel' && styles.customModalButtonTextCancel
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
  // Toast notification styles (replaces Alert.alert)
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 1000,
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Custom modal styles (replaces Alert.alert)
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    width: '90%',
  },
  customModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  customModalMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  customModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  customModalButton: {
    backgroundColor: '#2c6f57',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
  },
  customModalButtonCancel: {
    backgroundColor: '#6c757d',
  },
  customModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  customModalButtonTextCancel: {
    color: '#fff',
  },
});
