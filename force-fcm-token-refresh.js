const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://foodtruckfinder-27eba-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

/**
 * Force FCM token refresh for all users
 * This will invalidate current Expo tokens and force the mobile app to generate new FCM tokens
 */
const forceTokenRefresh = async () => {
  try {

    
    let totalUsers = 0;
    let usersWithTokens = 0;
    let usersUpdated = 0;
    let expoTokens = 0;
    let fcmTokens = 0;
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    totalUsers = usersSnapshot.size;
    
 
    
    // Process in batches to avoid overwhelming Firestore
    const batch = db.batch();
    let batchCount = 0;
    const maxBatchSize = 500;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Check if user has any FCM token
      if (userData.fcmToken) {
        usersWithTokens++;
        
        const token = userData.fcmToken;
        const isExpoToken = token.startsWith('ExponentPushToken[');
        
        if (isExpoToken) {
          expoTokens++;
    
        } else {
          fcmTokens++;
  
        }
        
        // Force token refresh by:
        // 1. Setting a flag that mobile app will check
        // 2. Optionally clearing the current token (more aggressive)
        
        const updateData = {
          fcmTokenRefreshRequired: true,
          fcmTokenLastRefresh: admin.firestore.FieldValue.serverTimestamp(),
          // Uncomment next line for more aggressive approach (clears current token)
          // fcmToken: admin.firestore.FieldValue.delete(),
        };
        
        // Add to batch
        batch.update(userDoc.ref, updateData);
        usersUpdated++;
        batchCount++;
        
        // Execute batch when it reaches max size
        if (batchCount >= maxBatchSize) {
  
          await batch.commit();
          batchCount = 0;
        }
      }
    }
    
    // Execute remaining batch
    if (batchCount > 0) {
  
      await batch.commit();
    }
    

    
    if (expoTokens > 0) {

    }
    
  } catch (error) {
   
  }
};

// Run the token refresh
forceTokenRefresh();
