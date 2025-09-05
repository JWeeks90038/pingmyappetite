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
    referralCode: '',
    smsConsent: false,
    plan: 'event-basic', // Default to starter plan for event organizers
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
      // Event organizers can choose from event-specific plans
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
        plan: formData.plan, // Use selected plan instead of hardcoded 'basic'
        subscriptionStatus: formData.plan === 'event-basic' ? 'active' : 'pending', // Starter is free, others need payment
        paymentCompleted: formData.plan === 'event-basic', // Only free plans are considered paid upfront
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
          selectedPlan: formData.plan, // Use selected plan
          signupAt: serverTimestamp(),
          paymentCompleted: formData.plan === 'event-basic', // Only starter plan is free for event organizers
          emailSent: false
        });
      }

      if (formData.plan === 'event-basic') {
        Alert.alert(
          'Success!',
          'Your event organizer account has been created successfully with a FREE Starter plan! Welcome to Grubana!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Don't navigate manually - let the auth system handle it
                // The user is already logged in and will be redirected automatically
                console.log('✅ Event organizer account created successfully');
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Almost Done!',
          `Account created! You'll be redirected to complete payment for your ${formData.plan} plan.`,
          [
            {
              text: 'Continue',
              onPress: () => {
                // Don't navigate manually - let the auth system handle it
                console.log('✅ Event organizer account created, payment required');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Email Already Registered',
          'An account with this email already exists. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => {
                // Navigate back to signup selection, user can choose login from there
                navigation.navigate('SignupSelection');
              }
            }
          ]
        );
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Error', 'Password is too weak. Please choose a stronger password.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Error', 'Please enter a valid email address.');
      } else {
        Alert.alert('Error', error.message || 'Failed to create account. Please try again.');
      }
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

          {/* Plan Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Your Plan *</Text>
            <Text style={styles.planHelpText}>Choose the plan that best fits your event organization needs</Text>
            
            {/* Starter Plan */}
            <TouchableOpacity
              style={[
                styles.planOption,
                formData.plan === 'event-basic' && styles.planOptionSelected
              ]}
              onPress={() => handleInputChange('plan', 'event-basic')}
            >
              <View style={styles.planHeader}>
                <Text style={[
                  styles.planName,
                  formData.plan === 'event-basic' && styles.planNameSelected
                ]}>
                  Event Starter
                </Text>
                <Text style={[
                  styles.planPrice,
                  formData.plan === 'event-basic' && styles.planPriceSelected
                ]}>
                  FREE
                </Text>
              </View>
              <Text style={[
                styles.planDescription,
                formData.plan === 'event-basic' && styles.planDescriptionSelected
              ]}>
                Perfect for getting started with event organizing
              </Text>
              <View style={styles.planFeatures}>
                <Text style={styles.featureText}>• Up to 3 events per month</Text>
                <Text style={styles.featureText}>• Basic event page with details</Text>
                <Text style={styles.featureText}>• Vendor application management</Text>
                <Text style={styles.featureText}>• Map location marker</Text>
                <Text style={styles.featureText}>• Email notifications</Text>
                <Text style={styles.featureText}>• Basic analytics</Text>
              </View>
            </TouchableOpacity>

            {/* Premium Plan */}
            <TouchableOpacity
              style={[
                styles.planOption,
                formData.plan === 'event-premium' && styles.planOptionSelected
              ]}
              onPress={() => handleInputChange('plan', 'event-premium')}
            >
              <View style={styles.planHeader}>
                <Text style={[
                  styles.planName,
                  formData.plan === 'event-premium' && styles.planNameSelected
                ]}>
                  Event Premium
                </Text>
                <Text style={[
                  styles.planPrice,
                  formData.plan === 'event-premium' && styles.planPriceSelected
                ]}>
                  $29/month
                </Text>
              </View>
              <Text style={[
                styles.planDescription,
                formData.plan === 'event-premium' && styles.planDescriptionSelected
              ]}>
                Full-featured plan for professional event organizers
              </Text>
              <View style={styles.planFeatures}>
                <Text style={styles.featureText}>• Unlimited events</Text>
                <Text style={styles.featureText}>• Enhanced event pages with photos</Text>
                <Text style={styles.featureText}>• Priority map placement</Text>
                <Text style={styles.featureText}>• Advanced vendor matching</Text>
                <Text style={styles.featureText}>• SMS and email notifications</Text>
                <Text style={styles.featureText}>• Detailed analytics dashboard</Text>
                <Text style={styles.featureText}>• Custom branding options</Text>
                <Text style={styles.featureText}>• Social media integration</Text>
                <Text style={styles.featureText}>• Featured map placement</Text>
                <Text style={styles.featureText}>• White-label event pages</Text>
                <Text style={styles.featureText}>• API access for integrations</Text>
                <Text style={styles.featureText}>• Dedicated account manager</Text>
              </View>
            </TouchableOpacity>
          </View>

          {formData.plan === 'event-basic' && (
            <View style={styles.freePlanNotice}>
              <Text style={styles.freePlanText}>🎉 Starter Plan is FREE for Event Organizers</Text>
            </View>
          )}

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
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.signInButtonText}>
              Have an account already? Go Back
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
  planHelpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
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
    backgroundColor: '#f8fdf9',
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
    fontWeight: '600',
    color: '#666',
  },
  planPriceSelected: {
    color: '#2c6f57',
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  planDescriptionSelected: {
    color: '#2c6f57',
  },
  planFeatures: {
    marginTop: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  freePlanNotice: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#2c6f57',
  },
  freePlanText: {
    color: '#2c6f57',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
