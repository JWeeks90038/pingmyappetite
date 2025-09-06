// Check available Twilio phone numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkTwilioNumbers() {
  console.log('🔍 Checking available Twilio phone numbers...\n');
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiSid = process.env.TWILIO_API_SID;
    const apiSecretKey = process.env.TWILIO_API_SECRET_KEY;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    let client;
    if (apiSid && apiSecretKey) {
      client = twilio(apiSid, apiSecretKey, { accountSid });
      console.log('🔐 Using API Key authentication');
    } else {
      client = twilio(accountSid, authToken);
      console.log('🔑 Using basic authentication');
    }
    
    // Get incoming phone numbers
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    
    console.log(`📱 Found ${phoneNumbers.length} phone number(s) in your account:\n`);
    
    if (phoneNumbers.length === 0) {
      console.log('❌ No phone numbers found in your Twilio account!');
      console.log('\n💡 You need to:');
      console.log('1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/search');
      console.log('2. Buy a phone number');
      console.log('3. Update your .env.local file with the purchased number');
    } else {
      phoneNumbers.forEach((number, index) => {
        console.log(`${index + 1}. ${number.phoneNumber}`);
        console.log(`   Friendly Name: ${number.friendlyName || 'None'}`);
        console.log(`   Capabilities: ${JSON.stringify(number.capabilities)}`);
        console.log('');
      });
      
      console.log('✅ Use one of these numbers in your .env.local file as TWILIO_PHONE_NUMBER');
    }
    
  } catch (error) {
    console.error('❌ Error checking phone numbers:', error.message);
    
    if (error.code === 20003) {
      console.log('\n💡 Authentication failed. Please check your Twilio credentials.');
    }
  }
}

checkTwilioNumbers();
