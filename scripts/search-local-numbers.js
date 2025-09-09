// Search for available local phone numbers in 760 area code
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function searchLocalNumbers() {

  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);
    
    // Search for available local numbers in 760 area code (same as target number)
  
    const localNumbers = await client.availablePhoneNumbers('US').local.list({
      areaCode: 760,
      smsEnabled: true,
      limit: 10
    });
    
    if (localNumbers.length > 0) {

      localNumbers.forEach((number, index) => {
      
      });
      

      
    } else {

      
      // Try other California area codes
      const californiaAreaCodes = [619, 858, 951, 714, 949];
      
      for (const areaCode of californiaAreaCodes) {
    
        const numbers = await client.availablePhoneNumbers('US').local.list({
          areaCode: areaCode,
          smsEnabled: true,
          limit: 3
        });
        
        if (numbers.length > 0) {
       
          numbers.forEach(num => (`      ${num.phoneNumber}`));
        } else {
    
        }
      }
    }
    

    
  } catch (error) {

  }
}

searchLocalNumbers();
