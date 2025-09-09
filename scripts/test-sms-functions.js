// SMS Test Script - Run in browser console or as a test page
// This tests the deployed Firebase Functions for SMS

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './src/firebase.js';

// Initialize Firebase Functions
const functions = getFunctions(app);

// Test SMS Function
export const testSMSFunction = async (phoneNumber) => {
  try {

    
    // Call the testSMS cloud function
    const testSMS = httpsCallable(functions, 'testSMS');
    const result = await testSMS({ phoneNumber });
    
    if (result.data.success) {
 
      return { success: true, result: result.data };
    } else {
    
      return { success: false, error: result.data.error };
    }
  } catch (error) {
    
    return { success: false, error: error.message };
  }
};

// Test Welcome SMS Function
export const testWelcomeSMSFunction = async (phoneNumber, username, role, plan) => {
  try {

    
    // Call the sendWelcomeSMS cloud function
    const sendWelcomeSMS = httpsCallable(functions, 'sendWelcomeSMS');
    const result = await sendWelcomeSMS({ 
      phoneNumber, 
      username: username || 'Test User',
      role: role || 'customer',
      plan: plan || 'basic'
    });
    
    if (result.data.success) {
      return { success: true, result: result.data };
    } else {
  
      return { success: false, error: result.data.error };
    }
  } catch (error) {
  
    return { success: false, error: error.message };
  }
};

// Run tests if in browser
if (typeof window !== 'undefined') {
  window.testGrubanaSMS = {
    testSMS: testSMSFunction,
    testWelcome: testWelcomeSMSFunction
  };
  

}
