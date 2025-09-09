/**
 * Script to update existing events with organizerLogoUrl field
 * This will help ensure event markers show images instead of blue stars
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://foodtruckfinder-27eba-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

async function updateEventLogos() {
  try {

    
    // Get all events
    const eventsSnapshot = await db.collection('events').get();

    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process events in batches to avoid overwhelming the database
    const batchSize = 10;
    const events = eventsSnapshot.docs;
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (eventDoc) => {
        try {
          const eventData = eventDoc.data();
          const eventId = eventDoc.id;
          

          
          // Skip if event already has organizerLogoUrl
          if (eventData.organizerLogoUrl) {
  
            skippedCount++;
            return;
          }
          
          // Skip if event has no organizerId
          if (!eventData.organizerId) {
       
            skippedCount++;
            return;
          }
          
          // Get organizer data
          const organizerDoc = await db.collection('users').doc(eventData.organizerId).get();
          
          if (!organizerDoc.exists()) {
         
            skippedCount++;
            return;
          }
          
          const organizerData = organizerDoc.data();
          
          if (organizerData.logoUrl) {
            // Update event with organizer's logo URL
            await eventDoc.ref.update({
              organizerLogoUrl: organizerData.logoUrl,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
          
            updatedCount++;
          } else {
  
            skippedCount++;
          }
          
        } catch (error) {

          errorCount++;
        }
      }));
      
      // Small delay between batches to be gentle on the database
      if (i + batchSize < events.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    

    
  } catch (error) {

  }
}

// Run the update
updateEventLogos()
  .then(() => {

    process.exit(0);
  })
  .catch((error) => {

    process.exit(1);
  });
