// Test SMS to a different number to isolate the issue
import { sendNotificationSMS } from './src/utils/twilioService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testDifferentNumber() {

}

testDifferentNumber();
