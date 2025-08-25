import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
      messaging = getMessaging();
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
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('🔔 Notification permission granted');
      
      // Track permission granted
      await trackNotificationEvent('permission_granted', { userId });
      
      if (!messaging) {
        messaging = await initializeFirebaseMessaging();
      }
      
      if (messaging) {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });
        
        if (token) {
          console.log('🔔 FCM Token received:', token);
          
          // Save token to Firestore
          await saveNotificationToken(userId, token);
          
          return token;
        } else {
          console.error('🔔 No FCM token received');
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
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
      fcmTokenUpdatedAt: serverTimestamp(),
      notificationPermission: 'granted'
    });
    
    console.log('🔔 FCM token saved to Firestore');
  } catch (error) {
    console.error('🔔 Error saving FCM token:', error);
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
