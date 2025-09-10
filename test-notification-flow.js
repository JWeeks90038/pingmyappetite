const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json')),
    databaseURL: "https://foodtruckfinder-27eba-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

async function testNotificationFlow() {
  try {

    
    // Test 1: Check if we can query sentNotifications
  
    const notificationsQuery = await db.collection('sentNotifications')
      .limit(5)
      .get();
    
  
    
    if (notificationsQuery.size > 0) {
      notificationsQuery.forEach(doc => {
        const data = doc.data();
  
      });
    }
    

    
    // Get a sample user ID
    const usersQuery = await db.collection('users').limit(1).get();
    if (usersQuery.empty) {
 
      return;
    }
    
    const sampleUserId = usersQuery.docs[0].id;
 
    
    // Try the problematic query
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    try {
      const unreadQuery = await db.collection('sentNotifications')
        .where('userId', '==', sampleUserId)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .where('read', '==', false)
        .get();
      

    } catch (queryError) {

      if (queryError.message.includes('index')) {

      }
    }
    
    // Test 3: Check FCM tokens
 
    const tokensQuery = await db.collection('users')
      .where('fcmToken', '!=', null)
      .limit(5)
      .get();
    

    
    tokensQuery.forEach(doc => {
      const data = doc.data();
      const token = data.fcmToken;
      const isExpoToken = token && token.startsWith('ExponentPushToken[');

    });
    

    
  } catch (error) {
  
  }
}

testNotificationFlow();
