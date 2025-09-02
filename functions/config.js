import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Export configuration for use in other modules
export const getConfig = () => {
  return {
    sendGridApiKey: process.env.SENDGRID_API_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    clientUrl: process.env.CLIENT_URL
  };
};
