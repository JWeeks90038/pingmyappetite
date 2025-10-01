const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {

    process.exit(1);
  }
}

const db = admin.firestore();

async function checkDormantOwners() {
  try {

    
    // Get all users with owner role
    const ownersSnapshot = await db.collection('users')
      .where('role', '==', 'owner')
      .get();
    
    if (ownersSnapshot.empty) {

      return;
    }
    

    
    let activeOwners = 0;
    let dormantOwners = 0;
    const dormantList = [];
    
    for (const ownerDoc of ownersSnapshot.docs) {
      const ownerData = ownerDoc.data();
      const ownerId = ownerDoc.id;
      
      // Check if they have an active truck location (meaning they've used mobile app)
      const truckLocationDoc = await db.collection('truckLocations').doc(ownerId).get();
      
      const hasLocation = ownerData.lat && ownerData.lng;
      const hasTruckName = ownerData.truckName;
      const hasCuisine = ownerData.cuisine || ownerData.cuisineType;
      const hasRecentActivity = truckLocationDoc.exists();
      
      if (hasRecentActivity) {
        activeOwners++;
    
      } else {
        dormantOwners++;

        
        dormantList.push({
          id: ownerId,
          name: ownerData.truckName || 'Unknown Kitchen',
          email: ownerData.email,
          hasLocation,
          lat: ownerData.lat || null,
          lng: ownerData.lng || null,
          cuisine: hasCuisine,
          createdAt: ownerData.createdAt?.toDate?.() || null
        });
      }
    }
    

    
    if (dormantList.length > 0) {

      const mappableOwners = dormantList.filter(owner => owner.hasLocation);
 
      
      if (mappableOwners.length > 0) {
   
        mappableOwners.forEach(owner => {
    
        });
      }
    }
    
  } catch (error) {

  }
}

checkDormantOwners().then(() => {

  process.exit(0);
});