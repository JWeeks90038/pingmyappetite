import { onCall, HttpsError } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { firestore, FieldValue } from "./firebase.js";

// Helper function to get Stripe instance
const getStripe = () => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new HttpsError('failed-precondition', 'Stripe secret key not configured');
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2022-11-15',
  });
};

/**
 * Create Stripe Connect onboarding link for mobile kitchen owners
 */
export const createStripeConnectOnboardingLink = onCall(async (request) => {
  const { auth, data } = request;

  // Verify user is authenticated
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, email, businessName, businessType = 'company', returnUrl, refreshUrl } = data;

  try {
    const stripe = getStripe();
    
    // Check if user already has a Stripe Connect account
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();

    let accountId = userData?.stripeConnectAccountId;

    // Create new Stripe Connect account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: businessType,
        company: businessName ? {
          name: businessName,
        } : undefined,
      });

      accountId = account.id;

      // Save account ID to user document
      await firestore.collection('users').doc(userId).update({
        stripeConnectAccountId: accountId,
        stripeConnectStatus: 'pending',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || 'grubana://stripe-refresh',
      return_url: returnUrl || 'grubana://stripe-return',
      type: 'account_onboarding',
    });

    return {
      success: true,
      onboardingUrl: accountLink.url,
      accountId: accountId,
    };

  } catch (error) {

    throw new HttpsError('internal', 'Failed to create onboarding link');
  }
});

/**
 * Get Stripe Connect account status
 */
export const getStripeConnectStatus = onCall(async (request) => {
  const { auth } = request;

  // Verify user is authenticated
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const stripe = getStripe();
    
    // Get user's Stripe Connect account ID
    const userDoc = await firestore.collection('users').doc(auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.stripeConnectAccountId) {
      return {
        success: true,
        status: 'not_started',
        message: 'No Stripe Connect account found',
      };
    }

    // Retrieve account details from Stripe
    const account = await stripe.accounts.retrieve(userData.stripeConnectAccountId);

    let status = 'pending';
    let message = 'Account setup in progress';

    if (account.charges_enabled && account.payouts_enabled) {
      status = 'completed';
      message = 'Account is fully set up and ready to receive payments';
    } else if (account.requirements?.currently_due?.length > 0) {
      status = 'restricted';
      message = 'Account needs additional information';
    }

    // Update status in Firestore
    await firestore.collection('users').doc(auth.uid).update({
      stripeConnectStatus: status,
      stripeConnectAccountDetails: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currentlyDue: account.requirements?.currently_due || [],
        pastDue: account.requirements?.past_due || [],
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      status: status,
      message: message,
      accountDetails: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currentlyDue: account.requirements?.currently_due || [],
        pastDue: account.requirements?.past_due || [],
      },
    };

  } catch (error) {

    throw new HttpsError('internal', 'Failed to get account status');
  }
});

/**
 * Update Stripe Connect account status (called by webhook)
 */
export const updateStripeConnectStatus = onCall(async (request) => {
  const { auth, data } = request;

  // Verify user is authenticated
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { accountId } = data;

  try {
    const stripe = getStripe();
    
    // Find user by Stripe Connect account ID
    const usersSnapshot = await firestore
      .collection('users')
      .where('stripeConnectAccountId', '==', accountId)
      .get();

    if (usersSnapshot.empty) {
      throw new HttpsError('not-found', 'User not found for this Stripe account');
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    // Get updated account details from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    let status = 'pending';
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'completed';
    } else if (account.requirements?.currently_due?.length > 0) {
      status = 'restricted';
    }

    // Update user document
    await firestore.collection('users').doc(userId).update({
      stripeConnectStatus: status,
      stripeConnectAccountDetails: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currentlyDue: account.requirements?.currently_due || [],
        pastDue: account.requirements?.past_due || [],
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      status: status,
      userId: userId,
    };

  } catch (error) {

    throw new HttpsError('internal', 'Failed to update account status');
  }
});