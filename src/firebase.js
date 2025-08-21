// src/firebase.js
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { enableIndexedDbPersistence } from "firebase/firestore";
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

// Initialize Firebase with error handling
let app, auth, db, storage;

try {
    app = initializeApp(firebaseConfig);
    console.log('🔥 Firebase: App initialized successfully');
    
    // Initialize services with error handling
    auth = getAuth(app);
    console.log('🔥 Firebase: Auth initialized successfully');
    
    db = getFirestore(app);
    console.log('🔥 Firebase: Firestore initialized successfully');
    
    storage = getStorage(app);
    console.log('🔥 Firebase: Storage initialized successfully');
    
} catch (error) {
    console.error('🔥 Firebase: Initialization failed:', error);
    // Create fallback objects to prevent app crash
    auth = null;
    db = null;
    storage = null;
}

// Enable offline persistence with mobile-specific handling
if (db) {
    // Enable Firestore offline persistence with better error handling
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('🔥 Firebase: Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.warn('🔥 Firebase: The current browser does not support offline persistence.');
        } else {
            console.warn('🔥 Firebase: Offline persistence setup failed:', err);
        }
    });

    // Enable longer auth persistence with better error handling
    if (auth) {
        setPersistence(auth, browserLocalPersistence).catch((error) => {
            console.error("🔥 Firebase: Auth persistence error:", error);
        });
    }

    // Add connection state monitoring
    db._delegate && db._delegate._databaseId && console.log('🔥 Firebase: Connected to project:', db._delegate._databaseId.projectId);
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
