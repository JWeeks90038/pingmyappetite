// Quick test script to create an event organizer user
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase.js';

// Test credentials
const testEmail = 'test-organizer@example.com';
const testPassword = 'TestPassword123!';

export async function createTestEventOrganizer() {
  try {
    console.log('Creating test event organizer...');
    
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    const user = userCredential.user;
    
    // Create user document with event-organizer role
    const userData = {
      uid: user.uid,
      email: user.email,
      username: 'Test Event Organizer',
      role: 'event-organizer',
      plan: 'event-basic',
      subscriptionStatus: 'trial',
      contactPerson: 'John Doe',
      organizationName: 'Test Events Co',
      organizationType: 'Corporate',
      phone: '+1234567890',
      createdAt: new Date(),
      referralCode: 'arayaki_hibachi'
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    
    console.log('✅ Test event organizer created successfully!');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    
    return user;
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    
    // If user already exists, try to login
    if (error.code === 'auth/email-already-in-use') {
      console.log('User already exists, trying to login...');
      try {
        const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        console.log('✅ Logged in successfully!');
        return userCredential.user;
      } catch (loginError) {
        console.error('❌ Login failed:', loginError);
      }
    }
  }
}

export async function loginTestEventOrganizer() {
  try {
    console.log('Logging in test event organizer...');
    const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Logged in successfully!');
    return userCredential.user;
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  window.createTestEventOrganizer = createTestEventOrganizer;
  window.loginTestEventOrganizer = loginTestEventOrganizer;
}
