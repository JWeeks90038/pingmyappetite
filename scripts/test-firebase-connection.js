// Test Firebase connection
import admin from 'firebase-admin';

// Test Firebase Admin initialization
async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...');
    
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin is already initialized');
    } else {
      console.log('❌ Firebase Admin is not initialized');
      return;
    }

    // Test Firestore connection
    const db = admin.firestore();
    const testDoc = await db.collection('test').doc('connection').get();
    console.log('✅ Firestore connection successful');
    
    // Test a simple write operation
    await db.collection('test').doc('connection').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      test: 'Firebase connection test'
    });
    console.log('✅ Firestore write operation successful');
    
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
  }
}

testFirebaseConnection();
