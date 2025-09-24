/**
 * Calendar Feature Access Control
 * Determines if a user has access to the Google Calendar integration feature
 */

/**
 * List of authorized test user email addresses
 * TODO: Remove this when feature is ready for all users
 */
const AUTHORIZED_TEST_USERS = [
  'test@grubana.com',
  'admin@grubana.com',
  'developer@grubana.com',
  // Add more test user emails here as needed
];

/**
 * Check if a user is authorized to use the calendar feature
 * @param {Object} user - The authenticated user object
 * @param {string} user.email - User's email address
 * @param {string} user.uid - User's unique ID
 * @returns {boolean} - True if user is authorized, false otherwise
 */
export const isCalendarFeatureAuthorized = (user) => {
  // Feature flag: Set to false to disable for all users, true to enable for authorized users
  const CALENDAR_FEATURE_ENABLED = false; // TODO: Change to true when ready for test users
  
  if (!CALENDAR_FEATURE_ENABLED) {
    return false;
  }
  
  if (!user || !user.email) {
    return false;
  }
  
  // Check if user's email is in the authorized list
  return AUTHORIZED_TEST_USERS.includes(user.email.toLowerCase());
};

/**
 * Check if the calendar feature should show as "coming soon"
 * @param {Object} user - The authenticated user object  
 * @returns {boolean} - True if should show coming soon, false if authorized
 */
export const shouldShowCalendarComingSoon = (user) => {
  return !isCalendarFeatureAuthorized(user);
};

/**
 * Get the calendar button text based on user authorization
 * @param {Object} user - The authenticated user object
 * @param {boolean} isConnected - Whether calendar is already connected
 * @returns {string} - Button text to display
 */
export const getCalendarButtonText = (user, isConnected = false) => {
  if (shouldShowCalendarComingSoon(user)) {
    return 'Calendar (Coming Soon)';
  }
  
  return isConnected ? 'Manage Calendar' : 'Connect Calendar';
};

/**
 * Instructions for enabling the calendar feature:
 * 
 * 1. Add test user emails to AUTHORIZED_TEST_USERS array above
 * 2. Set CALENDAR_FEATURE_ENABLED to true 
 * 3. Test with authorized users
 * 4. When ready for all users, modify isCalendarFeatureAuthorized to return true for all users
 * 5. Remove the coming soon modal and this utility file
 */