// Check Twilio account status and capabilities
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkAccountStatus() {
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiSid = process.env.TWILIO_API_SID;
    const apiSecretKey = process.env.TWILIO_API_SECRET_KEY;
    
    const client = twilio(apiSid, apiSecretKey, { accountSid });
    
    // Check account details
    const account = await client.api.accounts(accountSid).fetch();
    
    // Check if account is a trial account
    if (account.type === 'Trial') {
      
      // Check verified phone numbers
      try {
        const validationRequests = await client.validationRequests.list();
        
        const outgoingCallerIds = await client.outgoingCallerIds.list();
        
        if (outgoingCallerIds.length === 0) {
        } else {
          outgoingCallerIds.forEach(number => {
          });
        }
        
      } catch (error) {
      }
    } else {
    }
    
    // Check phone number capabilities
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    
    phoneNumbers.forEach(number => {
    });
    
  } catch (error) {
    
    if (error.code === 20003) {
    }
  }
}

checkAccountStatus();
