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
    console.log('🔄 Syncing all Stripe accounts from users to trucks collection...');
    
    // Get all users with stripeAccountId
    const usersSnapshot = await db.collection('users')
      .where('stripeAccountId', '!=', null)
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found with Stripe account IDs');
      return;
    }
    
    console.log(`✅ Found ${usersSnapshot.size} users with Stripe accounts`);
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const stripeAccountId = userData.stripeAccountId;
      
      console.log(`🔄 Processing user ${userId} with Stripe account ${stripeAccountId}`);
      
      // Check if trucks collection document exists
      const truckDoc = await db.collection('trucks').doc(userId).get();
      
      if (!truckDoc.exists) {
        console.log(`⚠️ Truck document not found for user ${userId}`);
        continue;
      }
      
      const truckData = truckDoc.data();
      
      // Check if already has stripeConnectAccountId
      if (truckData.stripeConnectAccountId === stripeAccountId) {
        console.log(`✅ User ${userId} already has correct stripeConnectAccountId`);
        continue;
      }
      
      // Update trucks collection with the Stripe account ID
      await db.collection('trucks').doc(userId).update({
        stripeConnectAccountId: stripeAccountId,
        paymentEnabled: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Updated truck ${userId} with stripeConnectAccountId: ${stripeAccountId}`);
    }
    
    console.log('🎉 All Stripe accounts synced successfully!');
    console.log('💳 Pre-order payments should now work for all approved accounts!');
    
  } catch (error) {
    console.error('❌ Error syncing Stripe accounts:', error);
  }
}

syncAllStripeAccounts();
