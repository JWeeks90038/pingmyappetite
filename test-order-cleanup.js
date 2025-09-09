const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testCleanupFunction() {
  try {
    console.log('Testing order cleanup function...');
    
    const minutesOld = 5; // Test with orders older than 5 minutes
    const cutoffTime = new Date(Date.now() - (minutesOld * 60 * 1000));
    
    console.log(`Looking for orders older than: ${cutoffTime.toISOString()}`);
    
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
    
    console.log(`Found ${pendingSnapshot.size} pending payment orders`);
    console.log(`Found ${cancelledSnapshot.size} cancelled orders`);
    
    // Show details of orders that would be deleted
    pendingSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Pending Payment Order: ${doc.id}`);
      console.log(`  - Timestamp: ${data.timestamp?.toDate()}`);
      console.log(`  - Truck ID: ${data.truckId}`);
      console.log(`  - Total: $${data.total}`);
      console.log('---');
    });
    
    cancelledSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Cancelled Order: ${doc.id}`);
      console.log(`  - Timestamp: ${data.timestamp?.toDate()}`);
      console.log(`  - Truck ID: ${data.truckId}`);
      console.log(`  - Total: $${data.total}`);
      console.log('---');
    });
    
    const totalToDelete = pendingSnapshot.size + cancelledSnapshot.size;
    console.log(`\nTotal orders that would be deleted: ${totalToDelete}`);
    
    // Ask user if they want to proceed with deletion
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    if (totalToDelete > 0) {
      rl.question('Do you want to delete these orders? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          console.log('Deleting orders...');
          
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
            console.log(`Deleted batch of ${batchOrders.length} orders`);
          }
          
          console.log(`\nCleanup completed! Deleted ${deletedCount} orders.`);
        } else {
          console.log('Cleanup cancelled.');
        }
        rl.close();
        process.exit(0);
      });
    } else {
      console.log('No orders to delete.');
      rl.close();
      process.exit(0);
    }
    
  } catch (error) {
    console.error('Error testing cleanup:', error);
    process.exit(1);
  }
}

// Run the test
testCleanupFunction();
