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
    
  } catch (error) {

  }
}

debugEventOrganizerAccess();
