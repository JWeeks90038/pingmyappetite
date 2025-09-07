import express from 'express';
import admin from 'firebase-admin';

const router = express.Router();

// This will be set when the router is created
let stripe;

// Webhook endpoint for Stripe events
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📡 Received webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      
      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;
      
      case 'transfer.created':
        await handleTransferCreated(event.data.object);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error(`❌ Error handling webhook ${event.type}:`, error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * WEBHOOK EVENT HANDLERS
 */

async function handleCheckoutSessionCompleted(session) {
  console.log(`💳 Checkout session completed: ${session.id}`);
  
  const db = admin.firestore();
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    console.error('❌ No orderId in session metadata');
    return;
  }

  try {
    // Update order status to paid
    await db.collection('orders').doc(orderId).update({
      paymentStatus: 'paid',
      status: 'confirmed', // Move to confirmed status after payment
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log transaction for analytics
    await db.collection('transactions').add({
      type: 'order_payment',
      orderId,
      stripeSessionId: session.id,
      amount: session.amount_total,
      currency: session.currency,
      truckId: session.metadata?.truckId,
      customerId: session.metadata?.customerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Order ${orderId} marked as paid and confirmed`);

    // TODO: Send confirmation emails/notifications to customer and truck
    // await sendOrderConfirmationEmail(orderId);

  } catch (error) {
    console.error(`❌ Error updating order ${orderId}:`, error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log(`💰 Payment succeeded: ${paymentIntent.id}`);
  
  const db = admin.firestore();
  const orderId = paymentIntent.metadata?.orderId;

  if (!orderId) {
    console.error('❌ No orderId in payment intent metadata');
    return;
  }

  try {
    // Update order with payment details
    await db.collection('orders').doc(orderId).update({
      stripePaymentIntentId: paymentIntent.id,
      paymentMethod: paymentIntent.payment_method,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Payment intent ${paymentIntent.id} recorded for order ${orderId}`);

  } catch (error) {
    console.error(`❌ Error recording payment intent for order ${orderId}:`, error);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log(`💸 Payment failed: ${paymentIntent.id}`);
  
  const db = admin.firestore();
  const orderId = paymentIntent.metadata?.orderId;

  if (!orderId) {
    console.error('❌ No orderId in payment intent metadata');
    return;
  }

  try {
    // Update order status to failed
    await db.collection('orders').doc(orderId).update({
      paymentStatus: 'failed',
      status: 'cancelled',
      stripePaymentIntentId: paymentIntent.id,
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`❌ Order ${orderId} marked as failed due to payment failure`);

    // TODO: Send failure notification to customer
    // await sendPaymentFailureEmail(orderId);

  } catch (error) {
    console.error(`❌ Error updating failed order ${orderId}:`, error);
  }
}

async function handleAccountUpdated(account) {
  console.log(`🏦 Account updated: ${account.id}`);
  
  const db = admin.firestore();
  
  try {
    // Find the truck with this Stripe account ID
    const trucksQuery = await db.collection('users')
      .where('stripeAccountId', '==', account.id)
      .limit(1)
      .get();

    if (trucksQuery.empty) {
      console.log(`ℹ️ No truck found for account ${account.id}`);
      return;
    }

    const truckDoc = trucksQuery.docs[0];
    const truckId = truckDoc.id;
    
    // Update truck's Stripe account status in users collection
    await truckDoc.ref.update({
      stripeAccountStatus: account.details_submitted ? 'completed' : 'pending',
      stripePayoutsEnabled: account.payouts_enabled,
      stripeChargesEnabled: account.charges_enabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Updated truck ${truckId} Stripe account status in users collection`);

    // Also update the trucks collection with stripeConnectAccountId for payment processing
    const trucksCollectionDoc = await db.collection('trucks').doc(truckId).get();
    if (trucksCollectionDoc.exists) {
      await db.collection('trucks').doc(truckId).update({
        stripeConnectAccountId: account.id,
        paymentEnabled: account.charges_enabled && account.payouts_enabled,
        stripeAccountStatus: account.details_submitted ? 'completed' : 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Updated truck ${truckId} in trucks collection with stripeConnectAccountId: ${account.id}`);
    } else {
      console.log(`⚠️ Truck ${truckId} not found in trucks collection`);
    }

  } catch (error) {
    console.error(`❌ Error updating truck account status:`, error);
  }
}

async function handleTransferCreated(transfer) {
  console.log(`💸 Transfer created: ${transfer.id} to ${transfer.destination}`);
  
  const db = admin.firestore();
  
  try {
    // Log transfer for analytics and reconciliation
    await db.collection('transfers').add({
      stripeTransferId: transfer.id,
      destinationAccount: transfer.destination,
      amount: transfer.amount,
      currency: transfer.currency,
      description: transfer.description,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: transfer.metadata
    });

    console.log(`✅ Transfer ${transfer.id} logged to database`);

  } catch (error) {
    console.error(`❌ Error logging transfer ${transfer.id}:`, error);
  }
}

// Function to initialize the router with stripe instance
function createWebhookRouter(stripeInstance) {
  stripe = stripeInstance;
  return router;
}

export default createWebhookRouter;
