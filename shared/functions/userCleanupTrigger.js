import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// This trigger fires when a user document is deleted from the 'users' collection
export const cleanupUserData = onDocumentDeleted({
  document: "users/{userId}",
  region: "us-central1"
}, async (event) => {
  const userId = event.params.userId;
  

  const cleanupResults = {
    truckLocation: false,
    truckDocument: false,
    menuItems: 0,
    pings: 0,
    favorites: 0,
    events: 0,
    referrals: false
  };

  try {
    // Clean up truck location (always attempt regardless of role)
    try {
      await db.collection('truckLocations').doc(userId).delete();
      cleanupResults.truckLocation = true;
  
    } catch (error) {
 
    }

    // Clean up truck document
    try {
      await db.collection('trucks').doc(userId).delete();
      cleanupResults.truckDocument = true;
  
    } catch (error) {
 
    }

    // Clean up menu items
    try {
      const menuItemsQuery = await db.collection('menuItems').where('ownerId', '==', userId).get();
      if (!menuItemsQuery.empty) {
        const batch = db.batch();
        menuItemsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        cleanupResults.menuItems = menuItemsQuery.docs.length;
      
      }
    } catch (error) {
    
    }

    // Clean up pings
    try {
      const pingsQuery = await db.collection('pings').where('userId', '==', userId).get();
      if (!pingsQuery.empty) {
        const batch = db.batch();
        pingsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        cleanupResults.pings = pingsQuery.docs.length;
  
      }
    } catch (error) {
 
    }

    // Clean up favorites
    try {
      const favoritesQuery = await db.collection('favorites').where('userId', '==', userId).get();
      if (!favoritesQuery.empty) {
        const batch = db.batch();
        favoritesQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        cleanupResults.favorites = favoritesQuery.docs.length;

      }
    } catch (error) {

    }

    // Clean up events (where user is organizer)
    try {
      const eventsQuery = await db.collection('events').where('organizerId', '==', userId).get();
      if (!eventsQuery.empty) {
        const batch = db.batch();
        eventsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        cleanupResults.events = eventsQuery.docs.length;

      }
    } catch (error) {

    }

    // Clean up referrals
    try {
      await db.collection('referrals').doc(userId).delete();
      cleanupResults.referrals = true;
  
    } catch (error) {

    }

 

  } catch (error) {

  }
});
