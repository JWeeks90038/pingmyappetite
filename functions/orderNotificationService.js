const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { sendOrderStatusSMS, checkTwilioConfig } = require('./twilioService');

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
      fcmToken: userData.fcmToken,
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
 * Send push notification via FCM
 */
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  try {
    if (!fcmToken) {
      return { success: false, error: 'No FCM token', method: 'push' };
    }
    
    const message = {
      token: fcmToken,
      notification: {
        title,
        body
      },
      data: {
        ...data,
        clickAction: data.clickAction || '/my-orders',
        type: data.type || 'order_status'
      },
      webpush: {
        notification: {
          title,
          body,
          icon: '/grubana-logo.png',
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
    
    logger.info(`📱 Push notification sent: ${response}`);
    
    return {
      success: true,
      messageId: response,
      method: 'push'
    };
    
  } catch (error) {
    logger.error('📱 Error sending push notification:', error);
    
    // Handle invalid token
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      
      // TODO: Remove invalid token from user's document
      logger.warn('📱 Invalid FCM token, should be removed from user document');
    }
    
    return {
      success: false,
      error: error.message,
      method: 'push'
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
    
    if (!customerId || customerId === 'guest') {
      logger.info(`Skipping notifications for guest order: ${orderId}`);
      return { success: true, note: 'Guest order - no notifications sent' };
    }
    
    // Get truck details
    let truckData = {};
    if (orderData.truckId) {
      const truckDoc = await db.collection('users').doc(orderData.truckId).get();
      if (truckDoc.exists) {
        truckData = truckDoc.data();
      }
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
    
    // Get user notification preferences
    const preferences = await getUserNotificationPreferences(customerId);
    
    // Prepare notification data
    const notificationData = {
      orderId,
      truckName: truckData.businessName || truckData.username || 'Food Truck',
      customerName: preferences.username,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      estimatedTime,
      ...customData
    };
    
    const content = createNotificationContent(notificationData, status);
    const results = [];
    
    // Send push notification
    if (preferences.pushNotifications && preferences.fcmToken) {
      const pushResult = await sendPushNotification(
        preferences.fcmToken,
        content.title,
        content.body,
        {
          orderId,
          status,
          type: 'order_status',
          clickAction: '/my-orders'
        }
      );
      results.push(pushResult);
    }
    
    // Send SMS notification
    if (preferences.smsNotifications && preferences.hasValidPhone && preferences.phone) {
      const smsResult = await sendOrderStatusSMS(preferences.phone, notificationData, status);
      results.push(smsResult);
    }
    
    // Record notification sent
    await db.collection('sentNotifications').add({
      userId: customerId,
      orderId,
      type: 'order_status',
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      content,
      results,
      success: results.some(r => r.success)
    });
    
    logger.info(`📱 Order status notifications sent for ${orderId} (${status}):`, {
      push: results.find(r => r.method === 'push')?.success || false,
      sms: results.find(r => r.method === 'sms')?.success || false,
      estimatedTime
    });
    
    return {
      success: true,
      results,
      estimatedTime,
      notificationsSent: results.filter(r => r.success).length
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

module.exports = {
  sendOrderStatusNotification,
  calculateEstimatedTime,
  getUserNotificationPreferences,
  sendPushNotification,
  createNotificationContent,
  shouldSendNotification,
  getNotificationStatus
};
