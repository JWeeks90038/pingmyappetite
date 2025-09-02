import twilio from 'twilio';
import { logger } from 'firebase-functions';

// Initialize Twilio client
let twilioClient = null;

const initializeTwilio = () => {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      logger.warn('⚠️ Twilio credentials not configured');
      return null;
    }
    
    twilioClient = twilio(accountSid, authToken);
    logger.info('📱 Twilio client initialized');
  }
  
  return twilioClient;
};

/**
 * Format phone number to E.164 format
 */
const formatPhoneE164 = (phone) => {
  if (!phone) return null;
  
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 10) {
    // Add US country code
    return `+1${cleanPhone}`;
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
    // Already has country code
    return `+${cleanPhone}`;
  }
  
  return null;
};

/**
 * Validate phone number format
 */
const validatePhoneNumber = (phone) => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  
  // US phone number validation
  if (cleanPhone.length === 10) {
    return /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(cleanPhone);
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
    return /^1[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(cleanPhone);
  }
  
  return false;
};

/**
 * Send SMS notification
 */
const sendSMS = async (phoneNumber, message, orderData = {}) => {
  try {
    const client = initializeTwilio();
    if (!client) {
      return { 
        success: false, 
        error: 'Twilio not configured',
        method: 'sms'
      };
    }
    
    const formattedPhone = formatPhoneE164(phoneNumber);
    if (!formattedPhone || !validatePhoneNumber(phoneNumber)) {
      return { 
        success: false, 
        error: 'Invalid phone number format',
        method: 'sms'
      };
    }
    
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioPhone) {
      return { 
        success: false, 
        error: 'Twilio phone number not configured',
        method: 'sms'
      };
    }
    
    const result = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: formattedPhone
    });
    
    logger.info(`📱 SMS sent successfully: ${result.sid}`);
    
    return {
      success: true,
      messageId: result.sid,
      method: 'sms',
      to: formattedPhone
    };
    
  } catch (error) {
    logger.error('📱 Error sending SMS:', error);
    
    return {
      success: false,
      error: error.message,
      method: 'sms'
    };
  }
};

/**
 * Create order status SMS message
 */
const createOrderStatusMessage = (orderData, status) => {
  const { 
    orderId, 
    truckName = 'Food Truck', 
    customerName = '',
    items = [],
    totalAmount = 0,
    estimatedTime = null
  } = orderData;
  
  const shortOrderId = orderId.substring(0, 8);
  const customerGreeting = customerName ? `Hi ${customerName}! ` : 'Hi! ';
  
  const statusMessages = {
    confirmed: {
      message: `${customerGreeting}Your order #${shortOrderId} from ${truckName} has been confirmed! ${estimatedTime ? `Estimated time: ${estimatedTime} minutes. ` : ''}We'll notify you when it's ready.`,
      title: 'Order Confirmed'
    },
    preparing: {
      message: `${customerGreeting}Good news! ${truckName} is now preparing your order #${shortOrderId}. ${estimatedTime ? `Estimated time: ${estimatedTime} minutes. ` : ''}We'll let you know when it's ready for pickup!`,
      title: 'Order Being Prepared'
    },
    ready: {
      message: `${customerGreeting}🔔 Your order #${shortOrderId} from ${truckName} is ready for pickup! Please head to the truck location to collect your delicious food.`,
      title: 'Order Ready!'
    },
    completed: {
      message: `${customerGreeting}Thanks for choosing ${truckName}! Your order #${shortOrderId} is complete. We hope you enjoyed your meal! ⭐`,
      title: 'Order Complete'
    },
    cancelled: {
      message: `${customerGreeting}Unfortunately, your order #${shortOrderId} from ${truckName} has been cancelled. You'll receive a full refund within 3-5 business days.`,
      title: 'Order Cancelled'
    }
  };
  
  return statusMessages[status] || {
    message: `${customerGreeting}Update on your order #${shortOrderId} from ${truckName}: ${status}`,
    title: 'Order Update'
  };
};

/**
 * Send order status SMS
 */
const sendOrderStatusSMS = async (phoneNumber, orderData, status) => {
  const messageData = createOrderStatusMessage(orderData, status);
  return await sendSMS(phoneNumber, messageData.message, { ...orderData, status });
};

/**
 * Check Twilio configuration
 */
const checkTwilioConfig = () => {
  const config = {
    accountSid: !!process.env.TWILIO_ACCOUNT_SID,
    authToken: !!process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
    apiSid: !!process.env.TWILIO_API_SID,
    apiSecret: !!process.env.TWILIO_API_SECRET_KEY
  };
  
  const isConfigured = config.accountSid && config.authToken && config.phoneNumber;
  
  return {
    isConfigured,
    config,
    missingFields: Object.keys(config).filter(key => !config[key])
  };
};

export {
  initializeTwilio,
  sendSMS,
  sendOrderStatusSMS,
  createOrderStatusMessage,
  validatePhoneNumber,
  formatPhoneE164,
  checkTwilioConfig
};
