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

// Function to intelligently assign a cuisine type based on truck name
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

const updateCuisineTypes = async () => {
  try {
    console.log('🍽️ Starting cuisine type analysis and update...');
    
    // Get all users from the users collection
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.size} users to analyze`);
    
    let usersWithoutCuisine = 0;
    let usersUpdated = 0;
    let analysisResults = {};
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Skip if already has a specific cuisine type
      if (userData.cuisineType && userData.cuisineType !== 'Food' && userData.cuisineType !== 'General Food') {
        console.log(`✅ User ${userData.truckName || userId} already has cuisine type: ${userData.cuisineType}`);
        continue;
      }
      
      usersWithoutCuisine++;
      
      // Infer cuisine type from truck name
      const truckName = userData.truckName || userData.username || '';
      const inferredCuisine = inferCuisineType(truckName);
      
      console.log(`🔍 User: ${truckName} → Inferred cuisine: ${inferredCuisine}`);
      
      // Track statistics
      if (!analysisResults[inferredCuisine]) {
        analysisResults[inferredCuisine] = [];
      }
      analysisResults[inferredCuisine].push(truckName);
      
      // Update the user's cuisine type
      await db.collection('users').doc(userId).update({
        cuisineType: inferredCuisine,
        cuisineInferredAt: admin.firestore.FieldValue.serverTimestamp(),
        originalCuisineType: userData.cuisineType || null
      });
      
      usersUpdated++;
      console.log(`✅ Updated ${truckName} with cuisine type: ${inferredCuisine}`);
    }
    
    console.log('\n📈 ANALYSIS RESULTS:');
    console.log(`Total users analyzed: ${usersSnapshot.size}`);
    console.log(`Users without specific cuisine: ${usersWithoutCuisine}`);
    console.log(`Users updated: ${usersUpdated}`);
    
    console.log('\n🍽️ CUISINE DISTRIBUTION:');
    Object.keys(analysisResults).sort().forEach(cuisine => {
      console.log(`${cuisine}: ${analysisResults[cuisine].length} trucks`);
      analysisResults[cuisine].forEach(name => {
        console.log(`  - ${name}`);
      });
    });
    
    console.log('\n✅ Cuisine type update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating cuisine types:', error);
  }
};

// Run the update
updateCuisineTypes();
