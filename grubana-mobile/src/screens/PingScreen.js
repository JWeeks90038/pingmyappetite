import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Image,
  Animated,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../components/AuthContext';
import { auth, db } from '../services/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { useTheme } from '../theme/ThemeContext';

// React Native compatible UUID generation
const generateUUID = () => {
  return 'ping_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

export default function PingScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const styles = createThemedStyles(theme);
  const [username, setUsername] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [useGeoLocation, setUseGeoLocation] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [dailyPingCount, setDailyPingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Getting location...');
  
  const sendingRef = useRef(false);

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState([]);

  // Toast functions
  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
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
      setToastVisible(false);
    });
  };

  // Modal functions
  const showModal = (title, message, buttons = [{ text: 'OK', onPress: () => setModalVisible(false) }]) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalButtons(buttons);
    setModalVisible(true);
  };

  // Available cuisine types for selection (matching MapScreen)
  const cuisineTypes = [
    { id: 'american', name: 'American', emoji: '🌭' },
    { id: 'asian-fusion', name: 'Asian Fusion', emoji: '🥢' },
    { id: 'bbq', name: 'BBQ', emoji: '🍖' },
    { id: 'burgers', name: 'Burgers', emoji: '🍔' },
    { id: 'chinese', name: 'Chinese', emoji: '🥡' },
    { id: 'coffee', name: 'Coffee', emoji: '☕' },
    { id: 'desserts', name: 'Desserts', emoji: '🍰' },
    { id: 'drinks', name: 'Drinks', emoji: '🥤' },
    { id: 'greek', name: 'Greek', emoji: '🥙' },
    { id: 'halal', name: 'Halal', emoji: '🕌' },
    { id: 'healthy', name: 'Healthy', emoji: '🥗' },
    { id: 'indian', name: 'Indian', emoji: '🍛' },
    { id: 'italian', name: 'Italian', emoji: '🍝' },
    { id: 'japanese', name: 'Japanese', emoji: '🍣' },
    { id: 'korean', name: 'Korean', emoji: '🥢' },
    { id: 'latin', name: 'Latin', emoji: '🫓' },
    { id: 'mediterranean', name: 'Mediterranean', emoji: '🥙' },
    { id: 'mexican', name: 'Mexican', emoji: '🌮' },
    { id: 'pizza', name: 'Pizza', emoji: '🍕' },
    { id: 'seafood', name: 'Seafood', emoji: '🦐' },
    { id: 'southern', name: 'Southern', emoji: '🍗' },
    { id: 'sushi', name: 'Sushi', emoji: '🍣' },
    { id: 'thai', name: 'Thai', emoji: '🍜' },
    { id: 'vegan', name: 'Vegan', emoji: '🌱' },
    { id: 'wings', name: 'Wings', emoji: '🍗' },
    { id: 'food', name: 'General Food', emoji: '🍽️' }
  ];

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

        setLocationStatus('Using manual address');
        return;
      }

      try {
        setLocationStatus('Requesting location permission...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {

          setLocationStatus('Location permission denied');
          showToast('Location permission denied. Please enable to use current location or enter address manually.');
          return;
        }

        setLocationStatus('Getting your location...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000,
        });
        
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        setLocationStatus(`Location: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
     
        
      } catch (error) {
     
        setLocationStatus('Location unavailable - use manual address');
        showToast('Could not get your location. Please enter address manually or check location settings.');
      }
    };
    
    getUserLocation();
  }, [useGeoLocation]);

  // Check daily ping count
  useEffect(() => {
    const checkDailyPingCount = async () => {
      if (!user) return;
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const pingsQuery = query(
          collection(db, 'pings'),
          where('userId', '==', user.uid),
          where('timestamp', '>=', today)
        );
        
        const querySnapshot = await getDocs(pingsQuery);
        setDailyPingCount(querySnapshot.size);
      } catch (error) {

      }
    };
    
    checkDailyPingCount();
  }, [user]);

  // Function to geocode address to coordinates
  const geocodeAddress = async (address) => {
    try {

      
      // Use Nominatim (OpenStreetMap) geocoding service - free and reliable
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding service error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
  
        
        return {
          success: true,
          latitude: lat,
          longitude: lng,
          formattedAddress: result.display_name || address
        };
      } else {

        return {
          success: false,
          error: 'Address not found. Please check the address and try again.'
        };
      }
    } catch (error) {

      return {
        success: false,
        error: 'Unable to locate address. Please check your internet connection and try again.'
      };
    }
  };

  const handleSendPing = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;

    if (!user || !cuisineType) {
      showToast('Please select a cuisine type');
      sendingRef.current = false;
      return;
    }

    if (dailyPingCount >= 3) {
      showToast('You can only send 3 pings in a 24-hour period.');
      sendingRef.current = false;
      return;
    }

    setLoading(true);
    try {
      let lat, lng, address = '';

      if (useGeoLocation && userLocation) {
        lat = userLocation.latitude;
        lng = userLocation.longitude;
        address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      } else if (manualAddress.trim()) {

        
        // Geocode the manual address
        const geocodeResult = await geocodeAddress(manualAddress.trim());
        
        if (geocodeResult.success) {
          lat = geocodeResult.latitude;
          lng = geocodeResult.longitude;
          address = geocodeResult.formattedAddress;

        } else {
          showToast(geocodeResult.error);
          sendingRef.current = false;
          setLoading(false);
          return;
        }
      } else {
        showToast('Please provide a location');
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
        pingId: generateUUID(),
      };

      await addDoc(collection(db, 'pings'), pingData);

      // Reset form and update count
      setCuisineType('');
      setDailyPingCount(prev => prev + 1);
      showModal('Success', 'Ping sent successfully! Food trucks in your area will be notified of your craving.');
      
    } catch (error) {

      showToast('Failed to send ping. Please try again.');
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>
          Send a Ping{username ? `, ${username}` : ''}!
        </Text>
        <Text style={styles.subtitle}>
          Let food trucks know what you're craving
        </Text>
      </View>

      {/* Ping Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{dailyPingCount}</Text>
          <Text style={styles.statLabel}>Pings Today</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{3 - dailyPingCount}</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
      </View>

      {/* Ping Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Send Your Food Request</Text>
        
        <View style={styles.formGroup}>
          <View style={styles.switchContainer}>
            <Ionicons name="location" size={20} color="#2c6f57" />
            <Text style={styles.label}>Use my current location</Text>
            <Switch
              value={useGeoLocation}
              onValueChange={setUseGeoLocation}
              trackColor={{ false: '#ccc', true: '#2c6f57' }}
              thumbColor={useGeoLocation ? '#fff' : '#fff'}
            />
          </View>
          <Text style={styles.locationStatus}>{locationStatus}</Text>
        </View>

        {!useGeoLocation && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              <Ionicons name="home" size={16} color="#2c6f57" /> Address
            </Text>
            <TextInput
              style={styles.input}
              value={manualAddress}
              onChangeText={setManualAddress}
              placeholder="Enter your address"
              placeholderTextColor="#999"
            />
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            <Ionicons name="restaurant" size={16} color="#2c6f57" /> What are you craving?
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={cuisineType}
              onValueChange={setCuisineType}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              mode="dropdown"
            >
              <Picker.Item label="Select what you're craving..." value="" />
              {cuisineTypes.map((cuisine) => (
                <Picker.Item
                  key={cuisine.id}
                  label={`${cuisine.emoji} ${cuisine.name}`}
                  value={cuisine.id}
                />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            (loading || dailyPingCount >= 3 || !cuisineType) && styles.buttonDisabled
          ]}
          onPress={handleSendPing}
          disabled={loading || dailyPingCount >= 3 || !cuisineType}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.sendButtonText}>
                {dailyPingCount >= 3 ? 'Daily Limit Reached' : 'Send Ping'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {dailyPingCount >= 3 && (
          <View style={styles.limitNotice}>
            <Ionicons name="information-circle" size={20} color="#e74c3c" />
            <Text style={styles.limitText}>
              You've reached your daily limit of 3 pings. Try again tomorrow!
            </Text>
          </View>
        )}
      </View>

      {/* How it works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 How It Works</Text>
        <View style={styles.stepContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Choose what you're craving</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Send your ping with location</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Food trucks see demand in your area</Text>
          </View>
          
        </View>
      </View>

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toast, 
            toastType === 'success' ? styles.toastSuccess : styles.toastError,
            { opacity: toastOpacity }
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Custom Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>{modalMessage}</Text>
            </View>
            <View style={styles.modalFooter}>
              {modalButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalButton,
                    button.style === 'destructive' ? styles.modalButtonDestructive : styles.modalButtonDefault,
                    modalButtons.length > 1 && index === 0 ? styles.modalButtonFirst : null
                  ]}
                  onPress={() => {
                    setModalVisible(false);
                    if (button.onPress) button.onPress();
                  }}
                >
                  <Text style={[
                    styles.modalButtonText,
                    button.style === 'destructive' ? styles.modalButtonTextDestructive : styles.modalButtonTextDefault
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createThemedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background.secondary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.accent.pink,
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: theme.colors.background.secondary,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.subtle,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.accent.pink,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 5,
  },
  section: {
    backgroundColor: theme.colors.background.secondary,
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.subtle,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.accent.pink,
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationStatus: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.background.secondary,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  picker: {
    height: 50,
    width: '100%',
    alignSelf: 'center',
    color: theme.colors.text.primary,
  },
  pickerItem: {
    height: 50,
    textAlign: 'center',
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  sendButton: {
    backgroundColor: theme.colors.accent.pink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginTop: 10,
    ...theme.shadows.neonPink,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.text.secondary,
  },
  buttonIcon: {
    marginRight: 8,
  },
  sendButtonText: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  limitNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: theme.colors.accent.pink,
  },
  limitText: {
    marginLeft: 10,
    fontSize: 14,
    color: theme.colors.accent.pink,
    flex: 1,
  },
  stepContainer: {
    marginTop: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    ...theme.shadows.neonBlue,
  },
  stepNumberText: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    flex: 1,
  },
  // Toast styles
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  toastError: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  toastText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a2e',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: theme.colors.accent.blue,
    borderTopWidth: 4,
    borderTopColor: theme.colors.accent.pink,
    ...theme.shadows.neonBlue,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.accent.pink,
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: theme.colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonFirst: {
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  modalButtonDefault: {
    backgroundColor: 'transparent',
  },
  modalButtonDestructive: {
    backgroundColor: 'transparent',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextDefault: {
    color: theme.colors.accent.blue,
  },
  modalButtonTextDestructive: {
    color: '#dc3545',
  },
});
