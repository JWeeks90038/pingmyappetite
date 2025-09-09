const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function setClaimsForAllOwners() {
  try {

    
    // Get all owner users from Firestore
    const ownersSnapshot = await db.collection('users')
      .where('role', '==', 'owner')
      .get();
    
    if (ownersSnapshot.empty) {

      return;
    }
    

    
    for (const doc of ownersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;
      
      try {
        // Check if user exists in Auth
        const userRecord = await admin.auth().getUser(uid);

        
        // Check current claims
        const currentClaims = userRecord.customClaims || {};

        
        if (!currentClaims.isTruckOwner) {
          // Add the isTruckOwner claim
          await admin.auth().setCustomUserClaims(uid, {
            ...currentClaims,
            isTruckOwner: true
          });

        } else {
  
        }
        
     
        
      } catch (authError) {

      }
    }
    
  } catch (error) {

  }
}

setClaimsForAllOwners()
  .then(() => {

    process.exit(0);
  })
  .catch(err => {

    process.exit(1);
  });
