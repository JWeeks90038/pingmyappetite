const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function debugUserClaims(uid) {
  try {
    console.log(`\n=== Debugging User Claims for UID: ${uid} ===`);
    
    // Check if user exists in Auth
    const userRecord = await admin.auth().getUser(uid);
    console.log(`✅ User exists in Firebase Auth`);
    console.log(`Email: ${userRecord.email}`);
    console.log(`Custom Claims:`, userRecord.customClaims || "None");
    
    // Check user document in Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`✅ User document exists in Firestore`);
      console.log(`Role: ${userData.role}`);
      console.log(`Plan: ${userData.plan}`);
      console.log(`Subscription Status: ${userData.subscriptionStatus}`);
    } else {
      console.log(`❌ User document NOT found in Firestore`);
    }
    
    // Check if user has isTruckOwner claim
    if (!userRecord.customClaims || !userRecord.customClaims.isTruckOwner) {
      console.log(`\n⚠️  User missing isTruckOwner claim. Setting it now...`);
      await admin.auth().setCustomUserClaims(uid, { 
        ...userRecord.customClaims,
        isTruckOwner: true 
      });
      console.log(`✅ isTruckOwner claim set successfully!`);
      
      // Verify the claim was set
      const updatedUser = await admin.auth().getUser(uid);
      console.log(`Verification - Custom Claims:`, updatedUser.customClaims);
    } else {
      console.log(`✅ User already has isTruckOwner claim`);
    }
    
  } catch (error) {
    console.error(`❌ Error debugging user claims:`, error);
  }
}

// Replace with the current user's UID you're testing with
// You can get this from the browser console when logged in by typing: firebase.auth().currentUser.uid
// Or look at the console logs when you load the dashboard
const testUID = process.argv[2] || "ZwulCgjrukVVsh7CylHEU9V58gi1"; // Update this with your current user UID

if (!process.argv[2]) {
  console.log("🔍 No UID provided as argument. Using default UID.");
  console.log("💡 To use a specific UID, run: node debugUserClaims.js YOUR_USER_UID");
  console.log("💡 You can find your UID in the browser console when logged into the dashboard");
}

debugUserClaims(testUID)
  .then(() => {
    console.log(`\n=== Debug Complete ===`);
    process.exit(0);
  })
  .catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
  });
