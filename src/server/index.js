import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';
import { createRequire } from 'module';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to use service account file first (for local development)
    const requ        const planType = getPlanFromPriceId(createdSub.items.data[0].price.id);
        console.log('📋 Plan type determined:', planType);

        const updateData = {
          stripeSubscriptionId,
          subscriptionStatus: createdSub.status,
          plan: planType,
          priceId: createdSub.items.data[0].price.id,
          trialEnd: createdSub.trial_end ? new Date(createdSub.trial_end * 1000) : null,
          currentPeriodEnd: new Date(createdSub.current_period_end * 1000),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('📝 Attempting to update user with data:', updateData);
        await userDocRef.update(updateData);

        console.log(`✅ Updated Firestore for user ${uid} with subscription ID ${stripeSubscriptionId}`);
      } catch (error) {
        console.error('❌ Error in customer.subscription.created handler:', error);
        console.error('❌ Error type:', error.constructor.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        
        // Check if this is a Firebase connection error
        if (error.message.includes('DECODER routines::unsupported') || 
            error.message.includes('Getting metadata from plugin failed')) {
          console.error('🚨 Firebase connection error detected - check private key formatting');
        }
        
        throw error; // Re-throw to trigger webhook retryre(import.meta.url);
    const serviceAccount = require('../../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase initialized with service account file');
  } catch (error) {
    // Fallback to environment variables (for Railway deployment)
    console.log('🔄 Service account file not found, using environment variables');
    
    // Better private key handling for Railway
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      // Handle different private key formats
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // Ensure proper BEGIN/END formatting
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        console.error('❌ Invalid private key format - missing BEGIN marker');
      }
      if (!privateKey.includes('-----END PRIVATE KEY-----')) {
        console.error('❌ Invalid private key format - missing END marker');
      }
    }
    
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };
    
    console.log('🔍 Firebase config check:', {
      project_id: !!process.env.FIREBASE_PROJECT_ID,
      private_key_id: !!process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key_length: privateKey?.length || 0,
      client_email: !!process.env.FIREBASE_CLIENT_EMAIL,
      client_id: !!process.env.FIREBASE_CLIENT_ID,
      client_cert_url: !!process.env.FIREBASE_CLIENT_CERT_URL
    });
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase initialized with environment variables');
  }
}

dotenv.config();
const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);


app.use(cors({
  origin: [
    'https://grubana.com',
    'https://www.grubana.com',
    'http://localhost:5173',
    /^https:\/\/.*\.vercel\.app$/
  ],
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Test endpoint to check environment configuration
app.get('/test-config', (req, res) => {
  res.status(200).json({
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Grubana API Server', status: 'running' });
});

// Debug endpoint to check webhook configuration
app.get('/webhook-debug', (req, res) => {
  res.json({
    webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 8) : 'none',
    stripeSecretConfigured: !!process.env.STRIPE_SECRET_KEY,
    timestamp: new Date().toISOString()
  });
});

// Firebase connection test endpoint
app.get('/test-firebase', async (req, res) => {
  try {
    console.log('🧪 Testing Firebase connection...');
    
    // Check Firebase app initialization
    if (admin.apps.length === 0) {
      throw new Error('Firebase Admin is not initialized');
    }
    
    console.log('✅ Firebase Admin initialized');
    
    // Test Firestore connection
    const db = admin.firestore();
    const testRef = db.collection('test').doc('connection-test');
    
    // Try to write a test document
    await testRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      test: 'Firebase connection test from Railway',
      status: 'success'
    });
    
    console.log('✅ Firestore write successful');
    
    // Try to read the document back
    const doc = await testRef.get();
    const data = doc.data();
    
    console.log('✅ Firestore read successful');
    
    res.status(200).json({
      success: true,
      message: 'Firebase connection successful',
      firebaseAppsCount: admin.apps.length,
      testData: data,
      envVarsPresent: {
        projectId: !!process.env.FIREBASE_PROJECT_ID,
        privateKeyId: !!process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        clientId: !!process.env.FIREBASE_CLIENT_ID,
        clientCertUrl: !!process.env.FIREBASE_CLIENT_CERT_URL
      }
    });
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: error.code,
      firebaseAppsCount: admin.apps.length,
      envVarsPresent: {
        projectId: !!process.env.FIREBASE_PROJECT_ID,
        privateKeyId: !!process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        clientId: !!process.env.FIREBASE_CLIENT_ID,
        clientCertUrl: !!process.env.FIREBASE_CLIENT_CERT_URL
      }
    });
  }
});

// Temporary webhook test endpoint - remove after debugging
app.post('/webhook-test', express.raw({ type: 'application/json' }), (req, res) => {
  console.log('🧪 Test webhook received');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body length:', req.body ? req.body.length : 0);
  console.log('Body type:', typeof req.body);
  console.log('Webhook secret available:', !!process.env.STRIPE_WEBHOOK_SECRET);
  
  res.status(200).json({ 
    received: true, 
    bodyLength: req.body ? req.body.length : 0,
    hasSecret: !!process.env.STRIPE_WEBHOOK_SECRET 
  });
});

// Stripe webhook endpoint
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  console.log('🔄 Webhook received at:', new Date().toISOString());
  console.log('📋 Webhook signature header:', sig ? 'Present' : 'Missing');
  console.log('🔑 Webhook secret configured:', process.env.STRIPE_WEBHOOK_SECRET ? 'Yes' : 'No');
  console.log('🔑 Webhook secret prefix:', process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 8) + '...' : 'None');
  console.log('📦 Request body size:', req.body?.length || 0, 'bytes');
  console.log('📦 Content-Type:', req.headers['content-type']);

  // TEMPORARY: Try to parse event without signature verification for debugging
  let rawEvent;
  try {
    rawEvent = JSON.parse(req.body.toString());
    console.log('📋 Raw event type:', rawEvent.type);
    console.log('📋 Raw event ID:', rawEvent.id);
  } catch (parseErr) {
    console.error('❌ Failed to parse raw event:', parseErr.message);
  }

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Webhook signature verified successfully');
    console.log('📋 Event type:', event.type);
    console.log('📋 Event ID:', event.id);
  } catch (err) {
    console.error('❌ Webhook signature verification failed');
    console.error('❌ Error message:', err.message);
    console.error('❌ Error type:', err.type || 'unknown');
    console.error('❌ Signature header received:', sig);
    console.error('❌ Expected endpoint secret starts with:', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 8) || 'Not set');
    
    // TEMPORARY: Process the event anyway for debugging (REMOVE IN PRODUCTION!)
    if (rawEvent) {
      console.log('🚨 TEMPORARY: Processing event without signature verification for debugging');
      event = rawEvent;
    } else {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  // Helper function to update user subscription in Firebase
  const updateUserSubscription = async (customerId, updates, subscriptionMetadata = null) => {
    console.log('🔄 Updating user subscription:', {
      customerId,
      updates,
      metadata: subscriptionMetadata
    });
    
    try {
      const usersRef = admin.firestore().collection('users');
      let snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();
      
      // If no user found by customer ID, try to find by Firebase UID in metadata
      if (snapshot.empty && subscriptionMetadata && subscriptionMetadata.uid) {
        console.log('📝 No user found by stripeCustomerId, searching by UID:', subscriptionMetadata.uid);
        console.log('No user found by Stripe customer ID, trying Firebase UID:', subscriptionMetadata.uid);
        const userDoc = await usersRef.doc(subscriptionMetadata.uid).get();
        if (userDoc.exists()) {
          // Update this user and also save the Stripe customer ID
          await userDoc.ref.update({
            ...updates,
            stripeCustomerId: customerId, // Link the Stripe customer ID
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('User updated by Firebase UID and linked to Stripe customer:', subscriptionMetadata.uid);
          console.log('Updates applied:', updates);
          return;
        }
      }
      
      if (!snapshot.empty) {
        const updatePromises = [];
        snapshot.forEach((doc) => {
          console.log('Updating user document:', doc.id);
          updatePromises.push(doc.ref.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }));
        });
        await Promise.all(updatePromises);
        console.log('User(s) updated successfully:', updates);
      } else {
        console.error('ERROR: No user found for customer:', customerId);
        console.log('Available metadata:', subscriptionMetadata);
      }
    } catch (err) {
      console.error('Error updating user subscription:', err);
    }
  };

  // Helper function to determine plan type from price ID
  const getPlanFromPriceId = (priceId) => {
    console.log('Determining plan from price ID:', priceId);
    console.log('Available price IDs:', {
      VITE_STRIPE_PRO_PRICE_ID: process.env.VITE_STRIPE_PRO_PRICE_ID,
      VITE_STRIPE_ALL_ACCESS_PRICE_ID: process.env.VITE_STRIPE_ALL_ACCESS_PRICE_ID
    });
    
    if (priceId === process.env.VITE_STRIPE_PRO_PRICE_ID) {
      console.log('Matched PRO plan');
      return 'pro';
    }
    if (priceId === process.env.VITE_STRIPE_ALL_ACCESS_PRICE_ID) {
      console.log('Matched ALL-ACCESS plan');
      return 'all-access';
    }
    console.log('No match found, defaulting to basic plan');
    return 'basic';
  };

  // Handle different webhook events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('🎉 Checkout session completed:', {
        sessionId: session.id,
        customerId: session.customer,
        subscriptionId: session.subscription,
        mode: session.mode,
        metadata: session.metadata,
        uid: session.metadata?.uid,
        planType: session.metadata?.planType
      });

      // For subscription mode, just link the customer ID and plan
      // The detailed subscription info will be handled in customer.subscription.created
      if (session.mode === 'subscription' && session.metadata?.uid) {
        try {
          const userRef = admin.firestore().collection('users').doc(session.metadata.uid);
          const planType = session.metadata?.planType || 'pro';
          
          await userRef.set({
            stripeCustomerId: session.customer,
            plan: planType,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          
          console.log(`✅ Updated user ${session.metadata.uid} with customer ID ${session.customer} and plan ${planType}`);
        } catch (error) {
          console.error('❌ Error updating user in checkout.session.completed:', error);
          throw error; // Re-throw to trigger webhook retry
        }
      } else if (!session.metadata?.uid) {
        console.error('❌ No UID found in session metadata for checkout.session.completed');
        throw new Error('UID is required in session metadata');
      }
      
      console.log('Checkout session completed - subscription details will be handled by subscription.created event');
      break;
    }

    case 'customer.subscription.created':
      const createdSub = event.data.object;
      const uid = createdSub.metadata?.uid; // Ensure metadata.uid is set in Stripe
      const stripeSubscriptionId = createdSub.id;

      console.log('🎉 New subscription created:', {
        subscriptionId: createdSub.id,
        customerId: createdSub.customer,
        priceId: createdSub.items.data[0].price.id,
        status: createdSub.status,
        metadata: createdSub.metadata,
        uid: uid
      });

      if (!uid) {
        console.error('⚠️  UID is missing in subscription metadata.');
        throw new Error('UID is required in metadata');
      }

      try {
        const userDocRef = admin.firestore().collection('users').doc(uid);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
          console.error(`⚠️  User with UID ${uid} not found in Firestore.`);
          throw new Error('User not found');
        }

        const planType = getPlanFromPriceId(createdSub.items.data[0].price.id);
        console.log('� Plan type determined:', planType);

        await userDocRef.update({
          stripeSubscriptionId,
          subscriptionStatus: createdSub.status,
          plan: planType,
          priceId: createdSub.items.data[0].price.id,
          trialEnd: createdSub.trial_end ? new Date(createdSub.trial_end * 1000) : null,
          currentPeriodEnd: new Date(createdSub.current_period_end * 1000),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Updated Firestore for user ${uid} with subscription ID ${stripeSubscriptionId}`);
      } catch (error) {
        console.error('❌ Error updating Firestore:', error);
        throw error; // Re-throw to trigger webhook retry
      }
      break;

    case 'customer.subscription.updated':
      const updatedSub = event.data.object;
      await updateUserSubscription(updatedSub.customer, {
        subscriptionStatus: updatedSub.status,
        plan: updatedSub.cancel_at_period_end ? 'basic' : getPlanFromPriceId(updatedSub.items.data[0].price.id),
        currentPeriodEnd: new Date(updatedSub.current_period_end * 1000),
        cancelAtPeriodEnd: updatedSub.cancel_at_period_end
      });
      break;

    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      await updateUserSubscription(deletedSub.customer, {
        subscriptionId: admin.firestore.FieldValue.delete(),
        subscriptionStatus: admin.firestore.FieldValue.delete(),
        plan: 'basic',
        priceId: admin.firestore.FieldValue.delete(),
        trialEnd: admin.firestore.FieldValue.delete(),
        currentPeriodEnd: admin.firestore.FieldValue.delete(),
        cancelAtPeriodEnd: admin.firestore.FieldValue.delete()
      });
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      if (invoice.subscription) {
        await updateUserSubscription(invoice.customer, {
          subscriptionStatus: 'active',
          lastPaymentDate: new Date(invoice.created * 1000)
        });
      }
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      if (failedInvoice.subscription) {
        await updateUserSubscription(failedInvoice.customer, {
          subscriptionStatus: 'past_due',
          lastFailedPayment: new Date(failedInvoice.created * 1000)
        });
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

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
        console.log(`✅ stripeCustomerId saved to Firestore for uid: ${uid}`);
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
    console.log(`✅ subscriptionId saved to Firestore for uid: ${uid}`);

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
    console.error(`❌ Error saving subscriptionId to Firestore for uid: ${uid}`, firestoreErr);
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

// Send welcome email endpoint (disabled - using Formspree instead)
app.post('/api/send-welcome-email', async (req, res) => {
  console.log('Welcome email endpoint called (disabled):', req.body);
  
  const { email, username, plan = 'basic' } = req.body;
  
  if (!email) {
    console.log('Missing email in request');
    return res.status(400).json({ error: 'Email is required' });
  }

  console.log('Email sending disabled - using Formspree for contact forms only');
  
  // Return success without sending email
  res.status(200).json({ 
    success: true, 
    message: 'Email sending disabled - using Formspree for contact forms',
    note: 'Welcome emails can be handled client-side or through other means'
  });
});

app.post('/api/send-beta-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  console.log('Beta code request for:', email, '(email sending disabled)');
  
  // Return success without sending email since we're using Formspree
  res.status(200).json({ 
    message: 'Email sending disabled - using Formspree for contact forms',
    note: 'Beta codes can be handled through other means'
  });
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

// Create a checkout session endpoint
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, planType, uid } = req.body;
    
    console.log('Creating checkout session for plan:', planType, 'priceId:', priceId, 'uid:', uid);

    // If we have a uid, get user email from Firebase and create/find Stripe customer
    let customer = null;
    if (uid) {
      try {
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const email = userData.email;
          
          // Check if user already has a Stripe customer ID
          if (userData.stripeCustomerId) {
            console.log('Using existing Stripe customer:', userData.stripeCustomerId);
            customer = userData.stripeCustomerId;
          } else if (email) {
            // Create new Stripe customer
            console.log('Creating new Stripe customer for email:', email);
            const newCustomer = await stripe.customers.create({
              email: email,
              metadata: {
                firebaseUid: uid,
                username: userData.username || userData.ownerName || ''
              }
            });
            customer = newCustomer.id;
            
            // Save customer ID back to Firebase
            await admin.firestore().collection('users').doc(uid).set(
              { stripeCustomerId: customer },
              { merge: true }
            );
            console.log('Saved Stripe customer ID to Firebase:', customer);
          }
        }
      } catch (firebaseError) {
        console.error('Error getting user from Firebase:', firebaseError);
      }
    }

    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: priceId, // Your Stripe price ID
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          planType: planType,
          uid: uid || '',
        }
      },
      metadata: {
        planType: planType,
        uid: uid || '',
      },
      success_url: `${process.env.CLIENT_URL || 'https://grubana.com'}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'https://grubana.com'}/pricing`,
      allow_promotion_codes: true,
    };

    // If we have a customer, add it to the session
    if (customer) {
      sessionConfig.customer = customer;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('Checkout session created:', session.id);
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get session details endpoint
app.post('/session-details', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    res.json({
      sessionId: session.id,
      planType: session.metadata?.planType || 'all-access',
      subscriptionId: session.subscription?.id,
      customerId: session.customer
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(400).json({ error: error.message });
  }
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

