import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import admin from 'firebase-admin';

// Get Firestore instance
const db = admin.firestore();

/**
 * Cloud Function to clean up old pending payment and cancelled orders
 * Runs every 30 minutes
 */
export const cleanupOldOrders = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'America/Los_Angeles', // Adjust timezone as needed
  },
  async (event) => {
    try {
 
      
      const minutesOld = 10; // Delete orders older than 10 minutes
      const cutoffTime = new Date(Date.now() - (minutesOld * 60 * 1000));
      
  
      
      // Query for pending_payment orders older than cutoff time
      const pendingQuery = db.collection('orders')
        .where('status', '==', 'pending_payment')
        .where('timestamp', '<', cutoffTime);
      
      // Query for cancelled orders older than cutoff time
      const cancelledQuery = db.collection('orders')
        .where('status', '==', 'cancelled')
        .where('timestamp', '<', cutoffTime);
      
      const [pendingSnapshot, cancelledSnapshot] = await Promise.all([
        pendingQuery.get(),
        cancelledQuery.get()
      ]);
      
      const ordersToDelete = [];
      
      // Collect pending payment orders
      pendingSnapshot.forEach(doc => {
        const data = doc.data();
     
        ordersToDelete.push(doc.ref);
      });
      
      // Collect cancelled orders
      cancelledSnapshot.forEach(doc => {
        const data = doc.data();
      
        ordersToDelete.push(doc.ref);
      });
      
      if (ordersToDelete.length === 0) {
   
        return null;
      }
      
 
      
      // Delete orders in batches
      const batchSize = 500;
      let deletedCount = 0;
      
      for (let i = 0; i < ordersToDelete.length; i += batchSize) {
        const batch = db.batch();
        const batchOrders = ordersToDelete.slice(i, i + batchSize);
        
        batchOrders.forEach(orderRef => {
          batch.delete(orderRef);
        });
        
        await batch.commit();
        deletedCount += batchOrders.length;
  
      }
      
      
      return null;
      
    } catch (error) {

      throw error;
    }
  });

/**
 * HTTP Cloud Function to manually trigger cleanup
 * Usage: POST https://your-region-your-project.cloudfunctions.net/manualCleanupOrders?minutes=15
 */
export const manualCleanupOrders = onRequest(async (req, res) => {
  try {
    // Add CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    const minutesOld = req.query.minutes ? parseInt(req.query.minutes) : 10;
    

    
    const cutoffTime = new Date(Date.now() - (minutesOld * 60 * 1000));
    
    // Query for pending_payment and cancelled orders
    const [pendingSnapshot, cancelledSnapshot] = await Promise.all([
      db.collection('orders')
        .where('status', '==', 'pending_payment')
        .where('timestamp', '<', cutoffTime)
        .get(),
      db.collection('orders')
        .where('status', '==', 'cancelled')
        .where('timestamp', '<', cutoffTime)
        .get()
    ]);
    
    const ordersToDelete = [];
    const orderDetails = [];
    
    pendingSnapshot.forEach(doc => {
      const data = doc.data();
      ordersToDelete.push(doc.ref);
      orderDetails.push({
        id: doc.id,
        status: 'pending_payment',
        timestamp: data.timestamp?.toDate(),
        truckId: data.truckId
      });
    });
    
    cancelledSnapshot.forEach(doc => {
      const data = doc.data();
      ordersToDelete.push(doc.ref);
      orderDetails.push({
        id: doc.id,
        status: 'cancelled',
        timestamp: data.timestamp?.toDate(),
        truckId: data.truckId
      });
    });
    
    if (ordersToDelete.length === 0) {
      res.json({ 
        success: true, 
        deleted: 0, 
        message: 'No orders to delete',
        cutoffTime: cutoffTime.toISOString()
      });
      return;
    }
    
    // Delete in batches
    const batchSize = 500;
    let deletedCount = 0;
    
    for (let i = 0; i < ordersToDelete.length; i += batchSize) {
      const batch = db.batch();
      const batchOrders = ordersToDelete.slice(i, i + batchSize);
      
      batchOrders.forEach(orderRef => {
        batch.delete(orderRef);
      });
      
      await batch.commit();
      deletedCount += batchOrders.length;
    }
    
    res.json({ 
      success: true, 
      deleted: deletedCount, 
      message: `Successfully deleted ${deletedCount} old orders`,
      cutoffTime: cutoffTime.toISOString(),
      deletedOrders: orderDetails
    });
    
  } catch (error) {

    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Firestore trigger that runs when an order status changes
 * Helps clean up orders that get stuck in pending states
 */
export const orderStatusCleanupTrigger = onDocumentUpdated(
  'orders/{orderId}',
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const orderId = event.params.orderId;
    
    // If order moves from pending_payment to cancelled, schedule cleanup
    if (before.status === 'pending_payment' && after.status === 'cancelled') {

    }
    
    // If order has been in pending_payment for more than 15 minutes, log it
    if (after.status === 'pending_payment' && after.timestamp) {
      const orderAge = Date.now() - after.timestamp.toMillis();
      const minutesOld = Math.floor(orderAge / (1000 * 60));
      
      if (minutesOld > 15) {
  
      }
    }
    
    return null;
  });
