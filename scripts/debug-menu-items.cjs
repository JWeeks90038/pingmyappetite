const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'foodtruckfinder-27eba.firebasestorage.app'
});

const db = admin.firestore();

async function debugMenuItems() {

  
  try {
    // Get all menu items
    const menuItemsSnapshot = await db.collection('menuItems').get();
    

    
    if (menuItemsSnapshot.docs.length === 0) {
   
      
      // Create a sample menu item for the truck owner
      const sampleMenuItem = {
        name: 'Cheeseburger',
        description: 'Delicious beef burger with cheese',
        price: 12.99,
        category: 'Main',
        ownerId: 'vtXnkYhgHiTYg62Xihb8rFepdDh2',
        imageUrl: 'https://firebasestorage.googleapis.com/v0/b/foodtruckfinder-27eba.firebasestorage.app/o/menu-items%2FvtXnkYhgHiTYg62Xihb8rFepdDh2%2F1756310314032-cheeseburger.jpg?alt=media&token=687bd2b2-69e0-4341-90ef-530ceeba0e8c',
        createdAt: new Date(),
        available: true
      };
      

      const docRef = await db.collection('menuItems').add(sampleMenuItem);
 
      
    } else {
 
      menuItemsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();

        
        // Check if this is for our target truck owner
        if (data.ownerId === 'vtXnkYhgHiTYg62Xihb8rFepdDh2') {
  
        }
      });
    }
    
  } catch (error) {

  }
  

  process.exit(0);
}

debugMenuItems();
