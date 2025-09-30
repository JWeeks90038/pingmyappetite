import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function OwnerSignupScreen({ navigation }) {
  const [formData, setFormData] = useState({
    ownerName: '',
    truckName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    location: '',
    cuisine: '',
    hours: '',
    description: '',
    kitchenType: 'truck',
    referralCode: '',
    smsConsent: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidReferral, setIsValidReferral] = useState(false);
  const [referralMessage, setReferralMessage] = useState('');

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

  const cuisineTypes = [
  'American',
  'Asian Fusion',
  'BBQ',
  'Burgers',
  'Caribbean',
  'Chinese',
  'Coffee & Café',
  'Colombian',
  'Desserts & Sweets',
  'Drinks & Beverages',
  'Greek',
  'Halal',
  'Healthy & Fresh',
  'Indian',
  'Italian',
  'Korean',
  'Latin American',
  'Mediterranean',
  'Mexican',
  'Pizza',
  'Seafood',
  'Southern Comfort',
  'Sushi & Japanese',
  'Thai',
  'Vegan & Vegetarian',
  'Wings',
  'Other'
  ];

  const kitchenTypes = [
    { label: 'Truck', value: 'truck' },
    { label: 'Trailer', value: 'trailer' },
    { label: 'Cart', value: 'cart' },
    { label: 'Popup', value: 'popup' },
  ];

  // Plan options removed - now focusing on commission-based food orders
  // All food truck owners get the same features with 5% commission on pre-orders

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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate referral code in real-time
    if (field === 'referralCode') {
      validateReferralCode(value);
    }
  };

  const validateReferralCode = (code) => {
    if (!code.trim()) {
      setIsValidReferral(false);
      setReferralMessage('');
      return;
    }

    if (code.toLowerCase() === 'arayaki_hibachi') {
      setIsValidReferral(true);
      setReferralMessage('✅ Valid referral code applied! 30-day free trial included.');
    } else {
      setIsValidReferral(false);
      setReferralMessage('❌ Invalid referral code. This code is not recognized.');
    }
  };

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  const handleSignup = async () => {
    // Validation
    if (!formData.ownerName.trim()) {
      showToastMessage('Please enter your name', 'error');
      return;
    }
    if (!formData.truckName.trim()) {
      showToastMessage('Please enter your business name', 'error');
      return;
    }
    if (!formData.email.trim()) {
      showToastMessage('Please enter your email', 'error');
      return;
    }
    if (!formData.password) {
      showToastMessage('Please enter a password', 'error');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      showToastMessage('Passwords do not match', 'error');
      return;
    }
    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      showToastMessage('Please enter a valid US phone number (10 digits)', 'error');
      return;
    }
    // Plan validation removed - using commission-based model

    setLoading(true);

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Subscription status removed - using commission-based model

      // Create user document in Firestore
      const userData = {
        uid: user.uid,
        username: formData.ownerName,
        truckName: formData.truckName,
        ownerName: formData.ownerName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        cuisine: formData.cuisine,
        hours: formData.hours,
        description: formData.description,
        kitchenType: formData.kitchenType,
        role: 'owner',
        referralCode: formData.referralCode?.toLowerCase() === 'arayaki_hibachi' ? formData.referralCode : null,
        hasValidReferral: formData.referralCode?.toLowerCase() === 'arayaki_hibachi',
        
        // Notification preferences based on SMS consent
        notificationPreferences: {
          emailNotifications: true,
          smsNotifications: formData.smsConsent || false,
          favoriteTrucks: true,
          dealAlerts: true,
          weeklyDigest: true
        },
        
        // Store explicit SMS consent for compliance
        smsConsent: formData.smsConsent || false,
        smsConsentTimestamp: formData.smsConsent ? serverTimestamp() : null,
        
        createdAt: serverTimestamp(),
        menuUrl: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        twitter: ''
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // If valid referral code used, create referral document
      if (formData.referralCode?.toLowerCase() === 'arayaki_hibachi') {
        await setDoc(doc(db, 'referrals', user.uid), {
          userId: user.uid,
          userEmail: formData.email,
          userName: formData.ownerName,
          truckName: formData.truckName,
          referralCode: formData.referralCode,
          signupAt: serverTimestamp(),
          emailSent: false
        });
      }

      showCustomModal(
        'Welcome to Grubana!', 
        'Your food truck account has been created successfully! You can now list your menu and accept pre-orders with our 5% commission structure.',
        [{ text: 'Get Started', onPress: () => setModalVisible(false), style: 'default' }]
      );

    } catch (error) {
      showToastMessage(error.message || 'Failed to create account', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { zIndex: 1000 }]}
            onPress={() => {
              navigation.navigate('SignupSelection');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#2c6f57" />
          </TouchableOpacity>
          <Text style={styles.title}>Join as Mobile Kitchen Business Owner</Text>
          <Text style={styles.subtitle}>Start serving customers in your area</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Owner Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Owner Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.ownerName}
              onChangeText={(value) => handleInputChange('ownerName', value)}
              placeholder="Enter your name"
              autoCapitalize="words"
            />
          </View>

          {/* Business Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.truckName}
              onChangeText={(value) => handleInputChange('truckName', value)}
              placeholder="Enter your business name"
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Primary Location</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(value) => handleInputChange('location', value)}
              placeholder="City, State"
              autoCapitalize="words"
            />
          </View>

          {/* Cuisine Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cuisine Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.cuisine}
                style={styles.picker}
                onValueChange={(value) => handleInputChange('cuisine', value)}
                mode="dropdown"
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="Select cuisine type" value="" color="#999" />
                {cuisineTypes.map(cuisine => (
                  <Picker.Item key={cuisine} label={cuisine} value={cuisine} color="#FFFFFF" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Kitchen Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.kitchenType}
                style={styles.picker}
                onValueChange={(value) => handleInputChange('kitchenType', value)}
                mode="dropdown"
                itemStyle={styles.pickerItem}
              >
                {kitchenTypes.map(type => (
                  <Picker.Item key={type.value} label={type.label} value={type.value} color="#FFFFFF" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Operating Hours */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Operating Hours</Text>
            <TextInput
              style={styles.input}
              value={formData.hours}
              onChangeText={(value) => handleInputChange('hours', value)}
              placeholder="e.g., Mon-Fri 11am-3pm, Sat-Sun 10am-8pm"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Describe your mobile kitchen business and specialties"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Referral Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Referral Code (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                isValidReferral && styles.inputSuccess,
                referralMessage.includes('❌') && styles.inputError
              ]}
              value={formData.referralCode}
              onChangeText={(value) => handleInputChange('referralCode', value)}
              placeholder="Enter referral code"
              autoCapitalize="characters"
            />
            {referralMessage ? (
              <Text style={[
                styles.referralMessage,
                isValidReferral ? styles.successMessage : styles.errorMessage
              ]}>
                {referralMessage}
              </Text>
            ) : null}
          </View>

          {/* Plan Selection */}
          {/* Plan selection removed - commission-based pricing only */}

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Create a password"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* SMS Consent */}
          <View style={styles.consentContainer}>
            <Switch
              value={formData.smsConsent}
              onValueChange={(value) => handleInputChange('smsConsent', value)}
              trackColor={{ false: '#ccc', true: '#2c6f57' }}
              thumbColor={formData.smsConsent ? '#fff' : '#f4f3f4'}
            />
            <Text style={styles.consentText}>
              I consent to receive SMS notifications about customer orders and important updates
            </Text>
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.signupButton, loading && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#0B0B1A', // Dark navy background
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1A1036', // Deep purple header
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 70,
    padding: 12,
    backgroundColor: 'rgba(26, 16, 54, 0.8)', // Semi-transparent deep purple
    borderRadius: 20,
    zIndex: 1000,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF', // White title
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4DBFFF', // Neon blue subtitle
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White labels
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#FF4EC9', // Neon pink border
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#1A1036', // Deep purple input background
    color: '#FFFFFF', // White text
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputSuccess: {
    borderColor: '#00E676', // Success green
  },
  inputError: {
    borderColor: '#F44336', // Error red
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#FF4EC9', // Neon pink border
    borderRadius: 8,
    backgroundColor: '#1A1036', // Deep purple background
    overflow: 'hidden',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#FFFFFF', // White text
    backgroundColor: 'transparent',
    marginTop: Platform.OS === 'ios' ? -8 : 0,
  },
  pickerItem: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    textAlign: 'center',
    height: Platform.OS === 'ios' ? 50 : 50,
    lineHeight: Platform.OS === 'ios' ? 50 : undefined,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF4EC9', // Neon pink border
    borderRadius: 8,
    backgroundColor: '#1A1036', // Deep purple background
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF', // White text
  },
  eyeButton: {
    padding: 12,
  },
  referralMessage: {
    marginTop: 5,
    fontSize: 14,
  },
  successMessage: {
    color: '#00E676', // Success green
  },
  errorMessage: {
    color: '#F44336', // Error red
  },
  plansContainer: {
    marginTop: 10,
  },
  planOption: {
    borderWidth: 2,
    borderColor: '#FF4EC9', // Neon pink border
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#1A1036', // Deep purple background
    shadowColor: '#FF4EC9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  planOptionSelected: {
    borderColor: '#00E676', // Success green for selected
    backgroundColor: 'rgba(0, 230, 118, 0.1)', // Semi-transparent green
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
  },
  planNameSelected: {
    color: '#00E676', // Success green for selected
  },
  planPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4DBFFF', // Neon blue price
  },
  planPriceSelected: {
    color: '#00E676', // Success green for selected
  },
  planFeatures: {
    marginTop: 8,
  },
  planFeature: {
    fontSize: 14,
    color: '#4DBFFF', // Neon blue features
    marginBottom: 4,
  },
  planFeatureSelected: {
    color: '#00E676', // Success green for selected
  },
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  consentText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4DBFFF', // Neon blue text
    lineHeight: 20,
  },
  signupButton: {
    backgroundColor: '#FF4EC9', // Neon pink button
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF4EC9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  signupButtonDisabled: {
    backgroundColor: '#555',
  },
  signupButtonText: {
    color: '#FFFFFF', // White text
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#4DBFFF', // Neon blue text
  },
  loginLink: {
    fontSize: 16,
    color: '#FF4EC9', // Neon pink link
    fontWeight: 'bold',
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
    color: '#FFFFFF', // White text
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Custom modal styles (replaces Alert.alert)
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 26, 0.9)', // Dark overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  customModalContainer: {
    backgroundColor: '#1A1036', // Deep purple modal
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    width: '90%',
    borderWidth: 2,
    borderColor: '#FF4EC9', // Neon pink border
    shadowColor: '#FF4EC9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  customModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // White title
    marginBottom: 10,
    textAlign: 'center',
  },
  customModalMessage: {
    fontSize: 16,
    color: '#4DBFFF', // Neon blue message
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  customModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  customModalButton: {
    backgroundColor: '#FF4EC9', // Neon pink button
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    shadowColor: '#FF4EC9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  customModalButtonCancel: {
    backgroundColor: '#555', // Gray cancel button
  },
  customModalButtonText: {
    color: '#FFFFFF', // White text
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  customModalButtonTextCancel: {
    color: '#FFFFFF', // White text
  },
};
