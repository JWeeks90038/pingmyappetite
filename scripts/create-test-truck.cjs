// Test script to create a visible test truck for debugging the privacy system
// Run this with: node create-test-truck.cjs

const admin = require('firebase-admin');

// You'll need to add your service account key file
// For now, this is a template - you would need actual credentials
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'foodtruckfinder-27eba'
});

const db = admin.firestore();

async function createTestTruck() {
  try {

    
    const testTruckId = 'TEST_TRUCK_' + Date.now();
    
    const truckData = {
      truckName: 'Test Privacy Truck',
      lat: 33.8309, // Riverside, CA area
      lng: -117.0934,
      visible: true, // Explicitly visible
      isLive: true,
      cuisineType: 'American',
      lastActive: Date.now(),
      lastActivityTime: Date.now(),
      sessionStartTime: Date.now(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ownerUid: testTruckId,
      kitchenType: 'truck'
    };
    
    // Create in both collections for consistency
    await db.collection('truckLocations').doc(testTruckId).set(truckData);
    await db.collection('trucks').doc(testTruckId).set(truckData);
    

    
    // Now create a hidden truck to test privacy
    const hiddenTruckId = 'HIDDEN_TRUCK_' + Date.now();
    const hiddenTruckData = {
      ...truckData,
      truckName: 'Hidden Privacy Truck',
      visible: false, // Explicitly hidden
      lat: 33.8409,
      lng: -117.0834,
      ownerUid: hiddenTruckId
    };
    
    await db.collection('truckLocations').doc(hiddenTruckId).set(hiddenTruckData);
    await db.collection('trucks').doc(hiddenTruckId).set(hiddenTruckData);
    

    
    process.exit(0);
    
  } catch (error) {

    process.exit(1);
  }
}

createTestTruck();
