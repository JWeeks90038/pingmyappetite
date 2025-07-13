import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  getDoc 
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalPings: 0,
    todayPings: 0,
    weeklyPings: 0,
    topCuisines: [],
    recentPings: [],
    averageRating: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get user plan
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      setUserPlan(userData?.plan || 'basic');

      // Check if user has analytics access
      if (userData?.plan !== 'all-access') {
        setLoading(false);
        return;
      }

      // Get analytics data
      await Promise.all([
        loadPingAnalytics(),
        loadTopCuisines(),
        loadRecentPings(),
      ]);

    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const loadPingAnalytics = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get all recent pings for analytics (since there's no truckOwnerId field)
      const pingsQuery = query(
        collection(db, 'pings'),
        orderBy('timestamp', 'desc'),
        limit(200)
      );
      
      const pingsSnapshot = await getDocs(pingsQuery);
      const allPings = pingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate totals
      const totalPings = allPings.length;
      
      // Today's pings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPings = allPings.filter(ping => {
        const pingDate = ping.timestamp?.toDate();
        return pingDate && pingDate >= today;
      }).length;

      // Weekly pings
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyPings = allPings.filter(ping => {
        const pingDate = ping.timestamp?.toDate();
        return pingDate && pingDate >= weekAgo;
      }).length;

      setAnalytics(prev => ({
        ...prev,
        totalPings,
        todayPings,
        weeklyPings,
      }));

    } catch (error) {
      console.error('Error loading ping analytics:', error);
    }
  };

  const loadTopCuisines = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get recent pings to analyze cuisine preferences
      const pingsQuery = query(
        collection(db, 'pings'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const pingsSnapshot = await getDocs(pingsQuery);
      const cuisineCount = {};

      pingsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const cuisine = data.cuisineType || data.cuisine;
        if (cuisine) {
          cuisineCount[cuisine] = (cuisineCount[cuisine] || 0) + 1;
        }
      });

      const topCuisines = Object.entries(cuisineCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([cuisine, count]) => ({ cuisine, count }));

      setAnalytics(prev => ({
        ...prev,
        topCuisines,
      }));

    } catch (error) {
      console.error('Error loading top cuisines:', error);
      setAnalytics(prev => ({
        ...prev,
        topCuisines: [],
      }));
    }
  };

  const loadRecentPings = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Since pings don't have truckOwnerId, let's get all recent pings in the area
      // In a real app, you'd implement location-based filtering
      const pingsQuery = query(
        collection(db, 'pings'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      const pingsSnapshot = await getDocs(pingsQuery);
      const allPings = pingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // For now, show all recent pings as potential customers
      // In production, you'd filter by location proximity
      setAnalytics(prev => ({
        ...prev,
        recentPings: allPings.slice(0, 10), // Show latest 10
      }));

    } catch (error) {
      console.error('Error loading recent pings:', error);
      // Set empty array on error to prevent UI issues
      setAnalytics(prev => ({
        ...prev,
        recentPings: [],
      }));
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate();
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c6f57" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (userPlan !== 'all-access') {
    return (
      <View style={styles.upgradeContainer}>
        <Ionicons name="analytics-outline" size={80} color="#2c6f57" />
        <Text style={styles.upgradeTitle}>Analytics Dashboard</Text>
        <Text style={styles.upgradeText}>
          Upgrade to All Access Plan to view detailed analytics including:
        </Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>• Customer ping analytics</Text>
          <Text style={styles.featureItem}>• Popular cuisine trends</Text>
          <Text style={styles.featureItem}>• Location performance data</Text>
          <Text style={styles.featureItem}>• Revenue insights</Text>
          <Text style={styles.featureItem}>• Customer feedback analysis</Text>
        </View>
        <TouchableOpacity style={styles.upgradeButton}>
          <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <Text style={styles.headerSubtitle}>Track your food truck performance</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="radio" size={24} color="#2c6f57" />
          <Text style={styles.statNumber}>{analytics.totalPings}</Text>
          <Text style={styles.statLabel}>Total Pings</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="today" size={24} color="#2c6f57" />
          <Text style={styles.statNumber}>{analytics.todayPings}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color="#2c6f57" />
          <Text style={styles.statNumber}>{analytics.weeklyPings}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>

      {/* Top Cuisines */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Cuisines</Text>
        {analytics.topCuisines.length > 0 ? (
          analytics.topCuisines.map((item, index) => (
            <View key={index} style={styles.cuisineItem}>
              <Text style={styles.cuisineName}>{item.cuisine}</Text>
              <View style={styles.cuisineBar}>
                <View 
                  style={[
                    styles.cuisineBarFill, 
                    { width: `${(item.count / analytics.topCuisines[0]?.count || 1) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.cuisineCount}>{item.count}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No cuisine data available</Text>
        )}
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Pings</Text>
        {analytics.recentPings.length > 0 ? (
          analytics.recentPings.map((ping) => (
            <View key={ping.id} style={styles.pingItem}>
              <View style={styles.pingHeader}>
                <Text style={styles.pingCuisine}>{ping.cuisine}</Text>
                <Text style={styles.pingDate}>{formatDate(ping.timestamp)}</Text>
              </View>
              <Text style={styles.pingLocation}>
                📍 {ping.location?.address || 'Location not available'}
              </Text>
              {ping.notes && (
                <Text style={styles.pingNotes}>"{ping.notes}"</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No recent pings</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  upgradeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginTop: 20,
    marginBottom: 10,
  },
  upgradeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: 30,
  },
  featureItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    paddingLeft: 10,
  },
  upgradeButton: {
    backgroundColor: '#2c6f57',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#2c6f57',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  cuisineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cuisineName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  cuisineBar: {
    flex: 2,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  cuisineBarFill: {
    height: '100%',
    backgroundColor: '#2c6f57',
    borderRadius: 4,
  },
  cuisineCount: {
    fontSize: 14,
    color: '#666',
    minWidth: 30,
    textAlign: 'right',
  },
  pingItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  pingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pingCuisine: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
  },
  pingDate: {
    fontSize: 12,
    color: '#666',
  },
  pingLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  pingNotes: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
