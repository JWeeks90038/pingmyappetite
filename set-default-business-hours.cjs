const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json')),
    databaseURL: 'https://foodtrucktracker-ad6c8-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

// Default business hours (9 AM to 5 PM, Monday through Saturday)
const DEFAULT_BUSINESS_HOURS = {
  sunday: { open: '10:00 AM', close: '4:00 PM', closed: true },
  monday: { open: '9:00 AM', close: '5:00 PM', closed: false },
  tuesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
  wednesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
  thursday: { open: '9:00 AM', close: '5:00 PM', closed: false },
  friday: { open: '9:00 AM', close: '5:00 PM', closed: false },
  saturday: { open: '9:00 AM', close: '5:00 PM', closed: false }
};

async function setDefaultBusinessHours() {
  try {
    console.log('🏪 Setting default business hours for users without them...\n');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.size} total users`);
    
    let usersWithoutHours = 0;
    let usersUpdated = 0;
    let batch = db.batch();
    let batchCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Check if user has business hours
      if (!userData.businessHours) {
        usersWithoutHours++;
        
        console.log(`🔧 Setting default hours for: ${userData.truckName || 'Unnamed'} (${userId})`);
        
        // Add default business hours
        batch.update(userDoc.ref, {
          businessHours: DEFAULT_BUSINESS_HOURS,
          businessHoursSource: 'default',
          businessHoursSetAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        batchCount++;
        usersUpdated++;
        
        // Commit batch every 500 operations (Firestore limit is 500)
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`✅ Committed batch of ${batchCount} updates`);
          batch = db.batch();
          batchCount = 0;
        }
      }
    }
    
    // Commit any remaining operations
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch of ${batchCount} updates`);
    }
    
    console.log('\n📈 SUMMARY:');
    console.log(`👥 Total users: ${usersSnapshot.size}`);
    console.log(`❌ Users without business hours: ${usersWithoutHours}`);
    console.log(`✅ Users updated with defaults: ${usersUpdated}`);
    
    console.log('\n🏪 DEFAULT HOURS SET:');
    console.log('📅 Monday-Saturday: 9:00 AM - 5:00 PM (OPEN)');
    console.log('📅 Sunday: 10:00 AM - 4:00 PM (CLOSED by default)');
    
    console.log('\n💡 BENEFITS:');
    console.log('1. New users will immediately show correct OPEN/CLOSED status');
    console.log('2. Existing users without hours will now show proper status');
    console.log('3. Users can still customize their hours in settings');
    console.log('4. Status filtering will work consistently for all trucks');
    
  } catch (error) {
    console.error('❌ Error setting default business hours:', error);
  }
}

// Run the default hours setup
setDefaultBusinessHours()
  .then(() => {
    console.log('\n✅ Default business hours setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
