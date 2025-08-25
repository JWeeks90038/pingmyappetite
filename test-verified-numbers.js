// Test SMS with verified Twilio test numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testWithVerifiedNumbers() {
  console.log('🔍 Testing SMS with Twilio verified test numbers...\n');
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiSid = process.env.TWILIO_API_SID;
    const apiSecretKey = process.env.TWILIO_API_SECRET_KEY;
    
    const client = twilio(apiSid, apiSecretKey, { accountSid });
    
    // Twilio's test phone numbers that always work
    const testNumbers = [
      '+15005550006', // Valid mobile number (always works)
      '+15005550009', // Valid mobile number (always works)
    ];
    
    console.log('📱 Testing with Twilio verified test numbers...');
    console.log('Note: These are test numbers that will show as "delivered" but won\'t actually send SMS\n');
    
    for (const testNumber of testNumbers) {
      console.log(`📤 Sending test SMS to ${testNumber}...`);
      
      try {
        const message = await client.messages.create({
          body: '🍴 Grubana Test - This is a test SMS using Twilio verified test number',
          from: process.env.TWILIO_PHONE_NUMBER,
          to: testNumber
        });
        
        console.log(`✅ Message sent! SID: ${message.sid}, Status: ${message.status}`);
        
        // Wait a moment and check status
        setTimeout(async () => {
          try {
            const updatedMessage = await client.messages(message.sid).fetch();
            console.log(`📊 Updated status for ${testNumber}: ${updatedMessage.status}`);
          } catch (error) {
            console.log(`❌ Error checking status: ${error.message}`);
          }
        }, 2000);
        
      } catch (error) {
        console.log(`❌ Failed to send to ${testNumber}: ${error.message}`);
      }
    }
    
    console.log('\n💡 If test numbers work, the issue is with the specific phone number.');
    console.log('Try testing with a different mobile phone number that you know receives SMS.');
    
  } catch (error) {
    console.error('❌ Error in test:', error.message);
  }
}

testWithVerifiedNumbers();
