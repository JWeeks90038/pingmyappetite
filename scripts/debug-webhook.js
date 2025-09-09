// Debug script to test webhook logic locally
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Simulate the webhook data
const mockStripeEvent = {
  type: 'customer.subscription.created',
  data: {
    object: {
      id: 'sub_test123',
      customer: 'cus_test123',
      status: 'trialing',
      items: {
        data: [{
          price: {
            id: 'price_1RjsKKRsRfaVTYCjd2b9EjI4'  // Pro plan price ID
          }
        }]
      },
      trial_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
      current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
    }
  },
  metadata: {
    uid: 'Tuu7FCHBbjWIapVKH4omrHMn2Uo2'  // The user's Firebase UID
  }
};

// Test the plan determination function
function getPlanFromPriceId(priceId) {

  
  if (priceId === process.env.VITE_STRIPE_PRO_PRICE_ID) {

    return 'pro';
  }
  if (priceId === process.env.VITE_STRIPE_ALL_ACCESS_PRICE_ID) {

    return 'all-access';
  }

  return 'basic';
}

// Test user lookup and update
async function testWebhookLogic() {
  try {
    const createdSub = mockStripeEvent.data.object;
    const priceId = createdSub.items.data[0].price.id;
    const planType = getPlanFromPriceId(priceId);
    

    
    // Test user lookup
    const db = admin.firestore();
    const usersRef = db.collection('users');
    
    // Try finding by Firebase UID first
    const userDoc = await usersRef.doc('Tuu7FCHBbjWIapVKH4omrHMn2Uo2').get();
    if (userDoc.exists()) {
      const userData = userDoc.data();

      


      await userDoc.ref.update({
        plan: planType,
        subscriptionId: createdSub.id,
        subscriptionStatus: createdSub.status,
        priceId: priceId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      
      // Verify update
      const updatedDoc = await usersRef.doc('Tuu7FCHBbjWIapVKH4omrHMn2Uo2').get();

      
    } else {
  
    }
    
    process.exit(0);
  } catch (error) {

    process.exit(1);
  }
}

testWebhookLogic();
