import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // adjust import path if needed

function useSubscriptionStatus() {
  const [status, setStatus] = useState(null);
  const [plan, setPlan] = useState('basic');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setStatus(userData.subscriptionStatus || null);
          setPlan(userData.plan || 'basic');
        } else {
          setStatus(null);
          setPlan('basic');
        }
      } else {
        setStatus(null);
        setPlan('basic');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { status, plan, loading };
}

export default useSubscriptionStatus;