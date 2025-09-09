#!/usr/bin/env node

// Interactive Twilio Setup and SMS Test
// Run with: node setup-twilio-test.js

import readline from 'readline';
import fs from 'fs';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});



const envPath = path.join(process.cwd(), '.env');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function updateEnvFile(accountSid, authToken, phoneNumber) {
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace Twilio placeholders with actual values
    envContent = envContent.replace(
      /TWILIO_ACCOUNT_SID=.*/,
      `TWILIO_ACCOUNT_SID=${accountSid}`
    );
    envContent = envContent.replace(
      /TWILIO_AUTH_TOKEN=.*/,
      `TWILIO_AUTH_TOKEN=${authToken}`
    );
    envContent = envContent.replace(
      /TWILIO_PHONE_NUMBER=.*/,
      `TWILIO_PHONE_NUMBER=${phoneNumber}`
    );
    
    fs.writeFileSync(envPath, envContent);
  
    return true;
  } catch (error) {
  
    return false;
  }
}

async function testSMS(testPhoneNumber) {
  try {
    // Reload environment variables
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config();
    
    // Import Twilio service
    const { sendNotificationSMS } = await import('./src/utils/twilioService.js');
    
 
    
    const result = await sendNotificationSMS(
      testPhoneNumber,
      'Grubana SMS Test',
      '🎉 Success! Your Grubana SMS system is working perfectly. Welcome messages will now be sent automatically when users sign up!'
    );
    
    if (result.success) {

    } else {
     
    }
    
    return result.success;
  } catch (error) {
 
    return false;
  }
}

async function main() {
  try {

    
    const proceed = await question('Do you have your Twilio credentials ready? (y/n): ');
    
    if (proceed.toLowerCase() !== 'y') {
   
      rl.close();
      return;
    }
    

    const accountSid = await question('Account SID (starts with AC): ');
    const authToken = await question('Auth Token: ');
    const phoneNumber = await question('Twilio Phone Number (format: +1234567890): ');
    
    if (!accountSid.startsWith('AC') || !authToken || !phoneNumber.startsWith('+')) {
    
      rl.close();
      return;
    }
    
    const updated = await updateEnvFile(accountSid, authToken, phoneNumber);
    
    if (updated) {

      const testPhone = await question('Enter a phone number to test SMS (format: +1234567890): ');
      
      if (testPhone.startsWith('+')) {
        await testSMS(testPhone);
        
   
      } else {
  
      }
    }
    
  } catch (error) {
  
  } finally {
    rl.close();
  }
}

main();
