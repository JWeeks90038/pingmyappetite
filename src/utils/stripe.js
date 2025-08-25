// Stripe configuration for Grubana pricing plans
// After you create the products in Stripe, replace these Price IDs:
export const STRIPE_CONFIG = {
  // Replace these with your actual Stripe Price IDs from your dashboard
  PRICE_IDS: {
    pro: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || 'price_YOUR_PRO_PLAN_PRICE_ID_HERE',
    'all-access': import.meta.env.VITE_STRIPE_ALL_ACCESS_PRICE_ID || 'price_YOUR_ALL_ACCESS_PRICE_ID_HERE',
    'event-starter': import.meta.env.VITE_STRIPE_EVENT_STARTER_PRICE_ID || 'price_YOUR_EVENT_STARTER_PRICE_ID_HERE',
    'event-pro': import.meta.env.VITE_STRIPE_EVENT_PRO_PRICE_ID || 'price_YOUR_EVENT_PRO_PRICE_ID_HERE',
    'event-premium': import.meta.env.VITE_STRIPE_EVENT_PREMIUM_PRICE_ID || 'price_YOUR_EVENT_PREMIUM_PRICE_ID_HERE'
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
    },
    'event-starter': {
      name: 'Event Starter',
      price: 2999, // $29.99/month
      priceId: 'price_1ZZZZZZZZZZZZZZZZZ',
      features: [
        'List up to 3 events per month',
        'Basic event page with details',
        'Vendor application management',
        'Map location marker',
        'Email notifications',
        'Basic analytics'
      ]
    },
    'event-pro': {
      name: 'Event Pro',
      price: 4999, // $49.99/month
      priceId: 'price_1AAAAAAAAAAAAAAAA',
      features: [
        'Unlimited events',
        'Enhanced event pages with photos',
        'Priority map placement',
        'Advanced vendor matching',
        'SMS and email notifications',
        'Detailed analytics dashboard',
        'Custom branding options',
        'Social media integration'
      ]
    },
    'event-premium': {
      name: 'Event Premium',
      price: 9999, // $99.99/month
      priceId: 'price_1BBBBBBBBBBBBBBB',
      features: [
        'Everything in Event Pro',
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
