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

    
    // Get all users with role 'owner'
    const usersSnapshot = await db.collection('users').where('role', '==', 'owner').get();
    

    
    let syncedCount = 0;
    let alreadySyncedCount = 0;
    let noWebPhotoCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const email = userData.email;
      const username = userData.username || 'Unknown';
      

      
      // Check if web app has a photo but mobile doesn't, or if they're different
      if (userData.coverUrl) {
        if (!userData.foodTruckPhoto || userData.foodTruckPhoto !== userData.coverUrl) {
  
          
          try {
            await userDoc.ref.update({
              foodTruckPhoto: userData.coverUrl,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
              photoSyncedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
         
            syncedCount++;
          } catch (error) {
           
          }
        } else {
         
          alreadySyncedCount++;
        }
      } else {
     
        noWebPhotoCount++;
      }
      
 
    }
    
 
    
    if (syncedCount > 0) {
     
    } else {
     
    }
    
  } catch (error) {

  }
}

syncPhotosWebToMobile()
  .then(() => {

    process.exit(0);
  })
  .catch((error) => {

    process.exit(1);
  });
