/**
 * Test Welcome Email System with SendGrid
 * 
 * This script helps test the welcome email functionality.
 * Run this in the Firebase console or as a separate test.
 */

import { sendWelcomeEmail } from './welcomeEmailService.js';

// Test data for different user types
const testUsers = {
  customer: {
    username: 'John Doe',
    email: 'test.customer@example.com', // Change to your test email
    role: 'customer'
  },
  owner: {
    ownerName: 'Jane Smith',
    truckName: 'Awesome Tacos',
    email: 'test.owner@example.com', // Change to your test email
    role: 'owner',
    plan: 'premium'
  },
  organizer: {
    contactName: 'Mike Johnson',
    organizationName: 'City Events',
    organizationType: 'Community Organization',
    email: 'test.organizer@example.com', // Change to your test email
    role: 'organizer',
    referralCode: 'Arayaki_Hibachi'
  }
};

/**
 * Test the welcome email system with SendGrid
 */
export const testWelcomeEmails = async () => {


  for (const [userType, userData] of Object.entries(testUsers)) {

    
    try {
      const result = await sendWelcomeEmail(userData, userType);
      
      if (result.success) {
     
      } else {
      
      }
    } catch (error) {
    
    }
    
    // Add a small delay between emails
    await new Promise(resolve => setTimeout(resolve, 1000));
 
  }
  

};

/**
 * Test a single user type
 */
export const testSingleWelcomeEmail = async (userType = 'customer', testEmail = 'your.test@email.com') => {
  const userData = {
    ...testUsers[userType],
    email: testEmail
  };
  

  
  try {
    const result = await sendWelcomeEmail(userData, userType);
    
    if (result.success) {

    } else {
      
    }
  } catch (error) {
    
  }
};

// Uncomment and modify to run tests:
// testSingleWelcomeEmail('customer', 'your.test@email.com');
