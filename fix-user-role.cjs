const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://foodtruckfinder-27eba-default-rtdb.firebaseio.com/'
  });
}

const db = admin.firestore();

async function fixUserRole() {
  try {
    const userId = 'EJyT9JRa7wVEfiC1bA4VSga3DRD2';
    
    console.log('🔍 Checking current user data...');
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📄 Current user data:', {
      email: userData.email,
      role: userData.role,
      plan: userData.plan,
      subscriptionStatus: userData.subscriptionStatus
    });
    
    // Check if user has pro plan - they should be an owner
    if (userData.plan === 'pro' && userData.role === 'customer') {
      console.log('🔧 Fixing user role from customer to owner...');
      
      await db.collection('users').doc(userId).update({
        role: 'owner'
      });
      
      console.log('✅ User role updated successfully!');
      
      // Verify the update
      const updatedDoc = await db.collection('users').doc(userId).get();
      const updatedData = updatedDoc.data();
      console.log('✅ Updated user data:', {
        email: updatedData.email,
        role: updatedData.role,
        plan: updatedData.plan,
        subscriptionStatus: updatedData.subscriptionStatus
      });
    } else {
      console.log('ℹ️ User role is already correct or no update needed');
    }
    
  } catch (error) {
    console.error('❌ Error fixing user role:', error);
  }
}

fixUserRole().then(() => {
  console.log('🏁 Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
