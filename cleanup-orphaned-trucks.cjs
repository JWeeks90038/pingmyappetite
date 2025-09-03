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
    console.log('🧹 Cleaning up orphaned truck locations...\n');
    
    // The specific SSP truck that's orphaned
    const orphanedTruckId = 'vtXnkYhgHiTYg62Xihb8rFepdDh2';
    
    console.log(`🗑️ Removing orphaned truck: ${orphanedTruckId} (SSP)`);
    
    // Option 1: Delete the entire truck location document
    await db.collection('truckLocations').doc(orphanedTruckId).delete();
    console.log('✅ Deleted orphaned truck location document');
    
    // Also check for and clean up any other orphaned trucks
    console.log('\n🔍 Checking for other orphaned trucks...');
    
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
        console.log(`🗑️ Found another orphaned truck: ${truckId} (${truckData.truckName || truckData.name || 'Unnamed'})`);
        batch.delete(truckDoc.ref);
        orphanedCount++;
      }
    }
    
    if (orphanedCount > 0) {
      await batch.commit();
      console.log(`✅ Cleaned up ${orphanedCount} additional orphaned truck locations`);
    } else {
      console.log('✅ No additional orphaned trucks found');
    }
    
    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingTrucksSnapshot = await db.collection('truckLocations')
      .where('visible', '==', true)
      .get();
    
    console.log(`📊 Remaining visible trucks: ${remainingTrucksSnapshot.size}`);
    
    remainingTrucksSnapshot.forEach(doc => {
      const truckData = doc.data();
      console.log(`✅ ${truckData.truckName || truckData.name || 'Unnamed'} (${doc.id})`);
    });
    
    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log('1. ✅ Removed SSP orphaned truck location');
    console.log('2. ✅ Checked for other orphaned trucks');
    console.log('3. ✅ Verified remaining visible trucks have user data');
    
    console.log('\n📱 NEXT STEPS:');
    console.log('1. Reload your app - the SSP truck should no longer appear');
    console.log('2. The map should now only show valid trucks');
    console.log('3. If you still see it, try clearing the app cache');
    
  } catch (error) {
    console.error('❌ Error cleaning up orphaned trucks:', error);
  }
}

// Run the cleanup
cleanupOrphanedTrucks()
  .then(() => {
    console.log('\n✅ Cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
