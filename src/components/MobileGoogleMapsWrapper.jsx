import React, { useState, useEffect } from 'react';
import { LoadScript } from '@react-google-maps/api';

const LIBRARIES = ['places', 'visualization'];

const MobileGoogleMapsWrapper = ({ children, googleMapsKey }) => {
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    setIsMobile(mobile);
    
    if (mobile) {
      console.log('📱 Mobile device detected, using mobile-optimized Google Maps loading');
    }
  }, []);

  const handleMapsLoad = () => {
    console.log('🗺️ Google Maps loaded successfully');
    setMapsLoaded(true);
    setMapsError(null);
  };

  const handleMapsError = (error) => {
    console.error('🗺️ Google Maps loading error:', error);
    setMapsError(error);
    setMapsLoaded(false);
  };

  // If there's a Maps error on mobile, show a fallback
  if (mapsError && isMobile) {
    return (
      <div style={{
        padding: '20px',
        margin: '20px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h3>📍 Maps Temporarily Unavailable</h3>
        <p>We're having trouble loading maps on your device.</p>
        <p>The app will work without maps, but some location features may be limited.</p>
        <button 
          onClick={() => {
            setMapsError(null);
            window.location.reload();
          }}
          style={{
            backgroundColor: '#2c6f57',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
        <div style={{ marginTop: '20px' }}>
          {children}
        </div>
      </div>
    );
  }

  // For mobile devices, add extra error handling and loading strategies
  if (isMobile) {
    return (
      <LoadScript
        googleMapsApiKey={googleMapsKey}
        libraries={LIBRARIES}
        onLoad={handleMapsLoad}
        onError={handleMapsError}
        loadingElement={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            flexDirection: 'column'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #2c6f57',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ marginTop: '15px', color: '#666' }}>Loading Maps...</p>
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        }
        // Mobile-specific options
        preventGoogleFontsLoading={true}
        region="US"
        language="en"
      >
        {children}
      </LoadScript>
    );
  }

  // For desktop, use standard loading
  return (
    <LoadScript
      googleMapsApiKey={googleMapsKey}
      libraries={LIBRARIES}
      onLoad={handleMapsLoad}
      onError={handleMapsError}
      loadingElement={<div>Loading Maps...</div>}
    >
      {children}
    </LoadScript>
  );
};

export default MobileGoogleMapsWrapper;
