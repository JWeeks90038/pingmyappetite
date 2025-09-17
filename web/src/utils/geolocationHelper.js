/**
 * Bulletproof geolocation helper that NEVER fails
 * Uses multiple strategies to guarantee location acquisition
 */

export const isGeolocationSupported = () => {
  return 'geolocation' in navigator;
};

export const isSecureContext = () => {
  return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
};

// IP-based geolocation fallback
const getLocationFromIP = async () => {
  try {
    console.log('🌐 Attempting IP-based geolocation...');
    
    // Try multiple IP geolocation services
    const services = [
      'https://ipapi.co/json/',
      'https://ip-api.com/json/',
      'https://ipinfo.io/json'
    ];
    
    for (const service of services) {
      try {
        const response = await fetch(service);
        const data = await response.json();
        
        let lat, lng;
        if (data.latitude && data.longitude) {
          lat = data.latitude;
          lng = data.longitude;
        } else if (data.lat && data.lon) {
          lat = data.lat;
          lng = data.lon;
        } else if (data.loc) {
          [lat, lng] = data.loc.split(',').map(Number);
        }
        
        if (lat && lng) {
          console.log(`✅ IP geolocation successful from ${service}:`, { lat, lng });
          return {
            coords: {
              latitude: lat,
              longitude: lng,
              accuracy: 10000 // Lower accuracy for IP-based location
            },
            timestamp: Date.now(),
            source: 'ip'
          };
        }
      } catch (error) {
        console.log(`❌ IP service ${service} failed:`, error.message);
        continue;
      }
    }
    
    throw new Error('All IP geolocation services failed');
  } catch (error) {
    console.log('❌ IP geolocation failed:', error.message);
    return null;
  }
};

// Enhanced permission request
const requestGeolocationPermission = async () => {
  try {
    if (!navigator.permissions) {
      console.log('⚠️ Permissions API not supported');
      return 'prompt'; // Assume we need to prompt
    }
    
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    console.log('🔒 Current geolocation permission:', permission.state);
    return permission.state;
  } catch (error) {
    console.log('⚠️ Permission query failed:', error.message);
    return 'prompt';
  }
};

// Enhanced browser geolocation with accuracy validation and GPS warm-up
const getBrowserGeolocationWithAccuracy = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    let bestPosition = null;
    let attempts = 0;
    const maxAttempts = 8; // Reduced for faster response
    let hasResolvedEarly = false;
    
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // Reduced from 30s to 15s to work with shared geolocation timeout
      maximumAge: 0
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    console.log('🎯 Requesting ultra-precise geolocation with validation:', finalOptions);
    
    // GPS warm-up: Start with a quick getCurrentPosition to wake up GPS
    navigator.geolocation.getCurrentPosition(
      (warmupPosition) => {
        console.log('🔥 GPS warm-up reading:', warmupPosition.coords.accuracy + 'm');
        bestPosition = warmupPosition;
      },
      (error) => {
        console.log('🔥 GPS warm-up failed, proceeding with watchPosition');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    
    // Wait longer for GPS to warm up and get a proper satellite lock
    setTimeout(() => {
      const watchId = navigator.geolocation.watchPosition(
      (position) => {
        attempts++;
        const accuracy = position.coords.accuracy;
        console.log(`🛰️ GPS reading ${attempts}: accuracy ${accuracy}m`, position.coords);
        
        // Reject very poor readings (over 1000m) completely - force GPS to try again
        if (accuracy > 1000) {
          console.log('❌ GPS accuracy too poor, forcing retry');
          return; // Don't count this reading, force GPS to try again
        }
        
        // Accept immediately if very accurate (under 25m)
        if (accuracy <= 25) {
          console.log('🎯 Excellent accuracy achieved, using position');
          navigator.geolocation.clearWatch(watchId);
          if (!hasResolvedEarly) {
            hasResolvedEarly = true;
            resolve({
              coords: position.coords,
              timestamp: position.timestamp,
              source: 'gps-excellent'
            });
          }
          return;
        }
        
        // Store if it's the best we've seen
        if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
          console.log('🎯 New best position stored with accuracy:', accuracy);
        }
        
        // Accept if very good accuracy (under 50m) after 3 attempts
        if (accuracy <= 50 && attempts >= 3) {
          console.log('🎯 Very good accuracy achieved after multiple attempts');
          navigator.geolocation.clearWatch(watchId);
          if (!hasResolvedEarly) {
            hasResolvedEarly = true;
            resolve({
              coords: position.coords,
              timestamp: position.timestamp,
              source: 'gps-very-good'
            });
          }
          return;
        }
        
        // Accept if good accuracy (under 100m) after 5 attempts
        if (accuracy <= 100 && attempts >= 5) {
          console.log('🎯 Good accuracy achieved after many attempts');
          navigator.geolocation.clearWatch(watchId);
          if (!hasResolvedEarly) {
            hasResolvedEarly = true;
            resolve({
              coords: position.coords,
              timestamp: position.timestamp,
              source: 'gps-good'
            });
          }
          return;
        }
        
        // Use best position after max attempts if accuracy is reasonable (under 500m)
        if (attempts >= 8) {
          console.log('🎯 Max attempts reached, checking best position:', bestPosition?.coords.accuracy);
          navigator.geolocation.clearWatch(watchId);
          if (bestPosition && bestPosition.coords.accuracy <= 500 && !hasResolvedEarly) {
            console.log('🎯 Using best available position with acceptable accuracy');
            hasResolvedEarly = true;
            resolve({
              coords: bestPosition.coords,
              timestamp: bestPosition.timestamp,
              source: 'gps-acceptable'
            });
          } else if (!hasResolvedEarly) {
            console.log('❌ No acceptable accuracy achieved, rejecting');
            reject(new Error('GPS accuracy not acceptable'));
          }
        }
      },
      (error) => {
        console.warn('🎯 Accurate geolocation error:', error);
        navigator.geolocation.clearWatch(watchId);
        if (!hasResolvedEarly) {
          reject(error);
        }
      },
      finalOptions
    );
    
    // Fallback timeout to prevent hanging
    setTimeout(() => {
      if (hasResolvedEarly) return; // Already resolved
      
      navigator.geolocation.clearWatch(watchId);
      if (bestPosition) {
        console.log('🎯 Timeout reached, using best available position');
        hasResolvedEarly = true;
        resolve({
          coords: bestPosition.coords,
          timestamp: bestPosition.timestamp,
          source: 'gps-timeout'
        });
      } else {
        reject(new Error('GPS timeout without position'));
      }
    }, finalOptions.timeout);
    
    }, 1000); // Reduced to 1 second for faster response
  });
};

// Browser geolocation with enhanced options
const getBrowserGeolocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300000 // 5 minutes
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    console.log('📍 Requesting browser geolocation with options:', finalOptions);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Browser geolocation successful:', position.coords);
        console.log('🔍 Full position object:', position);
        console.log('🔍 Position validation check:', {
          hasCoords: !!position.coords,
          hasLatitude: !!position.coords?.latitude,
          hasLongitude: !!position.coords?.longitude,
          latitude: position.coords?.latitude,
          longitude: position.coords?.longitude,
          coordsType: typeof position.coords,
          positionKeys: Object.keys(position),
          coordsKeys: position.coords ? Object.keys(position.coords) : 'no coords',
          coordsConstructor: position.coords?.constructor?.name,
          coordsProto: position.coords ? Object.getPrototypeOf(position.coords) : 'no coords'
        });
        resolve({
          ...position,
          source: 'gps'
        });
      },
      (error) => {
        console.log('❌ Browser geolocation failed:', error.message, 'Code:', error.code);
        reject(error);
      },
      finalOptions
    );
  });
};

// Main bulletproof geolocation function
export const getBulletproofLocation = async (options = {}) => {
  console.log('🎯 Starting bulletproof geolocation...');
  
  // For page refresh accuracy: Always skip cache and force fresh GPS for accuracy
  const forceRefresh = true; // Always force refresh for better accuracy
  console.log('🔄 Force refresh mode: Always getting fresh GPS for accuracy');
  
  // Check cached location and clear it if accuracy is poor (over 100m)
  const cachedLocation = getCachedLocation();
  if (cachedLocation && cachedLocation.coords && cachedLocation.coords.accuracy > 100) {
    console.log('�️ Clearing cached location with poor accuracy:', cachedLocation.coords.accuracy + 'm');
    localStorage.removeItem('bulletproof_location');
  }
  
  // Strategy 1: Check permission status first
  const permissionStatus = await requestGeolocationPermission();
  console.log('🔒 Permission status:', permissionStatus);
  
  // Strategy 2: Always try fresh high-accuracy GPS first (no cache on refresh)
  const strategies = [
    {
      name: 'ultra-precise-gps',
      fn: () => getBrowserGeolocationWithAccuracy({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
    },
    {
      name: 'high-accuracy-fresh',
      fn: () => getBrowserGeolocation({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
    },
    {
      name: 'high-accuracy-fast',
      fn: () => getBrowserGeolocation({ enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 })
    },
    {
      name: 'medium-accuracy',
      fn: () => getBrowserGeolocation({ enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 })
    },
    {
      name: 'fast-fallback',
      fn: () => getBrowserGeolocation({ enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 })
    }
  ];
  
  // Try each browser geolocation strategy
  for (const strategy of strategies) {
    try {
      console.log(`🔄 Trying ${strategy.name} strategy...`);
      const position = await strategy.fn();
      
      console.log(`🔍 Position validation for ${strategy.name}:`, {
        position: position,
        hasCoords: !!position?.coords,
        hasLatitude: !!position?.coords?.latitude,
        hasLongitude: !!position?.coords?.longitude,
        coords: position?.coords,
        actualLatitude: position?.coords?.latitude,
        actualLongitude: position?.coords?.longitude,
        accuracy: position?.coords?.accuracy,
        source: position?.source
      });
      
      // Simplified validation - just check if coordinates exist
      const coords = position?.coords;
      const lat = coords?.latitude;
      const lng = coords?.longitude;
      
      console.log(`🔧 Coordinate extraction:`, { coords, lat, lng });
      
      if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        const accuracy = coords?.accuracy || 10000;
        console.log(`✅ Valid coordinates from ${strategy.name}:`, { lat, lng, accuracy });
        
        // Normalize the position object for consistency
        const normalizedPosition = {
          coords: {
            latitude: Number(lat),
            longitude: Number(lng),
            accuracy: Number(accuracy)
          },
          timestamp: position.timestamp || Date.now(),
          source: position.source || 'gps'
        };
        
        console.log(`🔧 Normalized position:`, normalizedPosition);
        return normalizedPosition;
      } else {
        console.log(`❌ Invalid coordinates from ${strategy.name}:`, { coords, lat, lng, latType: typeof lat, lngType: typeof lng });
      }
    } catch (error) {
      console.log(`❌ ${strategy.name} failed:`, error.message);
      continue;
    }
  }
  
  // Strategy 3: Try IP-based geolocation as fallback
  console.log('🌐 Browser geolocation failed, trying IP-based location...');
  const ipLocation = await getLocationFromIP();
  if (ipLocation) {
    return ipLocation;
  }

  // Strategy 4: Final geographic fallback (no cached location fallback for accuracy)  // Strategy 5: Final geographic fallback (this should never happen)
  console.log('🗺️ All strategies failed, using intelligent geographic fallback');
  return getIntelligentFallback();
};

// Cache location for future use - only cache accurate locations
export const cacheLocation = (position) => {
  try {
    const accuracy = position?.coords?.accuracy;
    
    // Only cache locations with reasonable accuracy (under 100m)
    if (accuracy && accuracy > 100) {
      console.log('⏭️ Skipping cache for poor accuracy location:', accuracy + 'm');
      return;
    }
    
    const cacheData = {
      coords: position.coords,
      timestamp: position.timestamp || Date.now(),
      source: position.source || 'unknown'
    };
    localStorage.setItem('geolocation_cache', JSON.stringify(cacheData));
    console.log('💾 Location cached with good accuracy:', cacheData, accuracy + 'm');
  } catch (error) {
    console.log('⚠️ Failed to cache location:', error.message);
  }
};

// Get cached location
export const getCachedLocation = () => {
  try {
    const cached = localStorage.getItem('geolocation_cache');
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const age = Date.now() - data.timestamp;
    
    // Use cached location if less than 1 hour old
    if (age < 3600000) {
      console.log('📦 Found valid cached location:', data);
      return {
        coords: data.coords,
        timestamp: data.timestamp,
        source: 'cache'
      };
    } else {
      console.log('📦 Cached location too old, ignoring');
      localStorage.removeItem('geolocation_cache');
    }
  } catch (error) {
    console.log('⚠️ Failed to retrieve cached location:', error.message);
  }
  return null;
};

// Intelligent fallback based on timezone and other hints
export const getIntelligentFallback = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('🌍 Detected timezone:', timezone);
    
    // Map common US timezones to approximate locations
    const timezoneMap = {
      'America/New_York': { lat: 40.7128, lng: -74.0060 }, // NYC
      'America/Chicago': { lat: 41.8781, lng: -87.6298 }, // Chicago
      'America/Denver': { lat: 39.7392, lng: -104.9903 }, // Denver
      'America/Phoenix': { lat: 33.4484, lng: -112.0740 }, // Phoenix
      'America/Los_Angeles': { lat: 34.0522, lng: -118.2437 }, // LA
      'America/Anchorage': { lat: 61.2181, lng: -149.9003 }, // Anchorage
      'Pacific/Honolulu': { lat: 21.3099, lng: -157.8581 }, // Honolulu
    };
    
    const coords = timezoneMap[timezone];
    if (coords) {
      console.log('🎯 Using timezone-based fallback:', coords);
      return {
        coords: {
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: 50000 // Very low accuracy
        },
        timestamp: Date.now(),
        source: 'timezone-fallback'
      };
    }
  } catch (error) {
    console.log('⚠️ Timezone detection failed:', error.message);
  }
  
  // Ultimate fallback - center of continental US
  console.log('🗺️ Using geographic center of US as final fallback');
  return {
    coords: {
      latitude: 39.8283,
      longitude: -98.5795,
      accuracy: 100000
    },
    timestamp: Date.now(),
    source: 'geographic-center'
  };
};

export const getGeolocationErrorMessage = (error) => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location access denied. We'll use an approximate location instead.";
    case error.POSITION_UNAVAILABLE:
      return "Location information is unavailable. Using fallback location.";
    case error.TIMEOUT:
      return "Location request timed out. Using alternate location method.";
    default:
      return "Unable to get precise location. Using approximate location.";
  }
};