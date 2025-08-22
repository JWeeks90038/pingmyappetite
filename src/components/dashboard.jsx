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
import "../assets/index.css";
import { logoutUser, cleanupNonOwnerTruckLocations } from "../utils/firebaseUtils";
import HeatMap from "../components/HeatMap";
import Navbar from "../components/navbar";
import "../assets/navbar.css";
import "../assets/social-icon.css";
import truckIconImg from "/truck-icon.png";
import trailerIconImg from "/trailer-icon.png";
import cartIconImg from "/cart-icon.png";
import grubanaLogoImg from "../assets/grubana-logo.png";
import Analytics from "./analytics";
import { FaInstagram, FaFacebook, FaTiktok, FaXTwitter } from "react-icons/fa6";
import { useAuth } from "./AuthContext";
import NewDropForm from "./NewDropForm";
import { QRCodeCanvas } from "qrcode.react";


const Dashboard = ({ isLoaded }) => {
  const { user, userPlan, userRole, userSubscriptionStatus } = useAuth(); // Get subscription status too
  
  // CRITICAL: Immediately block non-owners from accessing this component
  const navigate = useNavigate();
  
  useEffect(() => {
    if (userRole && userRole !== "owner") {
      console.log("🚨 Dashboard: Non-owner user detected, redirecting immediately (role:", userRole, ")");
      navigate("/customer-dashboard");
      return;
    }
  }, [userRole, navigate]);

  // Don't render anything for non-owners
  if (userRole && userRole !== "owner") {
    return <div>Redirecting...</div>;
  }
  
  // Add debugging
  console.log('Dashboard component mounted');
  console.log('user:', user);
  console.log('userRole:', userRole);
  console.log('userPlan:', userPlan);
  console.log('Dashboard component rendering for', userRole?.toUpperCase());
  
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
  const [sessionId, setSessionId] = useState(null);
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
  // Menu modal state
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [activeTruck, setActiveTruck] = useState(null);

  console.log("user:", user);
console.log("userRole:", userRole);
console.log("userPlan:", userPlan);
console.log("Dashboard component rendering for OWNER");

  const truckMarkerRef = useRef(null);
  const qrRef = useRef(null);
  const auth = getAuth();

// Create a circular icon using canvas to mimic borderRadius: "50%"
const createCircularIcon = (imageUrl, size = 40) => {
  return new Promise((resolve) => {
    // Validate imageUrl
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.log('Invalid image URL provided to createCircularIcon');
      resolve(null);
      return;
    }

    // Skip Firebase Storage URLs due to CORS restrictions
    const isFirebaseStorage = imageUrl.includes('firebasestorage.googleapis.com');
    if (isFirebaseStorage) {
      console.log('Skipping Firebase Storage URL due to CORS restrictions:', imageUrl);
      resolve(null);
      return;
    }

    const img = new Image();
    
    // Don't set crossOrigin for same-domain URLs or relative URLs
    const isSameDomain = imageUrl.includes(window.location.hostname);
    const isRelativeUrl = !imageUrl.startsWith('http');
    
    if (!isSameDomain && !isRelativeUrl) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;

        // Save the context
        ctx.save();
        
        // Create circular clipping path
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI); // Leave space for border
        ctx.clip();

        // Draw the image to fill the circle (like objectFit: "cover")
        const aspectRatio = img.width / img.height;
        let drawWidth = size;
        let drawHeight = size;
        let offsetX = 0;
        let offsetY = 0;

        if (aspectRatio > 1) {
          // Image is wider - scale by height
          drawHeight = size;
          drawWidth = size * aspectRatio;
          offsetX = (size - drawWidth) / 2;
        } else {
          // Image is taller - scale by width
          drawWidth = size;
          drawHeight = size / aspectRatio;
          offsetY = (size - drawHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        // Restore context to remove clipping
        ctx.restore();
        
        // Draw black border around the circle
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 1, 0, 2 * Math.PI);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        resolve(canvas.toDataURL());
      } catch (error) {
        console.log('Canvas error in createCircularIcon:', error.message);
        resolve(null);
      }
    };
    
    img.onerror = (error) => {
      console.log('Failed to load image for circular icon:', imageUrl, error);
      resolve(null);
    };
    
    // Add timeout to prevent hanging
    setTimeout(() => {
      if (!img.complete) {
        console.log('Image loading timeout for:', imageUrl);
        resolve(null);
      }
    }, 5000);
    
    img.src = imageUrl;
  });
};

// Create HTML marker for custom styling
const createCustomMarker = (position, content, map) => {
  const marker = new google.maps.OverlayView();
  marker.clickListeners = []; // Store click listeners
  
  marker.onAdd = function() {
    const div = document.createElement('div');
    div.innerHTML = content;
    div.style.position = 'absolute';
    div.style.cursor = 'pointer';
    
    // Add click event listener to the div
    div.addEventListener('click', () => {
      this.clickListeners.forEach(callback => callback());
    });
    
    const panes = this.getPanes();
    panes.overlayMouseTarget.appendChild(div);
    this.div = div;
  };
  
  marker.draw = function() {
    const overlayProjection = this.getProjection();
    const sw = overlayProjection.fromLatLngToDivPixel(position);
    const div = this.div;
    div.style.left = (sw.x - 20) + 'px'; // Center the 40px icon
    div.style.top = (sw.y - 20) + 'px';
  };
  
  marker.onRemove = function() {
    if (this.div) {
      this.div.parentNode.removeChild(this.div);
      this.div = null;
    }
  };
  
  // Add method to attach click listeners
  marker.addClickListener = function(callback) {
    this.clickListeners.push(callback);
  };
  
  marker.setMap(map);
  return marker;
};

 const getOwnerTruckIcon = (kitchenType, coverUrl = null) => {
  // Use cover photo if available, otherwise use default icons
  if (coverUrl) {
    // For cover photos, we'll create a custom HTML marker
    return { 
      type: 'custom',
      coverUrl: coverUrl,
      size: 40
    };
  }
  
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

  // Generate session ID when user first logs in
  useEffect(() => {
    if (user && !sessionId) {
      const newSessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      setSessionId(newSessionId);
    } else if (!user) {
      setSessionId(null);
    }
  }, [user, sessionId]);

  // --- Place this useEffect after the above ---
  useEffect(() => {
    console.log('🚀 LATEST CODE: Dashboard useEffect running - Version e1da37bc');
    
    // Basic plan users should stay on dashboard - no redirect needed
    // Only Pro and All-Access users need special handling
    console.log('✅ Dashboard: Allowing dashboard access for userPlan:', userPlan);

    // Location tracking logic for paid plan users
    if (user && userRole === "owner" && (userPlan === "pro" || userPlan === "all-access")) {
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
              sessionId: sessionId,
              loginTime: Date.now(),
              ownerUid: user.uid, // Ensure ownerUid is set
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

  // Geolocation for Pro and All Access Plans
  useEffect(() => {
    console.log('🌍 Geolocation useEffect running for:', userPlan);
    if (userRole === "owner" && (userPlan === "pro" || userPlan === "all-access")) {
      console.log('🌍 Requesting geolocation for paid plan user...');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('🌍 Geolocation success:', position.coords);
          const { latitude, longitude } = position.coords;
          
          setLocation({
            latitude: latitude,
            longitude: longitude,
          });
          
          // Immediately save to Firestore to ensure marker appears
          if (user?.uid && sessionId) {
            try {
              const truckDocRef = doc(db, 'truckLocations', user.uid);
              const locationData = {
                lat: latitude,
                lng: longitude,
                isLive: true,
                visible: true,
                updatedAt: serverTimestamp(),
                lastActive: Date.now(),
                sessionId: sessionId,
                loginTime: Date.now(),
                ownerUid: user.uid,
                kitchenType: ownerData?.kitchenType || "truck",
              };
              
              await setDoc(truckDocRef, locationData, { merge: true });
              console.log('🌍 Location immediately saved to Firestore with both visible and isLive set to true:', locationData);
            } catch (error) {
              console.error('🌍 Error saving initial location:', error);
            }
          }
        },
        (error) => {
          console.error("🌍 Geolocation error: ", error);
          console.error("🌍 Error code:", error.code);
          console.error("🌍 Error message:", error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      console.log('🌍 Not requesting geolocation - userRole:', userRole, 'userPlan:', userPlan);
    }
  }, [userRole, userPlan, user, sessionId, ownerData]);

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
  console.log("🎯 Submitting manual location: ", manualLocation);
  // CRITICAL: Only allow owners to submit truck locations
  if (userPlan === "basic" && user?.uid && userRole === "owner") {
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: manualLocation }, async (results, status) => {
        if (status === "OK" && results[0]) {
          const { lat, lng } = results[0].geometry.location;
          console.log("🎯 Geocoded lat/lng:", lat(), lng());
          
          const truckDocRef = doc(db, "truckLocations", user.uid);
          const locationData = {
            manualLocation,
            lat: lat(),
            lng: lng(),
            updatedAt: new Date(),
            isLive: true,
            visible: true,
            lastActive: Date.now(),
            sessionId: sessionId,
            loginTime: Date.now(),
            ownerUid: user.uid,
            kitchenType: ownerData?.kitchenType || "truck",
          };
          
          await setDoc(truckDocRef, locationData);
          console.log("🎯 Manual location submitted successfully:", locationData);
          
          // Clear the input after successful submission
          setManualLocation("");
          
          // Update local state to show immediate feedback
          setIsVisible(true);
        } else {
          console.error("🎯 Geocode error:", status);
          alert("Could not locate address. Please try a different one.");
        }
      });
    } catch (error) {
      console.error("🎯 Error saving manual location: ", error);
      alert("Error saving location. Please try again.");
    }
  } else if (userRole !== "owner") {
    console.log("🎯 Non-owner user attempted to submit truck location (role:", userRole, ")");
    alert("Only truck/trailer owners can set locations.");
  }
};

  useEffect(() => {
    const fetchOwnerData = async () => {
      if (!user?.uid) return;
      console.log("📋 Fetching owner data for UID:", user.uid);
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log("📋 Owner data fetched:", docSnap.data());
        const data = { uid: user.uid, ...docSnap.data() };
        setOwnerData(data);
        
        // CRITICAL: Only create/manage truck location documents for owners
        if (data.role === "owner") {
          console.log("📋 User is confirmed owner, managing truck location document");
          // After owner data is loaded, check if truck location exists and initialize if needed
          const truckDocRef = doc(db, "truckLocations", user.uid);
          const truckDocSnap = await getDoc(truckDocRef);
          
          if (!truckDocSnap.exists()) {
            console.log("📋 No truck location document exists, creating initial document");
            // Create initial document with basic structure - start as hidden
            await setDoc(truckDocRef, {
              ownerUid: user.uid,
              kitchenType: data.kitchenType || "truck",
              isLive: false,
              visible: false,
              lastActive: Date.now(),
              createdAt: serverTimestamp(),
            }, { merge: true });
            console.log("📋 Initial truck location document created (hidden by default)");
          } else {
            // Update existing document with current owner data
            await updateDoc(truckDocRef, {
              ownerUid: user.uid,
              kitchenType: data.kitchenType || "truck",
              lastActive: Date.now(),
            });
            console.log("📋 Existing truck location document updated with owner data");
          }
        } else {
          console.log("📋 User is not an owner (role:", data.role, "), skipping truck location management");
          // Clean up any existing truck location documents for non-owners
          await cleanupNonOwnerTruckLocations(user.uid, data.role);
        }
      } else {
        console.warn("📋 Owner document not found for UID:", user.uid);
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
            twitter: userData.twitter || "",
          });
        }
      }
    };

    fetchSocialLinks();
  }, [user]);

  useEffect(() => {
    const fetchVisibility = async () => {
      // CRITICAL: Only fetch visibility for owners
      if (user && userRole === "owner") {
        console.log('👁️ Fetching initial visibility state for owner:', user.uid);
        const docRef = doc(db, "truckLocations", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Use strict comparison - only true if both visible and isLive are explicitly true
          const visibility = data.visible === true && data.isLive === true;
          console.log('👁️ Initial visibility state:', visibility, 'from data:', { visible: data.visible, isLive: data.isLive });
          setIsVisible(visibility);
        } else {
          console.log('👁️ No truck location document exists, defaulting visibility to false');
          setIsVisible(false);
        }
      } else if (userRole && userRole !== "owner") {
        console.log('👁️ Not fetching visibility - user is not an owner (role:', userRole, ')');
        setIsVisible(false);
      }
    };
    fetchVisibility();
  }, [user, userRole]);

const handleToggle = async () => {
  const newVisibility = !isVisible;
  console.log('🔄 Toggling visibility from', isVisible, 'to', newVisibility);
  
  // Immediately update UI state for instant feedback
  setIsVisible(newVisibility);
  setVisibilityUpdateInProgress(true);

  // Immediately update the marker display for instant feedback
  if (truckMarkerRef.current && mapRef) {
    truckMarkerRef.current.setMap(newVisibility ? mapRef : null);
    console.log('🔄 Marker immediately updated on map:', newVisibility);
  }

  if (user) {
    const truckDocRef = doc(db, "truckLocations", user.uid);
    try {
      // When making visible, set both visible and isLive to true
      // When hiding, set both to false
      const updatePromise = updateDoc(truckDocRef, {
        visible: newVisibility,
        isLive: newVisibility,
        lastActive: Date.now(),
      });
      
      console.log('🔄 Starting Firestore update for visibility:', { visible: newVisibility, isLive: newVisibility });

      // --- Update liveSessions in users collection concurrently ---
      const userDocRef = doc(db, "users", user.uid);
      let sessionPromise;
      
      if (newVisibility) {
        // Truck is going live: add a new session with start timestamp
        sessionPromise = updateDoc(userDocRef, {
          liveSessions: arrayUnion({ start: Timestamp.now() })
        });
      } else {
        // Truck is going offline: set end timestamp for the last session
        sessionPromise = getDoc(userDocRef).then(userDoc => {
          const sessions = userDoc.data().liveSessions || [];
          if (sessions.length > 0 && !sessions[sessions.length - 1].end) {
            sessions[sessions.length - 1].end = Timestamp.now();
            return updateDoc(userDocRef, { liveSessions: sessions });
          }
        });
      }
      
      // Wait for both operations to complete
      await Promise.all([updatePromise, sessionPromise]);
      console.log('🔄 All Firestore updates completed successfully');
      
      // --- End liveSessions update ---
    } catch (error) {
      console.error('🔄 Error updating visibility:', error);
      // Revert the immediate change if database update fails
      setIsVisible(!newVisibility);
      if (truckMarkerRef.current && mapRef) {
        truckMarkerRef.current.setMap(!newVisibility ? mapRef : null);
      }
    }

    setTimeout(() => {
      setVisibilityUpdateInProgress(false); // let snapshot updates resume
    }, 500); // Reduced from 1000ms to 500ms for faster responsiveness
  }
};

const handleLogout = async () => {
  console.log('🚪 Dashboard: handleLogout called');
  try {
    if (user?.uid) {
      console.log('🚪 Dashboard: Updating truck location for user:', user.uid);
      const truckDocRef = doc(db, "truckLocations", user.uid);
      await updateDoc(truckDocRef, {
        isLive: false,
        visible: false,
        lastActive: Date.now(),
      });
      console.log('🚪 Dashboard: Truck location updated successfully');
    }
    await logoutUser();
    console.log('🚪 Dashboard: User logged out successfully');
    navigate("/login");
  } catch (error) {
    console.error("🚪 Dashboard: Logout failed:", error.message);
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

  // Marker/map useEffect (controls marker visibility and position) - OWNERS ONLY
useEffect(() => {
  // CRITICAL: Only create markers for owners
  if (!isLoaded || !mapRef || !user?.uid || userRole !== "owner") {
    if (userRole && userRole !== "owner") {
      console.log("🗺️ Skipping marker creation - user is not an owner (role:", userRole, ")");
    }
    return;
  }

  const docRef = doc(db, "truckLocations", user.uid);

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    console.log("🗺️ Dashboard marker snapshot received for owner");
    
    if (!docSnap.exists()) {
      console.log("🗺️ No truck location document exists yet");
      return;
    }

    const data = docSnap.data();
    console.log("🗺️ Dashboard fetched truckLocations data:", data);

    const { lat, lng, isLive, visible } = data;

    // Create marker if we have coordinates
    if (!lat || !lng) {
      console.log("🗺️ Missing lat/lng, skipping marker creation");
      return;
    }
    
    console.log("🗺️ Creating/updating marker with data:", { lat, lng, isLive, visible });
    console.log("🗺️ Owner dashboard marker kitchenType:", data.kitchenType);
    console.log("🗺️ Icon URL:", getOwnerTruckIcon(data.kitchenType, ownerData?.coverUrl));
    
    const position = { lat, lng };

    if (!truckMarkerRef.current) {
      console.log("🗺️ Creating new marker for owner");
      const icon = getOwnerTruckIcon(data.kitchenType, ownerData?.coverUrl);
      
      // Check if we need to create a custom HTML marker for cover photos
      if (icon && typeof icon === 'object' && icon.type === 'custom') {
        const customMarkerContent = `
          <div style="
            width: 40px; 
            height: 40px; 
            border-radius: 50%; 
            border: 2px solid #000000; 
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            background: white;
          ">
            <img src="${icon.coverUrl}" style="
              width: 100%; 
              height: 100%; 
              object-fit: cover;
            " />
          </div>
        `;
        
        truckMarkerRef.current = createCustomMarker(position, customMarkerContent, mapRef);
      } else {
        // Create standard Google Maps marker
        truckMarkerRef.current = new window.google.maps.Marker({
          position,
          map: mapRef, // Always add to map initially
          icon: {
            url: icon,
            scaledSize: new window.google.maps.Size(40, 40),
          },
          title: "Your Food Truck",
        });
      }
    } else {
      console.log("🗺️ Updating existing marker position");
      const icon = getOwnerTruckIcon(data.kitchenType, ownerData?.coverUrl);
      const marker = truckMarkerRef.current;
      
      // For custom markers, we need to handle updates differently
      if (marker.div) {
        // Custom marker - update position
        marker.position = position;
        marker.draw(); // Redraw at new position
        
        // Update custom marker content if needed
        if (icon && typeof icon === 'object' && icon.type === 'custom') {
          const customMarkerContent = `
            <div style="
              width: 40px; 
              height: 40px; 
              border-radius: 50%; 
              border: 2px solid #000000; 
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              background: white;
            ">
              <img src="${icon.coverUrl}" style="
                width: 100%; 
                height: 100%; 
                object-fit: cover;
              " />
            </div>
          `;
          marker.div.innerHTML = customMarkerContent;
        }
      } else {
        // Standard marker
        marker.setPosition(position);
        // Update icon in case cover photo changed
        marker.setIcon({
          url: icon,
          scaledSize: new window.google.maps.Size(40, 40),
        });
      }
    }

    // Handle visibility with stricter logic - only show if explicitly true
    if (truckMarkerRef.current) {
      const shouldShow = visible === true && isLive === true;
      truckMarkerRef.current.setMap(shouldShow ? mapRef : null);
      console.log("🗺️ Marker visibility set to:", shouldShow, { visible, isLive });
    }

    // Update state to reflect actual visibility (use strict true comparison)
    // Only update if we're not in the middle of a toggle operation
    if (!visibilityUpdateInProgress) {
      setIsVisible(visible === true && isLive === true);
    } else {
      console.log("🗺️ Skipping state update - visibility toggle in progress");
    }
  }, (error) => {
    console.error("🗺️ Dashboard onSnapshot error:", error);
    // Handle permission-denied errors gracefully (happens during logout)
    if (error.code === 'permission-denied') {
      console.log("🗺️ Dashboard: Permission denied - user likely logged out, cleaning up marker");
      if (truckMarkerRef.current) {
        truckMarkerRef.current.setMap(null);
        truckMarkerRef.current = null;
      }
    }
  });

  return () => {
    console.log("🗺️ Cleaning up marker for owner user", user?.uid);
    if (truckMarkerRef.current) {
      truckMarkerRef.current.setMap(null);
      truckMarkerRef.current = null;
    }
    unsubscribe();
  };
}, [isLoaded, mapRef, user, userRole, ownerData]);

// Fetch drops (top-level useEffect)
useEffect(() => {
  if (!user?.uid) return;
  
  const fetchDrops = async () => {
    try {
      const dropsQuery = query(
        collection(db, "drops"),
        where("truckId", "==", user.uid)
      );
      const querySnapshot = await getDocs(dropsQuery);
      const dropsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrops(dropsData);
    } catch (error) {
      console.error("Error fetching drops:", error);
      if (error.code === 'permission-denied') {
        console.log("🗺️ Permission denied fetching drops - user may not have access to drops collection");
        // Set empty array to prevent further attempts
        setDrops([]);
      } else {
        console.error("🗺️ Unexpected error fetching drops:", error);
        setDrops([]);
      }
    }
  };

  fetchDrops();
}, [user]);

// Fetch truck lat/lng (top-level useEffect)
useEffect(() => {
  const fetchTruckLocation = async () => {
    if (!user?.uid) return;
    try {
      const docRef = doc(db, "truckLocations", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTruckLat(data.lat);
        setTruckLng(data.lng);
      }
    } catch (error) {
      console.error("🗺️ Error fetching truck location:", error);
      if (error.code === 'permission-denied') {
        console.log("🗺️ Permission denied fetching truck location - user likely logged out");
      }
    }
  };

  fetchTruckLocation();
}, [user]);

useEffect(() => {
  if (!user?.uid) return;
  const truckDocRef = doc(db, "truckLocations", user.uid);

  // Update lastActive every 30 seconds instead of 60 for more frequent updates
  const interval = setInterval(() => {
    // Check if user is still authenticated before updating
    if (!user?.uid) {
      console.log("🗺️ User not authenticated, clearing lastActive interval");
      clearInterval(interval);
      return;
    }
    
    updateDoc(truckDocRef, {
      lastActive: Date.now(),
    }).catch(error => {
      console.error("Error updating lastActive:", error);
      if (error.code === 'permission-denied') {
        console.log("🗺️ Permission denied updating lastActive - clearing interval");
        clearInterval(interval);
      }
    });
  }, 30 * 1000); // Reduced from 60 to 30 seconds

  // Handle page visibility changes to maintain presence even when screen is dark
  const handleVisibilityChange = () => {
    // Check if user is still authenticated
    if (!user?.uid) return;
    
    if (document.visibilityState === 'visible') {
      // When page becomes visible again, immediately update lastActive
      updateDoc(truckDocRef, {
        lastActive: Date.now(),
      }).catch(error => {
        console.error("Error updating lastActive on visibility change:", error);
        if (error.code === 'permission-denied') {
          console.log("🗺️ Permission denied on visibility change update");
        }
      });
    }
    // Note: We don't set isLive to false when hidden to keep truck visible
  };

  // Enhanced page unload handler to ensure truck is hidden
  const handleBeforeUnload = async () => {
    console.log('🚪 Page unload detected - hiding truck from map');
    try {
      // Use sendBeacon for more reliable delivery during page unload
      const data = JSON.stringify({
        isLive: false,
        visible: false,
        lastActive: Date.now(),
      });
      
      // Try to use sendBeacon first (more reliable for page unload)
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        // Note: sendBeacon can't directly update Firestore, so we'll use the regular method
      }
      
      // Immediate synchronous update
      await updateDoc(truckDocRef, {
        isLive: false,
        visible: false,
        lastActive: Date.now(),
      });
      console.log('🚪 Truck hidden from map on page unload');
    } catch (error) {
      console.error("🚪 Error hiding truck on page unload:", error);
    }
  };

  // Enhanced page hide handler (for mobile browsers)
  const handlePageHide = async () => {
    console.log('🚪 Page hide detected - hiding truck from map');
    try {
      await updateDoc(truckDocRef, {
        isLive: false,
        visible: false,
        lastActive: Date.now(),
      });
      console.log('🚪 Truck hidden from map on page hide');
    } catch (error) {
      console.error("🚪 Error hiding truck on page hide:", error);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('pagehide', handlePageHide);

  // NO navigation cleanup - truck should stay visible when navigating between pages
  // Only hide on actual logout or manual toggle

  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('pagehide', handlePageHide);
    
    // NO cleanup when component unmounts - let truck stay visible
    console.log("�️ Dashboard component unmounting - keeping truck visible for navigation");
  };
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

  // Function to handle truck marker clicks from HeatMap
  const handleTruckMarkerClick = async (truck) => {
    console.log('🗺️ Dashboard: handleTruckMarkerClick called with truck:', truck);
    
    if (!truck || !truck.id) {
      console.error('🗺️ Dashboard: Invalid truck data - missing truck or truck.id');
      return;
    }
    
    try {
      console.log('🗺️ Dashboard: Fetching owner data for truck:', truck.id);
      
      // Get owner data for the clicked truck
      const ownerDoc = await getDoc(doc(db, "users", truck.id));
      let ownerData = {};
      if (ownerDoc.exists()) {
        ownerData = ownerDoc.data();
        console.log('🗺️ Dashboard: Owner data found:', ownerData.truckName || ownerData.ownerName);
      } else {
        console.warn('🗺️ Dashboard: No owner document found for truck:', truck.id);
      }

      // Fetch drops for this truck
      let truckDrops = [];
      try {
        console.log('🗺️ Dashboard: Fetching drops for truck:', truck.id);
        const dropsQuery = query(
          collection(db, "drops"),
          where("truckId", "==", truck.id)
        );
        const querySnapshot = await getDocs(dropsQuery);
        truckDrops = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('🗺️ Dashboard: Found drops:', truckDrops.length);
      } catch (error) {
        console.error("🗺️ Dashboard: Error fetching drops for clicked truck:", error);
        if (error.code === 'permission-denied') {
          console.log("🗺️ Dashboard: Permission denied fetching drops for clicked truck - user may not have access to drops collection");
        }
        // Continue with empty drops array
        truckDrops = [];
      }

      // Reverse geocode GPS coordinates to get address if manualLocation is not available
      let currentAddress = truck.manualLocation;
      if (!currentAddress && truck.lat && truck.lng && window.google) {
        try {
          const geocoder = new window.google.maps.Geocoder();
          const geocodeResults = await new Promise((resolve, reject) => {
            geocoder.geocode({ location: { lat: truck.lat, lng: truck.lng } }, (results, status) => {
              status === 'OK' ? resolve(results) : reject(status);
            });
          });
          currentAddress = geocodeResults[0]?.formatted_address || 'Address not available';
        } catch (error) {
          console.error("Error reverse geocoding:", error);
          currentAddress = 'Address not available';
        }
      }

      // Combine truck data with owner data
      const truckInfo = {
        id: truck.id,
        ...truck,
        truckName: ownerData.truckName || ownerData.ownerName || 'Food Truck',
        hours: ownerData.hours || '',
        cuisine: ownerData.cuisine || '',
        kitchenType: ownerData.kitchenType || 'truck',
        ownerName: ownerData.ownerName || '',
        description: ownerData.description || '',
        coverUrl: ownerData.coverUrl || '',
        menuUrl: ownerData.menuUrl || '',
        manualLocation: currentAddress,
        drops: truckDrops, // Add the drops data
      };

      console.log('🗺️ Dashboard: Opening menu modal for truck:', truckInfo.truckName);
      setActiveTruck(truckInfo);
      setMenuModalVisible(true);
    } catch (error) {
      console.error("🗺️ Dashboard: Error fetching truck data for modal:", error);
      
      // Provide user feedback for the error
      if (error.code === 'permission-denied') {
        console.error("🗺️ Dashboard: Permission denied - unable to access truck information");
        // Could show a toast or alert here
      } else {
        console.error("🗺️ Dashboard: Unexpected error:", error.message);
      }
    }
  };

  // Function to handle opening the menu modal
  const handleViewMyMenu = async () => {
    if (!user?.uid || !ownerData) return;
    
    try {
      // Get truck location data
      const truckDoc = await getDoc(doc(db, "truckLocations", user.uid));
      let truckData = {};
      if (truckDoc.exists()) {
        truckData = truckDoc.data();
      }

      // Reverse geocode GPS coordinates to get address if manualLocation is not available
      let currentAddress = truckData.manualLocation;
      if (!currentAddress && truckData.lat && truckData.lng && window.google) {
        try {
          const geocoder = new window.google.maps.Geocoder();
          const geocodeResults = await new Promise((resolve, reject) => {
            geocoder.geocode({ location: { lat: truckData.lat, lng: truckData.lng } }, (results, status) => {
              status === 'OK' ? resolve(results) : reject(status);
            });
          });
          currentAddress = geocodeResults[0]?.formatted_address || 'Address not available';
        } catch (error) {
          console.error("Error reverse geocoding:", error);
          currentAddress = 'Address not available';
        }
      }

      // Combine truck data with owner data
      const truckInfo = {
        id: user.uid,
        ...truckData,
        truckName: ownerData.truckName || ownerData.ownerName || 'Food Truck',
        hours: ownerData.hours || '',
        cuisine: ownerData.cuisine || '',
        kitchenType: ownerData.kitchenType || 'truck',
        ownerName: ownerData.ownerName || '',
        description: ownerData.description || '',
        coverUrl: ownerData.coverUrl || '',
        menuUrl: ownerData.menuUrl || '',
        manualLocation: currentAddress,
        drops: drops, // Include the owner's drops
      };

      setActiveTruck(truckInfo);
      setMenuModalVisible(true);
    } catch (error) {
      console.error("Error fetching truck data for modal:", error);
    }
  };

  return (
    <div className="dashboard">

      <h2>Welcome{username ? `, ${username}` : ""}!</h2>

      {/* Truck Photo and Menu Display */}
    {ownerData?.coverUrl && (
  <div style={{ textAlign: "center", marginBottom: "20px" }}>
    <img
      src={ownerData.coverUrl}
      alt="Truck Photo"
      style={{
        maxWidth: "100%",
        height: "auto",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      }}
    />
    <button
      style={{
        marginTop: "8px",
        padding: "6px 12px",
        background: "#007bff",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        fontSize: "0.8rem",
        cursor: "pointer",
      }}
      onClick={() => {
        navigate("/settings");
        // Scroll to Media Uploader section after navigation
        setTimeout(() => {
          const mediaSection = document.querySelector('h2');
          if (mediaSection && mediaSection.textContent === 'Media Uploader') {
            mediaSection.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }}
    >
      Update Truck/Trailer Photo
    </button>
  </div>
)}

{ownerData?.menuUrl && (
  <div style={{ textAlign: "center", marginBottom: "20px" }}>
    <img
      src={ownerData.menuUrl}
      alt="Menu Photo"
      style={{
        maxWidth: "100%",
        height: "auto",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      }}
    />
    <button
      style={{
        marginTop: "8px",
        padding: "6px 12px",
        background: "#007bff",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        fontSize: "0.8rem",
        cursor: "pointer",
      }}
      onClick={() => {
        navigate("/settings#media-uploader");
      }}
    >
      Update Menu Photo
    </button>
  </div>
)}

<p>Add/Update Truck/Trailer/Menu Photos in Settings</p>
      
     
      {userPlan ? (
        <div style={{ margin: "15px 0", padding: "15px", backgroundColor: 
          userPlan === "basic" ? "#f8f9fa" : 
          userPlan === "pro" ? "#e8f5e8" : "#e3f2fd", 
          borderRadius: "8px", border: `2px solid ${
          userPlan === "basic" ? "#dee2e6" : 
          userPlan === "pro" ? "#28a745" : "#2196f3"}`
        }}>
          
          <div style={{ fontSize: "0.9rem", marginTop: "10px", color: "#666" }}>
            {userPlan === "basic" && (
              <div>
                ✅ Discovery map • ✅ Menu display • ✅ Manual location updates
                <br />
                <em>Upgrade for real-time GPS tracking and more!</em>
              </div>
            )}
            {userPlan === "pro" && (
              <div>
                ✅ Real-time GPS tracking • ✅ Citywide heat maps • ✅ Menu display
                <br />
                <em>Upgrade to All Access for analytics and promotional drops!</em>
              </div>
            )}
            {userPlan === "all-access" && (
              <div>
                ✅ Advanced analytics • ✅ Promotional drops creation • ✅ Citywide heat maps
                <br />
                <em>You have access to all features!</em>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p>Loading plan info...</p>
      )}
         

    {/* Upgrade Buttons - Moved to Top-Right Corner */}
{(userRole === "owner" && (userPlan === "basic" || userPlan === "pro")) && (
  <div
    className="upgrade-buttons-container"
    style={{
      position: "fixed",
      top: "130px",
      right: "10px",
      display: "flex",
      flexDirection: "column",
      zIndex: 1000,
    }}
    >
    {userPlan === "basic" && (
      // Uncomment the button below if needed
      null
      // <button
      //   className="upgrade-button"
      //   style={{
      //     padding: "6px 12px",
      //     background: "#4367f6ff",
      //     color: "#fffdfdff",
      //     border: "1px solid #ccc",
      //     borderRadius: "4px",
      //     fontSize: "0.8rem",
      //     cursor: "pointer",
      //     marginBottom: "-25px", // Ensures the second button is directly below
      //   }}
      //   onClick={() => {
      //     navigate("/checkout", { state: { selectedPlan: 'pro' } });
      //   }}
      // >
      //   Upgrade to Pro
      // </button>
    )}
    {/* Uncomment the button below if needed */}
    {/* <button
      className="upgrade-button"
      style={{
        padding: "6px 12px",
        background: "#1641eaff",
        color: "#fffdfdff",
        border: "1px solid #ccc",
        borderRadius: "4px",
        fontSize: "0.8rem",
        cursor: "pointer",
      }}
      onClick={() => {
        navigate("/checkout", { state: { selectedPlan: 'all-access' } });
      }}
    >
      Upgrade to All Access
    </button> */}
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
          <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "10px" }}>
            Your location is automatic and updated in real-time, unless you hide from map.
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

      <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
  <label
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      opacity: visibilityUpdateInProgress ? 0.7 : 1,
      transition: "opacity 0.2s ease",
    }}
  >
    <input
      type="checkbox"
      checked={isVisible === true}
      disabled={isVisible === null || visibilityUpdateInProgress}
      onChange={handleToggle}
      style={{
        marginBottom: "5px",
        cursor: visibilityUpdateInProgress ? "wait" : "pointer",
        transform: isVisible === true ? "scale(1.1)" : "scale(1)",
        transition: "transform 0.1s ease",
      }}
    />
    <span
      style={{
        color: visibilityUpdateInProgress
          ? "#666"
          : isVisible === true
          ? "#28a745"
          : "#dc3545",
        fontWeight: isVisible === true ? "bold" : "normal",
        transition: "color 0.2s ease",
      }}
    >
      {visibilityUpdateInProgress
        ? "Updating..."
        : isVisible
        ? "✅ Visible on Map"
        : "❌ Hidden from Map"}
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
      <HeatMap isLoaded={isLoaded} onMapLoad={setMapRef} userPlan={userPlan} onTruckMarkerClick={handleTruckMarkerClick} />

      {/* Analytics Section - Plan-based Access */}
      {ownerData && userPlan === "all-access" && (
        <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
          <h3>Advanced Analytics Dashboard</h3>
          <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "15px" }}>
            30-day analytics, trends, and insights to optimize your business.
          </p>
          <Analytics userId={user?.uid} ownerData={ownerData} />
        </div>
      )}

      {ownerData && userPlan === "pro" && (
        <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "8px" }}>
          <h3>Analytics (All Access Feature)</h3>
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

<h3 style={{ textAlign: 'center' }}>Your Social Media Links (discoverable by customers in the menu display on their map)</h3>

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
    {socialLinks.twitter && (
      <a
        href={socialLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#000000' }}
        className="social-icon"
        aria-label="X"
      >
        <FaXTwitter />
      </a>
    )}
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

{/* Upgrade Button - Below Navbar */}
      {(userRole === "owner" && userPlan === "pro") && (
        <div style={{
          marginTop: "60px", // Adjust to place below navbar
          textAlign: "center",
        }}>
          <button
            style={{
              padding: "10px 20px",
              background: "#007bff", // Blue color for the button
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
            Upgrade to All Access
          </button>
        </div>
      )}

    {/* Menu Modal for Owner */}
    {menuModalVisible && activeTruck && (
      <div
        className="menu-modal"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '90%',
            height: '90%',
            backgroundColor: '#fff',
            padding: '10px',
            borderRadius: '8px',
            overflow: 'auto',
          }}
        >
          {/* Close Button Banner */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              padding: '1px 3px',
              borderBottomLeftRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
            }}
          >
            <button
              onClick={() => {
                setMenuModalVisible(false);
                setActiveTruck(null);
              }}
              style={{
                backgroundColor: 'transparent',
                color: '#fff',
                border: 'none',
                fontSize: '10px',
                cursor: 'pointer',
                padding: '0',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Truck Information Header - Always shown */}
          {activeTruck && (
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              marginBottom: '15px',
              borderRadius: '8px',
              borderLeft: '4px solid #2c6f57'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#2c6f57' }}>
                {activeTruck.truckName || 'Food Truck'}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', fontSize: '14px', color: '#666' }}>
                {/* Current Location */}
                {((activeTruck.lat && activeTruck.lng) || activeTruck.manualLocation) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexBasis: '100%' }}>
                    <span style={{ fontSize: '16px' }}>📍</span>
                    <strong>Current Location:</strong> 
                    <span style={{ fontSize: '13px', fontStyle: 'italic' }}>
                      {activeTruck.manualLocation || 'Address not available'}
                    </span>
                  </div>
                )}
                {activeTruck.hours && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '16px' }}>🕒</span>
                    <strong>Hours:</strong> {activeTruck.hours}
                  </div>
                )}
                {activeTruck.cuisine && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '16px' }}>🍽️</span>
                    <strong>Cuisine:</strong> {activeTruck.cuisine}
                  </div>
                )}
                {activeTruck.kitchenType && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '16px' }}>🚚</span>
                    <strong>Type:</strong> {activeTruck.kitchenType}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Menu Content */}
          {activeTruck.menuUrl ? (
            <div>
              {/* Truck Cover Photo */}
              {activeTruck.coverUrl && (
                <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                  <img
                    src={activeTruck.coverUrl}
                    alt={`${activeTruck.truckName || 'Food Truck'} Photo`}
                    style={{
                      width: '100%',
                      maxWidth: '600px',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              )}
              
              {/* Menu Display */}
              {activeTruck.menuUrl.endsWith('.pdf') ? (
                <iframe
                  src={activeTruck.menuUrl}
                  style={{ width: '100%', height: 'calc(100% - 120px)' }}
                  title="Menu PDF"
                />
              ) : (
                <img
                  src={activeTruck.menuUrl}
                  alt="Menu"
                  style={{ maxWidth: '100%', maxHeight: 'calc(100% - 120px)', objectFit: 'contain' }}
                />
              )}
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '300px',
              flexDirection: 'column',
              color: '#666'
            }}>
              {/* Truck Cover Photo - shown even when no menu */}
              {activeTruck.coverUrl && (
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <img
                    src={activeTruck.coverUrl}
                    alt={`${activeTruck.truckName || 'Food Truck'} Photo`}
                    style={{
                      width: '100%',
                      maxWidth: '500px',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              )}
              
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>📋</p>
              <p>No menu available for this truck</p>
            </div>
          )}

          {/* Owner's Drops Section */}
          {activeTruck.drops && activeTruck.drops.length > 0 && (
            <div style={{
              backgroundColor: '#f0f8f0',
              padding: '15px',
              marginBottom: '15px',
              borderRadius: '8px',
              borderLeft: '4px solid #28a745'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#28a745', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎁 {activeTruck.id === user?.uid ? 'Your Active Drops' : `${activeTruck.truckName || 'This Truck'}'s Active Drops`}
              </h3>
              {activeTruck.drops.map((drop) => (
                <div key={drop.id} style={{ 
                  marginBottom: '15px', 
                  padding: '12px',
                  backgroundColor: '#fff',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>{drop.title}</h4>
                  <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Description:</strong> {drop.description || 'No description'}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Total Quantity:</strong> {drop.quantity ?? 'N/A'}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Claims:</strong> {drop.claimedBy?.length ?? 0} / {drop.quantity ?? 0}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Remaining:</strong> {Math.max((drop.quantity ?? 0) - (drop.claimedBy?.length ?? 0), 0)}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Expires:</strong> {drop.expiresAt?.toDate ? drop.expiresAt.toDate().toLocaleString() : 'N/A'}
                    </p>
                    {drop.claimedBy && drop.claimedBy.length > 0 && (
                      <p style={{ margin: '8px 0 4px 0', fontSize: '13px', fontStyle: 'italic', color: '#28a745' }}>
                        ✅ {drop.claimedBy.length} customer{drop.claimedBy.length > 1 ? 's have' : ' has'} claimed this drop
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Social Media Links */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <h3>Follow This Truck</h3>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '15px',
                fontSize: '24px',
              }}
            >
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#E4405F' }}
                >
                  <FaInstagram />
                </a>
              )}
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b5998' }}
                >
                  <FaFacebook />
                </a>
              )}
              {socialLinks.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#000000' }}
                >
                  <FaTiktok />
                </a>
              )}
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#000000' }}
                  aria-label="X"
                >
                  <FaXTwitter />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default Dashboard;