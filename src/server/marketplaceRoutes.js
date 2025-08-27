import express from 'express';
import admin from 'firebase-admin';

const router = express.Router();

// Constants
const APPLICATION_FEE_PERCENTAGE = 0.02; // 2% application fee
const PLATFORM_CURRENCY = 'usd';

// This will be set when the router is created
let stripe;

/**
 * FOOD TRUCK ONBOARDING ROUTES
 */

// Create Stripe Express account for food truck
router.post('/trucks/onboard', async (req, res) => {
  try {
    const { truckId, email, businessName, country = 'US' } = req.body;

    if (!truckId || !email) {
      return res.status(400).json({ 
        error: 'truckId and email are required' 
      });
    }

    // Create Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      metadata: {
        truckId,
        platform: 'grubana'
      },
      business_profile: {
        name: businessName,
        product_description: 'Food truck services'
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    });

    // Save account ID to Firestore
    const db = admin.firestore();
    await db.collection('users').doc(truckId).update({
      stripeAccountId: account.id,
      stripeAccountStatus: 'created',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Created Stripe account ${account.id} for truck ${truckId}`);

    res.json({
      accountId: account.id,
      success: true
    });

  } catch (error) {
    console.error('❌ Error creating Stripe account:', error);
    res.status(500).json({ 
      error: 'Failed to create Stripe account',
      details: error.message 
    });
  }
});

// Create onboarding link for food truck
router.post('/trucks/onboarding-link', async (req, res) => {
  try {
    const { truckId, accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ 
        error: 'accountId is required' 
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL}/truck/onboarding?refresh=true&truck=${truckId}`,
      return_url: `${process.env.FRONTEND_URL}/truck/onboarding/success?truck=${truckId}`,
      type: 'account_onboarding'
    });

    console.log(`✅ Created onboarding link for account ${accountId}`);

    res.json({
      onboardingUrl: accountLink.url,
      success: true
    });

  } catch (error) {
    console.error('❌ Error creating onboarding link:', error);
    res.status(500).json({ 
      error: 'Failed to create onboarding link',
      details: error.message 
    });
  }
});

// Check onboarding status
router.get('/trucks/:truckId/onboarding-status', async (req, res) => {
  try {
    const { truckId } = req.params;

    // Get account ID from Firestore
    const db = admin.firestore();
    const truckDoc = await db.collection('users').doc(truckId).get();
    
    if (!truckDoc.exists) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    const truckData = truckDoc.data();
    const accountId = truckData.stripeAccountId;

    if (!accountId) {
      return res.json({
        onboardingCompleted: false,
        payoutsEnabled: false,
        chargesEnabled: false
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    const status = {
      onboardingCompleted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      accountId: account.id
    };

    // Update status in Firestore
    await db.collection('users').doc(truckId).update({
      stripeAccountStatus: account.details_submitted ? 'completed' : 'pending',
      stripePayoutsEnabled: account.payouts_enabled,
      stripeChargesEnabled: account.charges_enabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json(status);

  } catch (error) {
    console.error('❌ Error checking onboarding status:', error);
    res.status(500).json({ 
      error: 'Failed to check onboarding status',
      details: error.message 
    });
  }
});

/**
 * ORDER AND PAYMENT ROUTES
 */

// Create checkout session for customer order
router.post('/orders/create-checkout', async (req, res) => {
  try {
    const { 
      truckId, 
      customerId, 
      orderItems, 
      totalAmount, 
      orderMetadata = {} 
    } = req.body;

    if (!truckId || !orderItems || !totalAmount) {
      return res.status(400).json({ 
        error: 'truckId, orderItems, and totalAmount are required' 
      });
    }

    // Get truck's Stripe account ID
    const db = admin.firestore();
    const truckDoc = await db.collection('users').doc(truckId).get();
    
    if (!truckDoc.exists) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    const truckData = truckDoc.data();
    const stripeAccountId = truckData.stripeAccountId;

    if (!stripeAccountId) {
      return res.status(400).json({ 
        error: 'Truck has not completed Stripe onboarding' 
      });
    }

    // Calculate application fee (2% of total)
    const applicationFeeAmount = Math.round(totalAmount * APPLICATION_FEE_PERCENTAGE);
    
    // Create order record in Firestore first
    const orderRef = await db.collection('orders').add({
      truckId,
      customerId,
      items: orderItems,
      totalAmount,
      applicationFeeAmount,
      currency: PLATFORM_CURRENCY,
      status: 'pending',
      paymentStatus: 'pending',
      stripeAccountId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: orderMetadata
    });

    // Create line items for Stripe checkout
    const lineItems = orderItems.map(item => ({
      price_data: {
        currency: PLATFORM_CURRENCY,
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.images || []
        },
        unit_amount: Math.round(item.price * 100) // Convert to cents
      },
      quantity: item.quantity || 1
    }));

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/order/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderRef.id}`,
      cancel_url: `${process.env.FRONTEND_URL}/order/cancelled?order_id=${orderRef.id}`,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: stripeAccountId
        },
        metadata: {
          orderId: orderRef.id,
          truckId,
          customerId: customerId || 'guest'
        }
      },
      metadata: {
        orderId: orderRef.id,
        truckId,
        customerId: customerId || 'guest'
      }
    });

    // Update order with Stripe session ID
    await orderRef.update({
      stripeSessionId: session.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Created checkout session ${session.id} for order ${orderRef.id}`);

    res.json({
      sessionId: session.id,
      sessionUrl: session.url,
      orderId: orderRef.id,
      applicationFeeAmount,
      success: true
    });

  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
});

// Get order details
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const db = admin.firestore();
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();
    
    res.json({
      orderId,
      ...orderData,
      success: true
    });

  } catch (error) {
    console.error('❌ Error fetching order:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order',
      details: error.message 
    });
  }
});

// Update order status (for trucks)
router.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, truckId } = req.body;

    if (!status || !truckId) {
      return res.status(400).json({ 
        error: 'status and truckId are required' 
      });
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const db = admin.firestore();
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();

    // Verify truck owns this order
    if (orderData.truckId !== truckId) {
      return res.status(403).json({ error: 'Unauthorized to update this order' });
    }

    // Update order status
    await db.collection('orders').doc(orderId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Updated order ${orderId} status to ${status}`);

    res.json({
      orderId,
      status,
      success: true
    });

  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ 
      error: 'Failed to update order status',
      details: error.message 
    });
  }
});

// Function to initialize the router with stripe instance
function createMarketplaceRouter(stripeInstance) {
  stripe = stripeInstance;
  return router;
}

export default createMarketplaceRouter;
