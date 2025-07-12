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
    sendgridConfigured: !!process.env.SENDGRID_API_KEY,
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Grubana API Server', status: 'running' });
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

  // Helper function to update user subscription in Firebase
  const updateUserSubscription = async (customerId, updates) => {
    try {
      const usersRef = admin.firestore().collection('users');
      const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();
      
      if (!snapshot.empty) {
        const updatePromises = [];
        snapshot.forEach((doc) => {
          updatePromises.push(doc.ref.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }));
        });
        await Promise.all(updatePromises);
        console.log('User(s) updated:', updates);
      } else {
        console.log('No user found for customer:', customerId);
      }
    } catch (err) {
      console.error('Error updating user subscription:', err);
    }
  };

  // Helper function to determine plan type from price ID
  const getPlanFromPriceId = (priceId) => {
    if (priceId === process.env.VITE_STRIPE_PRO_PRICE_ID) return 'pro';
    if (priceId === process.env.VITE_STRIPE_ALL_ACCESS_PRICE_ID) return 'all-access';
    return 'basic';
  };

  // Handle different webhook events
  switch (event.type) {
    case 'customer.subscription.created':
      const createdSub = event.data.object;
      const planType = getPlanFromPriceId(createdSub.items.data[0].price.id);
      
      await updateUserSubscription(createdSub.customer, {
        subscriptionId: createdSub.id,
        subscriptionStatus: createdSub.status,
        plan: planType,
        priceId: createdSub.items.data[0].price.id,
        trialEnd: createdSub.trial_end ? new Date(createdSub.trial_end * 1000) : null,
        currentPeriodEnd: new Date(createdSub.current_period_end * 1000)
      });

      // Send welcome email for paid plans
      if (planType !== 'basic') {
        try {
          const customer = await stripe.customers.retrieve(createdSub.customer);
          if (customer.email) {
            // Get user data from Firestore to get username
            const usersRef = admin.firestore().collection('users');
            const snapshot = await usersRef.where('stripeCustomerId', '==', createdSub.customer).get();
            let username = '';
            
            if (!snapshot.empty) {
              const userData = snapshot.docs[0].data();
              username = userData.username || userData.ownerName || '';
            }

            // Send welcome email via internal API call
            const welcomeEmailData = {
              email: customer.email,
              username: username,
              plan: planType
            };

            // Use the sendgrid mail directly since we're in the same server
            const planMessages = {
              pro: {
                subject: '🎉 Welcome to Grubana Pro!',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #28a745;">Welcome to Grubana Pro${username ? `, ${username}` : ''}! 🚚💚</h1>
                    <p>Congratulations! You've unlocked the power of real-time food truck tracking with your Pro plan.</p>
                    
                    <h2 style="color: #28a745;">Your Pro Plan Includes:</h2>
                    <ul>
                      <li>✅ Everything in Basic</li>
                      <li>✅ Real-time GPS location tracking</li>
                      <li>✅ Real-time menu display on map icon</li>
                      <li>✅ Access to citywide heat maps</li>
                      <li>✅ Basic engagement metrics</li>
                    </ul>
                    
                    <p>Your 30-day free trial has started! Access your dashboard: <a href="https://grubana.com/dashboard">https://grubana.com/dashboard</a></p>
                    
                    <p>Happy food trucking!<br/>The Grubana Team</p>
                  </div>
                `
              },
              'all-access': {
                subject: '🎉 Welcome to Grubana All Access!',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #007bff;">Welcome to Grubana All Access${username ? `, ${username}` : ''}! 🚚🚀</h1>
                    <p>Congratulations! You now have access to ALL of Grubana's premium features!</p>
                    
                    <h2 style="color: #007bff;">Your All Access Plan Includes:</h2>
                    <ul>
                      <li>✅ Everything in Basic & Pro</li>
                      <li>✅ Advanced 30-day analytics dashboard</li>
                      <li>✅ Create promotional drops and deals</li>
                      <li>✅ Featured placement in search results</li>
                      <li>✅ Priority customer support</li>
                    </ul>
                    
                    <p>Your 30-day free trial has started! Access your dashboard: <a href="https://grubana.com/dashboard">https://grubana.com/dashboard</a></p>
                    
                    <p>Happy food trucking!<br/>The Grubana Team</p>
                  </div>
                `
              }
            };

            const messageContent = planMessages[planType];
            if (messageContent) {
              await sgMail.send({
                to: customer.email,
                from: 'grubana.co@gmail.com',
                subject: messageContent.subject,
                html: messageContent.html,
              });
              console.log(`Welcome email sent to ${customer.email} for ${planType} plan`);
            }
          }
        } catch (emailErr) {
          console.error('Error sending welcome email from webhook:', emailErr);
          // Don't fail the webhook if email fails
        }
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

// Send welcome email endpoint
app.post('/api/send-welcome-email', async (req, res) => {
  console.log('Welcome email endpoint called with:', req.body);
  
  const { email, username, plan = 'basic' } = req.body;
  
  if (!email) {
    console.log('Missing email in request');
    return res.status(400).json({ error: 'Email is required' });
  }

  console.log('SendGrid API Key configured:', !!process.env.SENDGRID_API_KEY);
  console.log('Attempting to send welcome email to:', email, 'for plan:', plan);

  const planMessages = {
    basic: {
      subject: '🎉 Welcome to Grubana!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2c6f57;">Welcome to Grubana${username ? `, ${username}` : ''}! 🚚</h1>
          <p>Thank you for joining the Grubana community! You're now part of the ultimate food truck discovery platform.</p>
          
          <h2 style="color: #2c6f57;">Your Basic Plan Includes:</h2>
          <ul>
            <li>✅ Appear on the Grubana discovery map</li>
            <li>✅ View demand pins from hungry customers</li>
            <li>✅ Access to your truck dashboard</li>
            <li>✅ Manual location updates</li>
          </ul>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c6f57;">🚀 Ready to Upgrade?</h3>
            <p>Unlock real-time GPS tracking, menu display, analytics, and promotional drops!</p>
            <a href="https://grubana.com/pricing" style="background: #2c6f57; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Pricing Plans</a>
          </div>
          
          <p>Get started by logging into your dashboard: <a href="https://grubana.com/login">https://grubana.com/login</a></p>
          
          <p>Happy food trucking!<br/>The Grubana Team</p>
        </div>
      `
    },
    pro: {
      subject: '🎉 Welcome to Grubana Pro!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #28a745;">Welcome to Grubana Pro${username ? `, ${username}` : ''}! 🚚💚</h1>
          <p>Congratulations! You've unlocked the power of real-time food truck tracking with your Pro plan.</p>
          
          <h2 style="color: #28a745;">Your Pro Plan Includes:</h2>
          <ul>
            <li>✅ Everything in Basic</li>
            <li>✅ Real-time GPS location tracking</li>
            <li>✅ Real-time menu display on map icon</li>
            <li>✅ Access to citywide heat maps</li>
            <li>✅ Basic engagement metrics</li>
          </ul>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #28a745;">🎯 Want Even More?</h3>
            <p>Upgrade to All Access for advanced analytics and promotional drops!</p>
            <a href="https://grubana.com/pricing" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Upgrade to All Access</a>
          </div>
          
          <p>Your 30-day free trial has started! Access your dashboard: <a href="https://grubana.com/dashboard">https://grubana.com/dashboard</a></p>
          
          <p>Happy food trucking!<br/>The Grubana Team</p>
        </div>
      `
    },
    'all-access': {
      subject: '🎉 Welcome to Grubana All Access!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #007bff;">Welcome to Grubana All Access${username ? `, ${username}` : ''}! 🚚🚀</h1>
          <p>Congratulations! You now have access to ALL of Grubana's premium features!</p>
          
          <h2 style="color: #007bff;">Your All Access Plan Includes:</h2>
          <ul>
            <li>✅ Everything in Basic & Pro</li>
            <li>✅ Advanced 30-day analytics dashboard</li>
            <li>✅ Create promotional drops and deals</li>
            <li>✅ Featured placement in search results</li>
            <li>✅ Priority customer support</li>
            <li>✅ Custom branding options</li>
          </ul>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #007bff;">🎯 Pro Tips to Maximize Your Success:</h3>
            <ul>
              <li>Create promotional drops to attract customers</li>
              <li>Monitor your analytics to find peak demand times</li>
              <li>Use the heat map to find the best locations</li>
              <li>Keep your menu photos updated for maximum appeal</li>
            </ul>
          </div>
          
          <p>Your 30-day free trial has started! Access your dashboard: <a href="https://grubana.com/dashboard">https://grubana.com/dashboard</a></p>
          
          <p>Need help getting started? Contact us at grubana.co@gmail.com</p>
          
          <p>Happy food trucking!<br/>The Grubana Team</p>
        </div>
      `
    }
  };

  const messageContent = planMessages[plan] || planMessages.basic;

  try {
    const messageContent = planMessages[plan] || planMessages.basic;
    
    console.log('Sending email with subject:', messageContent.subject);
    
    const mailOptions = {
      to: email,
      from: 'grubana.co@gmail.com',
      subject: messageContent.subject,
      html: messageContent.html,
    };
    
    console.log('Mail options configured, attempting to send...');
    await sgMail.send(mailOptions);
    
    console.log(`Welcome email sent successfully to ${email} for ${plan} plan`);
    res.status(200).json({ success: true, message: 'Welcome email sent successfully' });
  } catch (err) {
    console.error('Error sending welcome email:', err);
    console.error('Error details:', err.response?.body || err.message);
    res.status(500).json({ 
      error: 'Failed to send welcome email', 
      details: err.message,
      sendgridConfigured: !!process.env.SENDGRID_API_KEY
    });
  }
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

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  
  console.log('Contact form submission:', { name, email, message: message?.length });
  console.log('SendGrid API Key configured:', !!process.env.SENDGRID_API_KEY);
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }
  
  try {
    await sgMail.send({
      to: 'grubana.co@gmail.com', // Your support email
      from: 'grubana.co@gmail.com', // Must be a verified sender in SendGrid
      subject: `Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `<p><strong>Name:</strong> ${name}<br/><strong>Email:</strong> ${email}</p><p>${message}</p>`,
    });
    console.log('Contact email sent successfully');
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Contact form email error:", err);
    console.error("Error details:", err.response?.body || err.message);
    res.status(500).json({ 
      error: "Failed to send message",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Create a checkout session endpoint
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, planType, uid } = req.body;
    
    console.log('Creating checkout session for plan:', planType, 'priceId:', priceId);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: priceId, // Your Stripe price ID
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 30, // 30-day trial
        metadata: {
          planType: planType,
          uid: uid || '',
        }
      },
      metadata: {
        planType: planType,
        uid: uid || '',
      },
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/pricing`,
      allow_promotion_codes: true,
    });

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

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Stripe server running on port ${PORT}`));

// Test endpoint for SendGrid without full contact form logic
app.post('/test-email', async (req, res) => {
  console.log('Test email endpoint called');
  
  if (!process.env.SENDGRID_API_KEY) {
    return res.status(500).json({ error: 'SendGrid not configured' });
  }
  
  try {
    console.log('Attempting to send test email...');
    
    const result = await sgMail.send({
      to: 'grubana.co@gmail.com',
      from: 'grubana.co@gmail.com',
      subject: 'Test Email from Server',
      text: 'This is a test email to verify SendGrid is working.',
      html: '<p>This is a test email to verify SendGrid is working.</p>',
    });
    
    console.log('Email sent successfully:', result);
    res.status(200).json({ success: true, message: 'Test email sent' });
  } catch (err) {
    console.error('Test email error:', err);
    res.status(500).json({ 
      error: 'Test email failed', 
      details: err.message,
      code: err.code
    });
  }
});