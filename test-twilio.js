// Twilio SMS Test
// Run this file to test your Twilio integration
// Make sure you have your environment variables set up first

import { sendNotificationSMS, checkTwilioConfig, validatePhoneNumber } from './src/utils/twilioService.js';

const testTwilioIntegration = async () => {
  console.log('🧪 Testing Twilio Integration...\n');
  
  // 1. Check configuration
  console.log('1. Checking Twilio Configuration:');
  const config = checkTwilioConfig();
  console.log('   Configuration Status:', config);
  
  if (!config.configured) {
    console.log('❌ Twilio not configured. Please set up your environment variables:');
    console.log('   TWILIO_ACCOUNT_SID=your_account_sid');
    console.log('   TWILIO_AUTH_TOKEN=your_auth_token');
    console.log('   TWILIO_PHONE_NUMBER=+1234567890');
    return;
  }
  
  console.log('✅ Twilio configuration looks good!\n');
  
  // 2. Test phone number validation
  console.log('2. Testing Phone Number Validation:');
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
    const isValid = validatePhoneNumber(number);
    console.log(`   ${number.padEnd(15)} -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  });
  
  console.log('\n3. Ready to send test SMS!');
  console.log('   Uncomment the lines below and add your test phone number to send a test SMS:');
  console.log('   Make sure to use your own phone number for testing.\n');
  
  // Uncomment these lines to send a test SMS (replace with your phone number)
  /*
  const testPhoneNumber = '+1234567890'; // Replace with your phone number
  console.log(`📱 Sending test SMS to ${testPhoneNumber}...`);
  
  const result = await sendNotificationSMS(
    testPhoneNumber,
    'Grubana Test',
    'This is a test message from your Grubana app! SMS integration is working 🎉'
  );
  
  if (result.success) {
    console.log('✅ Test SMS sent successfully!');
    console.log('   Message SID:', result.messageSid);
  } else {
    console.log('❌ Failed to send test SMS:');
    console.log('   Error:', result.error);
  }
  */
};

// Run the test
testTwilioIntegration().catch(console.error);
