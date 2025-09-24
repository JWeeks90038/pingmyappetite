const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkDormantOwners() {
  try {
    console.log('🔍 Checking for dormant mobile kitchen owners...\n');
    
    // Get all users with owner role
    const ownersSnapshot = await db.collection('users')
      .where('role', '==', 'owner')
      .get();
    
    if (ownersSnapshot.empty) {
      console.log('❌ No owners found in database');
      return;
    }
    
    console.log(`📊 Found ${ownersSnapshot.size} total owners\n`);
    
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
        console.log(`✅ ACTIVE: ${ownerData.truckName || 'Unknown'} - ${ownerData.email}`);
      } else {
        dormantOwners++;
        console.log(`😴 DORMANT: ${ownerData.truckName || 'Unknown'} - ${ownerData.email}`);
        console.log(`   Location: ${hasLocation ? `${ownerData.lat}, ${ownerData.lng}` : 'No coordinates'}`);
        console.log(`   Cuisine: ${hasCuisine || 'Not specified'}`);
        console.log(`   Has truck name: ${hasTruckName ? 'Yes' : 'No'}`);
        console.log(`   Created: ${ownerData.createdAt?.toDate?.() || 'Unknown'}\n`);
        
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
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Active owners (using mobile app): ${activeOwners}`);
    console.log(`   Dormant owners (signed up, not using app): ${dormantOwners}`);
    
    if (dormantList.length > 0) {
      console.log(`\n🎯 DORMANT OWNERS THAT CAN BE MAPPED:`);
      const mappableOwners = dormantList.filter(owner => owner.hasLocation);
      console.log(`   With coordinates: ${mappableOwners.length}`);
      console.log(`   Without coordinates: ${dormantList.length - mappableOwners.length}`);
      
      if (mappableOwners.length > 0) {
        console.log(`\n📍 READY TO MAP:`);
        mappableOwners.forEach(owner => {
          console.log(`   • ${owner.name} (${owner.cuisine || 'No cuisine'}) - ${owner.lat}, ${owner.lng}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking dormant owners:', error);
  }
}

checkDormantOwners().then(() => {
  console.log('\n✅ Dormant owner check complete');
  process.exit(0);
});