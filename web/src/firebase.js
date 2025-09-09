// src/firebase.js
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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
  
    
    // Initialize services with error handling
    auth = getAuth(app);
 
    
    // Use standard getFirestore() to avoid initialization conflicts
    db = getFirestore(app);

    
    storage = getStorage(app);

    
} catch (error) {

    // Create fallback objects to prevent app crash
    auth = null;
    db = null;
    storage = null;
}

// Enhanced Firebase persistence and auth setup
if (db && auth) {
    // Enable longer auth persistence with better error handling
    setPersistence(auth, browserLocalPersistence).catch((error) => {

    });

    // Add connection state monitoring

}

// Add global error handler for Firebase
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.code && event.reason.code.includes('firebase')) {
     
        // Prevent the error from crashing the app
        event.preventDefault();
    }
});

// Export for use in the app
export { auth, db, storage, app };
