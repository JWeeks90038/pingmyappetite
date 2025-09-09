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

  
  try {
    const result = await testSMS({ phoneNumber });
    
    if (result.data.success) {

    } else {

      if (result.data.details) {

      }
    }
  } catch (error) {

  }
}

async function runWelcomeSMSTest(phoneNumber, username, role, plan) {

  
  try {
    const result = await sendWelcomeSMS({ 
      phoneNumber, 
      username, 
      role, 
      plan: plan || undefined 
    });
    
    if (result.data.success) {

    } else {
  
      if (result.data.details) {

      }
    }
  } catch (error) {

  }
}

function showMenu() {

}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {

  
  while (true) {
    showMenu();
    const choice = await askQuestion('\nSelect an option (1-3): ');
    
    switch (choice.trim()) {
      case '1':
        const basicPhone = await askQuestion('\nEnter phone number (E.164 format, e.g., +1234567890): ');
        if (basicPhone.startsWith('+')) {
          await runBasicSMSTest(basicPhone.trim());
        } else {

        }
        break;
        
      case '2':
        const welcomePhone = await askQuestion('\nEnter phone number (E.164 format): ');
        if (!welcomePhone.startsWith('+')) {

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
    
        rl.close();
        process.exit(0);
        break;
        
      default:

    }
    
    await askQuestion('\nPress Enter to continue...');
  }
}

main().catch();
