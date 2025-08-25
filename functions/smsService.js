import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import twilio from 'twilio';

// Twilio SMS Functions for Grubana
// These functions handle SMS notifications and welcome messages

/**
 * Core SMS sending function (internal use)
 */
async function sendSMSCore(phoneNumber, message, title = null) {
  // Validate inputs
  if (!phoneNumber || !message) {
    throw new Error('Phone number and message are required');
  }
  
  // Get Twilio credentials from environment
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !twilioPhoneNumber) {
    logger.error('Twilio credentials not configured');
    throw new Error('SMS service not configured');
  }
  
  // Initialize Twilio client
  const client = twilio(accountSid, authToken);
  
  // Format the message
  const fullMessage = title ? `${title}\n\n${message}` : message;
  
  // Send SMS
  const messageResult = await client.messages.create({
    body: fullMessage,
    from: twilioPhoneNumber,
    to: phoneNumber
  });
  
  logger.info('SMS sent successfully', { 
    messageSid: messageResult.sid,
    to: phoneNumber 
  });
  
  return {
    success: true,
    messageSid: messageResult.sid,
    to: phoneNumber
  };
}

/**
 * Send SMS notification using Twilio
 * This is a callable function that can be invoked from the client
 */
export const sendSMS = onCall(async (request) => {
  try {
    const { phoneNumber, message, title } = request.data;
    return await sendSMSCore(phoneNumber, message, title);
  } catch (error) {
    logger.error('SMS sending failed', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Send welcome SMS to new users
 * This is a callable function for sending welcome messages
 */
export const sendWelcomeSMS = onCall(async (request) => {
  try {
    const { phoneNumber, username, role, plan } = request.data;
    
    if (!phoneNumber || !username || !role) {
      throw new Error('Phone number, username, and role are required');
    }
    
    // Create role-specific welcome messages
    const welcomeMessages = {
      customer: `🎉 Welcome to PingMyAppetite, ${username}! Discover amazing food trucks near you. You'll get notifications when your favorites are nearby. Reply STOP to unsubscribe.`,
      
      owner: `🚚 Welcome to PingMyAppetite, ${username}! Your food truck is now on the map. Update your location in the dashboard to start attracting customers. ${plan ? `Your ${plan} plan is active.` : ''} Reply STOP to unsubscribe.`,
      
      admin: `� Welcome to PingMyAppetite, ${username}! You have administrative access to the platform. Monitor system health and user activity through the admin dashboard. Reply STOP to unsubscribe.`
    };
    
    const message = welcomeMessages[role] || welcomeMessages.customer;
    
    // Use the core SMS function
    return await sendSMSCore(phoneNumber, message, 'Welcome to PingMyAppetite!');
    
  } catch (error) {
    logger.error('Welcome SMS failed', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Test SMS function for development
 * This function allows testing SMS without going through the full signup flow
 */
export const testSMS = onCall(async (request) => {
  try {
    const { phoneNumber } = request.data;
    
    if (!phoneNumber) {
      throw new Error('Phone number is required for testing');
    }
    
    const testMessage = `Hello from PingMyAppetite! This is a test message to verify your SMS integration is working properly. 📱✅\n\nTimestamp: ${new Date().toLocaleString()}\n\nReply STOP to unsubscribe.`;
    
    return await sendSMSCore(phoneNumber, testMessage, 'PingMyAppetite SMS Test');
    
  } catch (error) {
    logger.error('SMS test failed', error);
    return {
      success: false,
      error: error.message
    };
  }
});
