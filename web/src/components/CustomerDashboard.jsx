import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  getDocs,
  updateDoc,
  arrayUnion,
  query,
  where,
  orderBy,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import truckIconImg from '/truck-icon.png';
import MediaUploader from './MediaUploader';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';
import { FaInstagram, FaFacebook, FaTiktok, FaXTwitter } from 'react-icons/fa6';
import FavoriteButton from './FavoriteButton';
import trailerIconImg from '/trailer-icon.png';
import cartIconImg from '/cart-icon.png';
import { QRCodeCanvas } from "qrcode.react";
import PreOrderContent from './PreOrderContent';
import OrderCart from './OrderCart';

// Component to handle individual favorite items with dynamic name loading
const FavoriteListItem = ({ favorite }) => {
  const [displayName, setDisplayName] = useState(favorite.truckName || 'Loading...');

  useEffect(() => {
    const fetchTruckName = async () => {
      if (favorite.truckName && favorite.truckName !== '') {
        setDisplayName(favorite.truckName);
        return;
      }

      try {
        const ownerDoc = await getDoc(doc(db, 'users', favorite.truckId));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data();
          const truckName = ownerData.truckName || ownerData.ownerName || 'Food Truck';
          setDisplayName(truckName);
        } else {
          setDisplayName('Food Truck');
        }
      } catch (error) {
        console.error('Error fetching truck name:', error);
        setDisplayName('Food Truck');
      }
    };

    fetchTruckName();
  }, [favorite.truckId, favorite.truckName]);

  return (
    <li style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
      <span style={{ fontWeight: 'bold' }}>
        {displayName}
      </span>
      <span style={{ fontSize: '0.9em', color: '#666', marginLeft: '8px' }}>
        • Favorited
      </span>
    </li>
  );
};


const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [desiredTime, setDesiredTime] = useState('');
  const [filters, setFilters] = useState({ cuisine: '', time: '' });
  const [manualAddress, setManualAddress] = useState('');
  const [useGeoLocation, setUseGeoLocation] = useState(false);
  const [showTrucks, setShowTrucks] = useState(true);
  const [cuisineFilters, setCuisineFilters] = useState({
    american: true,
    "asian-fusion": true,
    bbq: true,
    burgers: true,
    chinese: true,
    coffee: true,
    desserts: true,
    drinks: true,
    greek: true,
    halal: true,
    healthy: true,
    indian: true,
    italian: true,
    korean: true,
    latin: true,
    mediterranean: true,
    mexican: true,
    pizza: true,
    seafood: true,
    southern: true,
    sushi: true,
    thai: true,
    vegan: true,
    wings: true,
  });
  const [showCuisineModal, setShowCuisineModal] = useState(false);
  const [tempCuisineFilters, setTempCuisineFilters] = useState(cuisineFilters);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [menuUrl, setMenuUrl] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [currentTruckOwnerId, setCurrentTruckOwnerId] = useState('');
  const [dailyPingCount, setDailyPingCount] = useState(0);
  const [pingError, setPingError] = useState('');
  const [activeDrops, setActiveDrops] = useState([]);
  const [activeTruck, setActiveTruck] = useState(null);
  const [showDropSummary, setShowDropSummary] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('details'); // 'details' or 'menu'
  const [userLocation, setUserLocation] = useState(null);
  const [claimedDrop, setClaimedDrop] = useState(null);
  const [claimCode, setClaimCode] = useState('');
  
  // Pre-order states
  const [showPreOrderModal, setShowPreOrderModal] = useState(false);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [favoriteTrucks, setFavoriteTrucks] = useState([]);
  const [userClaims, setUserClaims] = useState([]);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    facebook: '',
    tiktok: '',
    twitter: '',
  });

  // User role and booking states
  const [userRole, setUserRole] = useState('customer');
  const [userData, setUserData] = useState(null);
  const [showCateringModal, setShowCateringModal] = useState(false);
  const [showFestivalModal, setShowFestivalModal] = useState(false);

  const mapRef = useRef(null);
  const qrRef = useRef(null);
  const mapInstance = useRef(null);
  const markerCluster = useRef(null);
  const pingMarkers = useRef([]);
  const foodTruckMarkers = useRef({});
  const dropInfoWindow = useRef(null); 
  const lastClickedMarkerRef = useRef({ id: null, time: 0 });
  const claimExpirationInterval = useRef(null);

  const handleClaimDrop = async (dropId) => {
    if (!user) {
      setClaimMessage("You must be logged in to claim a drop.");
      return;
    }

    try {
      // Get the drop data first
      const dropRef = doc(db, "drops", dropId);
      const dropSnap = await getDoc(dropRef);
      const dropData = dropSnap.data();

      if (!dropData) {
        setClaimMessage("Drop not found.");
        return;
      }

      const alreadyClaimed = dropData.claimedBy?.includes(user.uid);
      const remaining = (dropData.quantity ?? 0) - (dropData.claimedBy?.length ?? 0);

      if (alreadyClaimed) {
        setClaimMessage("You have already claimed this drop.");
        return;
      }

      if (remaining <= 0) {
        setClaimMessage("This drop has already been fully claimed.");
        return;
      }

      // Check localStorage for user claims restrictions
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const userClaimsKey = `userClaims_${user.uid}`;
      const storedClaims = JSON.parse(localStorage.getItem(userClaimsKey) || '[]');
      
      // Filter out expired claims
      const activeClaims = storedClaims.filter(claim => {
        const expiresAt = new Date(claim.expiresAt);
        return expiresAt > now;
      });
      
      // Check if user already has an active claim
      if (activeClaims.length > 0) {
        setClaimMessage(`You already have an active claim for "${activeClaims[0].dropTitle}". You can only claim one drop at a time.`);
        return;
      }
      
      // Check for recent claims from different trucks (within 1 hour)
      const recentClaims = storedClaims.filter(claim => {
        const claimedAt = new Date(claim.claimedAt);
        return claimedAt > oneHourAgo;
      });
      
      const recentDifferentTruck = recentClaims.find(claim => claim.truckId !== dropData.truckId);
      if (recentDifferentTruck) {
        const timeSinceLastClaim = Math.ceil((now - new Date(recentDifferentTruck.claimedAt)) / (1000 * 60));
        const waitTime = 60 - timeSinceLastClaim;
        setClaimMessage(`You recently claimed from another truck. Please wait ${waitTime} more minutes before claiming from a different truck.`);
        return;
      }

      // All checks passed, store the claim locally
      const claimData = {
        userId: user.uid,
        dropId: dropId,
        dropTitle: dropData.title,
        truckId: dropData.truckId,
        claimedAt: now.toISOString(),
        expiresAt: dropData.expiresAt.toDate().toISOString(),
        status: 'active'
      };
      
      // Update localStorage
      const updatedClaims = [...storedClaims.filter(c => c.dropId !== dropId), claimData];
      localStorage.setItem(userClaimsKey, JSON.stringify(updatedClaims));
      
      // Update local state
      setUserClaims(updatedClaims);

      const code = `GRB-${user.uid.slice(-4).toUpperCase()}${dropId.slice(-2)}`;
      setClaimCode(code);
      setClaimedDrop({ ...dropData, id: dropId });

      // Clear any existing expiration interval before setting a new one
      if (claimExpirationInterval.current) {
        clearInterval(claimExpirationInterval.current);
      }

      // Continuously check if the drop is expired
      claimExpirationInterval.current = setInterval(async () => {
        const updatedDropSnap = await getDoc(dropRef);
        const updatedDropData = updatedDropSnap.data();

        if (!updatedDropData || updatedDropData.expiresAt?.toMillis() <= Date.now()) {
          setClaimCode("");
          setClaimedDrop(null);
          clearInterval(claimExpirationInterval.current);
          claimExpirationInterval.current = null;
          
          // Mark claim as expired in localStorage
          const currentClaims = JSON.parse(localStorage.getItem(userClaimsKey) || '[]');
          const updatedExpiredClaims = currentClaims.map(claim => 
            claim.dropId === dropId ? { ...claim, status: 'expired' } : claim
          );
          localStorage.setItem(userClaimsKey, JSON.stringify(updatedExpiredClaims));
          setUserClaims(updatedExpiredClaims);
        }
      }, 10000); // Check every 10 seconds
      
      setClaimMessage("Drop claimed successfully! Show your code to the truck owner.");
    } catch (error) {
      console.error("Error claiming drop:", error);
      setClaimMessage("Failed to claim drop. Please try again.");
    }
  };

  // Utility to calculate distance between two lat/lng points in km
const getDistanceInKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Radius of Earth in km
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Filter drops within a certain distance
const filterByDistance = (drops, userLat, userLng, maxDistanceKm = 50) =>
  drops.filter(drop => getDistanceInKm(userLat, userLng, drop.lat, drop.lng) <= maxDistanceKm);

// Example usage
// const distance = getDistanceInKm(userLocation.lat, userLocation.lng, dropLat, dropLng);
// const filteredDrops = filterByDistance(activeDrops, userLat, userLng, 50);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);

    if (currentUser) {
      // Fetch the user document from Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setUsername(userData.displayName || ''); // Use displayName from Firestore
        setUserRole(userData.role || 'customer'); // Set user role
        setUserData(userData); // Store full user data
        console.log('🔍 CustomerDashboard: User role detected:', userData.role || 'customer');
        
        // CRITICAL: Clean up any truck location documents for customers
        if (userData.role === "customer") {
          console.log('🧹 CustomerDashboard: Cleaning up truck location for customer:', currentUser.uid);
          const truckDocRef = doc(db, "truckLocations", currentUser.uid);
          
          try {
            const truckDocSnap = await getDoc(truckDocRef);
            if (truckDocSnap.exists()) {
              await deleteDoc(truckDocRef);
              console.log('🧹 CustomerDashboard: Truck location document deleted for customer');
            }
          } catch (error) {
            console.error('🧹 CustomerDashboard: Error deleting truck location document:', error);
          }
        }
      } else {
     
        setUsername(currentUser.displayName || ''); // Fallback to auth displayName
      }
    } else {
      setUsername(''); // Reset username if no user is logged in
    }
  });

  return () => unsubscribe();
}, []);

  useEffect(() => {
    if (!user) return;
  
    const pingsRef = collection(db, 'pings');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      pingsRef,
      where('userId', '==', user.uid),
      where('timestamp', '>=', oneDayAgo)
    );
  
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDailyPingCount(snapshot.size); // Live-updating count
    });
  
    return () => unsubscribe();
  }, [user]);

  const animateMarkerMove = (marker, newPosition) => {
    // Check if marker is a valid Google Maps marker with getPosition method
    if (!marker || typeof marker.getPosition !== 'function') {
     
      return;
    }
    
    const DELTA = 0.02;
    const currentPos = marker.getPosition();
    if (!currentPos) return;

    const lat = currentPos.lat();
    const lng = currentPos.lng();
    const deltaLat = (newPosition.lat - lat) * DELTA;
    const deltaLng = (newPosition.lng - lng) * DELTA;

    let i = 0;
    const maxSteps = 50;

    const animate = () => {
      if (i < maxSteps) {
        const nextLat = lat + deltaLat * i;
        const nextLng = lng + deltaLng * i;
        marker.setPosition({ lat: nextLat, lng: nextLng });
        i++;
        requestAnimationFrame(animate);
      } else {
        marker.setPosition(newPosition);
      }
    };

    animate();
  };

  // Helper to pick the correct icon
// Create a circular icon using canvas to mimic borderRadius: "50%"
const createCircularIcon = (imageUrl, size = 60) => {
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
    div.style.left = (sw.x - 30) + 'px'; // Center the 60px icon
    div.style.top = (sw.y - 30) + 'px';
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

const getTruckIcon = (kitchenType, hasActiveDrop, coverUrl = null) => {
  console.log('getTruckIcon called with coverUrl:', coverUrl); // Debug log
  let iconUrl;
  
  // If truck has an active drop, always use glow icons
  if (hasActiveDrop) {
    switch (kitchenType) {
      case 'trailer':
        iconUrl = '/trailer-icon-glow.png';
        break;
      case 'cart':
        iconUrl = '/cart-icon-glow.png';
        break;
      default:
        iconUrl = '/truck-icon-glow.png';
    }
  } else {
    // No active drop - use cover photo if available, otherwise default icons
    if (coverUrl) {
      // For cover photos, we'll create a custom HTML marker
      return { 
        type: 'custom',
        coverUrl: coverUrl,
        size: 60
      };
    } else {
      switch (kitchenType) {
        case 'trailer':
          iconUrl = '/trailer-icon.png';
          break;
        case 'cart':
          iconUrl = '/cart-icon.png';
          break;
        default:
          iconUrl = '/truck-icon.png';
      }
    }
  }
  
  return window.google
    ? {
        url: iconUrl,
        scaledSize: new window.google.maps.Size(60, 60),
      }
    : null;
};

  const handleTruckIconClick = async (truckId) => {
  console.log("Truck icon clicked:", truckId);
  
  // First clear existing state to prevent stale data
  setMenuUrl('');
  setMenuItems([]); // Clear menu items
  setLoadingMenu(false); // Reset loading state
  setActiveTruck(null);
  setShowDropSummary(false);
  setActiveModalTab('details'); // Reset to details tab
  
  try {
    const truckDoc = await getDoc(doc(db, "truckLocations", truckId));
    if (truckDoc.exists()) {
      const truckData = truckDoc.data();
      const ownerUid = truckData.ownerUid;
      console.log("Truck data:", truckData);

      const truckDrops = activeDrops.filter(drop => drop.truckId === truckId);

      // Fetch owner data to get hours and other details
      const ownerDoc = await getDoc(doc(db, "users", ownerUid));
      let ownerData = {};
      if (ownerDoc.exists()) {
        ownerData = ownerDoc.data();
        console.log("Owner data:", ownerData);
        setSocialLinks({
          instagram: ownerData.instagram || '',
          facebook: ownerData.facebook || '',
          tiktok: ownerData.tiktok || '',
          twitter: ownerData.twitter || '',
        });
      } else {
 
      }

      // Prioritize truck-specific menu URL over owner's menu URL
      const finalMenuUrl = truckData.menuUrl || ownerData.menuUrl || '';
      console.log("Final menu URL:", finalMenuUrl);
      
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
      
      // Combine truck data with owner data for hours and other info
      const truckInfo = {
        id: truckId,
        ownerUid: ownerUid, // Add ownerUid to the truck info
        ...truckData,
        truckName: truckData.truckName || ownerData.ownerName || ownerData.truckName || 'Food Truck',
        hours: ownerData.hours || '',
        ownerName: ownerData.ownerName || '',
        description: ownerData.description || '',
        coverUrl: truckData.coverUrl || ownerData.coverUrl || '',
        menuUrl: finalMenuUrl, // Store menu URL in truck info as backup
        ownerMenuUrl: ownerData.menuUrl || '', // Store owner menu URL separately
        manualLocation: currentAddress, // Use the resolved address
        drops: truckDrops,
      };
      
      console.log("Setting truck info:", truckInfo);
      console.log("Setting menu URL:", finalMenuUrl);
      
      // Set all state together and use setTimeout to ensure state is set before opening modal
      setActiveTruck(truckInfo);
      setMenuUrl(finalMenuUrl);
      setShowDropSummary(true);
      
      // Load menu items from Firebase Storage
      if (user) {
        loadMenuItems(ownerId);
      }
      
      // Small delay to ensure all state updates are processed
      setTimeout(() => {
        setMenuModalVisible(true);
      }, 100);

    } else {

    }
  } catch (error) {
    console.error("Error fetching truck or owner data:", error);
  }
};

// Function to load menu items from API
const loadMenuItems = async (truckOwnerId) => {
  if (!truckOwnerId) {
    console.log("No truck owner ID provided");
    return;
  }
  
  console.log("Loading menu items for truck owner:", truckOwnerId);
  setLoadingMenu(true);
  try {
    const apiUrl = 'https://pingmyappetite-production.up.railway.app';
    console.log("Making API call to:", `${apiUrl}/api/marketplace/trucks/${truckOwnerId}/menu`);
    
    // First try without authentication (for public menu viewing)
    let response = await fetch(`${apiUrl}/api/marketplace/trucks/${truckOwnerId}/menu`);
    
    // If that fails and we have a user, try with authentication
    if (!response.ok && user) {
      console.log("Trying with authentication...");
      try {
        const token = await user.getIdToken();
        response = await fetch(`${apiUrl}/api/marketplace/trucks/${truckOwnerId}/menu`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (authError) {
        console.error("Authentication error:", authError);
      }
    }

    if (response.ok) {
      const data = await response.json();
      setMenuItems(data.items || []);
      console.log("Successfully loaded menu items:", data.items?.length || 0, "items");
    } else {
      console.error("Failed to load menu items. Status:", response.status);
      const errorText = await response.text();
      console.error("Error response:", errorText);
      setMenuItems([]);
    }
  } catch (error) {
    console.error('Error loading menu items:', error);
    setMenuItems([]);
  } finally {
    setLoadingMenu(false);
  }
};

const handleViewMenu = () => {
  setShowMenu(true);
};

  useEffect(() => {
    if (window.google && mapRef.current && !mapInstance.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setUserLocation(userLocation);

          mapInstance.current = new window.google.maps.Map(mapRef.current, {
            center: userLocation,
            zoom: 14,
          });

          new window.google.maps.Marker({
            position: userLocation,
            map: mapInstance.current,
            title: 'You are here',
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#800080',
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: 'white',
            },
          });

          initializeMapFeatures();
          
          // Trigger map resize after initialization
          setTimeout(() => {
            if (mapInstance.current) {
              window.google.maps.event.trigger(mapInstance.current, 'resize');
            }
          }, 100);
        },
        () => {
          const fallbackLocation = { lat: 37.7749, lng: -122.4194 };
          mapInstance.current = new window.google.maps.Map(mapRef.current, {
            center: fallbackLocation,
            zoom: 12,
          });
          initializeMapFeatures();
          
          // Trigger map resize after initialization
          setTimeout(() => {
            if (mapInstance.current) {
              window.google.maps.event.trigger(mapInstance.current, 'resize');
            }
          }, 100);
        }
      );
    }
  }, []);

  // Ensure map resizes properly when layout changes
  useEffect(() => {
    if (mapInstance.current && window.google) {
      const resizeMap = () => {
        window.google.maps.event.trigger(mapInstance.current, 'resize');
      };
      
      // Resize map after a short delay to ensure container is fully rendered
      const timer = setTimeout(resizeMap, 200);
      
      return () => clearTimeout(timer);
    }
  }, [cuisineFilters, showCuisineModal]); // Trigger when layout might change

  useEffect(() => {
    if (!user) return;
    
    try {
      const now = Timestamp.now();
      const dropsRef = collection(db, "drops");
      const q = query(dropsRef, where("expiresAt", ">", now));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        //console.log("Drops snapshot size:", snapshot.size, snapshot.docs.map(doc => doc.data()));
        const fetchedDrops = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setActiveDrops(fetchedDrops);
      }, (error) => {
        console.error("Error fetching active drops:", error);
        if (error.code === 'permission-denied') {
          console.log("🗺️ Permission denied fetching active drops - user may not have access to drops collection");
          setActiveDrops([]);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up drops listener:", error);
      setActiveDrops([]);
    }
  }, [user]);


useEffect(() => {
  if (!window.google || !mapInstance.current || activeDrops.length === 0 || !userLocation) return;

  const dropMarkers = activeDrops.map((drop) => {
  const marker = new window.google.maps.Marker({
    position: { lat: drop.lat, lng: drop.lng },
    map: mapInstance.current,
    title: drop.title,
    icon: {
      url: "/drop-pin.png",
      scaledSize: new window.google.maps.Size(40, 40),
    },
  });

  // On click, open the modal and show drop info inside
  marker.addListener("click", () => {
    setActiveTruck({
      name: drop.title,
      currentDrop: drop,
    });
    setShowDropSummary(true);
    setMenuModalVisible(true);
    setMenuUrl(""); // Or set a menu URL if you have one for the drop
    setCurrentTruckOwnerId(drop.truckId || "");
    setSocialLinks({
      instagram: "",
      facebook: "",
      tiktok: "",
      twitter: "",
    });
  });

  return marker;
});

  return () => {
    dropMarkers.forEach((marker) => marker.setMap(null));
  };
}, [activeDrops, userLocation]);

// ...existing code...

// ...existing code...

useEffect(() => {
  if (!user || !window.google || !mapInstance.current) return;

  const unsubscribe = onSnapshot(collection(db, 'truckLocations'), async (snapshot) => {
    console.log('🚛 Real-time truck update received:', {
      size: snapshot.size,
      changes: snapshot.docChanges().length,
      changeTypes: snapshot.docChanges().map(c => c.type)
    });
    
    const nowMs = Date.now();
    const existingIds = new Set();

    // Process each truck change
    for (const change of snapshot.docChanges()) {
      const data = change.doc.data();
      const id = change.doc.id;
      existingIds.add(id);

      console.log('🚛 Processing truck change:', {
        changeType: change.type,
        truckId: id,
        isLive: data.isLive,
        visible: data.visible,
        lastActive: data.lastActive ? new Date(data.lastActive).toLocaleTimeString() : 'N/A',
        truckName: data.truckName
      });

      const lat = data.lat || 0;
      const lng = data.lng || 0;
      const isLive = data.isLive === true;
      const visible = data.visible === true;
      const EIGHT_HOURS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
      const GRACE_PERIOD = 15 * 60 * 1000; // 15 minutes grace period
      const lastActive = data.lastActive || 0;
      const sessionStartTime = data.sessionStartTime || lastActive;
      
      // Enhanced visibility logic matching HeatMap
      const timeSinceActive = nowMs - lastActive;
      const sessionDuration = nowMs - sessionStartTime;
      const isRecentlyActive = timeSinceActive <= GRACE_PERIOD;
      const withinEightHourWindow = sessionDuration < EIGHT_HOURS;
      
      // Check if truck should be removed with enhanced 8-hour session logic
      const shouldHide = change.type === 'removed' || 
                        !visible || 
                        (!isRecentlyActive && !withinEightHourWindow) ||
                        !showTrucks;
      
      if (shouldHide) {
        console.log('🚫 Hiding truck:', id, 'Reason:', {
          removed: change.type === 'removed',
          notVisible: !visible,
          notRecentlyActive: !isRecentlyActive,
          outsideEightHourWindow: !withinEightHourWindow,
          showTrucksOff: !showTrucks
        });
        
        if (foodTruckMarkers.current[id]) {
          foodTruckMarkers.current[id].setMap(null);
          delete foodTruckMarkers.current[id];
        }
        continue;
      }

      // Fetch owner data to get cuisine type for filtering and cover photo
      let shouldShowTruck = true;
      let ownerCoverUrl = null;
      try {
        const ownerUid = data.ownerUid || id;
        const ownerDoc = await getDoc(doc(db, "users", ownerUid));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data();
          const truckCuisine = ownerData.cuisine?.toLowerCase().replace(/\s+/g, '-') || '';
          ownerCoverUrl = ownerData.coverUrl || null; // Get cover photo for custom icon
          console.log('CustomerDashboard: Found owner cover URL:', ownerCoverUrl); // Debug log
          
          // If truck has a cuisine type, check if it's enabled in filters
          if (truckCuisine && cuisineFilters.hasOwnProperty(truckCuisine)) {
            shouldShowTruck = cuisineFilters[truckCuisine];
          }
          // If cuisine type not found in filters, show by default (for backward compatibility)
        }
      } catch (error) {
        console.error("Error fetching owner data for cuisine filtering:", error);
        // Show truck by default if error occurs
      }

      // Hide truck if cuisine filter doesn't match
      if (!shouldShowTruck) {
        if (foodTruckMarkers.current[id]) {
          foodTruckMarkers.current[id].setMap(null);
          delete foodTruckMarkers.current[id];
        }
        continue;
      }

      const position = { lat, lng };
      const hasActiveDrop = activeDrops.some(drop => drop.truckId === id);
      const icon = getTruckIcon(data.kitchenType, hasActiveDrop, ownerCoverUrl);

      if (!foodTruckMarkers.current[id]) {
        const isFavorite = favorites.some(fav => fav.truckId === id);

        let marker;
        
        // Check if we need to create a custom HTML marker for cover photos
        if (icon && icon.type === 'custom') {
          const customMarkerContent = `
            <div style="
              width: 60px; 
              height: 60px; 
              border-radius: 50%; 
              border: 2px solid #000000; 
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              background: white;
              position: relative;
            ">
              <img src="${icon.coverUrl}" style="
                width: 100%; 
                height: 100%; 
                object-fit: cover;
              " />
              ${isFavorite ? `
                <div style="
                  position: absolute;
                  top: -5px;
                  right: -5px;
                  width: 20px;
                  height: 20px;
                  background: #ff6b6b;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">❤️</div>
              ` : ''}
            </div>
          `;
          
          marker = createCustomMarker(position, customMarkerContent, mapInstance.current);
        } else {
          // Create standard Google Maps marker
          marker = new window.google.maps.Marker({
            position,
            map: mapInstance.current,
            icon,
            title: data.truckName || 'Food Truck',
            label: isFavorite
              ? {
                  text: '❤️',
                  color: '#e74c3c',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }
              : null,
          });
        }

        // Handle click events (unified for both marker types)
        if (marker.addClickListener) {
          // Custom marker
          marker.addClickListener(() => {
            handleTruckIconClick(id);
            setCurrentTruckOwnerId(data.ownerUid || id);
          });
        } else {
          // Standard marker
          marker.addListener('click', () => {
            handleTruckIconClick(id);
            setCurrentTruckOwnerId(data.ownerUid || id);
          });
        }

        foodTruckMarkers.current[id] = marker;
        console.log('✅ Added new truck marker:', id, 'Position:', position, 'Marker type:', icon?.type || 'standard');
      } else {
        const marker = foodTruckMarkers.current[id];
        
        // For custom markers, we need to handle updates differently
        if (marker.div) {
          // Custom marker - update position
          marker.position = position;
          marker.draw(); // Redraw at new position
          console.log('🔄 Updated custom truck marker:', id, 'New position:', position);
          
          // Update custom marker content if needed
          if (icon && icon.type === 'custom') {
            const customMarkerContent = `
              <div style="
                width: 60px; 
                height: 60px; 
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
          // Standard marker - only animate if it's a real Google Maps marker
          if (marker && typeof marker.getPosition === 'function' && !marker.div) {
            animateMarkerMove(marker, position);
            console.log('🔄 Animated standard truck marker:', id, 'New position:', position);
          } else if (marker && marker.setPosition && typeof marker.setPosition === 'function') {
            // Fallback to simple position update if animation fails
            marker.setPosition(position);
            console.log('🔄 Updated standard truck marker (fallback):', id, 'New position:', position);
          }
          
          if (marker && typeof marker.setIcon === 'function') {
            marker.setIcon(icon);
          }
          if (marker && typeof marker.setTitle === 'function') {
            marker.setTitle(data.truckName || 'Food Truck');
          }
        }
      }
    }

    // Remove markers for trucks no longer present
    Object.keys(foodTruckMarkers.current).forEach(id => {
      if (!existingIds.has(id)) {
        foodTruckMarkers.current[id].setMap(null);
        delete foodTruckMarkers.current[id];
      }
    });
  });

  return () => {
    unsubscribe();
    Object.values(foodTruckMarkers.current).forEach(marker => marker.setMap(null));
    foodTruckMarkers.current = {};
  };
}, [user, showTrucks, activeDrops, cuisineFilters, favorites]);

useEffect(() => {
  if (!user) {
    setFavorites([]);
    return;
  }
  const q = query(
    collection(db, 'favorites'),
    where('userId', '==', user.uid)
  );
  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Store the whole doc data (including truckName)
    const favoritesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setFavorites(favoritesList);
  });
  return () => unsubscribe();
}, [user]);

  useEffect(() => {
    if (!user) {
      setUserClaims([]);
      setClaimCode("");
      setClaimedDrop(null);
      // Clear any existing expiration interval
      if (claimExpirationInterval.current) {
        clearInterval(claimExpirationInterval.current);
        claimExpirationInterval.current = null;
      }
      return;
    }
    
    // Load user claims from localStorage
    const userClaimsKey = `userClaims_${user.uid}`;
    const storedClaims = JSON.parse(localStorage.getItem(userClaimsKey) || '[]');
    
    // Filter out expired claims
    const now = new Date();
    const activeClaims = storedClaims.filter(claim => {
      const expiresAt = new Date(claim.expiresAt);
      return expiresAt > now;
    });
    
    // Update localStorage with only active claims and update state
    localStorage.setItem(userClaimsKey, JSON.stringify(activeClaims));
    setUserClaims(activeClaims);
    
    // Check if user has an active claim and restore the claim code/drop data
    if (activeClaims.length > 0) {
      const activeClaim = activeClaims[0]; // Get the first active claim
      const code = `GRB-${user.uid.slice(-4).toUpperCase()}${activeClaim.dropId.slice(-2)}`;
      setClaimCode(code);
      
      // Fetch the full drop data for display
      const fetchClaimedDrop = async () => {
        try {
          const dropRef = doc(db, "drops", activeClaim.dropId);
          const dropSnap = await getDoc(dropRef);
          if (dropSnap.exists()) {
            setClaimedDrop({ ...dropSnap.data(), id: activeClaim.dropId });
            
            // Set up expiration checking for the restored claim
            claimExpirationInterval.current = setInterval(async () => {
              const updatedDropSnap = await getDoc(dropRef);
              const updatedDropData = updatedDropSnap.data();

              if (!updatedDropData || updatedDropData.expiresAt?.toMillis() <= Date.now()) {
                setClaimCode("");
                setClaimedDrop(null);
                clearInterval(claimExpirationInterval.current);
                claimExpirationInterval.current = null;
                
                // Mark claim as expired in localStorage
                const currentClaims = JSON.parse(localStorage.getItem(userClaimsKey) || '[]');
                const updatedExpiredClaims = currentClaims.map(claim => 
                  claim.dropId === activeClaim.dropId ? { ...claim, status: 'expired' } : claim
                );
                localStorage.setItem(userClaimsKey, JSON.stringify(updatedExpiredClaims));
                setUserClaims(updatedExpiredClaims);
              }
            }, 10000); // Check every 10 seconds
          }
        } catch (error) {
          console.error("Error fetching claimed drop:", error);
        }
      };
      
      fetchClaimedDrop();
    }
    
    // Cleanup function
    return () => {
      if (claimExpirationInterval.current) {
        clearInterval(claimExpirationInterval.current);
        claimExpirationInterval.current = null;
      }
    };
  }, [user]);

  // Handler to update favorites after change
  const handleFavoriteChange = async () => {
    if (!user) return;
    
    console.log('🔄 Refreshing favorites after change...');
    
    // Refresh favorites from the favorites collection
    try {
      const favoritesQuery = query(
        collection(db, 'favorites'),
        where('userId', '==', user.uid)
      );
      const favoritesSnapshot = await getDocs(favoritesQuery);
      const updatedFavorites = favoritesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setFavorites(updatedFavorites);
      console.log('✅ Favorites updated:', updatedFavorites.length, 'favorites');
      
      // Force map markers to update by re-rendering
      setTimeout(() => {
        // Trigger map update by clearing and re-fetching truck data
        if (mapInstance.current) {
          // The useEffect for foodTruckMarkers will automatically update
          console.log('🗺️ Triggering map marker updates...');
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error refreshing favorites:', error);
    }
  };

  // Helper function to check if user has claimed a drop
  const hasUserClaimedDrop = (dropId) => {
    if (!user) return false;
    
    // Check localStorage for user claims
    const userClaimsKey = `userClaims_${user.uid}`;
    const storedClaims = JSON.parse(localStorage.getItem(userClaimsKey) || '[]');
    
    // Check if user has an active claim for this drop
    const now = new Date();
    const activeClaim = storedClaims.find(claim => {
      const expiresAt = new Date(claim.expiresAt);
      return claim.dropId === dropId && expiresAt > now && claim.status === 'active';
    });
    
    return !!activeClaim;
  };

  const initializeMapFeatures = () => {
    markerCluster.current = new MarkerClusterer({ map: mapInstance.current, markers: [] });

    (onSnapshot(collection(db, 'pings'), (snapshot) => {
      //console.log("Data fetched successfully:", snapshot.docs.map((doc) => doc.data())); // Corrected log
    
      pingMarkers.current.forEach((marker) => marker.setMap(null));
      pingMarkers.current = [];
    
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

const filtered = snapshot.docs.filter((doc) => {
  const data = doc.data();
  const matchCuisine = filters.cuisine ? data.cuisineType === filters.cuisine : true;
  const matchTime = filters.time ? data.desiredTime === filters.time : true;
  const pingTimestamp = data.timestamp?.toDate ? data.timestamp.toDate() : null;
  const isRecent = pingTimestamp && pingTimestamp > oneDayAgo;
  return matchCuisine && matchTime && isRecent;
});
    
      const newMarkers = filtered.map((doc) => {
        const data = doc.data();
        return new window.google.maps.Marker({
          position: { lat: data.lat, lng: data.lng },
          title: `${data.username || ''} - ${data.cuisineType || ''}`,
        });
      });
    
      pingMarkers.current = newMarkers;
      markerCluster.current.clearMarkers();
      markerCluster.current.addMarkers(pingMarkers.current);
    }));
  };
  
  const sendingRef = useRef(false);
  const handleSendPing = async () => {
    if (sendingRef.current) return; // Prevent duplicate submissions
    sendingRef.current = true;
  
    if (!user || !cuisineType) {
      alert('Please fill out all fields');
      sendingRef.current = false;
      return;
    }
  
    try {
      // STEP 1: Check user's recent pings
      const pingsRef = collection(db, 'pings');
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const q = query(
        pingsRef,
        where('userId', '==', user.uid),
        where('timestamp', '>=', oneDayAgo)
      );
  
      const snapshot = await getDocs(q);
      if (snapshot.docs.length >= 3) {
        setPingError('You can only send 3 pings in a 24-hour period.');
        setTimeout(() => setPingError(''), 5000);
        sendingRef.current = false;
        return;
      }
  
      // STEP 2: Determine location
      let lat, lng, address;
      const geocoder = new window.google.maps.Geocoder();
  
      if (useGeoLocation) {
        const position = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject)
        );
        lat = position.coords.latitude;
        lng = position.coords.longitude;

        setUserLocation({ lat, lng });
  
        const geocodeResults = await new Promise((resolve, reject) => {
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            status === 'OK' ? resolve(results) : reject(status);
          });
        });
        address = geocodeResults[0].formatted_address;
      } else if (manualAddress.trim()) {
        const geocodeResults = await new Promise((resolve, reject) => {
          geocoder.geocode({ address: manualAddress }, (results, status) => {
            status === 'OK' ? resolve(results) : reject(status);
          });
        });
        lat = geocodeResults[0].geometry.location.lat();
        lng = geocodeResults[0].geometry.location.lng();
        address = geocodeResults[0].formatted_address;
      } else {
        alert('Please provide an address or use current location.');
        sendingRef.current = false;
        return;
      }
  
      if (!user || !user.uid) {
        console.error("User is not authenticated or UID is missing.");
        sendingRef.current = false;
        return;
      }
  
      const pingData = {
        userId: user.uid,
        username: user.displayName || '',
        lat,
        lng,
        cuisineType,
        desiredTime: desiredTime || '',
        timestamp: serverTimestamp(),
        address,
        pingId: uuidv4(),
      };
  
      //console.log("Sending ping data:", pingData);
  
      await addDoc(pingsRef, pingData);
  
      // Reset form
      setCuisineType('');
      setDesiredTime('');
      setManualAddress('');
    } catch (error) {
      console.error('Error sending ping:', error);
      setPingError('Failed to send ping');
    }
  
    sendingRef.current = false; // Reset submission lock
  };  

return (
  <div className="dashboard">
    <div id="top"></div>
    <h2>Welcome{username ? `, ${username}` : ''}!</h2>

    <MediaUploader showCover={false} showProfile={true} showMenu={false} />

    <section className="ping-form">
      <h3>Send a Ping</h3>

      <p style={{ color: dailyPingCount >= 3 ? 'red' : 'black' }}>
        You’ve sent <strong>{dailyPingCount}</strong> of 3 pings today.
      </p>
      <label>
        Use my current location:
        <input
          type="checkbox"
          checked={useGeoLocation}
          onChange={() => setUseGeoLocation(!useGeoLocation)}
        />
      </label>

      {!useGeoLocation && (
        <input
          type="text"
          value={manualAddress}
          onChange={(e) => setManualAddress(e.target.value)}
          placeholder="Enter address"
        />
      )}

      <select value={cuisineType} onChange={(e) => setCuisineType(e.target.value)}>
        <option value="">Select Cuisine</option>
        <option value="american">American</option>
        <option value="asian-fusion">Asian Fusion</option>
        <option value="bbq">BBQ</option>
        <option value="burgers">Burgers</option>
        <option value="chinese">Chinese</option>
        <option value="coffee">Coffee & Café</option>
        <option value="desserts">Desserts & Sweets</option>
        <option value="drinks">Drinks & Beverages</option>
        <option value="greek">Greek</option>
        <option value="halal">Halal</option>
        <option value="healthy">Healthy & Fresh</option>
        <option value="indian">Indian</option>
        <option value="italian">Italian</option>
        <option value="korean">Korean</option>
        <option value="latin">Latin American</option>
        <option value="mediterranean">Mediterranean</option>
        <option value="mexican">Mexican</option>
        <option value="pizza">Pizza</option>
        <option value="seafood">Seafood</option>
        <option value="southern">Southern Comfort</option>
        <option value="sushi">Sushi & Japanese</option>
        <option value="thai">Thai</option>
        <option value="vegan">Vegan & Vegetarian</option>
        <option value="wings">Wings</option>
        <option value="other">Other</option>
      </select>

      <button onClick={handleSendPing}>Send Ping</button>

      {pingError && (
        <p style={{ color: 'red', marginTop: '10px' }}>{pingError}</p>
      )}
      
      {/* My Orders Button */}
      <div style={{ 
        marginTop: '15px', 
        textAlign: 'center',
        paddingTop: '15px',
        borderTop: '1px solid #eee'
      }}>
        <button
          onClick={() => navigate('/my-orders')}
          style={{
            backgroundColor: '#2c6f57',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#1e4a3f';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#2c6f57';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          📋 My Orders
        </button>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          View your order history and status
        </div>
      </div>
    </section>

    <div 
      ref={mapRef} 
      style={{ 
        height: '500px', 
        marginTop: '20px',
        width: '100%',
        maxWidth: '100%',
        margin: '20px auto',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }} 
    />

    {/* Truck Cuisine Filter Section - Moved below map */}
    <section style={{ 
      margin: '20px auto', 
      padding: '15px', 
      backgroundColor: '#f8f9fa', 
      borderRadius: '8px',
      maxWidth: '800px',
      textAlign: 'center'
    }}>
      <h3>🍽️ Filter Food Trucks by Cuisine</h3>
      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
        Choose which types of cuisines you want to see on the map. Only trucks and trailers with selected cuisines will be visible.
      </p>
      
      <div style={{ marginBottom: '15px' }}>
        <button
          style={{
            padding: "10px 18px",
            backgroundColor: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
          onClick={() => {
            setTempCuisineFilters(cuisineFilters);
            setShowCuisineModal(true);
          }}
        >
          Cuisine Filters
        </button>
        
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginLeft: "10px",
          }}
          onClick={() => {
            const allTrue = Object.keys(cuisineFilters).reduce((acc, key) => {
              acc[key] = true;
              return acc;
            }, {});
            setCuisineFilters(allTrue);
          }}
        >
          Show All
        </button>
        
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: "#dc3545",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginLeft: "10px",
          }}
          onClick={() => {
            const allFalse = Object.keys(cuisineFilters).reduce((acc, key) => {
              acc[key] = false;
              return acc;
            }, {});
            setCuisineFilters(allFalse);
          }}
        >
          Hide All
        </button>
      </div>
      
      {/* Show active filters */}
      <div style={{ fontSize: '0.8rem', color: '#666' }}>
        <strong>Active filters:</strong> {
          Object.entries(cuisineFilters)
            .filter(([key, value]) => value)
            .map(([key]) => key === 'asian-fusion' ? 'Asian Fusion' :
                           key === 'bbq' ? 'BBQ' :
                           key === 'coffee' ? 'Coffee & Café' :
                           key === 'desserts' ? 'Desserts & Sweets' :
                           key === 'drinks' ? 'Drinks & Beverages' :
                           key === 'latin' ? 'Latin American' :
                           key === 'sushi' ? 'Sushi & Japanese' :
                           key === 'healthy' ? 'Healthy & Fresh' :
                           key === 'southern' ? 'Southern Comfort' :
                           key === 'vegan' ? 'Vegan & Vegetarian' :
                           key.charAt(0).toUpperCase() + key.slice(1))
            .join(', ') || 'None'
        }
      </div>
    </section>

    {/* Cuisine Filters Modal */}
    {showCuisineModal && (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "24px 12px 24px 12px",
          minWidth: "320px",
          width: "100%",
          maxWidth: "min(90vw, 680px)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
          margin: "16px",
          overflowX: "hidden",
          overflow: "hidden",
        }}>
          <h2 style={{marginTop:0}}>Select Cuisines to Show</h2>
          <form
            onSubmit={e => {
              e.preventDefault();
              setCuisineFilters(tempCuisineFilters);
              setShowCuisineModal(false);
            }}
          >
            <div style={{
              maxHeight: "50vh",
              overflowY: "auto",
              overflowX: "hidden",
              marginBottom: "18px",
              display: "grid",
              gridTemplateColumns: window.innerWidth < 600 ? "1fr" : "1fr 1fr",
              gap: "12px 16px",
              padding: "8px",
              width: "100%",
            }}>
              {Object.keys(cuisineFilters).map((cuisine) => (
                <label key={cuisine} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "12px",
                  fontSize: window.innerWidth < 600 ? "16px" : "14px",
                  cursor: "pointer",
                  width: "100%",
                  minHeight: "44px",
                  padding: "8px",
                  borderRadius: "4px",
                  transition: "background-color 0.2s ease",
                  backgroundColor: "transparent",
                  ...(window.innerWidth < 600 && {
                    border: "1px solid #e0e0e0",
                  })
                }}>
                  <input
                    type="checkbox"
                    checked={tempCuisineFilters[cuisine]}
                    onChange={() => setTempCuisineFilters(f => ({ ...f, [cuisine]: !f[cuisine] }))}
                    style={{
                      width: "18px",
                      height: "18px",
                      margin: "0",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                  />
                  <span style={{
                    flex: 1,
                    textAlign: "left",
                    lineHeight: "1.3",
                    wordBreak: "break-word",
                  }}>
                    {cuisine === 'asian-fusion' ? 'Asian Fusion' :
                     cuisine === 'bbq' ? 'BBQ' :
                     cuisine === 'coffee' ? 'Coffee & Café' :
                     cuisine === 'desserts' ? 'Desserts & Sweets' :
                     cuisine === 'drinks' ? 'Drinks & Beverages' :
                     cuisine === 'latin' ? 'Latin American' :
                     cuisine === 'sushi' ? 'Sushi & Japanese' :
                     cuisine === 'healthy' ? 'Healthy & Fresh' :
                     cuisine === 'southern' ? 'Southern Comfort' :
                     cuisine === 'vegan' ? 'Vegan & Vegetarian' :
                     cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                  </span>
                </label>
              ))}
            </div>
            <div style={{display: "flex", justifyContent: "flex-end", gap: "12px"}}>
              <button type="button" onClick={() => setShowCuisineModal(false)} style={{padding: "8px 16px", borderRadius: "4px", border: "none", background: "#ccc", color: "#333"}}>Cancel</button>
              <button type="submit" style={{padding: "8px 16px", borderRadius: "4px", border: "none", background: "#1976d2", color: "#fff", fontWeight: "bold"}}>Apply</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Favorites List */}
    <section style={{ 
      margin: '20px auto', 
      maxWidth: '800px',
      textAlign: 'center',
      padding: '15px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
  <h3>Your Favorite Trucks & Trailers</h3>
  {favorites.length === 0 ? (
    <p>No favorites yet.</p>
  ) : (
    <ul style={{ listStyleType: 'none', paddingLeft: 0, textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      {favorites.map((fav) => (
        <FavoriteListItem key={fav.id} favorite={fav} />
      ))}
    </ul>
  )}
</section>


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
                setActiveModalTab('details'); // Reset to details tab
                setMenuItems([]); // Clear menu items
                setLoadingMenu(false); // Reset loading state
                setShowCateringModal(false); // Close catering modal
                setShowFestivalModal(false); // Close festival modal
                // Don't clear other state immediately to prevent flickering
                setTimeout(() => {
                  setShowDropSummary(false);
                  setCurrentTruckOwnerId('');
                  // Keep menuUrl and activeTruck for potential reopening
                }, 300);
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

              {/* Navigation Tabs */}
              <div style={{
                display: 'flex',
                marginBottom: '15px',
                borderBottom: '2px solid #e9ecef',
                gap: '10px'
              }}>
                <button
                  onClick={() => setActiveModalTab('details')}
                  style={{
                    backgroundColor: activeModalTab === 'details' ? '#2c6f57' : 'transparent',
                    color: activeModalTab === 'details' ? 'white' : '#2c6f57',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px 6px 0 0',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🏪 Truck Details
                </button>
                <button
                  onClick={() => {
                    console.log("Menu tab clicked! Current truck:", activeTruck);
                    console.log("Current menu items:", menuItems);
                    console.log("Loading menu state:", loadingMenu);
                    setActiveModalTab('menu');
                    
                    // If we have a truck but no menu items, try loading them
                    if (activeTruck && activeTruck.ownerUid && menuItems.length === 0 && !loadingMenu) {
                      console.log("Loading menu items for owner:", activeTruck.ownerUid);
                      loadMenuItems(activeTruck.ownerUid);
                    }
                  }}
                  style={{
                    backgroundColor: activeModalTab === 'menu' ? '#2c6f57' : 'transparent',
                    color: activeModalTab === 'menu' ? 'white' : '#2c6f57',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px 6px 0 0',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🍽️ View Menu
                </button>
              </div>

              {/* Truck Details Tab Content */}
              {activeModalTab === 'details' && (
                <>
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
                  
                  {/* Pre-order Button */}
                  <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <button
                      onClick={() => setShowPreOrderModal(true)}
                      style={{
                        backgroundColor: '#2c6f57',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginRight: '10px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#1e4a3f';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#2c6f57';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      🛒 Pre-Order - Skip the Line!
                    </button>

                    {/* Book Catering Button - Show for customers, event organizers, and food truck owners viewing other trucks */}
                    {(userRole === 'customer' || userRole === 'event-organizer' || (userRole === 'owner' && activeTruck?.ownerUid !== user?.uid)) && (
                      <button
                        onClick={() => {
                          console.log('🎉 Catering button pressed for truck:', activeTruck?.truckName);
                          setShowCateringModal(true);
                        }}
                        style={{
                          backgroundColor: '#0066cc',
                          color: 'white',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginRight: '10px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#0052a3';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#0066cc';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        📅 Book Catering
                      </button>
                    )}

                    {/* Book Festival Button - Show only for event organizers */}
                    {userRole === 'event-organizer' && (
                      <button
                        onClick={() => {
                          console.log('🎪 Festival booking button pressed for truck:', activeTruck?.truckName);
                          setShowFestivalModal(true);
                        }}
                        style={{
                          backgroundColor: '#e91e63',
                          color: 'white',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#c2185b';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#e91e63';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        🎪 Book Festival
                      </button>
                    )}

                    <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                      Place your order before you arrive • Book for special events
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Content based on active tab */}
          {activeModalTab === 'details' && (
            <>
              {/* Drop Summary */}
              {showDropSummary && activeTruck && (
                <div className="drop-summary-card" style={{ marginTop: '20px' }}>

                  {claimedDrop && claimCode && (
                    <div style={{ background: '#e6ffe6', padding: '1em', marginBottom: '1em', borderRadius: '8px', textAlign: 'center' }}>
                      <p>You claimed: <strong>{claimedDrop.title}</strong></p>
                      <p>Show this code at the truck:</p>
                      <h2 style={{ fontSize: "2em", letterSpacing: "0.1em" }}>{claimCode}</h2>
                    </div>
                  )}
                 
                  <h3>{activeTruck.truckName || activeTruck.name}</h3>
                  {/* If there are multiple drops (truck marker), show all */}
                  {activeTruck.drops && activeTruck.drops.length > 0 ? (
                    activeTruck.drops.map((drop) => (
                      <div key={drop.id} style={{ marginBottom: '1.5em', borderBottom: '1px solid #eee', paddingBottom: '1em' }}>
                        <h4>{drop.title}</h4>
                        <p><strong>Description:</strong> {drop.description || 'No description'}</p>
                        <p><strong>Quantity:</strong> {drop.quantity ?? 'N/A'}</p>
                        <p><strong>Expires:</strong> {drop.expiresAt?.toDate().toLocaleString() ?? 'N/A'}</p>
                        <p><strong>Claimed:</strong> {drop.claimedBy?.length ?? 0}</p>
                        <p><strong>Remaining:</strong> {Math.max((drop.quantity ?? 0) - (drop.claimedBy?.length ?? 0), 0)}</p>
                      {user && (
                <>
                  <button
                    disabled={
                      hasUserClaimedDrop(drop.id) || 
                      drop.claimedBy?.length >= drop.quantity
                    }
                    onClick={() => handleClaimDrop(drop.id)}
                  >
                    {hasUserClaimedDrop(drop.id)
                      ? "Already Claimed"
                      : drop.claimedBy?.length >= drop.quantity
                      ? "Fully Claimed"
                      : "Claim Drop"}
                  </button>
                  {claimMessage && <p style={{ color: 'green' }}>{claimMessage}</p>}
                </>
              )}
                      </div>
                    ))
                  ) : activeTruck.currentDrop ? (
                    // If a single drop (drop marker), show just that
                    <>
                <h4>{activeTruck.currentDrop.title}</h4>
                <p><strong>Description:</strong> {activeTruck.currentDrop.description || 'No description'}</p>
                <p><strong>Quantity:</strong> {activeTruck.currentDrop.quantity ?? 'N/A'}</p>
                <p><strong>Expires:</strong> {activeTruck.currentDrop.expiresAt?.toDate().toLocaleString() ?? 'N/A'}</p>
                <p><strong>Claimed:</strong> {activeTruck.currentDrop.claimedBy?.length ?? 0}</p>
                <p><strong>Remaining:</strong> {Math.max((activeTruck.currentDrop.quantity ?? 0) - (activeTruck.currentDrop.claimedBy?.length ?? 0), 0)}</p>
                {user && (
                  <button
                    disabled={
                      hasUserClaimedDrop(activeTruck.currentDrop.id) ||
                      activeTruck.currentDrop.claimedBy?.length >= activeTruck.currentDrop.quantity
                    }
                    onClick={() => handleClaimDrop(activeTruck.currentDrop.id)}
                  >
                    {hasUserClaimedDrop(activeTruck.currentDrop.id)
                      ? "Already Claimed"
                      : activeTruck.currentDrop.claimedBy?.length >= activeTruck.currentDrop.quantity
                      ? "Fully Claimed"
                      : "Claim Drop"}
                  </button>
                )}
              </>
                  ) : (
                    <p>No active drops</p>
                  )}
                </div>
              )}

              {/* Favorite Button */}
              {user && currentTruckOwnerId && (
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <FavoriteButton
                    userId={user.uid}
                    truckOwnerId={currentTruckOwnerId}
                    truckName={activeTruck?.truckName || activeTruck?.name || ''}
                    onFavoriteChange={handleFavoriteChange}
                  />
                </div>
              )}

              {/* --- QR CODE SECTION START --- */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '32px 0 16px 0' }}>
                <h3 style={{ textAlign: 'center', marginBottom: 8 }}>Scan or Share the QR Code!</h3>
                <div ref={qrRef} style={{ marginBottom: 8 }}>
                  <QRCodeCanvas value="https://grubana.com" size={128} />
                </div>
                <button
                  onClick={() => {
                    const canvas = qrRef.current.querySelector("canvas");
                    if (!canvas) return;
                    const url = canvas.toDataURL("image/png");
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "grubana-qr.png";
                    link.click();
                  }}
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

              {/* Social Media Links */}
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
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
            </>
          )}

          {/* Menu Tab Content */}
          {activeModalTab === 'menu' && (
            <>
              {/* Truck Cover Photo */}
              {activeTruck && activeTruck.coverUrl && (
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

              {/* Menu Items Display */}
              {loadingMenu ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '200px',
                  flexDirection: 'column',
                  color: '#666'
                }}>
                  <div style={{ fontSize: '18px', marginBottom: '10px' }}>⏳</div>
                  <p>Loading menu...</p>
                </div>
              ) : menuItems.length > 0 ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <h3 style={{ color: '#2c6f57', marginBottom: '15px', textAlign: 'center' }}>
                    🍽️ Menu Items ({menuItems.length})
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                    gap: '15px',
                    padding: '10px'
                  }}>
                    {menuItems.map((item, index) => (
                      <div 
                        key={index}
                        style={{
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          padding: '15px',
                          backgroundColor: '#fafafa',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{
                              width: '100%',
                              height: '120px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              marginBottom: '10px'
                            }}
                          />
                        )}
                        <h4 style={{ margin: '0 0 8px 0', color: '#2c6f57' }}>
                          {item.name}
                        </h4>
                        {item.description && (
                          <p style={{ 
                            margin: '0 0 8px 0', 
                            fontSize: '14px', 
                            color: '#666',
                            lineHeight: '1.4'
                          }}>
                            {item.description}
                          </p>
                        )}
                        <p style={{ 
                          margin: '0', 
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          color: '#2c6f57'
                        }}>
                          ${parseFloat(item.price).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
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
                  <p style={{ fontSize: '18px', marginBottom: '10px' }}>📋</p>
                  <p>No menu items available for this truck</p>
                  <p style={{ fontSize: '14px', marginTop: '10px', color: '#999' }}>
                    The food truck owner hasn't uploaded their menu yet.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )}

    <a
      href="#"
      onClick={e => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      style={{
        display: "inline-block",
        margin: "30px auto 0 auto",
        color: "#2c6f57",
        textDecoration: "underline",
        cursor: "pointer",
        fontWeight: "bold"
      }}
    >
      Back to Top ↑
    </a>

    {/* Pre-Order Modal */}
    {showPreOrderModal && activeTruck && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 1001,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <div style={{
          width: '90%',
          maxWidth: '800px',
          height: '90%',
          backgroundColor: '#fff',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px',
            backgroundColor: '#2c6f57',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0 }}>
              Order from {activeTruck.truckName || 'Food Truck'}
            </h2>
            <button
              onClick={() => {
                setShowPreOrderModal(false);
                setCart([]);
              }}
              style={{
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Menu Items */}
            <div style={{ 
              flex: 2, 
              padding: '20px', 
              overflowY: 'auto',
              borderRight: '1px solid #eee'
            }}>
              {(() => {
                console.log('🛒 Pre-Order Modal rendering with activeTruck:', activeTruck);
                console.log('🛒 Pre-Order Modal truckId will be:', activeTruck.ownerUid || activeTruck.uid || activeTruck.id);
                return <PreOrderContent truckId={activeTruck.ownerUid || activeTruck.uid || activeTruck.id} cart={cart} setCart={setCart} />;
              })()}
            </div>

            {/* Cart */}
            <div style={{ 
              flex: 1, 
              padding: '20px', 
              backgroundColor: '#f8f9fa',
              overflowY: 'auto'
            }}>
              <OrderCart 
                cart={cart} 
                setCart={setCart} 
                truckId={activeTruck.uid}
                truckName={activeTruck.truckName || 'Food Truck'}
              />
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Catering Booking Modal */}
    {showCateringModal && activeTruck && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 1002,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <div style={{
          width: '90%',
          maxWidth: '600px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '30px',
          maxHeight: '80%',
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '2px solid #0066cc'
          }}>
            <h2 style={{ margin: 0, color: '#0066cc' }}>
              🎉 Book {activeTruck.truckName} for Catering
            </h2>
            <button
              onClick={() => setShowCateringModal(false)}
              style={{
                backgroundColor: 'transparent',
                border: '2px solid #0066cc',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#0066cc'
              }}
            >
              ×
            </button>
          </div>

          {/* Form Content */}
          <div style={{ color: '#333', lineHeight: '1.6' }}>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Book this food truck for your private event, corporate catering, or special occasion!
            </p>
            
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#0066cc', marginTop: 0 }}>📞 Contact for Booking</h3>
              <p>
                This feature will connect you directly with <strong>{activeTruck.truckName}</strong> 
                to discuss your catering needs.
              </p>
              <button
                onClick={() => {
                  // Placeholder for future implementation
                  alert('Catering booking system coming soon! Please contact the truck directly for now.');
                  setShowCateringModal(false);
                }}
                style={{
                  backgroundColor: '#0066cc',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Request Catering Quote
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Festival Booking Modal */}
    {showFestivalModal && activeTruck && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 1002,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <div style={{
          width: '90%',
          maxWidth: '600px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '30px',
          maxHeight: '80%',
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '2px solid #e91e63'
          }}>
            <h2 style={{ margin: 0, color: '#e91e63' }}>
              🎪 Book {activeTruck.truckName} for Festival
            </h2>
            <button
              onClick={() => setShowFestivalModal(false)}
              style={{
                backgroundColor: 'transparent',
                border: '2px solid #e91e63',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#e91e63'
              }}
            >
              ×
            </button>
          </div>

          {/* Form Content */}
          <div style={{ color: '#333', lineHeight: '1.6' }}>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              Book this food truck for your festival, concert, or large-scale event! 
              Perfect for event organizers managing multiple vendors.
            </p>
            
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#e91e63', marginTop: 0 }}>🎭 Festival Booking</h3>
              <p>
                As an event organizer, you can book <strong>{activeTruck.truckName}</strong> 
                for your festival or large event.
              </p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Organization: <strong>{userData?.organizationName || 'Your Organization'}</strong>
              </p>
              <button
                onClick={() => {
                  // Placeholder for future implementation
                  alert('Festival booking system coming soon! Please contact the truck directly for now.');
                  setShowFestivalModal(false);
                }}
                style={{
                  backgroundColor: '#e91e63',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Request Festival Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);

};

export default CustomerDashboard;