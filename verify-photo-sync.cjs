const admin = require('firebase-admin');
require('dotenv').config({ path: './src/server/.env' });

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verifyPhotoSync() {
  try {
    console.log('🔍 Verifying photo sync status...\n');
    
    // Get all users with role 'owner'
    const usersSnapshot = await db.collection('users').where('role', '==', 'owner').get();
    
    console.log(`Found ${usersSnapshot.size} food truck owner(s):\n`);
    
    let perfectSyncCount = 0;
    let hasPhotosCount = 0;
    let needsPhotosCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const email = userData.email;
      const username = userData.username || 'Unknown';
      
      console.log(`📋 ${email} (${username})`);
      console.log(`   Web app field (coverUrl): ${userData.coverUrl ? '✅ Has photo' : '❌ No photo'}`);
      console.log(`   Mobile app field (foodTruckPhoto): ${userData.foodTruckPhoto ? '✅ Has photo' : '❌ No photo'}`);
      
      if (userData.coverUrl && userData.foodTruckPhoto) {
        if (userData.coverUrl === userData.foodTruckPhoto) {
          console.log(`   🎯 STATUS: Perfect sync - both apps use same photo`);
          perfectSyncCount++;
          hasPhotosCount++;
        } else {
          console.log(`   ⚠️  STATUS: Photos exist but different URLs`);
          console.log(`      Web: ${userData.coverUrl.substring(0, 50)}...`);
          console.log(`      Mobile: ${userData.foodTruckPhoto.substring(0, 50)}...`);
          hasPhotosCount++;
        }
      } else if (userData.coverUrl || userData.foodTruckPhoto) {
        console.log(`   ⚠️  STATUS: Only one app has photo`);
        hasPhotosCount++;
      } else {
        console.log(`   📷 STATUS: No photos uploaded yet - ready for upload`);
        needsPhotosCount++;
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('📊 VERIFICATION SUMMARY:');
    console.log(`   🎯 Perfect sync (both apps same photo): ${perfectSyncCount}`);
    console.log(`   📸 Users with photos: ${hasPhotosCount}`);
    console.log(`   📷 Users needing photos: ${needsPhotosCount}`);
    console.log(`   👥 Total food truck owners: ${usersSnapshot.size}`);
    
    if (perfectSyncCount === hasPhotosCount && hasPhotosCount > 0) {
      console.log('\n🎉 SUCCESS: All users with photos are perfectly synced!');
    }
    
    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Mobile app ProfileScreen now uses coverUrl field (same as web)');
    console.log('   2. Food truck owners can upload photos in either app');
    console.log('   3. Photos will be consistent across web and mobile');
    
    if (needsPhotosCount > 0) {
      console.log(`   4. ${needsPhotosCount} users still need to upload their truck photos`);
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

verifyPhotoSync()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
