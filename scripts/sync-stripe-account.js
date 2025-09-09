const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already done)
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-scripts/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function syncStripeAccountToTruck(userId) {
  try {
 
    
    // Get user data from users collection
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {

      return;
    }
    
    const userData = userDoc.data();
    const stripeAccountId = userData.stripeAccountId;
    
    if (!stripeAccountId) {
 
      return;
    }
    

    
    // Update trucks collection with the Stripe account ID
    const truckDoc = await db.collection('trucks').doc(userId).get();
    
    if (!truckDoc.exists) {

      return;
    }
    
    await db.collection('trucks').doc(userId).update({
      stripeConnectAccountId: stripeAccountId,
      paymentEnabled: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    

    
  } catch (error) {

  }
}

// Get user ID from command line argument or use a default
const userId = process.argv[2];

if (!userId) {

  process.exit(1);
}

syncStripeAccountToTruck(userId);
