import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD8eK8p5mI92xVr7Y9qDhSn5pFLTG6uU_8",
  authDomain: "foodtruckfinder-27eba.firebaseapp.com",
  databaseURL: "https://foodtruckfinder-27eba-default-rtdb.firebaseio.com",
  projectId: "foodtruckfinder-27eba",
  storageBucket: "foodtruckfinder-27eba.appspot.com",
  messagingSenderId: "418485074487",
  appId: "1:418485074487:web:b8c5e0d3c7f0e4b1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

async function callTokenRefresh() {
  try {
 
    
    const forceFcmTokenRefresh = httpsCallable(functions, 'forceFcmTokenRefresh');
    const result = await forceFcmTokenRefresh();
    

    
  } catch (error) {

  }
}

callTokenRefresh();
