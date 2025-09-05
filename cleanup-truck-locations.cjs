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
    console.log('✅ Loaded Firebase config from firebase.js');
  } else {
    throw new Error('Firebase config not found in firebase.js');
  }
} catch (error) {
  console.error('❌ Error loading Firebase config from firebase.js:', error.message);
  
  // Fallback to environment variables or manual input
  console.log('⚠️ Please enter your Firebase configuration:');
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
    console.error(`❌ Error checking user ${uid}:`, error.message);
    return true;
  }
}

// Main cleanup function
async function cleanupTruckLocations() {
  console.log('🔍 Starting cleanup of truckLocations collection...');
  
  try {
    // Get all documents from truckLocations collection
    const truckLocationsRef = collection(db, 'truckLocations');
    const snapshot = await getDocs(truckLocationsRef);
    
    console.log(`📊 Found ${snapshot.size} documents in truckLocations collection`);
    
    const deletePromises = [];
    const deletedOwners = [];
    
    // Check each document
    for (const truckDoc of snapshot.docs) {
      const ownerId = truckDoc.id; // Document ID is the owner ID
      const exists = await checkUserExists(ownerId);
      
      if (!exists) {
        console.log(`🗑️ Owner ${ownerId} no longer exists, deleting truckLocation document...`);
        deletePromises.push(deleteDoc(doc(db, 'truckLocations', ownerId)));
        deletedOwners.push(ownerId);
      } else {
        console.log(`✓ Owner ${ownerId} exists, keeping truckLocation document`);
      }
    }
    
    // Execute all delete operations
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`✅ Successfully deleted ${deletePromises.length} truckLocation documents for non-existent owners`);
      console.log('🗑️ Deleted owner IDs:');
      deletedOwners.forEach((id, index) => {
        console.log(`   ${index + 1}. ${id}`);
      });
    } else {
      console.log('✅ No cleanup needed. All truckLocation documents have valid owners.');
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupTruckLocations()
  .then(() => console.log('🎉 Cleanup complete!'))
  .catch(err => console.error('❌ Fatal error:', err))
  .finally(() => process.exit());
