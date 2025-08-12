import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase"; // adjust import path if needed

function useSubscriptionStatus() {
  const [status, setStatus] = useState(null);
  const [plan, setPlan] = useState('basic');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            setStatus(userData.subscriptionStatus || null);
            setPlan(userData.plan || 'basic');
          } else {
            setStatus(null);
            setPlan('basic');
          }
          setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setStatus(null);
        setPlan('basic');
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return { status, plan, loading };
}

export default useSubscriptionStatus;