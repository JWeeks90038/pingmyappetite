const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function debugUserRoles() {
  try {
    console.log('=== DEBUGGING USER ROLES ===');
    
    // Get all users and their roles
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('No users found');
      return;
    }
    
    console.log('Total users:', usersSnapshot.size);
    
    const roleCount = {};
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const role = userData.role || 'no_role';
      roleCount[role] = (roleCount[role] || 0) + 1;
      
      // Log user with details if they have a plan
      if (userData.plan || userData.lat || userData.lng || userData.cuisine) {
        console.log('User:', doc.id, {
          role: userData.role,
          plan: userData.plan,
          lat: userData.lat,
          lng: userData.lng,
          cuisine: userData.cuisine,
          cuisines: userData.cuisines,
          email: userData.email
        });
      }
    });
    
    console.log('Role distribution:', roleCount);
    
    // Check truckLocations collection
    console.log('\n=== CHECKING TRUCK LOCATIONS ===');
    const truckLocationsSnapshot = await db.collection('truckLocations').get();
    
    if (truckLocationsSnapshot.empty) {
      console.log('No truck locations found');
    } else {
      console.log('Truck locations found:', truckLocationsSnapshot.size);
      truckLocationsSnapshot.forEach((doc) => {
        const locationData = doc.data();
        console.log('Truck Location:', doc.id, {
          lat: locationData.lat,
          lng: locationData.lng,
          address: locationData.address,
          timestamp: locationData.timestamp
        });
      });
    }
    
  } catch (error) {
    console.error('Error debugging user roles:', error);
  }
}

debugUserRoles().then(() => {
  console.log('Debug complete');
  process.exit(0);
});
