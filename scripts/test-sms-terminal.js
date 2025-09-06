import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import readline from 'readline';

const firebaseConfig = {
  apiKey: 'AIzaSyDW7ZFJNtYdqgYBJUCaAEEJIEWs1LlV1Ng',
  authDomain: 'foodtruckfinder-27eba.firebaseapp.com',
  projectId: 'foodtruckfinder-27eba',
  storageBucket: 'foodtruckfinder-27eba.appspot.com',
  messagingSenderId: '1071096822863',
  appId: '1:1071096822863:web:e1234da3dca4567'
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'us-central1');

const testSMS = httpsCallable(functions, 'testSMS');
const sendWelcomeSMS = httpsCallable(functions, 'sendWelcomeSMS');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function runBasicSMSTest(phoneNumber) {
  console.log('\n🚀 Testing Basic SMS...');
  console.log(`📱 Sending to: ${phoneNumber}`);
  
  try {
    const result = await testSMS({ phoneNumber });
    
    if (result.data.success) {
      console.log('✅ SUCCESS!');
      console.log(`📤 Message sent to: ${result.data.to}`);
      console.log(`📧 Message SID: ${result.data.messageSid}`);
      console.log('💬 Message: "Hello from PingMyAppetite! This is a test message."');
      console.log('\n🔔 Check your phone for the SMS!');
    } else {
      console.log('❌ FAILED!');
      console.log(`Error: ${result.data.error}`);
      if (result.data.details) {
        console.log(`Details: ${JSON.stringify(result.data.details, null, 2)}`);
      }
    }
  } catch (error) {
    console.log('❌ FUNCTION CALL FAILED!');
    console.log(`Error: ${error.message}`);
    console.log(`Code: ${error.code || 'unknown'}`);
  }
}

async function runWelcomeSMSTest(phoneNumber, username, role, plan) {
  console.log('\n🎉 Testing Welcome SMS...');
  console.log(`📱 Sending to: ${phoneNumber}`);
  console.log(`👤 Username: ${username}`);
  console.log(`🎭 Role: ${role}`);
  console.log(`📦 Plan: ${plan || 'none'}`);
  
  try {
    const result = await sendWelcomeSMS({ 
      phoneNumber, 
      username, 
      role, 
      plan: plan || undefined 
    });
    
    if (result.data.success) {
      console.log('✅ SUCCESS!');
      console.log(`📤 Message sent to: ${result.data.to}`);
      console.log(`📧 Message SID: ${result.data.messageSid}`);
      console.log('\n🔔 Check your phone for the welcome SMS!');
    } else {
      console.log('❌ FAILED!');
      console.log(`Error: ${result.data.error}`);
      if (result.data.details) {
        console.log(`Details: ${JSON.stringify(result.data.details, null, 2)}`);
      }
    }
  } catch (error) {
    console.log('❌ FUNCTION CALL FAILED!');
    console.log(`Error: ${error.message}`);
    console.log(`Code: ${error.code || 'unknown'}`);
  }
}

function showMenu() {
  console.log('\n📱 SMS Testing Menu');
  console.log('==================');
  console.log('1. Basic SMS Test');
  console.log('2. Welcome SMS Test');
  console.log('3. Exit');
  console.log('\nNote: Phone numbers must be in E.164 format (e.g., +1234567890)');
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('🔥 Firebase SMS Testing Tool');
  console.log('============================');
  console.log('✅ Connected to Firebase project: foodtruckfinder-27eba');
  console.log('📍 Functions region: us-central1');
  console.log('💰 Using real Twilio credentials');
  
  while (true) {
    showMenu();
    const choice = await askQuestion('\nSelect an option (1-3): ');
    
    switch (choice.trim()) {
      case '1':
        const basicPhone = await askQuestion('\nEnter phone number (E.164 format, e.g., +1234567890): ');
        if (basicPhone.startsWith('+')) {
          await runBasicSMSTest(basicPhone.trim());
        } else {
          console.log('❌ Invalid format! Phone number must start with + (E.164 format)');
        }
        break;
        
      case '2':
        const welcomePhone = await askQuestion('\nEnter phone number (E.164 format): ');
        if (!welcomePhone.startsWith('+')) {
          console.log('❌ Invalid format! Phone number must start with + (E.164 format)');
          break;
        }
        
        const username = await askQuestion('Enter username: ');
        const role = await askQuestion('Enter role (customer/owner/admin): ');
        let plan = '';
        
        if (role === 'owner') {
          plan = await askQuestion('Enter plan (basic/premium): ');
        }
        
        await runWelcomeSMSTest(welcomePhone.trim(), username.trim(), role.trim(), plan.trim());
        break;
        
      case '3':
        console.log('\n👋 Goodbye!');
        rl.close();
        process.exit(0);
        break;
        
      default:
        console.log('❌ Invalid choice! Please enter 1, 2, or 3.');
    }
    
    await askQuestion('\nPress Enter to continue...');
  }
}

main().catch(console.error);
