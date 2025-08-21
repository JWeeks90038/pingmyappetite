import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, setDoc, onSnapshot, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [userSubscriptionStatus, setUserSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previousUser, setPreviousUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    let unsubUserDoc = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Handle user logout - hide truck from map when user changes from logged in to logged out
      if (previousUser && !currentUser) {
        console.log('🚪 AuthContext: User logged out, hiding truck from map for:', previousUser.uid);
        try {
          const truckDocRef = doc(db, "truckLocations", previousUser.uid);
          await updateDoc(truckDocRef, {
            isLive: false,
            visible: false,
            lastActive: Date.now(),
          });
          console.log('🚪 AuthContext: Truck successfully hidden on logout');
        } catch (error) {
          console.error('🚪 AuthContext: Error hiding truck on logout:', error);
        }
      }

      setPreviousUser(currentUser);

      if (!currentUser) {
        setUser(null);
        setUserRole(null);
        setUserPlan(null);
        setUserSubscriptionStatus(null);
        setLoading(false);
        if (unsubUserDoc) unsubUserDoc();
        return;
      }

      setUser(currentUser);

      const userDocRef = doc(db, "users", currentUser.uid);

      unsubUserDoc = onSnapshot(userDocRef, async (userSnap) => {
        if (!userSnap.exists()) {
          // CRITICAL: Don't create default user document immediately
          // This prevents overriding the user document created during signup
          console.log('🚀 AuthContext: User document does not exist yet, waiting for signup to complete...');
          
          // Wait a moment to see if signup is creating the document
          setTimeout(async () => {
            const retrySnap = await getDoc(userDocRef);
            if (!retrySnap.exists()) {
              console.log('🚀 AuthContext: Creating default user document after timeout');
              const newUser = {
                uid: currentUser.uid,
                username: currentUser.displayName || "",
                email: currentUser.email || "",
                role: "customer", // Default to customer only if no signup document was created
                plan: "basic",
                subscriptionStatus: "active", // Basic is always active
                menuUrl: "",
                instagram: "",
                facebook: "",
                tiktok: "",
                twitter: "",
              };
              await setDoc(userDocRef, newUser);
              setUserRole(newUser.role);
              setUserPlan(newUser.plan);
              setUserSubscriptionStatus(newUser.subscriptionStatus);
            }
          }, 2000); // Wait 2 seconds for signup to complete
          
          // Set loading state while waiting
          setUserRole(null);
          setUserPlan(null);
          setUserSubscriptionStatus(null);
        } else {
          console.log('🚀 LATEST CODE: AuthContext updated - Version e1da37bc');
          const data = userSnap.data();
          setUserRole(data.role || "customer");
          setUserPlan(data.plan || "basic");
          
          // CRITICAL: Clean up truck location documents for non-owners
          if (data.role && data.role !== "owner") {
            console.log('🧹 AuthContext: Cleaning up truck location for non-owner user:', currentUser.uid, 'role:', data.role);
            const truckDocRef = doc(db, "truckLocations", currentUser.uid);
            
            try {
              const truckDocSnap = await getDoc(truckDocRef);
              if (truckDocSnap.exists()) {
                await deleteDoc(truckDocRef);
                console.log('🧹 AuthContext: Truck location document deleted for non-owner');
              }
            } catch (error) {
              console.error('🧹 AuthContext: Error deleting truck location document:', error);
            }
          }
          
          // More defensive subscription status handling
          let subscriptionStatus = data.subscriptionStatus;
          
          // If plan is basic and no subscription status, default to active
          if (data.plan === "basic" && !subscriptionStatus) {
            subscriptionStatus = "active";
          }
          // If plan is pro/all-access and no subscription status, keep it as is (might be loading)
          
          setUserSubscriptionStatus(subscriptionStatus);
        }
        setLoading(false);
      });
    });

    // Cleanup both listeners on unmount
    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, [auth, previousUser]);

  return (
    <AuthContext.Provider value={{ user, userRole, userPlan, userSubscriptionStatus, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);