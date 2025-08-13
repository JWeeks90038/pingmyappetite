const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Middleware to parse Stripe webhook payload
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;
    const customerId = subscription.customer;
    const metadata = subscription.metadata;

    if (metadata && metadata.uid) {
      const uid = metadata.uid;
      const planType = metadata.planType || 'basic';

      try {
        // Update Firestore user document with subscription ID
        const userRef = admin.firestore().collection('users').doc(uid);
        await userRef.update({
          stripeSubscriptionId: subscriptionId,
          plan: planType,
          subscriptionStatus: 'active',
        });

        console.log(`Updated Firestore for user ${uid} with subscription ID ${subscriptionId}`);
      } catch (err) {
        console.error('Error updating Firestore:', err);
      }
    } else {
      console.error('Missing metadata in subscription object. Cannot update Firestore.');
    }
  }

  res.status(200).send('Received');
});

module.exports = app;
