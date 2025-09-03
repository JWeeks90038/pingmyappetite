const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json')),
    databaseURL: 'https://foodtrucktracker-ad6c8-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function findSSPTruckData() {
  try {
    console.log('🔍 Searching for SSP truck data across all Firebase collections...\n');
    
    // Search in users collection
    console.log('📱 Checking users collection...');
    const usersSnapshot = await db.collection('users')
      .where('truckName', '==', 'SSP')
      .get();
    
    if (!usersSnapshot.empty) {
      usersSnapshot.forEach(doc => {
        console.log(`👤 Found user: ${doc.id}`);
        console.log(`📊 Data:`, doc.data());
      });
    } else {
      console.log('✅ No SSP users found in users collection');
    }
    
    // Search for any users with truckName containing SSP
    console.log('\n📱 Checking for any truck names containing "SSP"...');
    const allUsersSnapshot = await db.collection('users').get();
    
    allUsersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.truckName && userData.truckName.includes('SSP')) {
        console.log(`👤 Found related user: ${doc.id}`);
        console.log(`🚛 Truck name: ${userData.truckName}`);
        console.log(`📧 Email: ${userData.email || 'N/A'}`);
        console.log(`👁️ Visible: ${userData.visible !== false ? 'YES' : 'NO'}`);
      }
    });
    
    // Search in truckLocations collection
    console.log('\n📍 Checking truckLocations collection...');
    const truckLocationsSnapshot = await db.collection('truckLocations').get();
    
    let sspTruckLocations = [];
    truckLocationsSnapshot.forEach(doc => {
      const truckData = doc.data();
      if (truckData.truckName === 'SSP' || 
          (truckData.name && truckData.name.includes('SSP')) ||
          truckData.visible === true) {
        sspTruckLocations.push({
          id: doc.id,
          data: truckData
        });
      }
    });
    
    if (sspTruckLocations.length > 0) {
      console.log(`🚛 Found ${sspTruckLocations.length} truck location entries:`);
      sspTruckLocations.forEach(truck => {
        console.log(`📍 Truck ID: ${truck.id}`);
        console.log(`🚛 Name: ${truck.data.truckName || truck.data.name || 'Unnamed'}`);
        console.log(`👁️ Visible: ${truck.data.visible}`);
        console.log(`📍 Has coordinates: ${truck.data.latitude && truck.data.longitude ? 'YES' : 'NO'}`);
        console.log(`📅 Last update: ${truck.data.timestamp ? new Date(truck.data.timestamp.seconds * 1000) : 'N/A'}`);
        console.log('---');
      });
    } else {
      console.log('✅ No SSP truck locations found');
    }
    
    // Check for any visible trucks without matching users
    console.log('\n🔍 Checking for orphaned truck locations...');
    const visibleTrucksSnapshot = await db.collection('truckLocations')
      .where('visible', '==', true)
      .get();
    
    for (const truckDoc of visibleTrucksSnapshot.docs) {
      const truckData = truckDoc.data();
      const truckId = truckDoc.id;
      
      // Check if corresponding user exists
      const userDoc = await db.collection('users').doc(truckId).get();
      
      if (!userDoc.exists) {
        console.log(`⚠️ ORPHANED TRUCK FOUND:`);
        console.log(`📍 Truck ID: ${truckId}`);
        console.log(`🚛 Name: ${truckData.truckName || truckData.name || 'Unnamed'}`);
        console.log(`👁️ Visible: ${truckData.visible}`);
        console.log(`❌ No corresponding user data found!`);
        console.log('---');
      }
    }
    
    console.log('\n💡 CLEANUP RECOMMENDATIONS:');
    console.log('1. Delete orphaned truck location entries');
    console.log('2. Set visible=false for any remaining truck locations');
    console.log('3. Clear any cached data in the app');
    
  } catch (error) {
    console.error('❌ Error searching for SSP truck data:', error);
  }
}

// Run the search
findSSPTruckData()
  .then(() => {
    console.log('\n✅ Search completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Search failed:', error);
    process.exit(1);
  });
