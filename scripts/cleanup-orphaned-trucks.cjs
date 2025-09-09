const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json')),
    databaseURL: 'https://foodtrucktracker-ad6c8-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function cleanupOrphanedTrucks() {
  try {

    
    // The specific SSP truck that's orphaned
    const orphanedTruckId = 'vtXnkYhgHiTYg62Xihb8rFepdDh2';
    
   
    
    // Option 1: Delete the entire truck location document
    await db.collection('truckLocations').doc(orphanedTruckId).delete();
 
    
    // Also check for and clean up any other orphaned trucks

    
    const visibleTrucksSnapshot = await db.collection('truckLocations')
      .where('visible', '==', true)
      .get();
    
    let orphanedCount = 0;
    const batch = db.batch();
    
    for (const truckDoc of visibleTrucksSnapshot.docs) {
      const truckData = truckDoc.data();
      const truckId = truckDoc.id;
      
      // Check if corresponding user exists
      const userDoc = await db.collection('users').doc(truckId).get();
      
      if (!userDoc.exists) {
     
        batch.delete(truckDoc.ref);
        orphanedCount++;
      }
    }
    
    if (orphanedCount > 0) {
      await batch.commit();
  
    } else {

    }
    
    // Verify the cleanup

    const remainingTrucksSnapshot = await db.collection('truckLocations')
      .where('visible', '==', true)
      .get();
    

    
    remainingTrucksSnapshot.forEach(doc => {
      const truckData = doc.data();

    });
    
  } catch (error) {

  }
}

// Run the cleanup
cleanupOrphanedTrucks()
  .then(() => {

    process.exit(0);
  })
  .catch((error) => {
  
    process.exit(1);
  });
