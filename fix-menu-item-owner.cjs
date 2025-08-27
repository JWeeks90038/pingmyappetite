const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'foodtruckfinder-27eba.firebasestorage.app'
});

const db = admin.firestore();

async function fixMenuItemOwnerId() {
  console.log('🔧 Fixing menu item ownerId...\n');
  
  try {
    // Update the Cheeseburger menu item to have the correct ownerId
    const docRef = db.collection('menuItems').doc('0BBpXXXEoVxeQxB2paFT');
    
    await docRef.update({
      ownerId: 'vtXnkYhgHiTYg62Xihb8rFepdDh2'
    });
    
    console.log('✅ Updated menu item 0BBpXXXEoVxeQxB2paFT with correct ownerId');
    
    // Verify the update
    const updatedDoc = await docRef.get();
    const data = updatedDoc.data();
    
    console.log('\n📋 Updated menu item:');
    console.log(`   Document ID: ${updatedDoc.id}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Owner ID: ${data.ownerId}`);
    console.log(`   Price: $${data.price}`);
    console.log(`   Category: ${data.category}`);
    
  } catch (error) {
    console.error('❌ Error fixing menu item:', error);
  }
  
  console.log('\n✅ Fix complete');
  process.exit(0);
}

fixMenuItemOwnerId();
