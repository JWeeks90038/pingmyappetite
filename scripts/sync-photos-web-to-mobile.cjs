const admin = require('firebase-admin');
require('dotenv').config({ path: './src/server/.env' });

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncPhotosWebToMobile() {
  try {
    console.log('🔄 Syncing food truck photos from web app to mobile app...\n');
    
    // Get all users with role 'owner'
    const usersSnapshot = await db.collection('users').where('role', '==', 'owner').get();
    
    console.log(`Found ${usersSnapshot.size} food truck owner(s):\n`);
    
    let syncedCount = 0;
    let alreadySyncedCount = 0;
    let noWebPhotoCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const email = userData.email;
      const username = userData.username || 'Unknown';
      
      console.log(`📋 ${email} (${username})`);
      console.log(`   Web photo (coverUrl): ${userData.coverUrl ? '✅ Yes' : '❌ No'}`);
      console.log(`   Mobile photo (foodTruckPhoto): ${userData.foodTruckPhoto ? '✅ Yes' : '❌ No'}`);
      
      // Check if web app has a photo but mobile doesn't, or if they're different
      if (userData.coverUrl) {
        if (!userData.foodTruckPhoto || userData.foodTruckPhoto !== userData.coverUrl) {
          console.log(`   🔧 SYNCING: Setting mobile photo to match web photo`);
          
          try {
            await userDoc.ref.update({
              foodTruckPhoto: userData.coverUrl,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
              photoSyncedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`   ✅ SUCCESS: Mobile photo synced`);
            syncedCount++;
          } catch (error) {
            console.log(`   ❌ ERROR: Failed to sync - ${error.message}`);
          }
        } else {
          console.log(`   ✅ ALREADY SYNCED: Photos match`);
          alreadySyncedCount++;
        }
      } else {
        console.log(`   ⚠️  NO WEB PHOTO: Cannot sync`);
        noWebPhotoCount++;
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('📊 SYNC SUMMARY:');
    console.log(`   ✅ Photos synced: ${syncedCount}`);
    console.log(`   ✅ Already synced: ${alreadySyncedCount}`);
    console.log(`   ⚠️  No web photo: ${noWebPhotoCount}`);
    console.log(`   📱 Total users: ${usersSnapshot.size}`);
    
    if (syncedCount > 0) {
      console.log('\n🎉 Photo sync completed! Mobile app will now show the same photos as web app.');
    } else {
      console.log('\n💡 No photos needed syncing. All users are already up to date.');
    }
    
  } catch (error) {
    console.error('❌ Error during photo sync:', error);
  }
}

syncPhotosWebToMobile()
  .then(() => {
    console.log('\n✅ Photo sync process complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
