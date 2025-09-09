const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  deleteDoc,
  query,
  where, 
  getDoc,
  writeBatch
} = require('firebase/firestore');
const { 
  getAuth,
  listUsers
} = require('firebase-admin/auth');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Function to load Firebase config
function loadFirebaseConfig() {
  // Try to load from serviceAccountKey.json first
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    
    // Initialize Firebase Admin with service account
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    // Extract project ID from service account
    const projectId = serviceAccount.project_id;
    
    // Get Firebase config from environment or use default values
    return {
      apiKey: process.env.FIREBASE_API_KEY || "apiKey",
      authDomain: `${projectId}.firebaseapp.com`,
      projectId: projectId,
      storageBucket: `${projectId}.appspot.com`,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "messagingSenderId",
      appId: process.env.FIREBASE_APP_ID || "appId"
    };
  }
  
  // Try to load from firebase.js if serviceAccountKey doesn't exist
  try {
    const configPath = path.join(process.cwd(), 'firebase.js');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const configMatch = configContent.match(/const firebaseConfig = ({[\s\S]*?});/);
      
      if (configMatch && configMatch[1]) {
        const config = eval('(' + configMatch[1] + ')');
        
        // Initialize Firebase Admin with default app
        try {
          admin.initializeApp();
        } catch (error) {
          process.exit(1);
        }
        
        return config;
      }
    }
    
    throw new Error('Firebase config not found in firebase.js');
  } catch (error) {
    process.exit(1);
  }
}

// Load Firebase config
const firebaseConfig = loadFirebaseConfig();

// Initialize Firebase client SDK
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const adminAuth = getAuth(admin.app());

// Keep track of all valid user IDs
let validUserIds = new Set();

// Function to get all valid Firebase Auth user IDs
async function getAllUserIds() {
  
  try {
    // Use Firebase Admin SDK to list users
    const userIds = new Set();
    let nextPageToken;
    
    do {
      const listUsersResult = await adminAuth.listUsers(1000, nextPageToken);
      listUsersResult.users.forEach(userRecord => {
        userIds.add(userRecord.uid);
      });
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    return userIds;
  } catch (error) {
    return new Set();
  }
}

// Function to clean up truck locations
async function cleanupTruckLocations(validUsers) {
  
  try {
    const truckLocationsRef = collection(db, 'truckLocations');
    const snapshot = await getDocs(truckLocationsRef);
    
    const deletePromises = [];
    const deletedOwners = [];
    
    // Check each truck location
    for (const truckDoc of snapshot.docs) {
      const ownerId = truckDoc.id;
      
      if (!validUsers.has(ownerId)) {
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
    
    return deletedOwners;
  } catch (error) {
    return [];
  }
}

// Function to clean up trucks collection
async function cleanupTrucks(validUsers) {
  
  try {
    const trucksRef = collection(db, 'trucks');
    const snapshot = await getDocs(trucksRef);
    
    const deletePromises = [];
    const deletedTrucks = [];
    
    // Check each truck
    for (const truckDoc of snapshot.docs) {
      const ownerId = truckDoc.id;
      
      if (!validUsers.has(ownerId)) {
        deletePromises.push(deleteDoc(doc(db, 'trucks', ownerId)));
        deletedTrucks.push(ownerId);
      } else {
      }
    }
    
    // Execute all delete operations
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      deletedTrucks.forEach((id, index) => {
      });
    } else {
    }
    
    return deletedTrucks;
  } catch (error) {
    return [];
  }
}

// Function to clean up menuItems collection (remove items with invalid ownerIds)
async function cleanupMenuItems(validUsers) {
  
  try {
    const menuItemsRef = collection(db, 'menuItems');
    const snapshot = await getDocs(menuItemsRef);
    
    // Use batched writes for better performance
    const batchSize = 500; // Firestore batch limit
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    let deletedCount = 0;
    
    // Check each menu item
    for (const menuDoc of snapshot.docs) {
      const menuData = menuDoc.data();
      const ownerId = menuData.ownerId;
      
      // Skip if there's no ownerId (shouldn't happen but let's be safe)
      if (!ownerId) {
        continue;
      }
      
      if (!validUsers.has(ownerId)) {
        currentBatch.delete(doc(db, 'menuItems', menuDoc.id));
        operationCount++;
        deletedCount++;
        
        // If batch is full, add it to batches array and create a new one
        if (operationCount >= batchSize) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      }
    }
    
    // Add the last batch if it has operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }
    
    // Commit all batches
    if (batches.length > 0) {
      await Promise.all(batches.map(batch => batch.commit()));
    } else {
    }
    
    return deletedCount;
  } catch (error) {
    return 0;
  }
}

// Main function to coordinate all cleanup operations
async function runCleanup() {
  
  try {
    // Step 1: Get all valid user IDs
    validUserIds = await getAllUserIds();
    
    if (validUserIds.size === 0) {
      return;
    }
    
    // Step 2: Clean up truckLocations collection
    const deletedTruckLocations = await cleanupTruckLocations(validUserIds);
    
    // Step 3: Clean up trucks collection
    const deletedTrucks = await cleanupTrucks(validUserIds);
    
    // Step 4: Clean up menuItems with invalid ownerIds
    const deletedMenuItems = await cleanupMenuItems(validUserIds);
    
    // Summary
    
    // Write log file for future reference
    const logContent = {
      timestamp: new Date().toISOString(),
      totalValidUsers: validUserIds.size,
      deletedTruckLocations,
      deletedTrucks,
      deletedMenuItemsCount: deletedMenuItems
    };
    
    fs.writeFileSync('firebase-cleanup-log.json', JSON.stringify(logContent, null, 2));
    
  } catch (error) {
  }
}

// Run the cleanup
runCleanup()
  .then(() => {})
  .catch(err => {})
  .finally(() => process.exit());
