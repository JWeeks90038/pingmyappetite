// Stripe configuration for Grubana pricing plans
// After you create the products in Stripe, replace these Price IDs:
export const STRIPE_CONFIG = {
  // Replace these with your actual Stripe Price IDs from your dashboard
  PRICE_IDS: {
    pro: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || 'price_1S2yLyRsRfaVTYCjdOaclNNR',
    'all-access': import.meta.env.VITE_STRIPE_ALL_ACCESS_PRICE_ID || 'price_1S2yTYRsRfaVTYCjjkK7fUZS',
    'event-premium': import.meta.env.VITE_STRIPE_EVENT_PREMIUM_PRICE_ID || 'price_1S3eeTRsRfaVTYCjli5ZRMVY'
  },
  
  // Stripe public key (safe to expose in client-side code)
  PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  
  // Plan details for reference
  PLANS: {
    basic: {
      name: 'Starter Plan',
      price: 0,
      features: [
        'Personalized icons on discovery map',
        'Real-time GPS tracking',
        'Custom menu display',
        'Customer pre-order engagement'
      ]
    },
    pro: {
      name: 'Pro Plan',
      price: 999, // in cents
      priceId: 'price_1S2yLyRsRfaVTYCjdOaclNNR',
      features: [
        'Everything in Starter',
        'Heat maps showing customer demand',
        'Create Drops providing exclusive deals'
      ]
    },
    'all-access': {
      name: 'All-Access Plan',
      price: 1999, // in cents
      priceId: 'price_1S2yTYRsRfaVTYCjjkK7fUZS',
      features: [
        'Everything in Pro',
        'Advanced analytics',
        'Event management'
      ]
    },
    'event-basic': {
      name: 'Event Starter',
      price: 0, // Free
      priceId: null,
      features: [
        'Up to 3 events per month',
        'Basic event page with details',
        'Vendor application management',
        'Map location marker',
        'Email notifications',
        'Basic analytics'
      ]
    },
    'event-premium': {
      name: 'Event Premium',
      price: 2900, // $29.00/month
      priceId: 'price_1S3eeTRsRfaVTYCjli5ZRMVY',
      features: [
        'Unlimited events',
        'Enhanced event pages with photos',
        'Priority map placement',
        'Advanced vendor matching',
        'SMS and email notifications',
        'Detailed analytics dashboard',
        'Custom branding options',
        'Social media integration',
        'Featured map placement',
        'Custom event marketing tools',
        'White-label event pages',
        'API access for integrations',
        'Dedicated account manager',
        'Custom reporting',
        'Multi-user team access',
        'Priority vendor recommendations'
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
  const priceId = STRIPE_CONFIG.PRICE_IDS[planType];
  console.log('Getting price ID for plan:', planType);
  console.log('Price ID found:', priceId);
  console.log('Environment variables:', {
    VITE_STRIPE_PRO_PRICE_ID: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
    VITE_STRIPE_ALL_ACCESS_PRICE_ID: import.meta.env.VITE_STRIPE_ALL_ACCESS_PRICE_ID
  });
  return priceId;
};
