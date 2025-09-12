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
  console.log('🔍 Testing notification token setup...');
  
  try {
    const truckOwnerId = 'i2MGhY36bbht8p7mrZSzwholsIm2'; // From your original notification
    const customerId = 'Sy3rlEFPLfbWZzY9oO9oECcoXK62'; // From customer data
    
    console.log('\n1. Checking truck owner notification setup...');
    const truckOwnerDoc = await db.collection('users').doc(truckOwnerId).get();
    
    if (truckOwnerDoc.exists) {
      const truckOwnerData = truckOwnerDoc.data();
      console.log('Truck owner:');
      console.log(`  - Display name: ${truckOwnerData.displayName || 'N/A'}`);
      console.log(`  - Role: ${truckOwnerData.role || 'N/A'}`);
      console.log(`  - Has expoPushToken: ${!!truckOwnerData.expoPushToken}`);
      console.log(`  - Has fcmToken: ${!!truckOwnerData.fcmToken}`);
      console.log(`  - Token type: ${truckOwnerData.tokenType || 'unknown'}`);
      console.log(`  - Notification permission: ${truckOwnerData.notificationPermission || 'unknown'}`);
      console.log(`  - Notification preferences: ${JSON.stringify(truckOwnerData.notificationPreferences || {})}`);
      
      if (truckOwnerData.expoPushToken) {
        const isExpoToken = truckOwnerData.expoPushToken.startsWith('ExponentPushToken');
        console.log(`  - Token starts with ExponentPushToken: ${isExpoToken}`);
        console.log(`  - Token preview: ${truckOwnerData.expoPushToken.substring(0, 30)}...`);
      }
    } else {
      console.log('❌ Truck owner not found!');
    }
    
    console.log('\n2. Checking customer notification setup...');
    const customerDoc = await db.collection('users').doc(customerId).get();
    
    if (customerDoc.exists) {
      const customerData = customerDoc.data();
      console.log('Customer:');
      console.log(`  - Display name: ${customerData.displayName || customerData.username || 'N/A'}`);
      console.log(`  - Role: ${customerData.role || 'N/A'}`);
      console.log(`  - Has expoPushToken: ${!!customerData.expoPushToken}`);
      console.log(`  - Has fcmToken: ${!!customerData.fcmToken}`);
      console.log(`  - Token type: ${customerData.tokenType || 'unknown'}`);
      console.log(`  - Notification permission: ${customerData.notificationPermission || 'unknown'}`);
      console.log(`  - Notification preferences: ${JSON.stringify(customerData.notificationPreferences || {})}`);
      
      if (customerData.expoPushToken) {
        const isExpoToken = customerData.expoPushToken.startsWith('ExponentPushToken');
        console.log(`  - Token starts with ExponentPushToken: ${isExpoToken}`);
        console.log(`  - Token preview: ${customerData.expoPushToken.substring(0, 30)}...`);
      }
    } else {
      console.log('❌ Customer not found!');
    }
    
    console.log('\n3. Testing FCM token validation...');
    
    // Test token validation logic
    const testTokens = [
      'ExponentPushToken[abc123def456]', // Expo token
      'eGYP2t9K4RG:APA91bE...', // FCM token
      'invalid-token', // Invalid token
    ];
    
    testTokens.forEach((token, index) => {
      const isExpoToken = token.startsWith('ExponentPushToken');
      const isValidFCM = token.includes(':') && token.includes('APA91b');
      
      console.log(`Token ${index + 1}: ${token.substring(0, 30)}...`);
      console.log(`  - Is Expo token: ${isExpoToken}`);
      console.log(`  - Looks like FCM: ${isValidFCM}`);
      console.log(`  - Would use: ${isExpoToken ? 'Expo Push API' : 'Firebase FCM'}`);
    });
    
    console.log('\n✅ Token validation test completed');
    
  } catch (error) {
    console.error('❌ Error testing notification tokens:', error);
  }
}

// Run the test
testNotificationTokens().then(() => {
  console.log('Token test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Token test failed:', error);
  process.exit(1);
});