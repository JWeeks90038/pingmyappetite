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
 
    } else {
  
      if (result.result?.details) {
 
      }
    }
  } catch (error) {
 
  }
}

async function testWelcomeSMSFunction(phoneNumber, username, role, plan) {

  
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
 
    } else {
  
      if (result.result?.details) {
    
      }
    }
  } catch (error) {

  }
}

// Test with your phone number
const testPhone = '+7602711244';



// Run basic SMS test
await testSMSFunction(testPhone);

// Wait a moment
await new Promise(resolve => setTimeout(resolve, 2000));

// Run welcome SMS test
await testWelcomeSMSFunction(testPhone, 'Test User', 'customer', '');


process.exit(0);
