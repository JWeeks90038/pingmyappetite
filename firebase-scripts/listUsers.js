const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function listUsers() {
  try {
    console.log("\n=== Listing all users ===");
    
    // Get users from Firestore
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log("No users found in Firestore");
      return;
    }
    
    console.log(`Found ${usersSnapshot.size} users in Firestore:\n`);
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;
      
      try {
        // Check if user exists in Auth
        const userRecord = await admin.auth().getUser(uid);
        console.log(`✅ UID: ${uid}`);
        console.log(`   Email: ${userRecord.email}`);
        console.log(`   Role: ${userData.role || 'Not set'}`);
        console.log(`   Plan: ${userData.plan || 'Not set'}`);
        console.log(`   Custom Claims: ${JSON.stringify(userRecord.customClaims || {})}`);
        console.log("");
      } catch (authError) {
        console.log(`❌ UID: ${uid} (exists in Firestore but NOT in Auth)`);
        console.log(`   Email: ${userData.email || 'Not set'}`);
        console.log(`   Role: ${userData.role || 'Not set'}`);
        console.log(`   Plan: ${userData.plan || 'Not set'}`);
        console.log("");
      }
    }
    
  } catch (error) {
    console.error("Error listing users:", error);
  }
}

listUsers()
  .then(() => {
    console.log("=== User listing complete ===");
    process.exit(0);
  })
  .catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
  });
