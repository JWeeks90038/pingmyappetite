const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Test notification token validation
async function testNotificationTokens() {

  
  try {
    const truckOwnerId = 'i2MGhY36bbht8p7mrZSzwholsIm2'; // From your original notification
    const customerId = 'Sy3rlEFPLfbWZzY9oO9oECcoXK62'; // From customer data
    

    const truckOwnerDoc = await db.collection('users').doc(truckOwnerId).get();
    
    if (truckOwnerDoc.exists) {
      const truckOwnerData = truckOwnerDoc.data();

      if (truckOwnerData.expoPushToken) {
        const isExpoToken = truckOwnerData.expoPushToken.startsWith('ExponentPushToken');
    
      }
    } else {
   
    }
    

    const customerDoc = await db.collection('users').doc(customerId).get();
    
    if (customerDoc.exists) {
      const customerData = customerDoc.data();

      
      if (customerData.expoPushToken) {
        const isExpoToken = customerData.expoPushToken.startsWith('ExponentPushToken');

      }
    } else {
  
    }
    
  
    
    // Test token validation logic
    const testTokens = [
      'ExponentPushToken[abc123def456]', // Expo token
      'eGYP2t9K4RG:APA91bE...', // FCM token
      'invalid-token', // Invalid token
    ];
    
    testTokens.forEach((token, index) => {
      const isExpoToken = token.startsWith('ExponentPushToken');
      const isValidFCM = token.includes(':') && token.includes('APA91b');
      

    });
    
  
    
  } catch (error) {
 
  }
}

// Run the test
testNotificationTokens().then(() => {

  process.exit(0);
}).catch((error) => {

  process.exit(1);
});