const admin = require('firebase-admin');
const { db } = require('./src/firebase');

// Debug specific order notification failure
async function debugOrderNotification() {
  console.log('🔍 Debugging order notification failure...');
  
  try {
    const orderId = 'LRsKA4XSdjTgUr1wSzBG';
    const truckOwnerId = 'i2MGhY36bbht8p7mrZSzwholsIm2';
    
    console.log(`\n1. Checking order: ${orderId}`);
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      console.log('❌ Order not found!');
      return;
    }
    
    const orderData = orderDoc.data();
    console.log('Order details:');
    console.log(`  - Status: ${orderData.status}`);
    console.log(`  - Customer ID: ${orderData.customerId}`);
    console.log(`  - Truck ID: ${orderData.truckId}`);
    console.log(`  - Total: $${orderData.total}`);
    console.log(`  - Created: ${orderData.createdAt?.toDate?.() || orderData.createdAt}`);
    
    console.log(`\n2. Checking truck owner: ${truckOwnerId}`);
    const truckOwnerDoc = await db.collection('users').doc(truckOwnerId).get();
    
    if (truckOwnerDoc.exists) {
      const truckOwnerData = truckOwnerDoc.data();
      console.log('Truck owner notification setup:');
      console.log(`  - Display name: ${truckOwnerData.displayName}`);
      console.log(`  - Has expoPushToken: ${!!truckOwnerData.expoPushToken}`);
      console.log(`  - Has fcmToken: ${!!truckOwnerData.fcmToken}`);
      console.log(`  - Notification permission: ${truckOwnerData.notificationPermission}`);
      console.log(`  - Notification preferences: ${JSON.stringify(truckOwnerData.notificationPreferences)}`);
      
      if (truckOwnerData.expoPushToken) {
        console.log(`  - Expo token: ${truckOwnerData.expoPushToken.substring(0, 50)}...`);
      }
      if (truckOwnerData.fcmToken) {
        console.log(`  - FCM token: ${truckOwnerData.fcmToken.substring(0, 50)}...`);
      }
    } else {
      console.log('❌ Truck owner not found!');
    }
    
    console.log(`\n3. Checking customer: ${orderData.customerId}`);
    if (orderData.customerId) {
      const customerDoc = await db.collection('users').doc(orderData.customerId).get();
      
      if (customerDoc.exists) {
        const customerData = customerDoc.data();
        console.log('Customer notification setup:');
        console.log(`  - Display name: ${customerData.displayName}`);
        console.log(`  - Has expoPushToken: ${!!customerData.expoPushToken}`);
        console.log(`  - Has fcmToken: ${!!customerData.fcmToken}`);
        console.log(`  - Notification permission: ${customerData.notificationPermission}`);
        console.log(`  - Notification preferences: ${JSON.stringify(customerData.notificationPreferences)}`);
        
        if (customerData.expoPushToken) {
          console.log(`  - Expo token: ${customerData.expoPushToken.substring(0, 50)}...`);
        }
        if (customerData.fcmToken) {
          console.log(`  - FCM token: ${customerData.fcmToken.substring(0, 50)}...`);
        }
      } else {
        console.log('❌ Customer not found!');
      }
    }
    
    console.log(`\n4. Checking sent notifications for this order`);
    const sentNotificationsSnapshot = await db.collection('sentNotifications')
      .where('orderId', '==', orderId)
      .get();
    
    console.log(`Found ${sentNotificationsSnapshot.size} notification records:`);
    
    sentNotificationsSnapshot.forEach((doc) => {
      const notification = doc.data();
      console.log(`\nNotification ${doc.id}:`);
      console.log(`  - Type: ${notification.type}`);
      console.log(`  - Recipient: ${notification.recipient}`);
      console.log(`  - User ID: ${notification.userId}`);
      console.log(`  - Success: ${notification.success}`);
      console.log(`  - Status: ${notification.status}`);
      console.log(`  - Title: ${notification.content?.title}`);
      console.log(`  - Body: ${notification.content?.body}`);
      console.log(`  - Timestamp: ${notification.timestamp?.toDate?.() || notification.timestamp}`);
      
      if (notification.results && notification.results.length > 0) {
        console.log(`  - Results:`);
        notification.results.forEach((result, index) => {
          console.log(`    ${index + 1}. Method: ${result.method}, Success: ${result.success}`);
          if (result.error) {
            console.log(`       Error: ${result.error}`);
          }
        });
      } else {
        console.log(`  - No delivery results recorded`);
      }
    });
    
    console.log('\n✅ Debug completed');
    
  } catch (error) {
    console.error('❌ Error debugging order notification:', error);
  }
}

// Run the debug
debugOrderNotification().then(() => {
  console.log('Debug completed');
  process.exit(0);
}).catch((error) => {
  console.error('Debug failed:', error);
  process.exit(1);
});