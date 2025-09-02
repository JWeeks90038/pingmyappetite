import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCF8k9aHzD93j45OoEbUzQJUWDxqOKRzbo",
  authDomain: "foodtruckfinder-27eba.firebaseapp.com",
  databaseURL: "https://foodtruckfinder-27eba-default-rtdb.firebaseio.com",
  projectId: "foodtruckfinder-27eba",
  storageBucket: "foodtruckfinder-27eba.appspot.com",
  messagingSenderId: "732230353128",
  appId: "1:732230353128:web:8b5a27d8a9e64b3c4dcf2f",
  measurementId: "G-SWPZH5BLV1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Test the catering function
async function testCateringFunction() {
  try {
    console.log('🧪 Testing catering function...');
    
    const sendCateringRequest = httpsCallable(functions, 'sendCateringRequest');
    
    const testData = {
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '555-123-4567',
      eventDate: '2024-02-15',
      eventTime: '12:00',
      eventLocation: '123 Test Street, Test City',
      guestCount: 50,
      eventType: 'Corporate Event',
      additionalRequests: 'Test catering request',
      truckOwnerEmail: 'owner@foodtruck.com'
    };
    
    const result = await sendCateringRequest(testData);
    console.log('✅ Function test successful:', result.data);
    
  } catch (error) {
    console.error('❌ Function test failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
  }
}

// Run the test
testCateringFunction();
