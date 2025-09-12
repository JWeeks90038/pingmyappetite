const admin = require('firebase-admin');
const { db } = require('./src/firebase');

async function checkUserTokens() {
  console.log('🔍 Checking user notification tokens...');
  
  try {
    const customerId = 'Sy3rlEFPLfbWZzY9oO9oECcoXK62';
    const truckOwnerId = 'i2MGhY36bbht8p7mrZSzwholsIm2';
    
    console.log(`\n1. Checking customer: ${customerId}`);
    const customerDoc = await db.collection('users').doc(customerId).get();
    
    if (customerDoc.exists) {
      const customerData = customerDoc.data();
      console.log('Customer notification setup:');
      console.log(`  - Username: ${customerData.username}`);
      console.log(`  - Role: ${customerData.role}`);
      console.log(`  - Has expoPushToken: ${!!customerData.expoPushToken}`);
      console.log(`  - Has fcmToken: ${!!customerData.fcmToken}`);
      console.log(`  - Notification permission: ${customerData.notificationPermission}`);
      console.log(`  - Notification preferences: ${JSON.stringify(customerData.notificationPreferences)}`);
      
      if (customerData.expoPushToken) {
        console.log(`  - Expo token (first 50 chars): ${customerData.expoPushToken.substring(0, 50)}...`);
      }
      if (customerData.fcmToken) {
        console.log(`  - FCM token (first 50 chars): ${customerData.fcmToken.substring(0, 50)}...`);
      }
    } else {
      console.log('❌ Customer not found!');
    }
    
    console.log(`\n2. Checking truck owner: ${truckOwnerId}`);
    const truckOwnerDoc = await db.collection('users').doc(truckOwnerId).get();
    
    if (truckOwnerDoc.exists) {
      const truckOwnerData = truckOwnerDoc.data();
      console.log('Truck owner notification setup:');
      console.log(`  - Username: ${truckOwnerData.username || truckOwnerData.displayName}`);
      console.log(`  - Role: ${truckOwnerData.role}`);
      console.log(`  - Has expoPushToken: ${!!truckOwnerData.expoPushToken}`);
      console.log(`  - Has fcmToken: ${!!truckOwnerData.fcmToken}`);
      console.log(`  - Notification permission: ${truckOwnerData.notificationPermission}`);
      console.log(`  - Notification preferences: ${JSON.stringify(truckOwnerData.notificationPreferences)}`);
      
      if (truckOwnerData.expoPushToken) {
        console.log(`  - Expo token (first 50 chars): ${truckOwnerData.expoPushToken.substring(0, 50)}...`);
      }
      if (truckOwnerData.fcmToken) {
        console.log(`  - FCM token (first 50 chars): ${truckOwnerData.fcmToken.substring(0, 50)}...`);
      }
    } else {
      console.log('❌ Truck owner not found!');
    }
    
    console.log('\n3. Summary:');
    const customerHasToken = customerDoc.exists && (customerDoc.data().expoPushToken || customerDoc.data().fcmToken);
    const truckOwnerHasToken = truckOwnerDoc.exists && (truckOwnerDoc.data().expoPushToken || truckOwnerDoc.data().fcmToken);
    
    console.log(`Customer has valid token: ${customerHasToken ? '✅' : '❌'}`);
    console.log(`Truck owner has valid token: ${truckOwnerHasToken ? '✅' : '❌'}`);
    
    if (!customerHasToken) {
      console.log('⚠️  Customer needs to enable notifications in the app');
    }
    if (!truckOwnerHasToken) {
      console.log('⚠️  Truck owner needs to enable notifications in the app');
    }
    
  } catch (error) {
    console.error('❌ Error checking user tokens:', error);
  }
}

checkUserTokens().then(() => {
  console.log('\nToken check completed');
  process.exit(0);
}).catch((error) => {
  console.error('Token check failed:', error);
  process.exit(1);
});