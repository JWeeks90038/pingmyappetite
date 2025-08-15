// Cache clearing utility for debugging
// Add this to browser console if needed: window.clearAppCache()

export const clearAppCache = function() {
  console.log('🔄 Manually clearing app cache...');
  
  // Clear localStorage
  localStorage.clear();
  console.log('✅ LocalStorage cleared');
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('✅ SessionStorage cleared');
  
  // Clear service worker caches
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      Promise.all(
        cacheNames.map(cacheName => {
          console.log(`🗑️ Clearing cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      ).then(() => {
        console.log('✅ All caches cleared');
        console.log('🔄 Reloading page...');
        window.location.reload(true);
      });
    });
  } else {
    console.log('🔄 Reloading page...');
    window.location.reload(true);
  }
};

// Also expose a simpler version check
export const checkAppVersion = function() {
  const currentVersion = '1.0.8';
  const storedVersion = localStorage.getItem('app_version');
  console.log(`App Version: ${currentVersion}`);
  console.log(`Stored Version: ${storedVersion}`);
  console.log(`Versions Match: ${currentVersion === storedVersion}`);
  return { currentVersion, storedVersion, match: currentVersion === storedVersion };
};

// Make functions available on window for debugging
if (typeof window !== 'undefined') {
  window.clearAppCache = clearAppCache;
  window.checkAppVersion = checkAppVersion;
}
