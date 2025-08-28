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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Picker } from '@react-native-picker/picker';

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
  });
  const [loading, setLoading] = useState(false);

  const organizationTypes = [
    { label: 'Select Organization Type', value: '' },
    { label: 'Community Organization', value: 'community' },
    { label: 'City/Municipality', value: 'government' },
    { label: 'Event Planning Company', value: 'event-company' },
    { label: 'Business District', value: 'business-district' },
    { label: 'Non-Profit Organization', value: 'non-profit' },
    { label: 'Mall/Shopping Center', value: 'retail' },
    { label: 'Corporate/Office Complex', value: 'corporate' },
    { label: 'School/University', value: 'education' },
    { label: 'Other', value: 'other' },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
        createdAt: serverTimestamp(),
        stripeCustomerId: null,
      };

      await setDoc(doc(db, 'users', user.uid), userData);

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
          
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/grubana-logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
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
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.organizationType}
                onValueChange={(value) => handleInputChange('organizationType', value)}
                style={styles.picker}
              >
                {organizationTypes.map((type) => (
                  <Picker.Item key={type.value} label={type.label} value={type.value} />
                ))}
              </Picker>
            </View>
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
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
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
};
