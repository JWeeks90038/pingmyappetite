const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../serviceAccountKey.json'))
  });
}

const db = admin.firestore();

// Default business hours (9 AM to 5 PM, Monday through Saturday)
// Using ordered structure to ensure correct day sequence in UI
const DEFAULT_BUSINESS_HOURS = {
  monday: { open: '9:00 AM', close: '5:00 PM', closed: false },
  tuesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
  wednesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
  thursday: { open: '9:00 AM', close: '5:00 PM', closed: false },
  friday: { open: '9:00 AM', close: '5:00 PM', closed: false },
  saturday: { open: '9:00 AM', close: '5:00 PM', closed: false },
  sunday: { open: '10:00 AM', close: '4:00 PM', closed: true }
};

async function setDefaultBusinessHours() {
  try {

    
    // Get all users
    const usersSnapshot = await db.collection('users').get();

    
    let usersWithoutHours = 0;
    let usersUpdated = 0;
    let batch = db.batch();
    let batchCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Check if user has business hours
      if (!userData.businessHours) {
        usersWithoutHours++;
        

        
        // Add default business hours
        batch.update(userDoc.ref, {
          businessHours: DEFAULT_BUSINESS_HOURS,
          businessHoursSource: 'default',
          businessHoursSetAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        batchCount++;
        usersUpdated++;
        
        // Commit batch every 500 operations (Firestore limit is 500)
        if (batchCount >= 500) {
          await batch.commit();
 
          batch = db.batch();
          batchCount = 0;
        }
      }
    }
    
    // Commit any remaining operations
    if (batchCount > 0) {
      await batch.commit();

    }
    

  } catch (error) {

  }
}

// Run the default hours setup
setDefaultBusinessHours()
  .then(() => {

    process.exit(0);
  })
  .catch((error) => {

    process.exit(1);
  });
