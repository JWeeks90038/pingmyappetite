// Twilio SMS Service
import twilio from 'twilio';

// Initialize Twilio client
let twilioClient = null;

const initializeTwilio = () => {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const apiSid = process.env.TWILIO_API_SID;
    const apiSecretKey = process.env.TWILIO_API_SECRET_KEY;
    
    if (!accountSid) {
      console.warn('⚠️ TWILIO_ACCOUNT_SID not found in environment variables');
      return null;
    }
    
    try {
      // Try basic authentication first (more reliable)
      if (authToken) {
        twilioClient = twilio(accountSid, authToken);
        console.log('📱 Twilio client initialized with Basic authentication');
      }
      // Fall back to API Key authentication if basic auth not available
      else if (apiSid && apiSecretKey) {
        twilioClient = twilio(apiSid, apiSecretKey, { accountSid });
        console.log('📱 Twilio client initialized with API Key authentication');
      } 
      else {
        console.warn('⚠️ No valid Twilio authentication credentials found');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Twilio client:', error);
      return null;
    }
  }
  
  return twilioClient;
};

// Send SMS via Twilio
export const sendSMSViaTwilio = async (phoneNumber, message, data = {}) => {
  try {
    const client = initializeTwilio();
    
    if (!client) {
      throw new Error('Twilio client not initialized - check credentials');
    }
    
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!fromNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not found in environment variables');
    }
    
    // Format phone number (ensure it starts with +1 for US numbers)
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Send SMS
    const smsMessage = await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedPhone,
      // Optional: Add media URL for MMS
      // mediaUrl: data.imageUrl ? [data.imageUrl] : undefined
    });
    
    console.log('📱 SMS sent successfully via Twilio:', {
      sid: smsMessage.sid,
      to: formattedPhone,
      status: smsMessage.status
    });
    
    return {
      success: true,
      method: 'sms',
      messageSid: smsMessage.sid,
      status: smsMessage.status,
      to: formattedPhone
    };
    
  } catch (error) {
    console.error('📱 Error sending SMS via Twilio:', error);
    return {
      success: false,
      method: 'sms',
      error: error.message,
      to: phoneNumber
    };
  }
};

// Format phone number to E.164 format
const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it's a 10-digit US number, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it's an 11-digit number starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it already has country code, return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Default: assume US number and add +1
  return `+1${digits}`;
};

// Validate phone number format
export const validatePhoneNumber = (phoneNumber) => {
  const digits = phoneNumber.replace(/\D/g, '');
  
  // US phone numbers should be 10 or 11 digits
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
};

// Send notification SMS with structured content
export const sendNotificationSMS = async (phoneNumber, title, body, data = {}) => {
  try {
    // Create formatted message
    let message = `🍴 ${title}\n\n${body}`;
    
    // Add action URL if provided
    if (data.url) {
      message += `\n\nView: https://grubana.com${data.url}`;
    }
    
    // Add truck info if available
    if (data.truckId && data.truckName) {
      message += `\n\n📍 ${data.truckName}`;
    }
    
    // Keep message under SMS limit (160 characters for single SMS)
    if (message.length > 150) {
      message = message.substring(0, 147) + '...';
    }
    
    return await sendSMSViaTwilio(phoneNumber, message, data);
    
  } catch (error) {
    console.error('📱 Error sending notification SMS:', error);
    return {
      success: false,
      method: 'sms',
      error: error.message,
      to: phoneNumber
    };
  }
};

// Check Twilio configuration
export const checkTwilioConfig = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiSid = process.env.TWILIO_API_SID;
  const apiSecretKey = process.env.TWILIO_API_SECRET_KEY;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  const hasApiKeyAuth = !!(apiSid && apiSecretKey);
  const hasBasicAuth = !!(authToken);
  const hasAuth = hasApiKeyAuth || hasBasicAuth;
  
  return {
    configured: !!(accountSid && hasAuth && phoneNumber),
    accountSid: !!accountSid,
    authToken: !!authToken,
    apiSid: !!apiSid,
    apiSecretKey: !!apiSecretKey,
    phoneNumber: !!phoneNumber,
    authMethod: hasApiKeyAuth ? 'API Key' : hasBasicAuth ? 'Basic' : 'None'
  };
};

export default {
  sendSMSViaTwilio,
  sendNotificationSMS,
  validatePhoneNumber,
  checkTwilioConfig
};
