// Quick SMS Test - Send yourself a test message
// Run this in the browser console after logging in

import { sendNotificationSMS, checkTwilioConfig } from './src/utils/twilioService.js';

window.testTwilioSMS = async (phoneNumber, message = "Test SMS from Grubana! 🍴") => {

  const config = checkTwilioConfig();
  
  if (!config.configured) {

    return;
  }
  

  
  try {
    const result = await sendNotificationSMS(
      phoneNumber, 
      'Grubana Test', 
      message,
      { url: '/dashboard' }
    );
    
    if (result.success) {
 
      return result;
    } else {
 
      return result;
    }
  } catch (error) {

    return { success: false, error: error.message };
  }
};

