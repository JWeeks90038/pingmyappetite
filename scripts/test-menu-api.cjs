const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'foodtruckfinder-27eba.firebasestorage.app'
});

const db = admin.firestore();

async function testMenuAPIQuery() {
  console.log('🧪 Testing menu API query logic...\n');
  
  const truckId = 'vtXnkYhgHiTYg62Xihb8rFepdDh2';
  
  try {
    console.log(`🔍 Querying menuItems for truck: ${truckId}`);
    
    // This is the exact query the API uses
    const menuSnapshot = await db
      .collection('menuItems')
      .where('ownerId', '==', truckId)
      .get();

    console.log(`📊 Query returned ${menuSnapshot.docs.length} items`);
    
    const items = [];
    menuSnapshot.forEach(doc => {
      const data = doc.data();
      items.push({
        id: doc.id,
        ...data
      });
    });

    // Sort by createdAt if available, otherwise by name
    items.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt) - 
               new Date(a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt);
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    console.log('\n📋 API would return:');
    console.log(JSON.stringify({
      success: true,
      items
    }, null, 2));

    console.log('\n✅ Menu API query test complete!');
    
  } catch (error) {
    console.error('❌ Error in menu API query:', error);
  }
}

testMenuAPIQuery();
