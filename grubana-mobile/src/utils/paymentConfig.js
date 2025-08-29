/**
 * MOBILE PAYMENT CONFIGURATION
 * Configuration for Stripe Connect payments with subscription-based fees
 */

// Subscription Plan Fee Structure
export const SUBSCRIPTION_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    platformFeePercentage: 0.05, // 5% platform fee
    description: '5% platform fee per order'
  },
  pro: {
    id: 'pro', 
    name: 'Pro',
    platformFeePercentage: 0.025, // 2.5% platform fee
    description: '2.5% platform fee per order'
  },
  'all-access': {
    id: 'all-access',
    name: 'All-Access',
    platformFeePercentage: 0.0, // 0% platform fee
    description: '0% platform fee per order'
  }
};

// Convert dollars to cents for Stripe
export const toCents = (dollars) => Math.round(dollars * 100);

// Convert cents to dollars for display
export const toDollars = (cents) => (cents / 100).toFixed(2);

/**
 * Calculate platform fee for an order based on user's subscription plan
 * @param {number} orderTotal - Total order amount in dollars
 * @param {string} userPlan - User's subscription plan (basic, pro, all-access)
 * @returns {Object} Fee breakdown
 */
export function calculatePlatformFee(orderTotal, userPlan = 'basic') {
  const plan = SUBSCRIPTION_PLANS[userPlan] || SUBSCRIPTION_PLANS.basic;
  const platformFeeAmount = orderTotal * plan.platformFeePercentage;
  
  return {
    orderTotal,
    platformFeePercentage: plan.platformFeePercentage,
    platformFeeAmount,
    vendorReceives: orderTotal - platformFeeAmount,
    planName: plan.name,
    description: plan.description
  };
}

/**
 * Calculate fees for Stripe Connect payment
 * @param {Array} cartItems - Array of cart items with price and quantity
 * @param {string} userPlan - Customer's subscription plan
 * @param {Object} truckOwner - Food truck owner data with stripeConnectAccountId
 * @returns {Object} Complete payment breakdown
 */
export function calculateStripeConnectPayment(cartItems, userPlan = 'basic', truckOwner) {
  // Calculate order total
  const orderTotal = cartItems.reduce((total, item) => 
    total + (item.price * item.quantity), 0
  );
  
  // Calculate platform fees based on subscription plan
  const feeBreakdown = calculatePlatformFee(orderTotal, userPlan);
  
  // Stripe processing fee (2.9% + $0.30)
  const stripeProcessingFee = (orderTotal * 0.029) + 0.30;
  
  // Application fee (our platform fee) in cents for Stripe
  const applicationFeeAmount = toCents(feeBreakdown.platformFeeAmount);
  
  return {
    // Order details
    orderTotal: orderTotal,
    orderTotalCents: toCents(orderTotal),
    
    // Platform fees
    platformFeePercentage: feeBreakdown.platformFeePercentage,
    platformFeeAmount: feeBreakdown.platformFeeAmount,
    applicationFeeAmount, // What Stripe calls our platform fee
    
    // Vendor payout
    vendorReceives: feeBreakdown.vendorReceives,
    vendorReceivesCents: toCents(feeBreakdown.vendorReceives),
    
    // Stripe details
    stripeProcessingFee,
    connectedAccountId: truckOwner?.stripeConnectAccountId,
    
    // Plan info
    customerPlan: userPlan,
    planDescription: feeBreakdown.description,
    
    // Validation
    isValid: !!truckOwner?.stripeConnectAccountId && orderTotal > 0
  };
}

/**
 * Prepare payment intent data for Stripe Connect
 * @param {Object} paymentBreakdown - Result from calculateStripeConnectPayment
 * @param {Object} orderData - Order details
 * @returns {Object} Payment intent creation data
 */
export function preparePaymentIntentData(paymentBreakdown, orderData) {
  if (!paymentBreakdown.isValid) {
    throw new Error('Invalid payment data or missing Stripe Connect account');
  }
  
  return {
    // Payment amount (total charged to customer)
    amount: paymentBreakdown.orderTotalCents,
    currency: 'usd',
    
    // Stripe Connect configuration
    transfer_data: {
      destination: paymentBreakdown.connectedAccountId,
    },
    application_fee_amount: paymentBreakdown.applicationFeeAmount,
    
    // Order metadata
    metadata: {
      orderId: orderData.orderId || '',
      customerId: orderData.userId || '',
      truckId: orderData.truckId || '',
      truckName: orderData.truckName || '',
      customerPlan: paymentBreakdown.customerPlan,
      platformFeePercentage: paymentBreakdown.platformFeePercentage.toString(),
      orderTotal: paymentBreakdown.orderTotal.toString(),
      platformFeeAmount: paymentBreakdown.platformFeeAmount.toString()
    },
    
    // Payment flow settings
    capture_method: 'automatic',
    confirmation_method: 'manual',
    confirm: false // We'll confirm after successful setup
  };
}

export default {
  SUBSCRIPTION_PLANS,
  calculatePlatformFee,
  calculateStripeConnectPayment,
  preparePaymentIntentData,
  toCents,
  toDollars
};
