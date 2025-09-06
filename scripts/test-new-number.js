// Test SMS with new Twilio number
import { sendNotificationSMS } from './src/utils/twilioService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testNewNumber() {
  console.log('🧪 Testing SMS with your new Twilio number...\n');
  
  console.log('Current configuration:');
  console.log(`From: ${process.env.TWILIO_PHONE_NUMBER}`);
  console.log(`To: +17602711244 (your number)`);
  console.log('');
  
  try {
    console.log('📱 Sending test SMS...');
    
    const result = await sendNotificationSMS(
      '+17602711244',
      '🎉 SUCCESS! Your new Twilio number is working perfectly for SMS delivery!'
    );
    
    if (result.success) {
      console.log('✅ SMS sent successfully!');
      console.log(`   Message SID: ${result.messageSid}`);
      console.log(`   Status: ${result.status}`);
      console.log('');
      console.log('📞 Check your phone - you should receive the test message!');
      console.log('');
      console.log('🎯 Next steps:');
      console.log('1. Verify you received the SMS');
      console.log('2. Test your app signup/notification flow');
      console.log('3. Deploy to Railway with the new number');
      console.log('4. Celebrate! 🎉');
    } else {
      console.log('❌ SMS failed:', result.error);
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('1. Verify the new number has SMS capability');
      console.log('2. Check Twilio account balance');
      console.log('3. Try a different phone number');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('💡 Make sure you:');
    console.log('1. Purchased an SMS-enabled number');
    console.log('2. Updated .env.local with the new number');
    console.log('3. Have sufficient Twilio balance');
  }
}

testNewNumber();
