const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncDisplayName() {
  try {
    // Your user ID from the logs
    const userId = 'Sy3rlEFPLfbWZzY9oO9oECcoXK62';
    

    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {

      return;
    }
    
    const userData = userDoc.data();
 
    
    if (userData.username && userData.username !== userData.displayName) {

      
      await db.collection('users').doc(userId).update({
        displayName: userData.username
      });
      
    
    } else {
    
    }
    
  } catch (error) {

  }
}

syncDisplayName().then(() => {

  process.exit(0);
});
