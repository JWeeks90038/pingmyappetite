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
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const { user, userData, userRole } = useAuth();
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/grubana-logo-tshirt.png')} 
          style={styles.logo}
        />
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
              Hello, {userData?.username || user.displayName || 'there'}!
            </Text>
          </View>
        )}

        <View style={styles.featureSection}>
          <Text style={styles.sectionTitle}>
            {userRole === 'owner' ? 'Owner Features' : 'Customer Features'}
          </Text>
          
                    {userRole === 'owner' ? (
            <View>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>📍 Live Location Tracking</Text>
                  <Text style={styles.featureDescription}>
                    Go live on the map! Customers can track your truck in real-time, follow your route, and place pre-orders with a tap of your truck icon.
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>🍽️ Menu Management</Text>
                  <Text style={styles.featureDescription}>
                    Keep your menu and prices updated in seconds- drive more sales as customers pre-order, skip the line, and keep your service moving fast.
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>📊 Analytics Dashboard</Text>
                  <Text style={styles.featureDescription}>
                    Track customer pings and analyze demand - see order trends, event performance, and insights that help you boost sales.
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>🎯 Food Drops</Text>
                  <Text style={styles.featureDescription}>
                    Create more buzz, boost sales with special offers and limited-time drops that keep customers coming back. 
                  </Text>
                </View>
              </View>
              
              <View style={styles.actionSection}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('TruckOnboarding')}
                >
                  <Text style={styles.buttonText}>🚚 Manage Your Truck</Text>
                  <Text style={styles.buttonSubtext}>Payment Setup & Menu Management</Text>
                </TouchableOpacity>
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
    backgroundColor: '#2c6f57', // Green header
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#000000', // Black border accent
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logo: {
    width: 250,
    height: 100,
    marginBottom: 20,
    resizeMode: 'contain',
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
    borderWidth: 2,
    borderColor: '#000000',
    borderTopWidth: 4,
    borderTopColor: '#4682b4', // Blue accent top border
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
    textAlign: 'center',
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
    borderWidth: 2,
    borderColor: '#000000',
    borderLeftWidth: 4,
    borderLeftColor: '#4682b4', // Blue accent left border
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
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  actionSection: {
    marginVertical: 20,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
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
    borderWidth: 2,
    borderColor: '#000000',
    borderBottomWidth: 4,
    borderBottomColor: '#4682b4', // Blue accent bottom border
  },
  aboutText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    textAlign: 'center',
  },
});

export default HomeScreen;
