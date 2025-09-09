// Check Twilio phone number reputation and status
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkTwilioNumberReputation() {
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    
    const client = twilio(accountSid, authToken);
    
    // 1. Get detailed phone number info
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    const myNumber = phoneNumbers.find(num => num.phoneNumber === twilioNumber);
    
    if (myNumber) {
    }
    
    // 2. Check recent successful deliveries
    const allMessages = await client.messages.list({ 
      from: twilioNumber,
      limit: 50 
    });
    
    const delivered = allMessages.filter(msg => msg.status === 'delivered').length;
    const failed = allMessages.filter(msg => msg.status === 'failed' || msg.status === 'undelivered').length;
    const total = allMessages.length;
    
    if (delivered > 0) {
      
      // Show recent successful deliveries
      const recentSuccess = allMessages.filter(msg => msg.status === 'delivered').slice(0, 3);
      recentSuccess.forEach((msg, index) => {
      });
    } else {
    }
    
    // 3. Check if this is a toll-free vs local number
    if (twilioNumber.startsWith('+1888') || twilioNumber.startsWith('+1800') || 
        twilioNumber.startsWith('+1877') || twilioNumber.startsWith('+1866')) {
    } else {
    }
    
    // 4. Suggest solutions
    
  } catch (error) {
  }
}

checkTwilioNumberReputation();
