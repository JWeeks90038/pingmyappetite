import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // adjust import path if needed

function useSubscriptionStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setStatus(userDoc.exists() ? userDoc.data().subscriptionStatus : null);
      } else {
        setStatus(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { status, loading };
}

export default useSubscriptionStatus;