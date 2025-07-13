import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [recentPings, setRecentPings] = useState([]);
  const [nearbyTrucks, setNearbyTrucks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setUser(auth.currentUser);
    
    // Listen to recent pings
    const pingsQuery = query(
      collection(db, 'pings'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribePings = onSnapshot(pingsQuery, (snapshot) => {
      const pings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentPings(pings);
    });

    // Listen to active trucks
    const trucksQuery = query(
      collection(db, 'truckLocations'),
      where('isLive', '==', true),
      where('visible', '==', true)
    );

    const unsubscribeTrucks = onSnapshot(trucksQuery, (snapshot) => {
      const trucks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNearbyTrucks(trucks);
    });

    return () => {
      unsubscribePings();
      unsubscribeTrucks();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Refresh data (Firebase listeners will update automatically)
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/grubana-logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.welcomeText}>
          Welcome{user?.displayName ? `, ${user.displayName}` : ''}! 👋
        </Text>
        <Text style={styles.subtitleText}>
          Find delicious food trucks near you
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Ping')}
        >
          <Ionicons name="radio" size={24} color="#2c6f57" />
          <Text style={styles.actionText}>Send Ping</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Map')}
        >
          <Ionicons name="map" size={24} color="#2c6f57" />
          <Text style={styles.actionText}>View Map</Text>
        </TouchableOpacity>
      </View>

      {/* Live Trucks Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          🚚 Live Food Trucks ({nearbyTrucks.length})
        </Text>
        {nearbyTrucks.length === 0 ? (
          <Text style={styles.emptyText}>No trucks are live right now</Text>
        ) : (
          nearbyTrucks.slice(0, 5).map((truck) => (
            <View key={truck.id} style={styles.truckCard}>
              <View style={styles.truckHeader}>
                <Text style={styles.truckName}>
                  {truck.truckName || 'Food Truck'}
                </Text>
                <View style={styles.liveIndicator}>
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.truckInfo}>
                {truck.cuisine || 'Various cuisines'}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Recent Pings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📍 Recent Food Requests
        </Text>
        {recentPings.length === 0 ? (
          <Text style={styles.emptyText}>No recent pings</Text>
        ) : (
          recentPings.slice(0, 5).map((ping) => (
            <View key={ping.id} style={styles.pingCard}>
              <Text style={styles.pingUser}>
                {ping.username || 'Anonymous'}
              </Text>
              <Text style={styles.pingCuisine}>
                Looking for: {ping.cuisineType}
              </Text>
              <Text style={styles.pingTime}>
                {formatTime(ping.timestamp)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  welcomeSection: {
    backgroundColor: '#2c6f57',
    padding: 20,
    paddingTop: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 120,
    height: 60,
    tintColor: 'white',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitleText: {
    fontSize: 16,
    color: '#e0e0e0',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f0f8f5',
    minWidth: 100,
  },
  actionText: {
    marginTop: 5,
    fontSize: 14,
    color: '#2c6f57',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    marginTop: 0,
    padding: 20,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  truckCard: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  truckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  truckName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  liveIndicator: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  truckInfo: {
    fontSize: 14,
    color: '#666',
  },
  pingCard: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  pingUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  pingCuisine: {
    fontSize: 14,
    color: '#2c6f57',
    marginVertical: 2,
  },
  pingTime: {
    fontSize: 12,
    color: '#999',
  },
});
