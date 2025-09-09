// Quick diagnostic script to check environment variables
import dotenv from 'dotenv';
dotenv.config();



// Check if we're in live mode
const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');


