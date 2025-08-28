const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function debugTruckLocation() {
  try {
    console.log('=== DEBUGGING TRUCK LOCATION ===');
    
    // Find truck owner from users collection
    const usersSnapshot = await db.collection('users').where('role', '==', 'truck_owner').get();
    
    if (usersSnapshot.empty) {
      console.log('No truck owners found');
      return;
    }
    
    const truckOwner = usersSnapshot.docs[0];
    const truckOwnerId = truckOwner.id;
    const truckOwnerData = truckOwner.data();
    
    console.log('Truck Owner ID:', truckOwnerId);
    console.log('Truck Owner Data (lat/lng):', {
      lat: truckOwnerData.lat,
      lng: truckOwnerData.lng,
      cuisine: truckOwnerData.cuisine,
      cuisines: truckOwnerData.cuisines
    });
    
    // Check truckLocations collection
    const truckLocationDoc = await db.collection('truckLocations').doc(truckOwnerId).get();
    
    if (truckLocationDoc.exists()) {
      const locationData = truckLocationDoc.data();
      console.log('Truck Location Data:', {
        lat: locationData.lat,
        lng: locationData.lng,
        address: locationData.address,
        timestamp: locationData.timestamp
      });
      
      // Test distance calculation with a sample ping
      const pingsSnapshot = await db.collection('pings').limit(1).get();
      
      if (!pingsSnapshot.empty) {
        const samplePing = pingsSnapshot.docs[0].data();
        console.log('Sample ping for distance test:', {
          lat: samplePing.lat || samplePing.location?.lat,
          lng: samplePing.lng || samplePing.location?.lng,
          address: samplePing.address,
          cuisineType: samplePing.cuisineType
        });
        
        // Calculate distance
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
        
        const pingLat = samplePing.lat || samplePing.location?.lat;
        const pingLng = samplePing.lng || samplePing.location?.lng;
        
        if (pingLat && pingLng && locationData.lat && locationData.lng) {
          const distance = getDistanceFromLatLonInKm(
            locationData.lat, 
            locationData.lng, 
            pingLat, 
            pingLng
          );
          console.log('Distance between truck and sample ping:', distance, 'km');
          console.log('Within 5km?', distance <= 5);
          console.log('Within 80km?', distance <= 80);
        } else {
          console.log('Missing coordinates for distance calculation');
        }
      }
      
    } else {
      console.log('No truck location document found for truck owner');
    }
    
  } catch (error) {
    console.error('Error debugging truck location:', error);
  }
}

debugTruckLocation().then(() => {
  console.log('Debug complete');
  process.exit(0);
});
