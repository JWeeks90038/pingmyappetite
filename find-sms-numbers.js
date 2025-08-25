// Search for SMS-enabled local numbers in California
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function findSMSEnabledNumbers() {
  console.log('🔍 Searching for SMS-enabled local numbers in California...\n');
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);
    
    // Search for any SMS-enabled local numbers (no specific area code)
    console.log('📱 Searching for any SMS-enabled local numbers...');
    const smsNumbers = await client.availablePhoneNumbers('US').local.list({
      smsEnabled: true,
      limit: 15
    });
    
    if (smsNumbers.length > 0) {
      console.log(`✅ Found ${smsNumbers.length} SMS-enabled local numbers:\n`);
      
      smsNumbers.forEach((number, index) => {
        const areaCode = number.phoneNumber.slice(2, 5); // Extract area code
        console.log(`${index + 1}. ${number.phoneNumber} (${number.friendlyName})`);
        console.log(`   Area Code: ${areaCode}`);
        console.log(`   SMS: ${number.capabilities.sms ? '✅' : '❌'}`);
        console.log(`   MMS: ${number.capabilities.mms ? '✅' : '❌'}`);
        console.log(`   Voice: ${number.capabilities.voice ? '✅' : '❌'}`);
        console.log('');
      });
      
      // Show the best options
      const bestNumbers = smsNumbers.filter(num => 
        num.capabilities.sms && num.capabilities.mms
      ).slice(0, 5);
      
      if (bestNumbers.length > 0) {
        console.log('🎯 RECOMMENDED SMS/MMS-enabled numbers:');
        bestNumbers.forEach((number, index) => {
          console.log(`${index + 1}. ${number.phoneNumber} - ${number.friendlyName}`);
        });
        
        console.log('\n📋 Next Steps:');
        console.log('1. Choose one of the recommended numbers above');
        console.log('2. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/search');
        console.log('3. Search for the specific number or area code');
        console.log('4. Purchase the number');
        console.log('5. Update TWILIO_PHONE_NUMBER in your .env.local file');
        console.log('6. Test SMS again');
        
        console.log('\n⚡ Quick Test Command:');
        console.log('Replace +18889926191 with your new number in .env.local, then run:');
        console.log('node test-sms-now.js');
      }
      
    } else {
      console.log('❌ No SMS-enabled local numbers found');
      
      // Try toll-free SMS numbers as backup
      console.log('\n📱 Checking toll-free SMS options...');
      const tollFreeNumbers = await client.availablePhoneNumbers('US').tollFree.list({
        smsEnabled: true,
        limit: 10
      });
      
      if (tollFreeNumbers.length > 0) {
        console.log(`✅ Found ${tollFreeNumbers.length} SMS-enabled toll-free numbers:`);
        tollFreeNumbers.slice(0, 5).forEach((number, index) => {
          console.log(`${index + 1}. ${number.phoneNumber} - ${number.friendlyName}`);
        });
        console.log('⚠️  Note: Toll-free numbers may still have delivery issues');
      }
    }
    
  } catch (error) {
    console.error('❌ Error searching for SMS numbers:', error.message);
  }
}

findSMSEnabledNumbers();
