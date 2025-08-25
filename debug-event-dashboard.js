// Debug script to test event organizer user creation and access
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBzTNlQMkIiK1_IOphDwE34L2kzpdMQWD8",
  authDomain: "foodtruckfinder-27eba.firebaseapp.com",
  projectId: "foodtruckfinder-27eba",
  storageBucket: "foodtruckfinder-27eba.firebasestorage.app",
  messagingSenderId: "418485074487",
  appId: "1:418485074487:web:14b0febd3cca4e724b1db2",
  measurementId: "G-MHVKR07V99"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function debugEventOrganizerAccess() {
  try {
    console.log('🔍 Debug: Testing event organizer access...');
    
    // Test if we can access the event organizer route without login
    console.log('Testing direct route access to /event-dashboard...');
    
    // Check if there are any existing event organizer users
    console.log('Looking for event organizer test accounts...');
    
    // For now, let's just log the expected flow
    console.log(`
📋 Expected Event Organizer Flow:
1. User signs up with role: 'event-organizer'
2. AuthContext loads user data and sets userRole to 'event-organizer'
3. App.jsx route protection allows access to /event-dashboard
4. EventDashboard component loads and checks user role again
5. If role matches, dashboard loads; otherwise redirects

🧐 Potential Issues:
- AuthContext userRole loading delay
- Route protection logic timing
- EventDashboard role validation
- Firestore rules or permissions
    `);
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugEventOrganizerAccess();
