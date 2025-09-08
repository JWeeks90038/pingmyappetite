import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Vibration,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import NotificationService from '../services/notificationService';

const OrderManagementScreen = () => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [customerProfiles, setCustomerProfiles] = useState({});
  const [customerListeners, setCustomerListeners] = useState({});
  const customerListenersRef = useRef({});

  useEffect(() => {
    if (!userData?.uid) return;

    console.log('📱 Setting up orders listener for truck:', userData.uid);
    console.log('📱 Owner userData details:', {
      uid: userData.uid,
      role: userData.role,
      truckName: userData.truckName,
      plan: userData.plan
    });
    
    // Clear badge count when viewing orders screen
    NotificationService.clearBadgeCount();

    // Create query for orders belonging to this truck
    // TEMPORARY: For testing, show all orders instead of just this truck's orders
    let ordersQuery;
    if (userData.uid === 'Sy3rlEFPLfbWZzY9oO9oECcoXK62') {
      console.log('🧪 TESTING: Showing all orders for test user');
      ordersQuery = query(collection(db, 'orders'));
    } else {
      // Normal behavior: only show orders for this truck
      ordersQuery = query(
        collection(db, 'orders'),
        where('truckId', '==', userData.uid)
      );
    }

    console.log('📱 Query setup - looking for orders where truckId ==', userData.uid);

    // Set up real-time listener
    const unsubscribe = onSnapshot(ordersQuery, 
      async (snapshot) => {
        console.log('📱 Orders query result - received', snapshot.docs.length, 'orders');
        
        if (snapshot.docs.length > 0) {
          console.log('📱 Sample order data:', snapshot.docs[0].data());
        } else {
          console.log('📱 No orders found for truckId:', userData.uid);
          console.log('📱 This could mean:');
          console.log('   - No orders have been placed to this truck yet');
          console.log('   - Orders exist with different truckId values');
          console.log('   - Firestore index still building');
        }
        
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));

        // Client-side sorting by createdAt (newest first) since we removed orderBy from query
        ordersData.sort((a, b) => b.createdAt - a.createdAt);

        // Set up customer profile listeners for orders
        ordersData.forEach(order => {
          if (order.userId) {
            console.log(`📱 Setting up profile listener for userId: ${order.userId}`);
            fetchCustomerProfile(order.userId);
          }
        });

        // Check for new orders and vibrate/alert
        const newOrders = ordersData.filter(order => 
          order.status === 'pending' && 
          !orders.find(existingOrder => existingOrder.id === order.id)
        );

        if (newOrders.length > 0 && orders.length > 0) {
          // New order received - vibrate and show alert
          Vibration.vibrate([0, 200, 100, 200]);
          console.log('🚚 NEW ORDER ALERT:', newOrders[0].id);
        }

        setOrders(ordersData);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('❌ Error fetching orders:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => {
      unsubscribe();
      // Clean up all customer profile listeners using ref
      Object.values(customerListenersRef.current).forEach(unsubscribeCustomer => {
        if (typeof unsubscribeCustomer === 'function') {
          unsubscribeCustomer();
        }
      });
      customerListenersRef.current = {};
    };
  }, [userData?.uid]);

  const fetchCustomerProfile = async (userId) => {
    console.log(`📱 fetchCustomerProfile called for userId: ${userId}`);
    // If we already have a listener for this customer, don't create another one
    if (customerListenersRef.current[userId]) {
      console.log(`📱 Listener already exists for userId: ${userId}`);
      return;
    }
    
    try {
      // Set up real-time listener for customer profile
      const userDocRef = doc(db, 'users', userId);
      console.log(`📱 Setting up Firestore listener for user document: users/${userId}`);
      
      const unsubscribe = onSnapshot(userDocRef, (userDoc) => {
        console.log(`📱 Firestore listener triggered for ${userId}. Document exists: ${userDoc.exists()}`);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log(`📱 Raw user data for ${userId}:`, userData);
          console.log(`📱 Available fields:`, Object.keys(userData));
          console.log(`📱 Username field (lowercase):`, userData.username);
          console.log(`📱 DisplayName field:`, userData.displayName);
          console.log(`📱 ProfileUrl field:`, userData.profileUrl);
          
          const profileData = {
            userName: userData.username || userData.displayName || 'Customer',
            profileUrl: userData.profileUrl || null
          };
          
          console.log(`📱 Customer profile updated for ${userId}:`, profileData);
          
          setCustomerProfiles(prev => {
            const updated = {
              ...prev,
              [userId]: profileData
            };
            console.log(`📱 Updated customerProfiles state:`, updated);
            return updated;
          });
        } else {
          console.log(`📱 User document does not exist for ${userId}`);
          // User document doesn't exist, set default
          setCustomerProfiles(prev => ({
            ...prev,
            [userId]: { userName: 'Customer', profileUrl: null }
          }));
        }
      }, (error) => {
        console.error(`📱 Error in Firestore listener for ${userId}:`, error);
        console.error(`📱 Error code:`, error.code);
        console.error(`📱 Error message:`, error.message);
        // Set fallback data on error
        setCustomerProfiles(prev => ({
          ...prev,
          [userId]: { userName: 'Customer', profileUrl: null }
        }));
      });

      console.log(`📱 Firestore listener successfully created for ${userId}`);

      // Store the unsubscribe function in ref
      customerListenersRef.current[userId] = unsubscribe;
      
      // Also update state for cleanup in handleRefresh
      setCustomerListeners(prev => ({
        ...prev,
        [userId]: unsubscribe
      }));

    } catch (error) {
      console.log('Error setting up customer profile listener:', error);
      // Set fallback data
      setCustomerProfiles(prev => ({
        ...prev,
        [userId]: { userName: 'Customer', profileUrl: null }
      }));
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Clear customer profiles and listeners to force refetch
    Object.values(customerListenersRef.current).forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    customerListenersRef.current = {};
    setCustomerListeners({});
    setCustomerProfiles({});
    
    // Refresh will complete when orders listener fires again
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const updateOrderStatus = async (orderId, newStatus, showConfirmation = true) => {
    if (showConfirmation) {
      const statusMessages = {
        confirmed: 'Confirm this order? Customer will be notified.',
        preparing: 'Start cooking this order? Customer will be notified.',
        ready: 'Mark order as ready for pickup? Customer will be notified.',
        completed: 'Mark order as completed?',
        cancelled: 'Cancel this order? Customer will be notified and refunded.'
      };

      Alert.alert(
        'Update Order Status',
        statusMessages[newStatus] || 'Update order status?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Confirm', 
            style: newStatus === 'cancelled' ? 'destructive' : 'default',
            onPress: () => updateOrderStatus(orderId, newStatus, false)
          }
        ]
      );
      return;
    }

    try {
      setUpdatingOrder(orderId);
      const orderRef = doc(db, 'orders', orderId);
      
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };

      // Add status-specific timestamps
      if (newStatus === 'confirmed') {
        updateData.confirmedAt = serverTimestamp();
      } else if (newStatus === 'preparing') {
        updateData.preparingAt = serverTimestamp();
      } else if (newStatus === 'ready') {
        updateData.readyAt = serverTimestamp();
      } else if (newStatus === 'completed') {
        updateData.completedAt = serverTimestamp();
      } else if (newStatus === 'cancelled') {
        updateData.cancelledAt = serverTimestamp();
      }

      await updateDoc(orderRef, updateData);

      console.log(`✅ Order ${orderId} status updated to ${newStatus}`);
      
      // Close modal
      setModalVisible(false);
      setSelectedOrder(null);

      // Show success message with haptic feedback
      Vibration.vibrate(100);
      
      const successMessages = {
        confirmed: 'Order confirmed! Customer notified.',
        preparing: 'Started cooking! Customer notified.',
        ready: 'Order marked as ready! Customer notified.',
        completed: 'Order completed!',
        cancelled: 'Order cancelled. Customer notified.'
      };

      Alert.alert('Success', successMessages[newStatus] || 'Order updated successfully');

    } catch (error) {
      console.error('❌ Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status. Please try again.');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'confirmed': return '#4CAF50';
      case 'preparing': return '#2196F3';
      case 'ready': return '#9C27B0';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'preparing': return 'flame-outline';
      case 'ready': return 'notifications-outline';
      case 'completed': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-outline';
    }
  };

  const getNextAction = (status) => {
    switch (status) {
      case 'pending': return { action: 'confirmed', label: 'Accept Order', icon: 'checkmark', color: '#4CAF50' };
      case 'confirmed': return { action: 'preparing', label: 'Start Cooking', icon: 'flame', color: '#2196F3' };
      case 'preparing': return { action: 'ready', label: 'Order Ready!', icon: 'notifications', color: '#9C27B0' };
      case 'ready': return { action: 'completed', label: 'Complete Order', icon: 'checkmark-done', color: '#4CAF50' };
      default: return null;
    }
  };

  const formatOrderItems = (items) => {
    if (!items || items.length === 0) return 'No items';
    
    return items.map(item => `${item.quantity}x ${item.name}`).join(', ');
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? `$${price.toFixed(2)}` : '$0.00';
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const renderQuickActions = (item) => {
    const nextAction = getNextAction(item.status);
    const isUpdating = updatingOrder === item.id;

    return (
      <View style={styles.quickActionsContainer}>
        {/* Main Action Button */}
        {nextAction && (
          <TouchableOpacity
            style={[styles.mainActionButton, { backgroundColor: nextAction.color }]}
            onPress={() => updateOrderStatus(item.id, nextAction.action)}
            disabled={isUpdating}
          >
            <Ionicons name={nextAction.icon} size={20} color="white" />
            <Text style={styles.mainActionText}>
              {isUpdating ? 'Updating...' : nextAction.label}
            </Text>
          </TouchableOpacity>
        )}

        {/* Secondary Actions */}
        <View style={styles.secondaryActions}>
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.secondaryActionButton, styles.rejectButton]}
              onPress={() => updateOrderStatus(item.id, 'cancelled')}
              disabled={isUpdating}
            >
              <Ionicons name="close" size={16} color="white" />
              <Text style={styles.secondaryActionText}>Reject</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.secondaryActionButton, styles.detailsButton]}
            onPress={() => {
              setSelectedOrder(item);
              setModalVisible(true);
            }}
            disabled={isUpdating}
          >
            <Ionicons name="information-circle-outline" size={16} color="#2196F3" />
            <Text style={[styles.secondaryActionText, { color: '#2196F3' }]}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>#{item.id.substring(0, 8)}</Text>
          <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status)} size={16} color="white" />
          <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.customerInfo}>
          {(() => {
            console.log(`📱 Rendering order for userId: ${item.userId}`);
            console.log(`📱 Customer profile data:`, customerProfiles[item.userId]);
            console.log(`📱 Order item data:`, { userName: item.userName, customerName: item.customerName });
            console.log(`📱 All customerProfiles:`, customerProfiles);
            console.log(`📱 Profile URL check:`, customerProfiles[item.userId]?.profileUrl);
            console.log(`📱 Profile URL type:`, typeof customerProfiles[item.userId]?.profileUrl);
            return null;
          })()}
          {customerProfiles[item.userId]?.profileUrl ? (
            <Image 
              source={{ uri: customerProfiles[item.userId].profileUrl }} 
              style={styles.customerAvatar}
              onError={(error) => {
                console.log(`📱 Image load error for ${item.userId}:`, error);
              }}
              onLoad={() => {
                console.log(`📱 Image loaded successfully for ${item.userId}`);
              }}
            />
          ) : (
            <View style={styles.customerAvatarPlaceholder}>
              <Text style={styles.customerAvatarText}>
                {(customerProfiles[item.userId]?.userName || item.userName || item.customerName || 'Customer')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.customerName}>
            {customerProfiles[item.userId]?.userName || item.userName || item.customerName || 'Customer'}
          </Text>
        </View>
        <Text style={styles.orderItems} numberOfLines={2}>
          🍽️ {formatOrderItems(item.items)}
        </Text>
        <Text style={styles.orderTotal}>
          💰 Total: {formatPrice(item.totalAmount)}
        </Text>
        
        {item.specialInstructions && (
          <Text style={styles.specialInstructions} numberOfLines={2}>
            📝 {item.specialInstructions}
          </Text>
        )}
      </View>

      {/* Order Progress Indicator */}
      {item.status !== 'cancelled' && item.status !== 'completed' && (
        <View style={styles.progressIndicator}>
          <View style={styles.progressSteps}>
            <View style={[
              styles.progressStep,
              { backgroundColor: ['pending', 'confirmed', 'preparing', 'ready', 'completed'].includes(item.status) ? '#4CAF50' : '#E0E0E0' }
            ]}>
              <Text style={styles.progressStepText}>📥</Text>
            </View>
            <View style={[styles.progressLine, { backgroundColor: ['confirmed', 'preparing', 'ready', 'completed'].includes(item.status) ? '#4CAF50' : '#E0E0E0' }]} />
            <View style={[
              styles.progressStep,
              { backgroundColor: ['confirmed', 'preparing', 'ready', 'completed'].includes(item.status) ? '#4CAF50' : '#E0E0E0' }
            ]}>
              <Text style={styles.progressStepText}>👨‍🍳</Text>
            </View>
            <View style={[styles.progressLine, { backgroundColor: ['preparing', 'ready', 'completed'].includes(item.status) ? '#4CAF50' : '#E0E0E0' }]} />
            <View style={[
              styles.progressStep,
              { backgroundColor: ['ready', 'completed'].includes(item.status) ? '#4CAF50' : '#E0E0E0' }
            ]}>
              <Text style={styles.progressStepText}>🔔</Text>
            </View>
          </View>
        </View>
      )}

      {renderQuickActions(item)}
    </View>
  );

  const OrderDetailModal = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order #{selectedOrder.id.substring(0, 8)}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                  <Ionicons name={getStatusIcon(selectedOrder.status)} size={16} color="white" />
                  <Text style={styles.statusText}>{selectedOrder.status?.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Customer</Text>
                <Text style={styles.detailValue}>{selectedOrder.userName || selectedOrder.customerName || 'Unknown'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Order Time</Text>
                <Text style={styles.detailValue}>
                  {selectedOrder.createdAt.toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Items</Text>
                {selectedOrder.items?.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>{formatPrice(selectedOrder.totalAmount)}</Text>
              </View>

              {selectedOrder.specialInstructions && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Special Instructions</Text>
                  <Text style={styles.detailValue}>{selectedOrder.specialInstructions}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              {selectedOrder.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                  >
                    <Text style={styles.actionButtonText}>Confirm Order</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                  >
                    <Text style={styles.actionButtonText}>Reject Order</Text>
                  </TouchableOpacity>
                </>
              )}
              
              {selectedOrder.status === 'confirmed' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.preparingButton]}
                  onPress={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                >
                  <Text style={styles.actionButtonText}>Start Preparing</Text>
                </TouchableOpacity>
              )}
              
              {selectedOrder.status === 'preparing' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.readyButton]}
                  onPress={() => updateOrderStatus(selectedOrder.id, 'ready')}
                >
                  <Text style={styles.actionButtonText}>Mark as Ready</Text>
                </TouchableOpacity>
              )}
              
              {selectedOrder.status === 'ready' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => updateOrderStatus(selectedOrder.id, 'completed')}
                >
                  <Text style={styles.actionButtonText}>Mark as Completed</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Management</Text>
        <TouchableOpacity
          onPress={() => NotificationService.testNotification('truck_owner')}
          style={styles.testButton}
        >
          <Ionicons name="notifications-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>Orders will appear here when customers place them</Text>
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

      <OrderDetailModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  testButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderIdContainer: {
    flex: 1,
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
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
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  customerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  customerAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  orderItems: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  specialInstructions: {
    fontSize: 13,
    color: '#FF9800',
    fontStyle: 'italic',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  progressIndicator: {
    marginBottom: 16,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  progressStepText: {
    fontSize: 14,
  },
  progressLine: {
    height: 3,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  quickActionsContainer: {
    gap: 12,
  },
  mainActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainActionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  detailsButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  secondaryActionText: {
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    maxHeight: 400,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 40,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  modalActions: {
    marginTop: 24,
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  preparingButton: {
    backgroundColor: '#2196F3',
  },
  readyButton: {
    backgroundColor: '#9C27B0',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default OrderManagementScreen;
