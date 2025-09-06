// Test with a different phone number format and check error codes
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function diagnoseSMSIssue() {
  console.log('🔍 Diagnosing SMS delivery issue...\n');
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiSid = process.env.TWILIO_API_SID;
    const apiSecretKey = process.env.TWILIO_API_SECRET_KEY;
    
    const client = twilio(apiSid, apiSecretKey, { accountSid });
    
    // Error code 30032 means "Unknown SMS delivery failure"
    console.log('❌ Error Code 30032: Unknown SMS delivery failure');
    console.log('This usually means:');
    console.log('1. The phone number is a landline (doesn\'t support SMS)');
    console.log('2. The carrier is blocking messages');
    console.log('3. The phone number is invalid or disconnected');
    console.log('4. International number without proper formatting\n');
    
    // Let's try to validate the phone number format
    const phoneNumber = '+17602711244';
    console.log(`📱 Analyzing phone number: ${phoneNumber}`);
    
    try {
      const lookup = await client.lookups.v1.phoneNumbers(phoneNumber).fetch();
      console.log('✅ Phone number lookup successful:');
      console.log(`   National format: ${lookup.nationalFormat}`);
      console.log(`   International format: ${lookup.phoneNumber}`);
      console.log(`   Country code: ${lookup.countryCode}`);
      console.log(`   Carrier: ${lookup.carrier || 'Unknown'}`);
    } catch (lookupError) {
      console.log('❌ Phone number lookup failed:', lookupError.message);
      console.log('This confirms the number might be invalid or unsupported');
    }
    
    console.log('\n💡 Suggestions:');
    console.log('1. Try a different phone number (known mobile number)');
    console.log('2. Make sure the number supports SMS');
    console.log('3. Try without the +1 prefix: just the 10 digits');
    console.log('4. Use a verified Twilio test number for initial testing');
    
  } catch (error) {
    console.error('❌ Error in diagnosis:', error.message);
  }
}

diagnoseSMSIssue();
