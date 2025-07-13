import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../components/AuthContext';

const HomeScreen = () => {
  const { user, userRole } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Grubana</Text>
        <Text style={styles.subtitle}>
          {userRole === 'owner' 
            ? 'Manage your food truck and connect with customers'
            : 'Find amazing food trucks near you'
          }
        </Text>
      </View>

      <View style={styles.content}>
        {user && (
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              Hello, {user.displayName || user.email}!
            </Text>
          </View>
        )}

        <View style={styles.featureSection}>
          <Text style={styles.sectionTitle}>
            {userRole === 'owner' ? 'Owner Features' : 'Customer Features'}
          </Text>
          
          {userRole === 'owner' ? (
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Text style={styles.featureTitle}>📍 Live Location Tracking</Text>
                <Text style={styles.featureDescription}>
                  Share your real-time location with customers
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureTitle}>📊 Analytics Dashboard</Text>
                <Text style={styles.featureDescription}>
                  Track customer pings and analyze demand
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureTitle}>🎯 Food Drops</Text>
                <Text style={styles.featureDescription}>
                  Create special offers and limited-time deals
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Text style={styles.featureTitle}>📍 Send Pings</Text>
                <Text style={styles.featureDescription}>
                  Let food trucks know what you're craving
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureTitle}>🗺️ Live Map</Text>
                <Text style={styles.featureDescription}>
                  See active food trucks in real-time
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureTitle}>❤️ Favorites</Text>
                <Text style={styles.featureDescription}>
                  Save your favorite food trucks
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About Grubana</Text>
          <Text style={styles.aboutText}>
            Grubana connects food truck lovers with their favorite mobile eateries. 
            Whether you're looking for the perfect lunch spot or running a food truck business, 
            Grubana helps you connect with your community through real-time location sharing 
            and customer demand insights.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2c6f57',
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f5e8',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    padding: 20,
  },
  welcomeSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 18,
    color: '#2c6f57',
    fontWeight: '600',
    textAlign: 'center',
  },
  featureSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 15,
  },
  featuresList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featureItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  aboutSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  aboutText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
});

export default HomeScreen;
