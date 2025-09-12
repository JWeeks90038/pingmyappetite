const admin = require('firebase-admin');
const { db } = require('./src/firebase');

async function checkUserTokens() {

  
  try {
    const customerId = 'Sy3rlEFPLfbWZzY9oO9oECcoXK62';
    const truckOwnerId = 'i2MGhY36bbht8p7mrZSzwholsIm2';
    

    const customerDoc = await db.collection('users').doc(customerId).get();
    
    if (customerDoc.exists) {
      const customerData = customerDoc.data();

      
      if (customerData.expoPushToken) {
   
      }
      if (customerData.fcmToken) {
   
      }
    } else {

    }
    
    const truckOwnerDoc = await db.collection('users').doc(truckOwnerId).get();
    
    if (truckOwnerDoc.exists) {
      const truckOwnerData = truckOwnerDoc.data();
  

      
      if (truckOwnerData.expoPushToken) {

      }
      if (truckOwnerData.fcmToken) {
  
      }
    } else {

    }
    

    const customerHasToken = customerDoc.exists && (customerDoc.data().expoPushToken || customerDoc.data().fcmToken);
    const truckOwnerHasToken = truckOwnerDoc.exists && (truckOwnerDoc.data().expoPushToken || truckOwnerDoc.data().fcmToken);
    
  
    
    if (!customerHasToken) {

    }
    if (!truckOwnerHasToken) {
  
    }
    
  } catch (error) {
 
  }
}

checkUserTokens().then(() => {

  process.exit(0);
}).catch((error) => {

  process.exit(1);
});