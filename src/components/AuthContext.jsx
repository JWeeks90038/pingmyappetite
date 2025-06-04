import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    let unsubUserDoc = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
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
            username: currentUser.displayName || "",
            email: currentUser.email || "",
            role: "customer",
            plan: "basic",
            menuUrl: "",
            instagram: "",
            facebook: "",
            tiktok: "",
            twitter: "",
          };
          await setDoc(userDocRef, newUser);
          setUserRole(newUser.role);
          setUserPlan(newUser.plan);
        } else {
          const data = userSnap.data();
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
    <AuthContext.Provider value={{ user, userRole, userPlan, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);