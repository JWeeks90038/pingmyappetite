import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
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
    plan: '',
    referralCode: '',
    smsConsent: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidReferral, setIsValidReferral] = useState(false);
  const [referralMessage, setReferralMessage] = useState('');

  const cuisineTypes = [
    'American', 'Asian', 'Mexican', 'Italian', 'BBQ', 'Seafood', 'Vegetarian',
    'Desserts', 'Coffee', 'Breakfast', 'Pizza', 'Burgers', 'Tacos', 'Other'
  ];

  const kitchenTypes = [
    { label: 'Food Truck', value: 'truck' },
    { label: 'Food Trailer', value: 'trailer' },
    { label: 'Food Cart', value: 'cart' },
  ];

  const planOptions = [
    { 
      id: 'basic', 
      name: 'Starter Plan', 
      price: 'Free',
      features: ['Update locations manually via live map', 'Custom menu display', 'Customer Pre-order engagement']
    },
    { 
      id: 'pro', 
      name: 'Pro Plan', 
      price: '$9/month',
      features: ['Everything in Starter', 'Real-time GPS tracking', 'Heat maps showing customer demand', 'Pre-order engagement', 'Create Drops providing exclusive deals']
    },
    { 
      id: 'all-access', 
      name: 'All-Access Plan', 
      price: '$19/month',
      features: ['Everything in Pro', 'Advanced analytics', 'Event management']
    },
  ];

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
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!formData.truckName.trim()) {
      Alert.alert('Error', 'Please enter your truck name');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!formData.password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      Alert.alert('Error', 'Please enter a valid US phone number (10 digits)');
      return;
    }
    if (!formData.plan) {
      Alert.alert('Error', 'Please select a plan to continue');
      return;
    }

    setLoading(true);

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Determine subscription status
      let subscriptionStatus = 'active'; // Default for basic plan
      if (formData.plan === 'pro' || formData.plan === 'all-access') {
        subscriptionStatus = 'pending'; // Will be updated after payment
      }

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
        plan: formData.plan,
        subscriptionStatus: subscriptionStatus,
        subscriptionId: null,
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
          selectedPlan: formData.plan,
          signupAt: serverTimestamp(),
          paymentCompleted: formData.plan === 'basic', // Basic is free
          emailSent: false
        });
      }

      if (formData.plan === 'basic') {
        Alert.alert(
          'Success!', 
          'Account created successfully! Welcome to Grubana Basic.',
          [{ text: 'OK' }] // Let navigation handle automatically
        );
      } else {
        Alert.alert(
          'Almost Done!', 
          `Account created! You'll be redirected to complete payment for your ${formData.plan} plan.`,
          [{ text: 'Continue' }] // Let navigation handle automatically
        );
      }

    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const renderPlanOption = (plan) => (
    <TouchableOpacity
      key={plan.id}
      style={[
        styles.planOption,
        formData.plan === plan.id && styles.planOptionSelected
      ]}
      onPress={() => handleInputChange('plan', plan.id)}
    >
      <View style={styles.planHeader}>
        <Text style={[
          styles.planName,
          formData.plan === plan.id && styles.planNameSelected
        ]}>
          {plan.name}
        </Text>
        <Text style={[
          styles.planPrice,
          formData.plan === plan.id && styles.planPriceSelected
        ]}>
          {plan.price}
        </Text>
      </View>
      <View style={styles.planFeatures}>
        {plan.features.map((feature, index) => (
          <Text key={index} style={[
            styles.planFeature,
            formData.plan === plan.id && styles.planFeatureSelected
          ]}>
            • {feature}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#2c6f57" />
          </TouchableOpacity>
          <Text style={styles.title}>Join as Food Truck Owner</Text>
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

          {/* Truck Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Food Truck Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.truckName}
              onChangeText={(value) => handleInputChange('truckName', value)}
              placeholder="Enter your truck name"
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
              >
                <Picker.Item label="Select cuisine type" value="" />
                {cuisineTypes.map(cuisine => (
                  <Picker.Item key={cuisine} label={cuisine} value={cuisine} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Kitchen Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kitchen Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.kitchenType}
                style={styles.picker}
                onValueChange={(value) => handleInputChange('kitchenType', value)}
              >
                {kitchenTypes.map(type => (
                  <Picker.Item key={type.value} label={type.label} value={type.value} />
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
              placeholder="Describe your food truck and specialties"
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
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Your Plan *</Text>
            <View style={styles.plansContainer}>
              {planOptions.map(renderPlanOption)}
            </View>
          </View>

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
    </KeyboardAvoidingView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputSuccess: {
    borderColor: '#28a745',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  referralMessage: {
    marginTop: 5,
    fontSize: 14,
  },
  successMessage: {
    color: '#28a745',
  },
  errorMessage: {
    color: '#dc3545',
  },
  plansContainer: {
    marginTop: 10,
  },
  planOption: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  planOptionSelected: {
    borderColor: '#2c6f57',
    backgroundColor: '#f0f8f5',
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
    color: '#333',
  },
  planNameSelected: {
    color: '#2c6f57',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  planPriceSelected: {
    color: '#2c6f57',
  },
  planFeatures: {
    marginTop: 8,
  },
  planFeature: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  planFeatureSelected: {
    color: '#2c6f57',
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
    color: '#666',
    lineHeight: 20,
  },
  signupButton: {
    backgroundColor: '#2c6f57',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  signupButtonDisabled: {
    backgroundColor: '#aaa',
  },
  signupButtonText: {
    color: '#fff',
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
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    color: '#2c6f57',
    fontWeight: 'bold',
  },
};
