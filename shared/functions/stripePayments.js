import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// CORS headers for mobile app
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const createPaymentIntent = onRequest({
  region: "us-central1",
  cors: true
}, async (req, res) => {
  // Initialize Stripe with the secret from environment
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.set(corsHeaders);
    res.status(200).send("");
    return;
  }

  if (req.method !== "POST") {
    res.set(corsHeaders);
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const {
      amount,
      currency = "usd",
      planType,
      userId,
      userEmail,
      hasValidReferral,
      referralCode
    } = req.body;

    if (!amount || !planType || !userId) {
      res.set(corsHeaders);
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Get or create Stripe customer
    let customer;
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (userData && userData.stripeCustomerId) {
      // Existing customer
      customer = await stripe.customers.retrieve(userData.stripeCustomerId);
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          firebaseUserId: userId,
          planType: planType,
          hasValidReferral: hasValidReferral ? "true" : "false",
          referralCode: referralCode || "",
        },
      });

      // Update user document with Stripe customer ID (only if user exists)
      if (userData) {
        await db.collection("users").doc(userId).update({
          stripeCustomerId: customer.id,
        });
      }
    }

    // Apply discount or trial for valid referral
    let finalAmount = amount;
    let hasFreeTrial = false;
    
    if (hasValidReferral && referralCode?.toLowerCase() === "arayaki_hibachi") {
      // 30-day free trial - use Setup Intent instead of Payment Intent
      hasFreeTrial = true;
    }

    if (hasFreeTrial) {
      // For free trials, create a Setup Intent to save payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        usage: 'off_session',
        payment_method_types: ['card'],
        metadata: {
          firebaseUserId: userId,
          planType: planType,
          hasFreeTrial: "true",
          referralCode: referralCode || "",
          originalAmount: amount.toString(),
        },
      });

      // Use your existing Stripe price IDs - NO product creation
      const predefinedPriceIds = {
        'event-premium': 'price_1S3eeTRsRfaVTYCjli5ZRMVY', // Your actual Event Premium price ID
        'pro': 'price_1S2yLyRsRfaVTYCjdOaclNNR',        // Your actual Pro price ID
        'all-access': 'price_1S2yTYRsRfaVTYCjjkK7fUZS' // Your actual All-Access price ID
      };

      // Get the price ID for this plan type
      const priceId = predefinedPriceIds[planType];
      
      if (!priceId) {
        throw new Error(`No price ID configured for plan type: ${planType}`);
      }

      console.log(`Using existing Stripe price ID: ${priceId} for plan: ${planType}`);

      // Create subscription with trial period using existing price
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        trial_period_days: 30,
        metadata: {
          firebaseUserId: userId,
          planType: planType,
          referralCode: referralCode || "",
        },
      });

      // Update user document with subscription info
      await db.collection("users").doc(userId).update({
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: 'trialing',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });

      res.set(corsHeaders);
      res.status(200).json({
        clientSecret: setupIntent.client_secret,
        customerId: customer.id,
        amount: 0,
        originalAmount: amount,
        discountApplied: hasValidReferral,
        hasFreeTrial: true,
        subscriptionId: subscription.id,
        isSetupIntent: true, // Flag to indicate this is a setup intent, not payment intent
      });
    } else {
      // Regular payment intent for non-trial users
      const paymentIntent = await stripe.paymentIntents.create({
        amount: finalAmount,
        currency: currency,
        customer: customer.id,
        metadata: {
          firebaseUserId: userId,
          planType: planType,
          hasFreeTrial: "false",
          referralCode: referralCode || "",
          originalAmount: amount.toString(),
        },
        description: `Grubana ${planType} plan subscription`,
      });

      res.set(corsHeaders);
      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id,
        amount: finalAmount,
        originalAmount: amount,
        discountApplied: hasValidReferral,
        hasFreeTrial: false,
        isSetupIntent: false,
      });
    }

  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.set(corsHeaders);
    res.status(500).json({ error: error.message });
  }
});

export const handleSubscriptionUpdate = onRequest({
  region: "us-central1",
  cors: true
}, async (req, res) => {
  // Initialize Stripe with the secret from environment
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.set(corsHeaders);
    res.status(200).send("");
    return;
  }

  if (req.method !== "POST") {
    res.set(corsHeaders);
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const { userId, paymentIntentId } = req.body;

    if (!userId || !paymentIntentId) {
      res.set(corsHeaders);
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Verify payment intent status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // Get user data to find their Stripe customer ID
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();
      
      if (!userData || !userData.stripeCustomerId) {
        res.set(corsHeaders);
        res.status(400).json({ error: "User or Stripe customer not found" });
        return;
      }

      // Use your existing Stripe price IDs - NO product creation
      const predefinedPriceIds = {
        'event-premium': 'price_1S3eeTRsRfaVTYCjli5ZRMVY', // Your actual Event Premium price ID
        'pro': 'price_1S2yLyRsRfaVTYCjdOaclNNR',        // Your actual Pro price ID
        'all-access': 'price_1S2yTYRsRfaVTYCjjkK7fUZS' // Your actual All-Access price ID
      };

      const planType = paymentIntent.metadata.planType;
      const priceId = predefinedPriceIds[planType];
      
      if (!priceId) {
        throw new Error(`No price ID configured for plan type: ${planType}`);
      }

      console.log(`Creating subscription with existing price ID: ${priceId} for plan: ${planType}`);

      // Create subscription using existing price
      const subscription = await stripe.subscriptions.create({
        customer: userData.stripeCustomerId,
        items: [{ price: priceId }],
        metadata: {
          firebaseUserId: userId,
          planType: planType,
          paymentIntentId: paymentIntentId,
        },
      });

      console.log(`Subscription created: ${subscription.id}`);

      // Update user subscription status in Firestore
      await db.collection("users").doc(userId).update({
        subscriptionStatus: "active",
        paymentCompleted: true,
        subscriptionStartDate: FieldValue.serverTimestamp(),
        stripePaymentIntentId: paymentIntentId,
        stripeSubscriptionId: subscription.id,
        plan: planType,
      });

      // If referral was used, update referral document
      if (paymentIntent.metadata.discountApplied === "true") {
        const referralQuery = await db
          .collection("referrals")
          .where("userId", "==", userId)
          .get();

        if (!referralQuery.empty) {
          const referralDoc = referralQuery.docs[0];
          await referralDoc.ref.update({
            paymentCompleted: true,
            paymentCompletedAt: FieldValue.serverTimestamp(),
            stripePaymentIntentId: paymentIntentId,
          });
        }
      }

      res.set(corsHeaders);
      res.status(200).json({ success: true, message: "Subscription activated" });
    } else {
      res.set(corsHeaders);
      res.status(400).json({ error: "Payment not completed" });
    }

  } catch (error) {
    console.error("Error updating subscription:", error);
    res.set(corsHeaders);
    res.status(500).json({ error: error.message });
  }
});
