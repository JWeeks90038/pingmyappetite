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
  
    
    // Get all users with role 'owner'
    const usersSnapshot = await db.collection('users').where('role', '==', 'owner').get();
    

    
    let syncedCount = 0;
    let alreadySyncedCount = 0;
    let noMenuPhotoCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const email = userData.email;
      const username = userData.username || 'Unknown';

      
      // Check if user already has consistent menu photos
      const hasMenuUrl = !!userData.menuUrl;
      
      if (hasMenuUrl) {
  
        alreadySyncedCount++;
      } else {
    
        noMenuPhotoCount++;
      }
      

    }
 
    
    if (noMenuPhotoCount > 0) {
   
    }
    
  } catch (error) {

  }
}

syncMenuPhotos()
  .then(() => {
   
    process.exit(0);
  })
  .catch((error) => {
 
    process.exit(1);
  });
