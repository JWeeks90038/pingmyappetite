// Search for truly SMS-enabled local numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function findSMSNumbers() {

  
  try {
    // Try different search approaches
    const searches = [
      { type: 'local', areaCode: '619' },
      { type: 'local', areaCode: '858' },
      { type: 'local', areaCode: '760' },
      { type: 'local', areaCode: '714' },
      { type: 'mobile', areaCode: '619' }
    ];
    
    for (const search of searches) {

      
      try {
        let searchResults;
        if (search.type === 'local') {
          searchResults = await client.availablePhoneNumbers('US')
            .local
            .list({
              areaCode: search.areaCode,
              smsEnabled: true,
              voiceEnabled: true,
              limit: 3
            });
        } else {
          searchResults = await client.availablePhoneNumbers('US')
            .mobile
            .list({
              areaCode: search.areaCode,
              smsEnabled: true,
              limit: 3
            });
        }

     
        searchResults.forEach((number, index) => {
  
        });
        
        // If we find SMS-enabled numbers, show purchase command
        const smsNumbers = searchResults.filter(n => n.capabilities.sms);
        if (smsNumbers.length > 0) {
  
          return; // Stop searching once we find SMS numbers
        }
        
      } catch (error) {

      }
      

    }
    

    
  } catch (error) {
;

  }
}

findSMSNumbers();
