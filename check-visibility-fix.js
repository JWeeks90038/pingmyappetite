// Test script to check truck visibility states in Firebase
// Run this to debug Hide/Show Icon persistence issues

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTruckVisibilityData() {
  try {
 
    
    // Check all trucks visibility states
    const trucksSnapshot = await db.collection('trucks').get();
    
  
    if (trucksSnapshot.empty) {
    
    } else {
      trucksSnapshot.forEach((doc) => {
        const data = doc.data();
    
      });
    }
    
    // Check truckLocations collection
    const truckLocationsSnapshot = await db.collection('truckLocations').get();
    
  
    if (truckLocationsSnapshot.empty) {
 
    } else {
      truckLocationsSnapshot.forEach((doc) => {
        const data = doc.data();
    
      });
    }
    
  } catch (error) {

  }
}

// Run the check
checkTruckVisibilityData().then(() => {

  process.exit(0);
}).catch();
