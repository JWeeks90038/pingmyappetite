// Test SMS with verified Twilio test numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testWithVerifiedNumbers() {

  
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
    

    
    for (const testNumber of testNumbers) {
  
      
      try {
        const message = await client.messages.create({
          body: '🍴 Grubana Test - This is a test SMS using Twilio verified test number',
          from: process.env.TWILIO_PHONE_NUMBER,
          to: testNumber
        });
        
   
        
        // Wait a moment and check status
        setTimeout(async () => {
          try {
            const updatedMessage = await client.messages(message.sid).fetch();
        
          } catch (error) {
     
          }
        }, 2000);
        
      } catch (error) {
 
      }
    }
    

    
  } catch (error) {

  }
}

testWithVerifiedNumbers();
