const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { sendOrderStatusNotification, getNotificationStatus } = require('./orderNotificationService');

/**
 * Trigger notifications when order status changes
 */
exports.onOrderStatusChanged = onDocumentUpdated({
  document: 'orders/{orderId}',
  region: 'us-central1'
}, async (event) => {
  try {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    const orderId = event.params.orderId;
    
    if (!beforeData || !afterData) {
      logger.warn(`Missing order data for ${orderId}`);
      return;
    }
    
    const previousStatus = beforeData.status;
    const newStatus = afterData.status;
    
    // Only send notifications when status actually changes
    if (previousStatus === newStatus) {
      return;
    }
    
    // Skip notifications for certain status transitions
    const skipNotificationForStatuses = ['pending']; // Don't notify when order is first created
    if (skipNotificationForStatuses.includes(newStatus)) {
      logger.info(`Skipping notification for status: ${newStatus}`);
      return;
    }
    
    logger.info(`Order ${orderId} status changed: ${previousStatus} → ${newStatus}`);
    
    // Send comprehensive notification
    const result = await sendOrderStatusNotification(orderId, newStatus);
    
    if (result.success) {
      logger.info(`✅ Notifications sent for order ${orderId}: ${result.notificationsSent} methods successful`);
    } else {
      logger.error(`❌ Failed to send notifications for order ${orderId}:`, result.error);
    }
    
  } catch (error) {
    logger.error('Error in onOrderStatusChanged:', error);
  }
});

/**
 * Manual notification trigger (for testing and manual sends)
 */
exports.sendOrderNotification = onCall({
  region: 'us-central1'
}, async (request) => {
  try {
    const { orderId, status, customData } = request.data;
    
    if (!orderId || !status) {
      throw new Error('orderId and status are required');
    }
    
    const result = await sendOrderStatusNotification(orderId, status, customData);
    
    return {
      success: true,
      result
    };
    
  } catch (error) {
    logger.error('Error in sendOrderNotification:', error);
    throw error;
  }
});

/**
 * Get notification system status
 */
exports.getNotificationSystemStatus = onCall({
  region: 'us-central1'
}, async (request) => {
  try {
    const status = getNotificationStatus();
    
    return {
      success: true,
      status
    };
    
  } catch (error) {
    logger.error('Error getting notification status:', error);
    throw error;
  }
});

/**
 * Test notification function (for development)
 */
exports.testNotification = onCall({
  region: 'us-central1'
}, async (request) => {
  try {
    const { userId, type = 'test' } = request.data;
    
    if (!userId) {
      throw new Error('userId is required');
    }
    
    // This would be used for testing notification delivery
    logger.info(`Test notification requested for user: ${userId}`);
    
    return {
      success: true,
      message: 'Test notification triggered'
    };
    
  } catch (error) {
    logger.error('Error in testNotification:', error);
    throw error;
  }
});
