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

      return { deleted: 0, errors: 0 };
    }
    
 
    
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
 
      } catch (error) {

        errorCount += batchOrders.length;
      }
    }
    
  
    return { deleted: deletedCount, errors: errorCount };
    
  } catch (error) {

    throw error;
  }
}

/**
 * Set up automatic cleanup that runs periodically
 * @param {number} intervalMinutes - How often to run cleanup (in minutes)
 * @param {number} orderAgeMinutes - Delete orders older than this (in minutes)
 */
function setupAutomaticCleanup(intervalMinutes = 30, orderAgeMinutes = 10) {

  
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
  

  cleanupOldOrders(minutesOld)
    .then(result => {

      process.exit(0);
    })
    .catch(error => {

      process.exit(1);
    });
}

module.exports = {
  cleanupOldOrders,
  setupAutomaticCleanup
};
