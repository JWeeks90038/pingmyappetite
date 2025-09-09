// Quick test script to create an event organizer user
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase.js';

// Test credentials
const testEmail = 'test-organizer@example.com';
const testPassword = 'TestPassword123!';

export async function createTestEventOrganizer() {
  try {

    
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
    
 
    
    return user;
  } catch (error) {

    
    // If user already exists, try to login
    if (error.code === 'auth/email-already-in-use') {

      try {
        const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);

        return userCredential.user;
      } catch (loginError) {

      }
    }
  }
}

export async function loginTestEventOrganizer() {
  try {

    const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);

    return userCredential.user;
  } catch (error) {

    throw error;
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  window.createTestEventOrganizer = createTestEventOrganizer;
  window.loginTestEventOrganizer = loginTestEventOrganizer;
}
