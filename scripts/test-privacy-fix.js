const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

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
const auth = getAuth(app);

async function testPrivacyFix() {
  try {
    console.log('🔒 Testing Privacy Fix Implementation');
    console.log('=====================================\n');

    // Test with a customer account (you'll need valid credentials)
    console.log('📍 Step 1: Testing as customer user...');
    
    // Try to read all truck locations
    const trucksSnapshot = await getDocs(collection(db, 'truckLocations'));
    console.log(`📊 Found ${trucksSnapshot.size} trucks visible to customer`);
    
    trucksSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`🚚 Truck ${doc.id}:`, {
        truckName: data.truckName || 'Unknown',
        visible: data.visible,
        lat: data.lat ? 'Has coordinates' : 'No coordinates',
        lastActive: data.lastActive ? new Date(data.lastActive).toLocaleString() : 'Never'
      });
    });

    console.log('\n✅ Test complete! Only trucks with visible=true should appear above.');
    console.log('🔒 If a truck is set to "Hide Truck", it should NOT appear in this list.');
    
  } catch (error) {
    console.error('❌ Privacy test error:', error);
  }
}

// Run the test
testPrivacyFix();
