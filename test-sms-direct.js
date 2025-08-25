import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'foodtruckfinder-27eba'
});

// Test the SMS functions directly using HTTPS requests
async function testSMSFunction(phoneNumber) {
  console.log('\n🚀 Testing Basic SMS...');
  console.log(`📱 Sending to: ${phoneNumber}`);
  
  try {
    // Call the deployed function directly via HTTPS
    const response = await fetch('https://us-central1-foodtruckfinder-27eba.cloudfunctions.net/testSMS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          phoneNumber: phoneNumber
        }
      })
    });
    
    const result = await response.json();
    
    if (result.result && result.result.success) {
      console.log('✅ SUCCESS!');
      console.log(`📤 Message sent to: ${result.result.to}`);
      console.log(`📧 Message SID: ${result.result.messageSid}`);
      console.log('💬 Message: "Hello from PingMyAppetite! This is a test message."');
      console.log('\n🔔 Check your phone for the SMS!');
    } else {
      console.log('❌ FAILED!');
      console.log(`Error: ${result.error || result.result?.error || 'Unknown error'}`);
      if (result.result?.details) {
        console.log(`Details: ${JSON.stringify(result.result.details, null, 2)}`);
      }
    }
  } catch (error) {
    console.log('❌ FUNCTION CALL FAILED!');
    console.log(`Error: ${error.message}`);
    console.log(`Full error:`, error);
  }
}

async function testWelcomeSMSFunction(phoneNumber, username, role, plan) {
  console.log('\n🎉 Testing Welcome SMS...');
  console.log(`📱 Sending to: ${phoneNumber}`);
  console.log(`👤 Username: ${username}`);
  console.log(`🎭 Role: ${role}`);
  console.log(`📦 Plan: ${plan || 'none'}`);
  
  try {
    const response = await fetch('https://us-central1-foodtruckfinder-27eba.cloudfunctions.net/sendWelcomeSMS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          phoneNumber: phoneNumber,
          username: username,
          role: role,
          plan: plan || undefined
        }
      })
    });
    
    const result = await response.json();
    
    if (result.result && result.result.success) {
      console.log('✅ SUCCESS!');
      console.log(`📤 Message sent to: ${result.result.to}`);
      console.log(`📧 Message SID: ${result.result.messageSid}`);
      console.log('\n🔔 Check your phone for the welcome SMS!');
    } else {
      console.log('❌ FAILED!');
      console.log(`Error: ${result.error || result.result?.error || 'Unknown error'}`);
      if (result.result?.details) {
        console.log(`Details: ${JSON.stringify(result.result.details, null, 2)}`);
      }
    }
  } catch (error) {
    console.log('❌ FUNCTION CALL FAILED!');
    console.log(`Error: ${error.message}`);
    console.log(`Full error:`, error);
  }
}

// Test with your phone number
const testPhone = '+7602711244';

console.log('🔥 Direct Firebase Functions SMS Test');
console.log('=====================================');
console.log('✅ Using deployed Firebase Functions');
console.log('📍 Functions region: us-central1');
console.log('💰 Using real Twilio credentials');

// Run basic SMS test
await testSMSFunction(testPhone);

// Wait a moment
await new Promise(resolve => setTimeout(resolve, 2000));

// Run welcome SMS test
await testWelcomeSMSFunction(testPhone, 'Test User', 'customer', '');

console.log('\n✨ Testing complete!');
process.exit(0);
