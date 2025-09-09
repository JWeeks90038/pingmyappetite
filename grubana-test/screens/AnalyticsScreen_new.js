import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Animated,
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
  getDoc 
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalPings: 342,
    todayPings: 23,
    weeklyPings: 125,
    monthlyPings: 487,
    averageRating: 4.6,
    totalRevenue: 6750.00,
    avgOrderValue: 28.50,
    conversionRate: 68.5,
  });

  // Toast notification state
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Toast notification function
  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
    
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  // Chart data
  const [chartData] = useState({
    weeklyData: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: [20, 45, 28, 80, 99, 43, 65]
      }]
    },
    revenueData: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        data: [1200, 1800, 1500, 2100]
      }]
    },
    cuisineData: [
      { name: 'Mexican', population: 35, color: '#FF6B6B', legendFontColor: '#333', legendFontSize: 12 },
      { name: 'Italian', population: 25, color: '#4ECDC4', legendFontColor: '#333', legendFontSize: 12 },
      { name: 'Asian', population: 20, color: '#45B7D1', legendFontColor: '#333', legendFontSize: 12 },
      { name: 'American', population: 20, color: '#96CEB4', legendFontColor: '#333', legendFontSize: 12 },
    ],
    performanceData: {
      labels: ['Orders', 'Reviews', 'Ratings'],
      data: [0.8, 0.6, 0.9]
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

      setLoading(true);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {

        setLoading(false);
        return;
      }

      // Get user plan
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
  
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const userPlan = userData?.plan || 'basic';

      setUserPlan(userPlan);

   

    } catch (error) {
     
      showToast(`Failed to load analytics data: ${error.message}`);
    } finally {
      setLoading(false);
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
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="cash" size={24} color="#2c6f57" />
            <Text style={styles.metricValue}>${analytics.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="star" size={24} color="#2c6f57" />
            <Text style={styles.metricValue}>{analytics.averageRating.toFixed(1)}</Text>
            <Text style={styles.metricLabel}>Avg Rating</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="trending-up" size={24} color="#2c6f57" />
            <Text style={styles.metricValue}>{analytics.conversionRate.toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>Conversion</Text>
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

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toast, 
            { opacity: toastOpacity }
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
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
  // Toast styles
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 1000,
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
