import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, setDoc, onSnapshot, updateDoc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// Import live location tracking logic
let watchId = null;

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [userSubscriptionStatus, setUserSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previousUser, setPreviousUser] = useState(null);
  const auth = getAuth();

  console.log(`🔐 AuthContext state:`, { 
    user: user?.email, 
    userRole, 
    userPlan, 
    userSubscriptionStatus, 
    loading 
  });

  useEffect(() => {
    let unsubUserDoc = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Store previous user state for comparison
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

      try {
        const userDocRef = doc(db, "users", currentUser.uid);

        unsubUserDoc = onSnapshot(
          userDocRef, 
          async (userSnap) => {
            try {
              if (!userSnap.exists()) {
                // CRITICAL: Don't create default user document immediately
                // This prevents overriding the user document created during signup
                console.log('🚀 AuthContext: User document does not exist yet, waiting for signup to complete...');
                
                // Wait a moment to see if signup is creating the document
                setTimeout(async () => {
                  try {
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
                  } catch (timeoutError) {
                
                    // Set defaults even if creation fails
                    setUserRole("customer");
                    setUserPlan("basic");
                    setUserSubscriptionStatus("active");
                  }
                }, 2000); // Wait 2 seconds for signup to complete
                
                // Set loading state while waiting
                setUserRole(null);
                setUserPlan(null);
                setUserSubscriptionStatus(null);
              } else {
       
                const data = userSnap.data();
                console.log('🔍 AuthContext user data:', {
                  plan: data.plan,
                  subscriptionStatus: data.subscriptionStatus,
                  role: data.role
                });
                
                setUserRole(data.role || "customer");
                setUserPlan(data.plan || "basic");
                
   
                
                // More defensive subscription status handling
                let subscriptionStatus = data.subscriptionStatus;
                
                // If plan is basic and no subscription status, default to active
                if (data.plan === "basic" && !subscriptionStatus) {
                  subscriptionStatus = "active";
         
                }
                
                // If plan is pro/all-access and no subscription status, keep it null for admin override
                if ((data.plan === "pro" || data.plan === "all-access") && !subscriptionStatus) {
         
                  subscriptionStatus = null; // Explicitly keep as null for admin overrides
                }
                
         
                setUserSubscriptionStatus(subscriptionStatus);
              }
              setLoading(false);
            } catch (error) {
    
              // Don't crash the app on Firestore errors, set safe defaults
              if (error.code === 'permission-denied') {
            
                setUserRole(null);
                setUserPlan(null);
                setUserSubscriptionStatus(null);
              } else {
                // For other errors, set safe defaults
                setUserRole("customer");
                setUserPlan("basic");
                setUserSubscriptionStatus("active");
              }
              setLoading(false);
            }
          }, 
          (error) => {
            // Handle listener errors (like permission denied)
    
            if (error.code === 'permission-denied') {
      
              // Clean up the listener
              if (unsubUserDoc) {
                unsubUserDoc();
                unsubUserDoc = null;
              }
            }
            // Set safe defaults
            setUserRole(null);
            setUserPlan(null);
            setUserSubscriptionStatus(null);
            setLoading(false);
          }
        );
      } catch (error) {
    
        // Set safe defaults if listener setup fails
        setUserRole("customer");
        setUserPlan("basic");
        setUserSubscriptionStatus("active");
        setLoading(false);
      }
    });

    // Cleanup both listeners on unmount
    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, [auth, previousUser]);

  // Global live location tracking for owners
  useEffect(() => {
    // Only enable live tracking for owners with Pro and All Access plans
    if (userRole !== "owner" || (userPlan !== "pro" && userPlan !== "all-access")) {
      // Clear any existing tracking
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      return;
    }



    const startLiveTracking = () => {
      // Check if geolocation is available and if we're in a secure context (HTTPS or localhost)
      if (!("geolocation" in navigator)) {
     
        return;
      }

      // Check if we're in a secure context (required for geolocation on mobile)
      if (!window.isSecureContext && window.location.protocol !== 'http:') {
  
        return;
      }

      try {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const uid = user?.uid;

            if (uid) {
              try {
                // Check if user is still authenticated before writing to Firestore
                if (!auth.currentUser) {
     
                  return;
                }

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
                    // Preserve existing visibility settings
                    isLive: existingData.isLive !== undefined ? existingData.isLive : false,
                    visible: existingData.visible !== undefined ? existingData.visible : false,
                  },
                  { merge: true }
                );

               
              } catch (error) {
              
                // Check if it's a permission error (user logged out)
                if (error.code === 'permission-denied') {
                  console.log("🌍 AuthContext: Permission denied - user likely logged out, stopping location tracking");
                  if (watchId) {
                    navigator.geolocation.clearWatch(watchId);
                    watchId = null;
                  }
                }
              }
            }
          },
          (err) => {
     
            // Don't crash the app on geolocation errors
            if (err.code === err.PERMISSION_DENIED) {
       
            } else if (err.code === err.POSITION_UNAVAILABLE) {
          
            } else if (err.code === err.TIMEOUT) {
       
            }
          },
          { 
            enableHighAccuracy: true, 
            maximumAge: 30000, 
            timeout: 15000 // Increased timeout for mobile
          }
        );
      } catch (error) {
 
      }
    };

    startLiveTracking();

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        console.log('🌍 AuthContext: Stopped live location tracking');
      }
    };
  }, [userRole, userPlan, user]);

  return (
    <AuthContext.Provider value={{ user, userRole, userPlan, userSubscriptionStatus, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);