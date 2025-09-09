// Check available Twilio phone numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkTwilioNumbers() {

  
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
    
    // Get incoming phone numbers
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    
  
    
    if (phoneNumbers.length === 0) {

    } else {
      phoneNumbers.forEach((number, index) => {
    
      });
      
   
    }
    
  } catch (error) {

    
    if (error.code === 20003) {
   
    }
  }
}

checkTwilioNumbers();
