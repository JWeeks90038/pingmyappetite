// Advanced SMS troubleshooting for mobile numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function advancedSMSTroubleshooting() {
  console.log('🔍 Advanced SMS troubleshooting for mobile number...\n');
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);
    
    const phoneNumber = '+17602711244';
    console.log(`📱 Troubleshooting mobile number: ${phoneNumber}\n`);
    
    // 1. Check carrier lookup with more details
    console.log('🔍 Step 1: Detailed carrier lookup...');
    try {
      const lookup = await client.lookups.v1.phoneNumbers(phoneNumber)
        .fetch({ type: ['carrier'] });
      
      console.log('📊 Carrier Information:');
      console.log(`   Phone Number: ${lookup.phoneNumber}`);
      console.log(`   Country: ${lookup.countryCode}`);
      console.log(`   National Format: ${lookup.nationalFormat}`);
      console.log(`   Carrier Name: ${lookup.carrier?.name || 'Unknown'}`);
      console.log(`   Carrier Type: ${lookup.carrier?.type || 'Unknown'}`);
      console.log(`   Mobile Country Code: ${lookup.carrier?.mobile_country_code || 'Unknown'}`);
      console.log(`   Mobile Network Code: ${lookup.carrier?.mobile_network_code || 'Unknown'}`);
      
      if (lookup.carrier?.type === 'landline') {
        console.log('❌ Carrier reports this as landline (explains the SMS failure)');
      } else if (lookup.carrier?.type === 'mobile') {
        console.log('✅ Carrier confirms this is mobile (SMS should work)');
      } else if (lookup.carrier?.type === 'voip') {
        console.log('⚠️  This is a VoIP number (SMS delivery can be unreliable)');
      }
      
    } catch (lookupError) {
      console.log('❌ Carrier lookup failed:', lookupError.message);
    }
    
    // 2. Try different message formats
    console.log('\n🔍 Step 2: Testing different message formats...');
    
    const testMessages = [
      {
        name: 'Simple text only',
        body: 'Test SMS from Grubana - simple text only'
      },
      {
        name: 'No emojis',
        body: 'Grubana Test - This is a test SMS without emojis'
      },
      {
        name: 'Short message',
        body: 'Grubana test'
      }
    ];
    
    for (const testMsg of testMessages) {
      console.log(`📤 Testing: ${testMsg.name}...`);
      try {
        const message = await client.messages.create({
          body: testMsg.body,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        
        console.log(`   ✅ Sent! SID: ${message.sid}, Status: ${message.status}`);
        
        // Wait a moment and check status
        setTimeout(async () => {
          try {
            const updatedMessage = await client.messages(message.sid).fetch();
            console.log(`   📊 Final status: ${updatedMessage.status}`);
            if (updatedMessage.errorCode) {
              console.log(`   ❌ Error: ${updatedMessage.errorCode} - ${updatedMessage.errorMessage}`);
            }
          } catch (error) {
            console.log(`   ❌ Status check failed: ${error.message}`);
          }
        }, 3000);
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }
    
    // 3. Check account messaging limits
    console.log('\n🔍 Step 3: Checking account messaging capabilities...');
    try {
      const account = await client.api.accounts(accountSid).fetch();
      console.log(`   Account Status: ${account.status}`);
      console.log(`   Account Type: ${account.type}`);
      
      if (account.status !== 'active') {
        console.log('❌ Account is not active - this could block SMS');
      }
      
      // Check recent usage
      const usage = await client.usage.records.list({ category: 'sms', limit: 5 });
      console.log(`   Recent SMS usage records: ${usage.length}`);
      
    } catch (error) {
      console.log(`   ❌ Account check failed: ${error.message}`);
    }
    
    console.log('\n💡 Suggestions based on results:');
    console.log('1. If carrier type is VoIP/landline, that explains the issue');
    console.log('2. If all message formats fail, it might be carrier blocking');
    console.log('3. Try testing with a different mobile number from a major carrier (Verizon, AT&T, T-Mobile)');
    console.log('4. Some carriers block messages from certain Twilio numbers');
    
  } catch (error) {
    console.error('❌ Troubleshooting failed:', error.message);
  }
}

advancedSMSTroubleshooting();
