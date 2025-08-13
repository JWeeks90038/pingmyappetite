import { https } from "firebase-functions/v2";
import admin from "firebase-admin";
import Stripe from "stripe";
import { defineString } from "firebase-functions/params";

// Initialize Firebase Admin if not already initialized
try {
  admin.initializeApp();
} catch (error) {
  // App already initialized
}

// Define params
const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const endpointSecret = defineString("STRIPE_WEBHOOK_SECRET");

export const stripeWebhook = https.onRequest(
  { secrets: [stripeSecretKey, endpointSecret] },
  async (req, res) => {
  // Initialize Stripe with the secret key
  const stripe = new Stripe(stripeSecretKey.value());
  const sig = req.headers["stripe-signature"];

  console.log("Webhook received with signature:", sig);
  console.log("Endpoint secret configured:", !!endpointSecret.value());

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      endpointSecret.value(),
    );
    console.log("Webhook event constructed successfully:", event.type);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("Processing webhook event:", event.type);

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.created"
  ) {
    console.log("Handling subscription event:", event.type);
    const subscription = event.data.object;
    console.log("Subscription data:", {
      id: subscription.id,
      customer: subscription.customer,
      status: subscription.status,
      metadata: subscription.metadata,
    });

    const subscriptionId = subscription.id;
    const stripeCustomerId = subscription.customer;
    const subscriptionStatus = subscription.status;
    // Determine plan type from price ID
    let plan = 'basic';
    const priceId = subscription.items.data[0].price.id;
    if (priceId === process.env.VITE_STRIPE_PRO_PRICE_ID) {
      plan = 'pro';
    } else if (priceId === process.env.VITE_STRIPE_ALL_ACCESS_PRICE_ID) {
      plan = 'all-access';
    }
    console.log('Determined plan from price ID:', { priceId, plan });
    const uidFromMetadata = subscription.metadata?.uid;

    console.log("Extracted subscription details:", {
      subscriptionId,
      stripeCustomerId,
      subscriptionStatus,
      plan,
      uidFromMetadata,
    });

    let userDocRef = null;

    // Option 1: Match by metadata.uid (best if you set this in Checkout)
    if (uidFromMetadata) {
      userDocRef = admin.firestore().collection("users").doc(uidFromMetadata);
    } else {
      // Option 2: Match by stripeCustomerId
      const snapshot = await admin.firestore().collection("users")
        .where("stripeCustomerId", "==", stripeCustomerId)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        userDocRef = snapshot.docs[0].ref;
      }
    }

    if (userDocRef) {
      console.log("Found user document to update:", userDocRef.id);
      try {
        const updateData = {
          stripeCustomerId: String(stripeCustomerId),
          stripeSubscriptionId: String(subscriptionId),
          subscriptionStatus: String(subscriptionStatus),
          plan: String(plan),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        console.log("Updating user document with data:", updateData);
        
        await userDocRef.update(updateData);
        const successMsg = 
        `Successfully updated user ${userDocRef.id} with subscription ${subscriptionId}`;
        console.log(successMsg);
      } catch (error) {
        console.error("Error updating user document:", error);
        throw error; // Re-throw to trigger webhook retry
      }
    } else {
      const errorMsg = 
        `No matching user found for customer ${stripeCustomerId} with uid ${uidFromMetadata}`;
      console.error(errorMsg);
      throw new Error("No matching user found"); // Trigger webhook retry
    }
  }

  res.status(200).send("Success");
});
