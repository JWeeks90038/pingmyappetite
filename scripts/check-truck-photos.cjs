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

    
    // Get all users with role 'owner'
    const usersSnapshot = await db.collection('users').where('role', '==', 'owner').get();
    
 
    
    usersSnapshot.forEach((doc, index) => {
      const userData = doc.data();

      
      if (userData.coverUrl) {
    
      }
      if (userData.foodTruckPhoto) {
      
      }
      
      // Check if they need syncing
      if (userData.coverUrl && !userData.foodTruckPhoto) {
   
      } else if (!userData.coverUrl && userData.foodTruckPhoto) {
       
      } else if (userData.coverUrl && userData.foodTruckPhoto && userData.coverUrl !== userData.foodTruckPhoto) {
     
      } else if (userData.coverUrl && userData.foodTruckPhoto && userData.coverUrl === userData.foodTruckPhoto) {
 
      } else {
     
      }
      
    
    });
    
  } catch (error) {

  }
}

checkTruckPhotos()
  .then(() => {
 
    process.exit(0);
  })
  .catch((error) => {
  
    process.exit(1);
  });
