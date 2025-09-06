// Check Twilio account status and capabilities
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkAccountStatus() {
  console.log('🔍 Checking Twilio account status and capabilities...\n');
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiSid = process.env.TWILIO_API_SID;
    const apiSecretKey = process.env.TWILIO_API_SECRET_KEY;
    
    const client = twilio(apiSid, apiSecretKey, { accountSid });
    
    // Check account details
    console.log('📊 Account Information:');
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`   Account SID: ${account.sid}`);
    console.log(`   Friendly Name: ${account.friendlyName}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Type: ${account.type}`);
    console.log('');
    
    // Check if account is a trial account
    if (account.type === 'Trial') {
      console.log('⚠️  TRIAL ACCOUNT DETECTED');
      console.log('Trial accounts have restrictions:');
      console.log('1. Can only send SMS to verified phone numbers');
      console.log('2. Messages include "Sent from your Twilio trial account" prefix');
      console.log('3. Limited to verified numbers only\n');
      
      // Check verified phone numbers
      console.log('📱 Checking verified phone numbers...');
      try {
        const validationRequests = await client.validationRequests.list();
        console.log(`   Found ${validationRequests.length} verification requests`);
        
        const outgoingCallerIds = await client.outgoingCallerIds.list();
        console.log(`   Verified phone numbers: ${outgoingCallerIds.length}`);
        
        if (outgoingCallerIds.length === 0) {
          console.log('❌ No phone numbers are verified for SMS!');
          console.log('\n💡 TO FIX THIS:');
          console.log('1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
          console.log('2. Click "Add a new number"');
          console.log('3. Verify your phone number');
          console.log('4. Then test SMS to that verified number');
        } else {
          console.log('✅ Verified numbers:');
          outgoingCallerIds.forEach(number => {
            console.log(`   - ${number.phoneNumber} (${number.friendlyName})`);
          });
        }
        
      } catch (error) {
        console.log('❌ Error checking verified numbers:', error.message);
      }
    } else {
      console.log('✅ Full Account - No SMS restrictions');
    }
    
    // Check phone number capabilities
    console.log('\n📞 Checking your Twilio phone number capabilities...');
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    
    phoneNumbers.forEach(number => {
      console.log(`   Number: ${number.phoneNumber}`);
      console.log(`   SMS Enabled: ${number.capabilities.sms}`);
      console.log(`   Voice Enabled: ${number.capabilities.voice}`);
      console.log(`   MMS Enabled: ${number.capabilities.mms}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking account:', error.message);
    
    if (error.code === 20003) {
      console.log('\n🔑 Authentication issue detected.');
      console.log('Please verify your Twilio credentials are correct.');
    }
  }
}

checkAccountStatus();
