// Search for local SMS-enabled Twilio numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function searchForLocalNumbers() {

  
  try {
    // Search for local numbers in various California area codes
    const areaCodes = ['760', '619', '858', '442', '714', '949', '951', '909'];

    
    for (const areaCode of areaCodes) {

      
      try {
        const availableNumbers = await client.availablePhoneNumbers('US')
          .local
          .list({
            areaCode: areaCode,
            smsEnabled: true,
            limit: 5
          });

        if (availableNumbers.length > 0) {
         
          availableNumbers.forEach((number, index) => {
        
          });
          

        } else {

        }
      } catch (error) {
  
      }
    }
    

    
  } catch (error) {

  }
}

searchForLocalNumbers();
