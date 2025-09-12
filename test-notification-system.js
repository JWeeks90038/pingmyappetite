const admin = require('firebase-admin');
const { db } = require('./src/firebase');

// Test script to debug notification system
async function testNotificationSystem() {
  console.log('🔍 Testing notification system...');
  
  try {
    // 1. Check if we can read orders collection
    console.log('\n1. Testing Firestore connection...');
    const ordersRef = db.collection('orders');
    const snapshot = await ordersRef.limit(1).get();
    console.log(`✅ Can read orders collection. Found ${snapshot.size} order(s)`);
    
    // 2. Check for recent orders
    console.log('\n2. Checking recent orders...');
    const recentOrders = await ordersRef
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    recentOrders.forEach((doc, index) => {
      const order = doc.data();
      console.log(`Order ${index + 1}: ${doc.id}`);
      console.log(`  - Status: ${order.status}`);
      console.log(`  - Customer: ${order.customerId}`);
      console.log(`  - Truck: ${order.truckId}`);
      console.log(`  - Created: ${order.createdAt?.toDate?.() || order.createdAt}`);
    });
    
    // 3. Check user tokens
    console.log('\n3. Checking user notification tokens...');
    const usersRef = db.collection('users');
    const usersWithTokens = await usersRef
      .where('expoPushToken', '!=', null)
      .limit(5)
      .get();
    
    console.log(`Found ${usersWithTokens.size} users with push tokens`);
    usersWithTokens.forEach((doc) => {
      const user = doc.data();
      console.log(`User ${doc.id}:`);
      console.log(`  - Has expoPushToken: ${!!user.expoPushToken}`);
      console.log(`  - Has fcmToken: ${!!user.fcmToken}`);
      console.log(`  - Notification permission: ${user.notificationPermission}`);
    });
    
    // 4. Test manual notification trigger
    console.log('\n4. Testing manual notification...');
    
    if (recentOrders.size > 0) {
      const firstOrder = recentOrders.docs[0];
      const orderId = firstOrder.id;
      
      console.log(`Attempting to trigger notification for order: ${orderId}`);
      
      // Simulate what happens when an order status changes
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();
      const orderData = orderDoc.data();
      
      console.log('Current order data:');
      console.log(`  - Status: ${orderData.status}`);
      console.log(`  - Customer: ${orderData.customerId}`);
      console.log(`  - Truck: ${orderData.truckId}`);
      
      // Check if customer and truck owner have notification tokens
      if (orderData.customerId) {
        const customerDoc = await db.collection('users').doc(orderData.customerId).get();
        const customerData = customerDoc.data();
        console.log(`Customer notification setup:`);
        console.log(`  - Has token: ${!!customerData?.expoPushToken}`);
        console.log(`  - Token: ${customerData?.expoPushToken?.substring(0, 20)}...`);
      }
      
      if (orderData.truckId) {
        // Find truck owner
        const truckDoc = await db.collection('mobileKitchens').doc(orderData.truckId).get();
        const truckData = truckDoc.data();
        if (truckData?.ownerId) {
          const ownerDoc = await db.collection('users').doc(truckData.ownerId).get();
          const ownerData = ownerDoc.data();
          console.log(`Truck owner notification setup:`);
          console.log(`  - Has token: ${!!ownerData?.expoPushToken}`);
          console.log(`  - Token: ${ownerData?.expoPushToken?.substring(0, 20)}...`);
        }
      }
    }
    
    console.log('\n✅ Notification system test completed');
    
  } catch (error) {
    console.error('❌ Error testing notification system:', error);
  }
}

// Run the test
testNotificationSystem().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});