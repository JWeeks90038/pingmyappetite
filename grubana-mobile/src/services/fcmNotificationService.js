/**
 * FCM Notification Service - Expo Compatible
 * 
 * This service works with the current Expo environment and is ready for future migration
 */

import { Platform } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

class FCMNotificationService {
  constructor() {
    this.fcmToken = null;
    this.notificationListener = null;
    this.messageListener = null;
    this.isInitialized = false;
  }

  /**
   * Check if running in Expo environment
   */
  isExpoEnvironment() {
    try {
      // Simple check for Expo environment
      return !!global.expo || !!global.__expo;
    } catch (e) {
      return true; // Default to true for current development
    }
  }

  /**
   * Initialize FCM notifications - Expo version
   */
  async initialize(userId) {
    if (!userId) {
 
      return false;
    }

    try {

      
      // Use Expo notifications for current development
      return await this.initializeExpoNotifications(userId);
      
    } catch (error) {

      return false;
    }
  }

  /**
   * Initialize notifications in Expo environment
   */
  async initializeExpoNotifications(userId) {
    try {
      // Check if user needs token refresh
      await this.checkAndHandleTokenRefresh(userId);
      
      // Import Expo notifications dynamically to avoid compile errors
      const Notifications = await import('expo-notifications');
      const Device = await import('expo-device');

      // Configure notification handler
      Notifications.default.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      if (!Device.default.isDevice) {

        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.default.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.default.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {

        return false;
      }

  

      // Try to get Firebase FCM token first (for future compatibility)
      let fcmToken = null;
      
      try {
        // Try using Firebase messaging directly (this will work when app is ejected)
        const { getMessaging, getToken } = await import('firebase/messaging');
        const messaging = getMessaging();
        fcmToken = await getToken(messaging);

      } catch (firebaseError) {
    
        
        // Fallback to Expo token (current development setup)
        try {
          const tokenResponse = await Notifications.default.getDevicePushTokenAsync();
          fcmToken = tokenResponse.data || tokenResponse;
    
        } catch (expoError) {
    
          return false;
        }
      }

      // Validate token
      if (!fcmToken || typeof fcmToken !== 'string') {
      
        return false;
      }
      
      // Log token type for debugging
      if (fcmToken.startsWith('ExponentPushToken[')) {
    
      } else if (fcmToken.length > 100 && fcmToken.includes(':')) {
    
      } else {

      }

      this.fcmToken = fcmToken;

      // Save token to Firestore
      await this.saveTokenToFirestore(userId, fcmToken);
      
      // Set up listeners
      this.setupExpoListeners(Notifications.default);
      
      this.isInitialized = true;
 
      return true;

    } catch (error) {
   
      return false;
    }
  }

  /**
   * Set up notification listeners for Expo environment
   */
  setupExpoListeners(Notifications) {
    try {
      // Listen for notifications received while app is in foreground
      this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
   
        this.incrementBadgeCount();
      });

      // Listen for notification responses (when user taps notification)
      this.messageListener = Notifications.addNotificationResponseReceivedListener(response => {
   
        this.clearBadgeCount();
        this.handleNotificationResponse(response.notification.request.content.data);
      });
    } catch (error) {

    }
  }

  /**
   * Handle notification tap/response
   */
  handleNotificationResponse(data) {
    if (data?.type === 'new_order') {

      // TODO: Navigate to orders screen

      // TODO: Navigate to order tracking
    }
  }
  handleNotificationResponse(data) {
    if (data?.type === 'new_order') {

      // TODO: Navigate to orders screen
    } else if (data?.type === 'order_status') {
  
      // TODO: Navigate to order tracking
    }
  }

  /**
   * Save FCM token to user's Firestore document
   */
  async saveTokenToFirestore(userId, token) {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Determine token type for better compatibility
      const isExpoToken = token && token.startsWith('ExponentPushToken[');
      const tokenType = isExpoToken ? 'expo' : 'fcm';
      

      
      const updateData = {
        fcmToken: token, // Always save as fcmToken for backend compatibility
        fcmTokenUpdatedAt: new Date(),
        notificationPermission: 'granted',
        platform: Platform.OS,
        tokenType: tokenType, // Track what type of token this is
        notificationPreferences: {
          push: true,
          sms: false,
          email: true
        }
      };
      
      // Also save as expoPushToken if it's an Expo token
      if (isExpoToken) {
        updateData.expoPushToken = token;
      }
      
      await updateDoc(userRef, updateData);
      

    } catch (error) {
   
      throw error;
    }
  }

  /**
   * Badge count management (Expo compatible)
   */
  async setBadgeCount(count) {
    try {
      // Use dynamic import to avoid compile errors
      const Notifications = await import('expo-notifications');
      await Notifications.default.setBadgeCountAsync(count);

    } catch (error) {

    }
  }

  async getBadgeCount() {
    try {
      const Notifications = await import('expo-notifications');
      return await Notifications.default.getBadgeCountAsync();
    } catch (error) {
  
      return 0;
    }
  }

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

  async clearBadgeCount() {
    try {
      await this.setBadgeCount(0);

    } catch (error) {

    }
  }

  /**
   * Send local notification for testing
   */
  async sendLocalNotification(title, body, data = {}) {
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.default.scheduleNotificationAsync({
        content: { title, body, data },
        trigger: null,
      });

    } catch (error) {

    }
  }

  /**
   * Test notifications
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
   * Get notification preferences
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
      
      return { push: true, sms: false, email: true };
    } catch (error) {
   
      return { push: true, sms: false, email: true };
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
   * Clean up listeners
   */
  cleanup() {
    try {
      if (this.notificationListener) {
        // Use dynamic import for cleanup
        import('expo-notifications').then(Notifications => {
          Notifications.default.removeNotificationSubscription(this.notificationListener);
        });
      }
      
      if (this.messageListener) {
        import('expo-notifications').then(Notifications => {
          Notifications.default.removeNotificationSubscription(this.messageListener);
        });
      }
      
      this.isInitialized = false;
 
    } catch (error) {

    }
  }

  /**
   * Check if user needs token refresh and handle it
   */
  async checkAndHandleTokenRefresh(userId) {
    try {
 
      
      // Get user document to check refresh flag
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {

        return;
      }
      
      const userData = userDoc.data();
      
      // Check if refresh is required
      if (userData.fcmTokenRefreshRequired) {
  
        
        // Clear current token to force regeneration
        this.fcmToken = null;
        
        // Clear the refresh flag and old token from database
        await updateDoc(userDocRef, {
          fcmTokenRefreshRequired: false,
          fcmToken: null, // Clear old token
          fcmTokenRefreshedAt: new Date(),
        });
        

      } else {

      }
      
    } catch (error) {
 
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasToken: !!this.fcmToken,
      platform: Platform.OS,
      environment: 'expo'
    };
  }
}

// Export a singleton instance
export default new FCMNotificationService();
