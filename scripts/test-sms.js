// Quick SMS Test - Send yourself a test message
// Run this in the browser console after logging in

import { sendNotificationSMS, checkTwilioConfig } from './src/utils/twilioService.js';

window.testTwilioSMS = async (phoneNumber, message = "Test SMS from Grubana! 🍴") => {
  console.log('🔍 Checking Twilio configuration...');
  const config = checkTwilioConfig();
  
  if (!config.configured) {
    console.error('❌ Twilio not configured properly');
    return;
  }
  
  console.log('✅ Twilio configured, sending test SMS...');
  
  try {
    const result = await sendNotificationSMS(
      phoneNumber, 
      'Grubana Test', 
      message,
      { url: '/dashboard' }
    );
    
    if (result.success) {
      console.log('✅ Test SMS sent successfully!', result);
      return result;
    } else {
      console.error('❌ Failed to send test SMS:', result.error);
      return result;
    }
  } catch (error) {
    console.error('❌ Error sending test SMS:', error);
    return { success: false, error: error.message };
  }
};

// Example usage in browser console:
// testTwilioSMS('+1234567890', 'Hello from Grubana! This is a test message.')

console.log('📱 Twilio SMS test function loaded!');
console.log('Usage: testTwilioSMS("+1234567890", "Your test message")');
