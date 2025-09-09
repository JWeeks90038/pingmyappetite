const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function addChefJebasData() {
  try {
    // Find ChefJebas user
    const usersSnapshot = await db.collection('users').where('username', '==', 'ChefJebas').get();
    
    if (usersSnapshot.empty) {
 
      // Try to find by email
      const emailSnapshot = await db.collection('users').where('email', '==', 'chefjebas@grubana.com').get();
      if (emailSnapshot.empty) {

        return;
      }
    
    }
    
    const userDoc = usersSnapshot.empty ? 
      (await db.collection('users').where('email', '==', 'chefjebas@grubana.com').get()).docs[0] :
      usersSnapshot.docs[0];
    
    const userData = userDoc.data();
    const userId = userDoc.id;
    

    
    // Add menu photo and food truck photo if they don't exist
    const updateData = {};
    
    if (!userData.menuPhoto) {
      updateData.menuPhoto = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop';
   
    }
    
    if (!userData.foodTruckPhoto) {
      updateData.foodTruckPhoto = 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop';
 
    }
    
    if (Object.keys(updateData).length > 0) {
      await db.collection('users').doc(userId).update(updateData);
  
    }
    
    // Check if menu items exist, if not add some sample ones
    const menuItemsSnapshot = await db.collection('menuItems').where('ownerId', '==', userId).get();

    
    if (menuItemsSnapshot.size === 0) {
    
      
      const sampleMenuItems = [
        {
          name: 'Gourmet Burger',
          description: 'Grass-fed beef with artisanal cheese and fresh vegetables',
          price: '12.99',
          category: 'Main',
          ingredients: 'Beef, cheese, lettuce, tomato, onion, special sauce',
          ownerId: userId
        },
        {
          name: 'Truffle Fries',
          description: 'Crispy fries with truffle oil and parmesan',
          price: '8.99',
          category: 'Side',
          ingredients: 'Potatoes, truffle oil, parmesan cheese, herbs',
          ownerId: userId
        },
        {
          name: 'Craft Beer',
          description: 'Local craft beer selection',
          price: '5.99',
          category: 'Beverage',
          ingredients: 'Hops, malt, yeast, water',
          ownerId: userId
        }
      ];
      
      for (const item of sampleMenuItems) {
        await db.collection('menuItems').add(item);
 
      }
    }

    
  } catch (error) {
 
  }
  
  process.exit(0);
}

addChefJebasData();
