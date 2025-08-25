// Check SMS delivery status
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkSMSStatus() {
  console.log('🔍 Checking SMS delivery status...\n');
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiSid = process.env.TWILIO_API_SID;
    const apiSecretKey = process.env.TWILIO_API_SECRET_KEY;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    let client;
    if (apiSid && apiSecretKey) {
      client = twilio(apiSid, apiSecretKey, { accountSid });
    } else {
      client = twilio(accountSid, authToken);
    }
    
    // Get recent messages (last 20)
    const messages = await client.messages.list({ limit: 20 });
    
    console.log(`📱 Found ${messages.length} recent message(s):\n`);
    
    messages.forEach((message, index) => {
      const date = new Date(message.dateCreated);
      console.log(`${index + 1}. Message SID: ${message.sid}`);
      console.log(`   To: ${message.to}`);
      console.log(`   From: ${message.from}`);
      console.log(`   Status: ${message.status}`);
      console.log(`   Date: ${date.toLocaleString()}`);
      console.log(`   Body: ${message.body.substring(0, 100)}...`);
      
      if (message.errorCode) {
        console.log(`   ❌ Error Code: ${message.errorCode}`);
        console.log(`   ❌ Error Message: ${message.errorMessage}`);
      }
      
      console.log('');
    });
    
    // Check the specific message we just sent
    const testMessage = messages.find(msg => msg.sid === 'SM5e839ebbb7a85d2ff70511ec1d7f9d9b');
    if (testMessage) {
      console.log('🎯 Found our test message:');
      console.log(`   Status: ${testMessage.status}`);
      console.log(`   Price: ${testMessage.price}`);
      console.log(`   Direction: ${testMessage.direction}`);
      
      if (testMessage.status === 'failed') {
        console.log(`   ❌ Failure reason: ${testMessage.errorMessage}`);
      } else if (testMessage.status === 'undelivered') {
        console.log('   ⚠️  Message was undelivered - this could be due to:');
        console.log('     - Invalid phone number format');
        console.log('     - Phone number is landline (SMS not supported)');
        console.log('     - Carrier blocked the message');
        console.log('     - Phone is turned off or out of service');
      } else if (testMessage.status === 'delivered') {
        console.log('   ✅ Message was delivered successfully!');
        console.log('   💡 Check your phone again - it might be in spam/junk');
      } else if (testMessage.status === 'sent') {
        console.log('   📤 Message was sent and is being delivered...');
        console.log('   ⏳ Wait a few more minutes and check again');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking message status:', error.message);
  }
}

checkSMSStatus();
