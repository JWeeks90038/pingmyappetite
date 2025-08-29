// Debug script to check current user data in Firebase
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './src/firebase.js';

const debugUserData = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('No user is currently logged in');
      return;
    }
    
    console.log('Current user UID:', user.uid);
    console.log('Current user email:', user.email);
    
    // Fetch user document from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('\n=== COMPLETE USER DATA ===');
      console.log(JSON.stringify(userData, null, 2));
      
      console.log('\n=== SPECIFIC FIELDS CHECK ===');
      console.log('coverURL:', userData.coverURL);
      console.log('menuUrl:', userData.menuUrl);
      console.log('truckName:', userData.truckName);
      console.log('role:', userData.role);
      
      // Check if coverURL exists and what type it is
      if (userData.coverURL !== undefined) {
        console.log('\ncoverURL field exists!');
        console.log('coverURL type:', typeof userData.coverURL);
        console.log('coverURL value:', userData.coverURL);
        console.log('coverURL length:', userData.coverURL?.length || 0);
      } else {
        console.log('\ncoverURL field does NOT exist in the document');
      }
      
    } else {
      console.log('User document does not exist in Firestore');
    }
    
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
};

// Call the function
debugUserData();
