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
  
    
    const trucksSnapshot = await getDocs(collection(db, 'truckLocations'));
    
    
    if (trucksSnapshot.size === 0) {
     
      return;
    }
    
   
    
    trucksSnapshot.forEach(doc => {
      const data = doc.data();
  
    });
    
    const visibleTrucks = trucksSnapshot.docs.filter(doc => doc.data().visible === true);
    const hiddenTrucks = trucksSnapshot.docs.filter(doc => doc.data().visible === false);
    const unknownTrucks = trucksSnapshot.docs.filter(doc => doc.data().visible === undefined || doc.data().visible === null);
    

    
  } catch (error) {
    
  }
}

// Run the check
checkTruckDatabase();
