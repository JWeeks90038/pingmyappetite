import { onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { logger } from 'firebase-functions';

/**
 * Cloud Function to force FCM token refresh for all users
 * This can be called manually to invalidate old Expo tokens
 */
export const forceFcmTokenRefresh = onCall(async (request) => {
  try {
    logger.info('🔄 Starting FCM token refresh for all users...');
    
    const db = admin.firestore();
    let totalUsers = 0;
    let usersWithTokens = 0;
    let usersUpdated = 0;
    let expoTokens = 0;
    let fcmTokens = 0;
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    totalUsers = usersSnapshot.size;
    
    logger.info(`📋 Found ${totalUsers} total users`);
    
    // Process in batches
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
          logger.info(`📱 User ${userId}: Expo token found`);
        } else {
          fcmTokens++;
          logger.info(`🔥 User ${userId}: FCM token found`);
        }
        
        // Force token refresh by setting flag
        const updateData = {
          fcmTokenRefreshRequired: true,
          fcmTokenLastRefresh: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        // Add to batch
        batch.update(userDoc.ref, updateData);
        usersUpdated++;
        batchCount++;
        
        // Execute batch when it reaches max size
        if (batchCount >= maxBatchSize) {
          logger.info(`💾 Executing batch of ${batchCount} updates...`);
          await batch.commit();
          batchCount = 0;
        }
      }
    }
    
    // Execute remaining batch
    if (batchCount > 0) {
      logger.info(`💾 Executing final batch of ${batchCount} updates...`);
      await batch.commit();
    }
    
    const result = {
      success: true,
      totalUsers,
      usersWithTokens,
      usersUpdated,
      expoTokens,
      fcmTokens,
      message: 'FCM token refresh initiated for all users'
    };
    
    logger.info('✅ FCM Token Refresh Complete!', result);
    
    return result;
    
  } catch (error) {
    logger.error('❌ Error during token refresh:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
