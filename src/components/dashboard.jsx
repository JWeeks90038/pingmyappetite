import React, { useEffect, useState, useRef } from "react";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  onSnapshot,
  collection,
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
import Analytics from "./analytics";
import { FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa";
import { useAuth } from "./AuthContext";
import useLiveLocationTracking from "../hooks/useLiveLocationTracking";
import NewDropForm from "./NewDropForm";

const Dashboard = ({ isLoaded }) => {
  const { user, userPlan, userRole } = useAuth(); // Get user info (plan and role)
  useLiveLocationTracking(userPlan);
  const [location, setLocation] = useState(null);
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

  const truckMarkerRef = useRef(null);
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
    if (
      userRole === "owner" &&
      userPlan === "all-access" &&
      previousPlan === "basic"
    ) {
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
            console.log("Truck location updated after plan upgrade.");
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
          console.log('Geolocation success:', position.coords);
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

  // Handle manual location input for Basic Plan
  const handleLocationChange = (e) => {
    setManualLocation(e.target.value);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  console.log("Submitting manual location: ", manualLocation);
  if (userPlan === "basic" && user?.uid) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: manualLocation }, async (results, status) => {
        if (status === "OK" && results[0]) {
          const { lat, lng } = results[0].geometry.location;
          console.log("Geocoded lat/lng:", lat(), lng());
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
          console.log("Manual location submitted and geocoded:", lat(), lng());
        } else {
          console.error("Geocode error:", status);
          alert("Could not locate address. Please try a different one.");
        }
      });
    } catch (error) {
      console.error("Error saving manual location: ", error);
    }
  }
};

  useEffect(() => {
    const fetchOwnerData = async () => {
      if (!user?.uid) return;
      console.log("Fetching owner data for UID:", user.uid);
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log("Owner data fetched:", docSnap.data());
        setOwnerData(docSnap.data());
      } else {
        console.warn("Owner document not found for UID:", user.uid);
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

    setTimeout(() => {
      setVisibilityUpdateInProgress(false); // let snapshot updates resume
    }, 1000); // allow Firestore time to propagate
  }
};

  const handleLogout = async () => {
    try {
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

    console.log("Fetched truckLocations data:", data);

    const { lat, lng, isLive, visible } = data;

    // Prevent marker logic from running prematurely
    if (!lat || !lng || !isLive || typeof visible !== "boolean") return;
    console.warn("Skipping marker creation due to missing data", { lat, lng, isLive, visible });
    console.log("Owner dashboard marker kitchenType:", data.kitchenType);
    console.log("Icon URL:", getOwnerTruckIcon(data.kitchenType));
    
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
    console.log("Cleaning up marker for user", user?.uid);
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

  return (
    <div className="dashboard">
      <br />
      <h2>Welcome{username ? `, ${username}` : ""}!</h2>
      {userEmail && <p>Email: {userEmail}</p>}
      {userPlan ? (
        <p>
          Your current plan: <strong>{userPlan}</strong>
        </p>
      ) : (
        <p>Loading plan info...</p>
      )}

      {/* --- UPGRADE BUTTON FOR BASIC PLAN OWNERS --- */}
      {userRole === "owner" && userPlan === "basic" && (
        <div style={{ margin: "20px 0", textAlign: "center" }}>
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
              // Navigate to your existing payment page for upgrade
              navigate("/checkout");
            }}
          >
            Upgrade to All-Access Plan
          </button>
        </div>
      )}

      {/* Show location input for Basic Plan users */}
      {userPlan === "basic" ? (
        <form onSubmit={handleSubmit}>
          <label>Enter your truck's location:</label>
          <input
            type="text"
            value={manualLocation}
            onChange={handleLocationChange}
            placeholder="Enter address or coordinates"
            required
          />
          <button type="submit">Save Location</button>
        </form>
      ) : (
        <div>
          {/* For All Access Plan users, show geolocation */}
          <h3>Your Current Location (All Access):</h3>
          {location ? (
            <p>
              Lat: {location.latitude}, Long: {location.longitude}
            </p>
          ) : (
            <p>Loading location...</p>
          )}
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

      <MediaUploader showCover={true} showProfile={false} showMenu={true} />

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
      <p>
        Customers can click on your truck icon to display your menu on their
        dashboard! This is where customers are requesting trucks in real time:
      </p>
      <HeatMap isLoaded={isLoaded} onMapLoad={setMapRef} />

      <Analytics userId={user?.uid} ownerData={ownerData} />

      <h3 style={{ textAlign: 'center' }}>Follow Us</h3>

<div
  style={{
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    fontSize: '28px',
    marginTop: '10px',
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
    </div>
  );
};

export default Dashboard;