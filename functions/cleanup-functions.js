const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function to clean up old pending payment and cancelled orders
 * Runs every 30 minutes
 */
exports.cleanupOldOrders = functions.pubsub
  .schedule('every 30 minutes')
  .timeZone('America/Los_Angeles') // Adjust timezone as needed
  .onRun(async (context) => {
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
 */
exports.manualCleanupOrders = functions.https.onRequest(async (req, res) => {
  try {
    // Check for admin auth or API key here if needed
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
    
    pendingSnapshot.forEach(doc => ordersToDelete.push(doc.ref));
    cancelledSnapshot.forEach(doc => ordersToDelete.push(doc.ref));
    
    if (ordersToDelete.length === 0) {
      res.json({ success: true, deleted: 0, message: 'No orders to delete' });
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
      message: `Successfully deleted ${deletedCount} old orders` 
    });
    
  } catch (error) {
 
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Firestore trigger that runs when an order is created
 * Sets up a delayed cleanup for that specific order if it remains in pending_payment
 */
exports.scheduleOrderCleanup = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;
    
    // Only schedule cleanup for pending_payment orders
    if (order.status === 'pending_payment') {
 
      
      // Schedule a task to check and delete this order after 10 minutes
      const taskQueue = functions.tasks.taskQueue();
      
      await taskQueue.enqueue({
        orderId: orderId,
        scheduledTime: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
      });
    }
    
    return null;
  });

/**
 * Task queue function to handle individual order cleanup
 */
exports.cleanupSpecificOrder = functions.tasks.taskQueue().onDispatch(async (data) => {
  try {
    const orderId = data.orderId;
 
    
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
   
      return;
    }
    
    const order = orderDoc.data();
    
    // Only delete if still in pending_payment or cancelled status
    if (order.status === 'pending_payment' || order.status === 'cancelled') {
      await orderRef.delete();
 
    } else {

    }
    
  } catch (error) {

    throw error;
  }
});
