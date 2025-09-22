/**
 * API Configuration for Mobile App
 * Handles environment-specific endpoints
 */

// Get API base URL from environment with fallback
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://pingmyappetite-production.up.railway.app';

// Get Firebase Functions URL from environment with fallback  
export const FIREBASE_FUNCTIONS_URL = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL || 'https://us-central1-foodtruckfinder-27eba.cloudfunctions.net';

// API Endpoints
export const API_ENDPOINTS = {
  // Stripe Connect (use Railway API for production)
  STRIPE_CONNECT_ONBOARD: `${API_BASE_URL}/api/marketplace/trucks/onboard`,
  STRIPE_CONNECT_STATUS: `${API_BASE_URL}/api/marketplace/trucks/status`,
  STRIPE_ONBOARDING_LINK: `${API_BASE_URL}/api/marketplace/trucks/onboarding-link`,
  STRIPE_SYNC_PAYMENT_DATA: `${API_BASE_URL}/api/marketplace/trucks/sync-payment-data`,
  
  // Menu Items (use Railway API)
  MENU_ITEMS: `${API_BASE_URL}/api/marketplace/trucks`,
  
  // Payment Intents (use Firebase Functions for payments)
  CREATE_PAYMENT_INTENT: `${FIREBASE_FUNCTIONS_URL}/createPaymentIntent`,
  // HANDLE_SUBSCRIPTION_UPDATE: `${FIREBASE_FUNCTIONS_URL}/handleSubscriptionUpdate`, // Deprecated - using commission model
  
  // Customer Portal (use Firebase Functions)
  CUSTOMER_PORTAL: `${FIREBASE_FUNCTIONS_URL}/createCustomerPortalSession`,
};

// Debug configuration
export const debugConfig = () => {

};

export default {
  API_BASE_URL,
  FIREBASE_FUNCTIONS_URL,
  API_ENDPOINTS,
  debugConfig
};
