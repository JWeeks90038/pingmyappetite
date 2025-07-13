import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../components/AuthContext';
import { db } from '../services/firebase';
import { doc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';

const OwnerDashboardScreen = () => {
  const { user } = useAuth();
  const [isLive, setIsLive] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationTracking, setLocationTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [truckData, setTruckData] = useState(null);

  // Monitor truck location document
  useEffect(() => {
    if (!user) return;

    const truckLocationRef = doc(db, 'truckLocations', user.uid);
    const unsubscribe = onSnapshot(truckLocationRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setTruckData(data);
        setIsLive(data.isLive || false);
        setLocation(data.lat && data.lng ? {
          latitude: data.lat,
          longitude: data.lng
        } : null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to track your truck');
        return;
      }

      setLocationTracking(true);
      
      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        async (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setLocation({ latitude, longitude });
          
          // Update Firestore
          if (user) {
            const truckLocationRef = doc(db, 'truckLocations', user.uid);
            await updateDoc(truckLocationRef, {
              lat: latitude,
              lng: longitude,
              lastActive: Date.now(),
              isLive: true,
            });
          }
        }
      );

      return subscription;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
      setLocationTracking(false);
    }
  };

  const stopLocationTracking = async () => {
    setLocationTracking(false);
    
    if (user) {
      const truckLocationRef = doc(db, 'truckLocations', user.uid);
      await updateDoc(truckLocationRef, {
        isLive: false,
        lastActive: Date.now(),
      });
    }
  };

  const toggleLiveStatus = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const newLiveStatus = !isLive;
      const truckLocationRef = doc(db, 'truckLocations', user.uid);

      if (newLiveStatus) {
        // Going live - start location tracking
        await startLocationTracking();
        
        // Initialize or update truck location document
        await setDoc(truckLocationRef, {
          ownerUid: user.uid,
          truckName: truckData?.truckName || user.displayName || 'Food Truck',
          isLive: true,
          visible: true,
          lastActive: Date.now(),
          lat: location?.latitude || 0,
          lng: location?.longitude || 0,
          kitchenType: truckData?.kitchenType || 'truck',
          cuisine: truckData?.cuisine || '',
        }, { merge: true });
      } else {
        // Going offline
        await stopLocationTracking();
        await updateDoc(truckLocationRef, {
          isLive: false,
          lastActive: Date.now(),
        });
      }

      setIsLive(newLiveStatus);
    } catch (error) {
      console.error('Error toggling live status:', error);
      Alert.alert('Error', 'Failed to update live status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Truck Dashboard</Text>
        <Text style={styles.subtitle}>Manage your food truck presence</Text>
      </View>

      {/* Live Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Status</Text>
        
        <View style={styles.statusContainer}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Currently:</Text>
            <Text style={[
              styles.statusText,
              { color: isLive ? '#27ae60' : '#e74c3c' }
            ]}>
              {isLive ? 'LIVE' : 'OFFLINE'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.liveButton,
              isLive ? styles.liveButtonActive : styles.liveButtonInactive,
              loading && styles.buttonDisabled
            ]}
            onPress={toggleLiveStatus}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.liveButtonText}>
                {isLive ? 'Go Offline' : 'Go Live'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {location && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Current Location:</Text>
            <Text style={styles.locationText}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>--</Text>
            <Text style={styles.statLabel}>Pings Today</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>--</Text>
            <Text style={styles.statLabel}>Active Drops</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {isLive ? '🟢' : '🔴'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📊 View Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>🎯 Create Food Drop</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📋 View Ping Requests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📱 Share QR Code</Text>
        </TouchableOpacity>
      </View>

      {/* Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tips</Text>
        <Text style={styles.tipText}>
          💡 Keep your truck status live to receive more customer pings and increase visibility.
        </Text>
        <Text style={styles.tipText}>
          📍 Make sure location services are enabled for accurate positioning.
        </Text>
        <Text style={styles.tipText}>
          🎯 Create food drops during peak hours to attract more customers.
        </Text>
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
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f5e8',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  liveButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  liveButtonActive: {
    backgroundColor: '#e74c3c',
  },
  liveButtonInactive: {
    backgroundColor: '#27ae60',
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  liveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  locationLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  actionButton: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2c6f57',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
});

export default OwnerDashboardScreen;
