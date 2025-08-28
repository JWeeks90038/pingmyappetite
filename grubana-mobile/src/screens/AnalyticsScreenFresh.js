import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../components/AuthContext';
import {
  collection, query, where, onSnapshot, Timestamp, doc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { differenceInMinutes } from 'date-fns';
import { getCuisineDisplayName, normalizeCuisineValue } from '../constants/cuisineTypes';

const { width } = Dimensions.get('window');

// Utility Functions
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export default function AnalyticsScreen() {
  console.log('🚀🚀🚀 BRAND NEW ANALYTICS SCREEN - COMPLETELY REWRITTEN 🚀🚀🚀');
  
  const { user, userData, userRole } = useAuth();
  
  console.log('🔍 Auth Status:', { 
    hasUser: !!user, 
    hasUserData: !!userData, 
    userRole,
    userId: userData?.uid 
  });
  
  // State for analytics data
  const [pingStats, setPingStats] = useState({
    last7Days: 0,
    last30Days: 0,
    cuisineMatchCount: 0,
  });
  
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    last30DaysOrders: 0,
    last30DaysRevenue: 0,
    last7DaysOrders: 0,
    last7DaysRevenue: 95.75,
  });

  const [eventStats, setEventStats] = useState({
    totalAttended: 0,
    last30Days: 0,
    last7Days: 0,
  });

  const [favoritesCount, setFavoritesCount] = useState(0);

  // Real ping analytics
  useEffect(() => {
    if (!userData?.uid || userRole !== 'owner') {
      console.log('🚫 Skipping ping analytics - not owner');
      return;
    }

    console.log('🎯 Setting up REAL ping analytics for:', userData.uid);

    let unsubscribeUser = null;
    let unsubscribePings = null;

    const userDocRef = doc(db, 'users', userData.uid);

    unsubscribeUser = onSnapshot(userDocRef, async (ownerDoc) => {
      if (!ownerDoc.exists()) {
        console.log('❌ User document does not exist');
        return;
      }
      
      const userPlan = ownerDoc.data().plan || 'basic';
      console.log('📋 User plan:', userPlan);
      
      if (userPlan !== 'all-access') {
        console.log('🚫 User does not have all-access plan');
        return;
      }

      // Get truck location
      const truckDoc = await getDoc(doc(db, 'truckLocations', userData.uid));
      if (!truckDoc.exists()) {
        console.log('❌ Truck location not found');
        return;
      }

      const truckData = truckDoc.data();
      console.log('🚛 Truck location:', { lat: truckData.lat, lng: truckData.lng });
      
      if (!truckData.lat || !truckData.lng) {
        console.log('❌ Truck coordinates missing');
        return;
      }

      // Get time ranges
      const nowMs = Date.now();
      const sevenDaysAgo = Timestamp.fromDate(new Date(nowMs - 7 * 24 * 60 * 60 * 1000));
      const thirtyDaysAgo = Timestamp.fromDate(new Date(nowMs - 30 * 24 * 60 * 60 * 1000));

      // Query pings
      const q = query(collection(db, 'pings'), where('timestamp', '>=', thirtyDaysAgo));
      
      unsubscribePings = onSnapshot(q, (snapshot) => {
        console.log('📊 Received ping snapshot, total pings:', snapshot.docs.length);
        
        const pings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const last7 = pings.filter(p => p.timestamp.seconds >= sevenDaysAgo.seconds);
        console.log('📅 Pings in last 7 days:', last7.length);

        // Distance filtering
        const getLoc = (p) => p.location || (p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null);

        const nearbyPings7 = last7.filter(p => {
          const loc = getLoc(p);
          if (!loc) return false;
          const distance = getDistanceFromLatLonInKm(truckData.lat, truckData.lng, loc.lat, loc.lng);
          return distance <= 5;
        });

        const nearbyPings30 = pings.filter(p => {
          const loc = getLoc(p);
          if (!loc) return false;
          const distance = getDistanceFromLatLonInKm(truckData.lat, truckData.lng, loc.lat, loc.lng);
          return distance <= 80;
        });

        console.log('📍 Nearby pings (≤5km) in last 7 days:', nearbyPings7.length);
        console.log('📍 Nearby pings (≤80km) in last 30 days:', nearbyPings30.length);

        setPingStats({
          last7Days: nearbyPings7.length,
          last30Days: nearbyPings30.length,
          cuisineMatchCount: 0,
        });
      });
    });

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribePings) unsubscribePings();
    };
  }, [userData?.uid, userRole]);

  // Events analytics
  useEffect(() => {
    if (!userData?.uid) {
      console.log('🚫 Skipping events analytics - no user data');
      return;
    }

    console.log('🎪 Setting up events analytics for:', userData.uid);

    const eventsQuery = query(
      collection(db, 'eventAttendance'),
      where('userId', '==', userData.uid)
    );

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const attendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('🎭 Found event attendance records:', attendance.length);

      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const last7DaysAttendance = attendance.filter(record => {
        const eventDate = record.eventDate?.toDate?.() || new Date(record.eventDate?.seconds * 1000);
        return eventDate >= last7Days;
      });

      const last30DaysAttendance = attendance.filter(record => {
        const eventDate = record.eventDate?.toDate?.() || new Date(record.eventDate?.seconds * 1000);
        return eventDate >= last30Days;
      });

      setEventStats({
        totalAttended: attendance.length,
        last30Days: last30DaysAttendance.length,
        last7Days: last7DaysAttendance.length,
      });
    });

    return unsubscribeEvents;
  }, [userData?.uid]);

  // Favorites count
  useEffect(() => {
    if (!userData?.uid) return;

    console.log('⭐ Setting up favorites count for:', userData.uid);

    const favoritesQuery = query(
      collection(db, 'favorites'),
      where('truckId', '==', userData.uid)
    );

    const unsubscribeFavorites = onSnapshot(favoritesQuery, (snapshot) => {
      console.log('⭐ Found favorites:', snapshot.size);
      setFavoritesCount(snapshot.size);
    });

    return unsubscribeFavorites;
  }, [userData?.uid]);

  // Orders analytics
  useEffect(() => {
    if (!userData?.uid || userRole !== 'owner') {
      console.log('🚫 Skipping orders analytics - not owner');
      return;
    }

    console.log('💰 Setting up orders analytics for:', userData.uid);

    const ordersQuery = query(
      collection(db, 'orders'),
      where('truckId', '==', userData.uid)
    );

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('📦 Found orders:', orders.length);

      if (orders.length === 0) {
        console.log('📦 No orders found - showing placeholder UI');
        return;
      }

      // Calculate order stats
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) / 100;
      
      setOrderStats({
        totalOrders: orders.length,
        totalRevenue: totalRevenue,
        last30DaysOrders: orders.length, // Simplified for now
        last30DaysRevenue: totalRevenue,
        last7DaysOrders: orders.length,
        last7DaysRevenue: totalRevenue,
      });
    });

    return unsubscribeOrders;
  }, [userData?.uid, userRole]);

  // Check auth
  if (!user || !userData || userRole !== 'owner') {
    console.log('🚫 Not showing analytics - user not owner');
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Analytics Unavailable</Text>
          <Text style={styles.subtitle}>This feature is only available for food truck owners.</Text>
        </ScrollView>
      </View>
    );
  }

  console.log('✅ Showing analytics for owner:', userData.uid);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>📊 Analytics Dashboard</Text>
        
        {/* Ping Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Ping Analytics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pingStats.last7Days}</Text>
              <Text style={styles.statLabel}>Pings (7 days)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pingStats.last30Days}</Text>
              <Text style={styles.statLabel}>Pings (30 days)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{favoritesCount}</Text>
              <Text style={styles.statLabel}>Customer Favorites</Text>
            </View>
          </View>
        </View>

        {/* Events Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎪 Events Analytics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{eventStats.totalAttended}</Text>
              <Text style={styles.statLabel}>Total Events</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{eventStats.last30Days}</Text>
              <Text style={styles.statLabel}>Events (30 days)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{eventStats.last7Days}</Text>
              <Text style={styles.statLabel}>Events (7 days)</Text>
            </View>
          </View>
        </View>

        {/* Orders Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Orders & Revenue Analytics</Text>
          {orderStats.totalOrders > 0 ? (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{orderStats.totalOrders}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>${orderStats.totalRevenue.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Revenue</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{orderStats.last7DaysOrders}</Text>
                <Text style={styles.statLabel}>Orders (7 days)</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>${orderStats.last7DaysRevenue.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Revenue (7 days)</Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>
                📊 No orders yet! Your order analytics will appear here once customers start placing orders through your mobile ordering system.
              </Text>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 10,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  placeholderContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});
