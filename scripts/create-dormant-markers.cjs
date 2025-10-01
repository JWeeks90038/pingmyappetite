const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  } catch (error) {

    process.exit(1);
  }
}

const db = admin.firestore();

// Function to geocode address to lat/lng using Google Maps API
async function geocodeAddress(address) {
  try {
    const fetch = (await import('node-fetch')).default;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {

      // Approximate coordinates for Riverside, CA area
      return {
        lat: 33.9737,
        lng: -117.3281,
        formatted_address: address + " (approximate)"
      };
    }
    
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formatted_address: result.formatted_address
      };
    }
    
    throw new Error(`Geocoding failed: ${data.status}`);
  } catch (error) {

    // Default to Riverside, CA area if geocoding fails
    return {
      lat: 33.9737,
      lng: -117.3281,
      formatted_address: address + " (approximate)"
    };
  }
}

async function createDormantTruckMarkers() {
  try {

    
    // Known dormant owner data
    const dormantOwners = [
      {
        uid: '95n34XarVHNB9DmQIQNA99JEAjB3',
        truckName: 'Arayaki Hibachi',
        cuisine: 'Teppanyaki/Hibachi',
        cuisineType: 'japanese',
        description: 'Creators of the Hibachi Burrito we serve Fusion Japanese food',
        ownerName: 'Alejandro Curiel',
        kitchenType: 'trailer',
        address: '7580 Indiana Ave, Riverside CA',
        businessHours: {
          monday: { open: "9:00 AM", close: "5:00 PM", closed: false },
          tuesday: { open: "9:00 AM", close: "5:00 PM", closed: false },
          wednesday: { open: "9:00 AM", close: "5:00 PM", closed: false },
          thursday: { open: "9:00 AM", close: "5:00 PM", closed: false },
          friday: { open: "9:00 AM", close: "5:00 PM", closed: false },
          saturday: { open: "9:00 AM", close: "5:00 PM", closed: false },
          sunday: { open: "10:00 AM", close: "4:00 PM", closed: true }
        }
      }
      // Add more dormant owners here as you identify them
    ];
    
    for (const owner of dormantOwners) {

      
      // Check if they already have a truckLocation (are they active?)
      const existingTruck = await db.collection('truckLocations').doc(owner.uid).get();
      
      if (existingTruck.exists()) {
       
        continue;
      }
      
      // Geocode their address to get coordinates
     
      const location = await geocodeAddress(owner.address);
      
      // Create dormant truck location marker
      const truckLocationData = {
        // Basic identification
        ownerUid: owner.uid,
        uid: owner.uid,
        truckName: owner.truckName,
        
        // Location data
        lat: location.lat,
        lng: location.lng,
        manualLocation: location.formatted_address,
        
        // Kitchen details
        cuisine: owner.cuisine,
        cuisineType: owner.cuisineType,
        kitchenType: owner.kitchenType,
        description: owner.description,
        
        // Status (dormant/inactive)
        isLive: false,
        visible: true, // Show on map
        isDormant: true, // Mark as dormant so we can style differently
        
        // Activity tracking
        lastActive: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago (dormant)
        sessionStartTime: null, // Never been live
        
        // Business hours
        businessHours: owner.businessHours,
        
        // Metadata
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        dormantMarkerCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        
        // Source tracking
        source: 'dormant_owner_script',
        notes: 'Owner signed up but not actively using mobile app - showing as dormant marker'
      };
      
      // Create the dormant truck location
      await db.collection('truckLocations').doc(owner.uid).set(truckLocationData, { merge: true });
      
  
    }
    

    
  } catch (error) {

  }
}

createDormantTruckMarkers().then(() => {

  process.exit(0);
});