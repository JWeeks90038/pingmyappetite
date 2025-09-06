// Test SMS to a different number to isolate the issue
import { sendNotificationSMS } from './src/utils/twilioService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testDifferentNumber() {
  console.log('🔍 Testing SMS to different numbers to isolate the issue...\n');
  
  console.log('Current setup:');
  console.log(`From: ${process.env.TWILIO_PHONE_NUMBER} (toll-free)`);
  console.log(`To: +17602711244 (your 760 number)`);
  console.log('Result: Undelivered (error 30032)\n');
  
  console.log('💡 The issue might be:');
  console.log('1. Verizon blocking toll-free SMS to your specific number');
  console.log('2. Your number has spam filtering enabled');
  console.log('3. Carrier-specific blocking between toll-free and your carrier\n');
  
  console.log('🎯 Solutions to try:');
  console.log('1. IMMEDIATE: Ask a friend to test with their phone number');
  console.log('2. SHORT-TERM: Buy a local SMS-enabled number from Twilio');
  console.log('3. LONG-TERM: Register for 10DLC for business messaging\n');
  
  console.log('📋 Steps to get a local number:');
  console.log('1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/search');
  console.log('2. Select "Local" numbers');
  console.log('3. Choose any area code (619, 858, 714, etc.)');
  console.log('4. Filter by "SMS Enabled"');
  console.log('5. Buy a number (usually $1/month)');
  console.log('6. Update your .env.local with the new number');
  console.log('7. Test again\n');
  
  console.log('⚡ Want to test right now?');
  console.log('Ask a friend to text their number, then run:');
  console.log('node test-sms-now.js');
  console.log('And enter their number instead of yours');
}

testDifferentNumber();
