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

    
    // Get all users with role 'owner'
    const usersSnapshot = await db.collection('users').where('role', '==', 'owner').get();
    

    
    let perfectSyncCount = 0;
    let hasPhotosCount = 0;
    let needsPhotosCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const email = userData.email;
      const username = userData.username || 'Unknown';
      

      
      if (userData.coverUrl && userData.foodTruckPhoto) {
        if (userData.coverUrl === userData.foodTruckPhoto) {
   
          perfectSyncCount++;
          hasPhotosCount++;
        } else {

          hasPhotosCount++;
        }
      } else if (userData.coverUrl || userData.foodTruckPhoto) {
 
        hasPhotosCount++;
      } else {
      
        needsPhotosCount++;
      }
      
     
    }
    

    
    if (perfectSyncCount === hasPhotosCount && hasPhotosCount > 0) {

    }
    

    
    if (needsPhotosCount > 0) {

    }
    
  } catch (error) {

  }
}

verifyPhotoSync()
  .then(() => {
 
    process.exit(0);
  })
  .catch((error) => {
  
    process.exit(1);
  });
