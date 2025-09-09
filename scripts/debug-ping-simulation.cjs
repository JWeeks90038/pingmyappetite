const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Distance calculation function
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Cuisine normalization (similar to the mobile app)
function normalizeCuisineValue(cuisine) {
  if (!cuisine) return '';
  return cuisine.toLowerCase().trim().replace(/[^a-z]/g, '');
}

async function simulatePingAnalytics() {
  try {
 
    
    // Use a specific all-access user for testing
    const testUserId = 'vtXnkYhgHiTYg62Xihb8rFepdDh2'; // Has all-access plan and bbq cuisine
    
    // Get user data
    const userDoc = await db.collection('users').doc(testUserId).get();
    if (!userDoc.exists) {
  
      return;
    }
    
    const userData = userDoc.data();

    
    // Get truck location
    const truckDoc = await db.collection('truckLocations').doc(testUserId).get();
    if (!truckDoc.exists) {

      return;
    }
    
    const truckLocation = truckDoc.data();

    
    // Get cuisines for filtering
    const cuisines = Array.isArray(userData.cuisines)
      ? userData.cuisines
      : [userData.cuisine].filter(Boolean);
    

    
    // Get time ranges
    const nowMs = Date.now();
    const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000);
    

    
    // Get pings from last 30 days
    const pingsSnapshot = await db.collection('pings')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();
    
 
    
    const pings = [];
    pingsSnapshot.forEach(doc => {
      const pingData = doc.data();
      pings.push({
        id: doc.id,
        ...pingData,
        timestamp: pingData.timestamp.toDate() // Convert to JS Date
      });
    });
    
    // Filter for last 7 days
    const last7 = pings.filter(p => p.timestamp >= sevenDaysAgo);

    
    // Test cuisine matching
    const cuisineMatches = last7.filter(p => {
      if (!p.cuisineType) return false;
      const normalizedPingCuisine = normalizeCuisineValue(p.cuisineType);
      return cuisines.some(ownerCuisine => {
        const normalizedOwnerCuisine = normalizeCuisineValue(ownerCuisine);
        return normalizedPingCuisine === normalizedOwnerCuisine;
      });
    });
    

    
    // Test distance filtering
    const getLoc = (p) =>
      p.location || (p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null);
    
    const nearbyPings7 = last7.filter(p => {
      const loc = getLoc(p);
      if (!loc) return false;
      const distance = getDistanceFromLatLonInKm(truckLocation.lat, truckLocation.lng, loc.lat, loc.lng);
      return distance <= 5;
    });
    
    const nearbyPings30 = pings.filter(p => {
      const loc = getLoc(p);
      if (!loc) return false;
      const distance = getDistanceFromLatLonInKm(truckLocation.lat, truckLocation.lng, loc.lat, loc.lng);
      return distance <= 80;
    });
    

    

    const samplePings = last7.slice(0, 5);
    
    samplePings.forEach((ping, index) => {
      const loc = getLoc(ping);
      if (loc) {
        const distance = getDistanceFromLatLonInKm(truckLocation.lat, truckLocation.lng, loc.lat, loc.lng);
     
      }
    });
    
    // Final analytics result that would be displayed

    
  } catch (error) {

  }
}

simulatePingAnalytics().then(() => {

  process.exit(0);
});
