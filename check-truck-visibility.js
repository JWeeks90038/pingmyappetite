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
    console.log('🔍 Checking truck visibility data...');
    
    // Check all trucks visibility states
    const trucksRef = collection(db, 'trucks');
    const trucksSnapshot = await getDocs(trucksRef);
    
    console.log('\n📊 TRUCKS COLLECTION:');
    trucksSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Truck ID: ${doc.id}`);
      console.log(`  visible: ${data.visible}`);
      console.log(`  lastActivityTime: ${data.lastActivityTime}`);
      console.log(`  lastToggleTime: ${data.lastToggleTime}`);
      console.log(`  autoHidden: ${data.autoHidden}`);
      console.log(`  role: ${data.role || data.userRole}`);
      console.log('---');
    });
    
    // Check truckLocations collection
    const truckLocationsRef = collection(db, 'truckLocations');
    const truckLocationsSnapshot = await getDocs(truckLocationsRef);
    
    console.log('\n📍 TRUCK LOCATIONS COLLECTION:');
    truckLocationsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Truck ID: ${doc.id}`);
      console.log(`  visible: ${data.visible}`);
      console.log(`  lastActivityTime: ${data.lastActivityTime}`);
      console.log(`  lastToggleTime: ${data.lastToggleTime}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error checking truck visibility data:', error);
  }
}

// Usage: node check-truck-visibility.js
checkTruckVisibilityData();
