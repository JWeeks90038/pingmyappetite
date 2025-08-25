import admin from 'firebase-admin';
import { onDocumentWritten, onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in miles
}

/**
 * Get users who have favorited a specific truck
 */
async function getUsersWhoFavoritedTruck(truckId) {
  try {
    const usersSnapshot = await db.collection('users')
      .where('favoriteTrucks', 'array-contains', truckId)
      .where('notificationPreferences.favoriteTrucks', '==', true)
      .get();
    
    return usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    logger.error('Error getting users who favorited truck:', error);
    return [];
  }
}

/**
 * Get notification tokens for users
 */
async function getNotificationTokens(userIds) {
  try {
    const tokens = [];
    const batch = db.batch();
    
    for (const userId of userIds) {
      const tokensSnapshot = await db.collection('notificationTokens')
        .where('userId', '==', userId)
        .where('active', '==', true)
        .get();
      
      tokensSnapshot.docs.forEach(doc => {
        tokens.push({
          token: doc.data().token,
          userId: userId,
          tokenId: doc.id
        });
      });
    }
    
    return tokens;
  } catch (error) {
    logger.error('Error getting notification tokens:', error);
    return [];
  }
}

/**
 * Send notification to multiple tokens
 */
async function sendNotificationToTokens(tokens, payload) {
  if (!tokens.length) return;
  
  try {
    const tokenStrings = tokens.map(t => t.token);
    
    const message = {
      tokens: tokenStrings,
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/grubana-logo.png'
      },
      data: {
        type: payload.type || 'general',
        truckId: payload.truckId || '',
        dropId: payload.dropId || '',
        url: payload.url || '',
        timestamp: new Date().toISOString()
      },
      webpush: {
        fcmOptions: {
          link: payload.url || '/'
        }
      }
    };
    
    const response = await messaging.sendMulticast(message);
    
    logger.info(`Sent notifications: ${response.successCount} successful, ${response.failureCount} failed`);
    
    // Handle failed tokens (remove invalid ones)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            failedTokens.push(tokens[idx]);
          }
        }
      });
      
      // Remove invalid tokens from database
      for (const failedToken of failedTokens) {
        try {
          await db.collection('notificationTokens').doc(failedToken.tokenId).delete();
          logger.info(`Removed invalid token for user ${failedToken.userId}`);
        } catch (error) {
          logger.error('Error removing invalid token:', error);
        }
      }
    }
    
    return response;
  } catch (error) {
    logger.error('Error sending notifications:', error);
    throw error;
  }
}

/**
 * Check if notification was recently sent to avoid spam
 */
async function shouldSendNotification(userId, type, identifier) {
  try {
    const recentNotification = await db.collection('sentNotifications')
      .where('userId', '==', userId)
      .where('type', '==', type)
      .where('identifier', '==', identifier)
      .where('timestamp', '>', new Date(Date.now() - 60 * 60 * 1000)) // 1 hour ago
      .limit(1)
      .get();
    
    return recentNotification.empty;
  } catch (error) {
    logger.error('Error checking recent notifications:', error);
    return false;
  }
}

/**
 * Record that a notification was sent
 */
async function recordNotificationSent(userId, type, identifier, payload) {
  try {
    await db.collection('sentNotifications').add({
      userId,
      type,
      identifier,
      payload,
      timestamp: new Date(),
      success: true
    });
  } catch (error) {
    logger.error('Error recording notification:', error);
  }
}

/**
 * Send email/SMS notifications via Formspree based on user preferences
 */
async function sendNotificationViaFormspree(userIds, payload) {
  try {
    for (const userId of userIds) {
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) continue;
      
      const userData = userDoc.data();
      const notifPrefs = userData.notificationPreferences || {};
      
      // Send email if enabled and email available
      if (notifPrefs.emailNotifications && userData.email) {
        try {
          const emailResponse = await fetch('https://formspree.io/f/mpwlvzaj', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: userData.email,
              subject: payload.title,
              message: payload.body,
              notification_type: 'grubana_notification',
              truck_id: payload.truckId || '',
              drop_id: payload.dropId || '',
              user_id: userId,
              _subject: payload.title,
              _replyto: 'noreply@grubana.com'
            }),
          });
          
          if (emailResponse.ok) {
            logger.info(`Email notification sent to ${userData.email} via Formspree`);
          } else {
            logger.warn(`Failed to send email to ${userData.email}: ${emailResponse.status}`);
          }
        } catch (emailError) {
          logger.error('Formspree email error:', emailError);
        }
      }
      
      // Send SMS if enabled and phone available
      if (notifPrefs.smsNotifications && userData.phone) {
        try {
          const smsResponse = await fetch('https://formspree.io/f/mpwlvzaj', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: userData.phone,
              message: `${payload.title}: ${payload.body}`,
              notification_type: 'grubana_sms',
              truck_id: payload.truckId || '',
              drop_id: payload.dropId || '',
              user_id: userId,
              _subject: `SMS Notification - ${payload.title}`,
              _webhook: 'https://your-automation-service.com/send-sms' // Configure your SMS webhook
            }),
          });
          
          if (smsResponse.ok) {
            logger.info(`SMS notification queued for ${userData.phone} via Formspree`);
          } else {
            logger.warn(`Failed to queue SMS for ${userData.phone}: ${smsResponse.status}`);
          }
        } catch (smsError) {
          logger.error('Formspree SMS error:', smsError);
        }
      }
    }
  } catch (error) {
    logger.error('Error sending notifications via Formspree:', error);
  }
}

/**
 * Trigger when truck location is updated
 * Notify users when their favorite trucks are nearby
 */
export const onTruckLocationUpdate = onDocumentWritten({
  document: 'trucks/{truckId}',
  region: 'us-central1'
}, async (event) => {
  try {
    const truckId = event.params.truckId;
    const truck = event.data?.after?.data();
    const previousTruck = event.data?.before?.data();
    
    // Skip if truck was deleted or no location data
    if (!truck || !truck.location || !truck.location.latitude || !truck.location.longitude) {
      return;
    }
    
    // Skip if location hasn't changed significantly (less than 0.1 miles)
    if (previousTruck && previousTruck.location) {
      const distance = calculateDistance(
        previousTruck.location.latitude,
        previousTruck.location.longitude,
        truck.location.latitude,
        truck.location.longitude
      );
      
      if (distance < 0.1) {
        return;
      }
    }
    
    // Get users who favorited this truck
    const interestedUsers = await getUsersWhoFavoritedTruck(truckId);
    
    if (!interestedUsers.length) {
      return;
    }
    
    logger.info(`Checking proximity for ${interestedUsers.length} users interested in truck ${truckId}`);
    
    // Check which users are within notification radius
    const nearbyUsers = [];
    const NOTIFICATION_RADIUS = 2; // miles
    
    for (const user of interestedUsers) {
      if (!user.location || !user.location.latitude || !user.location.longitude) {
        continue;
      }
      
      const distance = calculateDistance(
        user.location.latitude,
        user.location.longitude,
        truck.location.latitude,
        truck.location.longitude
      );
      
      if (distance <= NOTIFICATION_RADIUS) {
        // Check if we already notified this user recently
        const shouldNotify = await shouldSendNotification(
          user.id,
          'truck_nearby',
          truckId
        );
        
        if (shouldNotify) {
          nearbyUsers.push({
            ...user,
            distance: distance.toFixed(1)
          });
        }
      }
    }
    
    if (!nearbyUsers.length) {
      return;
    }
    
    logger.info(`Found ${nearbyUsers.length} users nearby truck ${truckId}`);
    
    // Get notification tokens for nearby users
    const userIds = nearbyUsers.map(u => u.id);
    const tokens = await getNotificationTokens(userIds);
    
    if (!tokens.length) {
      logger.info('No notification tokens found for nearby users');
      return;
    }
    
    // Prepare notification payload
    const payload = {
      title: `${truck.name || 'Your favorite truck'} is nearby! 🚚`,
      body: `${truck.name} is within ${NOTIFICATION_RADIUS} miles of you. Check out their menu!`,
      type: 'truck_nearby',
      truckId: truckId,
      url: `/trucks/${truckId}`
    };
    
    // Send notifications
    await sendNotificationToTokens(tokens, payload);
    
    // Send email/SMS notifications via Formspree
    await sendNotificationViaFormspree(userIds, payload);
    
    // Record notifications sent
    for (const user of nearbyUsers) {
      await recordNotificationSent(
        user.id,
        'truck_nearby',
        truckId,
        payload
      );
    }
    
    logger.info(`Successfully sent proximity notifications for truck ${truckId}`);
    
  } catch (error) {
    logger.error('Error in onTruckLocationUpdate:', error);
  }
});

/**
 * Trigger when a new drop/deal is created
 * Notify users who favorited the truck
 */
export const onDropCreated = onDocumentCreated({
  document: 'drops/{dropId}',
  region: 'us-central1'
}, async (event) => {
  try {
    const dropId = event.params.dropId;
    const drop = event.data?.data();
    
    if (!drop || !drop.truckId) {
      return;
    }
    
    // Get truck information
    const truckDoc = await db.collection('trucks').doc(drop.truckId).get();
    if (!truckDoc.exists) {
      return;
    }
    
    const truck = truckDoc.data();
    
    // Get users who favorited this truck and want deal notifications
    const interestedUsersSnapshot = await db.collection('users')
      .where('favoriteTrucks', 'array-contains', drop.truckId)
      .where('notificationPreferences.deals', '==', true)
      .get();
    
    const interestedUsers = interestedUsersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    if (!interestedUsers.length) {
      return;
    }
    
    logger.info(`Notifying ${interestedUsers.length} users about new drop from ${truck.name}`);
    
    // Filter users who haven't been notified recently about deals from this truck
    const usersToNotify = [];
    
    for (const user of interestedUsers) {
      const shouldNotify = await shouldSendNotification(
        user.id,
        'truck_deal',
        drop.truckId
      );
      
      if (shouldNotify) {
        usersToNotify.push(user);
      }
    }
    
    if (!usersToNotify.length) {
      logger.info('All users were recently notified about deals from this truck');
      return;
    }
    
    // Get notification tokens
    const userIds = usersToNotify.map(u => u.id);
    const tokens = await getNotificationTokens(userIds);
    
    if (!tokens.length) {
      logger.info('No notification tokens found for interested users');
      return;
    }
    
    // Prepare notification payload
    const dealText = drop.dealPercentage 
      ? `${drop.dealPercentage}% off` 
      : drop.dealDescription || 'Special deal';
    
    const payload = {
      title: `🎉 ${truck.name || 'Your favorite truck'} has a new deal!`,
      body: `${dealText} - Don't miss out! Valid until ${drop.endTime ? new Date(drop.endTime.toDate()).toLocaleDateString() : 'limited time'}`,
      type: 'truck_deal',
      truckId: drop.truckId,
      dropId: dropId,
      url: `/trucks/${drop.truckId}/drops/${dropId}`
    };
    
    // Send notifications
    await sendNotificationToTokens(tokens, payload);
    
    // Send email/SMS notifications via Formspree
    const notifyUserIds = usersToNotify.map(user => user.id);
    await sendNotificationViaFormspree(notifyUserIds, payload);
    
    // Record notifications sent
    for (const user of usersToNotify) {
      await recordNotificationSent(
        user.id,
        'truck_deal',
        drop.truckId,
        payload
      );
    }
    
    logger.info(`Successfully sent deal notifications for drop ${dropId}`);
    
  } catch (error) {
    logger.error('Error in onDropCreated:', error);
  }
});

/**
 * Daily digest notification
 * Send weekly summary of nearby activity
 */
export const sendWeeklyDigest = onSchedule('every sunday 18:00', async (context) => {
  try {
    logger.info('Starting weekly digest notification');
    
    // Get users who want weekly digest
    const usersSnapshot = await db.collection('users')
      .where('notificationPreferences.weeklyDigest', '==', true)
      .get();
    
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    if (!users.length) {
      logger.info('No users subscribed to weekly digest');
      return;
    }
    
    logger.info(`Preparing weekly digest for ${users.length} users`);
    
    // Get all trucks for location calculations
    const trucksSnapshot = await db.collection('trucks').get();
    const trucks = trucksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get drops from the past week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dropsSnapshot = await db.collection('drops')
      .where('createdAt', '>=', oneWeekAgo)
      .get();
    
    const recentDrops = dropsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Process each user
    for (const user of users) {
      try {
        if (!user.location || !user.location.latitude || !user.location.longitude) {
          continue;
        }
        
        // Find nearby trucks (within 5 miles)
        const nearbyTrucks = trucks.filter(truck => {
          if (!truck.location || !truck.location.latitude || !truck.location.longitude) {
            return false;
          }
          
          const distance = calculateDistance(
            user.location.latitude,
            user.location.longitude,
            truck.location.latitude,
            truck.location.longitude
          );
          
          return distance <= 5;
        });
        
        // Find deals from favorite trucks
        const favoriteDeals = recentDrops.filter(drop => 
          user.favoriteTrucks && user.favoriteTrucks.includes(drop.truckId)
        );
        
        if (nearbyTrucks.length === 0 && favoriteDeals.length === 0) {
          continue;
        }
        
        // Check if digest was sent recently
        const shouldSend = await shouldSendNotification(
          user.id,
          'weekly_digest',
          'weekly'
        );
        
        if (!shouldSend) {
          continue;
        }
        
        // Get notification tokens
        const tokens = await getNotificationTokens([user.id]);
        
        if (!tokens.length) {
          continue;
        }
        
        // Prepare digest content
        let digestBody = 'Your weekly food truck update: ';
        
        if (nearbyTrucks.length > 0) {
          digestBody += `${nearbyTrucks.length} trucks nearby`;
        }
        
        if (favoriteDeals.length > 0) {
          if (nearbyTrucks.length > 0) {
            digestBody += ', ';
          }
          digestBody += `${favoriteDeals.length} new deals from favorites`;
        }
        
        const payload = {
          title: '📊 Your Weekly Food Truck Digest',
          body: digestBody,
          type: 'weekly_digest',
          url: '/dashboard'
        };
        
        // Send notification
        await sendNotificationToTokens(tokens, payload);
        
        // Send email/SMS notifications via Formspree
        await sendNotificationViaFormspree([user.id], payload);
        
        // Record notification sent
        await recordNotificationSent(
          user.id,
          'weekly_digest',
          'weekly',
          payload
        );
        
      } catch (userError) {
        logger.error(`Error processing digest for user ${user.id}:`, userError);
      }
    }
    
    logger.info('Weekly digest notifications completed');
    
  } catch (error) {
    logger.error('Error in sendWeeklyDigest:', error);
  }
});

/**
 * Clean up old notification records (older than 30 days)
 */
export const cleanupNotificationRecords = onSchedule('every 24 hours', async (context) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const oldRecordsSnapshot = await db.collection('sentNotifications')
      .where('timestamp', '<', thirtyDaysAgo)
      .limit(500)
      .get();
    
    if (!oldRecordsSnapshot.empty) {
      const batch = db.batch();
      
      oldRecordsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      logger.info(`Cleaned up ${oldRecordsSnapshot.docs.length} old notification records`);
    }
    
  } catch (error) {
    logger.error('Error cleaning up notification records:', error);
  }
});
