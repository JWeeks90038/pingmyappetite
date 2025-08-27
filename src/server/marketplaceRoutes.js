import express from 'express';
import admin from 'firebase-admin';
import { 
  calculateOrderPlatformFees, 
  getSubscriptionPlan,
  PLATFORM_CONFIG,
  STRIPE_PROCESSING_FEES 
} from './paymentConfig.js';
import { 
  getUserSubscription, 
  handleSubscriptionWebhook,
  initializeSubscriptionService,
  createOrUpdateSubscription
} from './subscriptionService.js';

const router = express.Router();

// This will be set when the router is created
let stripe;

/**
 * Authentication middleware for marketplace routes
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authorization header required' 
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(401).json({ 
      error: 'Invalid or expired token' 
    });
  }
};

// Apply authentication middleware to all routes except webhooks
router.use((req, res, next) => {
  // Skip authentication for webhook routes
  if (req.path.startsWith('/webhooks/')) {
    return next();
  }
  return authenticateUser(req, res, next);
});

/**
 * Initialize the marketplace routes with Stripe instance
 * @param {Object} stripeInstance - Configured Stripe instance
 */
export function initializeMarketplaceRoutes(stripeInstance) {
  stripe = stripeInstance;
  initializeSubscriptionService(stripeInstance);
  return router;
}

/**
 * SUBSCRIPTION ROUTES
 */

// Get user's current subscription
router.get('/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const subscription = await getUserSubscription(userId);
    
    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('❌ Error getting subscription:', error);
    res.status(500).json({ 
      error: 'Failed to get subscription',
      details: error.message 
    });
  }
});

// Create or update subscription
router.post('/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { planId, paymentMethodId } = req.body;
    
    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }
    
    const result = await createOrUpdateSubscription(userId, planId, paymentMethodId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to update subscription',
      details: error.message 
    });
  }
});

/**
 * FOOD TRUCK ONBOARDING ROUTES
 */

// Get truck's Stripe account status
router.get('/trucks/status', async (req, res) => {
  try {
    // Get truck ID from authenticated user
    const truckId = req.user?.uid;
    
    if (!truckId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const db = admin.firestore();
    const truckDoc = await db.collection('users').doc(truckId).get();
    
    if (!truckDoc.exists) {
      return res.json({ 
        status: 'no_account',
        message: 'No Stripe account found' 
      });
    }

    const truckData = truckDoc.data();
    const stripeAccountId = truckData.stripeAccountId;

    if (!stripeAccountId) {
      return res.json({ 
        status: 'no_account',
        message: 'No Stripe account created yet' 
      });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId);
    
    let status = 'pending';
    if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
      status = 'active';
    } else if (account.details_submitted) {
      status = 'pending';
    } else {
      status = 'created';
    }

    res.json({
      status,
      stripeAccountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      country: account.country,
      defaultCurrency: account.default_currency
    });

  } catch (error) {
    console.error('❌ Error checking truck status:', error);
    res.status(500).json({ 
      error: 'Failed to check account status',
      details: error.message 
    });
  }
});

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
      stripeOnboardingStatus: 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/truck/onboarding/refresh`,
      return_url: `${process.env.FRONTEND_URL}/truck/onboarding/complete`,
      type: 'account_onboarding',
    });

    res.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
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

    // Validate minimum order amount
    if (totalAmount < PLATFORM_CONFIG.minimumOrderAmount) {
      return res.status(400).json({ 
        error: `Minimum order amount is $${PLATFORM_CONFIG.minimumOrderAmount / 100}` 
      });
    }

    // Get truck's subscription plan and Stripe account ID
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

    // Get truck's current subscription to determine platform fees
    const subscriptionInfo = await getUserSubscription(truckId);
    const planId = subscriptionInfo.planId;
    
    // Calculate platform fees based on truck's subscription plan
    const feeCalculation = calculateOrderPlatformFees(orderItems, planId);
    
    console.log(`📊 Order fee calculation for ${subscriptionInfo.plan.name} plan:`, {
      totalOrderValue: feeCalculation.totalOrderValue,
      totalPlatformFee: feeCalculation.totalPlatformFee,
      platformFeePercentage: (feeCalculation.platformFeePercentage * 100).toFixed(2) + '%',
      planId
    });

    // Ensure calculated total matches provided total (with small tolerance for rounding)
    const calculatedTotal = feeCalculation.totalOrderValue;
    if (Math.abs(calculatedTotal - totalAmount) > 10) { // 10 cent tolerance
      return res.status(400).json({ 
        error: `Order total mismatch. Expected: $${calculatedTotal/100}, Received: $${totalAmount/100}` 
      });
    }
    
    // Create order record in Firestore first
    const orderRef = await db.collection('orders').add({
      truckId,
      customerId,
      items: orderItems,
      totalAmount: calculatedTotal,
      platformFeeAmount: feeCalculation.totalPlatformFee,
      platformFeePercentage: feeCalculation.platformFeePercentage,
      planId,
      planName: subscriptionInfo.plan.name,
      currency: PLATFORM_CONFIG.currency,
      status: 'pending',
      paymentStatus: 'pending',
      stripeAccountId,
      feeBreakdown: feeCalculation.itemBreakdown,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: orderMetadata
    });

    // Create line items for Stripe checkout
    const lineItems = orderItems.map(item => ({
      price_data: {
        currency: PLATFORM_CONFIG.currency,
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.images || []
        },
        unit_amount: item.price // Already in cents from frontend
      },
      quantity: item.quantity || 1
    }));

    // Create Stripe checkout session with platform fee
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin || 'https://grubana.com'}/order-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderRef.id}`,
      cancel_url: `${req.headers.origin || 'https://grubana.com'}/order-cancelled?order_id=${orderRef.id}`,
      payment_intent_data: {
        application_fee_amount: feeCalculation.totalPlatformFee,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          orderId: orderRef.id,
          truckId,
          customerId: customerId || 'guest',
          planId,
          platformFeeAmount: feeCalculation.totalPlatformFee.toString()
        }
      },
      metadata: {
        orderId: orderRef.id,
        truckId,
        customerId: customerId || 'guest',
        planId
      }
    });

    // Update order with Stripe session ID
    await orderRef.update({
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Created checkout session for order ${orderRef.id}:`, {
      sessionId: session.id,
      totalAmount: calculatedTotal,
      platformFee: feeCalculation.totalPlatformFee,
      planName: subscriptionInfo.plan.name
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      orderId: orderRef.id,
      feeBreakdown: {
        totalAmount: calculatedTotal,
        platformFee: feeCalculation.totalPlatformFee,
        platformFeePercentage: feeCalculation.platformFeePercentage,
        planName: subscriptionInfo.plan.name
      }
    });

  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
});

/**
 * MENU MANAGEMENT ROUTES
 */

// Get truck's menu items
router.get('/trucks/:truckId/menu', async (req, res) => {
  try {
    const { truckId } = req.params;
    
    // Verify the requesting user owns this truck or is authorized
    if (req.user?.uid !== truckId) {
      return res.status(403).json({ 
        error: 'Unauthorized: You can only access your own menu' 
      });
    }

    const db = admin.firestore();
    const menuSnapshot = await db
      .collection('users')
      .doc(truckId)
      .collection('menu')
      .orderBy('createdAt', 'desc')
      .get();

    const items = [];
    menuSnapshot.forEach(doc => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      items
    });

  } catch (error) {
    console.error('❌ Error fetching menu:', error);
    res.status(500).json({ 
      error: 'Failed to fetch menu items',
      details: error.message 
    });
  }
});

// Add new menu item
router.post('/trucks/:truckId/menu', async (req, res) => {
  try {
    const { truckId } = req.params;
    const { name, price, description, category, image } = req.body;
    
    // Verify the requesting user owns this truck
    if (req.user?.uid !== truckId) {
      return res.status(403).json({ 
        error: 'Unauthorized: You can only modify your own menu' 
      });
    }

    if (!name || !price) {
      return res.status(400).json({ 
        error: 'Name and price are required' 
      });
    }

    const db = admin.firestore();
    const menuItem = {
      name: name.trim(),
      price: parseFloat(price),
      description: description?.trim() || '',
      category: category || '',
      image: image || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      truckId
    };

    const docRef = await db
      .collection('users')
      .doc(truckId)
      .collection('menu')
      .add(menuItem);

    // Return the created item with its ID
    const createdItem = {
      id: docRef.id,
      ...menuItem,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log(`✅ Menu item added for truck ${truckId}:`, name);

    res.json({
      success: true,
      item: createdItem
    });

  } catch (error) {
    console.error('❌ Error adding menu item:', error);
    res.status(500).json({ 
      error: 'Failed to add menu item',
      details: error.message 
    });
  }
});

// Update menu item
router.put('/trucks/:truckId/menu/:itemId', async (req, res) => {
  try {
    const { truckId, itemId } = req.params;
    const { name, price, description, category, image } = req.body;
    
    // Verify the requesting user owns this truck
    if (req.user?.uid !== truckId) {
      return res.status(403).json({ 
        error: 'Unauthorized: You can only modify your own menu' 
      });
    }

    const db = admin.firestore();
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (category !== undefined) updateData.category = category || '';
    if (image !== undefined) updateData.image = image;

    await db
      .collection('users')
      .doc(truckId)
      .collection('menu')
      .doc(itemId)
      .update(updateData);

    console.log(`✅ Menu item updated for truck ${truckId}:`, itemId);

    res.json({
      success: true,
      message: 'Menu item updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating menu item:', error);
    res.status(500).json({ 
      error: 'Failed to update menu item',
      details: error.message 
    });
  }
});

// Delete menu item
router.delete('/trucks/:truckId/menu/:itemId', async (req, res) => {
  try {
    const { truckId, itemId } = req.params;
    
    // Verify the requesting user owns this truck
    if (req.user?.uid !== truckId) {
      return res.status(403).json({ 
        error: 'Unauthorized: You can only modify your own menu' 
      });
    }

    const db = admin.firestore();
    await db
      .collection('users')
      .doc(truckId)
      .collection('menu')
      .doc(itemId)
      .delete();

    console.log(`✅ Menu item deleted for truck ${truckId}:`, itemId);

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting menu item:', error);
    res.status(500).json({ 
      error: 'Failed to delete menu item',
      details: error.message 
    });
  }
});

/**
 * WEBHOOK ROUTES
 */

// Stripe webhook handler
router.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
        
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handlePaymentSucceeded(paymentIntent);
        break;
        
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed':
        await handleSubscriptionWebhook(event);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * WEBHOOK HELPER FUNCTIONS
 */

async function handleCheckoutCompleted(session) {
  try {
    const orderId = session.metadata.orderId;
    if (!orderId) return;

    const db = admin.firestore();
    await db.collection('orders').doc(orderId).update({
      paymentStatus: 'completed',
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Payment completed for order: ${orderId}`);
  } catch (error) {
    console.error('❌ Error handling checkout completion:', error);
  }
}

async function handlePaymentSucceeded(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata.orderId;
    if (!orderId) return;

    const db = admin.firestore();
    await db.collection('orders').doc(orderId).update({
      status: 'confirmed',
      paymentStatus: 'completed',
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Payment succeeded for order: ${orderId}, amount: $${paymentIntent.amount / 100}`);
  } catch (error) {
    console.error('❌ Error handling payment success:', error);
  }
}

export default router;
