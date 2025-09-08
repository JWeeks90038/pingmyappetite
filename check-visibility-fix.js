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
    console.log('🔍 Checking truck visibility data...');
    
    // Check all trucks visibility states
    const trucksSnapshot = await db.collection('trucks').get();
    
    console.log('\n📊 TRUCKS COLLECTION:');
    if (trucksSnapshot.empty) {
      console.log('No trucks found');
    } else {
      trucksSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`Truck ID: ${doc.id}`);
        console.log(`  visible: ${data.visible}`);
        console.log(`  lastActivityTime: ${data.lastActivityTime}`);
        console.log(`  lastToggleTime: ${data.lastToggleTime}`);
        console.log(`  autoHidden: ${data.autoHidden}`);
        console.log(`  role: ${data.role || data.userRole}`);
        console.log(`  username: ${data.username}`);
        console.log('---');
      });
    }
    
    // Check truckLocations collection
    const truckLocationsSnapshot = await db.collection('truckLocations').get();
    
    console.log('\n📍 TRUCK LOCATIONS COLLECTION:');
    if (truckLocationsSnapshot.empty) {
      console.log('No truck locations found');
    } else {
      truckLocationsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`Truck ID: ${doc.id}`);
        console.log(`  visible: ${data.visible}`);
        console.log(`  isLive: ${data.isLive}`);
        console.log(`  lastActivityTime: ${data.lastActivityTime}`);
        console.log(`  lastToggleTime: ${data.lastToggleTime}`);
        console.log(`  truckName: ${data.truckName}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking truck visibility data:', error);
  }
}

// Run the check
checkTruckVisibilityData().then(() => {
  console.log('✅ Check complete');
  process.exit(0);
}).catch(console.error);
