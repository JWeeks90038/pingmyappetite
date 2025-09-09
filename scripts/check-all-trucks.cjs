const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json')),
    databaseURL: 'https://foodtrucktracker-ad6c8-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function checkAllYourTrucks() {
  try {
    
    // Your email from the logs
    const userEmail = 'jonas.weeks@gmail.com';
    
    // Find all users with this email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', userEmail)
      .get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      if (userData.businessHours) {
      } else {
      }
      
      // Check truck location visibility
      const truckDoc = await db.collection('truckLocations').doc(userId).get();
      const truckData = truckDoc.data();
      
      if (truckData) {
      } else {
      }
      
    }
    
  } catch (error) {
  }
}

// Run the analysis
checkAllYourTrucks()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
