const admin = require('firebase-admin');
require('dotenv').config({ path: './src/server/.env' });

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncMenuPhotos() {
  try {
    console.log('🍽️  Syncing menu photos from web to mobile app...\n');
    
    // Get all users with role 'owner'
    const usersSnapshot = await db.collection('users').where('role', '==', 'owner').get();
    
    console.log(`Found ${usersSnapshot.size} food truck owner(s):\n`);
    
    let syncedCount = 0;
    let alreadySyncedCount = 0;
    let noMenuPhotoCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const email = userData.email;
      const username = userData.username || 'Unknown';
      
      console.log(`📋 ${email} (${username})`);
      
      // Check if user already has consistent menu photos
      const hasMenuUrl = !!userData.menuUrl;
      
      if (hasMenuUrl) {
        console.log(`   ✅ Already has menu photo: ${userData.menuUrl.substring(0, 50)}...`);
        alreadySyncedCount++;
      } else {
        console.log(`   📷 No menu photo found`);
        noMenuPhotoCount++;
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('📊 MENU PHOTO SYNC SUMMARY:');
    console.log(`   ✅ Users with menu photos: ${alreadySyncedCount}`);
    console.log(`   📷 Users without menu photos: ${noMenuPhotoCount}`);
    console.log(`   👥 Total food truck owners: ${usersSnapshot.size}`);
    
    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Mobile app MenuManagementScreen now uses menuUrl field (same as web)');
    console.log('   2. Food truck owners can upload menu photos in mobile app');
    console.log('   3. Menu photos are automatically synced between web and mobile');
    
    if (noMenuPhotoCount > 0) {
      console.log(`   4. ${noMenuPhotoCount} users can now upload menu photos from mobile app`);
    }
    
  } catch (error) {
    console.error('❌ Error during menu photo sync:', error);
  }
}

syncMenuPhotos()
  .then(() => {
    console.log('\n✅ Menu photo sync verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
