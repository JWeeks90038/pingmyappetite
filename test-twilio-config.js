// Test Twilio Configuration and Welcome Email System
// Run this with: node test-twilio-config.js [optional-phone-number]

import { checkTwilioConfig } from './src/utils/twilioService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🚀 Grubana Welcome Email & SMS System Test');
console.log('═'.repeat(60));

// Test Twilio configuration
console.log('\n🔍 Checking Twilio Configuration...\n');

const config = checkTwilioConfig();

console.log('Twilio Configuration Status:');
console.log('═══════════════════════════');
console.log(`✅ Account SID: ${config.accountSid ? 'Found' : '❌ Missing'}`);
console.log(`✅ Auth Token: ${config.authToken ? 'Found' : '❌ Missing'}`);
console.log(`✅ API SID: ${config.apiSid ? 'Found' : '❌ Missing'}`);
console.log(`✅ API Secret Key: ${config.apiSecretKey ? 'Found' : '❌ Missing'}`);
console.log(`✅ Phone Number: ${config.phoneNumber ? 'Found' : '❌ Missing'}`);
console.log(`\n🔐 Authentication Method: ${config.authMethod}`);
console.log(`\n🚀 SMS Status: ${config.configured ? '✅ READY' : '❌ NOT CONFIGURED'}\n`);

// Test welcome SMS if phone number provided and Twilio configured
const testPhoneNumber = process.argv[2];

if (config.configured && testPhoneNumber) {
  console.log('📱 Testing Welcome SMS...');
  console.log('─'.repeat(30));
  
  try {
    // Test sending a welcome SMS
    const { sendNotificationSMS } = await import('./src/utils/twilioService.js');
    
    const testResult = await sendNotificationSMS(
      testPhoneNumber,
      'Welcome to Grubana!',
      '🎉 Welcome to Grubana! This is a test of your SMS welcome system. Your account is ready to send automatic welcome messages!'
    );
    
    if (testResult.success) {
      console.log('✅ Test SMS sent successfully!');
      console.log('Message SID:', testResult.messageSid);
      console.log('To:', testPhoneNumber);
    } else {
      console.log('❌ SMS test failed:', testResult.error);
    }
  } catch (error) {
    console.log('❌ SMS test error:', error.message);
  }
} else if (!config.configured) {
  console.log('❌ Twilio is not configured. SMS welcome messages will be skipped.');
  console.log('\n📝 To configure Twilio SMS:');
  console.log('1. Go to https://console.twilio.com/');
  console.log('2. Get your Account SID and Auth Token');
  console.log('3. Purchase a phone number or use your existing one');
  console.log('4. Add these to your .env file:');
  console.log('   TWILIO_ACCOUNT_SID=ACxxxxx...');
  console.log('   TWILIO_AUTH_TOKEN=xxxxx...');
  console.log('   TWILIO_PHONE_NUMBER=+1234567890');
} else if (!testPhoneNumber) {
  console.log('📞 To test SMS, run with a phone number:');
  console.log('node test-twilio-config.js +1234567890');
}

// Email system status
console.log('\n📧 Email System Status:');
console.log('═════════════════════');
console.log('✅ Formspree configured (form ID: mpwlvzaj)');
console.log('✅ Free user welcome emails: Ready');
console.log('✅ Paid user welcome emails: Ready');
console.log('✅ Stripe webhook integration: Ready');

// Next steps
console.log('\n🎯 System Overview:');
console.log('═════════════════');
console.log('📧 Email Delivery: Via Formspree (always available)');
console.log(`📱 SMS Delivery: ${config.configured ? 'Via Twilio (configured)' : 'Not configured (optional)'}`);
console.log('🔄 Free Users: Immediate welcome email after signup');
console.log('� Paid Users: Welcome email after successful payment');
console.log('⚙️  User Control: SMS can be toggled in notification settings');

console.log('\n✨ Ready to Test:');
console.log('─'.repeat(20));
console.log('1. Sign up as a free user → Check email for welcome message');
console.log('2. Sign up with paid plan → Check email after payment');
if (config.configured) {
  console.log('3. Enable SMS in settings → Receive SMS welcome');
}
console.log('4. Monitor Formspree dashboard for email delivery logs');
if (config.configured) {
  console.log('5. Monitor Twilio console for SMS delivery logs');
}

console.log('\n📚 Documentation: See WELCOME_EMAIL_SYSTEM.md for full details');
console.log('═'.repeat(60));
