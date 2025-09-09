const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function syncStripeAccount() {
  try {

    
    // Your truck owner ID (from the logs)
    const truckOwnerId = 'i2MGhY36bbht8p7mrZSzwholsIm2';
    

    
    // Get user data with Stripe account
    const userDoc = await db.collection('users').doc(truckOwnerId).get();
    
    if (!userDoc.exists) {
   
      return;
    }
    
    const userData = userDoc.data();
    const stripeAccountId = userData.stripeAccountId;
    

    
    if (!stripeAccountId) {

      return;
    }
    
    // Check trucks collection
    const truckDoc = await db.collection('trucks').doc(truckOwnerId).get();
    
    if (!truckDoc.exists) {

      return;
    }
    
    const truckData = truckDoc.data();

    
    // Update trucks collection
    await db.collection('trucks').doc(truckOwnerId).update({
      stripeConnectAccountId: stripeAccountId,
      paymentEnabled: true,
      syncedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    

    
    // Verify the update
    const updatedTruckDoc = await db.collection('trucks').doc(truckOwnerId).get();
    const updatedData = updatedTruckDoc.data();

    
  } catch (error) {

  }
  
  process.exit(0);
}

syncStripeAccount();
