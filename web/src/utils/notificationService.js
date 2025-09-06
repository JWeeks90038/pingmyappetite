import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, updateDoc, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';
import { db, app, auth } from '../firebase';
import { sendNotificationSMS, validatePhoneNumber, checkTwilioConfig } from './twilioService.js';

// Initialize Firebase Messaging
let messaging = null;

// Track notification analytics
export const trackNotificationEvent = async (eventType, data = {}) => {
  try {
    await addDoc(collection(db, 'notificationAnalytics'), {
      eventType, // 'permission_granted', 'permission_denied', 'notification_received', 'notification_clicked'
      timestamp: serverTimestamp(),
      ...data
    });
    console.log(`📊 Tracked notification event: ${eventType}`);
  } catch (error) {
    console.error('📊 Failed to track notification event:', error);
  }
};

export const initializeFirebaseMessaging = async () => {
  try {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      messaging = getMessaging(app);
      console.log('🔔 Firebase Messaging initialized');
      return messaging;
    } else {
      console.warn('🔔 Push messaging not supported in this browser');
      return null;
    }
  } catch (error) {
    console.error('🔔 Error initializing Firebase Messaging:', error);
    return null;
  }
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async (userId) => {
  try {
    // Validate userId
    if (!userId) {
      console.error('🔔 Cannot request notification permission: userId is required');
      return null;
    }
    
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('🔔 Notification permission granted');
      
      // Track permission granted
      await trackNotificationEvent('permission_granted', { userId });
      
      if (!messaging) {
        messaging = await initializeFirebaseMessaging();
      }
      
      if (messaging) {
        // Check if user is authenticated before getting token
        if (!auth.currentUser) {
          console.error('🔔 User not authenticated, cannot get FCM token');
          return null;
        }
        
        // Wait for the user's ID token to be available
        try {
          const idToken = await auth.currentUser.getIdToken();
          console.log('🔔 User ID token available, proceeding with FCM token request');
        } catch (tokenError) {
          console.error('🔔 Failed to get user ID token:', tokenError);
          return null;
        }
        
        // Check VAPID key configuration
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.error('🔔 VAPID key not configured in environment');
          return null;
        }
        console.log('🔔 VAPID key loaded:', vapidKey.substring(0, 10) + '...');
        
        // Try to get token (temporarily without VAPID key for testing)
        let token;
        try {
          console.log('🔔 Attempting FCM token request with VAPID key...');
          token = await getToken(messaging, {
            vapidKey: vapidKey
          });
        } catch (vapidError) {
          console.warn('🔔 VAPID key failed, trying without VAPID for testing:', vapidError);
          try {
            token = await getToken(messaging);
          } catch (noVapidError) {
            console.error('🔔 FCM token request failed completely:', noVapidError);
            throw noVapidError;
          }
        }
        
        if (token) {
          console.log('🔔 FCM Token received:', token);
          
          // Save token to Firestore
          const saveSuccess = await saveNotificationToken(userId, token);
          
          if (saveSuccess) {
            return token;
          } else {
            console.error('🔔 Failed to save FCM token to Firestore');
            return null;
          }
        } else {
          console.error('🔔 No FCM token received - check VAPID key configuration');
          return null;
        }
      }
    } else {
      console.warn('🔔 Notification permission denied');
      
      // Track permission denied
      await trackNotificationEvent('permission_denied', { userId });
      
      return null;
    }
  } catch (error) {
    console.error('🔔 Error requesting notification permission:', error);
    return null;
  }
};

// Save FCM token to Firestore
export const saveNotificationToken = async (userId, token) => {
  try {
    // Check if user is authenticated
    if (!userId) {
      console.error('🔔 Cannot save token: userId is required');
      return false;
    }
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
      fcmTokenUpdatedAt: serverTimestamp(),
      notificationPermission: 'granted'
    });
    
    console.log('🔔 FCM token saved to Firestore');
    return true;
  } catch (error) {
    console.error('🔔 Error saving FCM token:', error);
    
    // If it's a permission error, try creating the user document
    if (error.code === 'permission-denied' || error.code === 'not-found') {
      try {
        console.log('🔔 Attempting to create user document for token storage');
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
          fcmToken: token,
          fcmTokenUpdatedAt: serverTimestamp(),
          notificationPermission: 'granted'
        }, { merge: true });
        
        console.log('🔔 FCM token saved after creating user document');
        return true;
      } catch (retryError) {
        console.error('🔔 Failed to save token after retry:', retryError);
        return false;
      }
    }
    
    return false;
  }
};

// Setup message listener for foreground notifications
export const setupMessageListener = (callback) => {
  if (!messaging) return null;
  
  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('🔔 Foreground message received:', payload);
    
    // Track notification received
    trackNotificationEvent('notification_received', {
      notificationType: payload.data?.type || 'unknown',
      title: payload.notification?.title
    });
    
    // Show custom notification or handle as needed
    if (callback) {
      callback(payload);
    }
    
    // Create browser notification if page is visible
    if (document.visibilityState === 'visible' && payload.notification) {
      showBrowserNotification(payload.notification);
    }
  });
  
  return unsubscribe;
};

// Show browser notification
export const showBrowserNotification = (notificationData) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon || '/grubana-logo.png',
      image: notificationData.image,
      badge: '/truck-icon.png',
      tag: notificationData.tag || 'grubana-notification',
      requireInteraction: true,
      actions: notificationData.actions || [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Handle notification click based on type
      if (notificationData.clickAction) {
        window.location.href = notificationData.clickAction;
      }
    };
    
    // Auto-close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (userId, preferences) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      notificationPreferences: preferences,
      notificationPreferencesUpdatedAt: serverTimestamp()
    });
    
    console.log('🔔 Notification preferences updated');
  } catch (error) {
    console.error('🔔 Error updating notification preferences:', error);
  }
};

// Remove notification token for user (when logging out or disabling)
export const removeNotificationToken = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: null,
      fcmTokenUpdatedAt: serverTimestamp(),
      notificationPermission: 'default'
    });
    
    console.log('🔔 FCM token removed for user');
  } catch (error) {
    console.error('🔔 Error removing FCM token:', error);
  }
};

// Refresh token (when needed)
export const refreshToken = async (userId) => {
  try {
    if (!messaging) {
      messaging = await initializeFirebaseMessaging();
    }
    
    if (messaging) {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      
      if (token) {
        await saveNotificationToken(userId, token);
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error('🔔 Error refreshing token:', error);
    return null;
  }
};

// Check if user has valid token
export const hasValidToken = async (userId) => {
  try {
    if (!userId) {
      console.warn('🔔 hasValidToken called without userId');
      return false;
    }
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return !!(userData.fcmToken && userData.notificationPermission === 'granted');
    }
    return false;
  } catch (error) {
    console.error('🔔 Error checking token validity:', error);
    return false;
  }
};

// Check user notification preferences for delivery method
export const getUserNotificationPreferences = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const prefs = userData.notificationPreferences || {};
      
      return {
        emailNotifications: prefs.emailNotifications !== false,
        smsNotifications: prefs.smsNotifications !== false,
        email: userData.email,
        phone: userData.phone,
        hasValidPhone: !!(userData.phone && userData.phone.length > 0),
        hasValidEmail: !!(userData.email && userData.email.length > 0)
      };
    }
    
    return null;
  } catch (error) {
    console.error('🔔 Error getting user notification preferences:', error);
    return null;
  }
};

// Send email notification via Formspree
const sendEmailViaFormspree = async (userEmail, title, message, data = {}) => {
  try {
    // Use your existing Formspree form ID for notifications
    // Replace with your actual form ID or create a new one for notifications
    const response = await fetch('https://formspree.io/f/mpwlvzaj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: userEmail,
        subject: title,
        message: message,
        notification_data: JSON.stringify(data),
        _subject: title,
        notification_type: 'grubana_notification',
        _replyto: 'noreply@grubana.com'
      }),
    });

    if (!response.ok) {
      throw new Error(`Formspree email request failed: ${response.status}`);
    }

    console.log('📧 Email notification sent via Formspree to:', userEmail);
    return { success: true, method: 'email' };
  } catch (error) {
    console.error('📧 Error sending email via Formspree:', error);
    return { success: false, error: error.message, method: 'email' };
  }
};

// Send SMS notification via Twilio
const sendSMSViaTwilio = async (userPhone, title, message, data = {}) => {
  try {
    // Check if Twilio is configured
    const twilioConfig = checkTwilioConfig();
    if (!twilioConfig.configured) {
      console.warn('📱 Twilio not configured, skipping SMS');
      return { success: false, error: 'Twilio not configured', method: 'sms' };
    }
    
    // Validate phone number
    if (!validatePhoneNumber(userPhone)) {
      throw new Error('Invalid phone number format');
    }
    
    // Send SMS using Twilio service
    const result = await sendNotificationSMS(userPhone, title, message, data);
    
    if (result.success) {
      console.log('📱 SMS notification sent via Twilio to:', userPhone);
    } else {
      console.error('📱 Failed to send SMS via Twilio:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.error('📱 Error sending SMS via Twilio:', error);
    return { success: false, error: error.message, method: 'sms' };
  }
};

// Send notification via preferred method (email, SMS, or push)
export const sendNotificationViaPreferredMethod = async (userId, notificationData) => {
  try {
    const preferences = await getUserNotificationPreferences(userId);
    
    if (!preferences) {
      console.error('🔔 No user preferences found for notification delivery');
      return false;
    }

    const { title, message, data = {} } = notificationData;
    const results = [];
    
    // Send email if enabled and user has valid email
    if (preferences.emailNotifications && preferences.hasValidEmail && preferences.email) {
      const emailResult = await sendEmailViaFormspree(preferences.email, title, message, data);
      results.push(emailResult);
    }
    
    // Send SMS if enabled and user has valid phone
    if (preferences.smsNotifications && preferences.hasValidPhone && preferences.phone) {
      const smsResult = await sendSMSViaTwilio(preferences.phone, title, message, data);
      results.push(smsResult);
    }
    
    // Always try push notification if any notification is enabled
    if (preferences.emailNotifications || preferences.smsNotifications) {
      // This would be handled by Firebase Cloud Functions
      console.log('📱 Push notification will be sent via Firebase Functions');
      results.push({ success: true, method: 'push', note: 'Handled by Firebase Functions' });
    }
    
    console.log('🔔 Notification delivery results for user:', userId, results);
    
    // Return true if at least one method succeeded
    return results.some(result => result.success);
  } catch (error) {
    console.error('🔔 Error sending notification via preferred method:', error);
    return false;
  }
};

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  favoriteNearby: true,        // Favorite trucks come nearby
  favoriteDrops: true,         // Favorite trucks create drops
  newTrucksNearby: true,       // New trucks in area
  popularDrops: true,          // Popular drops in area
  pingsInArea: false,          // When someone pings nearby (might be too noisy)
  weeklyDigest: true,          // Weekly summary
  marketing: false             // Marketing and promotional notifications
};

// Disable notifications for user
export const disableNotifications = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: null,
      notificationPermission: 'denied',
      notificationPreferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        favoriteNearby: false,
        favoriteDrops: false,
        newTrucksNearby: false,
        popularDrops: false,
        weeklyDigest: false
      },
      notificationsDisabledAt: serverTimestamp()
    });
    
    console.log('🔔 Notifications disabled for user');
  } catch (error) {
    console.error('🔔 Error disabling notifications:', error);
  }
};

// Export a service object with all functions
export const notificationService = {
  initializeFirebaseMessaging,
  requestNotificationPermission,
  saveNotificationToken,
  setupMessageListener,
  showBrowserNotification,
  removeNotificationToken,
  refreshToken,
  hasValidToken,
  trackNotificationEvent,
  updateNotificationPreferences,
  disableNotifications,
  DEFAULT_NOTIFICATION_PREFERENCES
};
