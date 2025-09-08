const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncDisplayName() {
  try {
    // Your user ID from the logs
    const userId = 'Sy3rlEFPLfbWZzY9oO9oECcoXK62';
    
    console.log('🔄 Reading current user data...');
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log('❌ User document not found');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📋 Current user data:');
    console.log('  - username:', userData.username);
    console.log('  - displayName:', userData.displayName);
    console.log('  - profileUrl:', userData.profileUrl);
    
    if (userData.username && userData.username !== userData.displayName) {
      console.log('🔄 Syncing displayName with username...');
      
      await db.collection('users').doc(userId).update({
        displayName: userData.username
      });
      
      console.log('✅ Successfully synced displayName with username');
      console.log(`   displayName updated from "${userData.displayName}" to "${userData.username}"`);
    } else {
      console.log('✅ displayName already matches username');
    }
    
  } catch (error) {
    console.error('❌ Error syncing displayName:', error);
  }
}

syncDisplayName().then(() => {
  console.log('🎯 Script completed');
  process.exit(0);
});
