// Simple script to sync Stripe account ID to trucks collection
// This directly updates Firebase without authentication issues

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-scripts/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'foodtruckfinder-27eba'
  });
}

const db = admin.firestore();

async function syncStripeAccountDirectly() {
  try {
    console.log('🔄 Syncing Stripe account from users to trucks collection...');
    
    // Your truck owner ID (from the logs)
    const truckOwnerId = 'i2MGhY36bbht8p7mrZSzwholsIm2';
    
    console.log('👤 Looking up user:', truckOwnerId);
    
    // Get user data with Stripe account
    const userDoc = await db.collection('users').doc(truckOwnerId).get();
    
    if (!userDoc.exists) {
      console.log('❌ User document not found');
      return;
    }
    
    const userData = userDoc.data();
    const stripeAccountId = userData.stripeAccountId;
    
    console.log('💳 Found Stripe account ID:', stripeAccountId);
    
    if (!stripeAccountId) {
      console.log('❌ No Stripe account ID found in user record');
      return;
    }
    
    // Check trucks collection
    const truckDoc = await db.collection('trucks').doc(truckOwnerId).get();
    
    if (!truckDoc.exists) {
      console.log('❌ Truck document not found in trucks collection');
      return;
    }
    
    const truckData = truckDoc.data();
    console.log('🚛 Current truck data keys:', Object.keys(truckData));
    console.log('🚛 Current stripeConnectAccountId:', truckData.stripeConnectAccountId || 'MISSING');
    
    // Update trucks collection
    await db.collection('trucks').doc(truckOwnerId).update({
      stripeConnectAccountId: stripeAccountId,
      paymentEnabled: true,
      syncedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ SUCCESS! Updated trucks collection with Stripe account ID');
    console.log('🎉 Pre-orders should now work!');
    
    // Verify the update
    const updatedTruckDoc = await db.collection('trucks').doc(truckOwnerId).get();
    const updatedData = updatedTruckDoc.data();
    console.log('✅ Verification - stripeConnectAccountId:', updatedData.stripeConnectAccountId);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

syncStripeAccountDirectly();
