const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAmeQ8JrZrBN2YIrA7dCaxasaWLW4KqgG0",
  authDomain: "ping-my-appetite.firebaseapp.com",
  projectId: "ping-my-appetite",
  storageBucket: "ping-my-appetite.appspot.com",
  messagingSenderId: "1090307671860",
  appId: "1:1090307671860:web:d8c1b2c7f0a4b8e0c5f1a2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkGrubberData() {
  try {
    console.log('🔍 Checking for The Grubber in database...');
    
    // Check truckLocations collection
    console.log('\n📍 Checking truckLocations collection:');
    const trucksRef = collection(db, 'truckLocations');
    const trucksSnapshot = await getDocs(trucksRef);
    
    trucksSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`🚚 Truck ${doc.id}:`, {
        truckName: data.truckName,
        visible: data.visible,
        isLive: data.isLive,
        lat: data.lat,
        lng: data.lng,
        coordinates: data.coordinates
      });
    });
    
    // Check users collection for Grubber owner
    console.log('\n👤 Checking users collection for Grubber:');
    const usersRef = collection(db, 'users');
    const grubberQuery = query(usersRef, where('truckName', '==', 'The Grubber'));
    const grubberSnapshot = await getDocs(grubberQuery);
    
    grubberSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`👤 User ${doc.id} (The Grubber owner):`, {
        truckName: data.truckName,
        email: data.email,
        role: data.role,
        plan: data.plan
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkGrubberData();
