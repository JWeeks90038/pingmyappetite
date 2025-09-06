const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'foodtruckfinder-27eba.firebasestorage.app'
});

const db = admin.firestore();

async function debugMenuItems() {
  console.log('🔍 Checking menuItems collection...\n');
  
  try {
    // Get all menu items
    const menuItemsSnapshot = await db.collection('menuItems').get();
    
    console.log(`📊 Total menu items found: ${menuItemsSnapshot.docs.length}\n`);
    
    if (menuItemsSnapshot.docs.length === 0) {
      console.log('❌ No menu items found in Firestore collection');
      console.log('💡 This explains why the query returned 0 items\n');
      
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
      
      console.log('🔧 Creating sample menu item...');
      const docRef = await db.collection('menuItems').add(sampleMenuItem);
      console.log(`✅ Created menu item with ID: ${docRef.id}`);
      console.log('📋 Menu item data:', sampleMenuItem);
      
    } else {
      console.log('📋 Existing menu items:');
      menuItemsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n${index + 1}. Document ID: ${doc.id}`);
        console.log(`   Name: ${data.name || 'N/A'}`);
        console.log(`   Owner ID: ${data.ownerId || 'N/A'}`);
        console.log(`   Price: $${data.price || 'N/A'}`);
        console.log(`   Category: ${data.category || 'N/A'}`);
        console.log(`   Image URL: ${data.image || data.imageUrl || 'N/A'}`);
        console.log(`   Available: ${data.available !== undefined ? data.available : 'N/A'}`);
        console.log(`   Created: ${data.createdAt ? data.createdAt.toDate() : 'N/A'}`);
        
        // Check if this is for our target truck owner
        if (data.ownerId === 'vtXnkYhgHiTYg62Xihb8rFepdDh2') {
          console.log(`   🎯 THIS IS FOR OUR TARGET TRUCK OWNER!`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking menu items:', error);
  }
  
  console.log('\n✅ Debug complete');
  process.exit(0);
}

debugMenuItems();
