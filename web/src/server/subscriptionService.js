import admin from 'firebase-admin';
import { 
  SUBSCRIPTION_PLANS, 
  getSubscriptionPlan, 
  calculateOrderPlatformFees,
  validatePlanChange 
} from './paymentConfig.js';

/**
 * SUBSCRIPTION MANAGEMENT SERVICE
 * Handles all subscription-related operations for food trucks
 */

let stripe;

export function initializeSubscriptionService(stripeInstance) {
  stripe = stripeInstance;
}

/**
 * Create subscription products and prices in Stripe (run once during setup)
 */
export async function createStripeSubscriptionProducts() {
  try {
    const results = {};
    
    for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      if (plan.price > 0) { // Skip free plans
        // Create product
        const product = await stripe.products.create({
          name: `Grubana ${plan.name} Plan`,
          description: `${plan.name} subscription plan - ${(plan.platformFeePercentage * 100).toFixed(1)}% platform fee`,
          metadata: {
            planId: plan.id,
            platformFee: plan.platformFeePercentage.toString()
          }
        });
        
        // Create price
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(plan.price * 100), // Convert to cents
          currency: 'usd',
          recurring: {
            interval: 'month'
          },
          metadata: {
            planId: plan.id
          }
        });
        
        results[planId] = {
          productId: product.id,
          priceId: price.id
        };
        
        console.log(`✅ Created Stripe product for ${plan.name}: ${product.id}, price: ${price.id}`);
      }
    }
    
    return results;
  } catch (error) {
    console.error('❌ Error creating Stripe subscription products:', error);
    throw error;
  }
}

/**
 * Get user's current subscription plan from Firestore
 * @param {string} userId - User/truck ID
 * @returns {Object} User's subscription info
 */
export async function getUserSubscription(userId) {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const planId = userData.subscriptionPlan || 'basic';
    const plan = getSubscriptionPlan(planId);
    
    return {
      userId,
      planId,
      plan,
      stripeCustomerId: userData.stripeCustomerId || null,
      stripeSubscriptionId: userData.stripeSubscriptionId || null,
      subscriptionStatus: userData.subscriptionStatus || 'active',
      subscriptionCurrentPeriodEnd: userData.subscriptionCurrentPeriodEnd || null,
      updatedAt: userData.updatedAt
    };
  } catch (error) {
    console.error('❌ Error getting user subscription:', error);
    throw error;
  }
}

/**
 * Create or update subscription for a user
 * @param {string} userId - User/truck ID
 * @param {string} newPlanId - New subscription plan ID
 * @param {string} paymentMethodId - Stripe payment method ID (for paid plans)
 * @returns {Object} Subscription result
 */
export async function createOrUpdateSubscription(userId, newPlanId, paymentMethodId = null) {
  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const currentPlanId = userData.subscriptionPlan || 'basic';
    const newPlan = getSubscriptionPlan(newPlanId);
    
    if (!newPlan) {
      throw new Error('Invalid subscription plan');
    }
    
    // Validate plan change
    const validation = validatePlanChange(currentPlanId, newPlanId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    let result = {
      userId,
      planId: newPlanId,
      plan: newPlan,
      subscriptionStatus: 'active'
    };
    
    // Handle free plan (Basic)
    if (newPlan.price === 0) {
      // Cancel existing Stripe subscription if switching to free plan
      if (userData.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(userData.stripeSubscriptionId);
      }
      
      // Update user record
      await userRef.update({
        subscriptionPlan: newPlanId,
        subscriptionStatus: 'active',
        stripeSubscriptionId: admin.firestore.FieldValue.delete(),
        subscriptionCurrentPeriodEnd: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      result.message = `Successfully switched to ${newPlan.name} plan`;
    } else {
      // Handle paid plans (Pro, All-Access)
      if (!paymentMethodId && !userData.stripeCustomerId) {
        throw new Error('Payment method required for paid plans');
      }
      
      let customerId = userData.stripeCustomerId;
      
      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userData.email || `truck-${userId}@grubana.com`,
          metadata: {
            userId,
            planId: newPlanId
          }
        });
        customerId = customer.id;
        
        await userRef.update({
          stripeCustomerId: customerId
        });
      }
      
      // Attach payment method if provided
      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId
        });
        
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });
      }
      
      // Create or update subscription
      let subscription;
      
      if (userData.stripeSubscriptionId) {
        // Update existing subscription
        subscription = await stripe.subscriptions.update(userData.stripeSubscriptionId, {
          items: [{
            price: newPlan.stripePriceId,
          }],
          proration_behavior: 'create_prorations'
        });
      } else {
        // Create new subscription
        subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{
            price: newPlan.stripePriceId,
          }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });
      }
      
      // Update user record
      await userRef.update({
        subscriptionPlan: newPlanId,
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      result.stripeSubscriptionId = subscription.id;
      result.subscriptionStatus = subscription.status;
      result.clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;
      result.message = `Successfully ${validation.isUpgrade ? 'upgraded' : 'switched'} to ${newPlan.name} plan`;
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error creating/updating subscription:', error);
    throw error;
  }
}

/**
 * Handle Stripe webhook events for subscriptions
 * @param {Object} event - Stripe webhook event
 */
export async function handleSubscriptionWebhook(event) {
  try {
    const db = admin.firestore();
    
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user by Stripe customer ID
        const usersQuery = await db.collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();
        
        if (!usersQuery.empty) {
          const userDoc = usersQuery.docs[0];
          const updates = {
            subscriptionStatus: subscription.status,
            subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // If subscription is canceled, revert to basic plan
          if (subscription.status === 'canceled') {
            updates.subscriptionPlan = 'basic';
            updates.stripeSubscriptionId = admin.firestore.FieldValue.delete();
          }
          
          await userDoc.ref.update(updates);
          console.log(`✅ Updated subscription for user: ${userDoc.id}, status: ${subscription.status}`);
        }
        break;
        
      case 'invoice.payment_failed':
        const invoice = event.data.object;
        const failedCustomerId = invoice.customer;
        
        // Find user and handle failed payment
        const failedUsersQuery = await db.collection('users')
          .where('stripeCustomerId', '==', failedCustomerId)
          .limit(1)
          .get();
        
        if (!failedUsersQuery.empty) {
          const userDoc = failedUsersQuery.docs[0];
          await userDoc.ref.update({
            subscriptionStatus: 'past_due',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // TODO: Send notification to user about failed payment
          console.log(`⚠️ Payment failed for user: ${userDoc.id}`);
        }
        break;
    }
  } catch (error) {
    console.error('❌ Error handling subscription webhook:', error);
    throw error;
  }
}

/**
 * Get subscription analytics for admin dashboard
 * @returns {Object} Subscription analytics
 */
export async function getSubscriptionAnalytics() {
  try {
    const db = admin.firestore();
    const usersSnapshot = await db.collection('users').get();
    
    const analytics = {
      totalUsers: 0,
      planDistribution: {
        basic: 0,
        pro: 0,
        allAccess: 0
      },
      activeSubscriptions: 0,
      monthlyRevenue: 0
    };
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const planId = userData.subscriptionPlan || 'basic';
      
      analytics.totalUsers++;
      analytics.planDistribution[planId]++;
      
      if (['active', 'trialing'].includes(userData.subscriptionStatus)) {
        analytics.activeSubscriptions++;
        
        const plan = getSubscriptionPlan(planId);
        if (plan) {
          analytics.monthlyRevenue += plan.price;
        }
      }
    });
    
    return analytics;
  } catch (error) {
    console.error('❌ Error getting subscription analytics:', error);
    throw error;
  }
}
