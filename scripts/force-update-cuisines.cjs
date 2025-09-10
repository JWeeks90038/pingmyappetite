// Script to force re-update cuisine types with improved logic
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://foodtruck-locator-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

// Improved function to intelligently assign a cuisine type based on truck name
const inferCuisineType = (truckName) => {
  if (!truckName) return 'american'; // Default fallback
  
  const name = truckName.toLowerCase();
  
  // Common patterns to identify cuisine types
  if (name.includes('bbq') || name.includes('barbeque') || name.includes('smoke')) return 'bbq';
  if (name.includes('taco') || name.includes('burrito') || name.includes('mexican') || name.includes('el ') || name.includes('papa')) return 'mexican';
  if (name.includes('pizza') || name.includes('pizz')) return 'pizza';
  if (name.includes('burger') || name.includes('patty')) return 'burgers';
  if (name.includes('wing') || name.includes('chicken')) return 'wings';
  if (name.includes('seafood') || name.includes('fish') || name.includes('shrimp')) return 'seafood';
  if (name.includes('chinese') || name.includes('wok')) return 'chinese';
  if (name.includes('italian') || name.includes('pasta') || name.includes('soprano') || name.includes('deli')) return 'italian';
  if (name.includes('thai')) return 'thai';
  if (name.includes('indian')) return 'indian';
  if (name.includes('japanese') || name.includes('sushi') || name.includes('hibachi') || name.includes('arayaki')) return 'japanese';
  if (name.includes('korean')) return 'korean';
  if (name.includes('latin american') || name.includes('latin')) return 'latin';
  if (name.includes('colombian') || name.includes('columbia')) return 'colombian';
  if (name.includes('caribbean')) return 'caribbean';
  if (name.includes('greek')) return 'greek';
  if (name.includes('coffee') || name.includes('espresso')) return 'coffee';
  if (name.includes('dessert') || name.includes('ice cream') || name.includes('donut') || name.includes('creamery')) return 'desserts';
  if (name.includes('healthy') || name.includes('salad') || name.includes('vegan')) return 'healthy';
  if (name.includes('southern') || name.includes('soul')) return 'southern';
  if (name.includes('hotdog') || name.includes('hot dog')) return 'american';
  if (name.includes('drink') || name.includes('sipz') || name.includes('pint')) return 'drinks';
  
  // Default to American if no specific pattern is found
  return 'american';
};

const forceUpdateCuisineTypes = async () => {
  try {
  
    
    // Get all users from the users collection
    const usersSnapshot = await db.collection('users').get();

    
    let updatedCount = 0;
    const cuisineStats = {};
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const truckName = userData.truckName || userData.username || '';
      
      // Re-infer cuisine type with improved logic
      const newCuisineType = inferCuisineType(truckName);
      

      
      // Update the user document
      await db.collection('users').doc(userId).update({
        cuisineType: newCuisineType
      });
      
      // Track statistics
      cuisineStats[newCuisineType] = (cuisineStats[newCuisineType] || 0) + 1;
      updatedCount++;
    }
    

    
    Object.entries(cuisineStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([cuisine, count]) => {
 
      });
    

    
  } catch (error) {

  } finally {
    // Clean up
    process.exit(0);
  }
};

// Run the force update
forceUpdateCuisineTypes();
