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
      
      // Handle different notification types
      if (data?.type === 'new_order') {
        // Navigate to orders screen for truck owners
        console.log('🚚 New order notification tapped');
        // TODO: Add navigation logic
      } else if (data?.type === 'order_status') {
        // Navigate to order tracking for customers
        console.log('📱 Order status notification tapped');
        // TODO: Add navigation logic
      }
    });
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
    if (userType === 'truck_owner') {
      await this.sendLocalNotification(
        '🚚 New Order Received!',
        'New order #ABC123 from John • $24.99'
      );
    } else {
      await this.sendLocalNotification(
        '🔔 Order Ready!',
        'Your order from Taco Truck is ready for pickup!'
      );
    }
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
