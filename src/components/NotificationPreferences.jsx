import React, { useState, useEffect } from 'react';
import { useAuthContext } from './AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  requestNotificationPermission, 
  disableNotifications,
  updateNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES 
} from '../utils/notificationService';
import './NotificationPreferences.css';

const NotificationPreferences = () => {
  const { user, userRole } = useAuthContext();
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Only show for customers
  if (userRole !== 'customer') {
    return null;
  }

  useEffect(() => {
    loadNotificationSettings();
    checkBrowserPermission();
  }, [user?.uid]);

  const checkBrowserPermission = () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const loadNotificationSettings = async () => {
    if (!user?.uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setPreferences(userData.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES);
        setFcmToken(userData.fcmToken || null);
        setNotificationPermission(userData.notificationPermission || 'default');
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    setSaving(true);
    try {
      const token = await requestNotificationPermission(user.uid);
      if (token) {
        setFcmToken(token);
        setNotificationPermission('granted');
        setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        
        // Show success message
        showNotificationMessage('🔔 Notifications enabled! You\'ll now receive alerts about your favorite trucks and deals.', 'success');
      } else {
        showNotificationMessage('❌ Unable to enable notifications. Please check your browser settings.', 'error');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      showNotificationMessage('❌ Error enabling notifications. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableNotifications = async () => {
    setSaving(true);
    try {
      await disableNotifications(user.uid);
      setFcmToken(null);
      setNotificationPermission('denied');
      setPreferences({
        ...preferences,
        favoriteNearby: false,
        favoriteDrops: false,
        newTrucksNearby: false,
        popularDrops: false,
        weeklyDigest: false
      });
      
      showNotificationMessage('🔕 Notifications disabled.', 'info');
    } catch (error) {
      console.error('Error disabling notifications:', error);
      showNotificationMessage('❌ Error disabling notifications. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = async (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    try {
      await updateNotificationPreferences(user.uid, newPreferences);
    } catch (error) {
      console.error('Error updating preferences:', error);
      // Revert on error
      setPreferences(preferences);
    }
  };

  const showNotificationMessage = (message, type) => {
    // Simple notification display - you can enhance this
    const notification = document.createElement('div');
    notification.className = `notification-message ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  };

  if (loading) {
    return (
      <div className="notification-preferences loading">
        <p>Loading notification settings...</p>
      </div>
    );
  }

  const isEnabled = notificationPermission === 'granted' && fcmToken;

  return (
    <div className="notification-preferences">
      <div className="notification-header">
        <h3>🔔 Push Notifications</h3>
        <p>Get notified when your favorite trucks are nearby or offering deals!</p>
      </div>

      {/* Enable/Disable Section */}
      <div className="notification-toggle">
        {!isEnabled ? (
          <div className="enable-section">
            <div className="enable-info">
              <h4>📱 Enable Notifications</h4>
              <p>Never miss your favorite food trucks or exclusive deals!</p>
              <ul className="benefits-list">
                <li>🚛 Get alerted when favorite trucks are nearby</li>
                <li>🎯 First to know about exclusive drops & deals</li>
                <li>📍 Discover new trucks in your area</li>
                <li>📊 Weekly digest of local food truck activity</li>
              </ul>
            </div>
            <button 
              className="enable-btn"
              onClick={handleEnableNotifications}
              disabled={saving}
            >
              {saving ? 'Enabling...' : '🔔 Enable Notifications'}
            </button>
          </div>
        ) : (
          <div className="enabled-section">
            <div className="status-indicator">
              <span className="status-dot enabled"></span>
              <strong>Notifications Enabled</strong>
            </div>
            <button 
              className="disable-btn"
              onClick={handleDisableNotifications}
              disabled={saving}
            >
              {saving ? 'Disabling...' : '🔕 Disable All'}
            </button>
          </div>
        )}
      </div>

      {/* Preference Settings */}
      {isEnabled && (
        <div className="preference-settings">
          <h4>🎛️ Notification Preferences</h4>
          
          <div className="preference-group">
            <h5>🚛 Favorite Trucks</h5>
            
            <div className="preference-item">
              <label className="preference-label">
                <input
                  type="checkbox"
                  checked={preferences.favoriteNearby}
                  onChange={(e) => handlePreferenceChange('favoriteNearby', e.target.checked)}
                />
                <span className="checkmark"></span>
                <div className="preference-text">
                  <strong>📍 Nearby Alerts</strong>
                  <p>When favorite trucks come within 5 miles</p>
                </div>
              </label>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                <input
                  type="checkbox"
                  checked={preferences.favoriteDrops}
                  onChange={(e) => handlePreferenceChange('favoriteDrops', e.target.checked)}
                />
                <span className="checkmark"></span>
                <div className="preference-text">
                  <strong>🎯 Exclusive Deals</strong>
                  <p>When favorite trucks create drops & specials</p>
                </div>
              </label>
            </div>
          </div>

          <div className="preference-group">
            <h5>🗺️ Local Discovery</h5>
            
            <div className="preference-item">
              <label className="preference-label">
                <input
                  type="checkbox"
                  checked={preferences.newTrucksNearby}
                  onChange={(e) => handlePreferenceChange('newTrucksNearby', e.target.checked)}
                />
                <span className="checkmark"></span>
                <div className="preference-text">
                  <strong>🆕 New Trucks</strong>
                  <p>When new trucks start operating nearby</p>
                </div>
              </label>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                <input
                  type="checkbox"
                  checked={preferences.popularDrops}
                  onChange={(e) => handlePreferenceChange('popularDrops', e.target.checked)}
                />
                <span className="checkmark"></span>
                <div className="preference-text">
                  <strong>🔥 Popular Deals</strong>
                  <p>Trending drops and specials in your area</p>
                </div>
              </label>
            </div>
          </div>

          <div className="preference-group">
            <h5>📊 Summaries</h5>
            
            <div className="preference-item">
              <label className="preference-label">
                <input
                  type="checkbox"
                  checked={preferences.weeklyDigest}
                  onChange={(e) => handlePreferenceChange('weeklyDigest', e.target.checked)}
                />
                <span className="checkmark"></span>
                <div className="preference-text">
                  <strong>📰 Weekly Digest</strong>
                  <p>Summary of food truck activity in your area</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Information Section */}
      <div className="notification-info">
        <h4>ℹ️ About Notifications</h4>
        <ul>
          <li>🔒 Your location is only used to find nearby trucks</li>
          <li>⚡ Notifications are sent instantly when triggers occur</li>
          <li>🎯 Only relevant, personalized alerts based on your preferences</li>
          <li>🔕 You can disable or customize notifications anytime</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationPreferences;
