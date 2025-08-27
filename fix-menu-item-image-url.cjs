const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "foodtruckfinder-27eba.firebasestorage.app"
  });
}

const db = admin.firestore();

async function fixMenuItemImageUrl() {
  try {
    console.log('🔍 Checking menu item image URL...');
    
    // Get the specific menu item
    const menuItemDoc = await db.collection('menuItems').doc('0BBpXXXEoVxeQxB2paFT').get();
    
    if (!menuItemDoc.exists) {
      console.log('❌ Menu item not found');
      return;
    }
    
    const data = menuItemDoc.data();
    console.log('📋 Current menu item data:', {
      name: data.name,
      currentImageUrl: data.image,
      ownerId: data.ownerId
    });
    
    // The correct URL should be the new format
    const correctImageUrl = `https://firebasestorage.googleapis.com/v0/b/foodtruckfinder-27eba.firebasestorage.app/o/menu-items%2F${data.ownerId}%2F1756313055743-cheeseburger.jpg?alt=media&token=48fb2330-9f69-4667-980f-4dd5275c2f88`;
    
    console.log('🔧 Updating image URL to:', correctImageUrl);
    
    // Update the document
    await menuItemDoc.ref.update({
      image: correctImageUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Menu item image URL updated successfully!');
    
    // Verify the update
    const updatedDoc = await db.collection('menuItems').doc('0BBpXXXEoVxeQxB2paFT').get();
    const updatedData = updatedDoc.data();
    console.log('🔍 Updated menu item data:', {
      name: updatedData.name,
      newImageUrl: updatedData.image,
      ownerId: updatedData.ownerId
    });
    
  } catch (error) {
    console.error('❌ Error fixing menu item image URL:', error);
  }
}

// Run the fix
fixMenuItemImageUrl().then(() => {
  console.log('🏁 Image URL fix complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
