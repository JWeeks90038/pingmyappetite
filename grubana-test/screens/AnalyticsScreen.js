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
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
} from 'react-native-chart-kit';
import { 
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState(null);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueInput, setRevenueInput] = useState('');
  const [analytics, setAnalytics] = useState({
    totalPings: 0,
    todayPings: 0,
    weeklyPings: 0,
    monthlyPings: 0,
    averageRating: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    totalRatings: 0,
  });

  // Chart data - will be updated with real data
  const [chartData, setChartData] = useState({
    weeklyData: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: [0, 0, 0, 0, 0, 0, 0]
      }]
    },
    revenueData: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        data: [0, 0, 0, 0]
      }]
    },
    cuisineData: [],
    performanceData: {
      labels: ['Pings', 'Reviews', 'Orders'],
      data: [0, 0, 0]
    }
  });

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(44, 111, 87, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#2c6f57'
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e3e3e3',
      strokeWidth: 1
    },
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      console.log('AnalyticsScreen: Starting to load analytics...');
      setLoading(true);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log('AnalyticsScreen: No authenticated user found');
        setLoading(false);
        return;
      }

      // Get user plan and existing analytics data
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        console.log('AnalyticsScreen: User document does not exist');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const userPlan = userData?.plan || 'basic';
      console.log('AnalyticsScreen: User plan:', userPlan);
      setUserPlan(userPlan);

      // Check if user has analytics access
      if (userPlan !== 'all-access') {
        console.log('AnalyticsScreen: User does not have analytics access');
        setLoading(false);
        return;
      }

      // Load real analytics data
      await Promise.all([
        loadPingAnalytics(),
        loadCuisineData(),
        loadUserRevenueData(userData),
      ]);

      console.log('AnalyticsScreen: Analytics data loaded successfully');

    } catch (error) {
      console.error('AnalyticsScreen: Error loading analytics:', error);
      Alert.alert('Error', `Failed to load analytics data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPingAnalytics = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      console.log('Loading ping analytics for user:', currentUser.uid);

      // Get all pings from the database
      const pingsQuery = query(
        collection(db, 'pings'),
        orderBy('timestamp', 'desc'),
        limit(500)
      );
      
      const pingsSnapshot = await getDocs(pingsQuery);
      const allPings = pingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('Total pings found:', allPings.length);

      // Calculate time periods
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);

      // Filter pings by time periods
      const todayPings = allPings.filter(ping => {
        const pingDate = ping.timestamp?.toDate ? ping.timestamp.toDate() : new Date(ping.timestamp);
        return pingDate >= today;
      });

      const weeklyPings = allPings.filter(ping => {
        const pingDate = ping.timestamp?.toDate ? ping.timestamp.toDate() : new Date(ping.timestamp);
        return pingDate >= weekAgo;
      });

      const monthlyPings = allPings.filter(ping => {
        const pingDate = ping.timestamp?.toDate ? ping.timestamp.toDate() : new Date(ping.timestamp);
        return pingDate >= monthAgo;
      });

      // Generate weekly chart data
      const weekData = [];
      const weekLabels = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        weekLabels.push(date.toLocaleDateString('en', { weekday: 'short' }));
        
        const dayPings = allPings.filter(ping => {
          const pingDate = ping.timestamp?.toDate ? ping.timestamp.toDate() : new Date(ping.timestamp);
          const dayStart = new Date(date);
          const dayEnd = new Date(date);
          dayEnd.setDate(dayEnd.getDate() + 1);
          return pingDate >= dayStart && pingDate < dayEnd;
        });
        weekData.push(dayPings.length);
      }

      // Calculate average rating (if we have ratings in pings)
      const ratedPings = allPings.filter(ping => ping.rating && ping.rating > 0);
      const averageRating = ratedPings.length > 0 
        ? ratedPings.reduce((sum, ping) => sum + ping.rating, 0) / ratedPings.length 
        : 0;

      // Update analytics state
      setAnalytics(prev => ({
        ...prev,
        totalPings: allPings.length,
        todayPings: todayPings.length,
        weeklyPings: weeklyPings.length,
        monthlyPings: monthlyPings.length,
        averageRating: averageRating,
        totalRatings: ratedPings.length,
        conversionRate: ratedPings.length > 0 ? (ratedPings.length / allPings.length) * 100 : 0,
      }));

      // Update chart data
      setChartData(prev => ({
        ...prev,
        weeklyData: {
          labels: weekLabels,
          datasets: [{ data: weekData.length > 0 ? weekData : [0, 0, 0, 0, 0, 0, 0] }]
        },
        performanceData: {
          labels: ['Pings', 'Ratings', 'Activity'],
          data: [
            Math.min(allPings.length / 100, 1), // Normalize to 0-1
            Math.min(ratedPings.length / 50, 1),
            Math.min(weeklyPings.length / 50, 1)
          ]
        }
      }));

      console.log('Ping analytics loaded:', {
        total: allPings.length,
        today: todayPings.length,
        weekly: weeklyPings.length,
        avgRating: averageRating
      });

    } catch (error) {
      console.error('Error loading ping analytics:', error);
    }
  };

  const loadCuisineData = async () => {
    try {
      // Get recent pings to analyze cuisine preferences
      const pingsQuery = query(
        collection(db, 'pings'),
        orderBy('timestamp', 'desc'),
        limit(200)
      );
      
      const pingsSnapshot = await getDocs(pingsQuery);
      const pings = pingsSnapshot.docs.map(doc => doc.data());

      // Count cuisine occurrences
      const cuisineCount = {};
      pings.forEach(ping => {
        if (ping.cuisine) {
          cuisineCount[ping.cuisine] = (cuisineCount[ping.cuisine] || 0) + 1;
        }
      });

      // Convert to chart data format
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFA726', '#AB47BC'];
      const cuisineData = Object.entries(cuisineCount)
        .map(([cuisine, count], index) => ({
          name: cuisine,
          population: count,
          color: colors[index % colors.length],
          legendFontColor: '#333',
          legendFontSize: 12
        }))
        .sort((a, b) => b.population - a.population)
        .slice(0, 6); // Top 6 cuisines

      setChartData(prev => ({
        ...prev,
        cuisineData: cuisineData.length > 0 ? cuisineData : [
          { name: 'No Data', population: 1, color: '#E0E0E0', legendFontColor: '#666', legendFontSize: 12 }
        ]
      }));

      console.log('Cuisine data loaded:', cuisineData);

    } catch (error) {
      console.error('Error loading cuisine data:', error);
    }
  };

  const loadUserRevenueData = async (userData) => {
    try {
      // Load user-entered revenue data
      const totalRevenue = userData.totalRevenue || 0;
      const avgOrderValue = userData.avgOrderValue || 0;
      
      setAnalytics(prev => ({
        ...prev,
        totalRevenue: totalRevenue,
        avgOrderValue: avgOrderValue,
      }));

      console.log('Revenue data loaded:', { totalRevenue, avgOrderValue });

    } catch (error) {
      console.error('Error loading revenue data:', error);
    }
  };

  const updateRevenue = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !revenueInput.trim()) return;

      const revenue = parseFloat(revenueInput);
      if (isNaN(revenue) || revenue < 0) {
        Alert.alert('Invalid Input', 'Please enter a valid revenue amount');
        return;
      }

      // Update user document
      await updateDoc(doc(db, 'users', currentUser.uid), {
        totalRevenue: revenue,
        lastRevenueUpdate: new Date()
      });

      // Update local state
      setAnalytics(prev => ({
        ...prev,
        totalRevenue: revenue,
        avgOrderValue: prev.totalPings > 0 ? revenue / prev.totalPings : 0
      }));

      setShowRevenueModal(false);
      setRevenueInput('');
      Alert.alert('Success', 'Revenue data updated successfully!');

    } catch (error) {
      console.error('Error updating revenue:', error);
      Alert.alert('Error', 'Failed to update revenue data');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c6f57" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!userPlan || userPlan === 'basic') {
    return (
      <View style={styles.upgradeContainer}>
        <Ionicons name="analytics" size={80} color="#2c6f57" />
        <Text style={styles.upgradeTitle}>Analytics Dashboard</Text>
        <Text style={styles.upgradeText}>
          Upgrade to All-Access plan to unlock detailed analytics including:
        </Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>📊 Interactive charts and graphs</Text>
          <Text style={styles.featureItem}>📈 Revenue and order tracking</Text>
          <Text style={styles.featureItem}>📋 Customer behavior insights</Text>
          <Text style={styles.featureItem}>📍 Location performance metrics</Text>
          <Text style={styles.featureItem}>⭐ Rating and review analytics</Text>
        </View>
        <TouchableOpacity style={styles.upgradeButton}>
          <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>Track your business performance</Text>
        </View>

        {/* Key Metrics Cards */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Ionicons name="radio" size={24} color="#2c6f57" />
            <Text style={styles.metricValue}>{analytics.totalPings}</Text>
            <Text style={styles.metricLabel}>Total Pings</Text>
            <Text style={styles.metricSubtext}>All time requests</Text>
          </View>
          <TouchableOpacity 
            style={styles.metricCard} 
            onPress={() => setShowRevenueModal(true)}
          >
            <Ionicons name="cash" size={24} color="#2c6f57" />
            <Text style={styles.metricValue}>
              ${analytics.totalRevenue.toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={styles.metricSubtext}>Tap to update</Text>
          </TouchableOpacity>
          <View style={styles.metricCard}>
            <Ionicons name="star" size={24} color="#2c6f57" />
            <Text style={styles.metricValue}>
              {analytics.averageRating > 0 ? analytics.averageRating.toFixed(1) : 'N/A'}
            </Text>
            <Text style={styles.metricLabel}>Avg Rating</Text>
            <Text style={styles.metricSubtext}>
              {analytics.totalRatings} rating{analytics.totalRatings !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="trending-up" size={24} color="#2c6f57" />
            <Text style={styles.metricValue}>
              {analytics.conversionRate > 0 ? analytics.conversionRate.toFixed(1) + '%' : 'N/A'}
            </Text>
            <Text style={styles.metricLabel}>Rating Rate</Text>
            <Text style={styles.metricSubtext}>Pings with ratings</Text>
          </View>
        </View>

        {/* Weekly Pings Line Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Weekly Ping Activity</Text>
          <LineChart
            data={chartData.weeklyData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Monthly Revenue Bar Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Monthly Revenue Trends</Text>
          <BarChart
            data={chartData.revenueData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            yAxisLabel="$"
            yAxisSuffix=""
            showValuesOnTopOfBars={true}
          />
        </View>

        {/* Cuisine Preferences Pie Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Popular Cuisine Types</Text>
          <PieChart
            data={chartData.cuisineData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </View>

        {/* Performance Metrics Progress Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Performance Metrics</Text>
          <ProgressChart
            data={chartData.performanceData}
            width={width - 40}
            height={220}
            strokeWidth={16}
            radius={32}
            chartConfig={chartConfig}
            hideLegend={false}
            style={styles.chart}
          />
          <View style={styles.performanceLabels}>
            <Text style={styles.performanceLabel}>Orders: {(chartData.performanceData.data[0] * 100).toFixed(0)}%</Text>
            <Text style={styles.performanceLabel}>Reviews: {(chartData.performanceData.data[1] * 100).toFixed(0)}%</Text>
            <Text style={styles.performanceLabel}>Ratings: {(chartData.performanceData.data[2] * 100).toFixed(0)}%</Text>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.quickStatsContainer}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{analytics.todayPings}</Text>
            <Text style={styles.quickStatLabel}>Today's Pings</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{analytics.weeklyPings}</Text>
            <Text style={styles.quickStatLabel}>This Week</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>${analytics.avgOrderValue}</Text>
            <Text style={styles.quickStatLabel}>Avg Order</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{analytics.monthlyPings}</Text>
            <Text style={styles.quickStatLabel}>This Month</Text>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Revenue Input Modal */}
      <Modal
        visible={showRevenueModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRevenueModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Update Revenue</Text>
            <TouchableOpacity onPress={updateRevenue}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Enter your total revenue to track financial performance. This data is stored securely and only visible to you.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Total Revenue ($)</Text>
              <TextInput
                style={styles.textInput}
                value={revenueInput}
                onChangeText={setRevenueInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <View style={styles.revenueInfo}>
              <Text style={styles.infoTitle}>Revenue Tracking</Text>
              <Text style={styles.infoText}>• This helps calculate average order value</Text>
              <Text style={styles.infoText}>• Data is private and secure</Text>
              <Text style={styles.infoText}>• Update regularly for accurate analytics</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2c6f57',
    padding: 20,
    paddingTop: 60,
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
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 15,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  metricSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  chartSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  performanceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    paddingTop: 0,
    gap: 15,
  },
  quickStatItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    minWidth: 80,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6f57',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  saveText: {
    fontSize: 16,
    color: '#2c6f57',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    backgroundColor: '#f8f9fa',
  },
  revenueInfo: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});
