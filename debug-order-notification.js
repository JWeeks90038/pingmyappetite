const admin = require('firebase-admin');
const { db } = require('./src/firebase');

// Debug specific order notification failure
async function debugOrderNotification() {

  
  try {
    const orderId = 'LRsKA4XSdjTgUr1wSzBG';
    const truckOwnerId = 'i2MGhY36bbht8p7mrZSzwholsIm2';
    

    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
 
      return;
    }
    
    const orderData = orderDoc.data();

    

    const truckOwnerDoc = await db.collection('users').doc(truckOwnerId).get();
    
    if (truckOwnerDoc.exists) {
      const truckOwnerData = truckOwnerDoc.data();

      
      if (truckOwnerData.expoPushToken) {
  
      }
      if (truckOwnerData.fcmToken) {
   
      }
    } else {
  
    }
    
  
    if (orderData.customerId) {
      const customerDoc = await db.collection('users').doc(orderData.customerId).get();
      
      if (customerDoc.exists) {
        const customerData = customerDoc.data();

        
        if (customerData.expoPushToken) {
 
        }
        if (customerData.fcmToken) {
        
        }
      } else {
   
      }
    }
    

    const sentNotificationsSnapshot = await db.collection('sentNotifications')
      .where('orderId', '==', orderId)
      .get();
    

    
    sentNotificationsSnapshot.forEach((doc) => {
      const notification = doc.data();

      
      if (notification.results && notification.results.length > 0) {

        notification.results.forEach((result, index) => {
   
          if (result.error) {
        
          }
        });
      } else {
    
      }
    });
    
 
    
  } catch (error) {
  
  }
}

// Run the debug
debugOrderNotification().then(() => {

  process.exit(0);
}).catch((error) => {

  process.exit(1);
});