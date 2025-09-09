// Client-side phone utilities (browser-safe)
// For actual SMS functionality, use Firebase Functions with Twilio

/**
 * Validate if a phone number is in a valid US format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid US phone number
 */
export const validatePhoneNumber = (phone) => {
  if (!phone) return false;
  
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's a valid US phone number (10 or 11 digits)
  if (cleanPhone.length === 10) {
    // 10 digits - assume US number
    return /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(cleanPhone);
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
    // 11 digits starting with 1 - US with country code
    return /^1[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(cleanPhone);
  }
  
  return false;
};

/**
 * Format a phone number to E.164 format for US numbers
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number or original if invalid
 */
export const formatPhoneE164 = (phone) => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 10) {
    // Add US country code
    return `+1${cleanPhone}`;
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
    // Already has country code
    return `+${cleanPhone}`;
  }
  
  // Return original if can't format
  return phone;
};

/**
 * Check Twilio configuration (client-side placeholder)
 * Actual config check should be done server-side
 * @returns {Promise<object>} - Configuration status
 */
export const checkTwilioConfig = async () => {

  return { 
    isConfigured: false, 
    message: 'Twilio configuration check not available client-side. Use Firebase Functions for actual config validation.' 
  };
};

/**
 * Send SMS notification (client-side placeholder)
 * Actual SMS sending should be done via Firebase Functions
 * @param {string} phoneNumber - Phone number to send to
 * @param {string} title - Notification title  
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 * @returns {Promise<object>} - Result object
 */
export const sendNotificationSMS = async (phoneNumber, title, body, data = {}) => {

  return { 
    success: false, 
    error: 'SMS functionality not available client-side. Use Firebase Functions for actual SMS sending.' 
  };
};

/**
 * Format phone number for display (xxx) xxx-xxxx
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number for display
 */
export const formatPhoneDisplay = (phone) => {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 10) {
    return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
    const withoutCountry = cleanPhone.slice(1);
    return `(${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3, 6)}-${withoutCountry.slice(6)}`;
  }
  
  return phone;
};
