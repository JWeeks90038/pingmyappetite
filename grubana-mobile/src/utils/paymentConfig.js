/**
 * MOBILE PAYMENT CONFIGURATION
 * Configuration for Stripe Connect payments for food pre-orders
 * Grubana commission structure for physical food orders only
 */

// Grubana Commission Structure for Food Pre-Orders
export const COMMISSION_CONFIG = {
  // Standard commission rate for all food truck vendors
  commissionPercentage: 0.07, // 7% commission on food pre-orders
  description: '7% commission on food pre-orders',
  
  // Minimum order amount to process
  minimumOrderAmount: 5.00, // $5.00 minimum
  
  // Payment processing details
  currency: 'usd',
  paymentMethod: 'stripe_connect'
};

// Convert dollars to cents for Stripe
export const toCents = (dollars) => Math.round(dollars * 100);

// Convert cents to dollars for display
export const toDollars = (cents) => (cents / 100).toFixed(2);

/**
 * Calculate Grubana commission for a food pre-order
 * @param {number} orderTotal - Total order amount in dollars
 * @returns {Object} Commission breakdown
 */
export function calculateGrubanaCommission(orderTotal) {
  const commissionAmount = orderTotal * COMMISSION_CONFIG.commissionPercentage;
  
  return {
    orderTotal,
    commissionPercentage: COMMISSION_CONFIG.commissionPercentage,
    commissionAmount,
    vendorReceives: orderTotal - commissionAmount,
    description: COMMISSION_CONFIG.description
  };
}

/**
 * Calculate fees for Stripe Connect food pre-order payment
 * @param {Array} cartItems - Array of cart items with price and quantity
 * @param {Object} truckOwner - Food truck owner data with stripeConnectAccountId
 * @returns {Object} Complete payment breakdown
 */
export function calculateStripeConnectPayment(cartItems, truckOwner) {
  // Calculate order total
  const orderTotal = cartItems.reduce((total, item) => 
    total + (item.price * item.quantity), 0
  );
  
  // Calculate Grubana commission
  const commissionBreakdown = calculateGrubanaCommission(orderTotal);
  
  // Stripe processing fee (2.9% + $0.30)
  const stripeProcessingFee = (orderTotal * 0.029) + 0.30;
  
  // Application fee (our commission) in cents for Stripe
  const applicationFeeAmount = toCents(commissionBreakdown.commissionAmount);
  
  return {
    // Order details
    orderTotal: orderTotal,
    orderTotalCents: toCents(orderTotal),
    
    // Commission fees
    commissionPercentage: commissionBreakdown.commissionPercentage,
    commissionAmount: commissionBreakdown.commissionAmount,
    applicationFeeAmount, // What Stripe calls our commission
    
    // Vendor payout
    vendorReceives: commissionBreakdown.vendorReceives,
    vendorReceivesCents: toCents(commissionBreakdown.vendorReceives),
    
    // Stripe details
    stripeProcessingFee,
    connectedAccountId: truckOwner?.stripeConnectAccountId,
    
    // Commission info
    description: commissionBreakdown.description,
    
    // Validation
    isValid: !!truckOwner?.stripeConnectAccountId && orderTotal >= COMMISSION_CONFIG.minimumOrderAmount
  };
}

/**
 * Prepare payment intent data for Stripe Connect food pre-orders
 * @param {Object} paymentBreakdown - Result from calculateStripeConnectPayment
 * @param {Object} orderData - Order details
 * @returns {Object} Payment intent creation data
 */
export function preparePaymentIntentData(paymentBreakdown, orderData) {
  if (!paymentBreakdown.isValid) {
    throw new Error('Invalid payment data or missing Stripe Connect account');
  }
  
  return {
    // Payment amount (total charged to customer for food pre-order)
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
      orderType: 'food_preorder', // Clear indication this is for physical food
      commissionPercentage: paymentBreakdown.commissionPercentage.toString(),
      orderTotal: paymentBreakdown.orderTotal.toString(),
      commissionAmount: paymentBreakdown.commissionAmount.toString()
    },
    
    // Payment flow settings
    capture_method: 'automatic',
    confirmation_method: 'manual',
    confirm: false // We'll confirm after successful setup
  };
}

export default {
  COMMISSION_CONFIG,
  calculateGrubanaCommission,
  calculateStripeConnectPayment,
  preparePaymentIntentData,
  toCents,
  toDollars
};
