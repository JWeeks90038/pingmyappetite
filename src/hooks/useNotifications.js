import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../utils/notificationService';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function useNotifications() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [preferences, setPreferences] = useState({
    favoriteTrucks: true,
    deals: true,
    weeklyDigest: false
  });
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] = useState('default');

  // Initialize notification status and preferences
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    initializeNotifications();
  }, [user]);

  const initializeNotifications = async () => {
    try {
      setLoading(true);

      // Check browser notification permission
      const permission = await Notification.permission;
      setPermissionState(permission);

      // Load user preferences from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userPrefs = userData.notificationPreferences || {};
        
        setPreferences(prev => ({
          ...prev,
          ...userPrefs
        }));
        
        // Check if notifications are enabled (has permission + has preferences set)
        const hasValidToken = await notificationService.hasValidToken();
        setIsEnabled(permission === 'granted' && hasValidToken);
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const enableNotifications = async () => {
    try {
      setLoading(true);

      // Request permission and get token
      const success = await notificationService.requestNotificationPermission();
      
      if (success) {
        // Update permission state
        setPermissionState('granted');
        setIsEnabled(true);

        // Save preferences to Firestore
        await updateUserPreferences(preferences);

        // Set up message listener
        notificationService.setupMessageListener((payload) => {
          console.log('Received foreground notification:', payload);
          // Handle foreground notifications if needed
        });

        return true;
      } else {
        setPermissionState('denied');
        return false;
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    try {
      setLoading(true);

      // Remove token from server
      await notificationService.removeNotificationToken();
      
      setIsEnabled(false);
      
      // Update user preferences in Firestore to disable all notifications
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        'notificationPreferences.favoriteTrucks': false,
        'notificationPreferences.deals': false,
        'notificationPreferences.weeklyDigest': false
      });

      return true;
    } catch (error) {
      console.error('Error disabling notifications:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateUserPreferences = async (newPreferences) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        notificationPreferences: newPreferences
      });
      
      setPreferences(newPreferences);
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  };

  const updatePreference = async (key, value) => {
    const newPreferences = {
      ...preferences,
      [key]: value
    };

    const success = await updateUserPreferences(newPreferences);
    return success;
  };

  const testNotification = async () => {
    if (!isEnabled) return false;

    try {
      // Send a test notification through the service worker
      if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Test Notification', {
          body: 'This is a test notification from Grubana!',
          icon: '/grubana-logo.png',
          badge: '/grubana-logo.png',
          tag: 'test-notification',
          requireInteraction: false,
          actions: [
            {
              action: 'view',
              title: 'View App'
            }
          ]
        });
        return true;
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  };

  const refreshToken = async () => {
    try {
      const success = await notificationService.refreshToken();
      if (success) {
        const hasValidToken = await notificationService.hasValidToken();
        setIsEnabled(permissionState === 'granted' && hasValidToken);
      }
      return success;
    } catch (error) {
      console.error('Error refreshing notification token:', error);
      return false;
    }
  };

  return {
    isEnabled,
    preferences,
    loading,
    permissionState,
    enableNotifications,
    disableNotifications,
    updatePreference,
    testNotification,
    refreshToken,
    initializeNotifications
  };
}

// Hook for getting notification statistics (for admin/analytics)
export function useNotificationStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    enabledUsers: 0,
    sentToday: 0,
    sentThisWeek: 0,
    deliveryRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotificationStats();
  }, []);

  const loadNotificationStats = async () => {
    try {
      setLoading(true);
      
      // This would typically fetch from a Cloud Function or admin endpoint
      // For now, we'll use placeholder data
      const mockStats = {
        totalUsers: 1250,
        enabledUsers: 890,
        sentToday: 45,
        sentThisWeek: 312,
        deliveryRate: 92.5
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading notification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    loading,
    refreshStats: loadNotificationStats
  };
}
