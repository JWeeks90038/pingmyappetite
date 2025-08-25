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

console.log('🚀 Grubana SMS Setup & Test');
console.log('═'.repeat(50));
console.log('This will help you configure and test SMS messaging.\n');

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
    console.log('✅ .env file updated successfully!\n');
    return true;
  } catch (error) {
    console.log('❌ Error updating .env file:', error.message);
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
    
    console.log('📱 Sending test SMS...');
    
    const result = await sendNotificationSMS(
      testPhoneNumber,
      'Grubana SMS Test',
      '🎉 Success! Your Grubana SMS system is working perfectly. Welcome messages will now be sent automatically when users sign up!'
    );
    
    if (result.success) {
      console.log('✅ SMS sent successfully!');
      console.log('Message SID:', result.messageSid);
      console.log('To:', testPhoneNumber);
      console.log('\nCheck your phone for the test message! 📱');
    } else {
      console.log('❌ SMS failed:', result.error);
    }
    
    return result.success;
  } catch (error) {
    console.log('❌ Test error:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('📋 To get your Twilio credentials:');
    console.log('1. Go to https://console.twilio.com/');
    console.log('2. Log in to your account');
    console.log('3. Find Account SID and Auth Token on the dashboard');
    console.log('4. Get a phone number from Phone Numbers > Manage > Active numbers\n');
    
    const proceed = await question('Do you have your Twilio credentials ready? (y/n): ');
    
    if (proceed.toLowerCase() !== 'y') {
      console.log('\n📝 Please get your Twilio credentials first, then run this script again.');
      console.log('Visit: https://console.twilio.com/');
      rl.close();
      return;
    }
    
    console.log('\n🔐 Enter your Twilio credentials:');
    const accountSid = await question('Account SID (starts with AC): ');
    const authToken = await question('Auth Token: ');
    const phoneNumber = await question('Twilio Phone Number (format: +1234567890): ');
    
    if (!accountSid.startsWith('AC') || !authToken || !phoneNumber.startsWith('+')) {
      console.log('❌ Invalid credentials format. Please check and try again.');
      rl.close();
      return;
    }
    
    const updated = await updateEnvFile(accountSid, authToken, phoneNumber);
    
    if (updated) {
      console.log('🧪 Ready to test SMS!');
      const testPhone = await question('Enter a phone number to test SMS (format: +1234567890): ');
      
      if (testPhone.startsWith('+')) {
        await testSMS(testPhone);
        
        console.log('\n✨ SMS Setup Complete!');
        console.log('Your welcome email and SMS system is now ready.');
        console.log('\n🎯 Next steps:');
        console.log('1. Test signup flow with SMS consent enabled');
        console.log('2. Check both email and SMS welcome messages');
        console.log('3. Monitor Twilio console for delivery logs');
      } else {
        console.log('❌ Invalid phone number format.');
      }
    }
    
  } catch (error) {
    console.log('❌ Setup error:', error.message);
  } finally {
    rl.close();
  }
}

main();
