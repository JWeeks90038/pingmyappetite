// Search for SMS-enabled local numbers in California
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function findSMSEnabledNumbers() {

  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);
    


    const smsNumbers = await client.availablePhoneNumbers('US').local.list({
      smsEnabled: true,
      limit: 15
    });
    
    if (smsNumbers.length > 0) {

      
      smsNumbers.forEach((number, index) => {
        const areaCode = number.phoneNumber.slice(2, 5); // Extract area code
   
      });
      
      // Show the best options
      const bestNumbers = smsNumbers.filter(num => 
        num.capabilities.sms && num.capabilities.mms
      ).slice(0, 5);
      
      if (bestNumbers.length > 0) {
 
        bestNumbers.forEach((number, index) => {
    
        });
        
     
      }
      
    } else {
 
      
      // Try toll-free SMS numbers as backup
    
      const tollFreeNumbers = await client.availablePhoneNumbers('US').tollFree.list({
        smsEnabled: true,
        limit: 10
      });
      
      if (tollFreeNumbers.length > 0) {
       
        tollFreeNumbers.slice(0, 5).forEach((number, index) => {
       
        });
   
      }
    }
    
  } catch (error) {

  }
}

findSMSEnabledNumbers();
