const admin = require('firebase-admin');
const { db } = require('./src/firebase');

// Test script to debug notification system
async function testNotificationSystem() {

  
  try {
    // 1. Check if we can read orders collection

    const ordersRef = db.collection('orders');
    const snapshot = await ordersRef.limit(1).get();

    
    // 2. Check for recent orders

    const recentOrders = await ordersRef
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    recentOrders.forEach((doc, index) => {
      const order = doc.data();

    });
    
    // 3. Check user tokens

    const usersRef = db.collection('users');
    const usersWithTokens = await usersRef
      .where('expoPushToken', '!=', null)
      .limit(5)
      .get();
    

    usersWithTokens.forEach((doc) => {
      const user = doc.data();

    });
    
    // 4. Test manual notification trigger

    
    if (recentOrders.size > 0) {
      const firstOrder = recentOrders.docs[0];
      const orderId = firstOrder.id;
      

      
      // Simulate what happens when an order status changes
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();
      const orderData = orderDoc.data();
      

      
      // Check if customer and truck owner have notification tokens
      if (orderData.customerId) {
        const customerDoc = await db.collection('users').doc(orderData.customerId).get();
        const customerData = customerDoc.data();
;
      }
      
      if (orderData.truckId) {
        // Find truck owner
        const truckDoc = await db.collection('mobileKitchens').doc(orderData.truckId).get();
        const truckData = truckDoc.data();
        if (truckData?.ownerId) {
          const ownerDoc = await db.collection('users').doc(truckData.ownerId).get();
          const ownerData = ownerDoc.data();
 
        }
      }
    }
    

    
  } catch (error) {

  }
}

// Run the test
testNotificationSystem().then(() => {

  process.exit(0);
}).catch((error) => {

  process.exit(1);
});