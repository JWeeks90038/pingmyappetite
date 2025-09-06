import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, updateDoc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

export const logoutUser = async () => {
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  
  try {
    // Update truck status on logout - set offline but PRESERVE user's visibility choice
    if (user?.uid) {
      console.log('🚪 FirebaseUtils: Setting truck offline on logout for user:', user.uid);
      const truckDocRef = doc(db, "truckLocations", user.uid);
      
      try {
        // Get current visibility setting to preserve it
        const currentDoc = await getDoc(truckDocRef);
        const currentVisible = currentDoc.exists() ? currentDoc.data().visible : true;
        
        console.log('🔒 PRIVACY: Preserving user visibility choice during logout:', currentVisible);
        
        // Update existing document - preserve visibility, just set offline
        await updateDoc(truckDocRef, {
          isLive: false,
          // DO NOT MODIFY visible field - preserve user's Hide Truck choice
          lastActive: Date.now(),
        });
        console.log('🚪 FirebaseUtils: Truck set offline, visibility choice preserved');
      } catch (updateError) {
        // If document doesn't exist, create it with default visibility
        console.log('🚪 FirebaseUtils: Document may not exist, creating with offline status');
        await setDoc(truckDocRef, {
          ownerUid: user.uid,
          isLive: false,
          visible: true, // Default for new documents only
          lastActive: Date.now(),
          updatedAt: new Date(),
        }, { merge: true });
        console.log('🚪 FirebaseUtils: Truck location document created with offline status');
      }
    }
  } catch (error) {
    console.error('🚪 FirebaseUtils: Error updating truck during logout:', error);
    // Continue with logout even if truck update fails
  }
  
  await signOut(auth);
  console.log('🚪 FirebaseUtils: User successfully logged out');
};

// Function to clean up truck location documents for non-owners
export const cleanupNonOwnerTruckLocations = async (userId, userRole) => {
  if (userRole !== "owner") {
    const db = getFirestore();
    const truckDocRef = doc(db, "truckLocations", userId);
    
    try {
      const docSnap = await getDoc(truckDocRef);
      if (docSnap.exists()) {
        console.log('🧹 Deleting truck location document for non-owner user:', userId, 'role:', userRole);
        await deleteDoc(truckDocRef);
        console.log('🧹 Truck location document deleted successfully');
      }
    } catch (error) {
      console.error('🧹 Error deleting truck location document:', error);
    }
  }
};