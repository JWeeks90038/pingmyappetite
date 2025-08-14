import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [userSubscriptionStatus, setUserSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    let unsubUserDoc = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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
          const newUser = {
            uid: currentUser.uid,
            username: currentUser.displayName || "",
            email: currentUser.email || "",
            role: "customer",
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
        } else {
          const data = userSnap.data();
          console.log('🔍 AuthContext - User data from Firestore:', data);
          
          setUserRole(data.role || "customer");
          setUserPlan(data.plan || "basic");
          
          // More defensive subscription status handling
          let subscriptionStatus = data.subscriptionStatus;
          
          console.log('🔍 AuthContext - Raw subscription status:', subscriptionStatus);
          console.log('🔍 AuthContext - User plan:', data.plan);
          
          // If plan is basic and no subscription status, default to active
          if (data.plan === "basic" && !subscriptionStatus) {
            subscriptionStatus = "active";
            console.log('🔍 AuthContext - Set basic plan to active');
          }
          // If plan is pro/all-access and no subscription status, keep it as is (might be loading)
          
          console.log('🔍 AuthContext - Final subscription status:', subscriptionStatus);
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
  }, [auth]);

  return (
    <AuthContext.Provider value={{ user, userRole, userPlan, userSubscriptionStatus, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);