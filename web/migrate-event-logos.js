// Migration script to add organizerLogoUrl to existing events
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc,
  query,
  where
} from 'firebase/firestore';

// Firebase config (copy from your firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyBzTNlQMkIiK1_IOphDwE34L2kzpdMQWD8",
  authDomain: "foodtruckfinder-27eba.firebaseapp.com",
  projectId: "foodtruckfinder-27eba",
  storageBucket: "foodtruckfinder-27eba.firebasestorage.app",
  messagingSenderId: "418485074487",
  appId: "1:418485074487:web:14b0febd3cca4e724b1db2",
  measurementId: "G-MHVKR07V99"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateEventLogos() {

  
  try {
    // Get all events that have an organizerId but no organizerLogoUrl
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(eventsRef, where('organizerId', '!=', null));
    const eventsSnapshot = await getDocs(eventsQuery);
    

    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data();
      
      // Skip if already has organizerLogoUrl
      if (eventData.organizerLogoUrl) {

        continue;
      }
      
      try {
        // Fetch organizer's logo URL
        const organizerDoc = await getDoc(doc(db, 'users', eventData.organizerId));
        
        if (organizerDoc.exists() && organizerDoc.data().logoUrl) {
          const logoUrl = organizerDoc.data().logoUrl;
          
          // Update event with organizerLogoUrl
          await updateDoc(doc(db, 'events', eventDoc.id), {
            organizerLogoUrl: logoUrl
          });
          
  
          updatedCount++;
        } else {

        }
      } catch (error) {

        errorCount++;
      }
    }
    

    
  } catch (error) {

  }
}

// Run migration
migrateEventLogos();
