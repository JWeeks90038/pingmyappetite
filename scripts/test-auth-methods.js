// Test authentication methods
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testAuthentication() {
 
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiSid = process.env.TWILIO_API_SID;
  const apiSecretKey = process.env.TWILIO_API_SECRET_KEY;
  

  
  // Test 1: Basic Authentication (Account SID + Auth Token)

  try {
    const basicClient = twilio(accountSid, authToken);
    const account = await basicClient.api.accounts(accountSid).fetch();

    
    // Try sending SMS with basic auth
  
    const message = await basicClient.messages.create({
      body: '🍴 Test SMS with Basic Auth - Grubana',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: '+17602711244'
    });
  
    
  } catch (error) {

  }
  
  // Test 2: API Key Authentication

  try {
    const apiClient = twilio(apiSid, apiSecretKey, { accountSid });
    const account = await apiClient.api.accounts(accountSid).fetch();

    
  } catch (error) {

  }
}

testAuthentication();
