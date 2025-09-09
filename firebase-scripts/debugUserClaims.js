const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function debugUserClaims(uid) {
  try {

    
    // Check if user exists in Auth
    const userRecord = await admin.auth().getUser(uid);

    
    // Check user document in Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();

    } else {
 
    }
    
    // Check if user has isTruckOwner claim
    if (!userRecord.customClaims || !userRecord.customClaims.isTruckOwner) {
 
      await admin.auth().setCustomUserClaims(uid, { 
        ...userRecord.customClaims,
        isTruckOwner: true 
      });

      
      // Verify the claim was set
      const updatedUser = await admin.auth().getUser(uid);
     
    } else {
     
    }
    
  } catch (error) {
    
  }
}

// Replace with the current user's UID you're testing with
// You can get this from the browser console when logged in by typing: firebase.auth().currentUser.uid
// Or look at the console logs when you load the dashboard
const testUID = process.argv[2] || "ZwulCgjrukVVsh7CylHEU9V58gi1"; // Update this with your current user UID

if (!process.argv[2]) {

}

debugUserClaims(testUID)
  .then(() => {
  
    process.exit(0);
  })
  .catch(err => {

    process.exit(1);
  });
