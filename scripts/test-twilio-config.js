// Test Twilio Configuration and Welcome Email System
// Run this with: node test-twilio-config.js [optional-phone-number]

import { checkTwilioConfig } from './src/utils/twilioService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();





const config = checkTwilioConfig();



// Test welcome SMS if phone number provided and Twilio configured
const testPhoneNumber = process.argv[2];

if (config.configured && testPhoneNumber) {

  
  try {
    // Test sending a welcome SMS
    const { sendNotificationSMS } = await import('./src/utils/twilioService.js');
    
    const testResult = await sendNotificationSMS(
      testPhoneNumber,
      'Welcome to Grubana!',
      '🎉 Welcome to Grubana! This is a test of your SMS welcome system. Your account is ready to send automatic welcome messages!'
    );
    
    if (testResult.success) {

    } else {
   
    }
  } catch (error) {
   
  }
} else if (!config.configured) {

} else if (!testPhoneNumber) {

}




if (config.configured) {

}

if (config.configured) {

}


