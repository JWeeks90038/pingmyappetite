const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json')),
    databaseURL: 'https://foodtrucktracker-ad6c8-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

// Function to check truck status (same logic as in MapScreen)
function checkTruckOpenStatus(businessHours) {
  // If no business hours provided, use default hours (9 AM - 5 PM, Mon-Sat)
  if (!businessHours) {
    businessHours = {
      sunday: { open: '10:00 AM', close: '4:00 PM', closed: true },
      monday: { open: '9:00 AM', close: '5:00 PM', closed: false },
      tuesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
      wednesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
      thursday: { open: '9:00 AM', close: '5:00 PM', closed: false },
      friday: { open: '9:00 AM', close: '5:00 PM', closed: false },
      saturday: { open: '9:00 AM', close: '5:00 PM', closed: false }
    };
  }

  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const dayHours = businessHours[currentDay];
  if (!dayHours || dayHours.closed) {
    return 'closed';
  }
  
  // Simple time check for common formats
  const openTime = dayHours.open;
  const closeTime = dayHours.close;
  
  // Extract hour from time strings (simplified for testing)
  const openHour = openTime.includes('9:00 AM') ? 9 : 
                   openTime.includes('10:00 AM') ? 10 : 
                   openTime.includes('8:00 AM') ? 8 : 9; // default to 9
                   
  const closeHour = closeTime.includes('5:00 PM') ? 17 : 
                    closeTime.includes('6:00 PM') ? 18 : 
                    closeTime.includes('4:00 PM') ? 16 :
                    closeTime.includes('11:00 AM') ? 11 : 17; // default to 17
  
  // Check if current time is within business hours
  if (currentHour >= openHour && currentHour < closeHour) {
    return 'open';
  } else {
    return 'closed';
  }
}

async function testAllTruckStatuses() {
  try {

    
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
    

    
    // Get all truck locations that are visible
    const trucksSnapshot = await db.collection('truckLocations')
      .where('visible', '==', true)
      .get();
    

    
    let openCount = 0;
    let closedCount = 0;
    
    for (const truckDoc of trucksSnapshot.docs) {
      const truckData = truckDoc.data();
      const truckId = truckDoc.id;
      
      // Get user data for business hours
      const userDoc = await db.collection('users').doc(truckId).get();
      const userData = userDoc.data();
      
      const businessHours = userData?.businessHours;
      const calculatedStatus = checkTruckOpenStatus(businessHours);
      
 
      
      if (businessHours?.[currentDay]) {
        const todayHours = businessHours[currentDay];
       
      }
      
   
      
      if (calculatedStatus === 'open') openCount++;
      else closedCount++;
    }
    

    
  } catch (error) {

  }
}

// Run the test
testAllTruckStatuses()
  .then(() => {

    process.exit(0);
  })
  .catch((error) => {

    process.exit(1);
  });
