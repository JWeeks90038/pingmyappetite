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

    // Apply discount for valid referral
    let finalAmount = amount;
    if (hasValidReferral && referralCode?.toLowerCase() === "arayaki_hibachi") {
      finalAmount = Math.round(amount * 0.8); // 20% discount
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: currency,
      customer: customer.id,
      metadata: {
        firebaseUserId: userId,
        planType: planType,
        originalAmount: amount.toString(),
        discountApplied: hasValidReferral ? "true" : "false",
        referralCode: referralCode || "",
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
    });

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
      // Update user subscription status in Firestore
      await db.collection("users").doc(userId).update({
        subscriptionStatus: "active",
        paymentCompleted: true,
        subscriptionStartDate: FieldValue.serverTimestamp(),
        stripePaymentIntentId: paymentIntentId,
        plan: paymentIntent.metadata.planType,
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
