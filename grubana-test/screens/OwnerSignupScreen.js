import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActionSheetIOS,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';

export default function OwnerSignupScreen({ navigation }) {
  const [formData, setFormData] = useState({
    username: '',
    truckName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    location: '',
    cuisine: '',
    hours: '',
    description: '',
    kitchenType: '',
    plan: '',
  });
  const [loading, setLoading] = useState(false);

  const cuisineOptions = [
    { label: 'Select Cuisine Type', value: '' },
    { label: 'American', value: 'american' },
    { label: 'Asian Fusion', value: 'asian-fusion' },
    { label: 'BBQ', value: 'bbq' },
    { label: 'Burgers', value: 'burgers' },
    { label: 'Chinese', value: 'chinese' },
    { label: 'Coffee & Café', value: 'coffee' },
    { label: 'Desserts & Sweets', value: 'desserts' },
    { label: 'Drinks & Beverages', value: 'drinks' },
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
    { label: 'Southern Comfort', value: 'southern' },
    { label: 'Sushi & Japanese', value: 'sushi' },
    { label: 'Thai', value: 'thai' },
    { label: 'Vegan & Vegetarian', value: 'vegan' },
    { label: 'Wings', value: 'wings' },
    { label: 'Other', value: 'other' },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlanSelection = () => {
    const planOptions = [
      'Cancel',
      'Basic (Free) - Discovery map, demand pins, manual updates',
      'Pro ($9.99/month) - Real-time GPS tracking + menu display', 
      'All Access ($19.99/month) - Analytics, drops, featured placement'
    ];

    const planValues = ['', 'basic', 'pro', 'all-access'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: planOptions,
          cancelButtonIndex: 0,
          title: 'Choose Your Plan',
        },
        (buttonIndex) => {
          if (buttonIndex !== 0) {
            handleInputChange('plan', planValues[buttonIndex]);
          }
        }
      );
    } else {
      // For Android, use Alert
      Alert.alert(
        'Choose Your Plan',
        'Select the plan that best fits your needs:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Basic (Free)', 
            onPress: () => handleInputChange('plan', 'basic')
          },
          { 
            text: 'Pro ($9.99/month)', 
            onPress: () => handleInputChange('plan', 'pro')
          },
          { 
            text: 'All Access ($19.99/month)', 
            onPress: () => handleInputChange('plan', 'all-access')
          },
        ]
      );
    }
  };

  const handleCuisineSelection = () => {
    const cuisineLabels = cuisineOptions.map(option => option.label);
    const cuisineValues = cuisineOptions.map(option => option.value);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: cuisineLabels,
          cancelButtonIndex: 0,
          title: 'Choose Cuisine Type',
        },
        (buttonIndex) => {
          if (buttonIndex !== 0) {
            handleInputChange('cuisine', cuisineValues[buttonIndex]);
          }
        }
      );
    } else {
      // For Android, we'll create a scrollable alert since there are many options
      const cuisineButtons = cuisineOptions.slice(1).map(option => ({
        text: option.label,
        onPress: () => handleInputChange('cuisine', option.value)
      }));
      
      cuisineButtons.unshift({ text: 'Cancel', style: 'cancel' });

      Alert.alert(
        'Choose Cuisine Type',
        'Select your food truck\'s cuisine type:',
        cuisineButtons
      );
    }
  };

  const getPlanDisplayText = () => {
    switch (formData.plan) {
      case 'basic':
        return 'Basic (Free) - Discovery map, demand pins, manual updates';
      case 'pro':
        return 'Pro ($9.99/month) - Real-time GPS tracking + menu display';
      case 'all-access':
        return 'All Access ($19.99/month) - Analytics, drops, featured placement';
      default:
        return 'Select Plan';
    }
  };

  const getCuisineDisplayText = () => {
    const selectedCuisine = cuisineOptions.find(option => option.value === formData.cuisine);
    return selectedCuisine ? selectedCuisine.label : 'Select Cuisine Type';
  };

  const handleSignup = async () => {
    // Validation
    const requiredFields = ['username', 'truckName', 'ownerName', 'email', 'phone', 'password', 'confirmPassword', 'location', 'cuisine', 'hours', 'kitchenType', 'plan'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
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

    // Handle payment for paid plans
    if (formData.plan === 'pro' || formData.plan === 'all-access') {
      // Navigate to payment screen
      navigation.navigate('PaymentScreen', { 
        formData, 
        plan: formData.plan,
        price: formData.plan === 'pro' ? 9.99 : 19.99
      });
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Create user document in Firestore
      const userData = {
        uid: user.uid,
        role: 'owner',
        username: formData.username,
        truckName: formData.truckName,
        ownerName: formData.ownerName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        cuisine: formData.cuisine,
        hours: formData.hours,
        description: formData.description,
        kitchenType: formData.kitchenType,
        plan: formData.plan,
        subscriptionStatus: 'active',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // Create truck location document if geolocation is available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await setDoc(doc(db, 'truckLocations', user.uid), {
              ownerUid: user.uid,
              uid: user.uid,
              truckName: formData.truckName,
              kitchenType: formData.kitchenType,
              cuisine: formData.cuisine,
              lat: latitude,
              lng: longitude,
              isLive: false,
              visible: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastActive: Date.now(),
            }, { merge: true });
          },
          (error) => {
            console.error('Geolocation error:', error);
          }
        );
      }

      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }) }
      ]);
    } catch (error) {
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
              source={require('../assets/grubana-logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>Join as Owner</Text>
          <Text style={styles.subtitle}>
            Manage your mobile kitchen and connect with hungry customers
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a username"
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kitchen Type *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioOption, formData.kitchenType === 'truck' && styles.radioSelected]}
                onPress={() => handleInputChange('kitchenType', 'truck')}
              >
                <Text style={[styles.radioText, formData.kitchenType === 'truck' && styles.radioTextSelected]}>
                  🚚 Food Truck
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, formData.kitchenType === 'trailer' && styles.radioSelected]}
                onPress={() => handleInputChange('kitchenType', 'trailer')}
              >
                <Text style={[styles.radioText, formData.kitchenType === 'trailer' && styles.radioTextSelected]}>
                  🚛 Food Trailer
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Kitchen Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your food truck/trailer name"
              value={formData.truckName}
              onChangeText={(value) => handleInputChange('truckName', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Owner's Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter the owner's name"
              value={formData.ownerName}
              onChangeText={(value) => handleInputChange('ownerName', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
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
            <Text style={styles.label}>Location (City) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your operating city"
              value={formData.location}
              onChangeText={(value) => handleInputChange('location', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cuisine Type *</Text>
            
            {/* Custom Cuisine Selector - Better UX */}
            <TouchableOpacity
              style={[styles.input, styles.planSelector]}
              onPress={handleCuisineSelection}
            >
              <Text style={[
                styles.planSelectorText,
                formData.cuisine ? styles.planSelectedText : styles.planPlaceholderText
              ]}>
                {getCuisineDisplayText()}
              </Text>
              <Text style={styles.planSelectorArrow}>▼</Text>
            </TouchableOpacity>

            {/* Fallback: Hidden Picker for compatibility */}
            <View style={{ height: 0, overflow: 'hidden' }}>
              <Picker
                selectedValue={formData.cuisine}
                onValueChange={(value) => handleInputChange('cuisine', value)}
              >
                {cuisineOptions.map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Hours *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 11 AM - 9 PM"
              value={formData.hours}
              onChangeText={(value) => handleInputChange('hours', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about your mobile kitchen and menu"
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Choose Your Plan *</Text>
            
            {/* Custom Plan Selector - Better UX */}
            <TouchableOpacity
              style={[styles.input, styles.planSelector]}
              onPress={handlePlanSelection}
            >
              <Text style={[
                styles.planSelectorText,
                formData.plan ? styles.planSelectedText : styles.planPlaceholderText
              ]}>
                {getPlanDisplayText()}
              </Text>
              <Text style={styles.planSelectorArrow}>▼</Text>
            </TouchableOpacity>

            {/* Fallback: Hidden Picker for compatibility */}
            <View style={{ height: 0, overflow: 'hidden' }}>
              <Picker
                selectedValue={formData.plan}
                onValueChange={(value) => handleInputChange('plan', value)}
              >
                <Picker.Item label="Select Plan" value="" />
                <Picker.Item label="Basic (Free)" value="basic" />
                <Picker.Item label="Pro ($9.99/month)" value="pro" />
                <Picker.Item label="All Access ($19.99/month)" value="all-access" />
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signupButton, loading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#2c6f57',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'ios' ? 50 : 30,
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 15,
  },
  logo: {
    width: 100,
    height: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#e0e0e0',
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    flex: 1,
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
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  radioOption: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  radioSelected: {
    borderColor: '#2c6f57',
    backgroundColor: '#f0f8f5',
  },
  radioText: {
    fontSize: 16,
    color: '#666',
  },
  radioTextSelected: {
    color: '#2c6f57',
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  planSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 15,
  },
  planSelectorText: {
    flex: 1,
    fontSize: 16,
  },
  planSelectedText: {
    color: '#333',
  },
  planPlaceholderText: {
    color: '#999',
  },
  planSelectorArrow: {
    fontSize: 12,
    color: '#666',
  },
  signupButton: {
    backgroundColor: '#2c6f57',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginLinkText: {
    color: '#2c6f57',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
