import { config } from 'dotenv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables from .env file
config();

// Initialize Firebase Admin SDK only if not already initialized
if (!getApps().length) {
  initializeApp();
}

// Initialize Firestore
export const db = getFirestore();

// Export configuration for use in other modules
export const getConfig = () => {
  return {
    sendGridApiKey: process.env.SENDGRID_API_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    clientUrl: process.env.CLIENT_URL
  };
};
