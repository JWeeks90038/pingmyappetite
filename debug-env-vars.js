// Quick diagnostic script to check environment variables
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Environment Variables Debug:');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('STRIPE_SECRET_KEY starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 15));

// Check if we're in live mode
const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
console.log('Stripe Live Mode:', isLiveMode);

// Recommended URLs
console.log('\n📋 Recommended Environment Variables:');
console.log('FRONTEND_URL=https://grubana.com');
console.log('CLIENT_URL=https://grubana.com');
