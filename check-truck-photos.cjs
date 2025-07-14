const admin = require('firebase-admin');
require('dotenv').config({ path: './src/server/.env' });

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTruckPhotos() {
  try {
    console.log('Checking truck photos for food truck owners...\n');
    
    // Get all users with role 'owner'
    const usersSnapshot = await db.collection('users').where('role', '==', 'owner').get();
    
    console.log(`Found ${usersSnapshot.size} food truck owner(s):\n`);
    
    usersSnapshot.forEach((doc, index) => {
      const userData = doc.data();
      console.log(`${index + 1}. ${userData.email} (${userData.username || 'No username'})`);
      console.log(`   Cover URL (Web): ${userData.coverUrl ? '✅ Has photo' : '❌ No photo'}`);
      console.log(`   Food Truck Photo (Mobile): ${userData.foodTruckPhoto ? '✅ Has photo' : '❌ No photo'}`);
      
      if (userData.coverUrl) {
        console.log(`   Web photo: ${userData.coverUrl.substring(0, 80)}...`);
      }
      if (userData.foodTruckPhoto) {
        console.log(`   Mobile photo: ${userData.foodTruckPhoto.substring(0, 80)}...`);
      }
      
      // Check if they need syncing
      if (userData.coverUrl && !userData.foodTruckPhoto) {
        console.log(`   🔄 Needs sync: Mobile app missing photo from web`);
      } else if (!userData.coverUrl && userData.foodTruckPhoto) {
        console.log(`   🔄 Needs sync: Web app missing photo from mobile`);
      } else if (userData.coverUrl && userData.foodTruckPhoto && userData.coverUrl !== userData.foodTruckPhoto) {
        console.log(`   ⚠️  Different photos: Web and mobile have different images`);
      } else if (userData.coverUrl && userData.foodTruckPhoto && userData.coverUrl === userData.foodTruckPhoto) {
        console.log(`   ✅ Synced: Same photo on both platforms`);
      } else {
        console.log(`   📷 Ready for upload: No photos on either platform`);
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTruckPhotos()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
