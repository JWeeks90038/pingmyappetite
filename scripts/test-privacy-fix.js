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



    
    // Try to read all truck locations
    const trucksSnapshot = await getDocs(collection(db, 'truckLocations'));

    
    trucksSnapshot.forEach(doc => {
      const data = doc.data();
    
    });


    
  } catch (error) {

  }
}

// Run the test
testPrivacyFix();
