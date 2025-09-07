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
    console.log('🔄 Starting event logo update process...');
    
    // Get all events
    const eventsSnapshot = await db.collection('events').get();
    console.log(`📊 Found ${eventsSnapshot.size} events to process`);
    
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
          
          console.log(`🎭 Processing event: ${eventId} - ${eventData.title}`);
          
          // Skip if event already has organizerLogoUrl
          if (eventData.organizerLogoUrl) {
            console.log(`✅ Event ${eventId} already has organizerLogoUrl, skipping`);
            skippedCount++;
            return;
          }
          
          // Skip if event has no organizerId
          if (!eventData.organizerId) {
            console.log(`⚠️ Event ${eventId} has no organizerId, skipping`);
            skippedCount++;
            return;
          }
          
          // Get organizer data
          const organizerDoc = await db.collection('users').doc(eventData.organizerId).get();
          
          if (!organizerDoc.exists()) {
            console.log(`⚠️ Organizer ${eventData.organizerId} not found for event ${eventId}`);
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
            
            console.log(`✅ Updated event ${eventId} with logo URL: ${organizerData.logoUrl}`);
            updatedCount++;
          } else {
            console.log(`⚠️ Organizer ${eventData.organizerId} has no logoUrl for event ${eventId}`);
            skippedCount++;
          }
          
        } catch (error) {
          console.error(`❌ Error processing event ${eventDoc.id}:`, error.message);
          errorCount++;
        }
      }));
      
      // Small delay between batches to be gentle on the database
      if (i + batchSize < events.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('\n📊 Update Summary:');
    console.log(`✅ Updated: ${updatedCount} events`);
    console.log(`⏭️ Skipped: ${skippedCount} events`);
    console.log(`❌ Errors: ${errorCount} events`);
    console.log('🎉 Event logo update process completed!');
    
  } catch (error) {
    console.error('❌ Fatal error during event logo update:', error);
  }
}

// Run the update
updateEventLogos()
  .then(() => {
    console.log('✅ Script execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
