import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const userDataListenerRef = useRef(null);

  useEffect(() => {
    let unsubUserDoc = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setUserData(null);
        setUserRole(null);
        setUserPlan(null);
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
            username: '',
            email: currentUser.email || '',
            phone: '',
            role: 'customer',
            plan: 'basic',
            menuUrl: '',
            facebook: '',
            instagram: '',
            twitter: '',
            website: '',
            // CRITICAL PAYMENT FIELDS FOR NAVIGATION SECURITY
            subscriptionStatus: 'inactive',
            paymentCompleted: false,
            hasValidReferral: false,
            referralCode: null,
            stripeCustomerId: null,
            subscriptionId: null
          };
          
      
          await setDoc(userDocRef, newUser);
          setUserData(newUser);
          setUserRole(newUser.role);
          setUserPlan(newUser.plan);
        } else {
          const data = userSnap.data();
       
          
          // Only update state if data actually changed to prevent unnecessary re-renders
          const newUserData = { ...data, uid: currentUser.uid };
          const currentRole = data.role || "customer";
          const currentPlan = data.plan || "basic";
          
          setUserData(prevData => {
            if (JSON.stringify(prevData) !== JSON.stringify(newUserData)) {
              return newUserData;
            }
            return prevData;
          });
          
          setUserRole(prevRole => prevRole !== currentRole ? currentRole : prevRole);
          setUserPlan(prevPlan => prevPlan !== currentPlan ? currentPlan : prevPlan);
        }
        setLoading(false);
      });
    });

    // Cleanup both listeners on unmount
    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []); // Remove auth dependency to prevent re-initialization

  return (
    <AuthContext.Provider value={{ user, userData, userRole, userPlan, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
