import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import sgMail from '@sendgrid/mail';
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('../../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

dotenv.config();
const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.use(cors({
  origin: [
    'https://www.grubana.com',
    'http://localhost:5173',
    /^https:\/\/.*\.vercel\.app$/
  ],
  credentials: true,
}));

app.use(express.json());

// Create a subscription endpoint
app.post('/create-subscription', async (req, res) => {
  const { email, paymentMethodId, priceId, uid } = req.body;
  //console.log('Received uid:', uid); 
  try {
    // 1. Check if user already has a Stripe customer ID
    let customerId;
    if (uid) {
      const userDoc = await admin.firestore().collection('users').doc(uid).get();
      if (userDoc.exists && userDoc.data().stripeCustomerId) {
        customerId = userDoc.data().stripeCustomerId;
        console.log('Reusing existing Stripe customer:', customerId, 'for uid:', uid);
      }
    }

    // 2. Create customer if needed
    let customer;
    if (!customerId) {
      customer = await stripe.customers.create({
        email,
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      customerId = customer.id;
      if (uid) {
        //console.log('About to save stripeCustomerId:', customerId, 'for uid:', uid);
        await admin.firestore().collection('users').doc(uid).set(
          { stripeCustomerId: customerId },
          { merge: true }
        );
        //console.log('Saved stripeCustomerId to Firestore for uid:', uid);
      }
    } else {
      // Attach the new payment method to the existing customer
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // 3. Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 30,
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice'],
    });

    // 4. Save subscriptionId to Firestore
if (uid) {
  try {
    await admin.firestore().collection('users').doc(uid).set(
      { subscriptionId: subscription.id },
      { merge: true }
    );
    //console.log('Saved subscriptionId to Firestore for uid:', uid);

    // --- Add this block to save card info ---
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const cardInfo = {
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
    };
    await admin.firestore().collection('users').doc(uid).set(
      { cardInfo },
      { merge: true }
    );
    //console.log('Saved card info to Firestore for uid:', uid);
    // --- End block ---
  } catch (firestoreErr) {
    //console.error('Error saving subscriptionId or card info to Firestore:', firestoreErr);
  }
}

    // 5. Send welcome email (after successful subscription creation)
    const msg = {
      to: email,
      from: 'grubana.co@gmail.com',
      subject: 'Welcome to Ping My Appetite!',
      text: 'Thanks for subscribing to the All-Access Plan! We’re excited to have you on board.',
      html: '<strong>Thanks for subscribing to the All-Access Plan! We’re excited to have you on board.</strong>',
    };
    try {
      await sgMail.send(msg);
      //console.log(`Welcome email sent to ${email}`);
    } catch (emailErr) {
      //console.error('Error sending welcome email:', emailErr.message);
      // Don't fail the subscription if email fails
    }

    // 6. Return client secret for payment confirmation (if available)
    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice && invoice.payment_intent;

    if (!paymentIntent) {
      return res.send({
        subscriptionId: subscription.id,
        clientSecret: null,
        message: "Subscription created. No immediate payment required.",
      });
    }

    res.send({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error('Stripe subscription error:', err);
    res.status(400).send({ error: { message: err.message } });
  }
});

app.post('/cancel-subscription', async (req, res) => {
  const { subscriptionId } = req.body;
  if (!subscriptionId) {
    return res.status(400).json({ error: { message: 'No subscription ID provided.' } });
  }
  try {
    const deleted = await stripe.subscriptions.del(subscriptionId);
    res.json({ canceled: deleted.status === 'canceled' });
  } catch (err) {
    console.error('Error canceling subscription:', err.message);
    res.status(400).json({ error: { message: err.message } });
  }
});

// Stripe webhook endpoint
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET // Set this in your .env
    );
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;

    try {
      // Find the user by subscriptionId
      const usersRef = admin.firestore().collection('users');
      const snapshot = await usersRef.where('subscriptionId', '==', subscriptionId).get();

      if (!snapshot.empty) {
        // Update all matching users (should be only one)
        const updatePromises = [];
        snapshot.forEach((doc) => {
          updatePromises.push(
            doc.ref.update({
              subscriptionId: admin.firestore.FieldValue.delete(),
              plan: 'basic', // or your default plan
            })
          );
        });
        await Promise.all(updatePromises);
        //console.log(`Removed subscriptionId and downgraded plan for user(s) with subscriptionId ${subscriptionId}`);
      } else {
        //console.log(`No user found with subscriptionId ${subscriptionId}`);
      }
    } catch (err) {
      //console.error('Error updating user after subscription cancellation:', err);
    }
  }

  res.json({ received: true });
});

app.post('/api/send-beta-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    await sgMail.send({
      to: email,
      from: 'grubana.co@gmail.com',
      subject: 'Beta Access Invite',
      text: 'You have been invited to the Grubana beta!',
      html: '<strong>You have been invited to the Grubana beta!</strong>',
    });

    res.status(200).json({ message: 'Invite sent successfully' });
  } catch (err) {
    console.error("Send Invite Error:", err);
    res.status(500).json({ message: "Failed to send invite" });
  }
});

app.post('/create-customer-portal-session', async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: { message: 'No user ID provided.' } });

    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: { message: 'User not found.' } });

    const customerId = userDoc.data().stripeCustomerId;
    if (!customerId) return res.status(400).json({ error: { message: 'No Stripe customer ID found for user.' } });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://www.grubana.com/settings', // Use your production URL
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating customer portal session:', err.message);
    res.status(400).json({ error: { message: err.message } });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Stripe server running on port ${PORT}`));