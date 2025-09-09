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
    
    // Get user data (business hours)
    const userDoc = await db.collection('users').doc(TRUCK_ID).get();
    const userData = userDoc.data();
    
    // Get truck location data (visibility, isLive status)  
    const truckDoc = await db.collection('truckLocations').doc(TRUCK_ID).get();
    const truckData = truckDoc.data();
    
    // Business Hours Analysis
    if (userData?.businessHours) {
      Object.entries(userData.businessHours).forEach(([day, hours]) => {
      });
    } else {
    }
    
    // Current Time Analysis
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime12 = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
    
    // Business Hours Status
    if (userData?.businessHours?.[currentDay]) {
      const todayHours = userData.businessHours[currentDay];
      
      // Simple time comparison (you are at 8:05 AM, opens at 9:00 AM)
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const openTime = todayHours.open;
      
      if (todayHours.closed) {
      } else if (openTime.includes('9:00 AM') && currentHour < 9) {
      } else {
      }
    }
    
    // Visibility & Live Status
    if (truckData) {
      
      if (truckData.sessionStartTime) {
        const sessionDuration = Date.now() - truckData.sessionStartTime;
        const hoursActive = Math.round(sessionDuration / (60 * 60 * 1000) * 10) / 10;
      }
    } else {
    }
    
    if (!userData?.businessHours) {
    }
    
    if (currentDay === 'wednesday' && currentTime12.includes('8:')) {
    }
    
    if (truckData?.visible === false) {
    }
    
  } catch (error) {
  }
}

// Run the status check
checkTruckStatus()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
