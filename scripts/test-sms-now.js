// Quick SMS Test Script
import { sendNotificationSMS, checkTwilioConfig } from './src/utils/twilioService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testSMS() {
  console.log('🔍 Testing Twilio SMS functionality...\n');
  
  // Check configuration first
  const config = checkTwilioConfig();
  console.log('Configuration check:', config.configured ? '✅ READY' : '❌ NOT READY');
  
  if (!config.configured) {
    console.log('❌ Twilio not properly configured');
    return;
  }
  
  // Get phone number from user input
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('📱 Enter your phone number (e.g., +1234567890): ', async (phoneNumber) => {
    console.log(`\n📤 Sending test SMS to ${phoneNumber}...`);
    
    try {
      const result = await sendNotificationSMS(
        phoneNumber,
        'Grubana Test 🍴',
        'This is a test SMS from your Grubana notification system! If you received this, SMS notifications are working perfectly.',
        { url: '/dashboard' }
      );
      
      if (result.success) {
        console.log('✅ SMS sent successfully!');
        console.log('📱 Check your phone for the test message');
        console.log('Details:', {
          messageSid: result.messageSid,
          status: result.status,
          to: result.to
        });
      } else {
        console.log('❌ Failed to send SMS:', result.error);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    rl.close();
  });
}

testSMS();
