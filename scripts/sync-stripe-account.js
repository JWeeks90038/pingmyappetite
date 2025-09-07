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
    console.log('🔄 Syncing Stripe account ID for user:', userId);
    
    // Get user data from users collection
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.error('❌ User not found in users collection');
      return;
    }
    
    const userData = userDoc.data();
    const stripeAccountId = userData.stripeAccountId;
    
    if (!stripeAccountId) {
      console.error('❌ No stripeAccountId found in users collection');
      return;
    }
    
    console.log('✅ Found Stripe account ID:', stripeAccountId);
    
    // Update trucks collection with the Stripe account ID
    const truckDoc = await db.collection('trucks').doc(userId).get();
    
    if (!truckDoc.exists) {
      console.error('❌ Truck document not found in trucks collection');
      return;
    }
    
    await db.collection('trucks').doc(userId).update({
      stripeConnectAccountId: stripeAccountId,
      paymentEnabled: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Successfully updated trucks collection with Stripe account ID');
    console.log('🎉 Pre-order payments should now work!');
    
  } catch (error) {
    console.error('❌ Error syncing Stripe account:', error);
  }
}

// Get user ID from command line argument or use a default
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Please provide your user ID as an argument');
  console.log('Usage: node sync-stripe-account.js YOUR_USER_ID');
  process.exit(1);
}

syncStripeAccountToTruck(userId);
