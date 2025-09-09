const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testCleanupFunction() {
  try {

    
    const minutesOld = 5; // Test with orders older than 5 minutes
    const cutoffTime = new Date(Date.now() - (minutesOld * 60 * 1000));
    

    
    // Query for pending_payment orders
    const pendingQuery = db.collection('orders')
      .where('status', '==', 'pending_payment')
      .where('timestamp', '<', cutoffTime);
    
    // Query for cancelled orders
    const cancelledQuery = db.collection('orders')
      .where('status', '==', 'cancelled')
      .where('timestamp', '<', cutoffTime);
    
    const [pendingSnapshot, cancelledSnapshot] = await Promise.all([
      pendingQuery.get(),
      cancelledQuery.get()
    ]);
    

    
    // Show details of orders that would be deleted
    pendingSnapshot.forEach(doc => {
      const data = doc.data();
 
    });
    
    cancelledSnapshot.forEach(doc => {
      const data = doc.data();

    });
    
    const totalToDelete = pendingSnapshot.size + cancelledSnapshot.size;

    
    // Ask user if they want to proceed with deletion
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    if (totalToDelete > 0) {
      rl.question('Do you want to delete these orders? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
   
          
          const ordersToDelete = [];
          pendingSnapshot.forEach(doc => ordersToDelete.push(doc.ref));
          cancelledSnapshot.forEach(doc => ordersToDelete.push(doc.ref));
          
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
          
     
        } else {
 
        }
        rl.close();
        process.exit(0);
      });
    } else {
     
      rl.close();
      process.exit(0);
    }
    
  } catch (error) {

    process.exit(1);
  }
}

// Run the test
testCleanupFunction();
