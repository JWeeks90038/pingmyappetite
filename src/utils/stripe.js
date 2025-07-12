// Stripe configuration for Grubana pricing plans
// After you create the products in Stripe, replace these Price IDs:
export const STRIPE_CONFIG = {
  // Replace these with your actual Stripe Price IDs from your dashboard
  PRICE_IDS: {
    pro: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || 'price_YOUR_PRO_PLAN_PRICE_ID_HERE',
    'all-access': import.meta.env.VITE_STRIPE_ALL_ACCESS_PRICE_ID || 'price_YOUR_ALL_ACCESS_PRICE_ID_HERE'
  },
  
  // Stripe public key (safe to expose in client-side code)
  PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  
  // Plan details for reference
  PLANS: {
    basic: {
      name: 'Basic',
      price: 0,
      features: [
        'Appear on discovery map',
        'View demand pins',
        'Access truck dashboard',
        'Manual location updates'
      ]
    },
    pro: {
      name: 'Pro',
      price: 999, // in cents
      priceId: 'price_1XXXXXXXXXXXXXXXXX',
      features: [
        'Everything in Basic',
        'Real-time GPS tracking',
        'Real-time menu display',
        'Citywide heat maps',
        'Basic engagement metrics'
      ]
    },
    'all-access': {
      name: 'All Access',
      price: 1999, // in cents
      priceId: 'price_1YYYYYYYYYYYYYYYYY',
      features: [
        'Everything in Basic & Pro',
        'Advanced analytics dashboard',
        'Create promotional drops',
        'Featured placement',
        'Trend alerts',
        'Priority support',
        'Custom branding',
        'Export data',
        'Multiple locations'
      ]
    }
  }
};

// Helper function to get plan details
export const getPlanDetails = (planType) => {
  return STRIPE_CONFIG.PLANS[planType] || STRIPE_CONFIG.PLANS['all-access'];
};

// Helper function to get price ID
export const getPriceId = (planType) => {
  return STRIPE_CONFIG.PRICE_IDS[planType];
};
