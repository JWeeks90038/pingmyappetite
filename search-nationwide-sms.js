// Search nationwide for SMS-enabled numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function searchNationwide() {
  console.log('🌎 Searching nationwide for SMS-enabled local numbers...\n');
  
  try {
    // Search without area code restrictions
    console.log('🔍 Searching for ANY local numbers with SMS...');
    const localNumbers = await client.availablePhoneNumbers('US')
      .local
      .list({
        smsEnabled: true,
        limit: 10
      });

    console.log(`Found ${localNumbers.length} SMS-enabled local numbers nationwide:`);
    localNumbers.forEach((number, index) => {
      console.log(`   ${index + 1}. ${number.phoneNumber}`);
      console.log(`      SMS: ${number.capabilities.sms ? '✅' : '❌'}`);
      console.log(`      Voice: ${number.capabilities.voice ? '✅' : '❌'}`);
      console.log(`      MMS: ${number.capabilities.mms ? '✅' : '❌'}`);
      console.log(`      Region: ${number.region || 'Unknown'}`);
      console.log('');
    });

    if (localNumbers.length > 0) {
      const firstSMS = localNumbers.find(n => n.capabilities.sms);
      if (firstSMS) {
        console.log(`🎯 RECOMMENDED: ${firstSMS.phoneNumber}`);
        console.log(`To purchase this number, run:`);
        console.log(`node purchase-twilio-number.js "${firstSMS.phoneNumber}"`);
        console.log('\n' + '='.repeat(50));
      }
    }

  } catch (error) {
    console.error('❌ Nationwide search failed:', error.message);
  }

  // Also try toll-free as backup
  try {
    console.log('\n🔍 Also checking toll-free SMS numbers...');
    const tollFreeNumbers = await client.availablePhoneNumbers('US')
      .tollFree
      .list({
        smsEnabled: true,
        limit: 5
      });

    console.log(`Found ${tollFreeNumbers.length} SMS-enabled toll-free numbers:`);
    tollFreeNumbers.forEach((number, index) => {
      console.log(`   ${index + 1}. ${number.phoneNumber} (Toll-free)`);
      console.log(`      SMS: ${number.capabilities.sms ? '✅' : '❌'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Toll-free search failed:', error.message);
  }

  // Manual instructions
  console.log('\n' + '='.repeat(60));
  console.log('📋 MANUAL OPTION - Twilio Console:');
  console.log('1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/search');
  console.log('2. Select "Local" number type');
  console.log('3. Check "SMS" capability');
  console.log('4. Try different area codes: 212, 310, 415, 206, etc.');
  console.log('5. Purchase for ~$1/month');
  console.log('6. Copy the new number to replace +18889926191 in .env.local');
  console.log('\n💡 Pro tip: East Coast area codes (212, 646, 718) often have better SMS availability');
}

searchNationwide();
