import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Dimensions, Modal, Image, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useAuth } from '../components/AuthContext';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [foodTrucks, setFoodTrucks] = useState([]);
  const [customerPings, setCustomerPings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(null);
  const [ownerData, setOwnerData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showCuisineModal, setShowCuisineModal] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const { userRole, userData, userPlan, user } = useAuth();
  const webViewRef = useRef(null);

  // Available cuisine types for filtering
  const cuisineTypes = [
    { id: 'all', name: 'All Cuisines', emoji: '🍽️' },
    { id: 'american', name: 'American', emoji: '🌭' },
    { id: 'asian-fusion', name: 'Asian Fusion', emoji: '🥢' },
    { id: 'bbq', name: 'BBQ', emoji: '🍖' },
    { id: 'burgers', name: 'Burgers', emoji: '🍔' },
    { id: 'chinese', name: 'Chinese', emoji: '🥡' },
    { id: 'coffee', name: 'Coffee', emoji: '☕' },
    { id: 'desserts', name: 'Desserts', emoji: '🍰' },
    { id: 'drinks', name: 'Drinks', emoji: '🥤' },
    { id: 'greek', name: 'Greek', emoji: '🥙' },
    { id: 'halal', name: 'Halal', emoji: '🕌' },
    { id: 'healthy', name: 'Healthy', emoji: '🥗' },
    { id: 'indian', name: 'Indian', emoji: '🍛' },
    { id: 'italian', name: 'Italian', emoji: '🍝' },
    { id: 'japanese', name: 'Japanese', emoji: '🍣' },
    { id: 'korean', name: 'Korean', emoji: '🥢' },
    { id: 'latin', name: 'Latin', emoji: '🫓' },
    { id: 'mediterranean', name: 'Mediterranean', emoji: '🥙' },
    { id: 'mexican', name: 'Mexican', emoji: '🌮' },
    { id: 'pizza', name: 'Pizza', emoji: '🍕' },
    { id: 'seafood', name: 'Seafood', emoji: '🦐' },
    { id: 'southern', name: 'Southern', emoji: '🍗' },
    { id: 'sushi', name: 'Sushi', emoji: '🍣' },
    { id: 'thai', name: 'Thai', emoji: '🍜' },
    { id: 'vegan', name: 'Vegan', emoji: '🌱' },
    { id: 'wings', name: 'Wings', emoji: '🍗' },
    { id: 'food', name: 'General Food', emoji: '🍽️' }
  ];

  // Function to add test ping data to Firestore for heatmap testing
  const addTestPingData = async () => {
    if (!user || !location) return;
    
    console.log('🔥 Adding test ping data to Firestore for heatmap testing...');
    
    const testPings = [
      { lat: location.coords.latitude + 0.01, lng: location.coords.longitude + 0.01 },
      { lat: location.coords.latitude - 0.01, lng: location.coords.longitude - 0.01 },
      { lat: location.coords.latitude + 0.005, lng: location.coords.longitude + 0.005 },
      { lat: location.coords.latitude - 0.005, lng: location.coords.longitude - 0.005 },
      { lat: location.coords.latitude + 0.008, lng: location.coords.longitude - 0.008 }
    ];
    
    try {
      for (let i = 0; i < testPings.length; i++) {
        const pingData = {
          lat: testPings[i].lat,
          lng: testPings[i].lng,
          latitude: testPings[i].lat, // Also add as latitude for compatibility
          longitude: testPings[i].lng, // Also add as longitude for compatibility
          timestamp: serverTimestamp(),
          userId: user.uid,
          type: 'test_ping',
          created: Date.now()
        };
        
        await setDoc(doc(db, 'pings', `test_ping_${i}_${Date.now()}`), pingData);
        console.log('✅ Added test ping', i + 1, ':', pingData);
      }
      console.log('✅ All test pings added to Firestore successfully');
    } catch (error) {
      console.error('❌ Error adding test pings:', error);
    }
  };

  // Generate session ID when user first logs in
  useEffect(() => {
    if (user && !sessionId) {
      const newSessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      setSessionId(newSessionId);
    } else if (!user) {
      setSessionId(null);
    }
  }, [user, sessionId]);

  // Fetch owner data for current user
  useEffect(() => {
    const fetchOwnerData = async () => {
      if (!user?.uid) return;
      console.log("📋 MapScreen: Fetching owner data for UID:", user.uid);
      
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { uid: user.uid, ...docSnap.data() };
          setOwnerData(data);
          console.log("📋 MapScreen: Owner data fetched:", data);
        }
      } catch (error) {
        console.error("📋 MapScreen: Error fetching owner data:", error);
      }
    };

    fetchOwnerData();
  }, [user]);

  // Function to load menu items from API
  const loadMenuItems = async (truckOwnerId) => {
    if (!truckOwnerId) {
      console.log("No truck owner ID provided");
      return;
    }
    
    console.log("Loading menu items for truck owner:", truckOwnerId);
    setLoadingMenu(true);
    setMenuItems([]);
    
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
        console.log("Menu API response data:", data);
        console.log("Menu items array:", data.items);
        if (data.items && data.items.length > 0) {
          console.log("First menu item structure:", data.items[0]);
        }
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

  // Load real-time data from Firebase
  useEffect(() => {
    if (!user) return;

    console.log('🗺️ MapScreen: Loading Firebase data for user plan:', userPlan);

    // Load food truck locations with complete owner data
    const unsubscribeTrucks = onSnapshot(collection(db, "truckLocations"), async (snapshot) => {
      console.log('🚛 MapScreen: Loading truck locations and owner data for', snapshot.size, 'trucks');
      
      const trucksWithOwnerData = [];
      
      for (const docSnapshot of snapshot.docs) {
        const truckData = { id: docSnapshot.id, ...docSnapshot.data() };
        
        // Filter visible trucks (enhanced visibility logic matching web version)
        const now = Date.now();
        const ONLINE_THRESHOLD = 8 * 60 * 60 * 1000; // 8 hours
        const GRACE_PERIOD = 15 * 60 * 1000; // 15 minutes
        
        const hasCoordinates = truckData.lat && truckData.lng;
        const isExplicitlyVisible = truckData.visible === true;
        const timeSinceActive = truckData.lastActive ? now - truckData.lastActive : Infinity;
        const sessionDuration = truckData.sessionStartTime ? now - truckData.sessionStartTime : 0;
        
        const isRecentlyActive = timeSinceActive <= GRACE_PERIOD;
        const withinEightHourWindow = sessionDuration < ONLINE_THRESHOLD;
        
        const isVisible = hasCoordinates && isExplicitlyVisible && (
          isRecentlyActive || 
          (withinEightHourWindow && isExplicitlyVisible)
        );
        
        if (!isVisible) {
          console.log('🚛 Skipping non-visible truck:', truckData.id);
          continue;
        }
        
        // Get complete owner data for each truck
        try {
          const ownerDoc = await getDoc(doc(db, 'users', truckData.ownerUid || truckData.id));
          if (ownerDoc.exists()) {
            const ownerData = ownerDoc.data();
            console.log('� Retrieved owner data for truck:', truckData.id, {
              truckName: ownerData.truckName,
              cuisineType: ownerData.cuisineType,
              coverUrl: ownerData.coverUrl ? 'Yes' : 'No',
              menuUrl: ownerData.menuUrl ? 'Yes' : 'No',
              socialCount: [ownerData.instagram, ownerData.facebook, ownerData.twitter, ownerData.tiktok].filter(Boolean).length
            });
            
            // Merge truck location data with complete owner profile data
            trucksWithOwnerData.push({
              ...truckData,
              truckName: ownerData.truckName || ownerData.username || 'Food Truck',
              cuisineType: ownerData.cuisineType || 'Food',
              coverUrl: ownerData.coverUrl,
              menuUrl: ownerData.menuUrl,
              instagram: ownerData.instagram,
              facebook: ownerData.facebook,
              twitter: ownerData.twitter,
              tiktok: ownerData.tiktok,
              kitchenType: ownerData.kitchenType || truckData.kitchenType || 'truck'
            });
          } else {
            console.log('⚠️ No owner data found for truck:', truckData.id);
            // Include truck with basic data only
            trucksWithOwnerData.push(truckData);
          }
        } catch (error) {
          console.error('❌ Error fetching owner data for truck:', truckData.id, error);
          // Include truck with basic data only
          trucksWithOwnerData.push(truckData);
        }
      }
      
      console.log('🚛 MapScreen: Loaded', trucksWithOwnerData.length, 'visible food trucks with complete data');
      setFoodTrucks(trucksWithOwnerData);
    });

    // Load customer pings for heatmap (only for Pro and All-Access users)
    let unsubscribePings = null;
    if (userPlan === 'pro' || userPlan === 'all-access') {
      console.log('🔥 MapScreen: Loading customer pings for heatmap (Pro/All-Access user)');
      
      // Always use real Firebase data - only add test data if specifically needed for development
      console.log('📍 Using real Firebase ping data for heatmap');
      
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      unsubscribePings = onSnapshot(collection(db, "pings"), (snapshot) => {
        const pings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })).filter(ping => {
          // Filter valid ping data from last 24 hours
          const lat = Number(ping.lat ?? ping.latitude);
          const lng = Number(ping.lng ?? ping.longitude);
          const timestamp = ping.timestamp?.toDate?.();
          const isRecent = timestamp && timestamp > oneDayAgo;
          
          // Only include pings within reasonable distance (200km radius) for better coverage
          if (location && isFinite(lat) && isFinite(lng)) {
            const userLat = location.coords.latitude;
            const userLng = location.coords.longitude;
            // Use proper haversine distance calculation
            const R = 6371; // Earth's radius in km
            const dLat = (lat - userLat) * Math.PI / 180;
            const dLng = (lng - userLng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(userLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                     Math.sin(dLng/2) * Math.sin(dLng/2);
            const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const withinRange = distance <= 200; // 200km radius for better coverage
            
            console.log(`📍 Ping at [${lat}, ${lng}] is ${distance.toFixed(1)}km away, included: ${withinRange}`);
            return isFinite(lat) && isFinite(lng) && isRecent && withinRange;
          }
          
          return isFinite(lat) && isFinite(lng) && isRecent;
        });
        
        console.log('📍 MapScreen: Loaded', pings.length, 'customer pings for heatmap');
        console.log('📍 Sample ping data:', pings.slice(0, 3));
        console.log('📍 ALL ping data for debugging:', pings);
        console.log('📍 User plan for heatmap access:', userPlan);
        setCustomerPings(pings);
      });
    } else {
      console.log('📋 MapScreen: Basic plan - no heatmap data loaded');
      setCustomerPings([]);
    }

    setLoading(false);

    return () => {
      unsubscribeTrucks();
      if (unsubscribePings) unsubscribePings();
    };
  }, [user, userPlan]);

  // Handle geolocation based on user plan and role
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Please enable location access in settings.');
        
        // For Basic plan users, provide manual location option
        if (userPlan === 'basic') {
          console.log('📍 MapScreen: Basic plan user - manual location mode');
          // Set default location (can be updated manually)
          setLocation({
            coords: {
              latitude: 39.8283, // USA center
              longitude: -98.5795
            }
          });
        }
        return;
      }

      // For All-Access food truck owners, get automatic geolocation and save to Firebase
      if (userRole === 'owner' && userPlan === 'all-access' && user?.uid && sessionId && ownerData) {
        console.log('🌍 MapScreen: All-Access owner - automatic geolocation and truck location update');
        try {
          let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          setLocation(location);
          console.log('✅ MapScreen: Got owner location:', location.coords.latitude, location.coords.longitude);

          // Immediately save to Firestore as truck location
          const truckDocRef = doc(db, 'truckLocations', user.uid);
          const locationData = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            isLive: true,
            visible: true,
            updatedAt: serverTimestamp(),
            lastActive: Date.now(),
            sessionId: sessionId,
            sessionStartTime: Date.now(),
            loginTime: Date.now(),
            ownerUid: user.uid,
            kitchenType: ownerData.kitchenType || "truck",
            truckName: ownerData.username || ownerData.businessName || "Food Truck",
            coverUrl: ownerData.coverUrl || null,
          };
          
          await setDoc(truckDocRef, locationData, { merge: true });
          console.log('🌍 MapScreen: All-Access owner truck location automatically saved:', locationData);
          
        } catch (error) {
          console.error('❌ MapScreen: Geolocation error for All-Access owner:', error);
          setErrorMsg('Unable to get your location. Using default location.');
          setLocation({
            coords: {
              latitude: 39.8283,
              longitude: -98.5795
            }
          });
        }
      } else if (userPlan === 'pro' || userPlan === 'all-access') {
        // For Pro/All-Access customers, get automatic geolocation
        console.log('🌍 MapScreen: Pro/All-Access customer - automatic geolocation');
        try {
          let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation(location);
          console.log('✅ MapScreen: Got customer location:', location.coords.latitude, location.coords.longitude);
        } catch (error) {
          console.error('❌ MapScreen: Geolocation error:', error);
          setErrorMsg('Unable to get your location. Using default location.');
          setLocation({
            coords: {
              latitude: 39.8283,
              longitude: -98.5795
            }
          });
        }
      } else {
        // Basic plan users get manual location
        console.log('📍 MapScreen: Basic plan - using default location (manual mode)');
        setLocation({
          coords: {
            latitude: 39.8283,
            longitude: -98.5795
          }
        });
      }
    })();
  }, [userPlan, userRole, user, sessionId, ownerData]);

  // Mock food truck data with heatmap intensity (fallback for development)
  const mockFoodTrucks = [
    { id: 1, name: "Tasty Tacos", lat: 40.7580, lng: -73.9855, status: "open", popularity: 85, type: "mexican", kitchenType: "truck" },
    { id: 2, name: "Burger Paradise", lat: 40.7614, lng: -73.9776, status: "open", popularity: 92, type: "american", kitchenType: "truck" },
    { id: 3, name: "Pizza Express", lat: 40.7505, lng: -73.9934, status: "closed", popularity: 67, type: "italian", kitchenType: "trailer" },
    { id: 4, name: "Sushi Roll", lat: 40.7589, lng: -73.9851, status: "open", popularity: 78, type: "japanese", kitchenType: "truck" },
    { id: 5, name: "BBQ Master", lat: 40.7558, lng: -73.9863, status: "busy", popularity: 95, type: "bbq", kitchenType: "cart" },
  ];

  const createMapHTML = () => {
    if (!location) return '';
    
    const userLat = location.coords.latitude;
    const userLng = location.coords.longitude;
    
    // Use real truck data if available, otherwise fallback to mock data
    const trucksToDisplay = foodTrucks.length > 0 ? foodTrucks : mockFoodTrucks;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            #map { width: 100%; height: 100vh; }
            
            .truck-marker {
                border: none !important;
                background: transparent !important;
            }
            
            .truck-popup {
                min-width: 220px;
                padding: 0;
                text-align: center;
                border-radius: 12px;
                background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                border: 1px solid #e2e8f0;
                overflow: hidden;
            }
            
            .truck-header {
                position: relative;
                padding: 15px 15px 10px 15px;
            }
            
            .truck-cover-image {
                width: 100%;
                height: 80px;
                object-fit: cover;
                border-radius: 8px;
                margin-bottom: 10px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .truck-name {
                font-size: 18px;
                font-weight: 700;
                color: #2d3748;
                margin-bottom: 8px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }
            
            .truck-status {
                font-size: 14px;
                font-weight: 600;
                margin: 0 15px 10px 15px;
                padding: 6px 12px;
                border-radius: 20px;
                display: inline-block;
            }
            
            .status-open {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
            }
            
            .status-busy {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
            }
            
            .status-closed {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
            }
            
            .truck-details {
                font-size: 13px;
                color: #4a5568;
                margin: 4px 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            
            .view-details-btn {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                border: none;
                padding: 12px 16px;
                border-radius: 0 0 12px 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                width: 100%;
                margin-top: 15px;
            }
            
            .view-details-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
            }
            
            .leaflet-popup-content-wrapper {
                border-radius: 12px;
                overflow: hidden;
            }
            
            .leaflet-popup-tip {
                background: #fff;
            }
            .controls {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 1000;
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
            .control-btn {
                display: block;
                width: 100%;
                padding: 8px;
                margin: 5px 0;
                border: none;
                border-radius: 5px;
                background: #2c6f57;
                color: white;
                cursor: pointer;
                font-size: 12px;
            }
            .control-btn:hover { background: #1e4a3a; }
            .plan-notice {
                position: absolute;
                bottom: 10px;
                left: 10px;
                right: 10px;
                z-index: 1000;
                background: rgba(44, 111, 87, 0.95);
                color: white;
                padding: 10px;
                border-radius: 8px;
                text-align: center;
                font-size: 12px;
            }
            .heatmap-controls {
                position: absolute;
                bottom: 80px;
                right: 10px;
                z-index: 1000;
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
        </style>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
    </head>
    <body>
        <div id="map"></div>
        <div class="controls">
            <button class="control-btn" onclick="centerOnUser()">� My Location</button>
            <button class="control-btn" onclick="filterTrucks('all')">🚛 All Trucks</button>
            <button class="control-btn" onclick="showCuisineSelector()">🍽️ Cuisine Type</button>
            ${(userPlan === 'pro' || userPlan === 'all-access') ? `
            <button class="control-btn" onclick="toggleHeatmap()">🔥 Toggle Heatmap</button>
            ` : ''}
        </div>

        ${(userPlan === 'basic') ? `
        <div class="plan-notice">
            📍 Basic Plan: Upgrade to Pro or All-Access for automatic location and demand heatmaps!
        </div>
        ` : ''}

        ${(userPlan === 'pro' || userPlan === 'all-access') ? `
        <div class="heatmap-controls">
            <div style="font-size: 12px; margin-bottom: 5px;">� Demand Heatmap</div>
            <div style="font-size: 11px; color: #666;">Firebase: ${customerPings.length} pings | Live Data</div>
            <div style="font-size: 10px; color: #999; margin-top: 5px;">Last 24h within 200km</div>
        </div>
        ` : ''}

        <script>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            #map { width: 100%; height: 100vh; }
            .truck-popup {
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                min-width: 200px;
            }
            .truck-name { font-weight: bold; color: #2c6f57; margin-bottom: 5px; }
            .truck-status { 
                padding: 3px 8px; 
                border-radius: 12px; 
                font-size: 12px; 
                display: inline-block;
                margin-bottom: 5px;
            }
            .status-open { background: #d4edda; color: #155724; }
            .status-busy { background: #fff3cd; color: #856404; }
            .status-closed { background: #f8d7da; color: #721c24; }
            .popularity-bar {
                width: 100%;
                height: 6px;
                background: #eee;
                border-radius: 3px;
                overflow: hidden;
                margin-top: 5px;
            }
            .popularity-fill {
                height: 100%;
                background: linear-gradient(90deg, #2c6f57, #4a9b6e);
                transition: width 0.3s ease;
            }
            .controls {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 1000;
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
            .control-btn {
                display: block;
                width: 100%;
                padding: 8px;
                margin: 5px 0;
                border: none;
                border-radius: 5px;
                background: #2c6f57;
                color: white;
                cursor: pointer;
            }
            .control-btn:hover { background: #1e4a3a; }
            .plan-notice {
                position: absolute;
                bottom: 10px;
                left: 10px;
                right: 10px;
                z-index: 1000;
                background: rgba(44, 111, 87, 0.95);
                color: white;
                padding: 10px;
                border-radius: 8px;
                text-align: center;
                font-size: 12px;
            }
            .heatmap-controls {
                position: absolute;
                bottom: 80px;
                right: 10px;
                z-index: 1000;
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
        </style>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
    </head>
    <body>
        <div id="map"></div>
        <div class="controls">
            <button class="control-btn" onclick="centerOnUser()">� My Location</button>
            <button class="control-btn" onclick="filterTrucks('all')">� All Trucks</button>
            <button class="control-btn" onclick="showCuisineSelector()">🍽️ Cuisine Type</button>
            ${(userPlan === 'pro' || userPlan === 'all-access') ? `
            <button class="control-btn" onclick="toggleHeatmap()">🔥 Toggle Heatmap</button>
            ` : ''}
        </div>

        ${(userPlan === 'basic') ? `
        <div class="plan-notice">
            📍 Basic Plan: Upgrade to Pro or All-Access for automatic location and demand heatmaps!
        </div>
        ` : ''}

        ${(userPlan === 'pro' || userPlan === 'all-access') ? `
        <div class="heatmap-controls">
            <div style="font-size: 12px; margin-bottom: 5px;">🔥 Demand Heatmap</div>
            <div style="font-size: 11px; color: #666;">Firebase: ${customerPings.length} pings | Using: REAL DATA</div>
            <div style="font-size: 10px; color: #999; margin-top: 5px;">Plan: ${userPlan} | Live Mode</div>
        </div>
        ` : ''}

        <script>
            // Verify required libraries are loaded
            console.log('📚 Leaflet version:', L.version);
            console.log('🔥 L.heatLayer available:', typeof L.heatLayer !== 'undefined');
            
            if (typeof L.heatLayer === 'undefined') {
                console.error('❌ leaflet.heat plugin not loaded! Trying to load it again...');
                
                // Try to load the plugin again
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
                script.onload = function() {
                    console.log('✅ leaflet.heat plugin reloaded successfully');
                    console.log('🔥 L.heatLayer now available:', typeof L.heatLayer !== 'undefined');
                };
                script.onerror = function() {
                    console.error('❌ Failed to reload leaflet.heat plugin');
                };
                document.head.appendChild(script);
            }
            
            // Initialize map
            const map = L.map('map').setView([${userLat}, ${userLng}], 14);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // User location marker
            const userIcon = L.divIcon({
                html: '<div style="background: #007AFF; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,122,255,0.3);"></div>',
                iconSize: [20, 20],
                className: 'user-marker'
            });
            
            L.marker([${userLat}, ${userLng}], { icon: userIcon })
                .addTo(map)
                .bindPopup('<div class="truck-popup"><div class="truck-name">📍 Your Location</div></div>');

            // Food truck data from Firebase or mock data
            const foodTrucks = ${JSON.stringify(trucksToDisplay)};
            
            // Customer ping data for heatmap (Pro/All-Access only)
            const customerPings = ${JSON.stringify(customerPings)};
            
            // Add some mock ping data for testing if no real data
            const mockPings = [
                { lat: ${userLat + 0.01}, lng: ${userLng + 0.01} },
                { lat: ${userLat - 0.01}, lng: ${userLng - 0.01} },
                { lat: ${userLat + 0.005}, lng: ${userLng + 0.005} },
                { lat: ${userLat - 0.005}, lng: ${userLng - 0.005} },
                { lat: ${userLat + 0.008}, lng: ${userLng - 0.008} }
            ];
            
            // Use real Firebase ping data if available, otherwise fallback to mock for testing
            const realPings = ${JSON.stringify(customerPings)};
            const testPings = realPings.length > 0 ? realPings : mockPings;
            console.log('🔥 HEATMAP DATA SOURCE ANALYSIS:');
            console.log('🔥 Using ping data source:', realPings.length > 0 ? 'REAL FIREBASE DATA' : 'MOCK DATA (fallback)');
            console.log('🔥 Real Firebase ping count:', realPings.length);
            console.log('🔥 Final ping count for heatmap:', testPings.length);
            console.log('🔥 Real ping sample data:', realPings.slice(0, 2));
            console.log('🔥 Final ping sample data:', testPings.slice(0, 2));
            const userPlan = '${userPlan}';
            const userRole = '${userRole}';
            const showHeatmapFeatures = userPlan === 'pro' || userPlan === 'all-access';
            
            let truckMarkers = [];
            let heatmapLayer = null;
            let showHeatmap = false;

            // Create circular icon using canvas (EXACT copy from web version)
            const createCircularIcon = (imageUrl, size = 40) => {
                return new Promise((resolve) => {
                    console.log('🖼️ Creating circular icon for URL:', imageUrl);
                    
                    // Validate imageUrl
                    if (!imageUrl || typeof imageUrl !== 'string') {
                        console.log('❌ Invalid image URL provided to createCircularIcon');
                        resolve(null);
                        return;
                    }

                    // Handle Firebase Storage URLs properly (don't skip them!)
                    const isFirebaseStorage = imageUrl.includes('firebasestorage.googleapis.com');
                    
                    const img = new Image();
                    
                    // Set crossOrigin for Firebase Storage and other external URLs
                    if (isFirebaseStorage || (!imageUrl.includes(window.location.hostname) && imageUrl.startsWith('http'))) {
                        img.crossOrigin = 'anonymous';
                        console.log('🔗 Setting crossOrigin for external URL:', imageUrl.substring(0, 50) + '...');
                    }
                    
                    img.onload = () => {
                        try {
                            console.log('✅ Image loaded successfully, creating canvas for:', imageUrl.substring(0, 50) + '...');
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
                            
                            const dataUrl = canvas.toDataURL();
                            console.log('✅ Successfully created circular icon with black border');
                            resolve(dataUrl);
                        } catch (error) {
                            console.log('❌ Canvas error in createCircularIcon:', error.message);
                            resolve(null);
                        }
                    };
                    
                    img.onerror = (error) => {
                        console.log('❌ Failed to load image for circular icon:', imageUrl.substring(0, 50) + '...', error);
                        resolve(null);
                    };
                    
                    // Add timeout to prevent hanging
                    setTimeout(() => {
                        if (!img.complete) {
                            console.log('⏰ Image loading timeout for:', imageUrl.substring(0, 50) + '...');
                            resolve(null);
                        }
                    }, 10000); // Increased timeout for Firebase Storage
                    
                    console.log('🔄 Starting image load...');
                    img.src = imageUrl;
                });
            };

            // Get default truck icon based on kitchen type
            const getDefaultTruckIcon = (kitchenType) => {
                const type = (kitchenType || 'truck').toLowerCase();
                const baseStyle = 'width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; border: 3px solid #000000; box-shadow: 0 3px 10px rgba(0,0,0,0.4);';
                
                if (type === 'trailer') {
                    return '<div style="background: #2c6f57; ' + baseStyle + '">🚚</div>';
                } else if (type === 'cart') {
                    return '<div style="background: #4a9b6e; ' + baseStyle + '">🛒</div>';
                } else {
                    // Default truck icon
                    return '<div style="background: #2c6f57; ' + baseStyle + '">🚛</div>';
                }
            };

            // Create truck markers with circular icons (ENHANCED with better cover photo handling)
            async function createTruckMarkers(trucks = foodTrucks) {
                console.log('🚛 Creating truck markers for', trucks.length, 'trucks');
                
                // Clear existing markers
                truckMarkers.forEach(marker => map.removeLayer(marker));
                truckMarkers = [];

                for (const truck of trucks) {
                    const statusClass = 'status-' + (truck.status || 'open');
                    const statusEmoji = truck.status === 'open' ? '🟢' : truck.status === 'busy' ? '🟡' : '🔴';
                    
                    // Get the truck name and details
                    const truckName = truck.truckName || truck.name || 'Food Truck';
                    const kitchenType = truck.kitchenType || 'truck';
                    const coverUrl = truck.coverUrl;
                    
                    console.log('🚛 Processing truck:', truckName);
                    console.log('🖼️ Cover URL:', coverUrl ? coverUrl.substring(0, 50) + '...' : 'None');
                    
                    let iconHtml;
                    
                    // PRIORITY: Try to create circular icon from cover photo
                    if (coverUrl && coverUrl.trim() !== '') {
                        console.log('🖼️ Attempting to create circular icon for truck:', truckName);
                        try {
                            const circularIconData = await createCircularIcon(coverUrl, 40);
                            
                            if (circularIconData) {
                                console.log('✅ Successfully created circular icon for:', truckName);
                                iconHtml = '<img src="' + circularIconData + '" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #000000; box-shadow: 0 3px 10px rgba(0,0,0,0.4);" />';
                            } else {
                                console.log('❌ Failed to create circular icon, using default for:', truckName);
                                iconHtml = getDefaultTruckIcon(kitchenType);
                            }
                        } catch (error) {
                            console.log('❌ Error creating circular icon for:', truckName, error);
                            iconHtml = getDefaultTruckIcon(kitchenType);
                        }
                    } else {
                        console.log('📦 No cover photo, using default icon for:', truckName);
                        iconHtml = getDefaultTruckIcon(kitchenType);
                    }
                    
                    const truckIcon = L.divIcon({
                        html: iconHtml,
                        iconSize: [40, 40],
                        className: 'truck-marker'
                    });

                    const lat = truck.lat || truck.latitude;
                    const lng = truck.lng || truck.longitude;
                    
                    if (!lat || !lng) {
                        console.log('⚠️ Skipping truck without coordinates:', truckName);
                        continue;
                    }

                    const marker = L.marker([lat, lng], { icon: truckIcon })
                        .addTo(map)
                        .bindPopup(\`
                            <div class="truck-popup">
                                <div class="truck-header">
                                    \${coverUrl ? \`<img src="\${coverUrl}" class="truck-cover-image" onerror="this.style.display='none'" />\` : ''}
                                    <div class="truck-name">\${truckName}</div>
                                </div>
                                <div class="truck-status \${statusClass}">\${statusEmoji} \${(truck.status || 'OPEN').toUpperCase()}</div>
                                <div class="truck-details">🍽️ \${(truck.cuisineType || truck.type || 'Food').charAt(0).toUpperCase() + (truck.cuisineType || truck.type || 'Food').slice(1)}</div>
                                <div class="truck-details">📱 Kitchen: \${kitchenType.charAt(0).toUpperCase() + kitchenType.slice(1)}</div>
                                \${truck.popularity ? \`<div class="truck-details">⭐ Popularity: \${truck.popularity}%</div>\` : ''}
                                <button class="view-details-btn" onclick="openTruckDetails('\${truck.id}', '\${truckName}', '\${truck.cuisineType || truck.type || 'Food'}', '\${coverUrl || ''}', '\${truck.menuUrl || ''}', '\${truck.instagram || ''}', '\${truck.facebook || ''}', '\${truck.twitter || ''}', '\${truck.tiktok || ''}')">
                                    📋 View Full Details
                                </button>
                            </div>
                        \`);
                    
                    truckMarkers.push(marker);
                    console.log('✅ Added marker for:', truckName, 'with icon type:', coverUrl ? 'Cover Photo' : 'Default');
                }
                
                console.log('🚛 Finished creating', truckMarkers.length, 'truck markers');
            }

            // Function to handle truck details modal (communicates with React Native)
            function openTruckDetails(truckId, truckName, cuisine, coverUrl, menuUrl, instagram, facebook, twitter, tiktok) {
                console.log('Opening enhanced truck details for:', truckName);
                
                const socialLinks = {
                    instagram: instagram && instagram !== 'undefined' ? instagram : null,
                    facebook: facebook && facebook !== 'undefined' ? facebook : null,
                    twitter: twitter && twitter !== 'undefined' ? twitter : null,
                    tiktok: tiktok && tiktok !== 'undefined' ? tiktok : null
                };
                
                // Send message to React Native to open enhanced truck details modal
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'OPEN_TRUCK_DETAILS',
                    data: {
                        id: truckId,
                        name: truckName,
                        cuisine: cuisine,
                        coverUrl: coverUrl && coverUrl !== 'undefined' ? coverUrl : null,
                        menuUrl: menuUrl && menuUrl !== 'undefined' ? menuUrl : null,
                        socialLinks: socialLinks
                    }
                }));
            }

            // Create heatmap from customer pings (Pro/All-Access only)
            function createHeatmap() {
                console.log('🔥 createHeatmap() called');
                console.log('🔥 showHeatmapFeatures:', showHeatmapFeatures);
                console.log('🔥 testPings.length:', testPings.length);
                
                if (!showHeatmapFeatures) {
                    console.log('❌ Heatmap blocked: Not Pro/All-Access plan');
                    return;
                }
                
                if (testPings.length === 0) {
                    console.log('❌ Heatmap blocked: No ping data available');
                    return;
                }
                
                const heatData = testPings.map(ping => {
                    const lat = Number(ping.lat || ping.latitude);
                    const lng = Number(ping.lng || ping.longitude);
                    const intensity = 0.8; // Base intensity for customer pings
                    
                    console.log('🔥 Processing ping:', { lat, lng, intensity });
                    return [lat, lng, intensity];
                }).filter(point => {
                    const isValid = point[0] && point[1] && isFinite(point[0]) && isFinite(point[1]);
                    if (!isValid) {
                        console.log('❌ Filtered out invalid point:', point);
                    }
                    return isValid;
                });
                
                console.log('🔥 Creating Leaflet heatmap with', heatData.length, 'valid ping points');
                console.log('🔥 Sample heatData:', heatData.slice(0, 3));
                
                if (heatData.length === 0) {
                    console.log('❌ No valid heatmap data after filtering');
                    return;
                }
                
                try {
                    // Ensure L.heatLayer is available
                    if (typeof L.heatLayer === 'undefined') {
                        console.error('❌ L.heatLayer is not available! leaflet.heat plugin not loaded');
                        alert('Heatmap library not loaded! Check console.');
                        return;
                    }
                    
                    console.log('🔥 Creating heatmap with options:', {
                        radius: 60,
                        blur: 30,
                        maxZoom: 18,
                        max: 1.0
                    });
                    
                    heatmapLayer = L.heatLayer(heatData, {
                        radius: 60,      // Increased radius for visibility
                        blur: 30,        // Increased blur for visibility  
                        maxZoom: 18,
                        max: 1.0,        // Max intensity
                        minOpacity: 0.4, // Minimum opacity to ensure visibility
                        gradient: {
                            0.0: 'blue',     // Blue for low demand
                            0.2: 'cyan',     
                            0.4: 'lime',     // Green 
                            0.6: 'yellow',   // Yellow
                            0.8: 'orange',   // Orange 
                            1.0: 'red'       // Red for high demand
                        }
                    });
                    console.log('✅ Leaflet heatmap layer created successfully');
                    console.log('🔥 Heatmap layer object:', heatmapLayer);
                    
                    // Immediately test adding to map
                    if (map) {
                        console.log('🔥 Adding heatmap to map immediately for testing');
                        map.addLayer(heatmapLayer);
                        showHeatmap = true;
                        console.log('✅ Heatmap added to map successfully');
                    }
                } catch (error) {
                    console.error('❌ Error creating Leaflet heatmap layer:', error);
                    alert('Error creating heatmap: ' + error.message);
                }
            }

            // Toggle functions
            function toggleHeatmap() {
                console.log('🔥 toggleHeatmap() called');
                console.log('🔥 showHeatmapFeatures:', showHeatmapFeatures);
                console.log('🔥 showHeatmap:', showHeatmap);
                console.log('🔥 heatmapLayer exists:', !!heatmapLayer);
                
                if (!showHeatmapFeatures) {
                    alert('Heatmap features are available for Pro and All-Access plans only!');
                    return;
                }
                
                if (showHeatmap) {
                    // Hide heatmap
                    if (heatmapLayer) {
                        console.log('🔥 Removing heatmap layer from map');
                        map.removeLayer(heatmapLayer);
                    }
                    showHeatmap = false;
                    console.log('🔥 Heatmap hidden');
                } else {
                    // Show heatmap
                    if (!heatmapLayer) {
                        console.log('🔥 Creating new heatmap layer');
                        createHeatmap();
                    }
                    
                    if (heatmapLayer) {
                        console.log('🔥 Adding heatmap layer to map');
                        map.addLayer(heatmapLayer);
                        showHeatmap = true;
                        console.log('✅ Heatmap shown successfully');
                    } else {
                        console.log('❌ Failed to create heatmap layer');
                        alert('Unable to create heatmap. Check console for details.');
                    }
                }
            }

            function centerOnUser() {
                map.setView([${userLat}, ${userLng}], 15);
            }

            function filterTrucks(filter) {
                let filtered = foodTrucks;
                if (filter === 'open') {
                    filtered = foodTrucks.filter(truck => (truck.status || 'open') === 'open');
                } else if (filter === 'cuisine') {
                    // This will be called from applyCuisineFilter with selected cuisine
                    return;
                }
                createTruckMarkers(filtered);
            }

            // Cuisine filtering variables
            let selectedCuisineType = 'all';

            function showCuisineSelector() {
                console.log('🍽️ Opening cuisine selector modal');
                
                // Send message to React Native to open the cuisine modal
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SHOW_CUISINE_MODAL'
                }));
            }



            // Initialize
            console.log('🚛 Initializing map with truck markers...');
            createTruckMarkers();
            
            // Listen for messages from React Native
            window.addEventListener('message', function(event) {
                try {
                    const message = JSON.parse(event.data);
                    console.log('🍽️ WebView received message:', message.type);
                    
                    if (message.type === 'APPLY_CUISINE_FILTER') {
                        const cuisineType = message.cuisineType;
                        console.log('🍽️ Applying cuisine filter:', cuisineType);
                        
                        selectedCuisineType = cuisineType;
                        
                        let filtered = foodTrucks;
                        if (cuisineType !== 'all') {
                            filtered = foodTrucks.filter(truck => {
                                const truckCuisine = (truck.cuisineType || truck.type || 'food').toLowerCase();
                                return truckCuisine === cuisineType.toLowerCase();
                            });
                        }
                        
                        console.log('🍽️ Filtered', filtered.length, 'trucks for cuisine:', cuisineType);
                        createTruckMarkers(filtered);
                    }
                } catch (error) {
                    console.log('Error parsing WebView message:', error);
                }
            });
            
            // Initialize heatmap for Pro/All-Access users
            console.log('🔥 Checking heatmap initialization...');
            console.log('🔥 showHeatmapFeatures:', showHeatmapFeatures);
            console.log('🔥 testPings.length:', testPings.length);
            console.log('🔥 userPlan:', userPlan);
            console.log('🔥 L.heatLayer available:', typeof L.heatLayer !== 'undefined');
            
            if (showHeatmapFeatures) {
                console.log('🔥 User has heatmap features, creating heatmap...');
                createHeatmap();
                
                // Always show heatmap by default for testing (Pro/All-Access users)
                if (heatmapLayer) {
                    console.log('🔥 Auto-showing heatmap for testing');
                    map.addLayer(heatmapLayer);
                    showHeatmap = true;
                    console.log('✅ Heatmap should now be visible on map');
                } else {
                    console.log('❌ Heatmap layer was not created');
                }
            } else {
                console.log('📋 Basic plan user - no heatmap features');
            }

            // Add click handler for setting truck location (owners only)
        </script>
        
        <style>
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        </style>
    </body>
    </html>
    `;
  };

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Map - {userPlan === 'basic' ? 'Manual Location Mode' : 'Location Access Required'}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          {userPlan === 'basic' ? (
            <View>
              <Text style={styles.subtitle}>Basic Plan: Using default location view</Text>
              <Text style={styles.infoText}>
                📍 Upgrade to Pro or All-Access for automatic geolocation and demand heatmaps!
              </Text>
            </View>
          ) : (
            <Text style={styles.subtitle}>Please enable location permissions to use automatic geolocation</Text>
          )}
        </View>
      </View>
    );
  }

  if (!location || loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Interactive Map</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.loadingText}>
            {loading ? 'Loading map data...' : 'Preparing interactive map...'}
          </Text>
          <Text style={styles.subtitle}>
            Plan: {userPlan?.toUpperCase() || 'BASIC'} • 
            {userPlan === 'basic' ? ' Manual Location' : ' Auto Location + Heatmaps'}
          </Text>
        </View>
      </View>
    );
  }

  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (message.type === 'OPEN_TRUCK_DETAILS') {
        const { id, name, cuisine, coverUrl, menuUrl, socialLinks } = message.data;
        
        // Build social media links display
        let socialText = '';
        const activeSocials = [];
        
        if (socialLinks.instagram) activeSocials.push('📷 Instagram');
        if (socialLinks.facebook) activeSocials.push('📘 Facebook');
        if (socialLinks.twitter) activeSocials.push('🐦 Twitter');
        if (socialLinks.tiktok) activeSocials.push('🎵 TikTok');
        
        if (activeSocials.length > 0) {
          socialText = `\n\nSocial Media:\n${activeSocials.join('\n')}`;
        }
        
        setSelectedTruck({
          name,
          cuisine,
          coverUrl,
          menuUrl,
          socialLinks,
          activeSocials,
          socialText,
          ownerId: id
        });
        setShowMenuModal(true);
      } else if (message.type === 'SHOW_CUISINE_MODAL') {
        console.log('🍽️ Opening cuisine modal from WebView');
        console.log('🍽️ Current showCuisineModal state:', showCuisineModal);
        setShowCuisineModal(true);
        console.log('🍽️ Called setShowCuisineModal(true)');
      }
    } catch (error) {
      console.log('Error parsing WebView message:', error);
    }
  };

  // Handle cuisine filter application
  const handleApplyCuisineFilter = () => {
    console.log('🍽️ Applying cuisine filter from React Native:', selectedCuisine);
    
    // Send message to WebView to apply the filter
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'APPLY_CUISINE_FILTER',
        cuisineType: selectedCuisine
      }));
    }
    
    setShowCuisineModal(false);
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: createMapHTML() }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        scrollEnabled={false}
        onMessage={handleWebViewMessage}
        onError={(e) => console.log('WebView error:', e)}
        onHttpError={(e) => console.log('HTTP error:', e)}
      />
      
      {/* Map Overlay - Only show for Basic plan users */}
      {userPlan === 'basic' && (
        <View style={styles.mapOverlay}>
          <Text style={styles.overlayTitle}>
            🗺️ Interactive Food Truck Map • {userPlan?.toUpperCase() || 'BASIC'}
          </Text>
          <Text style={styles.overlaySubtitle}>
            {userRole === 'owner' 
              ? 'Tap on the map to set your truck location manually'
              : 'Live truck locations • Upgrade for demand heatmaps!'
            }
          </Text>
        </View>
      )}

      {/* Food Truck Menu Modal */}
      <Modal
        visible={showMenuModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                console.log('Close button pressed!');
                setShowMenuModal(false);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              🚚 {selectedTruck?.name || 'Food Truck'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedTruck?.cuisine} Cuisine
            </Text>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Truck Info Section */}
            <View style={styles.truckInfoSection}>
              {selectedTruck?.coverUrl && (
                <View style={styles.coverPhotoSection}>
                  <Text style={styles.sectionTitle}>📸 Cover Photo</Text>
                  <Image source={{ uri: selectedTruck.coverUrl }} style={styles.coverImage} />
                </View>
              )}
              
              {selectedTruck?.activeSocials && selectedTruck.activeSocials.length > 0 && (
                <View style={styles.socialSection}>
                  <Text style={styles.sectionTitle}>🌐 Social Media</Text>
                  <View style={styles.socialLinks}>
                    {selectedTruck.socialLinks?.instagram && (
                      <TouchableOpacity style={[styles.socialButton, styles.instagramButton]}>
                        <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                        <Text style={[styles.socialButtonText, { color: '#E4405F' }]}>Instagram</Text>
                      </TouchableOpacity>
                    )}
                    {selectedTruck.socialLinks?.facebook && (
                      <TouchableOpacity style={[styles.socialButton, styles.facebookButton]}>
                        <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                        <Text style={[styles.socialButtonText, { color: '#1877F2' }]}>Facebook</Text>
                      </TouchableOpacity>
                    )}
                    {selectedTruck.socialLinks?.twitter && (
                      <TouchableOpacity style={[styles.socialButton, styles.xButton]}>
                        <Ionicons name="logo-twitter" size={20} color="#000000" />
                        <Text style={[styles.socialButtonText, { color: '#000000' }]}>X</Text>
                      </TouchableOpacity>
                    )}
                    {selectedTruck.socialLinks?.tiktok && (
                      <TouchableOpacity style={[styles.socialButton, styles.tiktokButton]}>
                        <Ionicons name="logo-tiktok" size={20} color="#000000" />
                        <Text style={[styles.socialButtonText, { color: '#000000' }]}>TikTok</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Menu Section */}
            <View style={styles.menuSection}>
              <View style={styles.menuHeader}>
                <Text style={styles.sectionTitle}>📋 Menu</Text>
                <TouchableOpacity 
                  style={styles.viewMenuButton}
                  onPress={() => {
                    if (selectedTruck?.ownerId) {
                      loadMenuItems(selectedTruck.ownerId);
                    }
                  }}
                  disabled={loadingMenu}
                >
                  <Text style={styles.viewMenuButtonText}>
                    {loadingMenu ? 'Loading...' : 'View Menu'}
                  </Text>
                </TouchableOpacity>
              </View>

              {loadingMenu && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#e74c3c" />
                  <Text style={styles.loadingText}>Loading menu items...</Text>
                </View>
              )}

              {!loadingMenu && menuItems.length > 0 && (
                <View style={styles.menuGrid}>
                  {menuItems.map((item, index) => (
                    <View key={index} style={styles.menuItem}>
                      {item.image && (
                        <Image source={{ uri: item.image }} style={styles.menuItemImage} />
                      )}
                      <View style={styles.menuItemInfo}>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                        <Text style={styles.menuItemPrice}>${item.price}</Text>
                        {item.description && (
                          <Text style={styles.menuItemDescription}>{item.description}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {!loadingMenu && menuItems.length === 0 && selectedTruck?.ownerId && (
                <View style={styles.emptyMenuContainer}>
                  <Text style={styles.emptyMenuText}>
                    {selectedTruck.menuUrl ? 
                      'Tap "View Menu" to load items' : 
                      'This food truck has not uploaded a menu yet.'
                    }
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Cuisine Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCuisineModal}
        onRequestClose={() => setShowCuisineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cuisineModalContent}>
            <Text style={styles.cuisineModalTitle}>🍽️ Select Cuisine Type</Text>
            
            <ScrollView style={styles.cuisineScrollView}>
              <View style={styles.cuisineGrid}>
                {cuisineTypes.map((cuisine) => (
                  <TouchableOpacity
                    key={cuisine.id}
                    style={[
                      styles.cuisineOption,
                      selectedCuisine === cuisine.id && styles.cuisineOptionSelected
                    ]}
                    onPress={() => setSelectedCuisine(cuisine.id)}
                  >
                    <Text style={styles.cuisineEmoji}>{cuisine.emoji}</Text>
                    <Text style={[
                      styles.cuisineName,
                      selectedCuisine === cuisine.id && styles.cuisineNameSelected
                    ]}>
                      {cuisine.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <View style={styles.cuisineModalButtons}>
              <TouchableOpacity 
                style={[styles.cuisineModalButton, styles.cancelButton]}
                onPress={() => setShowCuisineModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.cuisineModalButton, styles.applyButton]}
                onPress={handleApplyCuisineFilter}
              >
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  webview: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#2c6f57',
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#2c6f57',
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 18,
    color: '#2c6f57',
    textAlign: 'center',
  },
  mapOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(44, 111, 87, 0.95)',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  overlaySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  overlayFeature: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
    fontStyle: 'italic',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    backgroundColor: '#2c6f57',
    padding: 20,
    paddingTop: 60,
    paddingRight: 70,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  truckInfoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 10,
  },
  coverPhotoSection: {
    marginBottom: 20,
  },
  coverImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  socialSection: {
    marginBottom: 20,
  },
  socialLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  socialButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  instagramButton: {
    backgroundColor: '#fef7f7',
    borderColor: '#E4405F',
  },
  facebookButton: {
    backgroundColor: '#f7f9ff',
    borderColor: '#1877F2',
  },
  twitterButton: {
    backgroundColor: '#f7fcff',
    borderColor: '#1DA1F2',
  },
  xButton: {
    backgroundColor: '#f8f8f8',
    borderColor: '#000000',
  },
  tiktokButton: {
    backgroundColor: '#f8f8f8',
    borderColor: '#000000',
  },
  socialButtonText: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  menuSection: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewMenuButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewMenuButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  menuItemImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  menuItemInfo: {
    padding: 12,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  emptyMenuContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyMenuText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
  },
  // Cuisine Modal Styles
  cuisineModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  cuisineModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c6f57',
  },
  cuisineScrollView: {
    maxHeight: 400,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  cuisineOption: {
    width: '48%',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  cuisineOptionSelected: {
    borderColor: '#2c6f57',
    backgroundColor: '#2c6f57',
  },
  cuisineEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  cuisineName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  cuisineNameSelected: {
    color: 'white',
  },
  cuisineModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cuisineModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  applyButton: {
    backgroundColor: '#2c6f57',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
