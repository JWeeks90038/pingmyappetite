import React, { useState, useEffect, createContext, useContext } from 'react';
import { LoadScript } from '@react-google-maps/api';

const LIBRARIES = ['places', 'visualization'];

// Create a context for Google Maps loading state
const GoogleMapsContext = createContext({
  isLoaded: false,
  loadError: null
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

const MobileGoogleMapsWrapper = ({ children, googleMapsApiKey, libraries = LIBRARIES, ...props }) => {
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Detect mobile device more accurately
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOSSafari = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    
    setIsMobile(isMobileDevice);
    
    if (isMobileDevice) {
      console.log('📱 Mobile device detected:', { isIOSSafari, userAgent: userAgent.slice(0, 50) });
    }

    // On mobile, especially iOS Safari, manually load Google Maps to avoid LoadScript issues
    if (isMobileDevice && googleMapsApiKey) {
      loadGoogleMapsManually();
    }
  }, [googleMapsApiKey]);

  const loadGoogleMapsManually = async () => {
    try {
      console.log('� Manually loading Google Maps for mobile device...');
      
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('✅ Google Maps already loaded');
        setMapsLoaded(true);
        setIsLoading(false);
        return;
      }

      // Remove any existing Google Maps scripts to avoid conflicts
      const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      existingScripts.forEach(script => {
        console.log('🧹 Removing existing Google Maps script');
        script.remove();
      });

      // Create and inject the Google Maps script manually
      const script = document.createElement('script');
      const librariesParam = libraries.join(',');
      
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=${librariesParam}&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      // Create a global callback for when maps loads
      window.initGoogleMaps = () => {
        console.log('✅ Google Maps loaded manually');
        setMapsLoaded(true);
        setMapsError(null);
        setIsLoading(false);
        
        // Clean up the global callback
        delete window.initGoogleMaps;
      };

      script.onerror = (error) => {
        console.error('❌ Manual Google Maps loading failed:', error);
        setMapsError(error);
        setIsLoading(false);
      };

      // Add a timeout in case the callback never fires
      const timeout = setTimeout(() => {
        if (!mapsLoaded) {
          console.error('⏱️ Google Maps loading timeout');
          setMapsError(new Error('Google Maps loading timeout'));
          setIsLoading(false);
        }
      }, 15000); // 15 second timeout

      script.onload = () => {
        clearTimeout(timeout);
      };

      document.head.appendChild(script);
      
    } catch (error) {
      console.error('💥 Error in manual Google Maps loading:', error);
      setMapsError(error);
      setIsLoading(false);
    }
  };

  const handleMapsLoad = () => {
    console.log('🗺️ Google Maps loaded via LoadScript');
    setMapsLoaded(true);
    setMapsError(null);
    setIsLoading(false);
  };

  const handleMapsError = (error) => {
    console.error('🗺️ LoadScript error:', error);
    setMapsError(error);
    setIsLoading(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #2c6f57',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '15px', color: '#666' }}>
          {isMobile ? 'Loading Mobile Maps...' : 'Loading Maps...'}
        </p>
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

  // Error state with retry option
  if (mapsError) {
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false, loadError: mapsError }}>
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
          {isMobile && (
            <p><small>This sometimes happens on mobile browsers. The app will still work without maps.</small></p>
          )}
          <button 
            onClick={() => {
              setMapsError(null);
              setIsLoading(true);
              if (isMobile) {
                loadGoogleMapsManually();
              } else {
                window.location.reload();
              }
            }}
            style={{
              backgroundColor: '#2c6f57',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Try Again
          </button>
          <button 
            onClick={() => setMapsError(null)}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Continue Without Maps
          </button>
          <div style={{ marginTop: '20px' }}>
            {children}
          </div>
        </div>
      </GoogleMapsContext.Provider>
    );
  }

  // Success state - provide context to children
  const contextValue = {
    isLoaded: mapsLoaded,
    loadError: null
  };

  // For mobile devices that loaded manually, don't use LoadScript wrapper
  if (isMobile && mapsLoaded) {
    return (
      <GoogleMapsContext.Provider value={contextValue}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  // For desktop or mobile fallback, use LoadScript
  return (
    <LoadScript
      googleMapsApiKey={googleMapsApiKey}
      libraries={libraries}
      onLoad={handleMapsLoad}
      onError={handleMapsError}
      {...props}
    >
      <GoogleMapsContext.Provider value={contextValue}>
        {children}
      </GoogleMapsContext.Provider>
    </LoadScript>
  );
};

export default MobileGoogleMapsWrapper;
