const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function debugUserRoles() {
  try {

    
    // Get all users and their roles
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {

      return;
    }
    

    
    const roleCount = {};
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const role = userData.role || 'no_role';
      roleCount[role] = (roleCount[role] || 0) + 1;
      
      // Log user with details if they have a plan
      if (userData.plan || userData.lat || userData.lng || userData.cuisine) {
  
      }
    });
    

    
    // Check truckLocations collection
  
    const truckLocationsSnapshot = await db.collection('truckLocations').get();
    
    if (truckLocationsSnapshot.empty) {

    } else {
  
      truckLocationsSnapshot.forEach((doc) => {
        const locationData = doc.data();
      
      });
    }
    
  } catch (error) {
 
  }
}

debugUserRoles().then(() => {

  process.exit(0);
});
