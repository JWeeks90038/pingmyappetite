// Test authentication methods
import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testAuthentication() {
  console.log('🔍 Testing different Twilio authentication methods...\n');
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiSid = process.env.TWILIO_API_SID;
  const apiSecretKey = process.env.TWILIO_API_SECRET_KEY;
  
  console.log('Credentials found:');
  console.log(`Account SID: ${accountSid ? '✅' : '❌'}`);
  console.log(`Auth Token: ${authToken ? '✅' : '❌'}`);
  console.log(`API SID: ${apiSid ? '✅' : '❌'}`);
  console.log(`API Secret: ${apiSecretKey ? '✅' : '❌'}\n`);
  
  // Test 1: Basic Authentication (Account SID + Auth Token)
  console.log('🔑 Testing Basic Authentication (Account SID + Auth Token)...');
  try {
    const basicClient = twilio(accountSid, authToken);
    const account = await basicClient.api.accounts(accountSid).fetch();
    console.log('✅ Basic Authentication SUCCESSFUL');
    console.log(`   Account: ${account.friendlyName}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Type: ${account.type}\n`);
    
    // Try sending SMS with basic auth
    console.log('📱 Testing SMS with Basic Authentication...');
    const message = await basicClient.messages.create({
      body: '🍴 Test SMS with Basic Auth - Grubana',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: '+17602711244'
    });
    console.log(`✅ SMS sent with Basic Auth! SID: ${message.sid}, Status: ${message.status}`);
    
  } catch (error) {
    console.log('❌ Basic Authentication FAILED:', error.message);
  }
  
  // Test 2: API Key Authentication
  console.log('\n🔑 Testing API Key Authentication (API SID + Secret)...');
  try {
    const apiClient = twilio(apiSid, apiSecretKey, { accountSid });
    const account = await apiClient.api.accounts(accountSid).fetch();
    console.log('✅ API Key Authentication SUCCESSFUL');
    console.log(`   Account: ${account.friendlyName}`);
    console.log(`   Status: ${account.status}\n`);
    
  } catch (error) {
    console.log('❌ API Key Authentication FAILED:', error.message);
    console.log('💡 This suggests the API Key might be invalid or not properly configured');
  }
}

testAuthentication();
