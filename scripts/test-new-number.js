// Test SMS with new Twilio number
import { sendNotificationSMS } from './src/utils/twilioService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testNewNumber() {

  

  
  try {

    
    const result = await sendNotificationSMS(
      '+17602711244',
      '🎉 SUCCESS! Your new Twilio number is working perfectly for SMS delivery!'
    );
    
    if (result.success) {
 
    } else {
  
    }
    
  } catch (error) {

  }
}

testNewNumber();
