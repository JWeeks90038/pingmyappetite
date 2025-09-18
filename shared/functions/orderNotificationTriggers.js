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
    // Don't notify for pending_payment status (order just created, payment not completed)
    const skipNotificationForStatuses = ['pending_payment'];
    if (skipNotificationForStatuses.includes(newStatus)) {
      logger.info(`Skipping notification for status: ${newStatus}`);
      return;
    }
    
    // Special handling for pending status - only notify if it's a transition from pending_payment
    // This means payment was successful and truck owner should be notified
    if (newStatus === 'pending' && previousStatus !== 'pending_payment') {
      logger.info(`Skipping notification for pending status - not from payment completion`);
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
 * Only notifies for orders that have been paid for
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
    
    // Only notify for orders that have been paid for, not pending payment
    if (orderData.status === 'pending_payment' || 
        orderData.paymentStatus === 'pending_payment' || 
        orderData.paymentStatus === 'pending' ||
        orderData.paymentStatus !== 'paid') {
      logger.info(`Skipping notification for order ${orderId} - payment not yet completed. Status: ${orderData.status}, Payment: ${orderData.paymentStatus}`);

      return;
    }
 
    logger.info(`🚚 New paid order created: ${orderId} for truck: ${orderData.truckId}`);
    
    // Notify truck owner about new paid order
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
