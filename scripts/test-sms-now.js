// Quick SMS Test Script
import { sendNotificationSMS, checkTwilioConfig } from './src/utils/twilioService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testSMS() {
  
  
  // Check configuration first
  const config = checkTwilioConfig();

  
  if (!config.configured) {

    return;
  }
  
  // Get phone number from user input
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('📱 Enter your phone number (e.g., +1234567890): ', async (phoneNumber) => {
  
    
    try {
      const result = await sendNotificationSMS(
        phoneNumber,
        'Grubana Test 🍴',
        'This is a test SMS from your Grubana notification system! If you received this, SMS notifications are working perfectly.',
        { url: '/dashboard' }
      );
      
      if (result.success) {
 
      } else {
  
      }
    } catch (error) {

    }
    
    rl.close();
  });
}

testSMS();
