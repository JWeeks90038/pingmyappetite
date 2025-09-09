import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getMessaging, getToken } from 'firebase/messaging';

// Configure how notifications are handled when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
      console.warn('⚠️ Cannot initialize notifications: No user ID provided');
      return false;
    }

    try {
      // Request permissions
      const token = await this.requestNotificationPermissions();
      
      if (token) {
        // Save token to user's Firestore document
        await this.saveTokenToFirestore(userId, token);
        
        // Set up notification listeners
        this.setupNotificationListeners();
        
        console.log('✅ Notifications initialized successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permissions and get FCM token
   */
  async requestNotificationPermissions() {
    try {
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
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
        console.warn('⚠️ Notification permission not granted');
        return null;
      }

      // Get FCM token directly (this will work after Expo ejection)
      let token;
      try {
        // For production React Native, use Firebase messaging directly
        if (Platform.OS === 'web') {
          // Web implementation
          const messaging = getMessaging();
          token = await getToken(messaging, { 
            vapidKey: 'your-vapid-key-here' // You'll need to set this up
          });
        } else {
          // Mobile implementation - use Expo for now, but prepare for FCM
          const expoPushToken = await Notifications.getExpoPushTokenAsync();
          token = expoPushToken.data;
          
          // Future: Replace with react-native-firebase/messaging
          // import messaging from '@react-native-firebase/messaging';
          // token = await messaging().getToken();
        }
      } catch (tokenError) {
        console.log('🔄 Falling back to device token...');
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token = deviceToken.data || deviceToken;
      }

      console.log('🔔 Push token obtained:', token);
      this.expoPushToken = token;
      
      return token;
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return null;
    }
  }

  /**
   * Save push token to user's Firestore document
   */
  async saveTokenToFirestore(userId, token) {
    try {
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        expoPushToken: token,
        fcmToken: token, // Also save as fcmToken for backend compatibility
        notificationPermission: 'granted',
        expoPushTokenUpdatedAt: new Date(),
        // Enable notifications by default
        notificationPreferences: {
          push: true,
          sms: false,
          email: true
        }
      });
      
      console.log('✅ Push token saved to Firestore');
    } catch (error) {
      console.error('❌ Error saving token to Firestore:', error);
      throw error;
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Listen for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received (foreground):', notification);
      
      // Increment badge count when notification is received
      this.incrementBadgeCount();
      
      // You can customize handling here
      // For example, show a custom in-app notification
    });

    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Notification response:', response);
      
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
        console.log('🚚 New order notification tapped - navigating to orders');
        // Navigation will be handled by the app's navigation system
        break;
        
      case 'order_status':
        // For customers - navigate to their orders
        console.log('📱 Order status notification tapped - navigating to customer orders');
        break;
        
      case 'order_confirmed':
        // For customers - navigate to order tracking
        console.log('✅ Order confirmed notification tapped');
        break;
        
      case 'order_ready':
        // For customers - navigate to pickup information
        console.log('🎉 Order ready notification tapped');
        break;
        
      case 'event_invitation':
        // For all users - navigate to events
        console.log('🎪 Event invitation notification tapped');
        break;
        
      case 'event_update':
        // For event participants - navigate to specific event
        console.log('📅 Event update notification tapped');
        break;
        
      case 'review_request':
        // For customers - navigate to review screen
        console.log('⭐ Review request notification tapped');
        break;
        
      default:
        console.log('🔔 Unknown notification type:', data.type);
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
      
      console.log('📱 Local notification sent');
    } catch (error) {
      console.error('❌ Error sending local notification:', error);
    }
  }

  /**
   * Test notifications (for development)
   */
  async testNotification(userType = 'customer') {
    console.log(`🔔 Testing notification for role: ${userType}`);
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

    console.log('📱 All test notifications scheduled');
  }

  /**
   * Test badge count functionality
   */
  async testBadgeCount() {
    console.log('🔢 Testing badge count functionality...');
    
    // Clear badge first
    await this.clearBadgeCount();
    console.log('1. Badge cleared');
    
    // Test incrementing
    await this.incrementBadgeCount();
    console.log('2. Badge incremented to 1');
    
    await this.incrementBadgeCount();
    console.log('3. Badge incremented to 2');
    
    // Test setting specific count
    await this.setBadgeCount(5);
    console.log('4. Badge set to 5');
    
    // Test getting count
    const count = await this.getBadgeCount();
    console.log(`5. Current badge count: ${count}`);
    
    // Clear again
    await this.clearBadgeCount();
    console.log('6. Badge cleared again');
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
      console.error('❌ Error getting notification preferences:', error);
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
      
      console.log('✅ Notification preferences updated');
      return true;
    } catch (error) {
      console.error('❌ Error updating notification preferences:', error);
      return false;
    }
  }

  /**
   * Set badge count on app icon
   */
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log(`🔢 Badge count set to: ${count}`);
    } catch (error) {
      console.error('❌ Error setting badge count:', error);
    }
  }

  /**
   * Get current badge count
   */
  async getBadgeCount() {
    try {
      const count = await Notifications.getBadgeCountAsync();
      console.log(`🔢 Current badge count: ${count}`);
      return count;
    } catch (error) {
      console.error('❌ Error getting badge count:', error);
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
      console.error('❌ Error incrementing badge count:', error);
      return 0;
    }
  }

  /**
   * Clear badge count (set to 0)
   */
  async clearBadgeCount() {
    try {
      await this.setBadgeCount(0);
      console.log('🧹 Badge count cleared');
    } catch (error) {
      console.error('❌ Error clearing badge count:', error);
    }
  }

  /**
   * Clear badge count for specific user role/screen
   * This should be called when users view their relevant screens
   */
  async clearBadgeForUserRole(userRole, screenName) {
    try {
      console.log(`🧹 Clearing badge for ${userRole} on ${screenName} screen`);
      await this.clearBadgeCount();
    } catch (error) {
      console.error('❌ Error clearing role-specific badge:', error);
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
    console.log(`📱 Test notification sent for ${userRole}`);
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
    
    console.log('🧹 Notification listeners cleaned up');
  }
}

// Export a singleton instance
export default new NotificationService();
