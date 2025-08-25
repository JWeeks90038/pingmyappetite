// Check Twilio phone number reputation and status
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkTwilioNumberReputation() {
  console.log('🔍 Checking Twilio phone number reputation and status...\n');
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    
    const client = twilio(accountSid, authToken);
    
    console.log(`📞 Analyzing Twilio number: ${twilioNumber}\n`);
    
    // 1. Get detailed phone number info
    console.log('🔍 Step 1: Phone number configuration...');
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    const myNumber = phoneNumbers.find(num => num.phoneNumber === twilioNumber);
    
    if (myNumber) {
      console.log('📊 Number Configuration:');
      console.log(`   Phone Number: ${myNumber.phoneNumber}`);
      console.log(`   Friendly Name: ${myNumber.friendlyName}`);
      console.log(`   SMS Capable: ${myNumber.capabilities.sms}`);
      console.log(`   Voice Capable: ${myNumber.capabilities.voice}`);
      console.log(`   MMS Capable: ${myNumber.capabilities.mms}`);
      console.log(`   Status: ${myNumber.status || 'Active'}`);
      console.log(`   Date Created: ${myNumber.dateCreated}`);
    }
    
    // 2. Check recent successful deliveries
    console.log('\n🔍 Step 2: Recent delivery history...');
    const allMessages = await client.messages.list({ 
      from: twilioNumber,
      limit: 50 
    });
    
    const delivered = allMessages.filter(msg => msg.status === 'delivered').length;
    const failed = allMessages.filter(msg => msg.status === 'failed' || msg.status === 'undelivered').length;
    const total = allMessages.length;
    
    console.log('📊 Delivery Statistics:');
    console.log(`   Total messages sent: ${total}`);
    console.log(`   Successfully delivered: ${delivered}`);
    console.log(`   Failed/Undelivered: ${failed}`);
    console.log(`   Success rate: ${total > 0 ? ((delivered / total) * 100).toFixed(1) : 0}%`);
    
    if (delivered > 0) {
      console.log('\n✅ This number has successfully delivered SMS before');
      
      // Show recent successful deliveries
      const recentSuccess = allMessages.filter(msg => msg.status === 'delivered').slice(0, 3);
      console.log('\n📱 Recent successful deliveries:');
      recentSuccess.forEach((msg, index) => {
        console.log(`   ${index + 1}. To: ${msg.to} on ${new Date(msg.dateCreated).toLocaleDateString()}`);
      });
    } else {
      console.log('\n❌ This number has never successfully delivered SMS');
      console.log('💡 This could indicate:');
      console.log('   - Number is flagged as spam');
      console.log('   - Number needs reputation building');
      console.log('   - Account needs verification');
    }
    
    // 3. Check if this is a toll-free vs local number
    console.log('\n🔍 Step 3: Number type analysis...');
    if (twilioNumber.startsWith('+1888') || twilioNumber.startsWith('+1800') || 
        twilioNumber.startsWith('+1877') || twilioNumber.startsWith('+1866')) {
      console.log('📞 This is a TOLL-FREE number');
      console.log('💡 Toll-free numbers often have stricter spam filtering');
      console.log('💡 Consider using a local area code number for better delivery');
    } else {
      console.log('📞 This is a LOCAL number');
      console.log('✅ Local numbers typically have better delivery rates');
    }
    
    // 4. Suggest solutions
    console.log('\n💡 Potential Solutions:');
    console.log('1. Try buying a local number (same area code as target: 760)');
    console.log('2. Contact Twilio support about delivery issues');
    console.log('3. Register for 10DLC (if sending to US numbers regularly)');
    console.log('4. Test with a different phone number to isolate the issue');
    
  } catch (error) {
    console.error('❌ Error checking number reputation:', error.message);
  }
}

checkTwilioNumberReputation();
