const express = require('express');
const Stripe = require('stripe');
const router = express.Router();

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Endpoint to create a subscription with free trial
router.post('/create-subscription', async (req, res) => {
  try {
    const { priceId, customerId, planType } = req.body;

    // Create subscription with 30-day free trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 30,
      metadata: {
        planType: planType,
        app: 'grubana'
      }
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent?.client_secret,
      status: subscription.status
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to create a customer
router.post('/create-customer', async (req, res) => {
  try {
    const { email, name } = req.body;

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        app: 'grubana'
      }
    });

    res.json({ customerId: customer.id });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to create setup intent for future payments
router.post('/create-setup-intent', async (req, res) => {
  try {
    const { customerId } = req.body;

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session'
    });

    res.json({
      client_secret: setupIntent.client_secret
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to handle subscription cancellation
router.post('/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    res.json({ 
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(400).json({ error: error.message });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
      console.log('Subscription created:', event.data.object);
      // Update user's subscription status in your database
      break;
    case 'customer.subscription.updated':
      console.log('Subscription updated:', event.data.object);
      // Update user's subscription status in your database
      break;
    case 'customer.subscription.deleted':
      console.log('Subscription canceled:', event.data.object);
      // Update user's subscription status in your database
      break;
    case 'invoice.payment_succeeded':
      console.log('Payment succeeded:', event.data.object);
      // Handle successful payment
      break;
    case 'invoice.payment_failed':
      console.log('Payment failed:', event.data.object);
      // Handle failed payment
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
