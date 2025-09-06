const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, setDoc, query, where } = require('firebase/firestore');

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

async function forceHideGrubber() {
  try {
    console.log('🔍 Searching for The Grubber in users collection...');
    
    // Find The Grubber owner in users collection
    const usersRef = collection(db, 'users');
    const grubberQuery = query(usersRef, where('truckName', '==', 'The Grubber'));
    const grubberSnapshot = await getDocs(grubberQuery);
    
    if (grubberSnapshot.empty) {
      console.log('❌ No user found with truckName "The Grubber"');
      return;
    }
    
    const grubberUser = grubberSnapshot.docs[0];
    const grubberUserId = grubberUser.id;
    const grubberData = grubberUser.data();
    
    console.log('✅ Found The Grubber owner:', {
      id: grubberUserId,
      truckName: grubberData.truckName,
      email: grubberData.email
    });
    
    // Force hide the truck in truckLocations collection
    console.log('🔒 Force-hiding The Grubber truck...');
    const truckDocRef = doc(db, 'truckLocations', grubberUserId);
    
    await setDoc(truckDocRef, {
      ownerUid: grubberUserId,
      truckName: 'The Grubber',
      visible: false,  // FORCE HIDDEN
      isLive: false,
      lastActive: Date.now(),
      updatedAt: new Date(),
      lat: 33.8309,
      lng: -117.0934,
      coordinates: { lat: 33.8309, lng: -117.0934 }
    }, { merge: true });
    
    console.log('✅ Successfully force-hid The Grubber truck');
    console.log('✅ The truck should now be invisible to all users');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

forceHideGrubber();
