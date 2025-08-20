import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, updateDoc, setDoc } from 'firebase/firestore';

export const logoutUser = async () => {
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  
  try {
    // Hide truck from map before logging out
    if (user?.uid) {
      console.log('🚪 FirebaseUtils: Hiding truck from map before logout for user:', user.uid);
      const truckDocRef = doc(db, "truckLocations", user.uid);
      
      try {
        // Try to update existing document
        await updateDoc(truckDocRef, {
          isLive: false,
          visible: false,
          lastActive: Date.now(),
        });
        console.log('🚪 FirebaseUtils: Truck location updated successfully');
      } catch (updateError) {
        // If document doesn't exist, create it with offline status
        console.log('🚪 FirebaseUtils: Document may not exist, creating with offline status');
        await setDoc(truckDocRef, {
          ownerUid: user.uid,
          isLive: false,
          visible: false,
          lastActive: Date.now(),
          updatedAt: new Date(),
        }, { merge: true });
        console.log('🚪 FirebaseUtils: Truck location document created with offline status');
      }
    }
  } catch (error) {
    console.error('🚪 FirebaseUtils: Error hiding truck during logout:', error);
    // Continue with logout even if truck update fails
  }
  
  await signOut(auth);
  console.log('🚪 FirebaseUtils: User successfully logged out');
};