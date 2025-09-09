// Twilio SMS Test
// Run this file to test your Twilio integration
// Make sure you have your environment variables set up first

import { sendNotificationSMS, checkTwilioConfig, validatePhoneNumber } from './src/utils/twilioService.js';

const testTwilioIntegration = async () => {

  
  // 1. Check configuration

  const config = checkTwilioConfig();

  
  if (!config.configured) {

    return;
  }
  

  
  // 2. Test phone number validation

  const testNumbers = [
    '5551234567',      // Valid 10-digit
    '+15551234567',    // Valid with country code
    '15551234567',     // Valid 11-digit
    '555-123-4567',    // Valid with formatting
    '(555) 123-4567',  // Valid with parentheses
    '123',             // Invalid - too short
    'abc1234567'       // Invalid - contains letters
  ];
  
  testNumbers.forEach(number => {

  });
  

  
  // Uncomment these lines to send a test SMS (replace with your phone number)
  /*
  const testPhoneNumber = '+1234567890'; // Replace with your phone number

  
  const result = await sendNotificationSMS(
    testPhoneNumber,
    'Grubana Test',
    'This is a test message from your Grubana app! SMS integration is working 🎉'
  );
  
  if (result.success) {

  } else {

  }
  */
};

// Run the test
testTwilioIntegration().catch();
