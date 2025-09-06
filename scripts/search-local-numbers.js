// Search for available local phone numbers in 760 area code
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function searchLocalNumbers() {
  console.log('🔍 Searching for local phone numbers in 760 area code...\n');
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);
    
    // Search for available local numbers in 760 area code (same as target number)
    console.log('📱 Searching for 760 area code numbers...');
    const localNumbers = await client.availablePhoneNumbers('US').local.list({
      areaCode: 760,
      smsEnabled: true,
      limit: 10
    });
    
    if (localNumbers.length > 0) {
      console.log(`✅ Found ${localNumbers.length} available local numbers in 760 area code:\n`);
      localNumbers.forEach((number, index) => {
        console.log(`${index + 1}. ${number.phoneNumber}`);
        console.log(`   Friendly Name: ${number.friendlyName}`);
        console.log(`   SMS: ${number.capabilities.sms ? '✅' : '❌'}`);
        console.log(`   Voice: ${number.capabilities.voice ? '✅' : '❌'}`);
        console.log(`   MMS: ${number.capabilities.mms ? '✅' : '❌'}`);
        console.log('');
      });
      
      console.log('💡 To purchase one of these numbers:');
      console.log('1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/search');
      console.log('2. Search for 760 area code');
      console.log('3. Buy a local number');
      console.log('4. Update your .env.local file with the new number');
      
    } else {
      console.log('❌ No local numbers available in 760 area code');
      console.log('Let me try other California area codes...\n');
      
      // Try other California area codes
      const californiaAreaCodes = [619, 858, 951, 714, 949];
      
      for (const areaCode of californiaAreaCodes) {
        console.log(`📱 Checking ${areaCode} area code...`);
        const numbers = await client.availablePhoneNumbers('US').local.list({
          areaCode: areaCode,
          smsEnabled: true,
          limit: 3
        });
        
        if (numbers.length > 0) {
          console.log(`   ✅ Found ${numbers.length} numbers in ${areaCode}`);
          numbers.forEach(num => console.log(`      ${num.phoneNumber}`));
        } else {
          console.log(`   ❌ No numbers in ${areaCode}`);
        }
      }
    }
    
    console.log('\n🎯 Why local numbers work better:');
    console.log('✅ Higher delivery rates (less spam filtering)');
    console.log('✅ Better carrier acceptance');
    console.log('✅ Familiar area code for recipients');
    console.log('✅ Lower cost than toll-free');
    
  } catch (error) {
    console.error('❌ Error searching for numbers:', error.message);
  }
}

searchLocalNumbers();
