const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already done)
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-scripts/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function syncAllStripeAccounts() {
  try {

    
    // Get all users with stripeAccountId
    const usersSnapshot = await db.collection('users')
      .where('stripeAccountId', '!=', null)
      .get();
    
    if (usersSnapshot.empty) {

      return;
    }
    
 
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const stripeAccountId = userData.stripeAccountId;
      

      
      // Check if trucks collection document exists
      const truckDoc = await db.collection('trucks').doc(userId).get();
      
      if (!truckDoc.exists) {
  
        continue;
      }
      
      const truckData = truckDoc.data();
      
      // Check if already has stripeConnectAccountId
      if (truckData.stripeConnectAccountId === stripeAccountId) {
   
        continue;
      }
      
      // Update trucks collection with the Stripe account ID
      await db.collection('trucks').doc(userId).update({
        stripeConnectAccountId: stripeAccountId,
        paymentEnabled: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
   
    }
    

    
  } catch (error) {

  }
}

syncAllStripeAccounts();
