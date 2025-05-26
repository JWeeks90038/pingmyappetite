import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
  console.log("[AuthContext] Setting up onAuthStateChanged listener");

  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
      console.warn("[AuthContext] No authenticated user found.");
      setUser(null);
      setUserRole(null);
      setUserPlan(null);
      setLoading(false);
      return;
    }

    try {
      console.log("[AuthContext] Authenticated user detected:", currentUser.uid);

      // Force refresh the ID token to ensure custom claims are included
      const idTokenResult = await currentUser.getIdTokenResult(true);
      console.log("[AuthContext] Custom claims:", idTokenResult.claims);

      // Log additional debugging info
      const token = await currentUser.getIdToken();
      console.log("[AuthContext] Firebase ID token:", token);
      console.log("[AuthContext] currentUser object:", currentUser);

      // Wait briefly to ensure Firestore gets the token correctly (helps fix timing issues)
      await new Promise((resolve) => setTimeout(resolve, 200));

      setUser(currentUser);

      const userDocRef = doc(db, "users", currentUser.uid);
      console.log("[AuthContext] Attempting to read Firestore user doc:", userDocRef.path);

      let userSnap;
      let retries = 3;
      while (retries > 0) {
        try {
          userSnap = await getDoc(userDocRef);
          console.log("[AuthContext] Successfully read user doc");
          break;
        } catch (err) {
          console.error("[AuthContext] Error reading user doc:", err);
          if (err.code === "permission-denied") {
            console.warn("[AuthContext] Firestore read failed, retrying in 200ms...", err);
            await new Promise((res) => setTimeout(res, 200));
            retries--;
          } else {
            throw err; // Some other error
          }
        }
      }
      if (!userSnap) {
        throw new Error("[AuthContext] Failed to fetch user doc after retries.");
      }

      if (!userSnap.exists()) {
        console.log("[AuthContext] User doc not found, creating new doc");
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
        console.log("[AuthContext] User doc data found:", data);
        setUserRole(data.role || "customer");
        setUserPlan(data.plan || "basic");
      }
    } catch (err) {
      console.error("[AuthContext] Error accessing Firestore user doc:", err);
      setUserRole(null);
      setUserPlan(null);
    }

    setLoading(false);
  });

  return () => {
    console.log("[AuthContext] Cleaning up onAuthStateChanged listener");
    unsubscribe();
  };
}, []);

  return (
    <AuthContext.Provider value={{ user, userRole, userPlan, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

