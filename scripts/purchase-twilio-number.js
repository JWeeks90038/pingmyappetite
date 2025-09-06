// Create a script to purchase a number and update config
import twilio from 'twilio';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function purchaseNumber(phoneNumber) {
  console.log(`🛒 Attempting to purchase: ${phoneNumber}`);
  
  try {
    const purchasedNumber = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber
    });

    console.log('✅ SUCCESS! Number purchased:');
    console.log(`   Phone Number: ${purchasedNumber.phoneNumber}`);
    console.log(`   SID: ${purchasedNumber.sid}`);
    console.log(`   SMS Enabled: ${purchasedNumber.capabilities.sms}`);
    console.log(`   Voice Enabled: ${purchasedNumber.capabilities.voice}`);
    console.log(`   Monthly Cost: ~$1.00`);

    // Update .env.local file
    updateEnvFile(purchasedNumber.phoneNumber);

    console.log('\n🎉 Your new number is ready to use!');
    console.log('Want to test SMS delivery? Run: node test-new-number.js');

    return purchasedNumber;

  } catch (error) {
    console.error('❌ Purchase failed:', error.message);
    
    if (error.code === 21452) {
      console.log('💡 That number is no longer available. Try another one.');
    } else if (error.code === 20003) {
      console.log('💡 Insufficient balance. Add funds to your Twilio account.');
    } else {
      console.log('💡 Try purchasing manually through the Twilio Console');
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
    
    console.log('\n✅ Updated .env.local:');
    console.log(`   OLD: TWILIO_PHONE_NUMBER=${oldNumber}`);
    console.log(`   NEW: TWILIO_PHONE_NUMBER=${newPhoneNumber}`);
    
  } catch (error) {
    console.error('❌ Failed to update .env.local:', error.message);
    console.log(`Please manually update TWILIO_PHONE_NUMBER to: ${newPhoneNumber}`);
  }
}

// Get phone number from command line
const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.log('📞 USAGE: node purchase-twilio-number.js "+15551234567"');
  console.log('\n🔍 To find numbers to purchase:');
  console.log('1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/search');
  console.log('2. Select "Local" numbers');
  console.log('3. Check "SMS" capability');
  console.log('4. Try area codes: 212, 310, 415, 646, 718, 206');
  console.log('5. Copy a number and run: node purchase-twilio-number.js "+15551234567"');
  console.log('\n💡 Or try these commands for specific area codes:');
  console.log('node purchase-twilio-number.js "+12125551234"  # NYC');
  console.log('node purchase-twilio-number.js "+14155551234"  # San Francisco');
  console.log('node purchase-twilio-number.js "+12065551234"  # Seattle');
  process.exit(1);
}

// Validate phone number format
if (!phoneNumber.match(/^\+1\d{10}$/)) {
  console.log('❌ Invalid phone number format. Use: +15551234567');
  process.exit(1);
}

purchaseNumber(phoneNumber);
