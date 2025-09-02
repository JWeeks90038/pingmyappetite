import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin (if not already initialized)
try {
  initializeApp();
} catch (error) {
  // App already initialized
}

const db = getFirestore();

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const createCustomerPortalSession = onRequest(async (req, res) => {
  // Initialize Stripe with secret key
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.set(corsHeaders);
    res.status(200).send();
    return;
  }

  try {
    const { userId, returnUrl } = req.body;

    if (!userId) {
      res.set(corsHeaders);
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    // Get user data to find Stripe customer ID
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData || !userData.stripeCustomerId) {
      res.set(corsHeaders);
      res.status(400).json({ error: "No Stripe customer found for this user" });
      return;
    }

    // Create Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: returnUrl || 'grubana://profile', // Deep link back to app
    });

    res.set(corsHeaders);
    res.status(200).json({
      url: session.url,
    });

  } catch (error) {
    console.error("Error creating customer portal session:", error);
    res.set(corsHeaders);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { createCustomerPortalSession };