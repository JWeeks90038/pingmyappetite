// Create a script to purchase a number and update config
import twilio from 'twilio';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function purchaseNumber(phoneNumber) {

  
  try {
    const purchasedNumber = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber
    });



    // Update .env.local file
    updateEnvFile(purchasedNumber.phoneNumber);

   

    return purchasedNumber;

  } catch (error) {

    
    if (error.code === 21452) {
  
    } else if (error.code === 20003) {
 
    } else {
   
    }
    
    throw error;
  }
}

function updateEnvFile(newPhoneNumber) {
  try {
    // Read current .env.local
    const envPath = '.env.local';
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the old phone number
    const oldNumber = process.env.TWILIO_PHONE_NUMBER;
    envContent = envContent.replace(
      `TWILIO_PHONE_NUMBER=${oldNumber}`,
      `TWILIO_PHONE_NUMBER=${newPhoneNumber}`
    );
    
    // Write back to file
    fs.writeFileSync(envPath, envContent);
    

    
  } catch (error) {


  }
}

// Get phone number from command line
const phoneNumber = process.argv[2];

if (!phoneNumber) {

}

// Validate phone number format
if (!phoneNumber.match(/^\+1\d{10}$/)) {

  process.exit(1);
}

purchaseNumber(phoneNumber);
