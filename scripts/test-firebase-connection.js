// Test Firebase connection
import admin from 'firebase-admin';

// Test Firebase Admin initialization
async function testFirebaseConnection() {
  try {

    
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {

    } else {

      return;
    }

    // Test Firestore connection
    const db = admin.firestore();
    const testDoc = await db.collection('test').doc('connection').get();

    
    // Test a simple write operation
    await db.collection('test').doc('connection').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      test: 'Firebase connection test'
    });
  
    
  } catch (error) {
  
  }
}

testFirebaseConnection();
