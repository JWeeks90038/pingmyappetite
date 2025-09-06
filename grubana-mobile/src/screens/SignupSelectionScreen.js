import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SignupSelectionScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/2.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Join Grubana</Text>
        <Text style={styles.subtitle}>Choose your account type to get started</Text>
      </View>

      <View style={styles.optionsContainer}>
        {/* Customer Signup Option */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('CustomerSignup')}
        >
          <View style={styles.optionHeader}>
            <Ionicons name="restaurant" size={40} color="#2c6f57" />
            <Text style={styles.optionTitle}>Foodie Fan</Text>
          </View>
          <Text style={styles.optionDescription}>
            Discover food trucks near you, send food requests, and track your favorites
          </Text>
          <View style={styles.optionFeatures}>
            <Text style={styles.featureText}>• Find nearby food trucks</Text>
            <Text style={styles.featureText}>• Send food requests (pings)</Text>
            <Text style={styles.featureText}>• Save favorite trucks</Text>
            <Text style={styles.featureText}>• Get real-time updates</Text>
          </View>
          <View style={styles.optionButton}>
            <Text style={styles.optionButtonText}>Sign Up as Foodie Fan</Text>
            <Ionicons name="arrow-forward" size={16} color="#2c6f57" />
          </View>
        </TouchableOpacity>

        {/* Food Truck Owner Signup Option */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('OwnerSignup')}
        >
          <View style={styles.optionHeader}>
            <Ionicons name="car" size={40} color="#2c6f57" />
            <Text style={styles.optionTitle}>Mobile Kitchen Vendor</Text>
          </View>
          <Text style={styles.optionDescription}>
            Manage your food truck, trailer, cart or popup, connect with customers, and grow your business
          </Text>
          <View style={styles.optionFeatures}>
            <Text style={styles.featureText}>• Real-time location tracking</Text>
            <Text style={styles.featureText}>• Customer demand analytics</Text>
            <Text style={styles.featureText}>• Menu management</Text>
            <Text style={styles.featureText}>• Direct customer communication</Text>
          </View>
          <View style={styles.optionButton}>
            <Text style={styles.optionButtonText}>Sign Up as Mobile Kitchen</Text>
            <Ionicons name="arrow-forward" size={16} color="#2c6f57" />
          </View>
        </TouchableOpacity>

        {/* Event Organizer Signup Option */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('EventOrganizerSignup')}
        >
          <View style={styles.optionHeader}>
            <Ionicons name="calendar" size={40} color="#2c6f57" />
            <Text style={styles.optionTitle}>Event Organizer</Text>
          </View>
          <Text style={styles.optionDescription}>
            Create and manage events, festivals, and markets
          </Text>
          <View style={styles.optionFeatures}>
            <Text style={styles.featureText}>• Create events</Text>
            <Text style={styles.featureText}>• Manage vendor applications</Text>
            <Text style={styles.featureText}>• Event promotion tools</Text>
            <Text style={styles.featureText}>• Analytics and reporting</Text>
          </View>
          <View style={styles.optionButton}>
            <Text style={styles.optionButtonText}>Sign Up as Organizer</Text>
            <Ionicons name="arrow-forward" size={16} color="#2c6f57" />
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>
          Already have an account? Sign In
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Deep navy blue background
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 180,
    height: 72,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c6f57', // Green title
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#87ceeb', // Light blue subtitle
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    flex: 1,
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#2c6f57', // Green border
  },
  optionHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c6f57', // Green option titles
    marginTop: 10,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  optionFeatures: {
    marginBottom: 20,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    lineHeight: 18,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8f5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c6f57',
  },
  optionButtonText: {
    color: '#2c6f57',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  backButtonText: {
    color: '#2c6f57',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
