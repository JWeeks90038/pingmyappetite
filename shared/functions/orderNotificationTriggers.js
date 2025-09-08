import { onDocumentUpdated, onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { sendOrderStatusNotification, getNotificationStatus } from './orderNotificationService.js';

/**
 * Trigger notifications when order status changes
 */
export const onOrderStatusChanged = onDocumentUpdated({
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
/**
 * Send notifications to truck owners when new orders are placed
 */
export const onOrderCreated = onDocumentCreated({
  document: 'orders/{orderId}',
  region: 'us-central1'
}, async (event) => {
  try {
    const orderId = event.params.orderId;
    const orderData = event.data?.data();
    
    if (!orderData) {
      logger.warn(`No order data found for order ${orderId}`);
      return;
    }
    
    logger.info(`🚚 New order created: ${orderId} for truck: ${orderData.truckId}`);
    
    // Notify truck owner about new order
    const result = await sendOrderStatusNotification(orderId, 'new_order');
    
    if (result.success) {
      logger.info(`✅ Truck owner notified for new order ${orderId}: ${result.notificationsSent} methods successful`);
    } else {
      logger.error(`❌ Failed to notify truck owner for order ${orderId}:`, result.error);
    }
    
  } catch (error) {
    logger.error('Error in onOrderCreated:', error);
  }
});

/**
 * Get notification system status
 */
export const getNotificationSystemStatus = onCall({
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
export const testNotification = onCall({
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
