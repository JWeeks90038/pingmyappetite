// Check SMS delivery status
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkSMSStatus() {
  
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
    
    // Get recent messages (last 20)
    const messages = await client.messages.list({ limit: 20 });
    
    messages.forEach((message, index) => {
      const date = new Date(message.dateCreated);
      
      if (message.errorCode) {
      }
      
    });
    
    // Check the specific message we just sent
    const testMessage = messages.find(msg => msg.sid === 'SM5e839ebbb7a85d2ff70511ec1d7f9d9b');
    if (testMessage) {
      
      if (testMessage.status === 'failed') {
      } else if (testMessage.status === 'undelivered') {
      } else if (testMessage.status === 'delivered') {
      } else if (testMessage.status === 'sent') {
      }
    }
    
  } catch (error) {
  }
}

checkSMSStatus();
