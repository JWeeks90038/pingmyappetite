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

/**
 * MENU MANAGEMENT ROUTES
 */

// Get truck's menu items
router.get('/trucks/:truckId/menu', async (req, res) => {
  try {
    const { truckId } = req.params;

    const db = admin.firestore();
    const menuSnapshot = await db.collection('menuItems')
      .where('truckId', '==', truckId)
      .orderBy('createdAt', 'desc')
      .get();

    const items = menuSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      items,
      success: true
    });

  } catch (error) {
    console.error('❌ Error fetching menu items:', error);
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

    if (!name || !price) {
      return res.status(400).json({ 
        error: 'name and price are required' 
      });
    }

    const db = admin.firestore();
    
    // Verify truck exists
    const truckDoc = await db.collection('users').doc(truckId).get();
    if (!truckDoc.exists) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    // Create menu item
    const menuItemRef = await db.collection('menuItems').add({
      truckId,
      name: name.trim(),
      price: parseFloat(price),
      description: description?.trim() || '',
      category: category?.trim() || '',
      image: image || null,
      available: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const menuItem = {
      id: menuItemRef.id,
      truckId,
      name: name.trim(),
      price: parseFloat(price),
      description: description?.trim() || '',
      category: category?.trim() || '',
      image: image || null,
      available: true
    };

    console.log(`✅ Added menu item ${menuItemRef.id} for truck ${truckId}`);

    res.json({
      item: menuItem,
      success: true
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
    const { name, price, description, category, image, available } = req.body;

    const db = admin.firestore();
    
    // Verify menu item exists and belongs to truck
    const menuItemDoc = await db.collection('menuItems').doc(itemId).get();
    if (!menuItemDoc.exists) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const menuItemData = menuItemDoc.data();
    if (menuItemData.truckId !== truckId) {
      return res.status(403).json({ error: 'Unauthorized to update this menu item' });
    }

    // Prepare update data
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (description !== undefined) updateData.description = description.trim();
    if (category !== undefined) updateData.category = category.trim();
    if (image !== undefined) updateData.image = image;
    if (available !== undefined) updateData.available = Boolean(available);

    // Update menu item
    await db.collection('menuItems').doc(itemId).update(updateData);

    console.log(`✅ Updated menu item ${itemId} for truck ${truckId}`);

    res.json({
      itemId,
      success: true
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

    const db = admin.firestore();
    
    // Verify menu item exists and belongs to truck
    const menuItemDoc = await db.collection('menuItems').doc(itemId).get();
    if (!menuItemDoc.exists) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const menuItemData = menuItemDoc.data();
    if (menuItemData.truckId !== truckId) {
      return res.status(403).json({ error: 'Unauthorized to delete this menu item' });
    }

    // Delete menu item
    await db.collection('menuItems').doc(itemId).delete();

    console.log(`✅ Deleted menu item ${itemId} for truck ${truckId}`);

    res.json({
      itemId,
      success: true
    });

  } catch (error) {
    console.error('❌ Error deleting menu item:', error);
    res.status(500).json({ 
      error: 'Failed to delete menu item',
      details: error.message 
    });
  }
});

// Get truck status (including account status)
router.get('/trucks/status', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(authToken);
    const truckId = decodedToken.uid;

    const db = admin.firestore();
    const truckDoc = await db.collection('users').doc(truckId).get();
    
    if (!truckDoc.exists) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    const truckData = truckDoc.data();
    const accountId = truckData.stripeAccountId;

    if (!accountId) {
      return res.json({
        status: 'no_account',
        success: true
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    let status = 'pending';
    if (account.details_submitted && account.payouts_enabled && account.charges_enabled) {
      status = 'active';
    } else if (account.details_submitted) {
      status = 'pending';
    } else {
      status = 'created';
    }

    res.json({
      status,
      stripeAccountId: accountId,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      requirements: account.requirements,
      success: true
    });

  } catch (error) {
    console.error('❌ Error checking truck status:', error);
    res.status(500).json({ 
      error: 'Failed to check truck status',
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
