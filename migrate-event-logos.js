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
  // Add your config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateEventLogos() {
  console.log('🔄 Starting event logo migration...');
  
  try {
    // Get all events that have an organizerId but no organizerLogoUrl
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(eventsRef, where('organizerId', '!=', null));
    const eventsSnapshot = await getDocs(eventsQuery);
    
    console.log(`📊 Found ${eventsSnapshot.size} events with organizers`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data();
      
      // Skip if already has organizerLogoUrl
      if (eventData.organizerLogoUrl) {
        console.log(`⏭️ Event ${eventDoc.id} already has organizerLogoUrl, skipping`);
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
          
          console.log(`✅ Updated event ${eventDoc.id} with logo URL`);
          updatedCount++;
        } else {
          console.log(`⚠️ No logo found for organizer ${eventData.organizerId} (event ${eventDoc.id})`);
        }
      } catch (error) {
        console.error(`❌ Error updating event ${eventDoc.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`🎉 Migration complete: ${updatedCount} events updated, ${errorCount} errors`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration
migrateEventLogos();
