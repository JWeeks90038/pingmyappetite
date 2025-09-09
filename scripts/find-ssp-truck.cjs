const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json')),
    databaseURL: 'https://foodtrucktracker-ad6c8-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function findSSPTruckData() {
  try {

    
    // Search in users collection

    const usersSnapshot = await db.collection('users')
      .where('truckName', '==', 'SSP')
      .get();
    
    if (!usersSnapshot.empty) {
      usersSnapshot.forEach(doc => {

      });
    } else {
     
    }
    
    // Search for any users with truckName containing SSP

    const allUsersSnapshot = await db.collection('users').get();
    
    allUsersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.truckName && userData.truckName.includes('SSP')) {

      }
    });
    
    // Search in truckLocations collection

    const truckLocationsSnapshot = await db.collection('truckLocations').get();
    
    let sspTruckLocations = [];
    truckLocationsSnapshot.forEach(doc => {
      const truckData = doc.data();
      if (truckData.truckName === 'SSP' || 
          (truckData.name && truckData.name.includes('SSP')) ||
          truckData.visible === true) {
        sspTruckLocations.push({
          id: doc.id,
          data: truckData
        });
      }
    });
    
    if (sspTruckLocations.length > 0) {

      sspTruckLocations.forEach(truck => {
 
      });
    } else {
 
    }
    
    // Check for any visible trucks without matching users

    const visibleTrucksSnapshot = await db.collection('truckLocations')
      .where('visible', '==', true)
      .get();
    
    for (const truckDoc of visibleTrucksSnapshot.docs) {
      const truckData = truckDoc.data();
      const truckId = truckDoc.id;
      
      // Check if corresponding user exists
      const userDoc = await db.collection('users').doc(truckId).get();
      
      if (!userDoc.exists) {
 
      }
    }
    

    
  } catch (error) {

  }
}

// Run the search
findSSPTruckData()
  .then(() => {

    process.exit(0);
  })
  .catch((error) => {
 
    process.exit(1);
  });
