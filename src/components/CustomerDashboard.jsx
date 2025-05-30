import React, { useEffect, useRef, useState } from 'react';
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
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import truckIconImg from '/truck-icon.png';
import MediaUploader from './MediaUploader';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';
import { FaInstagram, FaFacebook, FaTiktok } from 'react-icons/fa';
import FavoriteButton from './FavoriteButton';
import trailerIconImg from '/trailer-icon.png';
import cartIconImg from '/cart-icon.png';


const CustomerDashboard = () => {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [desiredTime, setDesiredTime] = useState('');
  const [filters, setFilters] = useState({ cuisine: '', time: '' });
  const [manualAddress, setManualAddress] = useState('');
  const [useGeoLocation, setUseGeoLocation] = useState(false);
  const [showTrucks, setShowTrucks] = useState(true);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [menuUrl, setMenuUrl] = useState('');
  const [currentTruckOwnerId, setCurrentTruckOwnerId] = useState('');
  const [dailyPingCount, setDailyPingCount] = useState(0);
  const [pingError, setPingError] = useState('');
  const [activeDrops, setActiveDrops] = useState([]);
  const [activeTruck, setActiveTruck] = useState(null);
  const [showDropSummary, setShowDropSummary] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [claimedDrop, setClaimedDrop] = useState(null);
  const [claimCode, setClaimCode] = useState('');
  const [claimMessage, setClaimMessage] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [favoriteTrucks, setFavoriteTrucks] = useState([]);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    facebook: '',
    tiktok: '',
    twitter: '',
  });

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerCluster = useRef(null);
  const pingMarkers = useRef([]);
  const foodTruckMarkers = useRef({});
  const dropInfoWindow = useRef(null); 
  const lastClickedMarkerRef = useRef({ id: null, time: 0 });

  const handleClaimDrop = async (dropId) => {
  if (!user) {
    alert("You must be logged in to claim a drop.");
    return;
  }

  // Fetch user's lastClaimTime from Firestore
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();
  const lastClaimTime = userData?.lastClaimTime?.toMillis ? userData.lastClaimTime.toMillis() : 0;

  // Check if 1 hour has passed
  if (Date.now() - lastClaimTime < 60 * 1000) {
    alert("You can only claim a drop once every hour.");
    return;
  }

  const dropRef = doc(db, "drops", dropId);

  try {
    const dropSnap = await getDoc(dropRef);
    const dropData = dropSnap.data();

    if (!dropData) return;

    const alreadyClaimed = dropData.claimedBy?.includes(user.uid);
    const remaining = (dropData.quantity ?? 0) - (dropData.claimedBy?.length ?? 0);

    if (alreadyClaimed) {
      alert("You have already claimed this drop.");
      return;
    }

    if (remaining <= 0) {
      alert("This drop has already been fully claimed.");
      return;
    }

    console.log("Claiming drop", dropId, "as", user.uid, "claimedBy:", dropData.claimedBy);

    await updateDoc(dropRef, {
      claimedBy: arrayUnion(user.uid),
    });

    // Update user's lastClaimTime
    await updateDoc(userRef, {
      lastClaimTime: serverTimestamp(),
    });

    // Set claimed drop and code for display
    setClaimedDrop(dropData);
    const code = `GRB-${user.uid.slice(-4).toUpperCase()}${dropId.slice(-2)}`;
    setClaimCode(code);

    // Show a success message
  setClaimMessage("You’ve successfully claimed this drop!");
  setTimeout(() => setClaimMessage(""), 5000); // auto-clear after 5s

  } catch (error) {
    console.error("Error claiming drop:", error);
    alert("Failed to claim drop.");
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
      } else {
        console.warn('User document not found in Firestore.');
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
const getTruckIcon = (kitchenType, hasActiveDrop) => {
  console.log('kitchenType:', kitchenType, 'hasActiveDrop:', hasActiveDrop);
  let iconUrl;
  switch (kitchenType) {
    case 'trailer':
      iconUrl = hasActiveDrop ? '/trailer-icon-glow.png' : '/trailer-icon.png';
      break;
    case 'cart':
      iconUrl = hasActiveDrop ? '/cart-icon-glow.png' : '/cart-icon.png';
      break;
    default:
      iconUrl = hasActiveDrop ? '/truck-icon-glow.png' : '/truck-icon.png';
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
  try {
    const truckDoc = await getDoc(doc(db, "truckLocations", truckId));
    if (truckDoc.exists()) {
      const truckData = truckDoc.data();
      const ownerUid = truckData.ownerUid;

      const truckDrops = activeDrops.filter(drop => drop.truckId === truckId);

      setActiveTruck({
        id: truckId,
        ...truckData,
        drops: truckDrops, // <-- set currentDrop if found
      });
      setShowDropSummary(true);

      // Fetch owner data, but hold off on showing menu
      const ownerDoc = await getDoc(doc(db, "users", ownerUid));
      if (ownerDoc.exists()) {
        const ownerData = ownerDoc.data();
        setMenuUrl(ownerData.menuUrl || '');
        setSocialLinks({
          instagram: ownerData.instagram || '',
          facebook: ownerData.facebook || '',
          tiktok: ownerData.tiktok || '',
          twitter: ownerData.twitter || '',
        });
      } else {
        console.warn("Owner doc not found for UID:", ownerUid);
      }
    } else {
      console.warn("Truck doc not found for ID:", truckId);
    }
  } catch (error) {
    console.error("Error fetching truck or owner data:", error);
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
        },
        () => {
          const fallbackLocation = { lat: 37.7749, lng: -122.4194 };
          mapInstance.current = new window.google.maps.Map(mapRef.current, {
            center: fallbackLocation,
            zoom: 12,
          });
          initializeMapFeatures();
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!user) return;
  const now = Timestamp.now();
  const dropsRef = collection(db, "drops");
  const q = query(dropsRef, where("expiresAt", ">", now));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log("Drops snapshot size:", snapshot.size, snapshot.docs.map(doc => doc.data()));
    const fetchedDrops = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setActiveDrops(fetchedDrops);
  });

  return () => unsubscribe();
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

  const unsubscribe = onSnapshot(collection(db, 'truckLocations'), (snapshot) => {
    const nowMs = Date.now();
    const existingIds = new Set();

    snapshot.docChanges().forEach(change => {
      const data = change.doc.data();
      const id = change.doc.id;
      existingIds.add(id);

      const lat = data.lat || 0;
      const lng = data.lng || 0;
      const isLive = data.isLive === true;
const visible = data.visible === true;
      const FIVE_MIN = 5 * 60 * 1000; // 5 minutes in milliseconds
      const lastActive = data.lastActive || 0;
      const isStale = nowMs - lastActive > FIVE_MIN;

      console.log('Truck:', data.truckName, 'isLive:', isLive, 'visible:', visible, 'isStale:', isStale, 'showTrucks:', showTrucks);

      if (change.type === 'removed' || !isLive || !visible || isStale || !showTrucks) {
        if (foodTruckMarkers.current[id]) {
          foodTruckMarkers.current[id].setMap(null);
          delete foodTruckMarkers.current[id];
        }
        return;
      }

      const position = { lat, lng };
      const hasActiveDrop = activeDrops.some(drop => drop.truckId === id);
      console.log('Creating marker for:', data.truckName, 'kitchenType:', data.kitchenType);
      const icon = getTruckIcon(data.kitchenType, hasActiveDrop);

      if (!foodTruckMarkers.current[id]) {
        const isFavorite = favorites.some(fav => fav.truckId === id);

        const marker = new window.google.maps.Marker({
          position,
          map: mapInstance.current,
          icon,
          title: data.truckName || 'Food Truck',
          label: isFavorite
      ? {
          text: '❤️',
          color: '#e74c3c',
          fontSize: '20px',
          fontWeight: 'bold'
        }
      : undefined,
          animation: null,
        });

        // Only click handler: open menu modal with drop info
        marker.addListener('click', () => {
          handleTruckIconClick(id);
          setMenuModalVisible(true);
          setCurrentTruckOwnerId(id);
        });

        foodTruckMarkers.current[id] = marker;
      } else {
        const marker = foodTruckMarkers.current[id];
        animateMarkerMove(marker, position);
        marker.setIcon(icon);
        marker.setTitle(data.truckName || 'Food Truck');
      }
    });

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
}, [user, showTrucks, activeDrops]);

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
    setFavorites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
  return () => unsubscribe();
}, [user]);

  // Handler to update favorites after change
  const handleFavoriteChange = async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      setFavorites(userDoc.data().favorites || []);
    }
  };

  const initializeMapFeatures = () => {
    markerCluster.current = new MarkerClusterer({ map: mapInstance.current, markers: [] });

    (onSnapshot(collection(db, 'pings'), (snapshot) => {
      console.log("Data fetched successfully:", snapshot.docs.map((doc) => doc.data())); // Corrected log
    
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
  
      console.log("Sending ping data:", pingData);
  
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
        <option value="mexican">Mexican</option>
        <option value="bbq">BBQ</option>
        <option value="sushi">Sushi</option>
        <option value="american">American</option>
        <option value="italian">Italian</option>
        <option value="chinese">Chinese</option>
        <option value="indian">Indian</option>
        <option value="vegan">Vegan</option>
        <option value="desserts">Desserts</option>
        <option value="drinks">Drinks</option>
      </select>

      <button onClick={handleSendPing}>Send Ping</button>

      {pingError && (
        <p style={{ color: 'red', marginTop: '10px' }}>{pingError}</p>
      )}
    </section>

    <div ref={mapRef} style={{ height: '500px', marginTop: '20px' }} />

    {/* Favorites List */}
    <section style={{ margin: '20px 0' }}>
  <h3>Your Favorite Trucks</h3>
  {favorites.length === 0 ? (
    <p>No favorites yet.</p>
  ) : (
    <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
      {favorites.map((fav) => (
        <li key={fav.id}>{fav.truckName || fav.truckId}</li>
      ))}
    </ul>
  )}
</section>


    {menuModalVisible && (
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
              padding: '5px 15px',
              borderBottomLeftRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => setMenuModalVisible(false)}
              style={{
                backgroundColor: 'transparent',
                color: '#fff',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Menu Content */}
{menuUrl ? (
  menuUrl.endsWith('.pdf') ? (
    <iframe
      src={menuUrl}
      style={{ width: '100%', height: '100%' }}
      title="Menu PDF"
    />
  ) : (
    <img
      src={menuUrl}
      alt="Menu"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    />
  )
) : null}

{/* Drop Summary */}
    {showDropSummary && activeTruck && (
  <div className="drop-summary-card" style={{ marginTop: '20px' }}>
    {claimMessage && <p style={{ color: 'green' }}>{claimMessage}</p>}

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
  <button
    disabled={
      drop.claimedBy?.includes(user.uid) || 
      drop.claimedBy?.length >= drop.quantity
    }
    onClick={() => handleClaimDrop(drop.id)}
  >
    {drop.claimedBy?.includes(user.uid)
      ? "Already Claimed"
      : drop.claimedBy?.length >= drop.quantity
      ? "Fully Claimed"
      : "Claim Drop"}
  </button>
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
        <p><strong>Remaining:</strong> {Math.max((drop.quantity ?? 0) - (drop.claimedBy?.length ?? 0), 0)}</p>
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="1em"
                    viewBox="0 0 448 512"
                    fill="currentColor"
                  >
                    <path d="M400 32L272 208l128 240H320L224 280 128 480H48L176 288 48 32h96l96 160L304 32h96z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>

); // <-- closes the return

}; // <-- closes the CustomerDashboard component

export default CustomerDashboard;