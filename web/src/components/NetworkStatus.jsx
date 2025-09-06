import React, { useState, useEffect } from 'react';

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
      console.log('🌐 Network: Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      console.warn('🌐 Network: Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-hide offline message after being online for 3 seconds
    if (isOnline && showOfflineMessage) {
      const timer = setTimeout(() => {
        setShowOfflineMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, showOfflineMessage]);

  if (!showOfflineMessage && isOnline) {
    return null;
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: isOnline ? '#4CAF50' : '#f44336',
        color: 'white',
        padding: '10px',
        textAlign: 'center',
        zIndex: 9999,
        fontSize: '14px',
        transition: 'all 0.3s ease'
      }}
    >
      {isOnline ? (
        '✅ Connection restored - App is back online'
      ) : (
        '⚠️ No internet connection - Some features may not work properly'
      )}
    </div>
  );
};

export default NetworkStatus;
