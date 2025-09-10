// Test script to verify ping analytics
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function testPingAnalytics() {
  try {

    
    // First, let's see what pings exist
    const pingsRef = db.collection('pings');
    const snapshot = await pingsRef.orderBy('timestamp', 'desc').limit(10).get();
    

    
    if (snapshot.size > 0) {

      snapshot.forEach(doc => {
        const data = doc.data();
  
      });
    } else {

    }

    // Check truck locations

    const trucksRef = db.collection('truckLocations');
    const truckSnapshot = await trucksRef.limit(5).get();
    

    truckSnapshot.forEach(doc => {
      const data = doc.data();

    });

    // Add a test ping if none exist
    if (snapshot.size === 0) {

      await pingsRef.add({
        userId: 'test-user',
        username: 'Test User',
        lat: 40.7128, // NYC coordinates
        lng: -74.0060,
        cuisineType: 'american',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        address: 'New York, NY',
        pingId: 'test_ping_' + Date.now()
      });
  
    }

  } catch (error) {

  }
}

testPingAnalytics();
