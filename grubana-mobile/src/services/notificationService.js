import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getMessaging, getToken } from 'firebase/messaging';

// Configure how notifications are handled when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Initialize notifications for the current user
   */
  async initialize(userId) {
    if (!userId) {
      return false;
    }

    try {
      // Request permissions
      const tokenData = await this.requestNotificationPermissions();
      
      if (tokenData && tokenData.token) {
        // Save token to user's Firestore document
        await this.saveTokenToFirestore(userId, tokenData.token, tokenData.tokenType);
        
        // Set up notification listeners
        this.setupNotificationListeners();
        
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Request notification permissions and get FCM token
   */
  async requestNotificationPermissions() {
    try {
      if (!Device.isDevice) {
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      // Get FCM token for production/TestFlight, Expo token for Expo Go
      let token;
      let tokenType = 'expo'; // Default to expo
      
      try {
        // Check if we're running in a standalone app (TestFlight/production)
        const isStandalone = !__DEV__ || Platform.OS !== 'web';
        
        if (Platform.OS === 'web') {
          // Web implementation
          const messaging = getMessaging();
          token = await getToken(messaging, { 
            vapidKey: 'BNxZ8PbrR8F6P7hqjWZz7Qq3Q8HbXhF5JQB3D2J4K9L1M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9A0B1C2D3E4F5' // Replace with your actual VAPID key
          });
          tokenType = 'fcm';
        } else {
          // Try to get FCM token first (for standalone builds)
          try {
            // For standalone/TestFlight builds, use FCM
            // This requires @react-native-firebase/messaging to be installed
            // import messaging from '@react-native-firebase/messaging';
            // token = await messaging().getToken();
            // tokenType = 'fcm';
            
            // For now, detect if we're in Expo Go vs standalone
            const isExpoGo = typeof expo !== 'undefined' && expo?.modules?.ExponentConstants?.appOwnership === 'expo';
            
            if (isExpoGo) {
              // Use Expo tokens for Expo Go
              const expoPushToken = await Notifications.getExpoPushTokenAsync();
              token = expoPushToken.data;
              tokenType = 'expo';
            } else {
              // For TestFlight/production, get device push token which works with FCM
              const deviceToken = await Notifications.getDevicePushTokenAsync();
              token = deviceToken.data || deviceToken;
              tokenType = 'fcm';
            }
          } catch (fcmError) {
            // Fallback to Expo token
            const expoPushToken = await Notifications.getExpoPushTokenAsync();
            token = expoPushToken.data;
            tokenType = 'expo';
          }
        }
      } catch (tokenError) {
        // Final fallback
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          token = deviceToken.data || deviceToken;
          tokenType = 'fcm';
        } catch (fallbackError) {
          const expoPushToken = await Notifications.getExpoPushTokenAsync();
          token = expoPushToken.data;
          tokenType = 'expo';
        }
      }

      this.expoPushToken = token;
      
      return { token, tokenType };
    } catch (error) {
      return null;
    }
  }

  /**
   * Save push token to user's Firestore document
   */
  async saveTokenToFirestore(userId, token, tokenType = 'expo') {
    try {
      const userRef = doc(db, 'users', userId);
      
      const updateData = {
        notificationPermission: 'granted',
        tokenUpdatedAt: new Date(),
        tokenType: tokenType,
        // Enable notifications by default
        notificationPreferences: {
          push: true,
          sms: false,
          email: true
        }
      };
      
      // Save token based on type
      if (tokenType === 'fcm') {
        updateData.fcmToken = token;
        updateData.expoPushToken = null; // Clear expo token
      } else {
        updateData.expoPushToken = token;
        updateData.fcmToken = token; // Also save as fcmToken for backend compatibility
      }
      
      await updateDoc(userRef, updateData);
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Listen for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      // Increment badge count when notification is received
      this.incrementBadgeCount();
      
      // You can customize handling here
      // For example, show a custom in-app notification
    });

    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // Clear badge count when user interacts with notification
      this.clearBadgeCount();
      
      const data = response.notification.request.content.data;
      
      // Handle different notification types based on user role and notification type
      this.handleNotificationNavigation(data);
    });
  }

  /**
   * Handle navigation based on notification type and user context
   */
  handleNotificationNavigation(data) {
    if (!data?.type) return;

    switch (data.type) {
      case 'new_order':
        // For truck owners - navigate to order management
        // Navigation will be handled by the app's navigation system
        break;
        
      case 'order_status':
        // For customers - navigate to their orders
        break;
        
      case 'order_confirmed':
        // For customers - navigate to order tracking
        break;
        
      case 'order_ready':
        // For customers - navigate to pickup information
        break;
        
      case 'event_invitation':
        // For all users - navigate to events
        break;
        
      case 'event_update':
        // For event participants - navigate to specific event
        break;
        
      case 'review_request':
        // For customers - navigate to review screen
        break;
        
      default:
    }
  }

  /**
   * Send a local notification (for testing)
   */
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Send immediately
      });
      
    } catch (error) {
    }
  }

  /**
   * Test notifications (for development)
   */
  async testNotification(userType = 'customer') {
    await this.sendTestNotificationForRole(userType);
  }

  /**
   * Test all notification types for comprehensive testing
   */
  async testAllNotificationTypes() {
    const testNotifications = [
      { title: '🚚 New Order', body: 'You have a new order!', data: { type: 'new_order' } },
      { title: '✅ Order Confirmed', body: 'Your order has been confirmed', data: { type: 'order_confirmed' } },
      { title: '🍳 Order Preparing', body: 'Your order is being prepared', data: { type: 'order_status' } },
      { title: '🎉 Order Ready', body: 'Your order is ready for pickup!', data: { type: 'order_ready' } },
      { title: '🎪 Event Invitation', body: 'You\'re invited to a new event', data: { type: 'event_invitation' } },
      { title: '� Event Update', body: 'Event details have been updated', data: { type: 'event_update' } },
      { title: '⭐ Review Request', body: 'How was your experience?', data: { type: 'review_request' } },
    ];

    for (let i = 0; i < testNotifications.length; i++) {
      const notif = testNotifications[i];
      setTimeout(() => {
        this.sendLocalNotification(notif.title, notif.body, notif.data);
      }, i * 2000); // Send every 2 seconds
    }
  }

  /**
   * Test badge count functionality
   */
  async testBadgeCount() {
    
    // Clear badge first
    await this.clearBadgeCount();
    
    // Test incrementing
    await this.incrementBadgeCount();
    
    await this.incrementBadgeCount();
    
    // Test setting specific count
    await this.setBadgeCount(5);
    
    // Test getting count
    const count = await this.getBadgeCount();
    
    // Clear again
    await this.clearBadgeCount();
  }

  /**
   * Get notification preferences for current user
   */
  async getNotificationPreferences(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.notificationPreferences || {
          push: true,
          sms: false,
          email: true
        };
      }
      
      return {
        push: true,
        sms: false,
        email: true
      };
    } catch (error) {
      return {
        push: true,
        sms: false,
        email: true
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    try {
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        notificationPreferences: preferences,
        notificationPreferencesUpdatedAt: new Date()
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set badge count on app icon
   */
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
    }
  }

  /**
   * Get current badge count
   */
  async getBadgeCount() {
    try {
      const count = await Notifications.getBadgeCountAsync();
      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Increment badge count
   */
  async incrementBadgeCount() {
    try {
      const currentCount = await this.getBadgeCount();
      const newCount = currentCount + 1;
      await this.setBadgeCount(newCount);
      return newCount;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clear badge count (set to 0)
   */
  async clearBadgeCount() {
    try {
      await this.setBadgeCount(0);
    } catch (error) {
    }
  }

  /**
   * Clear badge count for specific user role/screen
   * This should be called when users view their relevant screens
   */
  async clearBadgeForUserRole(userRole, screenName) {
    try {
      await this.clearBadgeCount();
    } catch (error) {
    }
  }

  /**
   * Send role-specific test notifications
   */
  async sendTestNotificationForRole(userRole) {
    let title, body, data;

    switch (userRole) {
      case 'customer':
        title = '🍕 Order Update';
        body = 'Your order is ready for pickup!';
        data = { type: 'order_ready', userRole: 'customer' };
        break;
        
      case 'owner':
        title = '🚚 New Order';
        body = 'You have a new order to prepare!';
        data = { type: 'new_order', userRole: 'owner' };
        break;
        
      case 'event-organizer':
        title = '🎪 Event Update';
        body = 'Someone just joined your event!';
        data = { type: 'event_update', userRole: 'event-organizer' };
        break;
        
      default:
        title = '🔔 Test Notification';
        body = 'This is a test notification';
        data = { type: 'general', userRole: userRole || 'unknown' };
    }

    await this.sendLocalNotification(title, body, data);
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    
  }
}

// Export a singleton instance
export default new NotificationService();
