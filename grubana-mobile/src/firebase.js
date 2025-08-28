// firebase.js
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
const db = getFirestore(app);
const storage = getStorage(app);

// Export for use in the app
export { auth, db, storage };
