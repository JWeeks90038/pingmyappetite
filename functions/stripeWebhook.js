import { onRequest } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import Stripe from "stripe";
import * as admin from "firebase-admin";

export const stripeWebhook = onRequest({
  region: "us-central1",
}, async (req, res) => {
  // Initialize Stripe
  const stripe = new Stripe(functions.config().stripe.secret_key, {
    apiVersion: "2024-06-20",
  });

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, functions.config().stripe.endpoint_secret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  console.log("Received Stripe webhook event:", event.type);

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
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: error.message });
  }
});

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log("Payment succeeded:", paymentIntent.id);
  
  const userId = paymentIntent.metadata.firebaseUserId;
  if (!userId) {
    console.error("No Firebase user ID in payment intent metadata");
    return;
  }

  try {
    // Update user subscription status
    await admin.firestore().collection("users").doc(userId).update({
      subscriptionStatus: "active",
      paymentCompleted: true,
      subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
      stripePaymentIntentId: paymentIntent.id,
      plan: paymentIntent.metadata.planType,
    });

    // Update referral if applicable
    if (paymentIntent.metadata.discountApplied === "true") {
      const referralQuery = await admin.firestore()
        .collection("referrals")
        .where("userId", "==", userId)
        .get();

      if (!referralQuery.empty) {
        const referralDoc = referralQuery.docs[0];
        await referralDoc.ref.update({
          paymentCompleted: true,
          paymentCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
          stripePaymentIntentId: paymentIntent.id,
        });
      }
    }

    console.log(`Successfully activated subscription for user: ${userId}`);
  } catch (error) {
    console.error("Error updating user after payment success:", error);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log("Payment failed:", paymentIntent.id);
  
  const userId = paymentIntent.metadata.firebaseUserId;
  if (!userId) {
    console.error("No Firebase user ID in payment intent metadata");
    return;
  }

  try {
    // Update user to reflect payment failure
    await admin.firestore().collection("users").doc(userId).update({
      subscriptionStatus: "payment_failed",
      lastPaymentAttempt: admin.firestore.FieldValue.serverTimestamp(),
      stripePaymentIntentId: paymentIntent.id,
    });

    console.log(`Payment failed for user: ${userId}`);
  } catch (error) {
    console.error("Error updating user after payment failure:", error);
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log("Subscription created:", subscription.id);
  // Handle subscription creation if using recurring billing
}

async function handleSubscriptionUpdated(subscription) {
  console.log("Subscription updated:", subscription.id);
  // Handle subscription updates if using recurring billing
}

async function handleSubscriptionDeleted(subscription) {
  console.log("Subscription deleted:", subscription.id);
  // Handle subscription cancellation if using recurring billing
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log("Invoice payment succeeded:", invoice.id);
  // Handle recurring payment success if using subscriptions
}

async function handleInvoicePaymentFailed(invoice) {
  console.log("Invoice payment failed:", invoice.id);
  // Handle recurring payment failure if using subscriptions
}
