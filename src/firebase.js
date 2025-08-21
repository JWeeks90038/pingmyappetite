// src/firebase.js
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, initializeFirestore } from "firebase/firestore";
import { setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBzTNlQMkIiK1_IOphDwE34L2kzpdMQWD8",
    authDomain: "foodtruckfinder-27eba.firebaseapp.com",
    projectId: "foodtruckfinder-27eba",
    storageBucket: "foodtruckfinder-27eba.firebasestorage.app",
    messagingSenderId: "418485074487",
    appId: "1:418485074487:web:14b0febd3cca4e724b1db2",
    measurementId: "G-MHVKR07V99"
};

console.log('🔥 Firebase: Initializing Firebase...');

// Initialize Firebase with enhanced error handling
let app, auth, db, storage;

try {
    app = initializeApp(firebaseConfig);
    console.log('🔥 Firebase: App initialized successfully');
    
    // Initialize services with error handling
    auth = getAuth(app);
    console.log('🔥 Firebase: Auth initialized successfully');
    
    // Initialize Firestore with optimized settings for better connectivity
    db = initializeFirestore(app, {
        cache: {
            size: 1048576, // 1MB cache
            tabManager: 'default'
        },
        // Enable long polling for better mobile connectivity
        experimentalForceLongPolling: true,
    });
    console.log('🔥 Firebase: Firestore initialized successfully with optimized settings');
    
    storage = getStorage(app);
    console.log('🔥 Firebase: Storage initialized successfully');
    
} catch (error) {
    console.error('🔥 Firebase: Initialization failed:', error);
    // Create fallback objects to prevent app crash
    auth = null;
    db = null;
    storage = null;
}

// Enhanced Firebase persistence and auth setup
if (db && auth) {
    // Enable longer auth persistence with better error handling
    setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error("🔥 Firebase: Auth persistence error:", error);
    });

    // Add connection state monitoring
    console.log('🔥 Firebase: Services ready for use');
}

// Add global error handler for Firebase
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.code && event.reason.code.includes('firebase')) {
        console.warn('🔥 Firebase: Unhandled Firebase error:', event.reason);
        // Prevent the error from crashing the app
        event.preventDefault();
    }
});

// Export for use in the app
export { auth, db, storage };
