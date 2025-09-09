const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'foodtruckfinder-27eba.firebasestorage.app'
});

const db = admin.firestore();

async function testMenuAPIQuery() {

  
  const truckId = 'vtXnkYhgHiTYg62Xihb8rFepdDh2';
  
  try {
 
    
    // This is the exact query the API uses
    const menuSnapshot = await db
      .collection('menuItems')
      .where('ownerId', '==', truckId)
      .get();

  
    
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

    
  } catch (error) {

  }
}

testMenuAPIQuery();
