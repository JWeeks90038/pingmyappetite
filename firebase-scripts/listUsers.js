const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function listUsers() {
  try {

    
    // Get users from Firestore
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {

      return;
    }
    

    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;
      
      try {
        // Check if user exists in Auth
        const userRecord = await admin.auth().getUser(uid);
  
      } catch (authError) {

      }
    }
    
  } catch (error) {

  }
}

listUsers()
  .then(() => {

    process.exit(0);
  })
  .catch(err => {

    process.exit(1);
  });
