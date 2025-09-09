const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  deleteDoc 
} = require('firebase/firestore');
const { 
  getAuth, 
  getUser 
} = require('firebase/auth');
const fs = require('fs');

// Load Firebase config
let firebaseConfig;
try {
  // Try to load from local firebase.js file
  const configContent = fs.readFileSync('./firebase.js', 'utf8');
  const configMatch = configContent.match(/const firebaseConfig = ({[\s\S]*?});/);
  if (configMatch && configMatch[1]) {
    firebaseConfig = eval('(' + configMatch[1] + ')');

  } else {
    throw new Error('Firebase config not found in firebase.js');
  }
} catch (error) {

  
  // Fallback to environment variables or manual input

  firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Function to check if a user exists
async function checkUserExists(uid) {
  try {
    await getUser(auth, uid);
    return true;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return false;
    }
    // For other errors, we'll assume the user exists to be safe

    return true;
  }
}

// Main cleanup function
async function cleanupTruckLocations() {

  
  try {
    // Get all documents from truckLocations collection
    const truckLocationsRef = collection(db, 'truckLocations');
    const snapshot = await getDocs(truckLocationsRef);
    
   
    
    const deletePromises = [];
    const deletedOwners = [];
    
    // Check each document
    for (const truckDoc of snapshot.docs) {
      const ownerId = truckDoc.id; // Document ID is the owner ID
      const exists = await checkUserExists(ownerId);
      
      if (!exists) {
 
        deletePromises.push(deleteDoc(doc(db, 'truckLocations', ownerId)));
        deletedOwners.push(ownerId);
      } else {
       
      }
    }
    
    // Execute all delete operations
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
 
      deletedOwners.forEach((id, index) => {
   
      });
    } else {
    
    }
  } catch (error) {

  }
}

// Run the cleanup
cleanupTruckLocations()
  .then(() => (''))
  .catch(err => (''))
  .finally(() => process.exit());
