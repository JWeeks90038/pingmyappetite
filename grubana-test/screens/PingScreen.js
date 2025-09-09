import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { auth, db } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';

export default function PingScreen() {
  const [cuisineType, setCuisineType] = useState('');
  const [desiredTime, setDesiredTime] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [manualAddress, setManualAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [dailyPingCount, setDailyPingCount] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Success modal state
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // Toast notification function
  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const cuisineOptions = [
    { label: 'Select Cuisine', value: '' },
    { label: 'American', value: 'american' },
    { label: 'Asian Fusion', value: 'asian-fusion' },
    { label: 'BBQ', value: 'bbq' },
    { label: 'Burgers', value: 'burgers' },
    { label: 'Chinese', value: 'chinese' },
    { label: 'Coffee & Café', value: 'coffee' },
    { label: 'Desserts & Sweets', value: 'desserts' },
    { label: 'Greek', value: 'greek' },
    { label: 'Halal', value: 'halal' },
    { label: 'Healthy & Fresh', value: 'healthy' },
    { label: 'Indian', value: 'indian' },
    { label: 'Italian', value: 'italian' },
    { label: 'Korean', value: 'korean' },
    { label: 'Latin American', value: 'latin' },
    { label: 'Mediterranean', value: 'mediterranean' },
    { label: 'Mexican', value: 'mexican' },
    { label: 'Pizza', value: 'pizza' },
    { label: 'Seafood', value: 'seafood' },
    { label: 'Sushi & Japanese', value: 'sushi' },
    { label: 'Thai', value: 'thai' },
    { label: 'Vegan & Vegetarian', value: 'vegan' },
    { label: 'Wings', value: 'wings' },
    { label: 'Other', value: 'other' },
  ];

  useEffect(() => {
    checkUserRole();
    checkDailyPingCount();
    getCurrentLocation();
  }, []);

  const checkUserRole = async () => {
    if (!auth.currentUser) {
      setCheckingRole(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role || 'customer');
      } else {
        // If no user document exists, default to customer
        setUserRole('customer');
      }
    } catch (error) {

      // Default to customer on error
      setUserRole('customer');
    } finally {
      setCheckingRole(false);
    }
  };

  const checkDailyPingCount = async () => {
    if (!auth.currentUser) return;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'pings'),
      where('userId', '==', auth.currentUser.uid),
      where('timestamp', '>=', oneDayAgo)
    );

    const snapshot = await getDocs(q);
    setDailyPingCount(snapshot.size);
  };

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Please enable location services to use this feature', 'error');
        setUseCurrentLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    } catch (error) {
      showToast('Unable to get your current location', 'error');
      setUseCurrentLocation(false);
    }
  };

  const geocodeAddress = async (address) => {
    try {
      const results = await Location.geocodeAsync(address);
      if (results.length > 0) {
        return {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
      }
      throw new Error('Address not found');
    } catch (error) {
      throw new Error('Invalid address');
    }
  };

  const sendPing = async () => {
    // Double-check user role as security measure
    if (userRole === 'owner') {
      showToast('Food truck owners cannot send food requests', 'error');
      return;
    }

    if (!cuisineType) {
      showToast('Please select a cuisine type', 'error');
      return;
    }

    if (dailyPingCount >= 3) {
      showToast('You can only send 3 pings per day', 'error');
      return;
    }

    setLoading(true);

    try {
      let lat, lng, address;

      if (useCurrentLocation) {
        if (!location) {
          showToast('Unable to get your location. Please enter an address manually.', 'error');
          setLoading(false);
          return;
        }
        lat = location.coords.latitude;
        lng = location.coords.longitude;
        
        // Reverse geocode to get address
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        address = reverseResults[0] ? 
          `${reverseResults[0].street || ''} ${reverseResults[0].city || ''}, ${reverseResults[0].region || ''}`.trim() :
          'Current Location';
      } else {
        if (!manualAddress.trim()) {
          showToast('Please enter an address', 'error');
          setLoading(false);
          return;
        }
        
        const coords = await geocodeAddress(manualAddress);
        lat = coords.latitude;
        lng = coords.longitude;
        address = manualAddress;
      }

      const pingData = {
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        lat,
        lng,
        cuisineType,
        desiredTime: desiredTime || '',
        timestamp: serverTimestamp(),
        address,
      };

      await addDoc(collection(db, 'pings'), pingData);

      setSuccessModalVisible(true);
      
      // Reset form
      setCuisineType('');
      setDesiredTime('');
      setManualAddress('');
      
      // Refresh ping count
      checkDailyPingCount();

    } catch (error) {
      showToast(error.message || 'Failed to send ping', 'error');
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <Text style={styles.title}>Send a Food Request</Text>
        <Text style={styles.subtitle}>
          Let nearby food trucks know what you're craving!
        </Text>
      </View>

      {checkingRole ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : userRole === 'owner' ? (
        <View style={styles.ownerContainer}>
          <View style={styles.ownerMessage}>
            <Ionicons name="information-circle" size={64} color="#2c6f57" />
            <Text style={styles.ownerTitle}>Food Truck Owner Account</Text>
            <Text style={styles.ownerText}>
              As a food truck owner, you can't send food requests. 
              This feature is only available for customers.
            </Text>
            <Text style={styles.ownerSubtext}>
              Use the other tabs to manage your truck location and view customer requests!
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.form}>
        {/* Daily Ping Counter */}
        <View style={styles.counterContainer}>
          <Text style={[
            styles.counterText, 
            dailyPingCount >= 3 ? styles.counterLimit : null
          ]}>
            Pings today: {dailyPingCount}/3
          </Text>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Your Location</Text>
          
          <TouchableOpacity
            style={styles.locationToggle}
            onPress={() => setUseCurrentLocation(!useCurrentLocation)}
          >
            <Ionicons 
              name={useCurrentLocation ? 'checkbox' : 'square-outline'} 
              size={24} 
              color="#2c6f57" 
            />
            <Text style={styles.toggleText}>Use my current location</Text>
          </TouchableOpacity>

          {!useCurrentLocation && (
            <TextInput
              style={styles.textInput}
              placeholder="Enter your address"
              value={manualAddress}
              onChangeText={setManualAddress}
              multiline
            />
          )}
        </View>

        {/* Cuisine Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ What are you craving?</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={cuisineType}
              onValueChange={setCuisineType}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {cuisineOptions.map((option) => (
                <Picker.Item 
                  key={option.value} 
                  label={option.label} 
                  value={option.value} 
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ When do you want to eat?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Now, In 30 minutes, 12:30 PM (optional)"
            value={desiredTime}
            onChangeText={setDesiredTime}
            returnKeyType="done"
            blurOnSubmit={true}
            enablesReturnKeyAutomatically={true}
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (loading || dailyPingCount >= 3) ? styles.sendButtonDisabled : null
          ]}
          onPress={sendPing}
          disabled={loading || dailyPingCount >= 3}
        >
          <Text style={styles.sendButtonText}>
            {loading ? 'Sending...' : 'Send Food Request 📡'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Food trucks in your area will see your request and may head your way!
        </Text>
      </View>
      )}
      </ScrollView>

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View style={[
          styles.toast,
          toastType === 'success' ? styles.toastSuccess : styles.toastError,
          { opacity: fadeAnim }
        ]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📡 Request Sent!</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Your food request has been sent to nearby food trucks! 
                They'll see your craving and may head your way.
              </Text>
              <Text style={styles.modalSubtext}>
                Keep an eye on the map for trucks responding to your ping!
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Awesome!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2c6f57',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e0e0',
  },
  form: {
    padding: 20,
    paddingBottom: 40,
  },
  counterContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
  },
  counterLimit: {
    color: '#dc3545',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 50 : 40,
    width: '100%',
    marginVertical: Platform.OS === 'ios' ? -5 : 0,
    color: '#333',
  },
  pickerItem: {
    fontSize: 16,
    height: Platform.OS === 'ios' ? 50 : 40,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#2c6f57',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  ownerContainer: {
    flex: 1,
    padding: 20,
  },
  ownerMessage: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 50,
  },
  ownerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  ownerText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 15,
  },
  ownerSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Toast styles
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: '#4CAF50',
  },
  toastError: {
    backgroundColor: '#f44336',
  },
  toastText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 0,
    margin: 20,
    maxWidth: 350,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    backgroundColor: '#2c6f57',
    padding: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtext: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalButton: {
    backgroundColor: '#2c6f57',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
