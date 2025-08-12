const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")(functions.config().stripe.secret);

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
    const stripeCustomerId = subscription.customer;
    const subscriptionStatus = subscription.status;
    const plan = subscription.items.data[0].plan.nickname;
    // Assuming plan nickname is 'pro' or 'all-access'

    // Find the user in Firestore by stripeCustomerId
    const usersRef = admin.firestore().collection("users");
    const snapshot = await usersRef
      .where("stripeCustomerId", "==", stripeCustomerId)
      .get();

    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        doc.ref.update({
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscriptionStatus,
          plan: plan,
        });
      });
    }
  }

  res.status(200).send("Success");
});
