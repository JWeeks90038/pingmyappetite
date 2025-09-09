import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const stripeWebhook = onRequest({
  region: "us-central1",
}, async (req, res) => {
  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_ENDPOINT_SECRET);
  } catch (err) {
 
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }



  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;
      
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:

    }

    res.status(200).json({ received: true });
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

async function handlePaymentIntentSucceeded(paymentIntent) {

  
  const userId = paymentIntent.metadata.firebaseUserId;
  if (!userId) {
  
    return;
  }

  try {
    // Update user subscription status
    await db.collection("users").doc(userId).update({
      subscriptionStatus: "active",
      paymentCompleted: true,
      subscriptionStartDate: FieldValue.serverTimestamp(),
      stripePaymentIntentId: paymentIntent.id,
      plan: paymentIntent.metadata.planType,
    });

    // Update referral if applicable
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
          stripePaymentIntentId: paymentIntent.id,
        });
      }
    }

 
  } catch (error) {

  }
}

async function handlePaymentIntentFailed(paymentIntent) {

  
  const userId = paymentIntent.metadata.firebaseUserId;
  if (!userId) {

    return;
  }

  try {
    // Update user to reflect payment failure
    await db.collection("users").doc(userId).update({
      subscriptionStatus: "payment_failed",
      lastPaymentAttempt: FieldValue.serverTimestamp(),
      stripePaymentIntentId: paymentIntent.id,
    });


  } catch (error) {

  }
}

async function handleSubscriptionCreated(subscription) {

  // Handle subscription creation if using recurring billing
}

async function handleSubscriptionUpdated(subscription) {

  // Handle subscription updates if using recurring billing
}

async function handleSubscriptionDeleted(subscription) {

  // Handle subscription cancellation if using recurring billing
}

async function handleInvoicePaymentSucceeded(invoice) {

  // Handle recurring payment success if using subscriptions
}

async function handleInvoicePaymentFailed(invoice) {

  // Handle recurring payment failure if using subscriptions
}
