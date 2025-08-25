import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import './NotificationBanner.css';

const NotificationBanner = () => {
  const { user, userRole } = useAuth();
  const { isEnabled, permissionState, loading } = useNotifications();

  // Only show for customers
  if (!user || userRole !== 'customer' || loading) {
    return null;
  }

  // Don't show if notifications are enabled
  if (isEnabled) {
    return null;
  }

  // Don't show if user explicitly denied permissions
  if (permissionState === 'denied') {
    return null;
  }

  return (
    <div className="notification-banner">
      <div className="notification-banner-content">
        <div className="notification-banner-icon">
          🔔
        </div>
        <div className="notification-banner-text">
          <strong>Stay in the loop!</strong>
          <p>Get notified when your favorite trucks are nearby or drop new deals.</p>
        </div>
        <div className="notification-banner-actions">
          <Link to="/notifications" className="notification-banner-btn">
            Enable Notifications
          </Link>
          <button 
            className="notification-banner-dismiss"
            onClick={() => {
              // Store dismissal in localStorage
              localStorage.setItem('notification-banner-dismissed', 'true');
              // Hide the banner
              document.querySelector('.notification-banner')?.remove();
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner;
