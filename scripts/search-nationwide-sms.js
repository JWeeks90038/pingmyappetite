// Search nationwide for SMS-enabled numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function searchNationwide() {

  
  try {
    // Search without area code restrictions
    
    const localNumbers = await client.availablePhoneNumbers('US')
      .local
      .list({
        smsEnabled: true,
        limit: 10
      });


    localNumbers.forEach((number, index) => {

    });

    if (localNumbers.length > 0) {
      const firstSMS = localNumbers.find(n => n.capabilities.sms);
      if (firstSMS) {

      }
    }

  } catch (error) {

  }

  // Also try toll-free as backup
  try {

    const tollFreeNumbers = await client.availablePhoneNumbers('US')
      .tollFree
      .list({
        smsEnabled: true,
        limit: 5
      });

 
    tollFreeNumbers.forEach((number, index) => {

    });

  } catch (error) {
  
  }


}

searchNationwide();
