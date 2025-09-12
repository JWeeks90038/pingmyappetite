import admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { sendOrderStatusSMS, checkTwilioConfig } from './twilioService.js';

/**
 * Calculate estimated preparation time based on order complexity
 */
const calculateEstimatedTime = (orderItems, truckData = {}) => {
  if (!orderItems || !Array.isArray(orderItems)) return null;
  
  // Base time per item (in minutes)
  const baseTimePerItem = 3;
  
  // Calculate total prep time based on items
  let totalTime = 0;
  let complexityMultiplier = 1;
  
  orderItems.forEach(item => {
    const quantity = item.quantity || 1;
    
    // Add base time for each item
    totalTime += baseTimePerItem * quantity;
    
    // Increase complexity for certain categories
    if (item.category) {
      const category = item.category.toLowerCase();
      if (category.includes('grill') || category.includes('bbq')) {
        complexityMultiplier = Math.max(complexityMultiplier, 1.5);
      } else if (category.includes('fried') || category.includes('deep')) {
        complexityMultiplier = Math.max(complexityMultiplier, 1.3);
      } else if (category.includes('sandwich') || category.includes('burger')) {
        complexityMultiplier = Math.max(complexityMultiplier, 1.2);
      }
    }
    
    // Increase time for special instructions
    if (item.specialInstructions && item.specialInstructions.length > 10) {
      totalTime += 2; // Add 2 minutes for special instructions
    }
  });
  
  // Apply complexity multiplier
  totalTime = Math.ceil(totalTime * complexityMultiplier);
  
  // Account for truck capacity and current load
  const currentHour = new Date().getHours();
  const isPeakTime = (currentHour >= 11 && currentHour <= 14) || (currentHour >= 17 && currentHour <= 20);
  
  if (isPeakTime) {
    totalTime = Math.ceil(totalTime * 1.4); // 40% longer during peak times
  }
  
  // Apply truck-specific modifiers
  if (truckData.averagePrepTime) {
    const truckModifier = truckData.averagePrepTime / 15; // Normalize to 15 minute baseline
    totalTime = Math.ceil(totalTime * truckModifier);
  }
  
  // Ensure reasonable bounds
  totalTime = Math.max(5, Math.min(totalTime, 45)); // Between 5-45 minutes
  
  return totalTime;
};

/**
 * Get user's notification preferences
 */
const getUserNotificationPreferences = async (userId) => {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return {
        pushNotifications: true, // Default enabled
        smsNotifications: false, // Default disabled until phone verified
        emailNotifications: true, // Default enabled
        hasValidPhone: false,
        hasValidEmail: false
      };
    }
    
    const userData = userDoc.data();
    
    return {
      pushNotifications: userData.notificationPreferences?.push !== false,
      smsNotifications: userData.notificationPreferences?.sms === true,
      emailNotifications: userData.notificationPreferences?.email !== false,
      hasValidPhone: !!(userData.phone && userData.phoneVerified),
      hasValidEmail: !!(userData.email && userData.emailVerified !== false),
      phone: userData.phone,
      email: userData.email,
      fcmToken: userData.fcmToken || userData.expoPushToken,
      username: userData.username || userData.displayName
    };
  } catch (error) {
    logger.error('Error fetching user notification preferences:', error);
    return {
      pushNotifications: true,
      smsNotifications: false,
      emailNotifications: true,
      hasValidPhone: false,
      hasValidEmail: false
    };
  }
};

/**
 * Get user's unread notification count for badge
 */
const getUserUnreadCount = async (userId) => {
  try {
    const db = admin.firestore();
    
    // Get unread notifications from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const unreadQuery = await db.collection('sentNotifications')
      .where('userId', '==', userId)
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .where('read', '==', false)
      .get();
    
    const count = unreadQuery.size;
    logger.info(`📱 Found ${count} unread notifications for user ${userId}`);
    
    return Math.min(count, 99); // Cap at 99 for display
  } catch (error) {
    logger.error('📱 Error getting unread count:', error);
    
    // If index is still building, return a reasonable default
    if (error.message && error.message.includes('index')) {
      logger.warn('📱 Index still building for sentNotifications query, using default badge count');
      return 1;
    }
    
    return 1; // Default to 1 if we can't get count
  }
};

/**
 * Send push notification via FCM or Expo
 */
const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    if (!token) {
      return { success: false, error: 'No token provided', method: 'push' };
    }
    
    // Get badge count for this user
    const badgeCount = data.userId ? await getUserUnreadCount(data.userId) : 1;
    
    // Check if this is an Expo token or FCM token
    const isExpoToken = token.startsWith('ExponentPushToken[');
    
    if (isExpoToken) {
      logger.info('📱 Sending via Expo Push Service');
      return await sendExpoNotification(token, title, body, data, badgeCount);
    } else {
      logger.info('📱 Sending via Firebase FCM');
      return await sendFCMNotification(token, title, body, data, badgeCount);
    }
    
  } catch (error) {
    logger.error('📱 Error sending push notification:', error);
    
    // Handle invalid token
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      
      // TODO: Remove invalid token from user's document
      logger.warn('📱 Invalid token, should be removed from user document');
    }
    
    return {
      success: false,
      error: error.message,
      method: 'push'
    };
  }
};

// Removed duplicate sendExpoNotification function - using the one defined in sendFCMNotification above

/**
 * Send notification via Firebase FCM or Expo Push
 */
const sendFCMNotification = async (token, title, body, data, badgeCount) => {
  try {
    // Check if it's an Expo token
    if (token && token.startsWith('ExponentPushToken')) {
      return await sendExpoNotification(token, title, body, data, badgeCount);
    }
    
    // Handle FCM token
    const message = {
      token: token,
      notification: {
        title,
        body
      },
      data: {
        ...data,
        clickAction: data.clickAction || '/my-orders',
        type: data.type || 'order_status',
        // Convert all values to strings (FCM requirement)
        orderId: String(data.orderId || ''),
        status: String(data.status || ''),
      },
      // iOS specific badge count
      apns: {
        payload: {
          aps: {
            badge: badgeCount,
            sound: 'default'
          }
        }
      },
      // Android specific badge count
      android: {
        notification: {
          notificationCount: badgeCount,
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        }
      },
      webpush: {
        notification: {
          title,
          body,
          icon: '/logo.png',
          badge: '/truck-icon.png',
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: '👀 View Order'
            },
            {
              action: 'dismiss',
              title: '✖️ Dismiss'
            }
          ]
        },
        fcmOptions: {
          link: data.clickAction || '/my-orders'
        }
      }
    };
    
    const response = await admin.messaging().send(message);
    
    logger.info(`📱 FCM notification sent: ${response}`);
    
    return {
      success: true,
      messageId: response,
      method: 'fcm'
    };
    
  } catch (error) {
    logger.error('FCM notification failed:', error);
    
    let errorMessage = error.message;
    
    // Handle specific FCM errors
    if (error.code === 'messaging/registration-token-not-registered') {
      errorMessage = 'Token not registered - user may have uninstalled app';
    } else if (error.code === 'messaging/invalid-registration-token') {
      errorMessage = 'Invalid token format';
    }
    
    return {
      success: false,
      method: 'fcm',
      error: errorMessage,
    };
  }
};

/**
 * Send notification via Expo Push Service (for Expo Go compatibility)
 */
const sendExpoNotification = async (token, title, body, data, badgeCount) => {
  try {
    const message = {
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: badgeCount || 1,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (result.data && result.data[0] && result.data[0].status === 'ok') {
      logger.info(`📱 Expo notification sent: ${result.data[0].id}`);
      return {
        success: true,
        messageId: result.data[0].id,
        method: 'expo'
      };
    } else {
      throw new Error(result.data?.[0]?.message || 'Expo push failed');
    }
    
  } catch (error) {
    logger.error('Expo notification failed:', error);
    return {
      success: false,
      method: 'expo',
      error: error.message,
    };
  }
};

/**
 * Create notification content for order status
 */
const createNotificationContent = (orderData, status) => {
  const { 
    orderId, 
    truckName = 'Food Truck',
    customerName = '',
    estimatedTime = null
  } = orderData;
  
  const shortOrderId = orderId.substring(0, 8);
  
  const statusContent = {
    new_order: {
      title: '🚚 New Order Received!',
      body: `New order #${shortOrderId} from ${customerName || 'customer'} • $${orderData.totalAmount?.toFixed(2) || '0.00'}`,
      emoji: '🚚'
    },
    confirmed: {
      title: '✅ Order Confirmed!',
      body: `${truckName} confirmed your order #${shortOrderId}${estimatedTime ? ` • ~${estimatedTime} min` : ''}`,
      emoji: '✅'
    },
    preparing: {
      title: '👨‍🍳 Order Being Prepared',
      body: `${truckName} is preparing your order #${shortOrderId}${estimatedTime ? ` • ~${estimatedTime} min` : ''}`,
      emoji: '👨‍🍳'
    },
    ready: {
      title: '🔔 Order Ready!',
      body: `Your order #${shortOrderId} from ${truckName} is ready for pickup!`,
      emoji: '🔔'
    },
    completed: {
      title: '✅ Order Complete',
      body: `Thanks for choosing ${truckName}! Hope you enjoyed your meal!`,
      emoji: '✅'
    },
    cancelled: {
      title: '❌ Order Cancelled',
      body: `Your order #${shortOrderId} from ${truckName} was cancelled. Refund in 3-5 days.`,
      emoji: '❌'
    }
  };
  
  return statusContent[status] || {
    title: 'Order Update',
    body: `Update on your order #${shortOrderId} from ${truckName}`,
    emoji: '📱'
  };
};

/**
 * Send comprehensive order status notification
 */
const sendOrderStatusNotification = async (orderId, status, customData = {}) => {
  try {
    const db = admin.firestore();
    
    // Get order details
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      logger.error(`Order not found: ${orderId}`);
      return { success: false, error: 'Order not found' };
    }

    const orderData = orderDoc.data();
    const customerId = orderData.customerId;
    const truckId = orderData.truckId;

    // Get truck details
    let truckData = {};
    if (truckId) {
      const truckDoc = await db.collection('users').doc(truckId).get();
      if (truckDoc.exists) {
        truckData = truckDoc.data();
      }
    }

    const results = [];

    // Handle new order notifications (notify truck owner)
    if (status === 'new_order') {
      logger.info(`🚚 Sending new order notification to truck owner: ${truckId}`);
      
      if (truckId && truckId !== 'guest') {
        // Get truck owner preferences
        const truckPreferences = await getUserNotificationPreferences(truckId);
        
        // Get customer details for the notification
        let customerData = {};
        if (customerId && customerId !== 'guest') {
          const customerDoc = await db.collection('users').doc(customerId).get();
          if (customerDoc.exists) {
            customerData = customerDoc.data();
          }
        }

        // Prepare notification data for truck owner
        const truckNotificationData = {
          orderId,
          truckName: truckData.businessName || truckData.username || 'Food Truck',
          customerName: customerData.username || customerData.displayName || 'Customer',
          items: orderData.items,
          totalAmount: orderData.totalAmount,
          ...customData
        };

        const truckContent = createNotificationContent(truckNotificationData, status);

        // Send push notification to truck owner
        if (truckPreferences.pushNotifications && truckPreferences.fcmToken) {
          const pushResult = await sendPushNotification(
            truckPreferences.fcmToken,
            truckContent.title,
            truckContent.body,
            {
              orderId,
              status,
              type: 'new_order',
              clickAction: '/orders', // Truck owner orders page
              userId: truckId // Add userId for badge counting
            }
          );
          results.push(pushResult);
        } else {
          logger.warn(`🚚 Truck owner ${truckId} missing push notification setup: pushEnabled=${truckPreferences.pushNotifications}, hasToken=${!!truckPreferences.fcmToken}`);
          results.push({
            success: false,
            error: 'No FCM token or push notifications disabled for truck owner',
            method: 'push'
          });
        }

        // Send SMS notification to truck owner
        if (truckPreferences.smsNotifications && truckPreferences.hasValidPhone && truckPreferences.phone) {
          const smsResult = await sendOrderStatusSMS(truckPreferences.phone, truckNotificationData, status);
          results.push(smsResult);
        }

        // Record notification sent to truck owner
        await db.collection('sentNotifications').add({
          userId: truckId,
          orderId,
          type: 'new_order',
          status,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          content: truckContent,
          results: results.filter(r => r),
          success: results.some(r => r.success),
          recipient: 'truck_owner',
          read: false // Initialize as unread for badge counting
        });

        logger.info(`🚚 New order notifications sent to truck owner ${truckId} for order ${orderId}`);
      }

      // ALSO notify customer that their order was placed successfully
      if (customerId && customerId !== 'guest') {
        logger.info(`📱 Sending order confirmation notification to customer: ${customerId}`);
        
        const customerPreferences = await getUserNotificationPreferences(customerId);
        
        // Prepare notification data for customer (order placed confirmation)
        const customerNotificationData = {
          orderId,
          truckName: truckData.businessName || truckData.username || 'Food Truck',
          customerName: customerPreferences.username,
          items: orderData.items,
          totalAmount: orderData.totalAmount,
          ...customData
        };

        // Create custom content for order placed confirmation
        const shortOrderId = orderId.substring(0, 8);
        const customerContent = {
          title: '✅ Order Placed!',
          body: `Your order #${shortOrderId} was placed with ${customerNotificationData.truckName} • $${orderData.totalAmount?.toFixed(2) || '0.00'}`,
          emoji: '✅'
        };

        // Send push notification to customer
        if (customerPreferences.pushNotifications && customerPreferences.fcmToken) {
          const pushResult = await sendPushNotification(
            customerPreferences.fcmToken,
            customerContent.title,
            customerContent.body,
            {
              orderId,
              status: 'order_placed',
              type: 'order_confirmation',
              clickAction: '/my-orders',
              userId: customerId // Add userId for badge counting
            }
          );
          results.push(pushResult);
        } else {
          logger.warn(`📱 Customer ${customerId} missing push notification setup: pushEnabled=${customerPreferences.pushNotifications}, hasToken=${!!customerPreferences.fcmToken}`);
        }

        // Record notification sent to customer
        await db.collection('sentNotifications').add({
          userId: customerId,
          orderId,
          type: 'order_confirmation',
          status: 'order_placed',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          content: customerContent,
          results: results.filter(r => r.method === 'push'), // Only include customer's push result
          success: results.filter(r => r.method === 'push').some(r => r.success),
          recipient: 'customer',
          read: false // Initialize as unread for badge counting
        });

        logger.info(`📱 Order confirmation notification sent to customer ${customerId} for order ${orderId}`);
      }

      return {
        success: true,
        results,
        notificationsSent: results.filter(r => r.success).length,
        recipients: ['truck_owner', 'customer']
      };
    }

    // Handle customer notifications for order status updates
    if (!customerId || customerId === 'guest') {
      logger.info(`Skipping customer notifications for guest order: ${orderId}`);
      return { success: true, note: 'Guest order - no customer notifications sent' };
    }

    // Calculate estimated time if confirming or preparing
    let estimatedTime = null;
    if (status === 'confirmed' || status === 'preparing') {
      estimatedTime = calculateEstimatedTime(orderData.items, truckData);
      
      // Update order with estimated time
      await db.collection('orders').doc(orderId).update({
        estimatedPrepTime: estimatedTime,
        estimatedReadyTime: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + (estimatedTime * 60 * 1000))
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Get customer notification preferences
    const customerPreferences = await getUserNotificationPreferences(customerId);
    
    // Prepare notification data for customer
    const customerNotificationData = {
      orderId,
      truckName: truckData.businessName || truckData.username || 'Food Truck',
      customerName: customerPreferences.username,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      estimatedTime,
      ...customData
    };

    const customerContent = createNotificationContent(customerNotificationData, status);

    // Send push notification to customer
    if (customerPreferences.pushNotifications && customerPreferences.fcmToken) {
      const pushResult = await sendPushNotification(
        customerPreferences.fcmToken,
        customerContent.title,
        customerContent.body,
        {
          orderId,
          status,
          type: 'order_status',
          clickAction: '/my-orders',
          userId: customerId // Add userId for badge counting
        }
      );
      results.push(pushResult);
    }

    // Send SMS notification to customer
    if (customerPreferences.smsNotifications && customerPreferences.hasValidPhone && customerPreferences.phone) {
      const smsResult = await sendOrderStatusSMS(customerPreferences.phone, customerNotificationData, status);
      results.push(smsResult);
    }

    // Record notification sent to customer
    await db.collection('sentNotifications').add({
      userId: customerId,
      orderId,
      type: 'order_status',
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      content: customerContent,
      results: results.filter(r => r),
      success: results.some(r => r.success),
      recipient: 'customer',
      read: false // Initialize as unread for badge counting
    });

    logger.info(`📱 Customer order status notifications sent for ${orderId} (${status}):`, {
      push: results.find(r => r.method === 'push')?.success || false,
      sms: results.find(r => r.method === 'sms')?.success || false,
      estimatedTime
    });

    return {
      success: true,
      results,
      estimatedTime,
      notificationsSent: results.filter(r => r.success).length,
      recipient: 'customer'
    };
    
  } catch (error) {
    logger.error('📱 Error sending order status notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Mark notifications as read for badge count management
 */
const markNotificationsAsRead = async (userId, orderId = null) => {
  try {
    const db = admin.firestore();
    
    let query = db.collection('sentNotifications')
      .where('userId', '==', userId)
      .where('read', '==', false);
    
    // If orderId provided, only mark that order's notifications as read
    if (orderId) {
      query = query.where('orderId', '==', orderId);
    }
    
    const unreadDocs = await query.get();
    
    const batch = db.batch();
    unreadDocs.forEach(doc => {
      batch.update(doc.ref, { 
        read: true, 
        readAt: admin.firestore.FieldValue.serverTimestamp() 
      });
    });
    
    await batch.commit();
    
    logger.info(`📖 Marked ${unreadDocs.size} notifications as read for user ${userId}`);
    return unreadDocs.size;
    
  } catch (error) {
    logger.error('Error marking notifications as read:', error);
    return 0;
  }
};

/**
 * Check if notification was recently sent (anti-spam)
 */
const shouldSendNotification = async (userId, orderId, type) => {
  try {
    const db = admin.firestore();
    const recentNotification = await db.collection('sentNotifications')
      .where('userId', '==', userId)
      .where('orderId', '==', orderId)
      .where('type', '==', type)
      .where('timestamp', '>', admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000))) // 5 minutes ago
      .limit(1)
      .get();
    
    return recentNotification.empty;
  } catch (error) {
    logger.error('Error checking recent notifications:', error);
    return true; // Send if check fails
  }
};

/**
 * Get notification system status
 */
const getNotificationStatus = () => {
  const twilioStatus = checkTwilioConfig();
  
  return {
    push: {
      available: true,
      service: 'Firebase Cloud Messaging'
    },
    sms: {
      available: twilioStatus.isConfigured,
      service: 'Twilio',
      config: twilioStatus
    },
    email: {
      available: true,
      service: 'Formspree' // Or whatever email service you're using
    }
  };
};

export {
  sendOrderStatusNotification,
  calculateEstimatedTime,
  getUserNotificationPreferences,
  sendPushNotification,
  createNotificationContent,
  shouldSendNotification,
  getNotificationStatus,
  getUserUnreadCount,
  markNotificationsAsRead
};
