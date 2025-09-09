const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
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
    const truckLocationsRef = db.collection('truckLocations');
    const snapshot = await truckLocationsRef.get();
    
    if (snapshot.empty) {
      return;
    }

    let deletedCount = 0;
    let retainedCount = 0;
    const batch = db.batch();
    const deletedUserIds = [];
    const validUserIds = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const ownerId = data.ownerId || doc.id;
      
      try {
        // Check if user exists in Firebase Auth
        await auth.getUser(ownerId);
        validUserIds.push(ownerId);
        retainedCount++;
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          batch.delete(doc.ref);
          deletedUserIds.push(ownerId);
          deletedCount++;
        } else {
          retainedCount++;
        }
      }
    }

    // Execute batch delete
    if (deletedCount > 0) {
      await batch.commit();
    }

    // Summary
    if (deletedUserIds.length > 0) {
      deletedUserIds.forEach(id => {});
    }
    
    if (validUserIds.length > 0) {
      validUserIds.forEach(id => {});
    }
    
  } catch (error) {
    process.exit(1);
  }
}

// Run the cleanup
cleanupTruckLocations()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
