// Search for truly SMS-enabled local numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function findSMSNumbers() {
  console.log('🔍 Searching for ACTUALLY SMS-enabled local numbers...\n');
  
  try {
    // Try different search approaches
    const searches = [
      { type: 'local', areaCode: '619' },
      { type: 'local', areaCode: '858' },
      { type: 'local', areaCode: '760' },
      { type: 'local', areaCode: '714' },
      { type: 'mobile', areaCode: '619' }
    ];
    
    for (const search of searches) {
      console.log(`🔍 Searching ${search.type} numbers in ${search.areaCode}...`);
      
      try {
        let searchResults;
        if (search.type === 'local') {
          searchResults = await client.availablePhoneNumbers('US')
            .local
            .list({
              areaCode: search.areaCode,
              smsEnabled: true,
              voiceEnabled: true,
              limit: 3
            });
        } else {
          searchResults = await client.availablePhoneNumbers('US')
            .mobile
            .list({
              areaCode: search.areaCode,
              smsEnabled: true,
              limit: 3
            });
        }

        console.log(`Found ${searchResults.length} numbers:`);
        searchResults.forEach((number, index) => {
          console.log(`   ${index + 1}. ${number.phoneNumber}`);
          console.log(`      SMS: ${number.capabilities.sms ? '✅ YES' : '❌ NO'}`);
          console.log(`      Voice: ${number.capabilities.voice ? '✅ YES' : '❌ NO'}`);
          console.log(`      MMS: ${number.capabilities.mms ? '✅ YES' : '❌ NO'}`);
          console.log('');
        });
        
        // If we find SMS-enabled numbers, show purchase command
        const smsNumbers = searchResults.filter(n => n.capabilities.sms);
        if (smsNumbers.length > 0) {
          console.log(`🎯 FOUND ${smsNumbers.length} SMS-ENABLED NUMBERS!`);
          console.log(`To purchase ${smsNumbers[0].phoneNumber}, run:`);
          console.log(`node purchase-twilio-number.js "${smsNumbers[0].phoneNumber}"`);
          console.log('\n' + '='.repeat(50) + '\n');
          return; // Stop searching once we find SMS numbers
        }
        
      } catch (error) {
        console.log(`❌ Error searching ${search.type} ${search.areaCode}: ${error.message}`);
      }
      
      console.log('\n' + '-'.repeat(30) + '\n');
    }
    
    // If no SMS numbers found, show alternative
    console.log('🤔 No SMS-enabled local numbers found in common area codes.');
    console.log('\n💡 Alternative options:');
    console.log('1. Try Twilio Console directly: https://console.twilio.com/us1/develop/phone-numbers/manage/search');
    console.log('2. Search nationwide (any area code)');
    console.log('3. Use a different carrier like Bandwidth or Telnyx');
    console.log('\nWant me to search nationwide for ANY SMS-enabled local number?');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check Twilio credentials in .env.local');
    console.log('2. Verify account has sufficient balance');
    console.log('3. Try Twilio Console web interface');
  }
}

findSMSNumbers();
