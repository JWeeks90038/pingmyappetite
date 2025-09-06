// SMS Test Script - Run in browser console or as a test page
// This tests the deployed Firebase Functions for SMS

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './src/firebase.js';

// Initialize Firebase Functions
const functions = getFunctions(app);

// Test SMS Function
export const testSMSFunction = async (phoneNumber) => {
  try {
    console.log('🧪 Testing SMS function...');
    
    // Call the testSMS cloud function
    const testSMS = httpsCallable(functions, 'testSMS');
    const result = await testSMS({ phoneNumber });
    
    if (result.data.success) {
      console.log('✅ SMS Test Successful!');
      console.log('Message SID:', result.data.messageSid);
      console.log('Sent to:', result.data.to);
      return { success: true, result: result.data };
    } else {
      console.log('❌ SMS Test Failed:', result.data.error);
      return { success: false, error: result.data.error };
    }
  } catch (error) {
    console.log('❌ Test Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Test Welcome SMS Function
export const testWelcomeSMSFunction = async (phoneNumber, username, role, plan) => {
  try {
    console.log('🎉 Testing Welcome SMS function...');
    
    // Call the sendWelcomeSMS cloud function
    const sendWelcomeSMS = httpsCallable(functions, 'sendWelcomeSMS');
    const result = await sendWelcomeSMS({ 
      phoneNumber, 
      username: username || 'Test User',
      role: role || 'customer',
      plan: plan || 'basic'
    });
    
    if (result.data.success) {
      console.log('✅ Welcome SMS Test Successful!');
      console.log('Message SID:', result.data.messageSid);
      console.log('Sent to:', result.data.to);
      return { success: true, result: result.data };
    } else {
      console.log('❌ Welcome SMS Test Failed:', result.data.error);
      return { success: false, error: result.data.error };
    }
  } catch (error) {
    console.log('❌ Welcome Test Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Run tests if in browser
if (typeof window !== 'undefined') {
  window.testGrubanaSMS = {
    testSMS: testSMSFunction,
    testWelcome: testWelcomeSMSFunction
  };
  
  console.log('🚀 Grubana SMS Test Functions Loaded!');
  console.log('');
  console.log('Usage:');
  console.log('testGrubanaSMS.testSMS("+1234567890")');
  console.log('testGrubanaSMS.testWelcome("+1234567890", "John", "customer", "basic")');
  console.log('');
  console.log('Replace +1234567890 with your actual phone number');
}
