const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function setClaimsForAllOwners() {
  try {
    console.log("\n=== Setting isTruckOwner claims for all owners ===");
    
    // Get all owner users from Firestore
    const ownersSnapshot = await db.collection('users')
      .where('role', '==', 'owner')
      .get();
    
    if (ownersSnapshot.empty) {
      console.log("No owners found in Firestore");
      return;
    }
    
    console.log(`Found ${ownersSnapshot.size} owners in Firestore:\n`);
    
    for (const doc of ownersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;
      
      try {
        // Check if user exists in Auth
        const userRecord = await admin.auth().getUser(uid);
        
        console.log(`Processing UID: ${uid} (${userRecord.email})`);
        console.log(`  Role: ${userData.role}, Plan: ${userData.plan}`);
        
        // Check current claims
        const currentClaims = userRecord.customClaims || {};
        console.log(`  Current Claims: ${JSON.stringify(currentClaims)}`);
        
        if (!currentClaims.isTruckOwner) {
          // Add the isTruckOwner claim
          await admin.auth().setCustomUserClaims(uid, {
            ...currentClaims,
            isTruckOwner: true
          });
          console.log(`  ✅ Added isTruckOwner claim`);
        } else {
          console.log(`  ✅ Already has isTruckOwner claim`);
        }
        
        console.log("");
        
      } catch (authError) {
        console.log(`  ❌ User exists in Firestore but NOT in Auth: ${uid}`);
        console.log("");
      }
    }
    
  } catch (error) {
    console.error("Error setting claims for owners:", error);
  }
}

setClaimsForAllOwners()
  .then(() => {
    console.log("=== Claims update complete ===");
    console.log("🔄 Users will need to refresh their browser or re-login for claims to take effect");
    process.exit(0);
  })
  .catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
  });
