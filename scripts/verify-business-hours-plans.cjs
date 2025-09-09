const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json')),
    databaseURL: 'https://foodtrucktracker-ad6c8-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

// Simulate the business hours checking function (same as in MapScreen)
function checkTruckOpenStatus(businessHours) {
  if (!businessHours) {
    return 'open'; // Default to open if no hours set
  }
  
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime12 = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
  
  const dayHours = businessHours[currentDay];
  if (!dayHours || dayHours.closed) {
    return 'closed';
  }
  
  // Helper function to convert AM/PM time to minutes since midnight
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    
    const timeStr_clean = timeStr.trim();
    
    // Handle 12-hour format
    if (timeStr_clean.includes('AM') || timeStr_clean.includes('PM')) {
      const timeMatch = timeStr_clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) return 0;
      
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const period = timeMatch[3].toUpperCase();
      
      if (period === 'AM' && hours === 12) hours = 0;
      if (period === 'PM' && hours !== 12) hours += 12;
      
      return hours * 60 + minutes;
    }
    
    // Handle 24-hour format (should not exist after normalization)
    const timeParts = timeStr_clean.split(':');
    if (timeParts.length === 2) {
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      return hours * 60 + minutes;
    }
    
    return 0;
  };
  
  const currentMinutes = timeToMinutes(currentTime12);
  const openMinutes = timeToMinutes(dayHours.open);
  const closeMinutes = timeToMinutes(dayHours.close);
  
  let isOpen = false;
  
  if (closeMinutes > openMinutes) {
    // Normal day hours
    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    // Overnight hours
    isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
  
  return isOpen ? 'open' : 'closed';
}

async function verifyBusinessHoursAcrossPlans() {
  try {

    
    // Get all users with their plan information
    const usersSnapshot = await db.collection('users').get();
    
    const planStats = {
      basic: { total: 0, withBusinessHours: 0, users: [] },
      pro: { total: 0, withBusinessHours: 0, users: [] },
      'all-access': { total: 0, withBusinessHours: 0, users: [] },
      undefined: { total: 0, withBusinessHours: 0, users: [] }
    };
    
    // Analyze each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const userPlan = userData.plan || 'basic'; // Default to basic if no plan set
      
      // Initialize plan category if not exists
      if (!planStats[userPlan]) {
        planStats[userPlan] = { total: 0, withBusinessHours: 0, users: [] };
      }
      
      planStats[userPlan].total++;
      
      if (userData.businessHours) {
        planStats[userPlan].withBusinessHours++;
        
        // Test business hours logic
        const currentStatus = checkTruckOpenStatus(userData.businessHours);
        
        planStats[userPlan].users.push({
          userId,
          truckName: userData.truckName || 'Unknown',
          status: currentStatus,
          businessHours: userData.businessHours
        });
      }
    }
    
   
    
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    
 
    
    Object.entries(planStats).forEach(([plan, stats]) => {

      
      if (stats.users.length > 0) {
      
        stats.users.slice(0, 3).forEach(user => { // Show first 3 examples
    
        });
        if (stats.users.length > 3) {
 
        }
      }
 
    });
    

    
    let formatIssues = 0;
    let totalChecked = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      if (userData.businessHours) {
        totalChecked++;
        
        // Check each day for format consistency
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        for (const day of days) {
          const dayHours = userData.businessHours[day];
          if (dayHours && !dayHours.closed) {
            // Check if times are in 12-hour format
            if (dayHours.open && !(dayHours.open.includes('AM') || dayHours.open.includes('PM'))) {
            
              formatIssues++;
            }
            if (dayHours.close && !(dayHours.close.includes('AM') || dayHours.close.includes('PM'))) {
  
              formatIssues++;
            }
          }
        }
      }
    }
    
   
    
 
    
    const totalUsersWithHours = Object.values(planStats).reduce((sum, plan) => sum + plan.withBusinessHours, 0);
    const totalUsers = Object.values(planStats).reduce((sum, plan) => sum + plan.total, 0);
    

    
    if (formatIssues === 0) {

    } else {

    }
    
  } catch (error) {

  }
}

// Run the verification
verifyBusinessHoursAcrossPlans()
  .then(() => {

    process.exit(0);
  })
  .catch((error) => {

    process.exit(1);
  });
