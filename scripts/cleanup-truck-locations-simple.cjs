const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

console.log('🧹 Starting truck locations cleanup...\n');

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json not found!');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function cleanupTruckLocations() {
  try {
    console.log('📍 Fetching all truck locations...');
    const truckLocationsRef = db.collection('truckLocations');
    const snapshot = await truckLocationsRef.get();
    
    if (snapshot.empty) {
      console.log('✅ No truck locations found in the database');
      return;
    }

    console.log(`📊 Found ${snapshot.size} truck location documents\n`);

    let deletedCount = 0;
    let retainedCount = 0;
    const batch = db.batch();
    const deletedUserIds = [];
    const validUserIds = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const ownerId = data.ownerId || doc.id;
      
      console.log(`🔍 Checking user: ${ownerId}`);
      
      try {
        // Check if user exists in Firebase Auth
        await auth.getUser(ownerId);
        console.log(`  ✅ User exists - keeping location data`);
        validUserIds.push(ownerId);
        retainedCount++;
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          console.log(`  ❌ User not found - marking for deletion`);
          batch.delete(doc.ref);
          deletedUserIds.push(ownerId);
          deletedCount++;
        } else {
          console.log(`  ⚠️  Error checking user: ${error.message}`);
          retainedCount++;
        }
      }
    }

    // Execute batch delete
    if (deletedCount > 0) {
      console.log(`\n🗑️  Deleting ${deletedCount} truck locations for non-existent users...`);
      await batch.commit();
      console.log('✅ Batch deletion completed');
    }

    // Summary
    console.log('\n📋 CLEANUP SUMMARY:');
    console.log('==================');
    console.log(`📍 Total truck locations processed: ${snapshot.size}`);
    console.log(`✅ Locations retained (valid users): ${retainedCount}`);
    console.log(`🗑️  Locations deleted (deleted users): ${deletedCount}`);
    
    if (deletedUserIds.length > 0) {
      console.log('\n🗑️  Deleted locations for these user IDs:');
      deletedUserIds.forEach(id => console.log(`   - ${id}`));
    }
    
    if (validUserIds.length > 0) {
      console.log('\n✅ Retained locations for these user IDs:');
      validUserIds.forEach(id => console.log(`   - ${id}`));
    }
    
    console.log('\n🎉 Truck locations cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTruckLocations()
  .then(() => {
    console.log('\n✨ All done! Your truckLocations collection is now clean.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
