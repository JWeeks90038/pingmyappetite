import React, { createContext, useContext, useEffect, useState } from "react";
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
          const userData = {
            uid: userDoc.id,
            username: data.username || '',
            email: data.email || '',
            phone: data.phone || '',
            role: data.role || 'customer',
            plan: data.plan || 'basic',
            menuUrl: data.menuUrl || '',
            facebook: data.facebook || '',
            instagram: data.instagram || '',
            twitter: data.twitter || '',
            website: data.website || '',
            // CRITICAL PAYMENT FIELDS FOR NAVIGATION SECURITY
            subscriptionStatus: data.subscriptionStatus || 'inactive',
            paymentCompleted: data.paymentCompleted || false,
            hasValidReferral: data.hasValidReferral || false,
            referralCode: data.referralCode || null,
            stripeCustomerId: data.stripeCustomerId || null,
            subscriptionId: data.subscriptionId || null
          };
          
          console.log('👤 AuthContext loaded user data:', {
            uid: userData.uid,
            plan: userData.plan,
            subscriptionStatus: userData.subscriptionStatus,
            paymentCompleted: userData.paymentCompleted,
            role: userData.role
          });
          await setDoc(userDocRef, newUser);
          setUserData(newUser);
          setUserRole(newUser.role);
          setUserPlan(newUser.plan);
        } else {
          const data = userSnap.data();
          console.log('🔍 Mobile AuthContext: User data loaded:', {
            plan: data.plan,
            subscriptionStatus: data.subscriptionStatus,
            paymentCompleted: data.paymentCompleted,
            role: data.role
          });
          setUserData(data);
          setUserRole(data.role || "customer");
          setUserPlan(data.plan || "basic");
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
    <AuthContext.Provider value={{ user, userData, userRole, userPlan, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
