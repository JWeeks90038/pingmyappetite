/**
 * PAYMENT CONFIGURATION
 * Central configuration for all payment-related constants and plan definitions
 */

// Subscription Plan Definitions
export const SUBSCRIPTION_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 0, // Free
    platformFeePercentage: 0.05, // 5% platform fee per item
    stripePriceId: null, // No Stripe subscription needed
    features: [
      '5% platform fee per item',
      'Basic support',
      'Standard payment processing'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9.99, // $9.99/month
    platformFeePercentage: 0.025, // 2.5% platform fee per item
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly', // Set in environment
    features: [
      '2.5% platform fee per item',
      'Priority support',
      'Advanced analytics',
      'Bulk menu management'
    ]
  },
  allAccess: {
    id: 'allAccess',
    name: 'All-Access',
    price: 19.99, // $19.99/month
    platformFeePercentage: 0.0, // 0% platform fee per item
    stripePriceId: process.env.STRIPE_ALL_ACCESS_PRICE_ID || 'price_all_access_monthly', // Set in environment
    features: [
      '0% platform fee per item',
      'Premium support',
      'Full analytics suite',
      'White-label options',
      'API access'
    ]
  }
};

// Stripe Processing Fees (charged to connected account)
export const STRIPE_PROCESSING_FEES = {
  percentage: 0.029, // 2.9%
  fixedFee: 30, // $0.30 in cents
  currency: 'usd'
};

// Platform Configuration
export const PLATFORM_CONFIG = {
  currency: 'usd',
  defaultPlan: 'basic',
  // Minimum order amount in cents to process
  minimumOrderAmount: 100, // $1.00
  // Maximum platform fee cap per item (optional safety net)
  maxPlatformFeePerItem: 500 // $5.00 in cents
};

/**
 * Get subscription plan by ID
 * @param {string} planId - The plan identifier
 * @returns {Object|null} Plan object or null if not found
 */
export function getSubscriptionPlan(planId) {
  return SUBSCRIPTION_PLANS[planId] || null;
}

/**
 * Get all available subscription plans
 * @returns {Array} Array of all subscription plans
 */
export function getAllSubscriptionPlans() {
  return Object.values(SUBSCRIPTION_PLANS);
}

/**
 * Calculate platform fee for a single item based on plan
 * @param {number} itemPrice - Item price in cents
 * @param {string} planId - Subscription plan ID
 * @returns {number} Platform fee in cents
 */
export function calculatePlatformFeeForItem(itemPrice, planId) {
  const plan = getSubscriptionPlan(planId);
  if (!plan) {
    // Default to basic plan if plan not found
    const basicPlan = getSubscriptionPlan('basic');
    return Math.round(itemPrice * basicPlan.platformFeePercentage);
  }
  
  const platformFee = Math.round(itemPrice * plan.platformFeePercentage);
  
  // Apply maximum platform fee cap if configured
  if (PLATFORM_CONFIG.maxPlatformFeePerItem && platformFee > PLATFORM_CONFIG.maxPlatformFeePerItem) {
    return PLATFORM_CONFIG.maxPlatformFeePerItem;
  }
  
  return platformFee;
}

/**
 * Calculate total platform fees for an entire order
 * @param {Array} orderItems - Array of order items with price and quantity
 * @param {string} planId - Subscription plan ID
 * @returns {Object} Breakdown of fees
 */
export function calculateOrderPlatformFees(orderItems, planId) {
  let totalPlatformFee = 0;
  let totalOrderValue = 0;
  const itemBreakdown = [];
  
  orderItems.forEach(item => {
    const itemTotal = item.price * item.quantity;
    const itemPlatformFee = calculatePlatformFeeForItem(item.price, planId) * item.quantity;
    
    totalOrderValue += itemTotal;
    totalPlatformFee += itemPlatformFee;
    
    itemBreakdown.push({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      itemTotal: itemTotal,
      platformFeePerItem: calculatePlatformFeeForItem(item.price, planId),
      totalPlatformFee: itemPlatformFee
    });
  });
  
  return {
    totalOrderValue,
    totalPlatformFee,
    platformFeePercentage: totalOrderValue > 0 ? (totalPlatformFee / totalOrderValue) : 0,
    planId,
    itemBreakdown
  };
}

/**
 * Validate if a plan upgrade/downgrade is allowed
 * @param {string} currentPlan - Current plan ID
 * @param {string} newPlan - New plan ID
 * @returns {Object} Validation result
 */
export function validatePlanChange(currentPlan, newPlan) {
  const current = getSubscriptionPlan(currentPlan);
  const target = getSubscriptionPlan(newPlan);
  
  if (!current || !target) {
    return {
      valid: false,
      error: 'Invalid plan specified'
    };
  }
  
  if (currentPlan === newPlan) {
    return {
      valid: false,
      error: 'Cannot change to the same plan'
    };
  }
  
  return {
    valid: true,
    isUpgrade: target.price > current.price,
    isDowngrade: target.price < current.price,
    priceDifference: target.price - current.price,
    feeChange: target.platformFeePercentage - current.platformFeePercentage
  };
}
