const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDLbcv1c9VfWMo5KeFr5N-a37iHLRYz_ts",
  authDomain: "foodtruckfinder-27eba.firebaseapp.com",
  projectId: "foodtruckfinder-27eba",
  storageBucket: "foodtruckfinder-27eba.appspot.com",
  messagingSenderId: "451522777533",
  appId: "1:451522777533:web:c3b7d93c4f7c5e1a6faa1e",
  measurementId: "G-Q1EWQHVTHG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTruckDatabase() {
  try {
    console.log('🔍 Checking truckLocations collection...');
    
    const trucksSnapshot = await getDocs(collection(db, 'truckLocations'));
    console.log(`📊 Found ${trucksSnapshot.size} trucks in database`);
    
    if (trucksSnapshot.size === 0) {
      console.log('❌ No trucks found in database - this explains why mock data is showing');
      return;
    }
    
    console.log('\n🚚 Truck visibility status:');
    console.log('================================');
    
    trucksSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`🚛 Truck ID: ${doc.id}`);
      console.log(`   Name: ${data.truckName || 'Unknown'}`);
      console.log(`   Visible: ${data.visible}`);
      console.log(`   Has coordinates: ${!!(data.lat && data.lng)}`);
      console.log(`   Last active: ${data.lastActive ? new Date(data.lastActive).toLocaleString() : 'Never'}`);
      console.log('   ---');
    });
    
    const visibleTrucks = trucksSnapshot.docs.filter(doc => doc.data().visible === true);
    const hiddenTrucks = trucksSnapshot.docs.filter(doc => doc.data().visible === false);
    const unknownTrucks = trucksSnapshot.docs.filter(doc => doc.data().visible === undefined || doc.data().visible === null);
    
    console.log('\n📈 Summary:');
    console.log(`✅ Visible trucks: ${visibleTrucks.length}`);
    console.log(`🔒 Hidden trucks: ${hiddenTrucks.length}`);
    console.log(`❓ Unknown visibility: ${unknownTrucks.length}`);
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

// Run the check
checkTruckDatabase();
