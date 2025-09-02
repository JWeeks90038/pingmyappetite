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
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function EventOrganizerSignupScreen({ navigation }) {
  const [formData, setFormData] = useState({
    organizationName: '',
    contactName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    organizationType: '',
    website: '',
    description: '',
    plan: '',
    referralCode: '',
    smsConsent: false,
  });
  const [loading, setLoading] = useState(false);
  const [isValidReferral, setIsValidReferral] = useState(false);
  const [referralMessage, setReferralMessage] = useState('');

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

  const handleSignup = async () => {
    // Validation
    if (!formData.organizationName || !formData.contactName || !formData.email || 
        !formData.phone || !formData.password || !formData.organizationType) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Update user profile
      await updateProfile(user, {
        displayName: formData.contactName,
      });

      // Create user document in Firestore
      const userData = {
        uid: user.uid,
        role: 'event-organizer',
        organizationName: formData.organizationName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        organizationType: formData.organizationType,
        website: formData.website,
        description: formData.description,
        plan: formData.plan || 'basic',
        subscriptionStatus: 'active',
        referralCode: formData.referralCode?.toLowerCase() === 'arayaki_hibachi' ? formData.referralCode : null,
        hasValidReferral: formData.referralCode?.toLowerCase() === 'arayaki_hibachi',
        
        // Notification preferences based on SMS consent
        notificationPreferences: {
          emailNotifications: true,
          smsNotifications: formData.smsConsent || false,
          eventUpdates: true,
          marketingEmails: true,
        },
        
        // Store explicit SMS consent for compliance
        smsConsent: formData.smsConsent || false,
        smsConsentTimestamp: formData.smsConsent ? serverTimestamp() : null,
        
        createdAt: serverTimestamp(),
        stripeCustomerId: null,
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // If valid referral code used, create referral document
      if (formData.referralCode?.toLowerCase() === 'arayaki_hibachi') {
        await setDoc(doc(db, 'referrals', user.uid), {
          userId: user.uid,
          userEmail: formData.email,
          userName: formData.contactName,
          organizationName: formData.organizationName,
          referralCode: formData.referralCode,
          selectedPlan: formData.plan || 'basic',
          signupAt: serverTimestamp(),
          paymentCompleted: (formData.plan || 'basic') === 'basic', // Basic is free
          emailSent: false
        });
      }

      Alert.alert(
        'Success!',
        'Your account has been created successfully. Welcome to Grubana!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to appropriate dashboard or login
              navigation.navigate('Login');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#2c6f57" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Join as Event Organizer</Text>
          <Text style={styles.subtitle}>
            Create and manage food truck events, festivals, and markets
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Organization Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your organization name"
              value={formData.organizationName}
              onChangeText={(value) => handleInputChange('organizationName', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={formData.contactName}
              onChangeText={(value) => handleInputChange('contactName', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Organization Type *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Community Organization, City/Municipality, Event Planning Company"
              value={formData.organizationType}
              onChangeText={(value) => handleInputChange('organizationType', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              placeholder="https://your-website.com"
              value={formData.website}
              onChangeText={(value) => handleInputChange('website', value)}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about your organization and events"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Referral Code (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                isValidReferral && styles.inputSuccess,
                referralMessage.includes('❌') && styles.inputError
              ]}
              placeholder="Enter referral code"
              value={formData.referralCode}
              onChangeText={(value) => handleInputChange('referralCode', value)}
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password (min. 6 characters)"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              secureTextEntry
            />
          </View>

          {/* SMS Consent */}
          <View style={styles.consentContainer}>
            <Switch
              value={formData.smsConsent}
              onValueChange={(value) => setFormData(prev => ({ ...prev, smsConsent: value }))}
              trackColor={{ false: '#767577', true: '#ff6b35' }}
              thumbColor={formData.smsConsent ? '#fff' : '#f4f3f4'}
            />
            <Text style={styles.consentText}>
              I consent to receive SMS notifications about events and important updates
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.signupButton, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              {loading ? 'Creating Account...' : 'Create Organizer Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.signInButtonText}>
              Have an account already? Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    paddingBottom: 50,
  },
  header: {
    backgroundColor: '#2c6f57',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f5e8',
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputSuccess: {
    borderColor: '#28a745',
  },
  inputError: {
    borderColor: '#dc3545',
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
  signupButton: {
    backgroundColor: '#2c6f57',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  termsContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 10,
  },
  consentText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  signInButton: {
    marginTop: 15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signInButtonText: {
    fontSize: 16,
    color: '#2c6f57',
    fontWeight: '500',
  },
};
