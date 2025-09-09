// Advanced SMS troubleshooting for mobile numbers
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function advancedSMSTroubleshooting() {
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);
    
    const phoneNumber = '+17602711244';
    
    // 1. Check carrier lookup with more details
    try {
      const lookup = await client.lookups.v1.phoneNumbers(phoneNumber)
        .fetch({ type: ['carrier'] });
      
      if (lookup.carrier?.type === 'landline') {
      } else if (lookup.carrier?.type === 'mobile') {
      } else if (lookup.carrier?.type === 'voip') {
      }
      
    } catch (lookupError) {
    }
    
    // 2. Try different message formats
    
    const testMessages = [
      {
        name: 'Simple text only',
        body: 'Test SMS from Grubana - simple text only'
      },
      {
        name: 'No emojis',
        body: 'Grubana Test - This is a test SMS without emojis'
      },
      {
        name: 'Short message',
        body: 'Grubana test'
      }
    ];
    
    for (const testMsg of testMessages) {
      try {
        const message = await client.messages.create({
          body: testMsg.body,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        
        // Wait a moment and check status
        setTimeout(async () => {
          try {
            const updatedMessage = await client.messages(message.sid).fetch();
            if (updatedMessage.errorCode) {
            }
          } catch (error) {
          }
        }, 3000);
        
      } catch (error) {
      }
    }
    
    // 3. Check account messaging limits
    try {
      const account = await client.api.accounts(accountSid).fetch();
      
      if (account.status !== 'active') {
      }
      
      // Check recent usage
      const usage = await client.usage.records.list({ category: 'sms', limit: 5 });
      
    } catch (error) {
    }
    
  } catch (error) {
  }
}

advancedSMSTroubleshooting();
