import React, { useEffect, useState, useRef } from "react";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  onSnapshot,
  collection,
  arrayUnion,
  query,
  where,
  or,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import MediaUploader from "./MediaUploader";
import "../assets/index.css";
import { logoutUser } from "../utils/firebaseUtils";
import HeatMap from "../components/HeatMap";
import Navbar from "../components/navbar";
import "../assets/navbar.css";
import "../assets/social-icon.css";
import truckIconImg from "/truck-icon.png";
import trailerIconImg from "/trailer-icon.png";
import cartIconImg from "/cart-icon.png";
import grubanaLogoImg from "../assets/grubana-logo.png";
import Analytics from "./analytics";
import { FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa";
import { useAuth } from "./AuthContext";
import useLiveLocationTracking from "../hooks/useLiveLocationTracking";
import NewDropForm from "./NewDropForm";
import { QRCodeCanvas } from "qrcode.react";


const Dashboard = ({ isLoaded }) => {
  const { user, userPlan, userRole, userSubscriptionStatus } = useAuth(); // Get subscription status too
  useLiveLocationTracking(userPlan);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [userEmail, setUserEmail] = useState(null);
  const [username, setUsername] = useState("");
  const [isVisible, setIsVisible] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [truckName, setTruckName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [ownerData, setOwnerData] = useState(null);
  const [visibilityUpdateInProgress, setVisibilityUpdateInProgress] = useState(false);
  const [truckLat, setTruckLat] = useState(null);
  const [truckLng, setTruckLng] = useState(null);
  const [drops, setDrops] = useState([]);
  const [socialLinks, setSocialLinks] = useState({
    instagram: "",
    facebook: "",
    tiktok: "",
    twitter: "",
  });

  console.log("user:", user);
console.log("userRole:", userRole);
console.log("userPlan:", userPlan);
console.log("Dashboard component rendering for OWNER");

  const truckMarkerRef = useRef(null);
  const qrRef = useRef(null);
  const auth = getAuth();
  const navigate = useNavigate();

 const getOwnerTruckIcon = (kitchenType) => {
  const type = (kitchenType || 'truck').toLowerCase();
  switch (type) {
    case 'trailer':
      return trailerIconImg;
    case 'cart':
      return cartIconImg;
    default:
      return truckIconImg;
  }
};

  // Track previous plan to detect upgrade
  const prevPlanRef = useRef();
  useEffect(() => {
    prevPlanRef.current = userPlan;
  }, [userPlan]);
  const previousPlan = prevPlanRef.current;

  // --- Place this useEffect after the above ---
  useEffect(() => {
  // Only run if user and userRole are loaded
  if (user && userRole === "owner" && userPlan && userPlan !== "all-access" && userPlan !== "basic") {
    navigate("/checkout");

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await setDoc(doc(db, 'truckLocations', user.uid), {
              lat: latitude,
              lng: longitude,
              isLive: true,
              visible: true,
              updatedAt: serverTimestamp(),
              lastActive: Date.now(),
            }, { merge: true });
            //console.log("Truck location updated after plan upgrade.");
          },
          (error) => {
            console.error('Geolocation error:', error);
          }
        );
      }
    }
  }, [userPlan, userRole, user, previousPlan]);

  // Geolocation for All Access Plan
  useEffect(() => {
    if (userRole === "owner" && userPlan === "all-access") {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          //console.log('Geolocation success:', position.coords);
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Geolocation error: ", error);
        }
      );
    }
  }, [userRole, userPlan]);

  useEffect(() => {
  if (location && window.google && window.google.maps) {
    const geocoder = new window.google.maps.Geocoder();
    const latlng = { lat: location.latitude, lng: location.longitude };
    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === "OK" && results[0]) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress("Address not found");
      }
    });
  }
}, [location]);

  // Handle manual location input for Basic Plan
  const handleLocationChange = (e) => {
    setManualLocation(e.target.value);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  //console.log("Submitting manual location: ", manualLocation);
  if (userPlan === "basic" && user?.uid) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: manualLocation }, async (results, status) => {
        if (status === "OK" && results[0]) {
          const { lat, lng } = results[0].geometry.location;
          //console.log("Geocoded lat/lng:", lat(), lng());
          const truckDocRef = doc(db, "truckLocations", user.uid);
          await setDoc(truckDocRef, {
            manualLocation,
            lat: lat(),
            lng: lng(),
            updatedAt: new Date(),
            isLive: true,
            visible: true,
            lastActive: Date.now(),
            ownerUid: user.uid,
            kitchenType: ownerData?.kitchenType || "truck",
          });
          //console.log("Manual location submitted and geocoded:", lat(), lng());
        } else {
          //console.error("Geocode error:", status);
          alert("Could not locate address. Please try a different one.");
        }
      });
    } catch (error) {
      //console.error("Error saving manual location: ", error);
    }
  }
};

  useEffect(() => {
    const fetchOwnerData = async () => {
      if (!user?.uid) return;
      //console.log("Fetching owner data for UID:", user.uid);
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        //console.log("Owner data fetched:", docSnap.data());
        setOwnerData({ uid: user.uid, ...docSnap.data() });
      } else {
        //console.warn("Owner document not found for UID:", user.uid);
      }
    };

    fetchOwnerData();
  }, [user]);

  useEffect(() => {
    const fetchSocialLinks = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSocialLinks({
            instagram: userData.instagram || "",
            facebook: userData.facebook || "",
            tiktok: userData.tiktok || "",
            twitter: userData.x || "",
          });
        }
      }
    };

    fetchSocialLinks();
  }, [user]);

  useEffect(() => {
    const fetchVisibility = async () => {
      if (user) {
        const docRef = doc(db, "truckLocations", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsVisible(data.visible !== false);
        }
      }
    };
    fetchVisibility();
  }, [user]);

const handleToggle = async () => {
  const newVisibility = !isVisible;
  setIsVisible(newVisibility);
  setVisibilityUpdateInProgress(true); // prevent re-sync flicker

  if (user) {
    const truckDocRef = doc(db, "truckLocations", user.uid);
    await updateDoc(truckDocRef, {
      visible: newVisibility,
      isLive: newVisibility,
      lastActive: Date.now(),
    });

    // --- Update liveSessions in users collection ---
    const userDocRef = doc(db, "users", user.uid);
    if (newVisibility) {
      // Truck is going live: add a new session with start timestamp
      await updateDoc(userDocRef, {
        liveSessions: arrayUnion({ start: Timestamp.now() })
      });
    } else {
      // Truck is going offline: set end timestamp for the last session
      const userDoc = await getDoc(userDocRef);
      const sessions = userDoc.data().liveSessions || [];
      if (sessions.length > 0 && !sessions[sessions.length - 1].end) {
        sessions[sessions.length - 1].end = Timestamp.now();
        await updateDoc(userDocRef, { liveSessions: sessions });
      }
    }
    // --- End liveSessions update ---

    setTimeout(() => {
      setVisibilityUpdateInProgress(false); // let snapshot updates resume
    }, 1000); // allow Firestore time to propagate
  }
};

const handleLogout = async () => {
  try {
    if (user?.uid) {
      await updateDoc(doc(db, "truckLocations", user.uid), {
        isLive: false,
        visible: false,
        lastActive: Date.now(),
      });
    }
    await logoutUser();
    navigate("/login");
  } catch (error) {
    console.error("Logout failed:", error.message);
  }
};

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.role !== "owner") {
          navigate("/customer-dashboard");
          return;
        }

        setUserEmail(user.email);
        setUsername(data.username || "");
      }
    };

    fetchUserData();
  }, [user]);

  // Marker/map useEffect (controls marker visibility and position)
useEffect(() => {
  if (!isLoaded || !mapRef || !user?.uid) return; // stronger check

  const docRef = doc(db, "truckLocations", user.uid);

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (!docSnap.exists()) return;

    const data = docSnap.data();

    //console.log("Fetched truckLocations data:", data);

    const { lat, lng, isLive, visible } = data;

    // Prevent marker logic from running prematurely
    if (!lat || !lng || !isLive || typeof visible !== "boolean") return;
    //console.warn("Skipping marker creation due to missing data", { lat, lng, isLive, visible });
    //console.log("Owner dashboard marker kitchenType:", data.kitchenType);
    //console.log("Icon URL:", getOwnerTruckIcon(data.kitchenType));
    
    const position = { lat, lng };

    if (!truckMarkerRef.current) {
      truckMarkerRef.current = new window.google.maps.Marker({
        position,
        map: visible ? mapRef : null,
      icon: {
  url: getOwnerTruckIcon(data.kitchenType),
  scaledSize: new window.google.maps.Size(40, 40),
},
        title: "Your Food Truck",
      });
    } else {
      truckMarkerRef.current.setPosition(position);
      truckMarkerRef.current.setMap(visible ? mapRef : null);
    }

    setIsVisible(visible);
  }, (error) => {
    console.error("onSnapshot error:", error); // capture permission-denied explicitly
  });

  return () => {
    //console.log("Cleaning up marker for user", user?.uid);
    if (truckMarkerRef.current) {
      truckMarkerRef.current.setMap(null);
      truckMarkerRef.current = null;
    }
    unsubscribe();
  };
}, [isLoaded, mapRef, user]);

// Fetch drops (top-level useEffect)
useEffect(() => {
  if (!user?.uid) return;
  const dropsQuery = query(
    collection(db, "drops"),
    where("truckId", "==", user.uid)
  );

  const fetchDrops = async () => {
    try {
      const querySnapshot = await getDocs(dropsQuery);
      const dropsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrops(dropsData);
    } catch (error) {
      console.error("Error fetching drops:", error);
    }
  };

  fetchDrops();
}, [user]);

// Fetch truck lat/lng (top-level useEffect)
useEffect(() => {
  const fetchTruckLocation = async () => {
    if (!user?.uid) return;
    const docRef = doc(db, "truckLocations", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setTruckLat(data.lat);
      setTruckLng(data.lng);
    }
  };

  fetchTruckLocation();
}, [user]);

useEffect(() => {
  if (!user?.uid) return;
  const truckDocRef = doc(db, "truckLocations", user.uid);

  const interval = setInterval(() => {
    updateDoc(truckDocRef, {
      lastActive: Date.now(),
    });
  }, 60 * 1000);

  return () => clearInterval(interval);
}, [user]);

// Download QR code handler
  const handleDownloadQR = () => {
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = "grubana-qr.png";
    link.click();
  };

  return (
    <div className="dashboard">
      {/* Logo Section */}
      <div style={{ 
        textAlign: 'center', 
        margin: '0 0 20px 0', 
        background: 'transparent !important',
        padding: '10px 0',
        borderRadius: '8px',
        boxShadow: 'none !important'
      }}>
        <img 
          src={grubanaLogoImg} 
          alt="Grubana Logo" 
          style={{ 
            height: '80px', 
            width: 'auto',
            maxWidth: '300px',
            objectFit: 'contain',
            background: 'transparent',
            border: 'none'
          }}
          onError={(e) => {
            console.error('Logo failed to load from assets, trying public path');
            e.target.src = "/grubana-logo.png";
            e.target.onerror = () => {
              console.error('All logo paths failed, showing text fallback');
              e.target.style.display = 'none';
              const textLogo = document.createElement('h1');
              textLogo.innerHTML = 'GRUBANA';
              textLogo.style.cssText = 'color: #2c6f57; margin: 0; font-size: 2.5rem; font-weight: bold;';
              e.target.parentNode.appendChild(textLogo);
            };
          }}
          onLoad={() => {
            console.log('Grubana logo loaded successfully from:', grubanaLogoImg);
          }}
        />
      </div>
      <h2>Welcome{username ? `, ${username}` : ""}!</h2>
      <div style={{ 
        background: '#e8f5e8', 
        padding: '10px', 
        borderRadius: '8px', 
        marginBottom: '15px',
        border: '2px solid #28a745'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#28a745' }}>
          🚚 OWNER DASHBOARD - This is the food truck owner interface
        </p>
        <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#666' }}>
          Role: {userRole} | User ID: {user?.uid?.slice(-8)}
        </p>
      </div>
      {userEmail && <p>Email: {userEmail}</p>}
      {userPlan ? (
        <div style={{ margin: "15px 0", padding: "15px", backgroundColor: 
          userPlan === "basic" ? "#f8f9fa" : 
          userPlan === "pro" ? "#e8f5e8" : "#e3f2fd", 
          borderRadius: "8px", border: `2px solid ${
          userPlan === "basic" ? "#dee2e6" : 
          userPlan === "pro" ? "#28a745" : "#2196f3"}`
        }}>
          <p style={{ margin: "0", fontWeight: "bold", fontSize: "1.1rem" }}>
            Current Plan: <span style={{ textTransform: "uppercase", color: 
              userPlan === "basic" ? "#6c757d" : 
              userPlan === "pro" ? "#28a745" : "#2196f3" 
            }}>{userPlan}</span>
            {userPlan === "basic" && " (Free)"}
            {userPlan === "pro" && " ($9.99/month)"}
            {userPlan === "all-access" && " ($19.99/month)"}
          </p>
          <div style={{ fontSize: "0.9rem", marginTop: "10px", color: "#666" }}>
            {userPlan === "basic" && (
              <div>
                ✅ Discovery map • ✅ Demand pins • ✅ Manual location updates
                <br />
                🚀 <em>Upgrade for real-time GPS tracking and more!</em>
              </div>
            )}
            {userPlan === "pro" && (
              <div>
                ✅ Real-time GPS tracking • ✅ Menu display • ✅ Citywide heat maps
                <br />
                📊 <em>Upgrade to All Access for analytics and promotional drops!</em>
              </div>
            )}
            {userPlan === "all-access" && (
              <div>
                ✅ Advanced analytics • ✅ Promotional drops • ✅ Featured placement
                <br />
                🎉 <em>You have access to all features!</em>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p>Loading plan info...</p>
      )}

      {/* --- PAYMENT INCOMPLETE WARNING --- */}
      {userRole === "owner" && userPlan === "basic" && (
        <div style={{ 
          margin: "20px 0", 
          padding: "20px", 
          backgroundColor: "#fff3cd", 
          borderRadius: "8px",
          border: "2px solid #ffc107",
          textAlign: "center"
        }}>
          <h3 style={{ color: "#856404", marginBottom: "15px" }}>⚠️ Complete Your Upgrade</h3>
          <p style={{ color: "#856404", marginBottom: "15px" }}>
            You're currently on the Basic plan. Complete your upgrade to unlock premium features!
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              style={{
                padding: "12px 20px",
                background: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                fontSize: "1rem",
                cursor: "pointer",
                fontWeight: "bold"
              }}
              onClick={() => {
                navigate("/checkout", { state: { selectedPlan: 'pro' } });
              }}
            >
              Upgrade to Pro ($9.99/mo)
            </button>
            <button
              style={{
                padding: "12px 20px",
                background: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                fontSize: "1rem",
                cursor: "pointer",
                fontWeight: "bold"
              }}
              onClick={() => {
                navigate("/checkout", { state: { selectedPlan: 'all-access' } });
              }}
            >
              Upgrade to All Access ($19.99/mo)
            </button>
          </div>
        </div>
      )}

      {/* --- UPGRADE BUTTONS FOR BASIC AND PRO PLAN OWNERS --- */}
      {userRole === "owner" && userPlan === "basic" && (
        <div style={{ margin: "20px 0", textAlign: "center" }}>
          <p style={{ marginBottom: "10px", color: "#666" }}>
            🚀 Unlock real-time GPS tracking, menu display, and citywide heat maps
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              style={{
                padding: "10px 20px",
                background: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                fontSize: "1rem",
                cursor: "pointer"
              }}
              onClick={() => {
                navigate("/checkout", { state: { selectedPlan: 'pro' } });
              }}
            >
              Upgrade to Pro ($9.99/mo)
            </button>
            <button
              style={{
                padding: "10px 20px",
                background: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                fontSize: "1rem",
                cursor: "pointer"
              }}
              onClick={() => {
                navigate("/checkout", { state: { selectedPlan: 'all-access' } });
              }}
            >
              Upgrade to All Access ($19.99/mo)
            </button>
          </div>
        </div>
      )}

      {userRole === "owner" && userPlan === "pro" && (
        <div style={{ margin: "20px 0", textAlign: "center" }}>
          <p style={{ marginBottom: "10px", color: "#666" }}>
            📊 Unlock advanced analytics, promotional drops, and featured placement
          </p>
          <button
            style={{
              padding: "10px 24px",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              fontSize: "1rem",
              cursor: "pointer"
            }}
            onClick={() => {
              navigate("/checkout", { state: { selectedPlan: 'all-access' } });
            }}
          >
            Upgrade to All Access ($19.99/mo)
          </button>
        </div>
      )}

      {/* Location Section - Feature Gated by Plan */}
      {userPlan === "basic" ? (
        <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
          <h3>📍 Manual Location Entry</h3>
          <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "10px" }}>
            Basic plan allows manual location updates. Upgrade for real-time GPS tracking!
          </p>
          <form onSubmit={handleSubmit}>
            <label>Enter your truck's location:</label>
            <input
              type="text"
              value={manualLocation}
              onChange={handleLocationChange}
              placeholder="Enter address or coordinates"
              required
              style={{ 
                width: "100%", 
                padding: "8px", 
                margin: "8px 0",
                borderRadius: "4px",
                border: "1px solid #ddd"
              }}
            />
            <button 
              type="submit"
              style={{
                padding: "8px 16px",
                background: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Save Location
            </button>
          </form>
        </div>
      ) : userPlan === "pro" || userPlan === "all-access" ? (
        <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#e8f5e8", borderRadius: "8px" }}>
          <h3>🛰️ Real-Time GPS Location</h3>
          <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "10px" }}>
            Your location is automatically tracked and updated in real-time.
          </p>
          {location ? (
            <p style={{ color: "#28a745" }}>
              📍 {address ? address : "Loading address..."}
            </p>
          ) : (
            <p>Loading location...</p>
          )}
        </div>
      ) : (
        <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "8px" }}>
          <p>Loading location features...</p>
        </div>
      )}

     {userPlan === "all-access" ? (
  truckLat && truckLng ? (
    <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <NewDropForm truckLat={truckLat} truckLng={truckLng} />
    </div>
  ) : (
    <p>Loading your truck’s location for drops...</p>
  )
) : null}

      {/* Media Uploader - Enhanced for Pro+ Plans */}
      <div style={{ margin: "20px 0" }}>
        {userPlan === "basic" ? (
          <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
            <h3>📸 Media Upload (Basic)</h3>
            <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "10px" }}>
              Upload your profile and menu images. Upgrade for real-time menu display on map!
            </p>
            <MediaUploader showCover={true} showProfile={false} showMenu={true} />
          </div>
        ) : (
          <div style={{ padding: "15px", backgroundColor: "#e8f5e8", borderRadius: "8px" }}>
            <h3>📸 Media Upload (Pro+)</h3>
            <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "10px" }}>
              Your menu will be displayed in real-time when customers click your map icon!
            </p>
            <MediaUploader showCover={true} showProfile={false} showMenu={true} />
          </div>
        )}
      </div>

      {/* Promotional Drops - All Access Only */}
      {userPlan === "all-access" ? (
        truckLat && truckLng ? (
          <div style={{ 
            marginTop: "20px", 
            padding: "15px", 
            backgroundColor: "#e3f2fd", 
            borderRadius: "8px",
            border: "2px solid #2196f3"
          }}>
            <h3>🎯 Create Promotional Drops</h3>
            <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "15px" }}>
              Create special deals and promotions for customers to claim!
            </p>
            <NewDropForm truckLat={truckLat} truckLng={truckLng} />
          </div>
        ) : (
          <p>Loading your truck's location for drops...</p>
        )
      ) : (
        <div style={{ 
          marginTop: "20px", 
          padding: "15px", 
          backgroundColor: "#fff3cd", 
          borderRadius: "8px",
          border: "1px solid #ffc107"
        }}>
          <h3>🎯 Promotional Drops (All Access Feature)</h3>
          <p style={{ fontSize: "0.9rem", color: "#856404", marginBottom: "10px" }}>
            Create special deals and promotions that customers can claim directly from the map. 
            This feature is available with the All Access plan.
          </p>
          <button
            style={{
              padding: "8px 16px",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
            onClick={() => navigate("/checkout", { state: { selectedPlan: 'all-access' } })}
          >
            Upgrade to All Access
          </button>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
  <label style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    <input
      type="checkbox"
      checked={isVisible === true}
      disabled={isVisible === null}
      onChange={handleToggle}
      style={{ marginBottom: "5px" }} // space between checkbox and text
    />
    <span>
      {isVisible ? "Visible on Map" : "Hidden from Map"}
    </span>
  </label>
</div>

      <h2>Live Demand Map</h2>
      {userPlan === "basic" ? (
        <p>
          Customers can click on your truck icon to see basic information. 
          <br />
          The heat map below shows where customers are requesting mobile vendors in real time.
          <br />
          <span style={{ color: "#666", fontStyle: "italic" }}>
            Upgrade to Pro for real-time menu display and citywide heat maps, or All Access for advanced analytics!
          </span>
        </p>
      ) : (
        <p>
          Customers can click on your truck icon to display your menu{userPlan === "all-access" ? " and claim your promotional drops" : ""}! 
          <br />
          The heat map below shows where customers are requesting mobile vendors in real time:
        </p>
      )}
      <HeatMap isLoaded={isLoaded} onMapLoad={setMapRef} userPlan={userPlan} />

      {/* Analytics Section - Plan-based Access */}
      {ownerData && userPlan === "all-access" && (
        <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
          <h3>📊 Advanced Analytics Dashboard</h3>
          <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "15px" }}>
            30-day analytics, trends, and insights to optimize your business.
          </p>
          <Analytics userId={user?.uid} ownerData={ownerData} />
        </div>
      )}

      {ownerData && userPlan === "pro" && (
        <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "8px" }}>
          <h3>📊 Analytics (All Access Feature)</h3>
          <p style={{ fontSize: "0.9rem", color: "#856404", marginBottom: "10px" }}>
            Get detailed 30-day analytics, customer insights, and trend analysis with the All Access plan.
          </p>
          <button
            style={{
              padding: "8px 16px",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
            onClick={() => navigate("/checkout", { state: { selectedPlan: 'all-access' } })}
          >
            Upgrade to All Access
          </button>
        </div>
      )}

      {ownerData && userPlan === "basic" && (
        <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
          <h3>📊 Analytics (Pro+ Feature)</h3>
          <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "10px" }}>
            Get detailed analytics and customer insights to grow your business.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              style={{
                padding: "8px 16px",
                background: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
              onClick={() => navigate("/checkout", { state: { selectedPlan: 'pro' } })}
            >
              Upgrade to Pro
            </button>
            <button
              style={{
                padding: "8px 16px",
                background: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
              onClick={() => navigate("/checkout", { state: { selectedPlan: 'all-access' } })}
            >
              Upgrade to All Access
            </button>
          </div>
        </div>
      )}

{/* --- QR CODE SECTION START --- */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '40px 0 20px 0' }}>
        <h3 style={{ textAlign: 'center', marginBottom: 8 }}>Scan or Share the QR Code!</h3>
        <div ref={qrRef} style={{ marginBottom: 8 }}>
          <QRCodeCanvas value="https://grubana.com" size={128} />
        </div>
        <button
          onClick={handleDownloadQR}
          style={{
            padding: "6px 18px",
            background: "#2c6f57",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            fontSize: "1rem",
            cursor: "pointer"
          }}
        >
          Download QR Code to Share!
        </button>
      </div>
      {/* --- QR CODE SECTION END --- */}

<h3 style={{ textAlign: 'center' }}>Follow Us</h3>

<div
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginTop: '10px',
  }}
>
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '20px',
      fontSize: '28px',
      marginBottom: '16px',
    }}
  >
    {socialLinks.instagram && (
      <a
        href={socialLinks.instagram}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#E1306C' }}
        className="social-icon"
      >
        <FaInstagram />
      </a>
    )}
    {socialLinks.facebook && (
      <a
        href={socialLinks.facebook}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#1877F2' }}
        className="social-icon"
      >
        <FaFacebook />
      </a>
    )}
    {socialLinks.tiktok && (
      <a
        href={socialLinks.tiktok}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#010101' }}
        className="social-icon"
      >
        <FaTiktok />
      </a>
    )}
    <a
      href="#"
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#000000' }}
      className="social-icon"
      aria-label="X"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="28"
        viewBox="0 0 448 512"
        fill="currentColor"
      >
        <path d="M400 32L272 208l128 240H320L224 280 128 480H48L176 288 48 32h96l96 160L304 32h96z" />
      </svg>
    </a>
  </div>

  <a
    href="#"
    onClick={e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}
    style={{
      display: "inline-block",
      color: "#2c6f57",
      textDecoration: "underline",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "16px",
      margin: "0 auto"
    }}
  >
    Back to Top ↑
  </a>
</div>
    </div>
  );
};

export default Dashboard;