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
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';

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

    const unsubscribePings = onSnapshot(pingsQuery, async (snapshot) => {
      const pings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Enhance ping data with better user information
      const enhancedPings = await Promise.all(pings.map(async (ping) => {
        let enhancedPing = { ...ping };

        // Try to get user info from Firebase (username and photo)
        if (ping.userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', ping.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log('User data for ping:', ping.id, userData); // Debug log
              
              // Update username if missing or Anonymous
              if (!ping.username || ping.username === 'Anonymous') {
                enhancedPing.username = userData.displayName || userData.name || ping.username || 'Anonymous';
              }
              
              // Add profile photo if available - check multiple possible field names
              const profilePhoto = userData.profileUrl || 
                                 userData.profilePhotoURL || 
                                 userData.photoURL || 
                                 userData.profilePhoto || 
                                 userData.avatar || 
                                 userData.profilePicture;
              
              if (profilePhoto) {
                enhancedPing.userProfilePhoto = profilePhoto;
                console.log('Found profile photo for user:', userData.displayName || userData.name, profilePhoto);
              } else {
                console.log('No profile photo found for user:', userData.displayName || userData.name, 'Available fields:', Object.keys(userData));
              }
            }
          } catch (error) {
            console.log('Could not fetch user data for ping:', ping.id, error);
          }
        }

        return enhancedPing;
      }));

      setRecentPings(enhancedPings);
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
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    // If it's today, show "Today" + time
    if (diffInHours < 24 && date.toDateString() === now.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    }
    
    // If it's recent (within 7 days), show day and time
    if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    // Otherwise show full date and time
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
              <View style={styles.pingHeader}>
                <View style={styles.pingUserSection}>
                  {ping.userProfilePhoto ? (
                    <Image 
                      source={{ uri: ping.userProfilePhoto }} 
                      style={styles.userProfilePhoto}
                    />
                  ) : (
                    <Text style={styles.userPlaceholder}>👤</Text>
                  )}
                  <Text style={styles.pingUser}>
                    {ping.username || 'Anonymous'}
                  </Text>
                </View>
                <Text style={styles.pingTime}>
                  🕒 {formatTime(ping.timestamp)}
                </Text>
              </View>
              <Text style={styles.pingCuisine}>
                🍽️ Looking for: {ping.cuisineType}
              </Text>
              {ping.address && (
                <Text style={styles.pingAddress} numberOfLines={1}>
                  📍 {ping.address}
                </Text>
              )}
              {ping.desiredTime && (
                <Text style={styles.pingDesiredTime}>
                  ⏰ Wanted at: {ping.desiredTime}
                </Text>
              )}
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
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2c6f57',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pingUserSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  userProfilePhoto: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  userPlaceholder: {
    fontSize: 16,
    marginRight: 6,
  },
  pingUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c6f57',
    flex: 1,
  },
  pingCuisine: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  pingAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  pingDesiredTime: {
    fontSize: 12,
    color: '#e67e22',
    fontWeight: '500',
  },
  pingTime: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 0,
  },
});
