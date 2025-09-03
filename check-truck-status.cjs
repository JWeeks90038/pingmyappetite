const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json')),
    databaseURL: 'https://foodtrucktracker-ad6c8-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

// Your truck ID from the logs
const TRUCK_ID = 'HwqiS0wvDybUrchouIpLX3BGhHO2'; // The Grubber

async function checkTruckStatus() {
  try {
    console.log('🔍 Checking current truck status...');
    
    // Get user data (business hours)
    const userDoc = await db.collection('users').doc(TRUCK_ID).get();
    const userData = userDoc.data();
    
    // Get truck location data (visibility, isLive status)  
    const truckDoc = await db.collection('truckLocations').doc(TRUCK_ID).get();
    const truckData = truckDoc.data();
    
    console.log('\n📊 TRUCK STATUS REPORT');
    console.log('🏪 Truck Name:', userData?.truckName || 'The Grubber');
    console.log('📍 User ID:', TRUCK_ID);
    
    // Business Hours Analysis
    console.log('\n📅 BUSINESS HOURS:');
    if (userData?.businessHours) {
      console.log('📋 Business hours found:');
      Object.entries(userData.businessHours).forEach(([day, hours]) => {
        console.log(`  ${day}: ${hours.open} - ${hours.close} ${hours.closed ? '(CLOSED)' : '(OPEN)'}`);
      });
    } else {
      console.log('❌ No business hours set');
    }
    
    // Current Time Analysis
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime12 = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
    
    console.log('\n🕐 CURRENT TIME ANALYSIS:');
    console.log('📅 Today:', currentDay);
    console.log('⏰ Current time:', currentTime12);
    
    // Business Hours Status
    if (userData?.businessHours?.[currentDay]) {
      const todayHours = userData.businessHours[currentDay];
      console.log('🏪 Today\'s hours:', todayHours.open, '-', todayHours.close);
      console.log('🚪 Day status:', todayHours.closed ? 'CLOSED' : 'OPEN');
      
      // Simple time comparison (you are at 8:05 AM, opens at 9:00 AM)
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const openTime = todayHours.open;
      
      if (todayHours.closed) {
        console.log('🔴 STATUS: CLOSED (Day marked as closed)');
      } else if (openTime.includes('9:00 AM') && currentHour < 9) {
        console.log('🔴 STATUS: CLOSED (Before opening time - opens at 9:00 AM)');
      } else {
        console.log('🟢 STATUS: Should be OPEN');
      }
    }
    
    // Visibility & Live Status
    console.log('\n👁️ VISIBILITY STATUS:');
    if (truckData) {
      console.log('🗺️ Visible on map:', truckData.visible ? '✅ YES' : '❌ NO');
      console.log('📍 Live tracking:', truckData.isLive ? '✅ ON' : '❌ OFF');
      console.log('⏰ Last active:', new Date(truckData.lastActive).toLocaleString());
      
      if (truckData.sessionStartTime) {
        console.log('🕐 Session started:', new Date(truckData.sessionStartTime).toLocaleString());
        const sessionDuration = Date.now() - truckData.sessionStartTime;
        const hoursActive = Math.round(sessionDuration / (60 * 60 * 1000) * 10) / 10;
        console.log('⏳ Session duration:', hoursActive, 'hours');
      }
    } else {
      console.log('❌ No truck location data found');
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    if (!userData?.businessHours) {
      console.log('⚠️ Set up business hours in your food truck settings');
    }
    
    if (currentDay === 'wednesday' && currentTime12.includes('8:')) {
      console.log('⚠️ You are trying to access before opening time (9:00 AM)');
      console.log('💡 Your truck should show as CLOSED until 9:00 AM');
    }
    
    if (truckData?.visible === false) {
      console.log('⚠️ Your truck is hidden from the map');
      console.log('💡 Use the "Force Truck Visible" button or toggle visibility in settings');
    }
    
  } catch (error) {
    console.error('❌ Error checking truck status:', error);
  }
}

// Run the status check
checkTruckStatus()
  .then(() => {
    console.log('\n✅ Status check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Status check failed:', error);
    process.exit(1);
  });
