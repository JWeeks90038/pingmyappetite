// Search for local SMS-enabled Twilio numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function searchForLocalNumbers() {
  console.log('🔍 Searching for local SMS-enabled phone numbers...\n');
  
  try {
    // Search for local numbers in various California area codes
    const areaCodes = ['760', '619', '858', '442', '714', '949', '951', '909'];
    
    console.log('Looking for SMS-enabled local numbers in these area codes:');
    console.log(areaCodes.join(', '));
    console.log('\n' + '='.repeat(60) + '\n');
    
    for (const areaCode of areaCodes) {
      console.log(`🔍 Searching area code ${areaCode}...`);
      
      try {
        const availableNumbers = await client.availablePhoneNumbers('US')
          .local
          .list({
            areaCode: areaCode,
            smsEnabled: true,
            limit: 5
          });

        if (availableNumbers.length > 0) {
          console.log(`✅ Found ${availableNumbers.length} SMS-enabled numbers in ${areaCode}:`);
          availableNumbers.forEach((number, index) => {
            console.log(`   ${index + 1}. ${number.phoneNumber}`);
            console.log(`      - SMS: ${number.capabilities.sms ? '✅' : '❌'}`);
            console.log(`      - Voice: ${number.capabilities.voice ? '✅' : '❌'}`);
            console.log(`      - Monthly Cost: ~$1.00`);
            console.log('');
          });
          
          console.log(`🛒 To purchase one of these numbers, run:`);
          console.log(`node purchase-twilio-number.js "${availableNumbers[0].phoneNumber}"`);
          console.log('\n' + '-'.repeat(40) + '\n');
        } else {
          console.log(`❌ No SMS-enabled numbers available in ${areaCode}\n`);
        }
      } catch (error) {
        console.log(`❌ Error searching ${areaCode}: ${error.message}\n`);
      }
    }
    
    console.log('💡 Pro Tips:');
    console.log('• Local numbers have much better SMS delivery rates');
    console.log('• Choose any area code - it doesn\'t have to match your location');
    console.log('• Monthly cost is typically $1.00 per number');
    console.log('• You can keep your toll-free number and just add a local one');
    console.log('\nReady to purchase? Choose a number and I\'ll help you buy it!');
    
  } catch (error) {
    console.error('❌ Error searching for numbers:', error.message);
  }
}

searchForLocalNumbers();
