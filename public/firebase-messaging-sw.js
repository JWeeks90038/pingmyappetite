// Firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (same as your main app)
const firebaseConfig = {
  apiKey: "AIzaSyBzTNlQMkIiK1_IOphDwE34L2kzpdMQWD8",
  authDomain: "foodtruckfinder-27eba.firebaseapp.com",
  projectId: "foodtruckfinder-27eba",
  storageBucket: "foodtruckfinder-27eba.firebasestorage.app",
  messagingSenderId: "418485074487",
  appId: "1:418485074487:web:14b0febd3cca4e724b1db2",
  measurementId: "G-MHVKR07V99"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Grubana';
  const notificationOptions = {
    body: payload.notification?.body || 'New notification',
    icon: payload.notification?.icon || '/grubana-logo.png',
    image: payload.notification?.image,
    badge: '/truck-icon.png',
    tag: payload.data?.type || 'grubana-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: '👀 View'
      },
      {
        action: 'dismiss',
        title: '✖️ Dismiss'
      }
    ],
    data: payload.data
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();
  
  // Handle different actions
  if (event.action === 'view') {
    // Open the app or specific page
    const urlToOpen = event.notification.data?.clickAction || '/customer-dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('grubana.com') && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        
        // If app is not open, open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already done above)
    console.log('🔔 Notification dismissed');
  } else {
    // Default click action (no specific action button)
    const urlToOpen = event.notification.data?.clickAction || '/customer-dashboard';
    
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔔 Notification closed:', event);
  
  // Track notification close analytics if needed
  // This could be used to understand which notifications users dismiss
});

// Handle push events (additional handling if needed)
self.addEventListener('push', (event) => {
  console.log('🔔 Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('🔔 Push data:', data);
    
    // Handle custom push logic if needed
    // This is automatically handled by Firebase Messaging onBackgroundMessage
    // but you can add custom logic here if required
  }
});
