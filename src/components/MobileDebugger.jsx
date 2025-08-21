import React, { useEffect, useState } from 'react';

const MobileDebugger = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      return mobileRegex.test(userAgent);
    };

    setIsMobile(checkMobile());

    // Global error handler
    const handleError = (error) => {
      console.error('🚨 Global Error:', error);
      setErrors(prev => [...prev, {
        message: error.message || 'Unknown error',
        stack: error.stack,
        timestamp: new Date().toISOString()
      }]);
    };

    // Global unhandled rejection handler
    const handleRejection = (event) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
      setErrors(prev => [...prev, {
        message: `Promise Rejection: ${event.reason?.message || event.reason}`,
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      }]);
    };

    // Add error listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Check for basic mobile compatibility
    const checkCompatibility = () => {
      const issues = [];
      
      if (!window.fetch) {
        issues.push('Fetch API not supported');
      }
      
      if (!window.Promise) {
        issues.push('Promise not supported');
      }
      
      if (!window.localStorage) {
        issues.push('LocalStorage not supported');
      }

      if (!navigator.geolocation) {
        issues.push('Geolocation not supported');
      }

      if (issues.length > 0) {
        setErrors(prev => [...prev, {
          message: `Compatibility Issues: ${issues.join(', ')}`,
          timestamp: new Date().toISOString()
        }]);
      }
    };

    checkCompatibility();
    
    // Set loading to false after a short delay
    setTimeout(() => setIsLoading(false), 2000);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // If we're on mobile and have errors, show debug info
  if (isMobile && errors.length > 0) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        padding: '20px',
        overflow: 'auto',
        zIndex: 10000,
        fontFamily: 'Arial, sans-serif'
      }}>
        <h2 style={{ color: 'red' }}>Mobile Debug Info</h2>
        <p><strong>Device:</strong> Mobile</p>
        <p><strong>User Agent:</strong> {navigator.userAgent}</p>
        <p><strong>Errors Found:</strong> {errors.length}</p>
        
        <h3>Errors:</h3>
        {errors.map((error, index) => (
          <div key={index} style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '10px'
          }}>
            <p><strong>Time:</strong> {new Date(error.timestamp).toLocaleString()}</p>
            <p><strong>Message:</strong> {error.message}</p>
            {error.stack && (
              <details>
                <summary>Stack Trace</summary>
                <pre style={{ fontSize: '10px', overflow: 'auto' }}>{error.stack}</pre>
              </details>
            )}
          </div>
        ))}
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Reload App
        </button>
      </div>
    );
  }

  // If mobile and still loading, show loading screen
  if (isMobile && isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #2c6f57',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '20px', color: '#666' }}>Loading Grubana...</p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // If everything is fine, render children
  return children;
};

export default MobileDebugger;
