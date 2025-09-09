import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import NotificationService from '../services/notificationService';
import OrderProgressTracker from '../components/OrderProgressTracker';

const CustomerOrdersScreen = () => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!userData?.uid) return;

    console.log('📱 Setting up customer orders listener for user:', userData.uid);
    
    // Clear badge count when viewing orders screen - role-specific clearing
    NotificationService.clearBadgeForUserRole('customer', 'Orders');

    // Create query for orders placed by this customer (without orderBy to avoid index requirement)
    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerId', '==', userData.uid)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(ordersQuery, 
      (snapshot) => {
        console.log('📱 Customer orders updated, got', snapshot.docs.length, 'orders');
        
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }))
        // Filter out pending_payment orders (payment processing)
        .filter(order => order.status !== 'pending_payment');

        // Sort orders with smart prioritization:
        // 1. Active orders (pending, confirmed, preparing, ready) first
        // 2. Within each group, newest first
        // 3. Completed/cancelled orders last
        ordersData.sort((a, b) => {
          const getOrderPriority = (status) => {
            switch (status) {
              case 'ready': return 1; // Highest priority - ready for pickup
              case 'preparing': return 2; // Second - currently cooking
              case 'confirmed': return 3; // Third - confirmed, will cook soon
              case 'pending': return 4; // Fourth - waiting for confirmation
              case 'completed': return 5; // Lower priority
              case 'cancelled': return 6; // Lowest priority
              default: return 7;
            }
          };

          const aPriority = getOrderPriority(a.status);
          const bPriority = getOrderPriority(b.status);

          // If priorities are different, sort by priority
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }

          // If same priority, sort by newest first
          return b.createdAt - a.createdAt;
        });

        setOrders(ordersData);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('❌ Error fetching customer orders:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [userData?.uid]);

  const handleRefresh = () => {
    setRefreshing(true);
    // The real-time listener will automatically update the data
  };

  const getStatusColor = (status) => {
    const color = (() => {
      switch (status) {
        case 'pending': return '#FF4EC9'; // Neon pink for pending
        case 'confirmed': return '#00E676'; // Success green for confirmed
        case 'preparing': return '#4DBFFF'; // Neon blue for preparing
        case 'ready': return '#FF4EC9'; // Neon pink for ready
        case 'completed': return '#00E676'; // Success green for completed
        case 'cancelled': return '#F44336'; // Keep red for cancelled
        default: return '#757575';
      }
    })();
    console.log(`Status: ${status}, Color: ${color}`);
    return color;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'preparing': return 'restaurant-outline';
      case 'ready': return 'notifications-outline';
      case 'completed': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-outline';
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending': return 'Order placed, waiting for confirmation';
      case 'confirmed': return 'Order confirmed by restaurant';
      case 'preparing': return 'Your food is being prepared';
      case 'ready': return 'Order ready for pickup!';
      case 'completed': return 'Order completed';
      case 'cancelled': return 'Order was cancelled';
      default: return 'Order status unknown';
    }
  };

  const formatOrderItems = (items) => {
    if (!items || items.length === 0) return 'No items';
    
    return items.map(item => `${item.quantity}x ${item.name}`).join(', ');
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? `$${price.toFixed(2)}` : '$0.00';
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{item.id.substring(0, 8)}</Text>
        <View style={[
          styles.statusBadge, 
          { 
            backgroundColor: getStatusColor(item.status),
            // Force override any potential white background
            borderWidth: 0
          }
        ]}>
          <Ionicons name={getStatusIcon(item.status)} size={16} color="white" />
          <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.truckName}>
          🚚 {item.truckName || 'Unknown Restaurant'}
        </Text>
        <Text style={styles.orderTime}>
          📅 {item.createdAt.toLocaleTimeString()} • {item.createdAt.toLocaleDateString()}
        </Text>
        <Text style={styles.orderItems}>
          🍽️ {formatOrderItems(item.items)}
        </Text>
        <Text style={styles.orderTotal}>
          💰 Total: {formatPrice(item.totalAmount)}
        </Text>

        {item.estimatedPrepTime && item.status !== 'completed' && item.status !== 'cancelled' && (
          <Text style={styles.estimatedTime}>
            ⏱️ Estimated time: {item.estimatedPrepTime} minutes
          </Text>
        )}
      </View>

      {/* Order Progress Tracker */}
      <OrderProgressTracker 
        currentStatus={item.status}
        estimatedTime={item.estimatedPrepTime}
        orderTime={item.createdAt}
        timeOverriddenAt={item.timeOverriddenAt}
        confirmedAt={item.confirmedAt}
        preparingAt={item.preparingAt}
      />

      {item.status === 'ready' && (
        <View style={styles.readyAlert}>
          <Ionicons name="notifications" size={24} color="#00E676" />
          <Text style={styles.readyText}>🎉 Your order is ready for pickup!</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#FFFFFF' }}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity
          onPress={async () => {
            // Test both notification and badge functionality
            await NotificationService.testNotification('customer');
            await NotificationService.testBadgeCount();
          }}
          style={styles.testButton}
        >
          <Ionicons name="notifications-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>Your orders will appear here after you place them</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B1A', // Dark navy background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1A1036', // Deep purple background
    borderBottomWidth: 1,
    borderBottomColor: '#FF4EC9', // Neon pink border
    position: 'relative',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
  },
  testButton: {
    padding: 8,
    position: 'absolute',
    right: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0B1A',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#0B0B1A',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#4DBFFF', // Neon blue for subtext
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#1A1036', // Deep purple card background
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#FF4EC9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#FF4EC9', // Neon pink border
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  orderDetails: {
    marginBottom: 16,
  },
  truckName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginBottom: 8,
  },
  orderTime: {
    fontSize: 14,
    color: '#4DBFFF', // Neon blue for secondary info
    marginBottom: 8,
  },
  orderItems: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    marginBottom: 8,
    lineHeight: 20,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00E676', // Success green
    marginBottom: 8,
  },
  estimatedTime: {
    fontSize: 14,
    color: '#FF4EC9', // Neon pink for estimated time
    fontWeight: '500',
    backgroundColor: 'rgba(255, 78, 201, 0.1)', // Semi-transparent pink background
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FF4EC9',
  },
  readyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.1)', // Semi-transparent green background
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#00E676', // Success green border
  },
  readyText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00E676', // Success green text
    flex: 1,
  },
});

export default CustomerOrdersScreen;
