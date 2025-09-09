// Test script to check truck visibility states in Firebase
// Run this to debug Hide/Show Icon persistence issues

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

// Firebase config (copy from your firebase.js if needed)
const firebaseConfig = {
  // Add your config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTruckVisibilityData() {
  try {
  
    
    // Check all trucks visibility states
    const trucksRef = collection(db, 'trucks');
    const trucksSnapshot = await getDocs(trucksRef);
    
  
    trucksSnapshot.forEach((doc) => {
      const data = doc.data();
   
    });
    
    // Check truckLocations collection
    const truckLocationsRef = collection(db, 'truckLocations');
    const truckLocationsSnapshot = await getDocs(truckLocationsRef);
    
   
    truckLocationsSnapshot.forEach((doc) => {
      const data = doc.data();
  
    });
    
  } catch (error) {

  }
}

// Usage: node check-truck-visibility.js
checkTruckVisibilityData();
