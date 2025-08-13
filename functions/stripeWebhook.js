const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")(functions.config().stripe.secret_key);

admin.initializeApp();

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = functions.config().stripe.endpoint_secret;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      endpointSecret,
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.created"
  ) {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;
    const stripeCustomerId = subscription.customer;
    const subscriptionStatus = subscription.status;
    const plan = subscription.items.data[0].plan.nickname || subscription.metadata.planType;
    const uidFromMetadata = subscription.metadata?.uid;

    let userDocRef = null;

    // Option 1: Match by metadata.uid (best if you set this in Checkout)
    if (uidFromMetadata) {
      userDocRef = admin.firestore().collection("users").doc(uidFromMetadata);
    }
    // Option 2: Match by stripeCustomerId
    else {
      const snapshot = await admin.firestore().collection("users")
        .where("stripeCustomerId", "==", stripeCustomerId)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        userDocRef = snapshot.docs[0].ref;
      }
    }

    if (userDocRef) {
      await userDocRef.update({
        stripeCustomerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus,
        plan
      });
      console.log(`Updated user with subscription ${subscriptionId}`);
    } else {
      console.error(`No matching user found for customer ${stripeCustomerId}`);
    }
  }

  res.status(200).send("Success");
});
