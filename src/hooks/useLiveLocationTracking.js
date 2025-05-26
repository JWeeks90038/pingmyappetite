// useLiveLocationTracking.js
import { useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase"; // adjust as needed

let watchId = null;

const useLiveLocationTracking = (userPlan) => {
  useEffect(() => {
    if (userPlan !== "all-access") return;

    const startLiveTracking = () => {
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const uid = auth.currentUser?.uid;

            if (uid) {
              const docRef = doc(db, "truckLocations", uid);
              const snapshot = await getDoc(docRef);
              const existingData = snapshot.exists() ? snapshot.data() : {};

              const userDocRef = doc(db, "users", uid);
              const userSnapshot = await getDoc(userDocRef);
              const userData = userSnapshot.exists() ? userSnapshot.data() : {};

              await setDoc(
                docRef,
                {
                  lat: latitude,
                  lng: longitude,
                  updatedAt: serverTimestamp(),
                  lastActive: Date.now(),
                  ownerUid: uid,
                  uid: uid,
                  cuisine: existingData.cuisine || userData.cuisine || "Not specified",
                  truckName: existingData.truckName || userData.truckName || "Unnamed Truck",
                },
                { merge: true }
              );

              console.log("Live GPS position saved:", { latitude, longitude });
            }
          },
          (err) => console.error("Error getting location:", err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
      } else {
        console.warn("Geolocation not supported");
      }
    };

    startLiveTracking();

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [userPlan]);
};

export default useLiveLocationTracking;