// Test with a different phone number format and check error codes
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function diagnoseSMSIssue() {

  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiSid = process.env.TWILIO_API_SID;
    const apiSecretKey = process.env.TWILIO_API_SECRET_KEY;
    
    const client = twilio(apiSid, apiSecretKey, { accountSid });
    

    // Let's try to validate the phone number format
    const phoneNumber = '+17602711244';
  
    
    try {
      const lookup = await client.lookups.v1.phoneNumbers(phoneNumber).fetch();

    } catch (lookupError) {
  
    }
    

    
  } catch (error) {

  }
}

diagnoseSMSIssue();
