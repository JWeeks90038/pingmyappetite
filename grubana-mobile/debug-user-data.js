// Debug script to check current user data in Firebase
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './src/firebase.js';

const debugUserData = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {

      return;
    }
    

    
    // Fetch user document from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Check if coverURL exists and what type it is
      if (userData.coverURL !== undefined) {
    
      } else {
     
      }
      
    } else {
    
    }
    
  } catch (error) {

  }
};

// Call the function
debugUserData();
