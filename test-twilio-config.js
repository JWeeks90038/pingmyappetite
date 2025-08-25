// Test Twilio Configuration
// Run this with: node test-twilio-config.js

import { checkTwilioConfig } from './src/utils/twilioService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 Checking Twilio Configuration...\n');

const config = checkTwilioConfig();

console.log('Configuration Status:');
console.log('═══════════════════════');
console.log(`✅ Account SID: ${config.accountSid ? 'Found' : '❌ Missing'}`);
console.log(`✅ Auth Token: ${config.authToken ? 'Found' : '❌ Missing'}`);
console.log(`✅ API SID: ${config.apiSid ? 'Found' : '❌ Missing'}`);
console.log(`✅ API Secret Key: ${config.apiSecretKey ? 'Found' : '❌ Missing'}`);
console.log(`✅ Phone Number: ${config.phoneNumber ? 'Found' : '❌ Missing'}`);
console.log(`\n🔐 Authentication Method: ${config.authMethod}`);
console.log(`\n🚀 Overall Status: ${config.configured ? '✅ READY' : '❌ NOT CONFIGURED'}\n`);

if (!config.configured) {
  console.log('❌ Twilio is not properly configured. Please check your .env.local file.');
  console.log('\nRequired environment variables:');
  if (!config.accountSid) console.log('- TWILIO_ACCOUNT_SID');
  if (!config.authToken && !config.apiSid) console.log('- TWILIO_AUTH_TOKEN or TWILIO_API_SID');
  if (!config.apiSecretKey && config.apiSid) console.log('- TWILIO_API_SECRET_KEY (if using API SID)');
  if (!config.phoneNumber) console.log('- TWILIO_PHONE_NUMBER');
} else {
  console.log('✅ Twilio is properly configured and ready to send SMS!');
  
  if (config.authMethod === 'API Key') {
    console.log('🔒 Using enhanced API Key authentication (recommended for production)');
  } else {
    console.log('🔑 Using basic authentication (Account SID + Auth Token)');
  }
}
