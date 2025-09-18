import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  ScrollView,
  Vibration,
  Image,
  Animated
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
import { getSuggestedTimeOptions, getTimeDescription, calculateEstimatedTime } from '../utils/estimatedTimeCalculator';

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
  
  // Time override modal states
  const [timeOverrideModalVisible, setTimeOverrideModalVisible] = useState(false);
  const [selectedOrderForTimeOverride, setSelectedOrderForTimeOverride] = useState(null);
  const [selectedTimeOption, setSelectedTimeOption] = useState(null);

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Confirmation modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalButtons, setConfirmModalButtons] = useState([]);

  // Toast functions
  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
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

  // Confirmation modal functions
  const showConfirmModal = (title, message, buttons = [{ text: 'OK', onPress: () => setConfirmModalVisible(false) }]) => {
    setConfirmModalTitle(title);
    setConfirmModalMessage(message);
    setConfirmModalButtons(buttons);
    setConfirmModalVisible(true);
  };

  useEffect(() => {
    if (!userData?.uid) return;

    // Clear badge count when viewing orders screen - role-specific clearing
    NotificationService.clearBadgeForUserRole('owner', 'OrderManagement');

    // Create query for orders belonging to this truck
    // TEMPORARY: For testing, show all orders instead of just this truck's orders
    let ordersQuery;
    if (userData.uid === 'Sy3rlEFPLfbWZzY9oO9oECcoXK62') {
      ordersQuery = query(collection(db, 'orders'));
    } else {
      // Normal behavior: only show orders for this truck
      ordersQuery = query(
        collection(db, 'orders'),
        where('truckId', '==', userData.uid)
      );
    }

    // Set up real-time listener
    const unsubscribe = onSnapshot(ordersQuery, 
      async (snapshot) => {
        if (snapshot.docs.length > 0) {
        } else {
        }
        
        const ordersData = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Smart timestamp extraction - try multiple fields in order of preference
          let createdAt = null;
          
          // Try createdAt field first
          if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt?.seconds) {
            createdAt = new Date(data.createdAt.seconds * 1000);
          } else if (data.createdAt instanceof Date) {
            createdAt = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            createdAt = new Date(data.createdAt);
          }
          // Try timestamp field as fallback
          else if (data.timestamp?.toDate) {
            createdAt = data.timestamp.toDate();
          } else if (data.timestamp?.seconds) {
            createdAt = new Date(data.timestamp.seconds * 1000);
          } else if (data.timestamp instanceof Date) {
            createdAt = data.timestamp;
          } else if (typeof data.timestamp === 'string') {
            createdAt = new Date(data.timestamp);
          }
          // Try orderDate as last resort
          else if (data.orderDate) {
            createdAt = new Date(data.orderDate);
          }
          // If all else fails, use a very old date instead of current time
          else {
            createdAt = new Date('2024-01-01'); // Default to old date so we know it's problematic
          }
          
          return {
            id: doc.id,
            ...data,
            createdAt: createdAt
          };
        })
        .filter(order => {
          const now = Date.now();
          const orderAge = now - order.createdAt.getTime();
          const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
          
          // Auto-remove old cancelled and pending_payment orders after 5 minutes
          if ((order.status === 'cancelled' || order.status === 'pending_payment') && orderAge > fiveMinutes) {
            return false;
          }
          
          return true;
        });

        // Kitchen-optimized sorting: Priority by action urgency, then by time
        ordersData.sort((a, b) => {
          const getOrderPriority = (status) => {
            switch (status) {
              case 'confirmed': return 1;    // TOP PRIORITY - Ready to start cooking
              case 'preparing': return 2;    // Second - Currently cooking
              case 'pending': return 3;      // Third - Needs confirmation  
              case 'ready': return 4;        // Fourth - Waiting for pickup
              case 'pending_payment': return 5; // Fifth - Payment processing
              case 'completed': return 6;    // Sixth - Done
              case 'cancelled': return 7;    // Bottom - Cancelled
              default: return 8;
            }
          };

          const aPriority = getOrderPriority(a.status);
          const bPriority = getOrderPriority(b.status);

          // If different priorities, sort by priority
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }

          // Within same priority, show newest first so new orders appear at top immediately
          return b.createdAt - a.createdAt;
        });
        
        // Set up customer profile listeners for orders (only for new userIds)
        ordersData.forEach(order => {
          if (order.userId && !customerListenersRef.current[order.userId]) {
            fetchCustomerProfile(order.userId);
          }
        });

        // Check for new orders and vibrate/alert
        // Only alert for orders that have been fully paid for
        const newOrders = ordersData.filter(order => 
          order.status === 'pending' && 
          order.paymentStatus === 'paid' && // Only paid orders
          !orders.find(existingOrder => existingOrder.id === order.id)
        );

        if (newOrders.length > 0 && orders.length > 0) {
          // New order received - vibrate and show alert
          Vibration.vibrate([0, 200, 100, 200]);
        }

        setOrders(ordersData);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
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
    // If we already have a listener for this customer, don't create another one
    if (customerListenersRef.current[userId]) {
      return;
    }
    
    try {
      // Set up real-time listener for customer profile
      const userDocRef = doc(db, 'users', userId);
      
      const unsubscribe = onSnapshot(userDocRef, (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          const profileData = {
            userName: userData.username || userData.displayName || 'Customer',
            profileUrl: userData.profileUrl || null
          };
          
          setCustomerProfiles(prev => {
            const updated = {
              ...prev,
              [userId]: profileData
            };
            return updated;
          });
        } else {
          // User document doesn't exist, set default
          setCustomerProfiles(prev => ({
            ...prev,
            [userId]: { userName: 'Customer', profileUrl: null }
          }));
        }
      }, (error) => {
        // Set fallback data on error
        setCustomerProfiles(prev => ({
          ...prev,
          [userId]: { userName: 'Customer', profileUrl: null }
        }));
      });

      // Store the unsubscribe function in ref
      customerListenersRef.current[userId] = unsubscribe;
      
      // Also update state for cleanup in handleRefresh
      setCustomerListeners(prev => ({
        ...prev,
        [userId]: unsubscribe
      }));

    } catch (error) {
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

      showConfirmModal(
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

      showToast(successMessages[newStatus] || 'Order updated successfully', 'success');

    } catch (error) {
      showToast('Failed to update order status. Please try again.');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleTimeOverride = (order) => {
    setSelectedOrderForTimeOverride(order);
    
    // Recalculate estimated time if not available or to get fresh calculation
    let baseTime = order.estimatedPrepTime;
    
    if (!baseTime || baseTime <= 5) {
      
      // Safely get order time
      let orderTime = new Date();
      if (order.createdAt) {
        try {
          if (typeof order.createdAt.toDate === 'function') {
            // Firebase Timestamp
            orderTime = order.createdAt.toDate();
          } else if (order.createdAt instanceof Date) {
            // Already a Date object
            orderTime = order.createdAt;
          } else if (typeof order.createdAt === 'string') {
            // String date
            orderTime = new Date(order.createdAt);
          }
        } catch (error) {
          orderTime = new Date();
        }
      }
      
      // Recalculate using smart calculator
      const calculatedTime = calculateEstimatedTime({
        items: order.items || [],
        orderTime: orderTime,
        truckData: { id: order.truckId },
        currentOrders: Math.max(0, orders.filter(o => 
          ['pending', 'confirmed', 'preparing'].includes(o.status) && o.id !== order.id
        ).length)
      });
      baseTime = calculatedTime.estimatedMinutes;
      
    } else {
    }
    
    const timeOptions = getSuggestedTimeOptions(baseTime);
    
    setSelectedTimeOption(timeOptions.find(option => option.isDefault) || timeOptions[2]);
    setTimeOverrideModalVisible(true);
  };

  const updateEstimatedTime = async () => {
    if (!selectedOrderForTimeOverride || !selectedTimeOption) return;

    try {
      const orderRef = doc(db, 'orders', selectedOrderForTimeOverride.id);
      await updateDoc(orderRef, {
        estimatedPrepTime: selectedTimeOption.value,
        estimatedTimeDescription: getTimeDescription(selectedTimeOption.value),
        isEstimatedTimeOverridden: true,
        timeOverriddenAt: serverTimestamp(),
        timeOverriddenBy: userData.uid
      });

      setTimeOverrideModalVisible(false);
      setSelectedOrderForTimeOverride(null);
      setSelectedTimeOption(null);

      showToast(
        `Estimated preparation time updated to ${selectedTimeOption.value} minutes. Customer will be notified.`,
        'success'
      );

    } catch (error) {
      showToast('Failed to update estimated time. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF4EC9'; // Neon pink for pending
      case 'confirmed': return '#00E676'; // Success green for confirmed
      case 'preparing': return '#4DBFFF'; // Neon blue for preparing
      case 'ready': return '#FF4EC9'; // Neon pink for ready
      case 'completed': return '#00E676'; // Success green for completed
      case 'cancelled': return '#F44336'; // Keep red for cancelled
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
          
          {/* Time Override Button - show for pending, confirmed, and preparing orders */}
          {['pending', 'confirmed', 'preparing'].includes(item.status) && (
            <TouchableOpacity
              style={[styles.secondaryActionButton, styles.timeButton]}
              onPress={() => handleTimeOverride(item)}
              disabled={isUpdating}
            >
              <Ionicons name="time-outline" size={16} color="#FF9800" />
              <Text style={[styles.secondaryActionText, { color: '#FF9800' }]}>
                {item.estimatedPrepTime || 15}min
              </Text>
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
          {customerProfiles[item.userId]?.profileUrl ? (
            <Image 
              source={{ uri: customerProfiles[item.userId].profileUrl }} 
              style={styles.customerAvatar}
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
        
        {/* Estimated Time Display */}
        {item.estimatedPrepTime && (
          <Text style={styles.estimatedTime}>
            ⏱️ Est. time: {item.estimatedPrepTime}min
            {item.isEstimatedTimeOverridden && (
              <Text style={styles.overriddenIndicator}> (adjusted)</Text>
            )}
          </Text>
        )}
        
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

              {/* Estimated Time Information */}
              {selectedOrder.estimatedPrepTime && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>
                    Estimated Preparation Time
                    {selectedOrder.isEstimatedTimeOverridden && (
                      <Text style={styles.overriddenIndicator}> (Adjusted)</Text>
                    )}
                  </Text>
                  <Text style={styles.estimatedTimeValue}>
                    ⏱️ {selectedOrder.estimatedPrepTime} minutes
                  </Text>
                  {selectedOrder.estimatedTimeDescription && (
                    <Text style={styles.estimatedTimeDescription}>
                      {selectedOrder.estimatedTimeDescription}
                    </Text>
                  )}
                  
                  {/* Show calculation breakdown if available */}
                  {selectedOrder.estimatedTimeCalculation && !selectedOrder.isEstimatedTimeOverridden && (
                    <View style={styles.calculationBreakdown}>
                      <Text style={styles.breakdownTitle}>Auto-calculation details:</Text>
                      <Text style={styles.breakdownText}>
                        • Base prep: {selectedOrder.estimatedTimeCalculation.baseTime}min
                      </Text>
                      <Text style={styles.breakdownText}>
                        • Time of day: {(selectedOrder.estimatedTimeCalculation.timeOfDayFactor || 1).toFixed(1)}x factor
                      </Text>
                      <Text style={styles.breakdownText}>
                        • Queue size: {selectedOrder.estimatedTimeCalculation.currentOrders || 0} orders ahead
                      </Text>
                    </View>
                  )}
                  
                  <TouchableOpacity
                    style={styles.adjustTimeButton}
                    onPress={() => handleTimeOverride(selectedOrder)}
                  >
                    <Ionicons name="time-outline" size={16} color="#FF9800" />
                    <Text style={styles.adjustTimeText}>Adjust Time</Text>
                  </TouchableOpacity>
                </View>
              )}

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
        <Text style={{ color: '#FFFFFF' }}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Management</Text>
        <TouchableOpacity
          onPress={async () => {
            // Test owner-specific notifications and badge functionality
            await NotificationService.testNotification('owner');
            await NotificationService.testBadgeCount();
          }}
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
      
      {/* Time Override Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={timeOverrideModalVisible}
        onRequestClose={() => setTimeOverrideModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timeOverrideModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Estimated Time</Text>
              <TouchableOpacity onPress={() => setTimeOverrideModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedOrderForTimeOverride && (
                <>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderInfoText}>
                      Order #{selectedOrderForTimeOverride.id.substring(0, 8)}...
                    </Text>
                    <Text style={styles.orderInfoText}>
                      {formatOrderItems(selectedOrderForTimeOverride.items)}
                    </Text>
                    <Text style={styles.currentTimeText}>
                      Current estimate: {selectedOrderForTimeOverride.estimatedPrepTime || 'Not set'} minutes
                    </Text>
                    {selectedTimeOption && (
                      <Text style={styles.smartTimeText}>
                        💡 Smart calculation suggests: {selectedTimeOption.value} minutes
                      </Text>
                    )}
                  </View>

                  <Text style={styles.sectionTitle}>Select New Time Estimate:</Text>
                  <Text style={styles.instructionText}>
                    💡 Choose a more accurate prep time based on current kitchen conditions. 
                    Customer will be notified of the updated estimate.
                  </Text>
                  
                  {getSuggestedTimeOptions(selectedOrderForTimeOverride.estimatedPrepTime || 15).map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeOption,
                        selectedTimeOption?.value === option.value && styles.selectedTimeOption
                      ]}
                      onPress={() => setSelectedTimeOption(option)}
                    >
                      <View style={styles.timeOptionContent}>
                        <Text style={[
                          styles.timeOptionText,
                          selectedTimeOption?.value === option.value && styles.selectedTimeOptionText
                        ]}>
                          {option.label}
                        </Text>
                        {option.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Auto</Text>
                          </View>
                        )}
                      </View>
                      {selectedTimeOption?.value === option.value && (
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setTimeOverrideModalVisible(false)}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={updateEstimatedTime}
                disabled={!selectedTimeOption}
              >
                <Text style={styles.actionButtonText}>Update Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toast, 
            toastType === 'success' ? styles.toastSuccess : styles.toastError,
            { opacity: toastOpacity }
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{confirmModalTitle}</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.confirmModalMessage}>{confirmModalMessage}</Text>
            </View>
            <View style={styles.modalActions}>
              {confirmModalButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.actionButton,
                    button.style === 'destructive' ? styles.destructiveButton : 
                    button.style === 'cancel' ? styles.cancelButton : styles.confirmButton,
                    confirmModalButtons.length > 1 && index === 0 ? styles.modalButtonFirst : null
                  ]}
                  onPress={() => {
                    setConfirmModalVisible(false);
                    if (button.onPress) button.onPress();
                  }}
                >
                  <Text style={[
                    styles.actionButtonText,
                    button.style === 'destructive' ? styles.destructiveButtonText : styles.actionButtonText
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 60,
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderIdContainer: {
    flex: 1,
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: '#4DBFFF', // Neon blue for secondary info
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
    borderWidth: 2,
    borderColor: '#FF4EC9', // Neon pink border around avatar
  },
  customerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF4EC9', // Neon pink background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#4DBFFF', // Neon blue border
  },
  customerAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    flex: 1,
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
  specialInstructions: {
    fontSize: 13,
    color: '#FF4EC9', // Neon pink text
    fontStyle: 'italic',
    backgroundColor: 'rgba(255, 78, 201, 0.1)', // Semi-transparent pink background
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FF4EC9',
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
    backgroundColor: '#1A1036', // Deep purple background
    borderWidth: 2,
    borderColor: '#4DBFFF', // Neon blue border
  },
  progressStepText: {
    fontSize: 14,
  },
  progressLine: {
    height: 3,
    flex: 1,
    backgroundColor: '#4DBFFF', // Neon blue progress line
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
    shadowColor: '#FF4EC9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    borderWidth: 1,
  },
  rejectButton: {
    backgroundColor: '#F44336',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailsButton: {
    backgroundColor: 'rgba(77, 191, 255, 0.1)', // Semi-transparent neon blue
    borderColor: '#4DBFFF', // Neon blue border
  },
  secondaryActionText: {
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 26, 0.9)', // Dark navy overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1036', // Deep purple modal background
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#FF4EC9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FF4EC9', // Neon pink border
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FF4EC9', // Neon pink border
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
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
    color: '#4DBFFF', // Neon blue for labels
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    lineHeight: 22,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(77, 191, 255, 0.1)', // Semi-transparent neon blue
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#4DBFFF',
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4DBFFF', // Neon blue
    width: 40,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00E676', // Success green
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00E676', // Success green
  },
  modalActions: {
    marginTop: 24,
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#FF4EC9', // Neon pink border
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#FF4EC9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  confirmButton: {
    backgroundColor: '#00E676', // Success green
  },
  preparingButton: {
    backgroundColor: '#4DBFFF', // Neon blue
  },
  readyButton: {
    backgroundColor: '#FF4EC9', // Neon pink
  },
  completeButton: {
    backgroundColor: '#00E676', // Success green
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  // Estimated time display styles
  estimatedTime: {
    fontSize: 14,
    color: '#FF4EC9', // Neon pink
    fontWeight: '600',
    marginTop: 4,
    backgroundColor: 'rgba(255, 78, 201, 0.1)', // Semi-transparent pink background
    padding: 4,
    borderRadius: 4,
  },
  overriddenIndicator: {
    fontSize: 12,
    color: '#4DBFFF', // Neon blue for override indicator
    fontStyle: 'italic',
  },
  // Time override button styles
  timeButton: {
    backgroundColor: 'rgba(255, 78, 201, 0.1)', // Semi-transparent pink
    borderWidth: 1,
    borderColor: '#FF4EC9', // Neon pink border
  },
  // Time override modal styles
  timeOverrideModal: {
    backgroundColor: '#1A1036', // Deep purple background
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
    shadowColor: '#FF4EC9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FF4EC9', // Neon pink border
  },
  orderInfo: {
    backgroundColor: 'rgba(77, 191, 255, 0.1)', // Semi-transparent neon blue
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4DBFFF',
  },
  orderInfoText: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    marginBottom: 4,
  },
  currentTimeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF4EC9', // Neon pink
    marginTop: 8,
  },
  smartTimeText: {
    fontSize: 14,
    color: '#4DBFFF', // Neon blue
    marginTop: 4,
    fontStyle: 'italic',
  },
  instructionText: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 16,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
    marginBottom: 16,
  },
  timeOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4DBFFF', // Neon blue border
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(77, 191, 255, 0.05)', // Very light neon blue
  },
  selectedTimeOption: {
    borderColor: '#00E676', // Success green border for selected
    backgroundColor: 'rgba(0, 230, 118, 0.1)', // Semi-transparent green
  },
  timeOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  selectedTimeOptionText: {
    color: '#00E676', // Success green for selected
    fontWeight: 'bold',
  },
  defaultBadge: {
    backgroundColor: '#FF4EC9', // Neon pink badge
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  // Additional estimated time detail styles
  estimatedTimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4EC9', // Neon pink
    marginTop: 4,
  },
  estimatedTimeDescription: {
    fontSize: 14,
    color: '#4DBFFF', // Neon blue
    marginTop: 4,
    fontStyle: 'italic',
  },
  calculationBreakdown: {
    backgroundColor: 'rgba(77, 191, 255, 0.1)', // Semi-transparent neon blue
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4DBFFF',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
    marginBottom: 6,
  },
  breakdownText: {
    fontSize: 12,
    color: '#4DBFFF', // Neon blue
    marginBottom: 2,
  },
  adjustTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 78, 201, 0.1)', // Semi-transparent pink
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FF4EC9',
  },
  adjustTimeText: {
    fontSize: 14,
    color: '#FF4EC9', // Neon pink
    fontWeight: '600',
    marginLeft: 4,
  },
  // Toast styles
  toast: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  toastError: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  toastText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a2e',
  },
  // Confirmation modal styles
  confirmModalContainer: {
    backgroundColor: '#1A1036', // Deep purple modal background
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#FF4EC9', // Neon pink border
    shadowColor: '#FF4EC9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmModalMessage: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtonFirst: {
    marginRight: 10,
  },
  destructiveButton: {
    backgroundColor: '#F44336', // Red for destructive actions
  },
  destructiveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default OrderManagementScreen;
