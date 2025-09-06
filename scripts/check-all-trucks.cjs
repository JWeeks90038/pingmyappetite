const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json')),
    databaseURL: 'https://foodtrucktracker-ad6c8-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function checkAllYourTrucks() {
  try {
    console.log('🔍 Checking all trucks associated with your account...\n');
    
    // Your email from the logs
    const userEmail = 'jonas.weeks@gmail.com';
    
    // Find all users with this email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', userEmail)
      .get();
    
    console.log(`📊 Found ${usersSnapshot.size} user records with email: ${userEmail}\n`);
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      console.log('='.repeat(60));
      console.log(`🚛 TRUCK: ${userData.truckName || 'Unnamed Truck'}`);
      console.log(`📧 Email: ${userData.email}`);
      console.log(`🆔 User ID: ${userId}`);
      console.log(`👤 Owner: ${userData.ownerName || 'N/A'}`);
      console.log(`📋 Plan: ${userData.plan || 'N/A'}`);
      console.log(`🏪 Business Hours: ${userData.businessHours ? 'SET' : 'MISSING'}`);
      
      if (userData.businessHours) {
        console.log('📅 Wednesday Hours:', userData.businessHours.wednesday);
      } else {
        console.log('⚠️ No business hours - will default to OPEN always');
      }
      
      // Check truck location visibility
      const truckDoc = await db.collection('truckLocations').doc(userId).get();
      const truckData = truckDoc.data();
      
      if (truckData) {
        console.log(`👁️ Visible: ${truckData.visible ? 'YES' : 'NO'}`);
        console.log(`📍 Live tracking: ${truckData.isLive ? 'ON' : 'OFF'}`);
        console.log(`🔄 Status: ${truckData.status || 'default'}`);
      } else {
        console.log('❌ No truck location data found');
      }
      
      console.log('='.repeat(60));
      console.log('');
    }
    
    console.log('\n💡 ANALYSIS:');
    console.log('1. "The Grubber" has business hours ✅ - shows correct CLOSED status');
    console.log('2. "The Grub Spot" has NO business hours ❌ - defaults to OPEN');
    console.log('\n🔧 SOLUTIONS:');
    console.log('A. Set business hours for "The Grub Spot" if it should have them');
    console.log('B. Or mark "The Grub Spot" as not visible if it\'s not active');
    console.log('C. Or update the status filtering to be more intelligent');
    
  } catch (error) {
    console.error('❌ Error checking trucks:', error);
  }
}

// Run the analysis
checkAllYourTrucks()
  .then(() => {
    console.log('\n✅ Analysis completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });
