const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://foodtruckfinder-27eba-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

/**
 * Clean up pending payment and cancelled orders older than specified minutes
 * @param {number} minutesOld - Orders older than this many minutes will be deleted
 */
async function cleanupOldOrders(minutesOld = 10) {
  try {
    console.log(`Starting cleanup of orders older than ${minutesOld} minutes...`);
    
    const cutoffTime = new Date(Date.now() - (minutesOld * 60 * 1000));
    console.log(`Cutoff time: ${cutoffTime.toISOString()}`);
    
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
      console.log(`Found pending payment order: ${doc.id} from ${data.timestamp?.toDate()}`);
      ordersToDelete.push(doc.ref);
    });
    
    // Collect cancelled orders
    cancelledSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Found cancelled order: ${doc.id} from ${data.timestamp?.toDate()}`);
      ordersToDelete.push(doc.ref);
    });
    
    if (ordersToDelete.length === 0) {
      console.log('No orders to delete.');
      return { deleted: 0, errors: 0 };
    }
    
    console.log(`Deleting ${ordersToDelete.length} orders...`);
    
    // Delete orders in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    let deletedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < ordersToDelete.length; i += batchSize) {
      const batch = db.batch();
      const batchOrders = ordersToDelete.slice(i, i + batchSize);
      
      batchOrders.forEach(orderRef => {
        batch.delete(orderRef);
      });
      
      try {
        await batch.commit();
        deletedCount += batchOrders.length;
        console.log(`Deleted batch of ${batchOrders.length} orders`);
      } catch (error) {
        console.error(`Error deleting batch:`, error);
        errorCount += batchOrders.length;
      }
    }
    
    console.log(`Cleanup completed. Deleted: ${deletedCount}, Errors: ${errorCount}`);
    return { deleted: deletedCount, errors: errorCount };
    
  } catch (error) {
    console.error('Error in cleanup process:', error);
    throw error;
  }
}

/**
 * Set up automatic cleanup that runs periodically
 * @param {number} intervalMinutes - How often to run cleanup (in minutes)
 * @param {number} orderAgeMinutes - Delete orders older than this (in minutes)
 */
function setupAutomaticCleanup(intervalMinutes = 30, orderAgeMinutes = 10) {
  console.log(`Setting up automatic cleanup every ${intervalMinutes} minutes for orders older than ${orderAgeMinutes} minutes`);
  
  // Run immediately
  cleanupOldOrders(orderAgeMinutes);
  
  // Set up interval
  setInterval(() => {
    cleanupOldOrders(orderAgeMinutes);
  }, intervalMinutes * 60 * 1000);
}

// If running directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const minutesOld = args[0] ? parseInt(args[0]) : 10;
  
  console.log('Running order cleanup script...');
  cleanupOldOrders(minutesOld)
    .then(result => {
      console.log('Script completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  cleanupOldOrders,
  setupAutomaticCleanup
};
