import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Dimensions, Modal, Image, ActivityIndicator, TextInput, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../components/AuthContext';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, serverTimestamp, addDoc, getDocs, query, where, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Ionicons } from '@expo/vector-icons';
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { calculateStripeConnectPayment, preparePaymentIntentData } from '../utils/paymentConfig';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  // DEBUG: Console log to confirm code changes are active
  console.log('🔧 DEBUG: MapScreen loaded with UPDATED code - Menu Management changes should be active');
  
  // Test Firebase connection immediately
  useEffect(() => {
    const testFirebaseConnection = async () => {
      try {
        console.log('🔥 FIREBASE TEST: Testing Firebase connection...');
        console.log('🔥 FIREBASE TEST: db object exists:', !!db);
        console.log('🔥 FIREBASE TEST: user object exists:', !!user);
        console.log('🔥 FIREBASE TEST: user.uid:', user?.uid);
        
        // Try a simple Firebase read
        const testDoc = doc(db, 'users', user?.uid || 'test');
        const testSnapshot = await getDoc(testDoc);
        console.log('🔥 FIREBASE TEST: Test doc read successful:', testSnapshot.exists());
        
        // Try to read truckLocations collection
        const truckLocsRef = collection(db, 'truckLocations');
        const truckLocsSnapshot = await getDocs(truckLocsRef);
        console.log('🔥 FIREBASE TEST: truckLocations collection size:', truckLocsSnapshot.size);
        
        // Try to read trucks collection  
        const trucksRef = collection(db, 'trucks');
        const trucksSnapshot = await getDocs(trucksRef);
        console.log('🔥 FIREBASE TEST: trucks collection size:', trucksSnapshot.size);
        
        // Try to read menuItems collection
        const menuRef = collection(db, 'menuItems');
        const menuSnapshot = await getDocs(menuRef);
        console.log('🔥 FIREBASE TEST: menuItems collection size:', menuSnapshot.size);
        
      } catch (error) {
        console.error('🔥 FIREBASE TEST: Connection test failed:', error);
        console.error('🔥 FIREBASE TEST: Error code:', error.code);
        console.error('🔥 FIREBASE TEST: Error message:', error.message);
      }
    };
    
    if (user) {
      testFirebaseConnection();
    }
  }, [user]);
  
  // TEMPORARILY DISABLED: Load user's favorites - commenting out to test if this causes map issues
  /*
  useEffect(() => {
    if (!user?.uid) {
      setUserFavorites(new Set());
      return;
    }

    console.log('❤️ FAVORITES: Loading favorites for user:', user.uid);
    
    const favoritesQuery = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(favoritesQuery, (snapshot) => {
      const favoriteSet = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.truckId) {
          favoriteSet.add(data.truckId);
        }
      });
      
      console.log('❤️ FAVORITES: Loaded', favoriteSet.size, 'favorites for user');
      setUserFavorites(favoriteSet);
    }, (error) => {
      console.error('❤️ FAVORITES: Error loading favorites:', error);
      // Set empty favorites to prevent undefined issues
      setUserFavorites(new Set());
    });

    return () => unsubscribe();
  }, [user?.uid]);
  */
  
  // Set empty favorites as fallback while disabled
  useEffect(() => {
    setUserFavorites(new Set());
  }, []);

  // TEMPORARILY DISABLED: Load favorite counts for all trucks (for owners to see analytics)
  /*
  useEffect(() => {
    if (!foodTrucks.length) return;

    console.log('📊 FAVORITES: Loading favorite counts for', foodTrucks.length, 'trucks');
    
    const loadFavoriteCounts = async () => {
      const counts = new Map();
      
      for (const truck of foodTrucks) {
        const truckId = truck.ownerId || truck.id;
        if (!truckId) continue;
        
        try {
          const favoritesQuery = query(
            collection(db, 'favorites'),
            where('truckId', '==', truckId)
          );
          
          const snapshot = await getDocs(favoritesQuery);
          counts.set(truckId, snapshot.size);
        } catch (error) {
          console.error('📊 FAVORITES: Error loading count for truck', truckId, error);
          counts.set(truckId, 0);
        }
      }
      
      console.log('📊 FAVORITES: Loaded favorite counts:', counts.size, 'trucks processed');
      setTruckFavoriteCounts(counts);
    };

    loadFavoriteCounts();
  }, [foodTrucks]);
  */
  
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [foodTrucks, setFoodTrucks] = useState([]);
  const [hasReceivedFirebaseData, setHasReceivedFirebaseData] = useState(false); // Track if we've gotten Firebase response
  const [customerPings, setCustomerPings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapHTML, setMapHTML] = useState(''); // Add state for map HTML
  const [locationPermission, setLocationPermission] = useState(null);
  const [ownerData, setOwnerData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showCuisineModal, setShowCuisineModal] = useState(false);
  const [excludedCuisines, setExcludedCuisines] = useState([]); // Changed to excluded cuisines (empty = Show All)
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);
  const [pendingCuisineFilter, setPendingCuisineFilter] = useState(null);
  const [showTruckIcon, setShowTruckIcon] = useState(true); // Toggle for truck icon visibility (owners only)
  const [lastActivityTime, setLastActivityTime] = useState(Date.now()); // Track user activity
  const [imageAspectRatio, setImageAspectRatio] = useState(null);
  
  // 🚀 PERFORMANCE: Privacy settings cache to avoid repeated Firebase calls
  const [privacyCache, setPrivacyCache] = useState(new Map());
  const [privacyCacheTimestamp, setPrivacyCacheTimestamp] = useState(0);
  const PRIVACY_CACHE_DURATION = 30 * 1000; // 30 seconds cache
  
  // 🌍 PERFORMANCE: Geographic filtering for large-scale deployments
  const [viewBounds, setViewBounds] = useState(null);
  const MAX_TRUCKS_PER_LOAD = 100; // Limit trucks per viewport
  const GEOGRAPHIC_RADIUS = 50; // km radius for truck loading
  
  const [loadingImageSize, setLoadingImageSize] = useState(false);
  
  // Favorites functionality
  const [userFavorites, setUserFavorites] = useState(new Set()); // Set of truck IDs favorited by user
  const [truckFavoriteCounts, setTruckFavoriteCounts] = useState(new Map()); // Map of truck ID to favorite count
  
  // Events feature states
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Drops feature states
  const [showDropForm, setShowDropForm] = useState(false);
  const [dropFormData, setDropFormData] = useState({
    title: "",
    description: "",
    quantity: 10,
    expiresInMinutes: 60,
  });
  const [creatingDrop, setCreatingDrop] = useState(false);
  const [dropCreationMessage, setDropCreationMessage] = useState("");
  
  // Customer drop claiming states
  const [truckDrops, setTruckDrops] = useState([]);
  const [loadingDrops, setLoadingDrops] = useState(false);

  // Catering booking states
  const [showCateringModal, setShowCateringModal] = useState(false);
  
  // NEW item tracking (client-side workaround)
  const [newItemIds, setNewItemIds] = useState(new Set());

  // Client-side new items tracking functions
  const getNewItemIds = async (userId) => {
    try {
      const stored = await AsyncStorage.getItem(`newItemIds_${userId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.error('Error getting new item IDs:', error);
      return new Set();
    }
  };

  const isItemNew = (itemId, truckOwnerId) => {
    // For MapScreen, we need to check if this user has marked items as new
    // Since we don't know who's viewing, we'll just check if the item is in any new items list
    return newItemIds.has(itemId);
  };
  const [cateringFormData, setCateringFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    eventDate: '',
    eventTime: '',
    eventLocation: '',
    guestCount: '',
    specialRequests: '',
  });
  const [submittingCateringForm, setSubmittingCateringForm] = useState(false);

  // Festival booking states (for event organizers)
  const [showFestivalModal, setShowFestivalModal] = useState(false);
  const [festivalFormData, setFestivalFormData] = useState({
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    eventName: '',
    eventDate: '',
    eventTime: '',
    eventLocation: '',
    eventAddress: '',
    expectedAttendance: '',
    eventDuration: '',
    spacesAvailable: '',
    electricityProvided: false,
    waterProvided: false,
    boothFee: '',
    salesPercentage: '',
    eventDescription: '',
    specialRequirements: '',
  });
  const [submittingFestivalForm, setSubmittingFestivalForm] = useState(false);

  // Function to check if truck is currently open based on business hours
  const checkTruckOpenStatus = (businessHours) => {
    if (!businessHours) {
      console.log('⏰ MapScreen: No business hours data - defaulting to OPEN');
      return 'open'; // Default to open if no hours set
    }
    
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime12 = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
    
    console.log('⏰ MapScreen: Checking truck status for', currentDay, 'at', currentTime12);
    console.log('⏰ MapScreen: Business hours data:', businessHours);
    
    const dayHours = businessHours[currentDay];
    if (!dayHours || dayHours.closed) {
      console.log('⏰ MapScreen: Truck is marked as CLOSED today');
      return 'closed';
    }
    
    console.log('⏰ MapScreen: Today\'s hours:', dayHours.open, '-', dayHours.close);
    console.log('⏰ MapScreen: Current time:', currentTime12);
    
    // Helper function to convert AM/PM time to minutes since midnight for easy comparison
    const timeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      
      console.log('⏰ Converting to minutes:', timeStr);
      
      const timeStr_clean = timeStr.trim();
      
      // Check if it's already 24-hour format (no AM/PM)
      if (!timeStr_clean.includes('AM') && !timeStr_clean.includes('PM')) {
        // 24-hour format like "09:00" or "17:00"
        const timeParts = timeStr_clean.split(':');
        if (timeParts.length !== 2) {
          console.log('❌ Invalid 24-hour format - expected "HH:MM", got:', timeStr);
          return 0;
        }
        
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          console.log('❌ Invalid 24-hour time values - hours:', hours, 'minutes:', minutes);
          return 0;
        }
        
        const totalMinutes = hours * 60 + minutes;
        console.log('⏰ Converted 24-hour', timeStr, 'to', totalMinutes, 'minutes since midnight');
        return totalMinutes;
      }
      
      // 12-hour format with AM/PM - handle various whitespace characters
      const parts = timeStr_clean.split(/\s+/); // Split on any whitespace (space, non-breaking space, etc.)
      console.log('⏰ Split parts:', parts, 'Length:', parts.length);
      console.log('⏰ Original string bytes:', Array.from(timeStr_clean).map(char => char.charCodeAt(0)));
      
      if (parts.length !== 2) {
        console.log('❌ Invalid time format - expected "H:MM AM/PM", got:', timeStr);
        console.log('❌ Split result:', parts);
        console.log('❌ Trying alternative parsing...');
        
        // Try alternative parsing for edge cases
        const ampmMatch = timeStr_clean.match(/(AM|PM)/i);
        if (ampmMatch) {
          const ampm = ampmMatch[0].toUpperCase();
          const timeOnly = timeStr_clean.replace(/(AM|PM)/i, '').trim();
          console.log('⏰ Alternative parsing - time:', timeOnly, 'period:', ampm);
          
          const timeParts = timeOnly.split(':');
          if (timeParts.length === 2) {
            let hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            
            if (!isNaN(hours) && !isNaN(minutes) && hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
              // Convert to 24-hour format
              if (ampm === 'PM' && hours !== 12) {
                hours = hours + 12;
              } else if (ampm === 'AM' && hours === 12) {
                hours = 0;
              }
              
              const totalMinutes = hours * 60 + minutes;
              console.log('✅ Alternative parsing successful:', timeStr, '→', totalMinutes, 'minutes');
              return totalMinutes;
            }
          }
        }
        
        return 0;
      }
      
      const [time, period] = parts;
      console.log('⏰ Time part:', '"' + time + '"', 'Period part:', '"' + period + '"');
      
      const timeParts = time.split(':');
      console.log('⏰ Time split by colon:', timeParts, 'Length:', timeParts.length);
      
      if (timeParts.length !== 2) {
        console.log('❌ Invalid time part - expected "H:MM", got:', time);
        console.log('❌ Time parts:', timeParts);
        return 0;
      }
      
      let hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      console.log('⏰ Raw parsing - hours string:', '"' + timeParts[0] + '"', 'minutes string:', '"' + timeParts[1] + '"');
      console.log('⏰ Parsed integers - hours:', hours, 'minutes:', minutes);
      console.log('⏰ Type check - hours type:', typeof hours, 'minutes type:', typeof minutes);
      console.log('⏰ NaN check - isNaN(hours):', isNaN(hours), 'isNaN(minutes):', isNaN(minutes));
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.log('❌ Failed to parse time:', time, '-> hours:', hours, 'minutes:', minutes);
        return 0;
      }
      
      // Validate ranges for 12-hour format
      console.log('⏰ Range validation - hours >= 1:', hours >= 1, 'hours <= 12:', hours <= 12, 'minutes >= 0:', minutes >= 0, 'minutes <= 59:', minutes <= 59);
      if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
        console.log('❌ Invalid 12-hour time values - hours:', hours, 'minutes:', minutes);
        console.log('❌ Range check failed: hours range (1-12):', (hours >= 1 && hours <= 12), 'minutes range (0-59):', (minutes >= 0 && minutes <= 59));
        return 0;
      }
      
      // Convert to 24-hour format for calculation
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours = hours + 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      const totalMinutes = hours * 60 + minutes;
      console.log('⏰ Converted 12-hour', timeStr, 'to', totalMinutes, 'minutes since midnight');
      return totalMinutes;
    };
    
    // Convert all times to minutes since midnight for comparison
    const currentMinutes = timeToMinutes(currentTime12);
    const openMinutes = timeToMinutes(dayHours.open);
    const closeMinutes = timeToMinutes(dayHours.close);
    
    console.log('⏰ MapScreen: Time comparison (minutes since midnight):');
    console.log('⏰   Open:', openMinutes, '(' + dayHours.open + ')');
    console.log('⏰   Current:', currentMinutes, '(' + currentTime12 + ')');
    console.log('⏰   Close:', closeMinutes, '(' + dayHours.close + ')');
    
    // Check if current time is within business hours
    let isOpen = false;
    
    if (closeMinutes > openMinutes) {
      // Normal case: open and close on same day (e.g., 9:00 AM to 6:00 PM)
      // Current time must be >= open time AND < close time (not <=, because at close time you're closed)
      isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
      console.log('⏰ MapScreen: Normal day hours - checking if', currentMinutes, 'is between', openMinutes, 'and', closeMinutes);
      console.log('⏰ MapScreen:   Is current >= open?', currentMinutes >= openMinutes);
      console.log('⏰ MapScreen:   Is current < close?', currentMinutes < closeMinutes);
      console.log('⏰ MapScreen:   Final result: OPEN =', isOpen);
    } else {
      // Overnight case: close time is next day (e.g., 10:00 PM to 2:00 AM)
      isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
      console.log('⏰ MapScreen: Overnight hours - checking if', currentMinutes, 'is after', openMinutes, 'OR before', closeMinutes);
      console.log('⏰ MapScreen:   Is current >= open?', currentMinutes >= openMinutes);
      console.log('⏰ MapScreen:   Is current < close?', currentMinutes < closeMinutes);
      console.log('⏰ MapScreen:   Final result: OPEN =', isOpen);
    }
    
    if (isOpen) {
      console.log('✅ MapScreen: Truck is OPEN');
      return 'open';
    } else {
      console.log('❌ MapScreen: Truck is CLOSED (outside business hours)');
      return 'closed';
    }
  };
  const [claimMessage, setClaimMessage] = useState("");
  const [userClaims, setUserClaims] = useState([]);
  const [claimCode, setClaimCode] = useState("");
  const [claimedDrop, setClaimedDrop] = useState(null);
  const [showClaimCodesModal, setShowClaimCodesModal] = useState(false); // Force closed
  const [claimCodes, setClaimCodes] = useState([]);
  const [loadingClaimCodes, setLoadingClaimCodes] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger for business hours updates
  
  const { userRole, userData, userPlan, user } = useAuth();
  const navigation = useNavigation();
  const webViewRef = useRef(null);
  const modalScrollViewRef = useRef(null);
  const menuSectionRef = useRef(null);

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

  // Function to get the display name for a cuisine type
  const getCuisineDisplayName = (cuisineType) => {
    if (!cuisineType) return 'General Food';
    
    // Convert to lowercase for comparison
    const normalizedType = cuisineType.toLowerCase().trim();
    
    // Find matching cuisine type
    const cuisine = cuisineTypes.find(c => c.id === normalizedType);
    if (cuisine) {
      return cuisine.name;
    }
    
    // If no exact match, try to find a partial match or format the string nicely
    if (normalizedType === 'food' || normalizedType === 'general' || normalizedType === 'general food') {
      return 'General Food';
    }
    
    // Capitalize the first letter and return as-is
    return cuisineType.charAt(0).toUpperCase() + cuisineType.slice(1);
  };

  // Function to intelligently assign a cuisine type based on truck name
  const inferCuisineType = (truckName) => {
    if (!truckName) return 'american'; // Default fallback
    
    const name = truckName.toLowerCase();
    
    // Common patterns to identify cuisine types
    if (name.includes('bbq') || name.includes('barbeque') || name.includes('smoke')) return 'bbq';
    if (name.includes('taco') || name.includes('burrito') || name.includes('mexican')) return 'mexican';
    if (name.includes('pizza') || name.includes('pizz')) return 'pizza';
    if (name.includes('burger') || name.includes('patty')) return 'burgers';
    if (name.includes('wing') || name.includes('chicken')) return 'wings';
    if (name.includes('seafood') || name.includes('fish') || name.includes('shrimp')) return 'seafood';
    if (name.includes('chinese') || name.includes('wok')) return 'chinese';
    if (name.includes('italian') || name.includes('pasta')) return 'italian';
    if (name.includes('thai')) return 'thai';
    if (name.includes('indian')) return 'indian';
    if (name.includes('japanese') || name.includes('sushi')) return 'japanese';
    if (name.includes('korean')) return 'korean';
    if (name.includes('greek')) return 'greek';
    if (name.includes('coffee') || name.includes('espresso')) return 'coffee';
    if (name.includes('dessert') || name.includes('ice cream') || name.includes('donut')) return 'desserts';
    if (name.includes('healthy') || name.includes('salad') || name.includes('vegan')) return 'healthy';
    if (name.includes('southern') || name.includes('soul')) return 'southern';
    
    // Default to American if no specific pattern is found
    return 'american';
  };

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
      
      // Load new item IDs for this user (in case they're viewing their own truck)
      getNewItemIds(user.uid).then(setNewItemIds);
    } else if (!user) {
      setSessionId(null);
    }
  }, [user, sessionId]);

  // Refresh truck data when returning to MapScreen (e.g., after updating business hours)
  // DISABLED: This was causing map regeneration when truck filters were toggled
  /*
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 MapScreen: Screen focused - triggering truck data refresh for business hours updates');
      // Only trigger truck data refresh, not full map regeneration
      // This will be handled by the truck data listeners, not by regenerating the entire map
      console.log('🔄 Note: Truck business hours will be updated through real-time listeners, no map regeneration needed');
    }, [])
  );
  */

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

  // Load truck visibility state on component mount
  useEffect(() => {
    if (user && userRole === 'owner') {
      loadTruckVisibilityState();
    }
  }, [user, userRole]);

  // Activity tracking - update activity every 5 minutes and on app interactions
  useEffect(() => {
    if (!user || userRole !== 'owner') return;

    const activityInterval = setInterval(() => {
      updateLastActivity();
    }, 5 * 60 * 1000); // Update every 5 minutes

    // Update activity immediately
    updateLastActivity();

    return () => {
      clearInterval(activityInterval);
    };
  }, [user, userRole]);

  // Check for truck expiry every hour
  useEffect(() => {
    if (!user || userRole !== 'owner') return;

    const expiryInterval = setInterval(() => {
      checkTruckExpiry();
    }, 60 * 60 * 1000); // Check every hour

    return () => {
      clearInterval(expiryInterval);
    };
  }, [user, userRole]);

  // Automatically load menu items when truck modal opens
  useEffect(() => {
    console.log('🍽️ MODAL DEBUG: useEffect triggered with:', {
      showMenuModal,
      selectedTruckOwnerId: selectedTruck?.ownerId,
      selectedTruckName: selectedTruck?.name
    });
    
    if (showMenuModal && selectedTruck?.ownerId) {
      console.log('🍽️ Auto-loading menu items for opened truck modal:', selectedTruck.name);
      console.log('🔍 Selected truck ownerId:', selectedTruck.ownerId);
      console.log('🔍 Current user UID:', user?.uid);
      console.log('🔍 Are they the same?', selectedTruck.ownerId === user?.uid);
      loadMenuItems(selectedTruck.ownerId);
      
      // Drops will be loaded by the real-time listener useEffect
    } else {
      console.log('🍽️ MODAL DEBUG: Not loading menu items because:', {
        showMenuModal: !!showMenuModal,
        hasOwnerId: !!selectedTruck?.ownerId
      });
    }
  }, [showMenuModal, selectedTruck?.ownerId]);

  // Real-time listener for drops when modal is open
  useEffect(() => {
    if (!showMenuModal || !selectedTruck?.ownerId) {
      return;
    }

    // Only set up real-time listener for customers, event organizers, or owners viewing other trucks
    if (userRole === 'customer' || userRole === 'event-organizer' || (userRole === 'owner' && selectedTruck.ownerId !== user?.uid)) {
      console.log('🎁 Setting up real-time drops listener for truck:', selectedTruck.name);
      
      const dropsQuery = query(
        collection(db, "drops"),
        where("truckId", "==", selectedTruck.ownerId)
      );
      
      const unsubscribeDrops = onSnapshot(dropsQuery, (snapshot) => {
        const now = new Date();
        
        console.log(`🎁 Raw drops from Firebase: ${snapshot.docs.length} documents`);
        
        const allDrops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Log each drop with details
        allDrops.forEach((drop, index) => {
          const expiresAt = drop.expiresAt?.toDate() || new Date(0);
          const claimedCount = drop.claimedBy?.length || 0;
          const remaining = (drop.quantity || 0) - claimedCount;
          const isExpired = expiresAt <= now;
          const hasRemaining = remaining > 0;
          
          console.log(`🎁 Drop ${index + 1}:`, {
            id: drop.id,
            title: drop.title,
            quantity: drop.quantity,
            claimedBy: drop.claimedBy,
            claimedCount,
            remaining,
            expiresAt: expiresAt.toISOString(),
            isExpired,
            hasRemaining,
            willBeShown: !isExpired && hasRemaining
          });
        });
        
        const activeDrops = allDrops.filter(drop => {
          const expiresAt = drop.expiresAt?.toDate() || new Date(0);
          const remaining = (drop.quantity || 0) - (drop.claimedBy?.length || 0);
          return expiresAt > now && remaining > 0;
        });
        
        console.log(`🎁 Real-time update: ${activeDrops.length} active drops for truck:`, selectedTruck.ownerId);
        setTruckDrops(activeDrops);
        setLoadingDrops(false);
      }, (error) => {
        console.error("❌ Error in drops real-time listener:", error);
        setLoadingDrops(false);
      });

      return () => {
        console.log('🎁 Cleaning up real-time drops listener');
        unsubscribeDrops();
      };
    }
  }, [showMenuModal, selectedTruck?.ownerId, userRole, user?.uid]);

  // Function to load and calculate image aspect ratio
  const loadImageAspectRatio = (imageUrl) => {
    if (!imageUrl) {
      setImageAspectRatio(null);
      return;
    }

    setLoadingImageSize(true);
    Image.getSize(
      imageUrl,
      (width, height) => {
        const aspectRatio = width / height;
        console.log(`📐 Image dimensions: ${width}x${height}, aspect ratio: ${aspectRatio}`);
        setImageAspectRatio(aspectRatio);
        setLoadingImageSize(false);
      },
      (error) => {
        console.log('❌ Error loading image size:', error);
        setImageAspectRatio(16/9); // Fallback to 16:9 aspect ratio
        setLoadingImageSize(false);
      }
    );
  };

  // Load image aspect ratio when selected truck changes
  useEffect(() => {
    if (selectedTruck?.coverUrl) {
      loadImageAspectRatio(selectedTruck.coverUrl);
    } else {
      setImageAspectRatio(null);
    }
  }, [selectedTruck?.coverUrl]);

  // Function to load menu items from Firestore directly
  const loadMenuItems = async (truckOwnerId) => {
    if (!truckOwnerId) {
      console.log("❌ No truck owner ID provided to loadMenuItems");
      return;
    }
    
    console.log("🍽️ Loading menu items for truck owner:", truckOwnerId);
    console.log("🔍 Selected truck basic info:", {
      name: selectedTruck?.name || selectedTruck?.truckName,
      ownerId: selectedTruck?.ownerId,
      cuisine: selectedTruck?.cuisine || selectedTruck?.cuisineType,
      hasBase64Image: !!selectedTruck?.base64CoverImage
    });
    setLoadingMenu(true);
    setMenuItems([]);
    
    try {
      // Load NEW item IDs for this truck owner
      console.log("🏷️ Loading NEW item IDs for truck owner:", truckOwnerId);
      const ownerNewItemIds = await getNewItemIds(truckOwnerId);
      setNewItemIds(ownerNewItemIds);
      console.log("🏷️ Loaded NEW item IDs:", [...ownerNewItemIds]);
      
      // Query Firestore directly for menu items
      console.log("📊 Querying Firestore for menu items with ownerId:", truckOwnerId);
      
      const menuItemsRef = collection(db, 'menuItems');
      const menuQuery = query(menuItemsRef, where('ownerId', '==', truckOwnerId));
      console.log("📊 Query created, executing...");
      
      const menuSnapshot = await getDocs(menuQuery);
      console.log("📊 Query completed. Snapshot size:", menuSnapshot.size);
      console.log("📊 Snapshot empty?", menuSnapshot.empty);
      
      if (menuSnapshot.empty) {
        console.log("📭 No menu items found in Firestore for this truck owner");
        console.log("🔍 Double-checking: querying for ownerId =", truckOwnerId);
        
        // Debug: Let's see all documents in the menuItems collection
        console.log("🔍 Let's check what's in the menuItems collection:");
        const allMenuItemsRef = collection(db, 'menuItems');
        const allMenuSnapshot = await getDocs(allMenuItemsRef);
        console.log("🔍 Total menuItems in collection:", allMenuSnapshot.size);
        
        allMenuSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log("🔍 Found menuItem:", doc.id, "ownerId:", data.ownerId, "name:", data.name);
          if (data.ownerId === truckOwnerId) {
            console.log("🎯 MATCH FOUND! This item should have been returned by our query");
          }
        });
        
        console.log("🍽️ This business hasn't added any menu items yet");
        setMenuItems([]); // Show empty menu instead of fallback samples
      } else {
        // Process real menu items from Firestore
        const items = [];
        menuSnapshot.forEach(doc => {
          const data = doc.data();
          items.push({
            id: doc.id,
            ...data
          });
        });

        // Sort by createdAt if available, otherwise by name
        items.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
          }
          return (a.name || '').localeCompare(b.name || '');
        });

        console.log("✅ Successfully loaded menu items from Firestore:", items.length, "items");
        if (items.length > 0) {
          console.log("🍽️ First menu item structure:", items[0]);
          console.log("🖼️ First menu item imageUrl:", items[0].imageUrl);
        }
        
        // Log NEW badge status for each item
        items.forEach(item => {
          const shouldShowNew = item.isNewItem || ownerNewItemIds.has(item.id);
          console.log(`🏷️ MapScreen: "${item.name}" - Backend isNewItem: ${item.isNewItem}, Client isNewItem: ${ownerNewItemIds.has(item.id)}, Should show NEW: ${shouldShowNew}`);
        });
        
        setMenuItems(items);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      setMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  };

  // Favorites functionality
  const toggleFavorite = async (truckId, truckName) => {
    if (!user?.uid || !truckId) {
      Alert.alert('Error', 'Please log in to favorite trucks');
      return;
    }

    try {
      const isFavorited = userFavorites.has(truckId);
      
      if (isFavorited) {
        // Remove from favorites
        console.log('❤️ FAVORITES: Removing favorite for truck:', truckName);
        
        const favoritesQuery = query(
          collection(db, 'favorites'),
          where('userId', '==', user.uid),
          where('truckId', '==', truckId)
        );
        
        const snapshot = await getDocs(favoritesQuery);
        if (!snapshot.empty) {
          await deleteDoc(doc(db, 'favorites', snapshot.docs[0].id));
          console.log('❤️ FAVORITES: Successfully removed favorite');
        }
      } else {
        // Add to favorites
        console.log('❤️ FAVORITES: Adding favorite for truck:', truckName);
        
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          truckId: truckId,
          truckName: truckName,
          createdAt: serverTimestamp(),
        });
        
        console.log('❤️ FAVORITES: Successfully added favorite');
      }
    } catch (error) {
      console.error('❤️ FAVORITES: Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    }
  };

  // Drops functionality
  const handleDropFormChange = (field, value) => {
    setDropFormData(prev => ({
      ...prev,
      [field]: field === "quantity" || field === "expiresInMinutes" 
        ? parseInt(value) || 0 
        : value,
    }));
  };

  const createDrop = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a drop.");
      return;
    }

    if (!dropFormData.title.trim() || !dropFormData.description.trim()) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (!location) {
      Alert.alert("Error", "Location not available. Please try again.");
      return;
    }

    setCreatingDrop(true);
    
    try {
      // Check if user has permission (similar to web app)
      console.log("🔄 Checking user permissions for drop creation...");
      
      if (userRole !== 'owner') {
        Alert.alert("Error", "Only business owners can create drops.");
        setCreatingDrop(false);
        return;
      }

      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + dropFormData.expiresInMinutes * 60 * 1000)
      );

      const drop = {
        title: dropFormData.title,
        description: dropFormData.description,
        truckId: user.uid,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        quantity: dropFormData.quantity,
        expiresAt,
        claimedBy: [],
        createdAt: serverTimestamp(),
      };

      console.log("🚀 Creating drop:", drop);
      
      await addDoc(collection(db, "drops"), drop);
      
      console.log("✅ Drop created successfully!");
      
      // Reset form
      setDropFormData({
        title: "",
        description: "",
        quantity: 10,
        expiresInMinutes: 60,
      });
      
      setShowDropForm(false);
      setDropCreationMessage("Drop created successfully! 🎉");
      
      setTimeout(() => setDropCreationMessage(""), 3000);
      
    } catch (error) {
      console.error("❌ Error creating drop:", error);
      Alert.alert("Error", `Failed to create drop: ${error.message}`);
      setDropCreationMessage(`Failed to create drop: ${error.message}`);
      setTimeout(() => setDropCreationMessage(""), 5000);
    } finally {
      setCreatingDrop(false);
    }
  };

  // Customer drop claiming functionality
  const loadTruckDrops = async (truckId) => {
    if (!truckId) return;
    
    setLoadingDrops(true);
    try {
      console.log("🎁 Loading drops for truck:", truckId);
      const dropsQuery = query(
        collection(db, "drops"),
        where("truckId", "==", truckId)
      );
      
      const dropsSnapshot = await getDocs(dropsQuery);
      const now = new Date();
      
      const activeDrops = dropsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(drop => {
          const expiresAt = drop.expiresAt?.toDate() || new Date(0);
          const remaining = (drop.quantity || 0) - (drop.claimedBy?.length || 0);
          return expiresAt > now && remaining > 0;
        });
      
      console.log(`🎁 Found ${activeDrops.length} active drops for truck:`, truckId);
      setTruckDrops(activeDrops);
    } catch (error) {
      console.error("❌ Error loading truck drops:", error);
      setTruckDrops([]);
    } finally {
      setLoadingDrops(false);
    }
  };

  // Real-time listener for truck drops
  useEffect(() => {
    if (!selectedTruck?.ownerId || !showMenuModal) return;

    console.log("🎁 Setting up real-time listener for drops:", selectedTruck.ownerId);
    
    const dropsQuery = query(
      collection(db, "drops"),
      where("truckId", "==", selectedTruck.ownerId)
    );
    
    const unsubscribe = onSnapshot(dropsQuery, (snapshot) => {
      const now = new Date();
      
      console.log("🎁 Real-time listener triggered, raw snapshot data:");
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`🎁 Drop ${index + 1} (${doc.id}):`, {
          title: data.title,
          quantity: data.quantity,
          claimedBy: data.claimedBy,
          claimedByLength: data.claimedBy?.length || 0,
          remaining: (data.quantity || 0) - (data.claimedBy?.length || 0),
          expiresAt: data.expiresAt?.toDate(),
          isExpired: (data.expiresAt?.toDate() || new Date(0)) <= now
        });
      });
      
      const activeDrops = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(drop => {
          const expiresAt = drop.expiresAt?.toDate() || new Date(0);
          const remaining = (drop.quantity || 0) - (drop.claimedBy?.length || 0);
          const isActive = expiresAt > now && remaining > 0;
          console.log(`🎁 Drop "${drop.title}" filter check:`, {
            expiresAt: expiresAt,
            remaining: remaining,
            isActive: isActive
          });
          return isActive;
        });
      
      console.log(`🎁 Real-time update: ${activeDrops.length} active drops for truck:`, selectedTruck.ownerId);
      console.log("🎁 Active drops data:", activeDrops);
      setTruckDrops(activeDrops);
    });

    return () => {
      console.log("🎁 Cleaning up drops listener");
      unsubscribe();
    };
  }, [selectedTruck?.ownerId, showMenuModal]);

  const hasUserClaimedDrop = (dropId) => {
    if (!user || !dropId) return false;
    
    const activeClaim = userClaims.find(claim => {
      const expiresAt = new Date(claim.expiresAt);
      return claim.dropId === dropId && expiresAt > new Date() && claim.status === 'active';
    });
    
    return !!activeClaim;
  };

  const handleClaimDrop = async (dropId) => {
    if (!user) {
      setClaimMessage("You must be logged in to claim a drop.");
      setTimeout(() => setClaimMessage(""), 3000);
      return;
    }

    try {
      // Get the drop data first
      const dropRef = doc(db, "drops", dropId);
      const dropSnap = await getDoc(dropRef);
      
      if (!dropSnap.exists()) {
        setClaimMessage("Drop not found.");
        setTimeout(() => setClaimMessage(""), 3000);
        return;
      }

      const dropData = dropSnap.data();
      const alreadyClaimed = dropData.claimedBy?.includes(user.uid);
      const remaining = (dropData.quantity || 0) - (dropData.claimedBy?.length || 0);

      if (alreadyClaimed) {
        setClaimMessage("You have already claimed this drop.");
        setTimeout(() => setClaimMessage(""), 3000);
        return;
      }

      if (remaining <= 0) {
        setClaimMessage("This drop has already been fully claimed.");
        setTimeout(() => setClaimMessage(""), 3000);
        return;
      }

      // Check localStorage for user claims restrictions
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const userClaimsKey = `userClaims_${user.uid}`;
      const storedClaimsJson = await AsyncStorage.getItem(userClaimsKey);
      const storedClaims = storedClaimsJson ? JSON.parse(storedClaimsJson) : [];
      
      // Filter out expired claims
      const activeClaims = storedClaims.filter(claim => {
        const expiresAt = new Date(claim.expiresAt);
        return expiresAt > now;
      });
      
      // Check if user already has an active claim
      if (activeClaims.length > 0) {
        setClaimMessage(`You already have an active claim for "${activeClaims[0].dropTitle}". You can only claim one drop at a time.`);
        setTimeout(() => setClaimMessage(""), 5000);
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
        setTimeout(() => setClaimMessage(""), 5000);
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
      
      // Update AsyncStorage
      const updatedClaims = [...storedClaims.filter(c => c.dropId !== dropId), claimData];
      await AsyncStorage.setItem(userClaimsKey, JSON.stringify(updatedClaims));
      
      // Update Firebase drop document to increment claimed count
      const updateDropRef = doc(db, "drops", dropId);
      const previousClaimedBy = dropData.claimedBy || [];
      const newClaimedBy = [...previousClaimedBy, user.uid];
      
      console.log("🔄 Updating Firebase drop claim:", {
        dropId,
        userUid: user.uid,
        previousClaimedBy,
        newClaimedBy,
        previousCount: previousClaimedBy.length,
        newCount: newClaimedBy.length
      });
      
      try {
        console.log("🔄 About to call updateDoc with:", {
          dropId,
          updateData: { claimedBy: newClaimedBy },
          newClaimedByLength: newClaimedBy.length,
          userUid: user.uid,
          isUserInNewArray: newClaimedBy.includes(user.uid)
        });
        
        console.log("🔒 Firebase Security Rule Check:", {
          onlyModifyingClaimedBy: true, // We're only updating claimedBy
          arrayContainsPrevious: newClaimedBy.filter(uid => previousClaimedBy.includes(uid)).length === previousClaimedBy.length,
          exactlyOneNewItem: newClaimedBy.length === previousClaimedBy.length + 1,
          userAddingThemselves: newClaimedBy.includes(user.uid),
          userNotAlreadyClaimed: !previousClaimedBy.includes(user.uid),
          userNotTruckOwner: user.uid !== dropData.truckId
        });
        
        await updateDoc(updateDropRef, {
          claimedBy: newClaimedBy
        });
        
        console.log("✅ updateDoc call completed successfully");
        
        // Verify the update by reading the document back
        const verifySnap = await getDoc(updateDropRef);
        if (verifySnap.exists()) {
          const verifyData = verifySnap.data();
          console.log("🔍 Verification read after update:", {
            dropId,
            claimedBy: verifyData.claimedBy,
            claimedByLength: verifyData.claimedBy?.length || 0,
            expected: newClaimedBy.length,
            updateSuccessful: verifyData.claimedBy?.includes(user.uid) || false
          });
        } else {
          console.log("❌ Verification failed: document does not exist after update");
        }
        
      } catch (updateError) {
        console.error("❌ Firebase updateDoc failed:", updateError);
        console.error("❌ Error details:", {
          code: updateError.code,
          message: updateError.message,
          dropId,
          userUid: user.uid,
          truckId: dropData.truckId,
          updateData: { claimedBy: newClaimedBy }
        });
        
        // If it's a permission error, provide specific feedback
        if (updateError.code === 'permission-denied') {
          setClaimMessage("Permission denied: Unable to claim this drop. Please check if you've already claimed it.");
          setTimeout(() => setClaimMessage(""), 5000);
          return;
        }
        
        throw updateError;
      }
      
      console.log("✅ Drop claim updated in Firebase for user:", user.uid);
      
      // Update local state
      setUserClaims(updatedClaims);

      const code = `GRB-${user.uid.slice(-4).toUpperCase()}${dropId.slice(-2)}`;
      setClaimCode(code);
      setClaimedDrop({ ...dropData, id: dropId });
      
      setClaimMessage("Drop claimed successfully! Show your code to the truck owner.");
      setTimeout(() => setClaimMessage(""), 5000);
      
      // Real-time listener will automatically update the drops UI
      
    } catch (error) {
      console.error("❌ Error claiming drop:", error);
      setClaimMessage("Failed to claim drop. Please try again.");
      setTimeout(() => setClaimMessage(""), 3000);
    }
  };

  // Load user claims from AsyncStorage on app start
  useEffect(() => {
    const loadUserClaims = async () => {
      if (!user) {
        setUserClaims([]);
        setClaimCode("");
        setClaimedDrop(null);
        return;
      }
      
      try {
        const userClaimsKey = `userClaims_${user.uid}`;
        const storedClaimsJson = await AsyncStorage.getItem(userClaimsKey);
        const storedClaims = storedClaimsJson ? JSON.parse(storedClaimsJson) : [];
        
        // Filter out expired claims
        const now = new Date();
        const activeClaims = storedClaims.filter(claim => {
          const expiresAt = new Date(claim.expiresAt);
          return expiresAt > now;
        });
        
        // Update AsyncStorage with only active claims
        await AsyncStorage.setItem(userClaimsKey, JSON.stringify(activeClaims));
        setUserClaims(activeClaims);
        
        // Check if user has an active claim and restore the claim code/drop data
        if (activeClaims.length > 0) {
          const activeClaim = activeClaims[0];
          const code = `GRB-${user.uid.slice(-4).toUpperCase()}${activeClaim.dropId.slice(-2)}`;
          setClaimCode(code);
          
          // Fetch the full drop data for display
          try {
            const dropRef = doc(db, "drops", activeClaim.dropId);
            const dropSnap = await getDoc(dropRef);
            if (dropSnap.exists()) {
              setClaimedDrop({ ...dropSnap.data(), id: activeClaim.dropId });
            }
          } catch (error) {
            console.error("Error fetching claimed drop:", error);
          }
        }
      } catch (error) {
        console.error("Error loading user claims:", error);
      }
    };
    
    loadUserClaims();
  }, [user]);

  // Monitor for expired claims and clear them automatically
  useEffect(() => {
    if (!user || !claimedDrop) return;

    const checkExpiration = () => {
      const now = new Date();
      
      // Safely parse the expiration date
      let dropExpiresAt;
      try {
        if (claimedDrop.expiresAt) {
          // Handle Firestore Timestamp objects
          if (claimedDrop.expiresAt.toDate && typeof claimedDrop.expiresAt.toDate === 'function') {
            dropExpiresAt = claimedDrop.expiresAt.toDate();
          } else if (typeof claimedDrop.expiresAt === 'string') {
            dropExpiresAt = new Date(claimedDrop.expiresAt);
          } else {
            dropExpiresAt = new Date(claimedDrop.expiresAt);
          }
        } else {
          console.log("⚠️ No expiration date found for claimed drop");
          return;
        }
        
        // Validate the parsed date
        if (isNaN(dropExpiresAt.getTime())) {
          console.log("⚠️ Invalid expiration date:", claimedDrop.expiresAt);
          return;
        }
      } catch (error) {
        console.error("❌ Error parsing expiration date:", error, claimedDrop.expiresAt);
        return;
      }
      
      console.log("⏰ Checking claim expiration:", {
        dropTitle: claimedDrop.title,
        expiresAt: dropExpiresAt.toISOString(),
        now: now.toISOString(),
        isExpired: now > dropExpiresAt,
        timeUntilExpiry: Math.max(0, dropExpiresAt - now) / 1000 / 60 // minutes
      });
      
      if (now > dropExpiresAt) {
        console.log("🕒 Claim has expired, clearing code and drop data");
        
        // Clear the UI state
        setClaimCode("");
        setClaimedDrop(null);
        
        // Clean up AsyncStorage
        const cleanupStorage = async () => {
          try {
            const userClaimsKey = `userClaims_${user.uid}`;
            const storedClaimsJson = await AsyncStorage.getItem(userClaimsKey);
            const storedClaims = storedClaimsJson ? JSON.parse(storedClaimsJson) : [];
            
            // Remove expired claims
            const activeClaims = storedClaims.filter(claim => {
              const expiresAt = new Date(claim.expiresAt);
              return expiresAt > now;
            });
            
            await AsyncStorage.setItem(userClaimsKey, JSON.stringify(activeClaims));
            setUserClaims(activeClaims);
            
            console.log("🧹 Cleaned up expired claims from storage");
          } catch (error) {
            console.error("Error cleaning up expired claims:", error);
          }
        };
        
        cleanupStorage();
      }
    };

    // Check immediately
    checkExpiration();
    
    // Set up interval to check every 30 seconds
    const intervalId = setInterval(checkExpiration, 30000);
    
    // Cleanup interval on unmount or when claimedDrop changes
    return () => {
      clearInterval(intervalId);
    };
  }, [user, claimedDrop]);

  // Force close claim codes modal on component mount (emergency fix)
  useEffect(() => {
    console.log("🚨 Emergency: Force closing claim codes modal on mount");
    setShowClaimCodesModal(false);
  }, []);

  // Debug: Monitor showClaimCodesModal state changes
  useEffect(() => {
    console.log("🔗 showClaimCodesModal state changed to:", showClaimCodesModal);
    if (showClaimCodesModal) {
      console.log("🚨 CLAIM CODES MODAL IS OPEN - This may be blocking interactions!");
      
      // Auto-close modal after 30 seconds as a safety measure
      const autoCloseTimer = setTimeout(() => {
        console.log("⏰ Auto-closing claim codes modal after 30 seconds");
        setShowClaimCodesModal(false);
      }, 30000);
      
      return () => {
        clearTimeout(autoCloseTimer);
      };
    }
  }, [showClaimCodesModal]);

  // Cart functionality
  const addToCart = (item) => {
    console.log('🛒 Adding item to cart:', item.name);
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        // If item exists, increase quantity
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        // If item doesn't exist, add with quantity 1
        return [...prevCart, { ...item, quantity: 1, truckInfo: selectedTruck }];
      }
    });
    Alert.alert('Added to Cart', `${item.name} has been added to your cart!`);
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  const getSalesTax = () => {
    const subtotal = parseFloat(getTotalPrice());
    const taxRate = 0.0875; // 8.75% sales tax (can be made configurable per location)
    return (subtotal * taxRate).toFixed(2);
  };

  const getFinalTotal = () => {
    const subtotal = parseFloat(getTotalPrice());
    const tax = parseFloat(getSalesTax());
    return (subtotal + tax).toFixed(2);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // Truck visibility persistence functions
  const updateTruckVisibility = async (isVisible) => {
    if (!user || userRole !== 'owner') return;
    
    try {
      console.log('🔒 PRIVACY: ===== TRUCK VISIBILITY UPDATE =====');
      console.log('🔒 PRIVACY: User ID:', user.uid);
      console.log('🔒 PRIVACY: Setting visible to:', isVisible);
      console.log('🔒 PRIVACY: This should HIDE truck if false, SHOW truck if true');
      
      // Update both collections to keep them in sync
      const truckDocRef = doc(db, 'trucks', user.uid);
      const truckLocationRef = doc(db, 'truckLocations', user.uid);
      
      const updateData = {
        visible: isVisible,
        lastActivityTime: Date.now(),
        lastToggleTime: Date.now(),
        updatedAt: serverTimestamp()
      };
      
      console.log('🔒 PRIVACY: Update data being sent to database:', updateData);
      
      // Update trucks collection
      await updateDoc(truckDocRef, updateData);
      console.log('🔒 PRIVACY: ✅ Updated trucks collection with visible:', isVisible);
      
      // Update truckLocations collection (create if doesn't exist)
      await setDoc(truckLocationRef, updateData, { merge: true });
      console.log('🔒 PRIVACY: ✅ Updated truckLocations collection with visible:', isVisible);
      
      console.log('🔒 PRIVACY: ===== UPDATE COMPLETE =====');
      
      // Force reload truck data to reflect changes immediately
      console.log('🔄 PRIVACY: Forcing truck data reload...');
      
      // 🚀 PERFORMANCE: Invalidate privacy cache to reflect immediate changes
      console.log('🚀 PERFORMANCE: Invalidating privacy cache for immediate visibility update');
      setPrivacyCache(new Map());
      setPrivacyCacheTimestamp(0);
      
    } catch (error) {
      console.error('❌ PRIVACY ERROR: Failed to update truck visibility:', error);
    }
  };

  const updateLastActivity = async () => {
    if (!user || userRole !== 'owner') return;
    
    try {
      const currentTime = Date.now();
      setLastActivityTime(currentTime);
      
      const truckDocRef = doc(db, 'trucks', user.uid);
      await setDoc(truckDocRef, {
        lastActivityTime: currentTime,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('❌ Error updating last activity:', error);
    }
  };

  const checkTruckExpiry = async () => {
    if (!user || userRole !== 'owner') return;
    
    try {
      const truckDocRef = doc(db, 'trucks', user.uid);
      const truckDoc = await getDoc(truckDocRef);
      
      if (truckDoc.exists()) {
        const data = truckDoc.data();
        const lastActivity = data.lastActivityTime || data.lastActive || Date.now();
        const eightHoursAgo = Date.now() - (8 * 60 * 60 * 1000); // 8 hours in milliseconds
        
        if (lastActivity < eightHoursAgo && data.visible !== false) {
          // Auto-hide truck after 8 hours of inactivity
          await updateDoc(truckDocRef, {
            visible: false,
            autoHidden: true,
            autoHiddenAt: Date.now(),
            reason: '8_hour_inactivity',
            updatedAt: serverTimestamp()
          });
          
          setShowTruckIcon(false);
          console.log('🚚 Truck auto-hidden due to 8 hours of inactivity');
        }
      }
    } catch (error) {
      console.error('❌ Error checking truck expiry:', error);
    }
  };

  const loadTruckVisibilityState = async () => {
    if (!user || userRole !== 'owner') return;
    
    try {
      // Check truckLocations first (primary collection for map display)
      const truckLocationRef = doc(db, 'truckLocations', user.uid);
      const truckLocationDoc = await getDoc(truckLocationRef);
      
      let visibilityData = null;
      
      if (truckLocationDoc.exists()) {
        visibilityData = truckLocationDoc.data();
      } else {
        // Fallback to trucks collection
        const truckDocRef = doc(db, 'trucks', user.uid);
        const truckDoc = await getDoc(truckDocRef);
        if (truckDoc.exists()) {
          visibilityData = truckDoc.data();
        }
      }
      
      if (visibilityData) {
        const isVisible = visibilityData.visible !== false; // Default to true if not set
        setShowTruckIcon(isVisible);
        console.log('🚚 Loaded truck visibility state from Firebase:', isVisible);
        
        // Check if truck should be auto-hidden due to inactivity
        await checkTruckExpiry();
      } else {
        // For users with no existing visibility data, default to visible (all plans)
        console.log('🚚 User with no visibility data - defaulting to visible');
        setShowTruckIcon(true);
        // Also save this default to Firebase
        await updateTruckVisibility(true);
      }
    } catch (error) {
      console.error('❌ Error loading truck visibility state:', error);
    }
  };

  // Menu image functionality
  const openFullScreenMenu = () => {
    if (!selectedTruck?.menuUrl) return;
    
    Alert.alert(
      '📋 Full Menu',
      'Opening full-size menu image...',
      [
        {
          text: 'Open in Browser',
          onPress: () => {
            if (selectedTruck.menuUrl) {
              Linking.openURL(selectedTruck.menuUrl);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Scroll to menu section function
  const scrollToMenuSection = () => {
    if (menuSectionRef.current && modalScrollViewRef.current) {
      menuSectionRef.current.measure((x, y, width, height, pageX, pageY) => {
        modalScrollViewRef.current.scrollTo({
          y: pageY - 100, // Offset a bit from the top for better visibility
          animated: true
        });
      });
    }
  };

  // REMOVED: getTruckStatusButtonText function (toggle functionality removed)

  const shareMenu = async () => {
    if (!selectedTruck?.menuUrl || !selectedTruck?.name) return;
    
    try {
      // For now, we'll share the URL. In a full implementation, you might want to
      // use react-native-share to share the actual image
      const shareText = `Check out the menu for ${selectedTruck.name}! 🍽️\n\n${selectedTruck.menuUrl}`;
      
      // Simple sharing approach - you can enhance this with react-native-share
      Alert.alert(
        '📤 Share Menu',
        shareText,
        [
          {
            text: 'Copy Link',
            onPress: () => {
              // In a full implementation, you'd copy to clipboard
              Alert.alert('Link copied!', 'Menu link has been copied to clipboard');
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error sharing menu:', error);
      Alert.alert('Error', 'Unable to share menu');
    }
  };

  // Fetch claim codes for a specific drop (owner only)
  const fetchClaimCodes = async (dropId) => {
    if (!user || userRole !== 'owner') return;
    
    setLoadingClaimCodes(true);
    try {
      console.log('📋 Fetching claim codes for drop:', dropId);
      
      // Get the drop document to access claimedBy array
      const dropRef = doc(db, 'drops', dropId);
      const dropSnap = await getDoc(dropRef);
      
      if (!dropSnap.exists()) {
        console.log('❌ Drop not found:', dropId);
        setClaimCodes([]);
        return;
      }
      
      const dropData = dropSnap.data();
      const claimedBy = dropData.claimedBy || [];
      
      console.log('📋 Drop claimedBy array:', claimedBy);
      
      // Generate codes for each claimed user
      const codes = claimedBy.map((userId, index) => {
        const code = `GRB-${userId.slice(-4).toUpperCase()}${dropId.slice(-2)}`;
        return {
          id: `${dropId}_${userId}`,
          code: code,
          userId: userId,
          userIdMasked: `${userId.slice(0, 8)}...${userId.slice(-4)}`, // Show first 8 and last 4 chars
          claimedAt: new Date(), // We don't have exact claim time, use current time as placeholder
          dropTitle: dropData.title
        };
      });
      
      setClaimCodes(codes);
      console.log('📋 Generated claim codes:', codes);
    } catch (error) {
      console.error('❌ Error fetching claim codes:', error);
      setClaimCodes([]);
    } finally {
      setLoadingClaimCodes(false);
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before placing an order.');
      return;
    }

    if (!user) {
      Alert.alert('Login Required', 'Please log in to place an order.');
      return;
    }

    if (!selectedTruck?.stripeConnectAccountId) {
      Alert.alert(
        'Payment Not Available', 
        'This business has not set up payment processing yet. Please try again later or contact the business owner directly.'
      );
      return;
    }

    try {
      console.log('🚀 Starting Stripe Connect payment process...');
      console.log('🛒 Cart items:', cart);
      console.log('👤 User plan:', userPlan);
      console.log('🚛 Truck owner:', selectedTruck?.name, 'Stripe ID:', selectedTruck?.stripeConnectAccountId);
      
      // Calculate payment amounts
      const subtotal = parseFloat(getTotalPrice());
      const salesTax = parseFloat(getSalesTax());
      const finalTotal = parseFloat(getFinalTotal());
      
      // Calculate platform fees (hidden from customer but still collected)
      const paymentBreakdown = calculateStripeConnectPayment(cart, userPlan, selectedTruck);
      console.log('💰 Payment breakdown:', paymentBreakdown);
      
      if (!paymentBreakdown.isValid) {
        throw new Error('Invalid payment configuration');
      }

      // Create order in Firebase first to get order ID
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.displayName || user.displayName || 'Customer',
        userPlan: userPlan,
        truckId: selectedTruck?.ownerId || selectedTruck?.id,
        truckName: selectedTruck?.name || selectedTruck?.truckName,
        truckStripeAccountId: selectedTruck?.stripeConnectAccountId,
        items: cart,
        
        // Customer-facing payment details
        subtotal: subtotal,
        salesTax: salesTax,
        totalAmount: finalTotal,
        
        // Platform fee details (for business tracking)
        platformFeePercentage: paymentBreakdown.platformFeePercentage,
        platformFeeAmount: paymentBreakdown.platformFeeAmount,
        vendorReceives: finalTotal - paymentBreakdown.platformFeeAmount, // Vendor gets total minus platform fee
        
        // Status tracking
        status: 'pending_payment',
        paymentStatus: 'pending',
        timestamp: serverTimestamp(),
        orderDate: new Date().toISOString(),
        deliveryMethod: 'pickup'
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      const orderId = docRef.id;
      console.log('📝 Order created with ID:', orderId);

      // Prepare payment intent data with customer's total amount (including tax)
      const customPaymentBreakdown = {
        ...paymentBreakdown,
        orderTotal: finalTotal,
        orderTotalCents: Math.round(finalTotal * 100),
        // Platform fee stays the same percentage but is now calculated on the total with tax
        platformFeeAmount: finalTotal * paymentBreakdown.platformFeePercentage,
        vendorReceives: finalTotal - (finalTotal * paymentBreakdown.platformFeePercentage)
      };
      
      const paymentIntentData = preparePaymentIntentData(customPaymentBreakdown, {
        ...orderData,
        orderId
      });

      // Call your server to create payment intent
      console.log('🌐 Creating payment intent on server...');
      const response = await fetch(`${process.env.EXPO_PUBLIC_SERVER_URL || 'https://grubana-dugv014wb-jws-projects-e7f4947b.vercel.app'}/api/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentIntentData)
      });

      const { client_secret, payment_intent_id } = await response.json();
      
      if (!client_secret) {
        throw new Error('Failed to create payment intent');
      }

      console.log('✅ Payment intent created:', payment_intent_id);

      // Initialize Stripe payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Ping My Appetite',
        paymentIntentClientSecret: client_secret,
        defaultBillingDetails: {
          name: userData?.displayName || user.displayName || 'Customer',
          email: user.email
        },
        allowsDelayedPaymentMethods: false,
        returnURL: 'pingmyappetite://payment-complete'
      });

      if (initError) {
        console.error('Payment sheet init error:', initError);
        throw new Error('Failed to initialize payment: ' + initError.message);
      }

      // Present payment sheet
      console.log('💳 Presenting payment sheet...');
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          console.log('❌ User canceled payment');
          // Update order status to canceled
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'cancelled',
            paymentStatus: 'cancelled',
            cancelledAt: serverTimestamp()
          });
          return;
        } else {
          console.error('Payment error:', paymentError);
          throw new Error('Payment failed: ' + paymentError.message);
        }
      }

      // Payment successful - update order
      console.log('✅ Payment successful!');
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentIntentId: payment_intent_id,
        paidAt: serverTimestamp()
      });

      // Clear cart and close modals
      setCart([]);
      setShowCartModal(false);
      setShowMenuModal(false);
      
      // Show success message with customer-friendly breakdown
      Alert.alert(
        'Order Placed Successfully! 🎉',
        `Order ID: ${orderId.substring(0, 8)}...\n\n` +
        `Subtotal: $${subtotal.toFixed(2)}\n` +
        `Sales Tax: $${salesTax.toFixed(2)}\n` +
        `Total Paid: $${finalTotal.toFixed(2)}\n\n` +
        `The business owner will receive your order and contact you shortly for pickup!`,
        [{ text: 'Great!' }]
      );

    } catch (error) {
      console.error('❌ Order placement error:', error);
      Alert.alert(
        'Payment Error', 
        error.message || 'Failed to process payment. Please try again.'
      );
    }
  };

  // Handle catering form submission
  const handleCateringSubmit = async () => {
    // Validate required fields
    const { customerName, customerEmail, customerPhone, eventDate, eventTime, eventLocation, guestCount } = cateringFormData;
    
    if (!customerName || !customerEmail || !customerPhone) {
      Alert.alert('Required Fields', 'Please fill in your name, email, and phone number.');
      return;
    }

    if (!eventDate || !eventTime || !eventLocation || !guestCount) {
      Alert.alert('Event Details Required', 'Please provide event date, time, location, and estimated guest count.');
      return;
    }

    setSubmittingCateringForm(true);

    try {
      console.log('📧 Submitting catering request for truck:', selectedTruck?.name);
      
      // Check if we have the required truck owner ID
      if (!selectedTruck?.ownerId) {
        Alert.alert('Error', 'Unable to find truck owner information. Please try again later.');
        setSubmittingCateringForm(false);
        return;
      }

      // Create catering request object for Firestore
      const cateringRequest = {
        customerName,
        customerEmail,
        customerPhone,
        eventDate,
        eventTime,
        eventLocation,
        guestCount,
        specialRequests: cateringFormData.specialRequests || 'None',
        truckName: selectedTruck?.name,
        truckOwnerId: selectedTruck?.ownerId,
        requestedAt: new Date().toISOString(),
        userId: user.uid,
        userEmail: user.email,
        status: 'pending'
      };

      // Save to Firestore for record keeping
      await addDoc(collection(db, 'cateringRequests'), cateringRequest);

      // Send email to truck owner using Firebase Function with SendGrid
      console.log('📧 Calling Firebase Function to send catering email');
      
      const functions = getFunctions();
      const sendCateringRequest = httpsCallable(functions, 'sendCateringRequest');
      
      const functionData = {
        customerName,
        customerEmail,
        customerPhone,
        eventDate,
        eventTime,
        eventLocation,
        guestCount,
        specialRequests: cateringFormData.specialRequests || 'None',
        truckName: selectedTruck?.name,
        ownerId: selectedTruck?.ownerId // Pass owner ID - function will fetch email server-side
      };

      console.log('📧 Sending catering request data:', functionData);

      const result = await sendCateringRequest(functionData);
      
      console.log('📧 Firebase Function result:', result.data);

      if (result.data.success) {
        Alert.alert(
          'Catering Request Sent! 🎉',
          `Your catering request has been sent to ${selectedTruck?.name}. They will contact you directly at ${customerEmail} to discuss pricing, menu options, and availability.`,
          [{ text: 'Great!' }]
        );
        
        // Reset form and close modal
        setCateringFormData({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          eventDate: '',
          eventTime: '',
          eventLocation: '',
          guestCount: '',
          specialRequests: '',
        });
        setShowCateringModal(false);
      } else {
        throw new Error(result.data.message || 'Failed to send catering request');
      }

    } catch (error) {
      console.error('❌ Catering request error:', error);
      Alert.alert(
        'Error',
        'Failed to send catering request. Please try contacting the business directly or try again later.'
      );
    } finally {
      setSubmittingCateringForm(false);
    }
  };

  // Handle festival booking form submission
  const handleFestivalSubmit = async () => {
    // Validate required fields
    const { organizerName, organizerEmail, organizerPhone, eventName, eventDate, eventTime, eventLocation, expectedAttendance } = festivalFormData;
    
    if (!organizerName || !organizerEmail || !organizerPhone) {
      Alert.alert('Required Fields', 'Please fill in your name, email, and phone number.');
      return;
    }

    if (!eventName || !eventDate || !eventTime || !eventLocation || !expectedAttendance) {
      Alert.alert('Event Details Required', 'Please provide event name, date, time, location, and expected attendance.');
      return;
    }

    setSubmittingFestivalForm(true);

    try {
      console.log('🎪 Submitting festival booking request for truck:', selectedTruck?.name);
      
      // Check if we have the required truck owner ID
      if (!selectedTruck?.ownerId) {
        Alert.alert('Error', 'Unable to find truck owner information. Please try again later.');
        setSubmittingFestivalForm(false);
        return;
      }

      // Send email to truck owner using Firebase Function with SendGrid
      console.log('📧 Calling Firebase Function to send festival booking email');
      
      const functions = getFunctions();
      const sendFestivalRequest = httpsCallable(functions, 'sendFestivalRequest');
      
      const functionData = {
        organizerName,
        organizerEmail,
        organizerPhone,
        eventName,
        eventDate,
        eventTime,
        eventLocation,
        eventAddress: festivalFormData.eventAddress || eventLocation,
        expectedAttendance,
        eventDuration: festivalFormData.eventDuration || 'Not specified',
        spacesAvailable: festivalFormData.spacesAvailable || 'Not specified',
        electricityProvided: festivalFormData.electricityProvided,
        waterProvided: festivalFormData.waterProvided,
        boothFee: festivalFormData.boothFee || 'To be discussed',
        salesPercentage: festivalFormData.salesPercentage || 'To be discussed',
        eventDescription: festivalFormData.eventDescription || 'No additional details provided',
        specialRequirements: festivalFormData.specialRequirements || 'None',
        truckName: selectedTruck?.name,
        ownerId: selectedTruck?.ownerId // Pass owner ID - function will fetch email server-side
      };

      console.log('📧 Sending festival booking request data:', functionData);

      const result = await sendFestivalRequest(functionData);
      
      console.log('📧 Firebase Function result:', result.data);

      if (result.data.success) {
        Alert.alert(
          'Festival Booking Request Sent! 🎪',
          `Your festival booking request has been sent to ${selectedTruck?.name}. They will contact you directly at ${organizerEmail} to discuss availability, booth fees, and event details.`,
          [{ text: 'Excellent!' }]
        );
        
        // Reset form and close modal
        setFestivalFormData({
          organizerName: '',
          organizerEmail: '',
          organizerPhone: '',
          eventName: '',
          eventDate: '',
          eventTime: '',
          eventLocation: '',
          eventAddress: '',
          expectedAttendance: '',
          eventDuration: '',
          spacesAvailable: '',
          electricityProvided: false,
          waterProvided: false,
          boothFee: '',
          salesPercentage: '',
          eventDescription: '',
          specialRequirements: '',
        });
        setShowFestivalModal(false);
      } else {
        throw new Error(result.data.message || 'Failed to send festival booking request');
      }

    } catch (error) {
      console.error('❌ Festival booking request error:', error);
      Alert.alert(
        'Error',
        'Failed to send festival booking request. Please try contacting the business directly or try again later.'
      );
    } finally {
      setSubmittingFestivalForm(false);
    }
  };

  // Load real-time data from Firebase
  useEffect(() => {
    console.log('🔥 FIREBASE DATA LOADING: useEffect triggered');
    console.log('🔥 FIREBASE DATA LOADING: user exists:', !!user);
    console.log('🔥 FIREBASE DATA LOADING: user.uid:', user?.uid);
    console.log('🔥 FIREBASE DATA LOADING: userRole:', userRole);
    console.log('🔥 FIREBASE DATA LOADING: userPlan:', userPlan);
    
    if (!user) {
      console.log('❌ FIREBASE DATA LOADING: No user - exiting early');
      return;
    }

    console.log('🗺️ MapScreen: Loading Firebase data for user plan:', userPlan);

    // 🌍 PERFORMANCE: Calculate geographic bounds for truck filtering
    const getUserLocationBounds = () => {
      if (!location) return null;
      
      // Calculate bounding box for geographic filtering (±50km)
      const latOffset = GEOGRAPHIC_RADIUS / 111; // ~1 degree = 111km
      const lngOffset = GEOGRAPHIC_RADIUS / (111 * Math.cos(location.lat * Math.PI / 180));
      
      return {
        north: location.lat + latOffset,
        south: location.lat - latOffset,
        east: location.lng + lngOffset,
        west: location.lng - lngOffset
      };
    };

    // Load food truck locations with geographic filtering and complete owner data
    const bounds = getUserLocationBounds();
    let query = collection(db, "truckLocations");
    
    // 🚀 PERFORMANCE: Add geographic filtering for large-scale deployments
    if (bounds && location) {
      console.log('🌍 PERFORMANCE: Applying geographic filtering within', GEOGRAPHIC_RADIUS, 'km of user location');
      // Note: For production, consider using GeoHash or external geographic indexing
      // Firebase doesn't support efficient geo queries without additional indexing
    }
    
    const unsubscribeTrucks = onSnapshot(
      query, 
      async (snapshot) => {
        console.log('� FIREBASE LISTENER: onSnapshot callback triggered');
        console.log('🔥 FIREBASE LISTENER: snapshot exists:', !!snapshot);
        console.log('🔥 FIREBASE LISTENER: snapshot.size:', snapshot.size);
        console.log('🔥 FIREBASE LISTENER: snapshot.empty:', snapshot.empty);
        
        console.log('�🚛 MapScreen: Loading truck locations and owner data for', snapshot.size, 'trucks');
        console.log('🚛 PRIVACY DEBUG: User role:', userRole, 'User ID:', user?.uid?.substring(0, 8) + '...');
        
        // 🚀 PERFORMANCE: Early truncation for large datasets
        const totalTrucks = snapshot.size;
        const trucksToProcess = Math.min(totalTrucks, MAX_TRUCKS_PER_LOAD);
        
        if (totalTrucks > MAX_TRUCKS_PER_LOAD) {
          console.log('🚀 PERFORMANCE: Large dataset detected -', totalTrucks, 'trucks. Processing nearest', trucksToProcess, 'trucks');
        }
        
        const trucksWithOwnerData = [];
        
        if (snapshot.size === 0) {
          console.log('❌ PRIVACY DEBUG: No trucks found in database - this explains mock data fallback');
        }

        // 🌍 PERFORMANCE: Helper function to calculate distance between two points
        const calculateDistance = (lat1, lng1, lat2, lng2) => {
          const R = 6371; // Earth's radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };

        // 🚀 PERFORMANCE: Pre-filter and sort trucks by distance
        let filteredTrucks = snapshot.docs;
        
        if (location && totalTrucks > MAX_TRUCKS_PER_LOAD) {
          console.log('🌍 PERFORMANCE: Filtering trucks by distance to user location');
          
          filteredTrucks = snapshot.docs
            .map(doc => {
              const data = doc.data();
              const distance = data.lat && data.lng ? 
                calculateDistance(location.lat, location.lng, data.lat, data.lng) : 999999;
              return { doc, distance, data };
            })
            .filter(truck => truck.distance <= GEOGRAPHIC_RADIUS) // Only trucks within radius
            .sort((a, b) => a.distance - b.distance) // Sort by closest first
            .slice(0, MAX_TRUCKS_PER_LOAD) // Limit to max trucks
            .map(truck => truck.doc);
            
          console.log('🌍 PERFORMANCE: Filtered to', filteredTrucks.length, 'trucks within', GEOGRAPHIC_RADIUS, 'km');
        }

        // 🚀 PERFORMANCE OPTIMIZATION: Use cached privacy settings or batch load
        const allTruckIds = filteredTrucks.map(doc => doc.id);
        const now = Date.now();
        const isCacheValid = (now - privacyCacheTimestamp) < PRIVACY_CACHE_DURATION;
        
        console.log('🔒 PRIVACY: Cache status - valid:', isCacheValid, 'age:', Math.round((now - privacyCacheTimestamp) / 1000), 'seconds');
        
        let trucksPrivacyMap = {};
        
        if (isCacheValid && privacyCache.size > 0) {
          // Use cached privacy settings
          console.log('🚀 PERFORMANCE: Using cached privacy settings for', allTruckIds.length, 'trucks');
          allTruckIds.forEach(id => {
            if (privacyCache.has(id)) {
              trucksPrivacyMap[id] = privacyCache.get(id);
            }
          });
        } else {
          // Cache expired or empty - batch load fresh privacy settings
          console.log('🔒 PRIVACY: Cache expired/empty - batch loading privacy settings for', allTruckIds.length, 'trucks');
          
          try {
            // 🚀 PERFORMANCE: Use Firebase batch reads for better efficiency at scale
            const BATCH_SIZE = 500; // Firebase has 500 doc limit per batch
            const batchPromises = [];
            
            for (let i = 0; i < allTruckIds.length; i += BATCH_SIZE) {
              const batch = allTruckIds.slice(i, i + BATCH_SIZE);
              const batchPromise = Promise.all(
                batch.map(async (truckId) => {
                  try {
                    const trucksDoc = await getDoc(doc(db, 'trucks', truckId));
                    return {
                      id: truckId,
                      visible: trucksDoc.exists() ? trucksDoc.data().visible : undefined,
                      exists: trucksDoc.exists()
                    };
                  } catch (error) {
                    console.log('🔒 PRIVACY: Error fetching truck', truckId, '- defaulting to hidden');
                    return { id: truckId, visible: false, exists: false };
                  }
                })
              );
              batchPromises.push(batchPromise);
            }
            
            const batchArrays = await Promise.all(batchPromises);
            const batchResults = batchArrays.flat();
            
            console.log('🚀 PERFORMANCE: Processed', batchResults.length, 'trucks in', batchPromises.length, 'batches');
            
            // Update cache
            const newCache = new Map();
            batchResults.forEach(result => {
              trucksPrivacyMap[result.id] = result;
              newCache.set(result.id, result);
            });
            
            setPrivacyCache(newCache);
            setPrivacyCacheTimestamp(now);
            
            console.log('🚀 PERFORMANCE: Fresh privacy data loaded and cached for', batchResults.length, 'trucks');
          } catch (error) {
            console.log('🔒 PRIVACY: Error in batch privacy check - falling back to safe mode (hide all):', error);
            return { trucksToDisplay: [], trucksWithOwnerData: [] };
          }
        }
        
        for (const docSnapshot of filteredTrucks) {
          const truckData = { id: docSnapshot.id, ...docSnapshot.data() };
          
          // SPECIAL DEBUG: Track your "True" truck specifically
          const isTrueTruck = truckData.truckName === 'True';
          if (isTrueTruck) {
            console.log('🎯 TRUE TRUCK FOUND - Full debug info:', {
              id: truckData.id,
              truckName: truckData.truckName,
              lat: truckData.lat,
              lng: truckData.lng,
              visible: truckData.visible,
              isLive: truckData.isLive,
              ownerUid: truckData.ownerUid,
              coverUrl: truckData.coverUrl,
              kitchenType: truckData.kitchenType,
              lastActive: truckData.lastActive,
              sessionId: truckData.sessionId,
              fullData: truckData
            });
          }
          
          console.log('🔒 PRIVACY DEBUG: Processing truck:', {
            id: truckData.id,
            name: truckData.truckName || 'Unknown',
            visible: truckData.visible,
            isLive: truckData.isLive,
            hasCoords: !!(truckData.lat && truckData.lng),
            lastActive: truckData.lastActive ? new Date(truckData.lastActive).toLocaleString() : 'Never'
          });
          
          // 🔒 FAST PRIVACY CHECK: Use pre-loaded privacy data
          const trucksPrivacy = trucksPrivacyMap[truckData.id];
          const trucksVisible = trucksPrivacy ? trucksPrivacy.visible : undefined;
          const locationsVisible = truckData.visible;
          
          console.log('🔒 PRIVACY CROSS-CHECK for truck:', truckData.id, {
            trucksCollectionVisible: trucksVisible,
            locationsCollectionVisible: locationsVisible,
            trucksDocExists: trucksPrivacy ? trucksPrivacy.exists : false
          });
          
          // If EITHER collection has visible=false, hide the truck (most restrictive wins)
          if (trucksVisible === false || locationsVisible === false) {
            console.log('🔒 PRIVACY: Truck hidden in at least one collection, skipping:', truckData.id, truckData.truckName || 'Unknown');
            console.log('🔒 PRIVACY: Hide reason - trucks visible:', trucksVisible, 'locations visible:', locationsVisible);
            continue;
          }
          
          // Special case: If this is "The Grubber" and we're expecting it to be hidden
          if ((truckData.truckName || '').includes('Grubber')) {
            console.log('🚨 GRUBBER DEBUG: This truck should potentially be hidden');
            console.log('🚨 GRUBBER DEBUG: trucksVisible =', trucksVisible, 'locationsVisible =', locationsVisible);
            console.log('🚨 GRUBBER DEBUG: Raw truck data visible field =', truckData.visible);
            console.log('🚨 GRUBBER DEBUG: Privacy map entry =', trucksPrivacy);
          }
        
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
        
        // CRITICAL: Truck must be explicitly visible (visible === true) to be shown to ANYONE
        const isVisible = hasCoordinates && isExplicitlyVisible && (
          isRecentlyActive || 
          (withinEightHourWindow && isExplicitlyVisible)
        );
        
        console.log(`🔒 PRIVACY CHECK for truck ${truckData.id}:`, {
          truckName: truckData.truckName || 'Unknown',
          hasCoordinates,
          isExplicitlyVisible,
          isRecentlyActive,
          withinEightHourWindow,
          finalVisibility: isVisible,
          rawVisibleField: truckData.visible,
          timeSinceActive: Math.round(timeSinceActive / (1000 * 60)) + ' minutes',
          sessionDuration: Math.round(sessionDuration / (1000 * 60 * 60)) + ' hours'
        });
        
        // SPECIAL DEBUG for "True" truck
        if (isTrueTruck) {
          console.log('🎯 TRUE TRUCK VISIBILITY CHECK:', {
            hasCoordinates,
            isExplicitlyVisible, 
            isRecentlyActive,
            withinEightHourWindow,
            finalVisibility: isVisible,
            lastActiveTime: truckData.lastActive ? new Date(truckData.lastActive).toLocaleString() : 'Never',
            sessionStartTime: truckData.sessionStartTime ? new Date(truckData.sessionStartTime).toLocaleString() : 'Never',
            debugDetails: {
              now,
              lastActive: truckData.lastActive,
              timeSinceActive,
              GRACE_PERIOD,
              ONLINE_THRESHOLD,
              sessionDuration,
              sessionStartTime: truckData.sessionStartTime
            }
          });
        }
        
        if (!isVisible) {
          console.log('🚛 PRIVACY: Skipping non-visible truck:', truckData.id, '- Reason: visible =', truckData.visible);
          continue;
        }
        
        // Get complete owner data for each truck
        try {
          const ownerDoc = await getDoc(doc(db, 'users', truckData.ownerUid || truckData.id));
          if (ownerDoc.exists()) {
            const ownerData = ownerDoc.data();
            console.log('📊 Retrieved owner data for truck:', truckData.id, {
              truckName: ownerData.truckName,
              cuisineType: ownerData.cuisineType,
              rawCuisineType: ownerData.cuisineType,
              hasCuisineType: !!ownerData.cuisineType,
              coverUrl: (ownerData.coverUrl || ownerData.coverURL) ? (ownerData.coverUrl || ownerData.coverURL).substring(0, 50) + '...' : 'None',
              fullCoverUrl: ownerData.coverUrl || ownerData.coverURL,
              menuUrl: ownerData.menuUrl ? 'Yes' : 'No',
              socialCount: [ownerData.instagram, ownerData.facebook, ownerData.twitter, ownerData.tiktok].filter(Boolean).length,
              uid: ownerData.uid,
              role: ownerData.role
            });
            
            // Merge truck location data with complete owner profile data
            // Prioritize 'cuisine' field over 'cuisineType' field
            console.log(`🍽️ Cuisine data for ${ownerData.truckName}: cuisine="${ownerData.cuisine}", cuisineType="${ownerData.cuisineType}"`);
            const actualCuisine = ownerData.cuisine || ownerData.cuisineType || inferCuisineType(ownerData.truckName || ownerData.username);
            const finalTruckData = {
              ...truckData,
              uid: truckData.id, // Ensure uid field is available for filtering
              ownerId: ownerData.uid || truckData.ownerUid || truckData.id, // Use actual owner UID from user data
              truckName: ownerData.truckName || ownerData.username || 'Food Truck',
              cuisineType: actualCuisine,
              coverUrl: ownerData.coverUrl || ownerData.coverURL, // Check both case variations
              menuUrl: ownerData.menuUrl,
              instagram: ownerData.instagram,
              facebook: ownerData.facebook,
              twitter: ownerData.twitter,
              tiktok: ownerData.tiktok,
              email: ownerData.email, // Add email for catering requests
              kitchenType: ownerData.kitchenType || truckData.kitchenType || 'truck',
              businessHours: ownerData.businessHours // Add business hours for status calculation
            };
            
            console.log(`🎯 Final truck data for ${finalTruckData.truckName}:`, {
              ownerId: finalTruckData.ownerId,
              coverUrl: finalTruckData.coverUrl,
              hasCoverUrl: !!finalTruckData.coverUrl
            });
            
            trucksWithOwnerData.push(finalTruckData);
          } else {
            console.log('⚠️ No owner data found for truck:', truckData.id);
            // Include truck with basic data and sensible defaults
            trucksWithOwnerData.push({
              ...truckData,
              ownerId: truckData.id, // Add ownerId for menu item loading
              truckName: truckData.truckName || 'Food Truck',
              cuisineType: truckData.cuisine || truckData.cuisineType || 'General Food',
              coverUrl: null,
              menuUrl: null,
              instagram: null,
              facebook: null,
              twitter: null,
              tiktok: null,
              email: null,
              kitchenType: truckData.kitchenType || 'truck',
              businessHours: null
            });
          }
        } catch (error) {
          // Handle permission errors gracefully (expected for Basic plan users reading other owners' data)
          if (error.code === 'permission-denied') {
            console.log('🔒 Limited access to owner data for truck:', truckData.id, '(using basic truck info only)');
          } else {
            console.error('❌ Error fetching owner data for truck:', truckData.id, error);
          }
          // Include truck with basic data and sensible defaults
          const inferredCuisine = truckData.cuisine || truckData.cuisineType || inferCuisineType(truckData.truckName);
          trucksWithOwnerData.push({
            ...truckData,
            uid: truckData.id, // Ensure uid field is available for filtering
            ownerId: truckData.id, // Add ownerId for menu item loading
            truckName: truckData.truckName || 'Food Truck',
            cuisineType: inferredCuisine,
            coverUrl: null,
            menuUrl: null,
            instagram: null,
            facebook: null,
            twitter: null,
            tiktok: null,
            email: null,
            kitchenType: truckData.kitchenType || 'truck',
            businessHours: null
          });
        }
      }
      
      console.log('🚛 MapScreen: Loaded', trucksWithOwnerData.length, 'visible food trucks with complete data');
      console.log('🔒 PRIVACY SUMMARY: Showing', trucksWithOwnerData.length, 'trucks to', userRole, 'user');
      
      // DETAILED PRIVACY DEBUG: Log every truck and its visibility status
      console.log('🔍 DETAILED TRUCK ANALYSIS:');
      trucksWithOwnerData.forEach((truck, index) => {
        console.log(`   ${index + 1}. ${truck.truckName || truck.name || 'Unknown'}`);
        console.log(`      - ID: ${truck.id}`);
        console.log(`      - visible: ${truck.visible}`);
        console.log(`      - isLive: ${truck.isLive}`);
        console.log(`      - coordinates: ${truck.lat}, ${truck.lng}`);
        console.log(`      - source: REAL_DATABASE`);
      });
      
      // Mark that we've received Firebase data (even if empty due to privacy filtering)
      setHasReceivedFirebaseData(true);
      
      if (trucksWithOwnerData.length === 0) {
        console.log('❌ NO VISIBLE TRUCKS - All trucks may be hidden by owners for privacy');
        console.log('❌ This could mean: 1) No trucks in database, 2) All trucks hidden via Hide Truck toggle, 3) Permission issue');
      }
      
      setFoodTrucks(trucksWithOwnerData);
    },
    (error) => {
      console.error('❌ CRITICAL: Error loading truck data:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      
      // Mark that we've received a Firebase response (even if it's an error)
      setHasReceivedFirebaseData(true);
      
      // Set empty array to avoid showing mock data if there's a real error
      setFoodTrucks([]);
    });

    // Load customer pings for both heatmap (Pro/All-Access) and individual markers (Basic)
    let unsubscribePings = null;
    console.log('🔥 MapScreen: Loading customer pings for user plan:', userPlan);
    
    // Load ping data for ALL users
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
      
      if (userPlan === 'pro' || userPlan === 'all-access' || userPlan === 'event-premium') {
        console.log('📍 MapScreen: Loaded', pings.length, 'customer pings for heatmap (Pro/All-Access/Event-Premium)');
      } else {
        console.log('📍 MapScreen: Loaded', pings.length, 'customer pings for individual markers (Basic)');
      }
      console.log('📍 Sample ping data:', pings.slice(0, 3));
      console.log('📍 ALL ping data for debugging:', pings);
      console.log('📍 User plan for display mode:', userPlan);
      setCustomerPings(pings);
    });

    // Load events for event organizers and display on map for all users
    let unsubscribeEvents = null;
    console.log('🎪 MapScreen: Loading events for map display');
    
    unsubscribeEvents = onSnapshot(collection(db, "events"), async (snapshot) => {
      console.log('🎪 MapScreen: Raw events snapshot size:', snapshot.size);
      
      const eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })).filter(event => {
        // Filter for events that should be visible on map
        const hasCoordinates = event.latitude && event.longitude;
        const isPublished = event.status !== 'draft'; // Hide draft events
        
        console.log('🎪 Event filter check:', {
          id: event.id,
          title: event.title,
          hasCoordinates,
          isPublished,
          status: event.status
        });
        
        return hasCoordinates && isPublished;
      });
      
      // Fetch organizer logos for events that need them
      const eventsWithLogos = await Promise.all(eventsData.map(async (event) => {
        if (event.organizerId && (!event.organizerLogoUrl || event.organizerLogoUrl.trim() === '')) {
          try {
            console.log('🎪 Fetching organizer logo for event:', event.title, 'organizerId:', event.organizerId);
            const organizerRef = doc(db, 'users', event.organizerId);
            const organizerSnap = await getDoc(organizerRef);
            
            if (organizerSnap.exists()) {
              const organizerData = organizerSnap.data();
              const logoUrl = organizerData.logoUrl || '';
              console.log('🎪 Found organizer logo:', logoUrl ? 'YES' : 'NO', 'for event:', event.title);
              
              return {
                ...event,
                organizerLogoUrl: logoUrl
              };
            }
          } catch (error) {
            console.error('❌ Error fetching organizer data for event:', event.id, error);
          }
        }
        
        return event;
      }));
      
      console.log('🎪 MapScreen: Loaded', eventsWithLogos.length, 'visible events');
      console.log('🎪 Sample event summary:', eventsWithLogos.slice(0, 2).map(event => ({
        title: event.title,
        organizerId: event.organizerId,
        hasLogo: !!(event.organizerLogoUrl || event.base64Logo)
      })));
      setEvents(eventsWithLogos);
    });

    setLoading(false);

    return () => {
      unsubscribeTrucks();
      if (unsubscribePings) unsubscribePings();
      if (unsubscribeEvents) unsubscribeEvents();
    };
  }, [user, userPlan]); // Removed refreshTrigger to prevent unnecessary restarts of Firebase listeners

  // Handle geolocation based on user plan and role
  useEffect(() => {
    console.log('🌍 MapScreen: Geolocation useEffect triggered - userRole:', userRole, 'userPlan:', userPlan, 'user:', !!user?.uid);
    
    (async () => {
      console.log('🌍 MapScreen: Starting geolocation process...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🌍 MapScreen: Location permission status:', status);
      setLocationPermission(status);
      
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Please enable location access in settings.');
        console.log('❌ MapScreen: Location permission denied - using default location');
        // Use default location for all users when permission is denied
        setLocation({
          coords: {
            latitude: 39.8283, // USA center
            longitude: -98.5795
          }
        });
        return;
      }

      // Try to get geolocation for ALL users first
      try {
        console.log('🌍 MapScreen: Attempting geolocation for user:', userRole, userPlan);
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000, // 15 second timeout
        });
        
        setLocation(location);
        console.log('✅ MapScreen: Successfully got user location:', location.coords.latitude, location.coords.longitude);
        console.log('📍 MapScreen: Checking location save requirements - userRole:', userRole, 'user.uid:', !!user?.uid, 'sessionId:', !!sessionId, 'ownerData:', !!ownerData);

        // Save location for all food truck owners (Basic, Pro, All-Access) - automatic GPS tracking for all plans
        if (userRole === 'owner' && user?.uid) {
          console.log('🌍 MapScreen: Food truck owner detected - attempting to save location for plan:', userPlan);
          
          // Wait for sessionId and ownerData if they're not ready yet
          let attempts = 0;
          const maxAttempts = 10; // Wait up to 5 seconds (500ms * 10)
          
          while ((!sessionId || !ownerData) && attempts < maxAttempts) {
            console.log('⏳ MapScreen: Waiting for sessionId or ownerData... Attempt', attempts + 1);
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
            attempts++;
          }
          
          if (sessionId && ownerData) {
            console.log('🌍 MapScreen: Ready to save truck location to Firebase for plan:', userPlan);
          } else {
            console.log('⚠️ MapScreen: Proceeding without sessionId or ownerData - sessionId:', !!sessionId, 'ownerData:', !!ownerData);
          }
          try {
            // Save to Firestore as truck location
            const truckDocRef = doc(db, 'truckLocations', user.uid);
            const locationData = {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
              isLive: true,
              visible: showTruckIcon !== false, // Respect user's visibility choice for ALL plans
              updatedAt: serverTimestamp(),
              lastActive: Date.now(),
              lastActivityTime: Date.now(),
              sessionId: sessionId || Date.now() + '_' + Math.random().toString(36).substr(2, 9), // Generate fallback sessionId
              sessionStartTime: Date.now(),
              loginTime: Date.now(),
              ownerUid: user.uid,
              kitchenType: ownerData?.kitchenType || "truck",
              truckName: ownerData?.username || ownerData?.businessName || "Food Truck",
              coverUrl: ownerData?.coverUrl || ownerData?.coverURL || null, // Check both case variations
            };
            
            // Save to trucks collection for persistence and visibility management
            const trucksDocRef = doc(db, 'trucks', user.uid);
            await setDoc(trucksDocRef, locationData, { merge: true });
            
            await setDoc(truckDocRef, locationData, { merge: true });
            console.log('✅ MapScreen: Food truck owner location saved to Firebase for plan:', userPlan);
          } catch (firebaseError) {
            console.error('❌ MapScreen: Error saving truck location to Firebase:', firebaseError);
          }
        }
        
      } catch (locationError) {
        console.error('❌ MapScreen: Geolocation failed:', locationError);
        
        // Provide helpful error message for all users
        setErrorMsg('Unable to get your current location. Please check your location settings and try again. Showing all trucks nationwide for now.');
        console.log('📍 MapScreen: Location failed for user, using default nationwide view');
        
        // Fallback to default location for all users
        setLocation({
          coords: {
            latitude: 39.8283,
            longitude: -98.5795
          }
        });
      }
    })();
  }, [userPlan, userRole, user, sessionId, ownerData]);

  // Additional effect to ensure truck location is saved when sessionId/ownerData become available later
  useEffect(() => {
    const saveLateLoadedLocation = async () => {
      if (userRole === 'owner' && user?.uid && sessionId && ownerData && location) {
        console.log('🔄 MapScreen: Late-loading effect - ensuring truck location is saved with complete data');
        
        try {
          const truckDocRef = doc(db, 'truckLocations', user.uid);
          const locationData = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            isLive: true,
            visible: showTruckIcon !== false, // Respect user's visibility choice for ALL plans
            updatedAt: serverTimestamp(),
            lastActive: Date.now(),
            lastActivityTime: Date.now(),
            sessionId: sessionId,
            sessionStartTime: Date.now(),
            loginTime: Date.now(),
            ownerUid: user.uid,
            kitchenType: ownerData.kitchenType || "truck",
            truckName: ownerData.username || ownerData.businessName || "Food Truck",
            coverUrl: ownerData.coverUrl || ownerData.coverURL || null,
          };
          
          // Save to both collections
          const trucksDocRef = doc(db, 'trucks', user.uid);
          await setDoc(trucksDocRef, locationData, { merge: true });
          await setDoc(truckDocRef, locationData, { merge: true });
          
          console.log('✅ MapScreen: Late-loading - truck location updated with complete data');
        } catch (error) {
          console.error('❌ MapScreen: Error in late-loading location save:', error);
        }
      }
    };
    
    saveLateLoadedLocation();
  }, [sessionId, ownerData, location, userRole, user, showTruckIcon]);

  // Create a stable identifier for trucks to prevent unnecessary WebView regeneration
  const trucksDataHash = useMemo(() => {
    if (!foodTrucks || foodTrucks.length === 0) return 'empty';
    
    // Create a hash based on truck count and essential properties
    const essentialData = foodTrucks.map(truck => ({
      id: truck.id || truck.ownerId,
      name: truck.name || truck.truckName,
      lat: truck.lat || truck.latitude,
      lng: truck.lng || truck.longitude,
      visible: truck.visible,
      status: truck.status,
      isLive: truck.isLive
    }));
    
    return JSON.stringify(essentialData);
  }, [foodTrucks]);

  // Generate map HTML when location, trucks, or pings change
  useEffect(() => {
    const generateHTML = async () => {
      if (!location) {
        setMapHTML('');
        setWebViewReady(false);
        return;
      }
      
      console.log('🗺️ Generating map HTML with processed truck icons...');
      console.log('🎪 EVENTS DEBUG: events.length at HTML generation time:', events.length);
      console.log('🎪 EVENTS DEBUG: Sample event summary:', events.length > 0 ? {
        title: events[0].title,
        organizerId: events[0].organizerId,
        hasLogo: !!(events[0].organizerLogoUrl || events[0].base64Logo)
      } : 'No events');
      
      // 🚀 PERFORMANCE: Start performance monitoring
      const perfStart = Date.now();
      const initialTruckCount = foodTrucks.length;
      
      setWebViewReady(false); // Reset ready state when regenerating HTML
      const html = await createMapHTML();
      
      // 🚀 PERFORMANCE: Log performance metrics
      const perfEnd = Date.now();
      const processingTime = perfEnd - perfStart;
      
      console.log('🚀 PERFORMANCE SUMMARY:');
      console.log('  📊 Initial trucks loaded:', initialTruckCount);
      console.log('  🌍 Geographic filtering radius:', GEOGRAPHIC_RADIUS, 'km');
      console.log('  🎯 Max trucks per load:', MAX_TRUCKS_PER_LOAD);
      console.log('  ⏱️ Total processing time:', processingTime, 'ms');
      console.log('  🚀 Processing speed:', Math.round(initialTruckCount / (processingTime / 1000)), 'trucks/second');
      
      if (initialTruckCount > MAX_TRUCKS_PER_LOAD) {
        console.log('  ⚡ Large dataset optimizations ACTIVE');
        console.log('  🔧 Lazy loading:', 'ENABLED');
        console.log('  🔧 Geographic filtering:', 'ENABLED');
        console.log('  🔧 Batch processing:', 'ENABLED');
      } else {
        console.log('  🔧 Small dataset - standard processing');
      }
      
      setMapHTML(html);
    };
    
    generateHTML();
  }, [location, trucksDataHash, customerPings, events, userPlan, showTruckIcon, excludedCuisines, userFavorites]);
  // NOTE: Using trucksDataHash instead of foodTrucks to prevent unnecessary regeneration
  // NOTE: Removed showClosedTrucks, showOpenTrucks, and refreshTrigger from dependencies to prevent event markers from being affected by truck-specific changes

  // Mock food truck data with California coordinates (fallback for development)
  const mockFoodTrucks = [
    { id: 1, name: "Tasty Tacos", lat: 33.8309, lng: -117.0934, status: "open", popularity: 85, type: "mexican", kitchenType: "truck" }, // Riverside, CA
    { id: 2, name: "Burger Paradise", lat: 33.8409, lng: -117.0834, status: "open", popularity: 92, type: "american", kitchenType: "truck" }, // Riverside, CA
    { id: 3, name: "Pizza Express", lat: 33.8209, lng: -117.1034, status: "closed", popularity: 67, type: "italian", kitchenType: "trailer" }, // Riverside, CA
    { id: 4, name: "Sushi Roll", lat: 33.8509, lng: -117.0734, status: "open", popularity: 78, type: "japanese", kitchenType: "truck" }, // Riverside, CA
    { id: 5, name: "BBQ Master", lat: 33.8159, lng: -117.0634, status: "busy", popularity: 95, type: "bbq", kitchenType: "cart" }, // Riverside, CA
  ];

  // Pre-fetch and convert images to base64 for WebView
  const convertImageToBase64 = async (imageUrl) => {
    try {
      console.log('🔄 Pre-fetching image for base64 conversion:', imageUrl.substring(0, 50) + '...');
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log('✅ Successfully converted image to base64');
          resolve(reader.result);
        };
        reader.onerror = () => {
          console.log('❌ Failed to convert blob to base64');
          reject(new Error('Failed to convert to base64'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.log('❌ Failed to fetch/convert image:', error.message);
      return null;
    }
  };

  // Generate personalized truck icon based on available data
  const generatePersonalizedIcon = (truck) => {
    const truckName = truck.truckName || truck.name || 'Food Truck';
    
    // Option 1: Use base64 image if available
    if (truck.base64CoverImage) {
      return {
        type: 'image',
        data: truck.base64CoverImage,
        html: `<img src="${truck.base64CoverImage}" style="width: 55px; height: 55px; border-radius: 50%; border: 2px solid #000000; box-shadow: 0 3px 10px rgba(0,0,0,0.4);" />`
      };
    }
    
    // Option 2: Use initials with cuisine-based colors
    const initials = truckName.substring(0, 2).toUpperCase();
    const cuisineColors = {
      'american': '#FF6B6B',
      'asian-fusion': '#4ECDC4', 
      'bbq': '#8B4513',
      'burgers': '#FFD93D',
      'chinese': '#FF4757',
      'coffee': '#8B4513',
      'desserts': '#FF9FF3',
      'italian': '#2ED573',
      'japanese': '#FF6348',
      'korean': '#FF3838',
      'latin': '#FF9F43',
      'mediterranean': '#70A1FF',
      'default': '#2c6f57'
    };
    
    const cuisineType = (truck.cuisineType || 'default').toLowerCase();
    const bgColor = cuisineColors[cuisineType] || cuisineColors.default;
    
    return {
      type: 'initials',
      data: initials,
      html: `<div style="width: 55px; height: 55px; border-radius: 50%; background: ${bgColor}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; border: 2px solid #000000; box-shadow: 0 3px 10px rgba(0,0,0,0.4);">${initials}</div>`
    };
  };

  // Generate personalized event icon based on available data (similar to truck icons)
  const generateEventIcon = (event) => {
    const eventTitle = event.title || event.eventName || 'Event';
    
    // Option 1: Use processed base64 logo if available, or fallback to original URL
    const logoUrl = event.base64Logo || event.organizerLogoUrl;
    if (logoUrl && logoUrl.trim() !== '') {
      console.log('🎪 Using organizer logo for event icon:', eventTitle, 'Logo type:', event.base64Logo ? 'base64' : 'URL');
      return {
        type: 'logo',
        data: logoUrl,
        html: `<div style="width: 50px; height: 50px; border-radius: 50%; border: 3px solid #FFD700; overflow: hidden; box-shadow: 0 3px 10px rgba(0,0,0,0.4); background: white; display: flex; align-items: center; justify-content: center; position: relative;">
          <img src="${logoUrl}" style="width: calc(100% - 6px); height: calc(100% - 6px); object-fit: cover; border-radius: 50%;" onerror="console.log('❌ Event logo failed to load:', this.src); this.style.display='none';" />
          <div style="position: absolute; bottom: -2px; right: -2px; width: 16px; height: 16px; background: #FFD700; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.3); border: 2px solid white; font-size: 10px;">⭐</div>
        </div>`
      };
    }
    
    // Option 2: Use initials with event status-based colors (fallback only)
    console.log('🎪 No logo available for event:', eventTitle, 'Using initials fallback');
    const initials = eventTitle.substring(0, 2).toUpperCase();
    const statusColors = {
      'active': '#FFD700',     // Gold for active events
      'upcoming': '#4CAF50',   // Green for upcoming
      'completed': '#9E9E9E',  // Gray for completed
      'cancelled': '#F44336',  // Red for cancelled
      'default': '#FF6B35'     // Orange default
    };
    
    const eventStatus = (event.status || 'default').toLowerCase();
    const bgColor = statusColors[eventStatus] || statusColors.default;
    
    return {
      type: 'initials',
      data: initials,
      html: `<div style="width: 50px; height: 50px; border-radius: 50%; background: ${bgColor}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; border: 3px solid #000000; box-shadow: 0 3px 10px rgba(0,0,0,0.4); position: relative;">
        ${initials}
        <div style="position: absolute; bottom: -2px; right: -2px; width: 16px; height: 16px; background: #FFD700; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.3); border: 2px solid white; font-size: 10px;">⭐</div>
      </div>`
    };
  };

  const createMapHTML = async () => {
    if (!location) return '';
    
    const userLat = location.coords.latitude;
    const userLng = location.coords.longitude;
    
    // Use real truck data if available, otherwise fallback to mock data ONLY if no Firebase data received
    // CRITICAL: Don't use mock data if trucks are just hidden for privacy reasons
    let trucksToDisplay = foodTrucks.length > 0 ? foodTrucks : (hasReceivedFirebaseData ? [] : mockFoodTrucks);
    
    console.log('🗺️ MAP DEBUG: Truck data source decision:');
    console.log('🗺️ Real foodTrucks.length:', foodTrucks.length);
    console.log('🗺️ hasReceivedFirebaseData:', hasReceivedFirebaseData);
    console.log('🗺️ Using:', foodTrucks.length > 0 ? 'REAL DATA' : (hasReceivedFirebaseData ? 'NO TRUCKS (PRIVACY RESPECTED)' : 'MOCK DATA (no firebase data)'));
    console.log('🗺️ User location:', { lat: userLat, lng: userLng });
    console.log('🗺️ trucksToDisplay.length:', trucksToDisplay.length);
    console.log('🗺️ Trucks to display:', trucksToDisplay.map(t => ({ name: t.truckName || t.name, id: t.id, visible: t.visible })));
    
    // CRITICAL DEBUG: Check specifically for "The Grubber"
    const grubberTruck = trucksToDisplay.find(t => (t.truckName || t.name || '').toLowerCase().includes('grubber'));
    if (grubberTruck) {
      console.log('🚨 PRIVACY VIOLATION DETECTED: The Grubber found in trucks to display!');
      console.log('🚨 Grubber data:', {
        name: grubberTruck.truckName || grubberTruck.name,
        id: grubberTruck.id,
        visible: grubberTruck.visible,
        isLive: grubberTruck.isLive,
        source: foodTrucks.length > 0 ? 'REAL_DATABASE' : (hasReceivedFirebaseData ? 'NO_SOURCE' : 'MOCK_DATA')
      });
      console.log('🚨 This should NOT happen if Hide Truck is working correctly!');
    } else {
      console.log('✅ PRIVACY: No Grubber truck found in display list - privacy working correctly');
    }
    
    if (foodTrucks.length === 0 && hasReceivedFirebaseData) {
      console.log('🔒 PRIVACY: No trucks to show - respecting Hide Truck settings');
      console.log('🔒 PRIVACY: Not falling back to mock data - this is the correct behavior');
    } else if (foodTrucks.length === 0 && !hasReceivedFirebaseData) {
      console.log('⚠️ MAP WARNING: No Firebase data received, falling back to mock data');
      console.log('⚠️ This means customers will see demo trucks instead of real ones');
      console.log('🌍 Mock trucks now use California coordinates near user location');
    }
    
    // Filter out current user's truck if they've toggled it off (owners only)
    if (userRole === 'owner' && user && !showTruckIcon) {
      console.log('🚚 Filtering out current user truck. User UID:', user.uid);
      console.log('🚚 Trucks before filtering:', trucksToDisplay.map(t => ({ 
        name: t.truckName || t.name, 
        uid: t.uid
      })));
      
      // Filter out the current user's truck
      trucksToDisplay = trucksToDisplay.filter(truck => truck.uid !== user.uid);
      
      console.log('🚚 Current user truck hidden. Displaying', trucksToDisplay.length, 'trucks');
      console.log('🚚 Trucks after filtering:', trucksToDisplay.map(t => ({ 
        name: t.truckName || t.name, 
        uid: t.uid
      })));
    } else if (userRole === 'owner' && user && showTruckIcon) {
      console.log('🚚 Current user truck should be visible. User UID:', user.uid);
      console.log('🚚 All trucks:', trucksToDisplay.map(t => ({ 
        name: t.truckName || t.name, 
        uid: t.uid
      })));
    }
    
    // SPECIAL DEBUG: Check if "True" truck made it to the display list
    const trueTruckInDisplay = trucksToDisplay.find(t => t.truckName === 'True');
    if (trueTruckInDisplay) {
      console.log('🎯 TRUE TRUCK WILL BE DISPLAYED:', trueTruckInDisplay);
    } else {
      console.log('🎯 TRUE TRUCK NOT IN DISPLAY LIST. Available trucks:', trucksToDisplay.map(t => t.truckName));
    }
    
    // Pre-process trucks with base64 images
    console.log('🎯 Pre-processing', trucksToDisplay.length, 'truck images...');
    
    // 🚀 PERFORMANCE: Implement lazy loading for large datasets
    const MAX_CONCURRENT_IMAGES = 10; // Process max 10 images at once
    const ENABLE_LAZY_LOADING = trucksToDisplay.length > 20; // Enable for 20+ trucks
    
    let processedTrucks;
    
    if (ENABLE_LAZY_LOADING) {
      console.log('🚀 PERFORMANCE: Large truck dataset - using lazy image loading');
      
      // 🌍 PERFORMANCE: Helper function for distance calculation
      const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };
      
      // Process images in batches to avoid memory issues
      processedTrucks = [];
      for (let i = 0; i < trucksToDisplay.length; i += MAX_CONCURRENT_IMAGES) {
        const batch = trucksToDisplay.slice(i, i + MAX_CONCURRENT_IMAGES);
        
        const batchResults = await Promise.all(
          batch.map(async (truck) => {
            // 🚀 PERFORMANCE: Skip image processing for trucks far from view center
            const skipImageProcessing = location && truck.lat && truck.lng && 
              calculateDistance(location.lat, location.lng, truck.lat, truck.lng) > 10; // 10km threshold
            
            let base64Image = null;
            
            if (!skipImageProcessing && truck.coverUrl && truck.coverUrl.trim() !== '') {
              console.log('🔄 Processing cover image for:', truck.truckName || truck.name);
              try {
                base64Image = await convertImageToBase64(truck.coverUrl);
              } catch (error) {
                console.log('❌ Image processing failed for', truck.truckName, '- using fallback');
              }
            } else if (skipImageProcessing) {
              console.log('⚡ Skipping image processing for distant truck:', truck.truckName);
            }
            
            const personalizedIcon = generatePersonalizedIcon({
              ...truck,
              base64CoverImage: base64Image
            });
            
            return {
              ...truck,
              base64CoverImage: base64Image,
              hasCustomIcon: !!base64Image,
              personalizedIcon: personalizedIcon
            };
          })
        );
        
        processedTrucks.push(...batchResults);
        console.log(`🚀 PERFORMANCE: Processed batch ${Math.floor(i/MAX_CONCURRENT_IMAGES) + 1}/${Math.ceil(trucksToDisplay.length/MAX_CONCURRENT_IMAGES)}`);
      }
    } else {
      // Standard processing for smaller datasets
      processedTrucks = await Promise.all(
        trucksToDisplay.map(async (truck) => {
          let base64Image = null;
          
          if (truck.coverUrl && truck.coverUrl.trim() !== '') {
            console.log('🔄 Processing cover image for:', truck.truckName || truck.name);
            base64Image = await convertImageToBase64(truck.coverUrl);
          }
          
          const personalizedIcon = generatePersonalizedIcon({
            ...truck,
            base64CoverImage: base64Image
          });
          
          return {
            ...truck,
            base64CoverImage: base64Image,
            hasCustomIcon: !!base64Image,
            personalizedIcon: personalizedIcon
          };
        })
      );
    }
    
    const successCount = processedTrucks.filter(truck => truck.hasCustomIcon).length;
    console.log(`🎯 Successfully processed ${successCount}/${trucksToDisplay.length} truck images`);
    
    // Pre-process events with personalized icons
    console.log('🎪 Pre-processing', events.length, 'event icons...');
    const processedEvents = await Promise.all(
      events.map(async (event) => {
        let base64Logo = null;
        
        if (event.organizerLogoUrl && event.organizerLogoUrl.trim() !== '') {
          console.log('🔄 Processing organizer logo for:', event.title || event.eventName);
          base64Logo = await convertImageToBase64(event.organizerLogoUrl);
        }
        
        const eventIcon = generateEventIcon({
          ...event,
          base64Logo: base64Logo
        });
        
        return {
          ...event,
          base64Logo: base64Logo,
          hasCustomLogo: !!base64Logo,
          eventIcon: eventIcon
        };
      })
    );
    
    const eventLogoCount = processedEvents.filter(event => event.hasCustomLogo).length;
    console.log(`🎯 Successfully processed ${eventLogoCount}/${events.length} event logos`);
    console.log('🎪 PROCESSED EVENTS DEBUG: processedEvents.length:', processedEvents.length);
    console.log('🎪 PROCESSED EVENTS DEBUG: Sample event info:', processedEvents.length > 0 ? {
      title: processedEvents[0].title,
      organizerId: processedEvents[0].organizerId,
      hasCustomLogo: processedEvents[0].hasCustomLogo
    } : 'No events');
    
    // 🔍 DEBUG: Log the processed truck data
    console.log('🗺️ WEBVIEW DEBUG: About to create map with processed truck data:');
    console.log('🗺️ Total trucks to display:', processedTrucks.length);
    processedTrucks.forEach((truck, index) => {
      console.log(`🚛 Truck ${index + 1}:`, {
        name: truck.truckName || truck.name,
        id: truck.id,
        ownerId: truck.ownerId,
        hasCustomIcon: truck.hasCustomIcon,
        iconType: truck.personalizedIcon.type,
        cuisineType: truck.cuisineType
      });
    });
    
    // 🎪 DEBUG: Log the processed events data summary (no base64)
    console.log('🎪 WEBVIEW DEBUG: About to create map with processed events data:');
    console.log('🎪 Total events to display:', processedEvents.length);
    console.log('🎪 Events summary:', processedEvents.map(event => ({
      title: event.title,
      organizerId: event.organizerId,
      hasCustomLogo: event.hasCustomLogo,
      logoType: event.base64Logo ? 'base64' : 'url'
    })));

    // Debug: Toggle functionality removed - showing all markers
    console.log('🚛 REACT STATE: Toggle functionality removed - showing all markers');

    // CRITICAL: Sanitize data for JSON.stringify to prevent WebView errors
    let sanitizedTrucks = [];
    try {
      sanitizedTrucks = processedTrucks.map(truck => ({
        ...truck,
        // Remove any functions or complex objects that might cause JSON.stringify to fail
        personalizedIcon: truck.personalizedIcon ? {
          type: truck.personalizedIcon.type,
          html: truck.personalizedIcon.html,
          className: truck.personalizedIcon.className
        } : null
      }));
      console.log('🔧 REACT NATIVE: Successfully sanitized processedTrucks for JSON.stringify');
    } catch (error) {
      console.error('🔧 REACT NATIVE ERROR: Failed to sanitize processedTrucks:', error);
      sanitizedTrucks = [];
    }

    let sanitizedEvents = [];
    try {
      sanitizedEvents = processedEvents.map(event => ({
        ...event,
        // Remove any functions or complex objects that might cause JSON.stringify to fail
        eventIcon: event.eventIcon ? {
          type: event.eventIcon.type,
          html: event.eventIcon.html,
          className: event.eventIcon.className
        } : null
      }));
      console.log('🔧 REACT NATIVE: Successfully sanitized processedEvents for JSON.stringify');
    } catch (error) {
      console.error('🔧 REACT NATIVE ERROR: Failed to sanitize processedEvents:', error);
      sanitizedEvents = [];
    }

    let sanitizedPings = [];
    try {
      sanitizedPings = JSON.parse(JSON.stringify(customerPings)); // Deep clone to remove any problematic references
      console.log('🔧 REACT NATIVE: Successfully sanitized customerPings for JSON.stringify');
    } catch (error) {
      console.error('🔧 REACT NATIVE ERROR: Failed to sanitize customerPings:', error);
      sanitizedPings = [];
    }

    // REMOVED: Toggle button functionality - showing all markers now

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
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 1000;
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                max-width: 150px;
                pointer-events: auto;
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
                transition: all 0.2s ease;
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
            }
            .control-btn:hover { background: #1e4a3a; }
            .control-btn:active { 
                background: #144034; 
                transform: scale(0.95);
            }
            .control-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
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
            <button class="control-btn" onclick="event.stopPropagation(); centerOnUser();">📍 My Location</button>
            <button class="control-btn" onclick="event.stopPropagation(); showCuisineSelector();">🍽️ Cuisine Type</button>
            <button class="control-btn" onclick="event.stopPropagation(); toggleStatusFilter();" id="statusFilterBtn">📊 Show All</button>
            ${(userPlan === 'pro' || userPlan === 'all-access' || userPlan === 'event-premium') ? `
            <button class="control-btn" onclick="event.stopPropagation(); toggleHeatmap();">🔥 Toggle Heatmap</button>
            ` : ''}
        </div>



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



        <script>
            // 🔴 CRITICAL TEST: First line of WebView execution - use native console before redefinition
            const nativeConsoleLog = console.log;
            const nativeConsoleError = console.error;
            
            // Send startup message using native console AND direct WebView messaging
            nativeConsoleLog('🟢 WEBVIEW STARTUP: JavaScript is executing in WebView!');
            
            // Also try to send through WebView immediately if available
            if (window.ReactNativeWebView) {
                try {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'CONSOLE_LOG',
                        level: 'LOG',
                        message: '🟢 WEBVIEW STARTUP: JavaScript is executing in WebView!'
                    }));
                } catch (e) {
                    nativeConsoleLog('🔴 WebView messaging failed:', e);
                }
            } else {
                // WebView bridge not ready yet, log this for debugging
                nativeConsoleLog('⚠️ ReactNativeWebView not available yet during startup');
            }
            
            // WEBVIEW CONSOLE FORWARDING: Capture all console messages and send to React Native
            const originalConsoleLog = nativeConsoleLog;
            const originalConsoleError = nativeConsoleError;
            
            console.log = function(...args) {
                // Forward to React Native
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'CONSOLE_LOG',
                        level: 'LOG',
                        message: args.join(' ')
                    }));
                }
                // Also keep original logging
                originalConsoleLog.apply(console, args);
            };
            
            console.error = function(...args) {
                // Forward to React Native
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'CONSOLE_LOG',
                        level: 'ERROR',
                        message: args.join(' ')
                    }));
                }
                // Also keep original logging
                originalConsoleError.apply(console, args);
            };
            
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
            
            // Initialize map (using let for function accessibility)
            console.log('🗺️ WEBVIEW: About to initialize Leaflet map at [${userLat}, ${userLng}]');
            let map = L.map('map').setView([${userLat}, ${userLng}], 14);
            console.log('🗺️ WEBVIEW: Leaflet map initialized successfully');
            
            // Add OpenStreetMap tiles
            console.log('🗺️ WEBVIEW: Adding OpenStreetMap tile layer...');
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            console.log('🗺️ WEBVIEW: Tile layer added successfully');

            // User location marker
            console.log('🗺️ WEBVIEW: Creating user location marker...');
            const userIcon = L.divIcon({
                html: '<div style="background: #007AFF; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,122,255,0.3);"></div>',
                iconSize: [20, 20],
                className: 'user-marker'
            });
            
            L.marker([${userLat}, ${userLng}], { icon: userIcon })
                .addTo(map)
                .bindPopup('<div class="truck-popup"><div class="truck-name">📍 Your Location</div></div>');
            console.log('🗺️ WEBVIEW: User location marker added successfully');
            
            // DEBUG: Check if execution continues past user marker creation
            console.log('🔧 WEBVIEW DEBUG: About to start marker creation section...');
            
            // SAFE logging to prevent JavaScript crashes
            console.log('🔧 WEBVIEW DEBUG: Checking foodTrucks variable...');
            try {
                const trucksCount = (foodTrucks && Array.isArray(foodTrucks)) ? foodTrucks.length : 'undefined or not array';
                console.log('🔧 WEBVIEW DEBUG: foodTrucks count:', trucksCount);
            } catch (e) {
                console.error('🔧 WEBVIEW ERROR checking foodTrucks:', e.message);
            }
            
            console.log('🔧 WEBVIEW DEBUG: Checking events variable...');
            try {
                const eventsCount = (events && Array.isArray(events)) ? events.length : 'undefined or not array';
                console.log('🔧 WEBVIEW DEBUG: events count:', eventsCount);
            } catch (e) {
                console.error('🔧 WEBVIEW ERROR checking events:', e.message);
            }
            
            // IMMEDIATE TEST - Call marker creation right here
            console.log('🚀 WEBVIEW: About to call createTruckMarkers directly...');
            try {
                if (typeof createTruckMarkers !== 'undefined') {
                    console.log('🚀 WEBVIEW: createTruckMarkers function exists, calling it...');
                    createTruckMarkers(foodTrucks);
                } else {
                    console.error('🚀 WEBVIEW ERROR: createTruckMarkers function not defined!');
                }
            } catch (error) {
                console.error('🚀 WEBVIEW ERROR calling createTruckMarkers:', error);
            }

            console.log('🔧 WEBVIEW: About to define checkTruckOpenStatus function...');
            
            // Business hours status checking function
            function checkTruckOpenStatus(businessHours) {
                // If no business hours provided, use default hours (9 AM - 5 PM, Mon-Sat)
                if (!businessHours) {
                    businessHours = {
                        sunday: { open: '10:00 AM', close: '4:00 PM', closed: true },
                        monday: { open: '9:00 AM', close: '5:00 PM', closed: false },
                        tuesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
                        wednesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
                        thursday: { open: '9:00 AM', close: '5:00 PM', closed: false },
                        friday: { open: '9:00 AM', close: '5:00 PM', closed: false },
                        saturday: { open: '9:00 AM', close: '5:00 PM', closed: false }
                    };
                    console.log('🕐 Using default business hours (9 AM - 5 PM)');
                }
                
                const now = new Date();
                const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
                const currentTime12 = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
                
                console.log('🕐 Checking status for', currentDay, 'at', currentTime12);
                console.log('🕐 Full business hours object:', JSON.stringify(businessHours, null, 2));
                
                const dayHours = businessHours[currentDay];
                if (!dayHours || dayHours.closed) {
                    console.log('🔴 Truck is closed today (no hours or marked as closed)');
                    return 'closed';
                }
                
                console.log('🕐 Business hours for', currentDay, ':', dayHours.open, '-', dayHours.close);
                console.log('🕐 Current time:', currentTime12);
                
                // Helper function to convert AM/PM time to minutes since midnight for easy comparison
                const timeToMinutes = (timeStr) => {
                    if (!timeStr) return 0;
                    
                    console.log('🔍 Converting to minutes:', timeStr);
                    
                    const timeStr_clean = timeStr.trim();
                    
                    // Check if it's already 24-hour format (no AM/PM)
                    if (!timeStr_clean.includes('AM') && !timeStr_clean.includes('PM')) {
                        // 24-hour format like "09:00" or "17:00"
                        const timeParts = timeStr_clean.split(':');
                        if (timeParts.length !== 2) {
                            console.log('❌ Invalid 24-hour format - expected "HH:MM", got:', timeStr);
                            return 0;
                        }
                        
                        const hours = parseInt(timeParts[0], 10);
                        const minutes = parseInt(timeParts[1], 10);
                        
                        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                            console.log('❌ Invalid 24-hour time values - hours:', hours, 'minutes:', minutes);
                            return 0;
                        }
                        
                        const totalMinutes = hours * 60 + minutes;
                        console.log('🔍 Converted 24-hour', timeStr, 'to', totalMinutes, 'minutes since midnight');
                        return totalMinutes;
                    }
                    
                    // 12-hour format with AM/PM - handle various whitespace characters
                    const parts = timeStr_clean.split(/\s+/); // Split on any whitespace (space, non-breaking space, etc.)
                    console.log('🔍 Split parts:', parts, 'Length:', parts.length);
                    console.log('🔍 Original string bytes:', Array.from(timeStr_clean).map(char => char.charCodeAt(0)));
                    
                    if (parts.length !== 2) {
                        console.log('❌ Invalid time format - expected "H:MM AM/PM", got:', timeStr);
                        console.log('❌ Split result:', parts);
                        console.log('❌ Trying alternative parsing...');
                        
                        // Try alternative parsing for edge cases
                        const ampmMatch = timeStr_clean.match(/(AM|PM)/i);
                        if (ampmMatch) {
                            const ampm = ampmMatch[0].toUpperCase();
                            const timeOnly = timeStr_clean.replace(/(AM|PM)/i, '').trim();
                            console.log('🔍 Alternative parsing - time:', timeOnly, 'period:', ampm);
                            
                            const timeParts = timeOnly.split(':');
                            if (timeParts.length === 2) {
                                let hours = parseInt(timeParts[0], 10);
                                const minutes = parseInt(timeParts[1], 10);
                                
                                if (!isNaN(hours) && !isNaN(minutes) && hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
                                    // Convert to 24-hour format
                                    if (ampm === 'PM' && hours !== 12) {
                                        hours = hours + 12;
                                    } else if (ampm === 'AM' && hours === 12) {
                                        hours = 0;
                                    }
                                    
                                    const totalMinutes = hours * 60 + minutes;
                                    console.log('✅ Alternative parsing successful:', timeStr, '→', totalMinutes, 'minutes');
                                    return totalMinutes;
                                }
                            }
                        }
                        
                        return 0;
                    }
                    
                    const [time, period] = parts;
                    console.log('🔍 Time part:', '"' + time + '"', 'Period part:', '"' + period + '"');
                    
                    const timeParts = time.split(':');
                    console.log('🔍 Time split by colon:', timeParts, 'Length:', timeParts.length);
                    
                    if (timeParts.length !== 2) {
                        console.log('❌ Invalid time part - expected "H:MM", got:', time);
                        console.log('❌ Time parts:', timeParts);
                        return 0;
                    }
                    
                    let hours = parseInt(timeParts[0], 10);
                    const minutes = parseInt(timeParts[1], 10);
                    
                    console.log('🔍 Raw parsing - hours string:', '"' + timeParts[0] + '"', 'minutes string:', '"' + timeParts[1] + '"');
                    console.log('🔍 Parsed integers - hours:', hours, 'minutes:', minutes);
                    console.log('🔍 Type check - hours type:', typeof hours, 'minutes type:', typeof minutes);
                    console.log('🔍 NaN check - isNaN(hours):', isNaN(hours), 'isNaN(minutes):', isNaN(minutes));
                    
                    if (isNaN(hours) || isNaN(minutes)) {
                        console.log('❌ Failed to parse time:', time, '-> hours:', hours, 'minutes:', minutes);
                        return 0;
                    }
                    
                    // Validate ranges for 12-hour format
                    console.log('🔍 Range validation - hours >= 1:', hours >= 1, 'hours <= 12:', hours <= 12, 'minutes >= 0:', minutes >= 0, 'minutes <= 59:', minutes <= 59);
                    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
                        console.log('❌ Invalid 12-hour time values - hours:', hours, 'minutes:', minutes);
                        console.log('❌ Range check failed: hours range (1-12):', (hours >= 1 && hours <= 12), 'minutes range (0-59):', (minutes >= 0 && minutes <= 59));
                        return 0;
                    }
                    
                    // Convert to 24-hour format for calculation
                    if (period.toUpperCase() === 'PM' && hours !== 12) {
                        hours = hours + 12;
                    } else if (period.toUpperCase() === 'AM' && hours === 12) {
                        hours = 0;
                    }
                    
                    const totalMinutes = hours * 60 + minutes;
                    console.log('🔍 Converted 12-hour', timeStr, 'to', totalMinutes, 'minutes since midnight');
                    return totalMinutes;
                };
                
                // Convert all times to minutes since midnight for comparison
                const currentMinutes = timeToMinutes(currentTime12);
                const openMinutes = timeToMinutes(dayHours.open);
                const closeMinutes = timeToMinutes(dayHours.close);
                
                console.log('🕐 === DETAILED TIME ANALYSIS ===');
                console.log('🕐 Day of week:', currentDay);
                console.log('🕐 Raw business hours for', currentDay, ':', JSON.stringify(dayHours, null, 2));
                console.log('🕐 Time comparison (minutes since midnight):');
                console.log('🕐   Open:', openMinutes, '(' + dayHours.open + ')');
                console.log('🕐   Current:', currentMinutes, '(' + currentTime12 + ')');
                console.log('🕐   Close:', closeMinutes, '(' + dayHours.close + ')');
                
                // Check if current time is within business hours
                let isOpen = false;
                
                if (closeMinutes > openMinutes) {
                    // Normal case: open and close on same day (e.g., 9:00 AM to 6:00 PM)
                    // Current time must be >= open time AND < close time (not <=, because at close time you're closed)
                    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
                    console.log('🕐 Normal day hours - checking if', currentMinutes, 'is between', openMinutes, 'and', closeMinutes);
                    console.log('🕐   Is current >= open?', currentMinutes >= openMinutes);
                    console.log('🕐   Is current < close?', currentMinutes < closeMinutes);
                    console.log('🕐   Final result: OPEN =', isOpen);
                } else {
                    // Overnight case: close time is next day (e.g., 10:00 PM to 2:00 AM)
                    isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
                    console.log('🕐 Overnight hours - checking if', currentMinutes, 'is after', openMinutes, 'OR before', closeMinutes);
                    console.log('🕐   Is current >= open?', currentMinutes >= openMinutes);
                    console.log('🕐   Is current < close?', currentMinutes < closeMinutes);
                    console.log('🕐   Final result: OPEN =', isOpen);
                }
                
                if (isOpen) {
                    console.log('🟢 Truck is OPEN');
                    return 'open';
                } else {
                    console.log('🔴 Truck is CLOSED (outside business hours)');
                    return 'closed';
                }
            }

            // CRITICAL DEBUG: Check if we reach data initialization section
            console.log('🔧 WEBVIEW CRITICAL: Reached data initialization section!');
            
            // Food truck data with pre-processed icons
            console.log('🔧 WEBVIEW: About to stringify sanitizedTrucks');
            let foodTrucks = [];
            try {
                foodTrucks = ${JSON.stringify(sanitizedTrucks)};
                console.log('🔧 WEBVIEW: Successfully parsed foodTrucks, count:', foodTrucks.length);
            } catch (error) {
                console.error('🔧 WEBVIEW ERROR: Failed to parse foodTrucks:', error);
                foodTrucks = [];
            }
            
            // Event data with pre-processed icons
            console.log('🔧 WEBVIEW: About to stringify events data');
            let events = [];
            try {
                const eventsData = ${JSON.stringify(sanitizedEvents)};
                console.log('🎪 WEBVIEW JSON DEBUG: Events data parsed, count:', eventsData.length);
                events = eventsData;
                console.log('🔧 WEBVIEW: Successfully parsed events, count:', events.length);
            } catch (error) {
                console.error('🔧 WEBVIEW ERROR: Failed to parse events:', error);
                events = [];
            }
            
            // Customer ping data for heatmap (Pro/All-Access only)
            console.log('🔧 WEBVIEW: About to stringify sanitizedPings');
            let customerPings = [];
            try {
                customerPings = ${JSON.stringify(sanitizedPings)};
                console.log('🔧 WEBVIEW: Successfully parsed customerPings, count:', customerPings.length);
            } catch (error) {
                console.error('🔧 WEBVIEW ERROR: Failed to parse customerPings:', error);
                customerPings = [];
            }
            
            // CRITICAL SUCCESS LOG: Confirm WebView data initialization completed
            console.log('🔧 WEBVIEW SUCCESS: Data initialization completed successfully!');
            console.log('🚛 WEBVIEW DATA: foodTrucks count:', foodTrucks.length);
            console.log('🎪 WEBVIEW DATA: events count:', events.length);
            console.log('📍 WEBVIEW DATA: customerPings count:', customerPings.length);
            if (foodTrucks.length > 0) {
                console.log('🚛 WEBVIEW SAMPLE TRUCK:', foodTrucks[0].truckName || foodTrucks[0].name);
            }
            
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
            const showHeatmapFeatures = userPlan === 'pro' || userPlan === 'all-access' || userPlan === 'event-premium';
            
            let truckMarkers = [];
            let eventMarkers = [];
            let heatmapLayer = null;
            var showHeatmap = false;
            
            // Status filter: 'all', 'hideOpen', 'hideClosed'
            var statusFilter = 'all';
            
            // User favorites from React state
            var userFavorites = new Set(${JSON.stringify(Array.from(userFavorites || new Set()))}); // From React state
            
            console.log('🚛 WEBVIEW INIT: Toggle functionality removed - showing all markers');
            console.log('❤️ WEBVIEW INIT: userFavorites =', userFavorites, 'size:', userFavorites.size);

            // Create circular icon using canvas (SIMPLIFIED for Leaflet WebView)
            const createCircularIcon = (imageUrl, size = 40) => {
                return new Promise((resolve) => {
                    console.log('🖼️ Creating circular icon for URL:', imageUrl);
                    
                    // Validate imageUrl
                    if (!imageUrl || typeof imageUrl !== 'string') {
                        console.log('❌ Invalid image URL provided to createCircularIcon');
                        resolve(null);
                        return;
                    }

                    // Handle Firebase Storage URLs with CORS-friendly transformation
                    let processedUrl = imageUrl;
                    const isFirebaseStorage = imageUrl.includes('firebasestorage.googleapis.com');
                    
                    if (isFirebaseStorage) {
                        console.log('🔥 FIREBASE STORAGE URL DETECTED');
                        console.log('🔥 Original URL:', imageUrl);
                        
                        // Check if URL already has alt=media (which it should for newer Firebase URLs)
                        if (imageUrl.includes('alt=media')) {
                            console.log('✅ URL already has alt=media parameter');
                            processedUrl = imageUrl;
                        } else {
                            // Transform Firebase Storage URL to work with CORS
                            processedUrl = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 'alt=media';
                            console.log('🔄 Added alt=media to URL');
                        }
                        console.log('🖼️ Final processed URL:', processedUrl);
                    }

                    const img = new Image();
                    // Try without crossOrigin first for WebView compatibility
                    
                    console.log('🖼️ Attempting image load without CORS restrictions...');
                    
                    img.onload = () => {
                        try {
                            console.log('🎉 SUCCESS! Direct image load worked');
                            console.log('🖼️ Image dimensions:', img.width, 'x', img.height);
                            
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = size;
                            canvas.height = size;

                            // Save the context
                            ctx.save();
                            
                            // Create circular clipping path
                            ctx.beginPath();
                            ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
                            ctx.clip();

                            // Draw the image to fill the circle
                            const aspectRatio = img.width / img.height;
                            let drawWidth = size;
                            let drawHeight = size;
                            let offsetX = 0;
                            let offsetY = 0;

                            if (aspectRatio > 1) {
                                drawHeight = size;
                                drawWidth = size * aspectRatio;
                                offsetX = (size - drawWidth) / 2;
                            } else {
                                drawWidth = size;
                                drawHeight = size / aspectRatio;
                                offsetY = (size - drawHeight) / 2;
                            }

                            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                            ctx.restore();
                            
                            // Draw black border
                            ctx.beginPath();
                            ctx.arc(size / 2, size / 2, size / 2 - 1, 0, 2 * Math.PI);
                            ctx.strokeStyle = '#000000';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                            
                            const dataUrl = canvas.toDataURL();
                            console.log('✅ Successfully created circular icon without CORS');
                            resolve(dataUrl);
                        } catch (error) {
                            console.log('❌ Canvas error:', error.message);
                            // Try with CORS as fallback
                            const corsImg = new Image();
                            corsImg.crossOrigin = 'anonymous';
                            
                            corsImg.onload = () => {
                                try {
                                    console.log('🎉 SUCCESS! CORS image load worked as fallback');
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    canvas.width = size;
                                    canvas.height = size;
                                    ctx.save();
                                    ctx.beginPath();
                                    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
                                    ctx.clip();
                                    
                                    const aspectRatio = corsImg.width / corsImg.height;
                                    let drawWidth = size, drawHeight = size, offsetX = 0, offsetY = 0;
                                    if (aspectRatio > 1) {
                                        drawHeight = size;
                                        drawWidth = size * aspectRatio;
                                        offsetX = (size - drawWidth) / 2;
                                    } else {
                                        drawWidth = size;
                                        drawHeight = size / aspectRatio;
                                        offsetY = (size - drawHeight) / 2;
                                    }
                                    
                                    ctx.drawImage(corsImg, offsetX, offsetY, drawWidth, drawHeight);
                                    ctx.restore();
                                    ctx.beginPath();
                                    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, 2 * Math.PI);
                                    ctx.strokeStyle = '#000000';
                                    ctx.lineWidth = 2;
                                    ctx.stroke();
                                    
                                    console.log('✅ Successfully created circular icon with CORS fallback');
                                    resolve(canvas.toDataURL());
                                } catch (canvasError) {
                                    console.log('❌ CORS canvas error:', canvasError.message);
                                    resolve(null);
                                }
                            };
                            
                            corsImg.onerror = () => {
                                console.log('💥 CORS fallback also failed');
                                resolve(null);
                            };
                            
                            corsImg.src = processedUrl;
                        }
                    };
                    
                    img.onerror = (error) => {
                        console.log('💥 Direct image load failed:', processedUrl);
                        console.log('💥 This is expected for Firebase Storage in WebView environment');
                        console.log('💥 Falling back to default truck icon');
                        resolve(null);
                    };
                    
                    // Add timeout to prevent hanging
                    setTimeout(() => {
                        console.log('⏰ Image loading timeout for:', processedUrl.substring(0, 50) + '...');
                        console.log('⏰ Using default icon due to timeout');
                        resolve(null);
                    }, 6000);
                    
                    console.log('🔄 Starting direct image load (no CORS)...');
                    img.src = processedUrl;
                });
            };

            // Get default truck icon based on kitchen type
            const getDefaultTruckIcon = (kitchenType) => {
                const type = (kitchenType || 'truck').toLowerCase();
                const baseStyle = 'width: 55px; height: 55px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; border: 3px solid #000000; box-shadow: 0 3px 10px rgba(0,0,0,0.4);';
                
                if (type === 'trailer') {
                    return '<div style="background: #2c6f57; ' + baseStyle + '">🚚</div>';
                } else if (type === 'cart') {
                    return '<div style="background: #4a9b6e; ' + baseStyle + '">🛒</div>';
                } else if (type === 'popup') {
                    return '<div style="background: #6b5b95; ' + baseStyle + '">🏪</div>';
                } else {
                    // Default truck icon
                    return '<div style="background: #2c6f57; ' + baseStyle + '">🚛</div>';
                }
            };

            // Create truck markers with pre-processed personalized icons
            console.log('🔧 WEBVIEW: About to define createTruckMarkers function...');
            function createTruckMarkers(trucks = foodTrucks) {
                // Define trucksToUse in function scope first
                let trucksToUse = [];
                
                try {
                    console.log('🚛 WEBVIEW: === STARTING createTruckMarkers ===');
                    console.log('🚛 WEBVIEW: Input trucks parameter:', trucks ? trucks.length : 'NULL/UNDEFINED');
                    console.log('🚛 WEBVIEW: Global foodTrucks:', foodTrucks ? foodTrucks.length : 'NULL/UNDEFINED');
                    console.log('🚛 WEBVIEW: Map object exists:', typeof map !== 'undefined');
                    
                    if (typeof map === 'undefined') {
                        console.error('🚛 WEBVIEW ERROR: Map not initialized when creating truck markers');
                        return;
                    }

                    // Log the actual truck data we're working with
                    trucksToUse = trucks || foodTrucks || [];
                    console.log('🚛 WEBVIEW: Final trucks array length:', trucksToUse.length);
                    console.log('🚛 WEBVIEW: Sample truck for debugging:', trucksToUse.length > 0 ? trucksToUse[0] : 'NO TRUCKS');
                    
                    // Clear existing markers
                    console.log('🚛 WEBVIEW: Clearing existing markers - current count:', truckMarkers.length);
                    truckMarkers.forEach(marker => map.removeLayer(marker));
                    truckMarkers = [];
                    console.log('🚛 WEBVIEW: Cleared existing markers');
                    
                    // If no trucks provided, simply return (don't create test markers)
                    if (!trucksToUse || trucksToUse.length === 0) {
                        console.log('🚛 WEBVIEW: No truck data - no markers to create');
                        return;
                    }
                    
                    console.log('🚛 WEBVIEW: Processing', trucksToUse.length, 'trucks for markers');
                } catch (error) {
                    console.error('🚛 WEBVIEW ERROR in createTruckMarkers setup:', error);
                    return;
                }

                // Use final trucks array for processing
                const trucksToProcess = trucksToUse;
                for (let i = 0; i < trucksToProcess.length; i++) {
                    const truck = trucksToProcess[i];
                    console.log('🚛 WEBVIEW: Processing truck index', i, ':', truck.truckName || truck.name || 'UNNAMED');
                    
                    try {
                    
                    // Determine status based on business hours if available
                    let truckStatus = truck.status || 'open';
                    if (truck.businessHours) {
                      truckStatus = checkTruckOpenStatus(truck.businessHours);
                    }
                    
                    const statusClass = 'status-' + truckStatus;
                    const statusEmoji = truckStatus === 'open' ? '🟢' : truckStatus === 'busy' ? '🟡' : '🔴';
                    
                    // Get the truck name and details
                    const truckName = truck.truckName || truck.name || 'Food Truck';
                    const kitchenType = truck.kitchenType || 'truck';
                    
                    console.log('🚛 WEBVIEW: Processing truck:', truckName);
                    console.log('🚛 WEBVIEW: Truck IDs - id:', truck.id, 'ownerId:', truck.ownerId);
                    console.log('🎨 WEBVIEW: Icon type:', truck.personalizedIcon ? truck.personalizedIcon.type : 'default');
                    console.log('🖼️ WEBVIEW: Has custom icon:', truck.hasCustomIcon);
                    console.log('� Truck IDs - id:', truck.id, 'ownerId:', truck.ownerId);
                    console.log('�🎨 Icon type:', truck.personalizedIcon ? truck.personalizedIcon.type : 'default');
                    console.log('🖼️ Has custom icon:', truck.hasCustomIcon);
                    
                    // Use pre-processed personalized icon
                    let iconHtml;
                    if (truck.personalizedIcon && truck.personalizedIcon.html) {
                        iconHtml = truck.personalizedIcon.html;
                        console.log('✅ Using', truck.personalizedIcon.type, 'icon for:', truckName);
                    } else {
                        // Fallback to default icon
                        iconHtml = getDefaultTruckIcon(kitchenType);
                        console.log('📦 Using default icon for:', truckName);
                    }
                    
                    // Add heart indicator if user has favorited this truck (with safety check)
                    const truckId = truck.ownerId || truck.id;
                    let isFavorited = false;
                    try {
                        isFavorited = userFavorites && typeof userFavorites.has === 'function' && userFavorites.has(truckId);
                    } catch (error) {
                        console.log('⚠️ Error checking favorites for truck', truckId, ':', error);
                        isFavorited = false;
                    }
                    
                    if (isFavorited) {
                        iconHtml = \`
                            <div style="position: relative; display: inline-block;">
                                \${iconHtml}
                                <div style="position: absolute; top: -5px; right: -5px; width: 20px; height: 20px; background: #ff6b6b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">❤️</div>
                            </div>
                        \`;
                        console.log('❤️ Added heart indicator for favorited truck:', truckName);
                    }
                    
                    const truckIcon = L.divIcon({
                        html: iconHtml,
                        iconSize: [55, 55],
                        className: 'truck-marker'
                    });

                    const lat = truck.lat || truck.latitude;
                    const lng = truck.lng || truck.longitude;
                    
                    console.log('🚛 WEBVIEW: Truck coordinates check - lat:', lat, 'lng:', lng);
                    
                    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                        console.log('⚠️ WEBVIEW: Skipping truck without valid coordinates:', truckName, 'lat:', lat, 'lng:', lng);
                        continue;
                    }

                    console.log('🚛 WEBVIEW: About to create marker for', truckName, 'at', lat, lng);
                    
                    const marker = L.marker([lat, lng], { 
                        icon: truckIcon,
                        truckData: truck  // Store truck data with marker for auto-updates
                    })
                        .addTo(map)
                        .bindPopup(\`
                            <div class="truck-popup">
                                <div class="truck-header">
                                    \${truck.base64CoverImage ? \`<img src="\${truck.base64CoverImage}" class="truck-cover-image" />\` : truck.coverUrl ? \`<img src="\${truck.coverUrl}" class="truck-cover-image" onerror="this.style.display='none'" />\` : ''}
                                    <div class="truck-name">\${truckName}</div>
                                </div>
                                <div class="truck-status \${statusClass}">\${statusEmoji} \${truckStatus.toUpperCase()}</div>
                                <div class="truck-details">\${(truck.cuisine || truck.cuisineType || truck.type || 'American').charAt(0).toUpperCase() + (truck.cuisine || truck.cuisineType || truck.type || 'American').slice(1)}</div>
                                <div class="truck-details"> Type: \${kitchenType.charAt(0).toUpperCase() + kitchenType.slice(1)}</div>
                                \${truck.popularity ? \`<div class="truck-details">⭐ Popularity: \${truck.popularity}%</div>\` : ''}
                                <button class="view-details-btn" onclick="openTruckDetails('\${truck.ownerId || truck.id}', '\${truckName}', '\${truck.cuisine || truck.cuisineType || truck.type || 'General Food'}', '\${truck.base64CoverImage || truck.coverUrl || ''}', '\${truck.menuUrl || ''}', '\${truck.instagram || ''}', '\${truck.facebook || ''}', '\${truck.twitter || ''}', '\${truck.tiktok || ''}')">
                                    📋 View Full Details
                                </button>
                            </div>
                        \`);
                    
                    truckMarkers.push(marker);
                    console.log('✅ WEBVIEW: Successfully added marker for:', truckName, 'at coordinates:', lat, lng);
                    console.log('✅ WEBVIEW: Marker added to map, total markers now:', truckMarkers.length);
                    
                    } catch (truckError) {
                        console.error('🚛 WEBVIEW ERROR processing truck:', truck.truckName || truck.name, truckError);
                    }
                }
                
                console.log('🚛 WEBVIEW: Finished creating', truckMarkers.length, 'truck markers total');
            }

            // Create event markers with pre-processed personalized icons
            function createEventMarkers(eventsToDisplay = events) {
                try {
                    console.log('🎪 Creating event markers for', eventsToDisplay.length, 'events');
                    console.log('🎪 Map object exists:', typeof map !== 'undefined');
                    
                    if (typeof map === 'undefined') {
                        console.error('🎪 ERROR: Map not initialized when creating event markers');
                        return;
                    }
                    
                    // Clear existing event markers
                    eventMarkers.forEach(marker => map.removeLayer(marker));
                    eventMarkers = [];
                } catch (error) {
                    console.error('🎪 ERROR in createEventMarkers setup:', error);
                    return;
                }

                for (const event of eventsToDisplay) {
                    const eventTitle = event.title || event.eventName || 'Event';
                    const eventStatus = event.status || 'upcoming';
                    
                    console.log('🎪 Processing event:', eventTitle);
                    console.log('🎨 Event icon type:', event.eventIcon ? event.eventIcon.type : 'default');
                    console.log('🖼️ Has custom logo:', event.hasCustomLogo);
                    
                    // Use pre-processed event icon
                    let iconHtml;
                    if (event.eventIcon && event.eventIcon.html) {
                        iconHtml = event.eventIcon.html;
                        console.log('✅ Using', event.eventIcon.type, 'icon for event:', eventTitle);
                    } else {
                        // Fallback to default event icon
                        iconHtml = '<div style="width: 50px; height: 50px; border-radius: 50%; background: #FF6B35; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; border: 3px solid #000000; box-shadow: 0 3px 10px rgba(0,0,0,0.4);">🎪</div>';
                        console.log('📦 Using default icon for event:', eventTitle);
                    }
                    
                    const eventIcon = L.divIcon({
                        html: iconHtml,
                        iconSize: [50, 50],
                        className: 'event-marker'
                    });

                    const lat = event.latitude;
                    const lng = event.longitude;
                    
                    if (!lat || !lng) {
                        console.log('⚠️ Skipping event without coordinates:', eventTitle);
                        continue;
                    }

                    // Format event dates
                    const startDate = event.startDate ? new Date(event.startDate.seconds ? event.startDate.seconds * 1000 : event.startDate) : null;
                    const endDate = event.endDate ? new Date(event.endDate.seconds ? event.endDate.seconds * 1000 : event.endDate) : null;
                    const dateStr = startDate ? startDate.toLocaleDateString() : 'Date TBD';
                    
                    // Pass raw time strings to WebView for formatting there
                    let timeStr = '';
                    if (event.time && event.endTime) {
                        timeStr = event.time + ' - ' + event.endTime;
                    } else if (event.time) {
                        timeStr = event.time;
                    }

                    const marker = L.marker([lat, lng], { icon: eventIcon })
                        .addTo(map)
                        .bindPopup(\`
                            <div class="truck-popup">
                                <div class="truck-header">
                                    \${event.base64Logo ? \`<img src="\${event.base64Logo}" class="truck-cover-image" />\` : event.organizerLogoUrl ? \`<img src="\${event.organizerLogoUrl}" class="truck-cover-image" onerror="this.style.display='none'" />\` : ''}
                                    <div class="truck-name">🎪 \${eventTitle}</div>
                                </div>
                                <div class="truck-status status-\${eventStatus}">\${eventStatus.toUpperCase()}</div>
                                <div class="truck-details">📅 \${dateStr}</div>
                                \${timeStr ? \`<div class="truck-details">🕐 \${(() => {
                                    if (timeStr.includes(' - ')) {
                                        const [start, end] = timeStr.split(' - ');
                                        return formatTime(start) + ' - ' + formatTime(end);
                                    } else {
                                        return formatTime(timeStr);
                                    }
                                })()}</div>\` : ''}
                                <div class="truck-details">📍 \${event.address || event.location || 'Location provided on registration'}</div>
                                \${event.eventType ? \`<div class="truck-details">🎯 \${event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}</div>\` : ''}
                                <button class="view-details-btn" onclick="openEventDetails('\${event.id}', '\${eventTitle}', '\${event.eventType || 'event'}', '\${event.base64Logo || event.organizerLogoUrl || ''}', '\${event.eventDescription || ''}', '\${dateStr}', '\${(() => {
                                    if (timeStr.includes(' - ')) {
                                        const [start, end] = timeStr.split(' - ');
                                        return formatTime(start) + ' - ' + formatTime(end);
                                    } else {
                                        return formatTime(timeStr);
                                    }
                                })()}', '\${event.address || event.location || ''}')">
                                    📋 View Event Details
                                </button>
                            </div>
                        \`);
                    
                    eventMarkers.push(marker);
                    console.log('✅ Added event marker for:', eventTitle, 'with icon type:', event.eventIcon ? event.eventIcon.type : 'default');
                }
                
                console.log('🎪 Finished creating', eventMarkers.length, 'event markers');
            }

            // Function to handle truck details modal (communicates with React Native)
            function openTruckDetails(truckId, truckName, cuisine, coverUrl, menuUrl, instagram, facebook, twitter, tiktok) {
                console.log('🚛 WEBVIEW: Opening truck details for:', truckName);
                console.log('🆔 WEBVIEW: Using truck ID (should be ownerId):', truckId);
                
                const socialLinks = {
                    instagram: instagram && instagram !== 'undefined' ? instagram : null,
                    facebook: facebook && facebook !== 'undefined' ? facebook : null,
                    twitter: twitter && twitter !== 'undefined' ? twitter : null,
                    tiktok: tiktok && tiktok !== 'undefined' ? tiktok : null
                };
                
                console.log('📤 WEBVIEW: Sending OPEN_TRUCK_DETAILS message with data:', {
                    id: truckId,
                    name: truckName,
                    cuisine: cuisine,
                    coverUrl: coverUrl && coverUrl !== 'undefined' ? coverUrl : null
                });
                
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

            // Format time function for WebView
            function formatTime(timeString) {
                if (!timeString || typeof timeString !== 'string') return '';
                
                try {
                    // Check if already in 12-hour format (contains AM/PM)
                    if (timeString.includes('AM') || timeString.includes('PM')) {
                        return timeString; // Already formatted, just return as-is
                    }
                    
                    // Handle 24-hour format (HH:MM)
                    const parts = timeString.split(':');
                    if (parts.length !== 2) return timeString; // Return as-is if not proper format
                    
                    const [hours, minutes] = parts;
                    const hour = parseInt(hours);
                    if (isNaN(hour)) return timeString; // Return as-is if invalid
                    
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour % 12 || 12;
                    return displayHour + ':' + minutes + ' ' + ampm;
                } catch (error) {
                    console.error('Error formatting time:', timeString, error);
                    return timeString; // Return original string if error occurs
                }
            }

            // Function to handle event details modal (communicates with React Native)
            function openEventDetails(eventId, eventTitle, eventType, logoUrl, description, dateStr, timeStr, location) {
                console.log('Opening event details for:', eventTitle);
                
                // Send message to React Native to open event details modal
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'OPEN_EVENT_DETAILS',
                    data: {
                        id: eventId,
                        title: eventTitle,
                        eventType: eventType,
                        logoUrl: logoUrl && logoUrl !== 'undefined' ? logoUrl : null,
                        description: description && description !== 'undefined' ? description : null,
                        date: dateStr,
                        time: timeStr,
                        location: location && location !== 'undefined' ? location : null
                    }
                }));
            }

            // Create heatmap from customer pings (Pro/All-Access only)
            function createHeatmap() {
                console.log('🔥 createHeatmap() called');
                console.log('🔥 showHeatmapFeatures:', showHeatmapFeatures);
                console.log('🔥 testPings.length:', testPings.length);
                console.log('🔥 excludedCuisines:', selectedCuisineType);
                
                if (!showHeatmapFeatures) {
                    console.log('❌ Heatmap blocked: Not Pro/All-Access plan');
                    return;
                }
                
                if (testPings.length === 0) {
                    console.log('❌ Heatmap blocked: No ping data available');
                    return;
                }
                
                // Filter pings by cuisine exclusions
                const filteredPings = filterPingsByCuisine(testPings, selectedCuisineType);
                console.log('🍽️ Filtered pings for heatmap:', filteredPings.length, 'of', testPings.length);
                
                const heatData = filteredPings.map(ping => {
                    const lat = Number(ping.lat || ping.latitude);
                    const lng = Number(ping.lng || ping.longitude);
                    const intensity = 0.8; // Base intensity for customer pings
                    
                    console.log('🔥 Processing ping:', { lat, lng, intensity, cuisine: ping.cuisineType });
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

            // Toggle truck status visibility
            function toggleTruckStatus() {
                console.log('🚛 toggleTruckStatus() called');
                
                try {
                    console.log('🚛 DEBUG: About to check variables...');
                    console.log('🚛 DEBUG: typeof showClosedTrucks =', typeof showClosedTrucks);
                    console.log('🚛 DEBUG: typeof showOpenTrucks =', typeof showOpenTrucks);
                    console.log('🚛 DEBUG: window.showClosedTrucks =', window.showClosedTrucks);
                    console.log('🚛 DEBUG: window.showOpenTrucks =', window.showOpenTrucks);
                    
                    // Use window variables as backup if local ones are undefined
                    const currentShowClosed = typeof showClosedTrucks !== 'undefined' ? showClosedTrucks : window.showClosedTrucks;
                    const currentShowOpen = typeof showOpenTrucks !== 'undefined' ? showOpenTrucks : window.showOpenTrucks;
                    
                    console.log('🚛 Current state - showClosedTrucks:', currentShowClosed, 'showOpenTrucks:', currentShowOpen);
                } catch (error) {
                    console.error('🚛 ERROR: Variable access failed:', error);
                    return;
                }
                
                // Use safe variables for the logic
                const currentShowClosed = typeof showClosedTrucks !== 'undefined' ? showClosedTrucks : window.showClosedTrucks;
                const currentShowOpen = typeof showOpenTrucks !== 'undefined' ? showOpenTrucks : window.showOpenTrucks;
                
                if (currentShowClosed && currentShowOpen) {
                    // Currently showing all - hide closed trucks
                    showClosedTrucks = false;
                    showOpenTrucks = true;
                    window.showClosedTrucks = false;
                    window.showOpenTrucks = true;
                    console.log('🚛 Hiding closed trucks');
                } else if (!currentShowClosed && currentShowOpen) {
                    // Currently hiding closed - hide open trucks instead
                    showClosedTrucks = true;
                    showOpenTrucks = false;
                    window.showClosedTrucks = true;
                    window.showOpenTrucks = false;
                    console.log('🚛 Hiding open trucks');
                } else if (currentShowClosed && !currentShowOpen) {
                    // Currently hiding open - Show All trucks
                    showClosedTrucks = true;
                    showOpenTrucks = true;
                    window.showClosedTrucks = true;
                    window.showOpenTrucks = true;
                    console.log('🚛 Showing all trucks');
                }
                
                // Send state update back to React Native
                if (window.ReactNativeWebView) {
                    const message = {
                        type: 'TRUCK_FILTER_CHANGED',
                        showClosedTrucks: window.showClosedTrucks,
                        showOpenTrucks: window.showOpenTrucks
                    };
                    window.ReactNativeWebView.postMessage(JSON.stringify(message));
                    console.log('🚛 Sent filter state to React Native:', message);
                }
                
                // Update button text based on current state (use window variables for consistency)
                let buttonText = '';
                
                if (window.showClosedTrucks && window.showOpenTrucks) {
                    buttonText = '🟢 Hide Closed';
                } else if (!window.showClosedTrucks && window.showOpenTrucks) {
                    buttonText = '🔴 Hide Open';
                } else if (window.showClosedTrucks && !window.showOpenTrucks) {
                    buttonText = '🟡 Show All';
                }
                
                // Update all toggle buttons (handle both the main and secondary control panels)
                const statusButtons = document.querySelectorAll('button[onclick="toggleTruckStatus()"]');
                statusButtons.forEach(button => {
                    if (button) {
                        button.innerHTML = buttonText;
                    }
                });
                
                // Apply the filter by recreating truck markers
                console.log('🚛 About to call applyTruckStatusFilter()...');
                console.log('🚛 typeof foodTrucks:', typeof foodTrucks);
                console.log('🚛 foodTrucks exists:', typeof foodTrucks !== 'undefined');
                if (typeof foodTrucks !== 'undefined' && foodTrucks !== null) {
                    console.log('🚛 foodTrucks.length:', foodTrucks.length);
                } else {
                    console.log('🚛 foodTrucks is', foodTrucks);
                }
                
                try {
                    console.log('🚛 Calling applyTruckStatusFilter() now...');
                    applyTruckStatusFilter();
                    console.log('🚛 applyTruckStatusFilter() completed successfully');
                } catch (error) {
                    console.error('🚛 ERROR in applyTruckStatusFilter():', error);
                    console.error('🚛 ERROR message:', error.message);
                    console.error('🚛 ERROR stack:', error.stack);
                }
            }
            
            // Apply truck status filtering
            function applyTruckStatusFilter() {
                // Prevent rapid filtering operations
                if (window.filteringInProgress) {
                    console.log('🚛 Filtering already in progress - skipping');
                    return;
                }
                
                window.filteringInProgress = true;
                
                console.log('🚛 === applyTruckStatusFilter() START ===');
                console.log('🚛 Applying truck status filter...');
                console.log('🚛 Current statusFilter:', statusFilter);
                
                console.log('🚛 foodTrucks available:', foodTrucks ? 'YES' : 'NO');
                console.log('🚛 foodTrucks length:', foodTrucks ? foodTrucks.length : 'N/A');
                
                if (!foodTrucks || !Array.isArray(foodTrucks)) {
                    console.error('🚛 ERROR: foodTrucks is not available or not an array:', typeof foodTrucks);
                    window.filteringInProgress = false;
                    return;
                }
                
                console.log('🚛 Starting with', foodTrucks.length, 'total trucks');
                
                // Get currently filtered trucks (considering cuisine filters)
                let filtered = foodTrucks;
                
                // Apply cuisine filter first if active
                if (selectedCuisineType.length > 0) {
                    filtered = foodTrucks.filter(truck => {
                        const truckCuisine = (
                            truck.cuisineType || 
                            truck.cuisine || 
                            truck.type || 
                            truck.cuisinetype ||
                            'food'
                        ).toLowerCase().trim();
                        
                        const shouldExclude = isCuisineExcluded(truckCuisine, selectedCuisineType);
                        return !shouldExclude;
                    });
                    console.log('🚛 After cuisine filter:', filtered.length, 'trucks');
                }
                
                // Apply status filter based on statusFilter variable
                const statusFilteredTrucks = [];
                filtered.forEach(truck => {
                    let truckStatus = truck.status || 'open';
                    
                    // Try to get business hours from truck data or owner data
                    let businessHours = truck.businessHours || truck.ownerData?.businessHours;
                    
                    // If no business hours found, treat as always open for testing
                    if (!businessHours) {
                        console.log('🚛 Truck', truck.truckName || truck.name, 'has NO business hours - treating as OPEN');
                        truckStatus = 'open';
                    } else {
                        // Calculate status from business hours
                        truckStatus = checkTruckOpenStatus(businessHours);
                        console.log('🚛 Truck', truck.truckName || truck.name, 'status calculated as:', truckStatus);
                    }
                    
                    let shouldShow = true; // Default to show
                    
                    if (statusFilter === 'hide-open') {
                        // Hide open trucks, show closed trucks
                        shouldShow = !(truckStatus === 'open' || truckStatus === 'busy');
                        console.log('🚛 HIDE-OPEN mode: Truck', truck.truckName || truck.name, 'status:', truckStatus, 'shouldShow:', shouldShow);
                    } else if (statusFilter === 'hide-closed') {
                        // Hide closed trucks, show open trucks
                        shouldShow = (truckStatus === 'open' || truckStatus === 'busy');
                        console.log('🚛 HIDE-CLOSED mode: Truck', truck.truckName || truck.name, 'status:', truckStatus, 'shouldShow:', shouldShow);
                    } else {
                        // Show all trucks (statusFilter === 'all')
                        shouldShow = true;
                        console.log('🚛 SHOW-ALL mode: Truck', truck.truckName || truck.name, 'status:', truckStatus, 'shouldShow: true');
                    }
                    
                    if (shouldShow) {
                        statusFilteredTrucks.push(truck);
                    }
                });
                
                console.log('🚛 Final result: Showing', statusFilteredTrucks.length, 'trucks after status filter');
                console.log('🚛 Trucks to show:', statusFilteredTrucks.map(t => t.truckName || t.name));
                console.log('🚛 About to call createTruckMarkers with', statusFilteredTrucks.length, 'trucks');
                createTruckMarkers(statusFilteredTrucks);
                console.log('🚛 === applyTruckStatusFilter() COMPLETE ===');
                
                // Reset the filtering flag
                window.filteringInProgress = false;
            }

            function centerOnUser() {
                map.setView([${userLat}, ${userLng}], 15);
            }

            function filterTrucks(filter) {
                let filtered = foodTrucks;
                if (filter === 'open') {
                    filtered = foodTrucks.filter(truck => {
                        let truckStatus = truck.status || 'open';
                        if (truck.businessHours) {
                            truckStatus = checkTruckOpenStatus(truck.businessHours);
                        }
                        return truckStatus === 'open' || truckStatus === 'busy';
                    });
                } else if (filter === 'cuisine') {
                    // This will be called from applyCuisineFilter with selected cuisine
                    return;
                }
                
                // Apply additional status filter
                const statusFiltered = filtered.filter(truck => {
                    let truckStatus = truck.status || 'open';
                    if (truck.businessHours) {
                        truckStatus = checkTruckOpenStatus(truck.businessHours);
                    }
                    
                    if (truckStatus === 'open' || truckStatus === 'busy') {
                        return showOpenTrucks;
                    } else if (truckStatus === 'closed') {
                        return showClosedTrucks;
                    }
                    
                    return true; // Show trucks with unknown status by default
                });
                
                createTruckMarkers(statusFiltered);
            }

            // Cuisine filtering variables
            let selectedCuisineType = ${JSON.stringify(excludedCuisines)};

            // Helper function to check if a cuisine should be excluded
            function isCuisineExcluded(cuisineType, excludedCuisines) {
                if (!cuisineType || excludedCuisines.length === 0) return false;
                
                const itemCuisine = cuisineType.toLowerCase().trim();
                console.log('🔍 Checking if cuisine should be excluded:', cuisineType, '→', itemCuisine, 'against', excludedCuisines);
                
                const isExcluded = excludedCuisines.some(excludedType => {
                    const normalizedExcluded = excludedType.toLowerCase().trim();
                    console.log('  🔍 Comparing:', itemCuisine, 'vs', normalizedExcluded);
                    
                    // Direct match
                    if (itemCuisine === normalizedExcluded) {
                        console.log('  ✅ Direct match found - EXCLUDING');
                        return true;
                    }
                    
                    // Partial match for compound cuisines
                    if (itemCuisine.includes(normalizedExcluded) || normalizedExcluded.includes(itemCuisine)) {
                        console.log('  ✅ Partial match found - EXCLUDING');
                        return true;
                    }
                    
                    // Handle common variations
                    const variations = {
                        'american': ['american', 'burgers', 'bbq'],
                        'asian': ['asian', 'asian-fusion', 'chinese', 'japanese', 'korean', 'thai', 'sushi'],
                        'mexican': ['mexican', 'latin', 'tex-mex'],
                        'italian': ['italian', 'pizza'],
                        'healthy': ['healthy', 'vegan', 'vegetarian'],
                        'desserts': ['desserts', 'dessert', 'sweets', 'ice cream'],
                        'drinks': ['drinks', 'coffee', 'beverages']
                    };
                    
                    for (const [category, variants] of Object.entries(variations)) {
                        if (variants.includes(normalizedExcluded) && variants.includes(itemCuisine)) {
                            console.log('  ✅ Variation match found - EXCLUDING');
                            return true;
                        }
                    }
                    
                    console.log('  ❌ No match found');
                    return false;
                });
                
                console.log('🔍 Final result for', cuisineType, ':', isExcluded ? 'EXCLUDED' : 'INCLUDED');
                return isExcluded;
            }

            // Filter customer pings by excluded cuisines
            function filterPingsByCuisine(pings, excludedCuisines) {
                console.log('🍽️ filterPingsByCuisine called with', pings.length, 'pings and excluded cuisines:', excludedCuisines);
                
                if (excludedCuisines.length === 0) {
                    console.log('🍽️ No exclusions - returning all pings');
                    return pings;
                }
                
                const filtered = pings.filter(ping => {
                    const pingCuisine = ping.cuisineType || ping.cuisine || 'food';
                    const shouldExclude = isCuisineExcluded(pingCuisine, excludedCuisines);
                    console.log('🍽️ Ping with cuisine', pingCuisine, ':', shouldExclude ? 'FILTERED OUT' : 'KEPT');
                    return !shouldExclude;
                });
                
                console.log('🍽️ Filtered', pings.length, '→', filtered.length, 'pings');
                return filtered;
            }

            function showCuisineSelector() {
                console.log('🍽️ Opening cuisine selector modal');
                
                // Send message to React Native to open the cuisine modal
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SHOW_CUISINE_MODAL'
                }));
            }

            function toggleStatusFilter() {
                // Get button reference first
                const button = document.getElementById('statusFilterBtn');
                
                // Prevent rapid clicking - debounce function
                if (window.statusFilterDebouncing) {
                    console.log('📊 Status filter debouncing - ignoring rapid click');
                    return;
                }
                
                window.statusFilterDebouncing = true;
                
                // Disable button temporarily to prevent rapid clicks
                if (button) {
                    button.disabled = true;
                    button.style.opacity = '0.7';
                }
                
                setTimeout(() => {
                    window.statusFilterDebouncing = false;
                    if (button) {
                        button.disabled = false;
                        button.style.opacity = '1';
                    }
                }, 500); // 500ms debounce
                
                console.log('📊 Current status filter:', statusFilter);
                
                // Cycle through: 'all' -> 'hide-open' -> 'hide-closed' -> 'all'
                if (statusFilter === 'all') {
                    statusFilter = 'hide-open';
                } else if (statusFilter === 'hide-open') {
                    statusFilter = 'hide-closed';
                } else {
                    statusFilter = 'all';
                }
                
                console.log('📊 New status filter:', statusFilter);
                
                // Update button text
                if (button) {
                    if (statusFilter === 'all') {
                        button.textContent = '📊 Show All';
                    } else if (statusFilter === 'hide-open') {
                        button.textContent = '📊 Hide Open';
                    } else if (statusFilter === 'hide-closed') {
                        button.textContent = '📊 Hide Closed';
                    }
                }
                
                // Apply the filter to trucks
                applyTruckStatusFilter();
                
                console.log('📊 Status filter toggle complete');
            }

            // CRITICAL DEBUG: Check if we reach the main initialization section
            console.log('🔧 WEBVIEW CRITICAL: Reached main initialization section!');
            console.log('🔧 WEBVIEW CRITICAL: About to start truck marker initialization...');



            // Initialize
            console.log('🚛 Initializing map with truck markers...');
            console.log('🚛 foodTrucks available during init:', foodTrucks ? 'YES' : 'NO');
            console.log('🚛 foodTrucks length during init:', foodTrucks ? foodTrucks.length : 'N/A');
            console.log('🚛 foodTrucks data:', foodTrucks);
            
            // SIMPLIFIED: Just create all truck markers without any filtering
            console.log('🚛 Creating all truck markers (no filtering)');
            console.log('🚛 DEBUG: About to create markers for trucks:', foodTrucks ? foodTrucks.length : 0);
            
            try {
                createTruckMarkers(foodTrucks || []);
                console.log('🚛 createTruckMarkers completed successfully');
            } catch (error) {
                console.error('🚛 ERROR in createTruckMarkers:', error);
            }
            
            console.log('🎪 Initializing map with event markers...');
            console.log('🎪 DEBUG: Events array length:', events.length);
            console.log('🎪 DEBUG: Events data:', events);
            console.log('🎪 DEBUG: About to call createEventMarkers()');
            try {
                createEventMarkers();
                console.log('🎪 createEventMarkers completed successfully');
            } catch (error) {
                console.error('🎪 ERROR in createEventMarkers:', error);
            }
            
            // Listen for messages from React Native using the proper WebView mechanism
            if (window.ReactNativeWebView) {
                console.log('🍽️ WebView: ReactNativeWebView detected - setting up message handler');
                
                // Override the default message handler
                window.addEventListener('message', function(event) {
                    try {
                        console.log('🍽️ WebView received raw message:', event.data);
                        const message = JSON.parse(event.data);
                        console.log('🍽️ WebView parsed message:', message.type, message);
                        handleCuisineFilterMessage(message);
                    } catch (error) {
                        console.log('🔴 Error parsing WebView message:', error);
                    }
                });
                
                // Send test message to React Native to verify connection
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'WEBVIEW_READY',
                    message: 'WebView message handler is ready'
                }));
                console.log('🍽️ Sent WEBVIEW_READY message to React Native');
            } else {
                console.log('🔴 ReactNativeWebView not found - message handling may fail');
            }
            
                // Handle message types
            function handleCuisineFilterMessage(message) {
                // Handle truck visibility updates
                if (message.type === 'updateTruckVisibility') {
                    console.log('🚚 WebView received truck visibility update:', message);
                    const ownerId = message.ownerId;
                    const visible = message.visible;
                    
                    console.log('🚚 WebView updating truck visibility for owner:', ownerId, 'to:', visible);
                    
                    // Find the truck marker by ownerId and update its visibility
                    if (truckMarkers && truckMarkers.length > 0) {
                        console.log('🚚 Checking', truckMarkers.length, 'truck markers');
                        let found = false;
                        
                        for (let i = 0; i < truckMarkers.length; i++) {
                            const marker = truckMarkers[i];
                            const truckData = marker.options && marker.options.truckData;
                            
                            console.log('🚚 Marker', i, 'data:', truckData ? 
                                      {id: truckData.id, ownerId: truckData.ownerId, name: truckData.name || truckData.truckName} : 
                                      'No truck data');
                            
                            if (truckData && (truckData.ownerId === ownerId || truckData.id === ownerId)) {
                                console.log('🚚 Found marker to update visibility:', truckData.name || truckData.truckName);
                                
                                // For Leaflet markers, we remove from map to hide, add to map to show
                                if (!visible) {
                                    marker.remove();
                                    console.log('🚚 Removed marker from map (hidden)');
                                } else {
                                    marker.addTo(map);
                                    console.log('🚚 Added marker to map (visible)');
                                }
                                
                                found = true;
                            }
                        }
                        
                        if (!found) {
                            console.log('❌ No matching truck marker found for owner ID:', ownerId);
                        }
                    } else {
                        console.log('❌ No truck markers found (truckMarkers array is empty or undefined)');
                    }
                    
                    return;
                }
                
                // Handle cuisine filter
                if (message.type === 'APPLY_CUISINE_FILTER') {
                    const cuisineType = message.cuisineType;
                    console.log('🍽️ Applying cuisine filter:', cuisineType);
                    console.log('🍽️ Type of cuisineType:', typeof cuisineType);
                    console.log('🍽️ Array.isArray(cuisineType):', Array.isArray(cuisineType));
                    
                    selectedCuisineType = cuisineType;                    // Filter out excluded cuisines (show all by default, hide deselected)
                    let filtered = foodTrucks;
                    if (cuisineType.length > 0) {
                        console.log('🍽️ Filtering food trucks with exclusions:', cuisineType);
                        filtered = foodTrucks.filter(truck => {
                            // Multiple field checks for better compatibility
                            const truckCuisine = (
                                truck.cuisineType || 
                                truck.cuisine || 
                                truck.type || 
                                truck.cuisinetype ||
                                'food'
                            ).toLowerCase().trim();
                            
                            // Check if truck cuisine is NOT in excluded list
                            const shouldExclude = isCuisineExcluded(truckCuisine, cuisineType);
                            console.log('🚛 Truck', truck.truckName || truck.name, 'cuisine:', truckCuisine, '→', shouldExclude ? 'EXCLUDED' : 'INCLUDED');
                            return !shouldExclude;
                        });
                    }
                    
                    console.log('🍽️ Filtered', filtered.length, 'trucks (excluded cuisines:', cuisineType, ')');
                    console.log('🍽️ Available truck cuisines:', foodTrucks.map(t => ({
                        name: t.truckName || t.name,
                        cuisine: t.cuisineType || t.cuisine || t.type || 'unknown'
                    })));
                    
                    // Apply additional truck status filter
                    const statusFiltered = filtered.filter(truck => {
                        let truckStatus = truck.status || 'open';
                        if (truck.businessHours) {
                            truckStatus = checkTruckOpenStatus(truck.businessHours);
                        }
                        
                        if (truckStatus === 'open' || truckStatus === 'busy') {
                            return showOpenTrucks;
                        } else if (truckStatus === 'closed') {
                            return showClosedTrucks;
                        }
                        
                        return true; // Show trucks with unknown status by default
                    });
                    
                    console.log('🚛 Applied status filter: showing', statusFiltered.length, 'of', filtered.length, 'trucks');
                    createTruckMarkers(statusFiltered);
                    
                    // Also filter events (events don't typically have cuisine types, so Show All for now)
                    console.log('🎪 Applying filter to events (showing all events regardless of cuisine filter)');
                    createEventMarkers(events);
                    
                    // Also update heatmap and ping markers with cuisine filter
                    if (showHeatmapFeatures) {
                        console.log('🔥 Recreating heatmap with cuisine filter');
                        createHeatmap();
                    } else {
                        console.log('📍 Recreating individual ping markers with cuisine filter');
                        // Clear existing ping markers
                        map.eachLayer(function(layer) {
                            if (layer.options && layer.options.icon && 
                                layer.options.icon.options && 
                                layer.options.icon.options.className === 'ping-marker') {
                                map.removeLayer(layer);
                            }
                        });
                        
                        // Add filtered ping markers for basic users
                        const realPings = ${JSON.stringify(customerPings)};
                        console.log('📍 Raw pings before filtering:', realPings.length);
                        console.log('📍 Sample ping data:', realPings.slice(0, 3).map(p => ({cuisine: p.cuisineType, user: p.username})));
                        
                        const filteredPings = filterPingsByCuisine(realPings, selectedCuisineType);
                        console.log('📍 Adding', filteredPings.length, 'filtered ping markers (of', realPings.length, 'total)');
                        
                        filteredPings.forEach((ping, index) => {
                            if (ping.lat && ping.lng) {
                                const marker = L.marker([ping.lat, ping.lng], {
                                    icon: L.divIcon({
                                        className: 'ping-marker',
                                        html: '<div style="background: #9b59b6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 12px;">📍</div>',
                                        iconSize: [20, 20],
                                        iconAnchor: [10, 10]
                                    })
                                });
                                
                                // Add popup with ping info including cuisine
                                const popupContent = \`
                                    <div style="text-align: center; padding: 5px;">
                                        <strong>Customer Ping</strong><br>
                                        <small>Cuisine: \${ping.cuisineType || 'Not specified'}</small><br>
                                        <small>User: \${ping.username || 'Anonymous'}</small>
                                    </div>
                                \`;
                                marker.bindPopup(popupContent);
                                marker.addTo(map);
                                console.log('📍 Added filtered ping marker for', ping.cuisineType);
                            }
                        });
                    }
                }
            }
            
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
                console.log('📋 Basic plan user - showing individual ping markers');
                
                // Add individual ping markers for basic users (with cuisine filtering)
                const realPings = ${JSON.stringify(customerPings)};
                const filteredPings = filterPingsByCuisine(realPings, selectedCuisineType);
                console.log('📍 Adding', filteredPings.length, 'filtered individual ping markers (of', realPings.length, 'total)');
                
                filteredPings.forEach((ping, index) => {
                    if (ping.lat && ping.lng) {
                        const marker = L.marker([ping.lat, ping.lng], {
                            icon: L.divIcon({
                                className: 'ping-marker',
                                html: '<div style="background: #9b59b6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 12px;">📍</div>',
                                iconSize: [20, 20],
                                iconAnchor: [10, 10]
                            })
                        }).addTo(map);
                        
                        const popupContent = \`
                            <div style="font-family: Arial, sans-serif; min-width: 200px;">
                                <h4 style="margin: 0 0 8px 0; color: #9b59b6;">🍴 Customer Ping</h4>
                                <p style="margin: 4px 0;"><strong>Cuisine:</strong> \${ping.cuisineType || 'Not specified'}</p>
                                <p style="margin: 4px 0;"><strong>Customer:</strong> \${ping.username || 'Anonymous'}</p>
                                <p style="margin: 4px 0;"><strong>Address:</strong> \${ping.address || 'Not provided'}</p>
                                <p style="margin: 4px 0;"><strong>Time:</strong> \${ping.timestamp ? new Date(ping.timestamp.seconds * 1000).toLocaleString() : 'Unknown'}</p>
                            </div>
                        \`;
                        
                        marker.bindPopup(popupContent);
                        console.log('📍 Added ping marker', index + 1, 'at', ping.lat, ping.lng, 'for cuisine:', ping.cuisineType);
                    }
                });
                
                console.log('✅ Finished adding individual ping markers for basic user');
            }

            // Real-time status update system
            function updateTruckStatuses() {
                console.log('🕐 Checking truck statuses for real-time updates...');
                let statusChanged = false;
                
                // Update each truck marker with current status
                truckMarkers.forEach((marker) => {
                    // Get truck data stored in marker options
                    const truck = marker.options.truckData;
                    if (truck && truck.businessHours) {
                        const currentStatus = checkTruckOpenStatus(truck.businessHours);
                        const previousStatus = truck.status || 'open';
                        
                        if (currentStatus !== previousStatus) {
                            console.log('🔄 Status changed for', truck.truckName || truck.name, ':', previousStatus, '→', currentStatus);
                            
                            // Update truck object status
                            truck.status = currentStatus;
                            
                            // Also update the original truck object in the foodTrucks array
                            const originalTruck = foodTrucks.find(t => t.id === truck.id);
                            if (originalTruck) {
                                originalTruck.status = currentStatus;
                            }
                            
                            statusChanged = true;
                            
                            // Update popup content with new status
                            const statusClass = 'status-' + currentStatus;
                            const statusEmoji = currentStatus === 'open' ? '🟢' : currentStatus === 'busy' ? '🟡' : '🔴';
                            const truckName = truck.truckName || truck.name || 'Food Truck';
                            const kitchenType = truck.kitchenType || 'truck';
                            
                            const updatedPopupContent = \`
                                <div class="truck-popup">
                                    <div class="truck-header">
                                        \${truck.base64CoverImage ? \`<img src="\${truck.base64CoverImage}" class="truck-cover-image" />\` : truck.coverUrl ? \`<img src="\${truck.coverUrl}" class="truck-cover-image" onerror="this.style.display='none'" />\` : ''}
                                        <div class="truck-name">\${truckName}</div>
                                    </div>
                                    <div class="truck-status \${statusClass}">\${statusEmoji} \${currentStatus.toUpperCase()}</div>
                                    <div class="truck-details">🍽️ \${(truck.cuisine || truck.cuisineType || truck.type || 'General Food').charAt(0).toUpperCase() + (truck.cuisine || truck.cuisineType || truck.type || 'General Food').slice(1)}</div>
                                    <div class="truck-details">📱 Kitchen: \${kitchenType.charAt(0).toUpperCase() + kitchenType.slice(1)}</div>
                                    \${truck.popularity ? \`<div class="truck-details">⭐ Popularity: \${truck.popularity}%</div>\` : ''}
                                    <button class="view-details-btn" onclick="openTruckDetails('\${truck.id}', '\${truckName}', '\${truck.cuisine || truck.cuisineType || truck.type || 'General Food'}', '\${truck.base64CoverImage || truck.coverUrl || ''}', '\${truck.menuUrl || ''}', '\${truck.instagram || ''}', '\${truck.facebook || ''}', '\${truck.twitter || ''}', '\${truck.tiktok || ''}')">
                                        📋 View Full Details
                                    </button>
                                </div>
                            \`;
                            
                            // Update the marker's popup content
                            marker.setPopupContent(updatedPopupContent);
                        }
                    }
                });
                
                if (statusChanged) {
                    console.log('✅ Truck statuses updated successfully');
                    
                    // Notify React Native about status changes
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'TRUCK_STATUS_UPDATED',
                            message: 'One or more truck statuses have been updated based on current time'
                        }));
                    }
                }
            }
            
            // Set up automatic status checking every minute
            console.log('⏰ Setting up automatic truck status updates (every 60 seconds)');
            setInterval(updateTruckStatuses, 60000); // Check every minute
            
            // Also check immediately after 30 seconds to catch recent changes
            setTimeout(updateTruckStatuses, 30000);

            // Create initial markers AFTER all functions are defined
            console.log('🚀 Creating initial markers...');
            console.log('🚀 foodTrucks data available:', typeof foodTrucks, 'length:', foodTrucks ? foodTrucks.length : 'N/A');
            console.log('🚀 events data available:', typeof events, 'length:', events ? events.length : 'N/A');
            console.log('🚀 Sample foodTrucks data:', foodTrucks && foodTrucks.length > 0 ? foodTrucks[0] : 'No trucks');
            console.log('🚀 Sample events data:', events && events.length > 0 ? events[0] : 'No events');
            
            // Call marker creation functions with error handling
            try {
                createTruckMarkers(foodTrucks);
                console.log('✅ Truck markers creation completed');
            } catch (error) {
                console.error('❌ Error creating truck markers:', error);
            }
            
            try {
                createEventMarkers(events);
                console.log('✅ Event markers creation completed');
            } catch (error) {
                console.error('❌ Error creating event markers:', error);
            }
            
            console.log('✅ Initial markers creation process finished');

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
          <Text style={styles.title}>Map - Location Access</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Text style={styles.subtitle}>Please enable location permissions to use automatic geolocation</Text>
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
            {userPlan === 'basic' ? ' Auto Location' : ' Auto Location + Heatmaps'}
          </Text>
        </View>
      </View>
    );
  }

  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      // Forward WebView console messages to React Native console
      if (message.type === 'CONSOLE_LOG') {
        const prefix = message.level === 'ERROR' ? '🔴 WEBVIEW ERROR:' : '🟦 WEBVIEW:';
        console.log(`${prefix} ${message.message}`);
        return;
      }
      
      // Handle WebView ready message for debugging
      if (message.type === 'WEBVIEW_READY') {
        console.log('✅ WebView is ready and can receive messages:', message.message);
        setWebViewReady(true);
        
        // Apply any pending cuisine filter
        if (pendingCuisineFilter !== null) {
          console.log('🍽️ Applying pending cuisine filter:', pendingCuisineFilter);
          const filterMessage = {
            type: 'APPLY_CUISINE_FILTER',
            cuisineType: pendingCuisineFilter
          };
          
          webViewRef.current?.postMessage(JSON.stringify(filterMessage));
          setPendingCuisineFilter(null);
        }
        return;
      }
      
      if (message.type === 'OPEN_TRUCK_DETAILS') {
        const { id, name, cuisine, coverUrl, menuUrl, socialLinks } = message.data;
        
        console.log('🚛 TRUCK DETAILS: Opening modal for truck:', {
          id,
          name, 
          cuisine,
          coverUrl: coverUrl ? 'Present' : 'Missing',
          menuUrl: menuUrl ? 'Present' : 'Missing'
        });
        
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
        
        const truckData = {
          name,
          cuisine,
          coverUrl,
          menuUrl,
          socialLinks,
          activeSocials,
          socialText,
          ownerId: id
        };
        
        console.log('🍽️ MENU DEBUG: Setting selected truck with ownerId:', id);
        console.log('🍽️ MENU DEBUG: This will trigger menu loading for ownerId:', id);
        
        setSelectedTruck(truckData);
        setShowMenuModal(true);
        // Load drops for this truck (for both customers and owners)
        loadTruckDrops(id);
      } else if (message.type === 'OPEN_EVENT_DETAILS') {
        const { id, title, eventType, logoUrl, description, date, time, location } = message.data;
        
        console.log('🎪 Opening event details modal for:', title);
        
        // Show event details alert
        Alert.alert(
          `🎪 ${title}`,
          `${description ? description + '\n\n' : ''}📅 Date: ${date}${time ? `\n🕐 Time: ${time}` : ''}${location ? `\n📍 Location: ${location}` : ''}${eventType ? `\n🎯 Type: ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}` : ''}`,
          [
            { text: 'Close', style: 'cancel' },
            { text: 'More Info', onPress: () => console.log('Event details requested for:', id) }
          ]
        );
      } else if (message.type === 'SHOW_CUISINE_MODAL') {
        console.log('🍽️ Opening cuisine modal from WebView');
        console.log('🍽️ Current showCuisineModal state:', showCuisineModal);
        setShowCuisineModal(true);
        console.log('🍽️ Called setShowCuisineModal(true)');
      } else if (message.type === 'TRUCK_FILTER_CHANGED') {
        // Handle truck status filter state changes from WebView
        console.log('🚛 Received truck filter update from WebView:', message);
        // NOTE: Not updating React state to prevent map regeneration - WebView handles filtering internally
        console.log('🚛 WebView filter state - showClosed:', message.showClosedTrucks, 'showOpen:', message.showOpenTrucks, '(not updating React state)');
      }
    } catch (error) {
      console.log('Error parsing WebView message:', error);
    }
  };

  // Handle cuisine filter application
  const handleApplyCuisineFilter = () => {
    console.log('🍽️ Applying cuisine exclusion filter from React Native:', excludedCuisines);
    console.log('🍽️ WebView ref current exists:', !!webViewRef.current);
    console.log('🍽️ WebView ready state:', webViewReady);
    
    const message = {
      type: 'APPLY_CUISINE_FILTER',
      cuisineType: excludedCuisines
    };
    
    // Always try to send immediately first
    if (webViewRef.current) {
      console.log('🍽️ Sending message immediately (WebView ref exists):', JSON.stringify(message));
      try {
        webViewRef.current.postMessage(JSON.stringify(message));
        console.log('🍽️ Message sent successfully');
        // Clear any pending filter since we sent it
        setPendingCuisineFilter(null);
      } catch (error) {
        console.log('🔴 Error sending message:', error);
        console.log('🔄 Storing filter as pending due to send error');
        setPendingCuisineFilter(excludedCuisines);
      }
    } else {
      console.log('🔄 WebView ref null, storing filter for later application');
      setPendingCuisineFilter(excludedCuisines);
    }
    
    setShowCuisineModal(false);
  };

  // Handle cuisine selection (exclusion-based logic)
  const handleCuisineSelect = (cuisineId) => {
    if (cuisineId === 'all') {
      // "All Cuisines" - clear all exclusions (show everything)
      setExcludedCuisines([]);
    } else {
      setExcludedCuisines(prev => {
        if (prev.includes(cuisineId)) {
          // Remove from excluded list (show this cuisine)
          return prev.filter(id => id !== cuisineId);
        } else {
          // Add to excluded list (hide this cuisine)
          return [...prev, cuisineId];
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image 
          source={require('../../assets/grubana-logo-tshirt.png')} 
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>
      
      <WebView
        ref={webViewRef}
        source={{ html: mapHTML }}
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
      
      {/* Truck Visibility Toggle (Food Truck Owners Only) */}
      {userRole === 'owner' && (
        <View style={styles.ownerControlsContainer}>
          <TouchableOpacity
            style={styles.truckToggleButton}
            onPress={async () => {
              try {
                const newVisibility = !showTruckIcon;
                console.log('🚚 Toggling truck visibility from', showTruckIcon, 'to', newVisibility);
                console.log('🔄 CRITICAL FIX: Force updating truck visibility in WebView');
                
                // Update local state first
                setShowTruckIcon(newVisibility);
                
                // Update database
                await updateTruckVisibility(newVisibility);
                await updateLastActivity(); // Update activity when user interacts
                
                // Force map refresh by sending direct message to WebView
                if (webViewRef.current) {
                  console.log('🔄 DIRECT WEBVIEW MESSAGE: Forcing visibility update via WebView message');
                  const message = {
                    type: 'updateTruckVisibility',
                    ownerId: user.uid,
                    visible: newVisibility
                  };
                  webViewRef.current.postMessage(JSON.stringify(message));
                  
                  // Truck visibility updates are now handled entirely through WebView messages
                  console.log('🔄 Truck visibility update sent to WebView, no map regeneration needed');
                } else {
                  console.log('❌ WebView reference not available for direct message');
                }
                
                console.log('🚚 Truck visibility toggle completed successfully:', newVisibility);
              } catch (error) {
                console.error('❌ Error toggling truck visibility:', error);
                // Revert state on error
                setShowTruckIcon(!showTruckIcon);
              }
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.toggleContainer, { backgroundColor: showTruckIcon ? '#4CAF50' : '#757575' }]}>
              <Ionicons 
                name={showTruckIcon ? 'car' : 'car-outline'} 
                size={18} 
                color="white" 
              />
              <Text style={styles.toggleText}>
                {showTruckIcon ? 'Hide Truck' : 'Show Truck'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Visibility Info Text */}
          <Text style={styles.visibilityInfoText}>
            💡 Your truck icon stays visible to customers even when you log out, unless "Hide Truck" is enabled
          </Text>
        </View>
      )}
  
      {/* Food Truck Menu Modal */}
      <Modal
        visible={showMenuModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowMenuModal(false);
          setShowCateringModal(false); // Reset catering modal when truck modal closes
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                console.log('Close button pressed!');
                setShowMenuModal(false);
                setTruckDrops([]); // Clear drops when modal closes
                setShowCateringModal(false); // Reset catering modal when truck modal closes
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                🚚 {selectedTruck?.name || 'Business'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {getCuisineDisplayName(selectedTruck?.cuisine)} Cuisine
              </Text>
            </View>
            
            <View style={styles.headerButtonsContainer}>
              {/* Quick Menu Button - Show for all trucks */}
              <TouchableOpacity 
                style={styles.quickMenuButton}
                onPress={() => scrollToMenuSection()}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="restaurant" 
                  size={20} 
                  color="#2c6f57" 
                />
                <Text style={styles.quickMenuButtonText}>Menu</Text>
              </TouchableOpacity>
              
              {/* Favorite Button - Show for all customers */}
              {userRole === 'customer' && selectedTruck?.ownerId && (
                <TouchableOpacity 
                  style={[
                    styles.favoriteButton,
                    userFavorites.has(selectedTruck.ownerId) ? styles.favoriteButtonActive : styles.favoriteButtonInactive
                  ]}
                  onPress={() => {
                    const truckId = selectedTruck.ownerId;
                    const truckName = selectedTruck.name || 'Food Truck';
                    console.log('❤️ Favorite button pressed for truck:', truckName);
                    toggleFavorite(truckId, truckName);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={userFavorites.has(selectedTruck.ownerId) ? "heart" : "heart-outline"} 
                    size={20} 
                    color={userFavorites.has(selectedTruck.ownerId) ? "#ff6b6b" : "#2c6f57"} 
                  />
                  <Text style={[
                    styles.favoriteButtonText,
                    userFavorites.has(selectedTruck.ownerId) ? styles.favoriteButtonTextActive : styles.favoriteButtonTextInactive
                  ]}>
                    {userFavorites.has(selectedTruck.ownerId) ? 'Favorited' : 'Favorite'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Cart Button */}
              <TouchableOpacity 
                style={[
                  styles.cartButton,
                  getTotalItems() > 0 ? styles.cartButtonActive : styles.cartButtonInactive
                ]}
                onPress={() => {
                  console.log('🛒 Cart button pressed! Current cart items:', cart.length);
                  console.log('🛒 Opening cart modal...');
                  setShowCartModal(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.cartButtonContent}>
                  <View style={styles.cartIconContainer}>
                    <Ionicons 
                      name="cart" 
                      size={22} 
                      color="#fff" 
                      style={styles.cartIcon}
                    />
                    {getTotalItems() > 0 && (
                      <View style={styles.cartBadge}>
                        <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cartButtonText}>Pre-order Cart</Text>
                </View>
              </TouchableOpacity>
              
              {/* Book Truck for Catering Button - Show for all trucks */}
              <TouchableOpacity 
                style={styles.cateringButton}
                onPress={() => {
                  console.log('🎉 Catering button pressed for truck:', selectedTruck?.name);
                  setShowCateringModal(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="calendar" 
                  size={20} 
                  color="#2c6f57" 
                />
                <Text style={styles.cateringButtonText}>Book Catering</Text>
              </TouchableOpacity>

              {/* Book Festival Button - Show only for event organizers */}
              {userRole === 'event-organizer' && (
                <TouchableOpacity 
                  style={[styles.cateringButton, styles.festivalButton]}
                  onPress={() => {
                    console.log('🎪 Festival booking button pressed for truck:', selectedTruck?.name);
                    setFestivalFormData(prev => ({
                      ...prev,
                      organizerName: userData?.organizationName || userData?.username || '',
                      organizerEmail: userData?.email || '',
                      organizerPhone: userData?.phone || '',
                    }));
                    setShowFestivalModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name="musical-notes" 
                    size={20} 
                    color="#7c2d12" 
                  />
                  <Text style={[styles.cateringButtonText, styles.festivalButtonText]}>Book Festival</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView ref={modalScrollViewRef} style={styles.modalContent}>
            {/* Truck Info Section */}
            <View style={styles.truckInfoSection}>
              {selectedTruck?.coverUrl && (
                <View style={styles.coverPhotoSection}>
                  <Text style={styles.sectionTitle}>📸 Cover Photo</Text>
                  <View style={[
                    styles.coverImageContainer,
                    imageAspectRatio && {
                      aspectRatio: imageAspectRatio,
                      maxHeight: 400,
                      minHeight: undefined
                    }
                  ]}>
                    {loadingImageSize && (
                      <ActivityIndicator size="small" color="#666" style={styles.imageLoadingIndicator} />
                    )}
                    <Image 
                      source={{ uri: selectedTruck.coverUrl }} 
                      style={[
                        styles.coverImage,
                        imageAspectRatio && {
                          aspectRatio: imageAspectRatio,
                          height: undefined,
                          minHeight: undefined,
                          maxHeight: undefined
                        }
                      ]}
                      onError={(error) => console.log('Cover image load error:', error)}
                      onLoad={() => console.log('✅ Cover image loaded successfully')}
                    />
                  </View>
                </View>
              )}
              
              {/* Menu Image Section */}
              {selectedTruck?.menuUrl && (
                <View style={styles.menuImageSection}>
                  <Text style={styles.sectionTitle}>📋 Menu</Text>
                  <TouchableOpacity 
                    style={styles.menuImageContainer}
                    onPress={() => {
                      // Open full-screen menu viewer
                      Alert.alert(
                        'Menu Options',
                        'What would you like to do?',
                        [
                          { text: 'View Full Size', onPress: () => openFullScreenMenu() },
                          { text: 'Share Menu', onPress: () => shareMenu() },
                          { text: 'Cancel', style: 'cancel' }
                        ]
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Image 
                      source={{ uri: selectedTruck.menuUrl }} 
                      style={styles.menuImage}
                      resizeMode="contain"
                      onError={(error) => console.log('Menu image load error:', error)}
                      onLoad={() => console.log('✅ Menu image loaded successfully')}
                    />
                    <View style={styles.menuImageOverlay}>
                      <Ionicons name="expand" size={24} color="#fff" />
                      <Text style={styles.menuImageOverlayText}>Tap to view full menu</Text>
                    </View>
                  </TouchableOpacity>
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

            {/* Drops Section - Only for truck owners viewing their own truck */}
            {userRole === 'owner' && selectedTruck?.ownerId === user?.uid && (
              <View style={styles.dropsSection}>
                <View style={styles.dropsTitleContainer}>
                  <Text style={styles.sectionTitle}>🎁 Exclusive Deal Drops</Text>
                </View>
                <View style={styles.dropsButtonContainer}>
                  <TouchableOpacity 
                    style={styles.createDropButton}
                    onPress={() => setShowDropForm(!showDropForm)}
                    disabled={creatingDrop}
                  >
                    <Ionicons 
                      name={showDropForm ? "remove-circle" : "add-circle"} 
                      size={20} 
                      color="#fff" 
                    />
                    <Text style={styles.createDropButtonText}>
                      {showDropForm ? 'Cancel' : 'Create Drop'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {dropCreationMessage ? (
                  <View style={styles.dropMessageContainer}>
                    <Text style={[
                      styles.dropMessage,
                      { color: dropCreationMessage.includes('successfully') ? '#4CAF50' : '#e74c3c' }
                    ]}>
                      {dropCreationMessage}
                    </Text>
                  </View>
                ) : null}

                {showDropForm && (
                  <View style={styles.dropForm}>
                    <Text style={styles.dropFormTitle}>Create New Drop</Text>
                    
                    <Text style={styles.dropFieldLabel}>Title *</Text>
                    <View style={styles.dropInputContainer}>
                      <TextInput
                        style={styles.dropInput}
                        value={dropFormData.title}
                        onChangeText={(value) => handleDropFormChange('title', value)}
                        placeholder="Enter drop title"
                        placeholderTextColor="#999"
                        maxLength={50}
                      />
                    </View>

                    <Text style={styles.dropFieldLabel}>Description *</Text>
                    <View style={styles.dropInputContainer}>
                      <TextInput
                        style={[styles.dropInput, styles.dropTextArea]}
                        value={dropFormData.description}
                        onChangeText={(value) => handleDropFormChange('description', value)}
                        placeholder="Describe your exclusive drop"
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={3}
                        maxLength={200}
                      />
                    </View>

                    <View style={styles.dropRowInputs}>
                      <View style={styles.dropHalfInput}>
                        <Text style={styles.dropFieldLabel}>Quantity</Text>
                        <View style={styles.dropInputContainer}>
                          <TextInput
                            style={styles.dropInput}
                            value={dropFormData.quantity.toString()}
                            onChangeText={(value) => handleDropFormChange('quantity', value)}
                            placeholder="10"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      <View style={styles.dropHalfInput}>
                        <Text style={styles.dropFieldLabel}>Expires (min)</Text>
                        <View style={styles.dropInputContainer}>
                          <TextInput
                            style={styles.dropInput}
                            value={dropFormData.expiresInMinutes.toString()}
                            onChangeText={(value) => handleDropFormChange('expiresInMinutes', value)}
                            placeholder="60"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={[styles.submitDropButton, creatingDrop && styles.submitDropButtonDisabled]}
                      onPress={createDrop}
                      disabled={creatingDrop || !location}
                    >
                      {creatingDrop ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.submitDropButtonText}>Create Drop</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Display existing drops for owners */}
                {console.log("🎁 DEBUG: truckDrops.length =", truckDrops.length, "userRole =", userRole, "selectedTruck?.ownerId =", selectedTruck?.ownerId, "user?.uid =", user?.uid)}
                {truckDrops.length > 0 && (
                  <View style={styles.ownerDropsList}>
                    <Text style={styles.ownerDropsTitle}>Your Active Drops</Text>
                    {truckDrops.map((drop) => (
                      <View key={drop.id} style={styles.ownerDropCard}>
                        <View style={styles.ownerDropHeader}>
                          <Text style={styles.ownerDropTitle}>{drop.title}</Text>
                          <Text style={styles.ownerDropExpiry}>
                            Expires: {drop.expiresAt?.toDate().toLocaleString()}
                          </Text>
                        </View>
                        
                        <Text style={styles.ownerDropDescription}>{drop.description}</Text>
                        
                        <View style={styles.ownerDropStats}>
                          <View style={styles.ownerDropStat}>
                            <Text style={styles.ownerDropStatLabel}>Total Quantity</Text>
                            <Text style={styles.ownerDropStatValue}>{drop.quantity || 0}</Text>
                          </View>
                          <View style={styles.ownerDropStat}>
                            <Text style={styles.ownerDropStatLabel}>Claimed</Text>
                            <Text style={styles.ownerDropStatValue}>{drop.claimedBy?.length || 0}</Text>
                          </View>
                          <View style={styles.ownerDropStat}>
                            <Text style={styles.ownerDropStatLabel}>Remaining</Text>
                            <Text style={styles.ownerDropStatValue}>
                              {(drop.quantity || 0) - (drop.claimedBy?.length || 0)}
                            </Text>
                          </View>
                        </View>
                        
                        {(drop.claimedBy?.length || 0) > 0 && (
                          <TouchableOpacity 
                            style={styles.viewCodesButton}
                            onPress={() => {
                              console.log("🔗 View Claim Codes button pressed for drop:", drop.id);
                              console.log("🔗 Current showClaimCodesModal state:", showClaimCodesModal);
                              
                              if (showClaimCodesModal) {
                                // Modal is already open, close it
                                console.log("🔗 Modal is open, closing it");
                                setShowClaimCodesModal(false);
                              } else {
                                // Modal is closed, open it
                                console.log("🔗 Modal is closed, opening it");
                                fetchClaimCodes(drop.id);
                                setShowClaimCodesModal(true);
                              }
                              console.log("🔗 Button press action completed");
                            }}
                          >
                            <Ionicons name="code-slash" size={16} color="#fff" />
                            <Text style={styles.viewCodesButtonText}>
                              View Claim Codes ({drop.claimedBy?.length || 0})
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Customer Drops Section - Only for customers, event organizers, or owners viewing other trucks */}
            {(userRole === 'customer' || userRole === 'event-organizer' || (userRole === 'owner' && selectedTruck?.ownerId !== user?.uid)) && (
              <View style={styles.customerDropsSection}>
                <View style={styles.dropsTitleContainer}>
                  <Text style={styles.sectionTitle}>🎁 Exclusive Deal Drops</Text>
                  {loadingDrops && (
                    <Text style={styles.loadingText}>Loading...</Text>
                  )}
                </View>

                {/* Show claimed drop with code if user has one */}
                {claimedDrop && claimCode && (
                  <View style={styles.claimedDropCard}>
                    <Text style={styles.claimedDropTitle}>✅ You claimed: {claimedDrop.title}</Text>
                    <Text style={styles.claimedDropText}>Show this code at the truck:</Text>
                    <Text style={styles.claimCode}>{claimCode}</Text>
                    <Text style={styles.claimedDropExpires}>
                      Expires: {claimedDrop.expiresAt?.toDate().toLocaleString()}
                    </Text>
                  </View>
                )}

                {claimMessage ? (
                  <View style={styles.claimMessageContainer}>
                    <Text style={[
                      styles.claimMessage,
                      { color: claimMessage.includes('successfully') ? '#4CAF50' : '#e74c3c' }
                    ]}>
                      {claimMessage}
                    </Text>
                  </View>
                ) : null}

                {!loadingDrops && truckDrops.length === 0 && (
                  <View style={styles.noDropsContainer}>
                    <Text style={styles.noDropsText}>No active drops available</Text>
                  </View>
                )}

                {truckDrops.length > 0 && (
                  <View style={styles.dropsContainer}>
                    {truckDrops.map((drop) => (
                      <View key={drop.id} style={styles.dropCard}>
                        <Text style={styles.dropTitle}>{drop.title}</Text>
                        <Text style={styles.dropDescription}>{drop.description}</Text>
                        <View style={styles.dropDetailsRow}>
                          <Text style={styles.dropDetail}>
                            Quantity: {drop.quantity}
                          </Text>
                          <Text style={styles.dropDetail}>
                            Claimed: {drop.claimedBy?.length || 0}
                          </Text>
                        </View>
                        <View style={styles.dropDetailsRow}>
                          <Text style={styles.dropDetail}>
                            Remaining: {Math.max((drop.quantity || 0) - (drop.claimedBy?.length || 0), 0)}
                          </Text>
                          <Text style={styles.dropDetail}>
                            Expires: {drop.expiresAt?.toDate().toLocaleTimeString()}
                          </Text>
                        </View>
                        {user && (
                          <TouchableOpacity
                            style={[
                              styles.claimDropButton,
                              (hasUserClaimedDrop(drop.id) || 
                               (drop.claimedBy?.length || 0) >= (drop.quantity || 0) ||
                               Boolean(claimedDrop)) // Disable if user already has an active claim
                                ? styles.claimDropButtonDisabled 
                                : styles.claimDropButtonActive
                            ]}
                            onPress={() => handleClaimDrop(drop.id)}
                            disabled={
                              hasUserClaimedDrop(drop.id) || 
                              (drop.claimedBy?.length || 0) >= (drop.quantity || 0) ||
                              Boolean(claimedDrop) // Disable if user already has an active claim
                            }
                          >
                            <Text style={[
                              styles.claimDropButtonText,
                              (hasUserClaimedDrop(drop.id) || 
                               (drop.claimedBy?.length || 0) >= (drop.quantity || 0) ||
                               Boolean(claimedDrop))
                                ? styles.claimDropButtonTextDisabled 
                                : styles.claimDropButtonTextActive
                            ]}>
                              {hasUserClaimedDrop(drop.id)
                                ? "Already Claimed"
                                : (drop.claimedBy?.length || 0) >= (drop.quantity || 0)
                                ? "Fully Claimed"
                                : claimedDrop
                                ? "One Claim Active"
                                : "Claim Drop"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Menu Section */}
            <View ref={menuSectionRef} style={styles.menuSection}>
              <View style={styles.menuHeader}>
                <Text style={styles.sectionTitle}>📋 Menu</Text>
                {loadingMenu && (
                  <Text style={styles.loadingMenuText}>Loading...</Text>
                )}
              </View>

              {loadingMenu && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#e74c3c" />
                  <Text style={styles.loadingText}>Loading menu items...</Text>
                </View>
              )}

              {!loadingMenu && menuItems.length > 0 && (
                <View style={styles.menuGrid}>
                  {menuItems.map((item, index) => {
                    // Handle both image field names for backward compatibility
                    const imageUrl = item.image || item.imageUrl;
                    return (
                    <View key={index} style={styles.menuItem}>
                      <View style={styles.menuItemImageContainer}>
                        {imageUrl && (
                          <Image 
                            source={{ uri: imageUrl }} 
                            style={styles.menuItemImage}
                            onLoadStart={() => console.log('🍽️ Loading menu image:', item.name)}
                            onLoad={() => console.log('✅ Menu image loaded successfully')}
                            onError={(error) => console.log('❌ Menu image failed to load:', error.nativeEvent.error)}
                          />
                        )}
                        {console.log(`🏷️ MapScreen Badge Check: "${item.name}" - Backend: ${item.isNewItem}, Client: ${isItemNew(item.id, selectedTruck?.ownerId)}, Show: ${!!(item.isNewItem || isItemNew(item.id, selectedTruck?.ownerId))}`)}
                        {(item.isNewItem || isItemNew(item.id, selectedTruck?.ownerId)) && (
                          <View style={styles.newItemBadge}>
                            <Ionicons name="star" size={10} color="#fff" />
                            <Text style={styles.newItemBadgeText}>NEW</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.menuItemInfo}>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                        <Text style={styles.menuItemPrice}>${item.price}</Text>
                        {item.description && (
                          <Text style={styles.menuItemDescription}>{item.description}</Text>
                        )}
                        <TouchableOpacity 
                          style={styles.addToCartButton}
                          onPress={() => addToCart({ ...item, id: item.id || `item_${index}` })}
                        >
                          <Ionicons name="add-circle" size={16} color="#fff" />
                          <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    );
                  })}
                </View>
              )}

              {!loadingMenu && menuItems.length === 0 && selectedTruck?.ownerId && (
                <View style={styles.emptyMenuContainer}>
                  <Text style={styles.emptyMenuIcon}>🍽️</Text>
                  <Text style={styles.emptyMenuText}>
                    {selectedTruck.ownerId === user?.uid ? 
                      'You haven\'t added any menu items yet!' : 
                      'This business has not added menu items yet.'
                    }
                  </Text>
                  {selectedTruck.ownerId === user?.uid && (
                    <TouchableOpacity 
                      style={styles.addMenuButton}
                      onPress={() => {
                        setShowMenuModal(false);
                        navigation.navigate('MenuManagement');
                      }}
                    >
                      <Text style={styles.addMenuButtonText}>+ Add Menu Items</Text>
                    </TouchableOpacity>
                  )}
                  {selectedTruck.ownerId !== user?.uid && (
                    <Text style={styles.emptyMenuSubtext}>
                      Check back later for delicious menu options!
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Shopping Cart Overlay - Inside Truck Modal */}
          {showCartModal && (
            <View style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              zIndex: 9999,
              justifyContent: 'flex-start',
              alignItems: 'center'
            }}>
              <View style={{ 
                backgroundColor: '#ffffff', 
                marginTop: 60,
                borderRadius: 20,
                margin: 20,
                width: '90%',
                maxHeight: '80%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10
              }}>
                {/* Cart Header */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee'
                }}>
                  <Text style={{ 
                    fontSize: 24, 
                    fontWeight: 'bold',
                    color: '#000'
                  }}>
                    🛒 Your Cart
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      console.log('🛒 Close cart X button pressed');
                      setShowCartModal(false);
                    }}
                    style={{
                      padding: 10,
                      backgroundColor: '#f0f0f0',
                      borderRadius: 20
                    }}
                  >
                    <Text style={{ fontSize: 18, color: '#666' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Cart Items */}
                <ScrollView style={{ maxHeight: 300, padding: 20 }}>
                  {cart.length === 0 ? (
                    <View style={{ alignItems: 'center', padding: 30 }}>
                      <Text style={{ fontSize: 18, color: '#666', textAlign: 'center' }}>
                        Your cart is empty
                      </Text>
                      <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', marginTop: 10 }}>
                        Add some delicious items from the menu!
                      </Text>
                    </View>
                  ) : (
                    cart.map((item, index) => (
                      <View key={item.id} style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 15,
                        borderBottomWidth: index < cart.length - 1 ? 1 : 0,
                        borderBottomColor: '#f0f0f0'
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000' }}>
                            {item.name}
                          </Text>
                          <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                            ${item.price.toFixed(2)} each
                          </Text>
                        </View>
                        
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center',
                          backgroundColor: '#f8f8f8',
                          borderRadius: 8,
                          padding: 5
                        }}>
                          <TouchableOpacity 
                            onPress={() => updateQuantity(item.id, item.quantity - 1)}
                            style={{
                              backgroundColor: '#e74c3c',
                              borderRadius: 15,
                              width: 30,
                              height: 30,
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>-</Text>
                          </TouchableOpacity>
                          
                          <Text style={{ 
                            marginHorizontal: 15, 
                            fontSize: 16, 
                            fontWeight: 'bold',
                            color: '#000',
                            minWidth: 20,
                            textAlign: 'center'
                          }}>
                            {item.quantity}
                          </Text>
                          
                          <TouchableOpacity 
                            onPress={() => updateQuantity(item.id, item.quantity + 1)}
                            style={{
                              backgroundColor: '#27ae60',
                              borderRadius: 15,
                              width: 30,
                              height: 30,
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>+</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={{ 
                          fontSize: 16, 
                          fontWeight: 'bold',
                          color: '#2c6f57',
                          marginLeft: 15,
                          minWidth: 60,
                          textAlign: 'right'
                        }}>
                          ${(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* Cart Total & Checkout */}
                {cart.length > 0 && (
                  <View style={{
                    borderTopWidth: 1,
                    borderTopColor: '#eee',
                    padding: 20
                  }}>
                    {/* Order Summary */}
                    <View style={{ marginBottom: 15 }}>
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8
                      }}>
                        <Text style={{ fontSize: 16, color: '#666' }}>
                          Subtotal:
                        </Text>
                        <Text style={{ fontSize: 16, color: '#000' }}>
                          ${getTotalPrice()}
                        </Text>
                      </View>

                      {/* Sales Tax Display */}
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8
                      }}>
                        <Text style={{ fontSize: 14, color: '#666' }}>
                          Sales Tax (8.75%):
                        </Text>
                        <Text style={{ fontSize: 14, color: '#666' }}>
                          ${getSalesTax()}
                        </Text>
                      </View>

                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: '#f0f0f0'
                      }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>
                          Total:
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2c6f57' }}>
                          ${getFinalTotal()}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity 
                      onPress={placeOrder}
                      style={{
                        backgroundColor: '#2c6f57',
                        borderRadius: 12,
                        padding: 18,
                        alignItems: 'center',
                        marginBottom: 10
                      }}
                    >
                      <Text style={{ 
                        fontSize: 18, 
                        color: '#fff',
                        fontWeight: 'bold'
                      }}>
                        💳 Pay with Stripe (${getFinalTotal()})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => {
                        console.log('🛒 Continue shopping pressed');
                        setShowCartModal(false);
                      }}
                      style={{
                        backgroundColor: '#f8f8f8',
                        borderRadius: 12,
                        padding: 15,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ 
                        fontSize: 16, 
                        color: '#666',
                        fontWeight: '500'
                      }}>
                        Continue Shopping
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Catering Booking Modal - Inside Truck Modal */}
          {showCateringModal && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              zIndex: 9999,
              justifyContent: 'flex-start',
              alignItems: 'center',
              paddingHorizontal: 15,
              paddingTop: 50,
              paddingBottom: 20,
            }}>
              <KeyboardAvoidingView 
                style={{
                  width: '100%',
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
              >
              <View style={{
                paddingHorizontal: 20,
                paddingTop: 25,
                paddingBottom: Platform.OS === 'ios' ? 25 : 20,
                height: '100%',
                flex: 1,
              }}>
                {/* Header */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                  paddingBottom: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee',
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#2c6f57',
                    flex: 1,
                  }}>
                    🎉 Book {selectedTruck?.name} for Catering
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCateringModal(false)}
                    style={{
                      padding: 8,
                      borderRadius: 20,
                      backgroundColor: '#f5f5f5',
                    }}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Form - Wrapped in ScrollView with proper padding */}
                <ScrollView 
                  style={{ flex: 1, minHeight: 400 }} 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
                >
                  {/* Customer Name */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 }}>
                      Your Name *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#fff',
                      }}
                      value={cateringFormData.customerName}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, customerName: text }))}
                      placeholder="Enter your full name"
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Email */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 }}>
                      Email Address *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#fff',
                      }}
                      value={cateringFormData.customerEmail}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, customerEmail: text }))}
                      placeholder="your.email@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Phone */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 }}>
                      Phone Number *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#fff',
                      }}
                      value={cateringFormData.customerPhone}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, customerPhone: text }))}
                      placeholder="(555) 123-4567"
                      keyboardType="phone-pad"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Event Date */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 }}>
                      Event Date *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#fff',
                      }}
                      value={cateringFormData.eventDate}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, eventDate: text }))}
                      placeholder="MM/DD/YYYY"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Event Time */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 }}>
                      Event Time *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#fff',
                      }}
                      value={cateringFormData.eventTime}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, eventTime: text }))}
                      placeholder="e.g., 12:00 PM - 3:00 PM"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Event Location */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 }}>
                      Event Location *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#fff',
                        minHeight: 50,
                        textAlignVertical: 'top',
                      }}
                      value={cateringFormData.eventLocation}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, eventLocation: text }))}
                      placeholder="Full address or venue name"
                      multiline={true}
                      numberOfLines={2}
                      returnKeyType="next"
                    />
                  </View>

                  {/* Guest Count */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 }}>
                      Estimated Guest Count *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#fff',
                      }}
                      value={cateringFormData.guestCount}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, guestCount: text }))}
                      placeholder="e.g., 50-75 people"
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Special Requests */}
                  <View style={{ marginBottom: 25 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 }}>
                      Special Requests or Details
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#ddd',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: '#fff',
                        minHeight: 100,
                        textAlignVertical: 'top',
                      }}
                      value={cateringFormData.specialRequests}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, specialRequests: text }))}
                      placeholder="Any dietary restrictions, special menu requests, or other details..."
                      multiline={true}
                      numberOfLines={4}
                      returnKeyType="done"
                    />
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: submittingCateringForm ? '#ccc' : '#2c6f57',
                      padding: 15,
                      borderRadius: 10,
                      alignItems: 'center',
                      marginBottom: 15,
                    }}
                    onPress={() => handleCateringSubmit()}
                    disabled={submittingCateringForm || !cateringFormData.customerName || !cateringFormData.customerEmail || !cateringFormData.customerPhone}
                    activeOpacity={0.8}
                  >
                    {submittingCateringForm ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: 'bold',
                      }}>
                        📧 Send Catering Request
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Info Text */}
                  <Text style={{
                    fontSize: 12,
                    color: '#666',
                    textAlign: 'center',
                    lineHeight: 16,
                    marginBottom: 10,
                  }}>
                    Your catering request will be sent directly to {selectedTruck?.name}. They will contact you to discuss pricing, menu options, and availability.
                  </Text>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
            </View>
          )}

          {/* Festival Booking Modal for Event Organizers */}
          {showFestivalModal && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              zIndex: 9999,
              justifyContent: 'flex-start',
              alignItems: 'center',
              paddingHorizontal: 15,
              paddingTop: 50,
              paddingBottom: 20,
            }}>
              <KeyboardAvoidingView 
                style={{
                  width: '100%',
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
              >
              <View style={{
                paddingHorizontal: 20,
                paddingTop: 25,
                paddingBottom: Platform.OS === 'ios' ? 25 : 20,
                height: '100%',
                flex: 1,
              }}>
                {/* Header */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                  paddingBottom: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee',
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#7c2d12',
                    flex: 1,
                  }}>
                    🎪 Book {selectedTruck?.name} for Festival
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowFestivalModal(false)}
                    style={{
                      padding: 8,
                      borderRadius: 20,
                      backgroundColor: '#f5f5f5',
                    }}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Organizer Information */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: '#333',
                      marginBottom: 15,
                    }}>
                      📋 Organizer Information
                    </Text>

                    {/* Organizer Name */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Organization/Contact Name *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="Enter organization or contact name"
                        value={festivalFormData.organizerName}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, organizerName: text }))}
                        autoCapitalize="words"
                      />
                    </View>

                    {/* Organizer Email */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Contact Email *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="Enter your email address"
                        value={festivalFormData.organizerEmail}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, organizerEmail: text }))}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    {/* Organizer Phone */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Contact Phone *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="Enter your phone number"
                        value={festivalFormData.organizerPhone}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, organizerPhone: text }))}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  {/* Event Information */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: '#333',
                      marginBottom: 15,
                    }}>
                      🎪 Event Information
                    </Text>

                    {/* Event Name */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Event Name *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="Enter event name"
                        value={festivalFormData.eventName}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, eventName: text }))}
                        autoCapitalize="words"
                      />
                    </View>

                    {/* Event Date */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Event Date *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="MM/DD/YYYY"
                        value={festivalFormData.eventDate}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, eventDate: text }))}
                      />
                    </View>

                    {/* Event Time */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Event Time *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="e.g. 10:00 AM - 6:00 PM"
                        value={festivalFormData.eventTime}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, eventTime: text }))}
                      />
                    </View>

                    {/* Event Location */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Event Location *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="Enter event location/venue"
                        value={festivalFormData.eventLocation}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, eventLocation: text }))}
                        autoCapitalize="words"
                      />
                    </View>

                    {/* Event Address */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Event Address
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="Enter full address (optional)"
                        value={festivalFormData.eventAddress}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, eventAddress: text }))}
                        autoCapitalize="words"
                      />
                    </View>

                    {/* Expected Attendance */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Expected Attendance *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="e.g. 500-1000 people"
                        value={festivalFormData.expectedAttendance}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, expectedAttendance: text }))}
                      />
                    </View>

                    {/* Event Duration */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Event Duration
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="e.g. 1 day, 2 days, weekend"
                        value={festivalFormData.eventDuration}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, eventDuration: text }))}
                      />
                    </View>
                  </View>

                  {/* Event Details */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: '#333',
                      marginBottom: 15,
                    }}>
                      📋 Event Details
                    </Text>

                    {/* Spaces Available */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Available Vendor Spaces
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="e.g. 20 food trucks, 10x10 spaces"
                        value={festivalFormData.spacesAvailable}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, spacesAvailable: text }))}
                      />
                    </View>

                    {/* Amenities */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 10,
                      }}>
                        Amenities Provided
                      </Text>
                      
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          marginBottom: 8,
                          backgroundColor: festivalFormData.electricityProvided ? '#e6f3e6' : '#fff',
                        }}
                        onPress={() => setFestivalFormData(prev => ({ ...prev, electricityProvided: !prev.electricityProvided }))}
                      >
                        <Ionicons 
                          name={festivalFormData.electricityProvided ? "checkbox" : "square-outline"} 
                          size={20} 
                          color={festivalFormData.electricityProvided ? "#2c6f57" : "#666"} 
                        />
                        <Text style={{ marginLeft: 10, fontSize: 16, color: '#333' }}>
                          Electricity provided
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          backgroundColor: festivalFormData.waterProvided ? '#e6f3e6' : '#fff',
                        }}
                        onPress={() => setFestivalFormData(prev => ({ ...prev, waterProvided: !prev.waterProvided }))}
                      >
                        <Ionicons 
                          name={festivalFormData.waterProvided ? "checkbox" : "square-outline"} 
                          size={20} 
                          color={festivalFormData.waterProvided ? "#2c6f57" : "#666"} 
                        />
                        <Text style={{ marginLeft: 10, fontSize: 16, color: '#333' }}>
                          Water access provided
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Booth Fee */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Booth Fee Structure
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="e.g. $200/day, $500/weekend, or negotiable"
                        value={festivalFormData.boothFee}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, boothFee: text }))}
                      />
                    </View>

                    {/* Sales Percentage */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Sales Percentage (if applicable)
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                        }}
                        placeholder="e.g. 10% of sales, or none"
                        value={festivalFormData.salesPercentage}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, salesPercentage: text }))}
                      />
                    </View>

                    {/* Event Description */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Event Description
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                          height: 80,
                          textAlignVertical: 'top',
                        }}
                        placeholder="Describe your event, theme, target audience, etc."
                        value={festivalFormData.eventDescription}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, eventDescription: text }))}
                        multiline
                        numberOfLines={4}
                      />
                    </View>

                    {/* Special Requirements */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: 5,
                      }}>
                        Special Requirements
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#ddd',
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: '#fff',
                          height: 60,
                          textAlignVertical: 'top',
                        }}
                        placeholder="Any special setup requirements, restrictions, etc."
                        value={festivalFormData.specialRequirements}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, specialRequirements: text }))}
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: submittingFestivalForm ? '#ccc' : '#7c2d12',
                      padding: 15,
                      borderRadius: 10,
                      alignItems: 'center',
                      marginBottom: 15,
                    }}
                    onPress={() => handleFestivalSubmit()}
                    disabled={submittingFestivalForm || !festivalFormData.organizerName || !festivalFormData.organizerEmail || !festivalFormData.organizerPhone || !festivalFormData.eventName}
                    activeOpacity={0.8}
                  >
                    {submittingFestivalForm ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: 'bold',
                      }}>
                        🎪 Send Festival Booking Request
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Info Text */}
                  <Text style={{
                    fontSize: 12,
                    color: '#666',
                    textAlign: 'center',
                    lineHeight: 16,
                    marginBottom: 10,
                  }}>
                    Your festival booking request will be sent directly to {selectedTruck?.name}. They will contact you to discuss availability and to go over participation details.
                  </Text>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
            </View>
          )}

          {/* Claim Codes Overlay - Inside Truck Modal */}
          {showClaimCodesModal && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              zIndex: 10000,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}>
              <View style={{
                backgroundColor: '#1a1a2e',
                borderRadius: 15,
                padding: 20,
                width: '90%',
                maxHeight: '80%',
                borderWidth: 2,
                borderColor: '#2c6f57',
              }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                  paddingBottom: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: '#333',
                }}>
                  <Text style={{
                    fontSize: 22,
                    fontWeight: 'bold',
                    color: '#fff',
                  }}>
                    🔑 Claim Codes
                  </Text>
                  <TouchableOpacity 
                    style={{
                      padding: 8,
                      backgroundColor: '#e74c3c',
                      borderRadius: 20,
                    }}
                    onPress={() => {
                      console.log("🔗 Close button pressed in claim codes overlay");
                      setShowClaimCodesModal(false);
                    }}
                  >
                    <Text style={{ fontSize: 18, color: '#fff', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                {loadingClaimCodes ? (
                  <View style={{ alignItems: 'center', padding: 30 }}>
                    <ActivityIndicator size="large" color="#2c6f57" />
                    <Text style={{ color: '#fff', marginTop: 10, fontSize: 16 }}>
                      Loading claim codes...
                    </Text>
                  </View>
                ) : claimCodes.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 30 }}>
                    <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
                      No active claim codes found
                    </Text>
                    <Text style={{ color: '#999', fontSize: 14, textAlign: 'center', marginTop: 10 }}>
                      Codes will appear here when customers claim drops
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 400 }}>
                    {claimCodes.map((claim) => (
                      <View key={claim.id} style={{
                        backgroundColor: '#2a2a3e',
                        borderRadius: 10,
                        padding: 15,
                        marginBottom: 15,
                        borderWidth: 1,
                        borderColor: '#4682b4',
                      }}>
                        <View style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 10,
                        }}>
                          <Text style={{
                            fontSize: 20,
                            fontWeight: 'bold',
                            color: '#2c6f57',
                            letterSpacing: 2,
                          }}>
                            {claim.code}
                          </Text>
                          <Text style={{
                            fontSize: 12,
                            color: '#999',
                          }}>
                            {claim.dropTitle}
                          </Text>
                        </View>
                        <Text style={{
                          fontSize: 14,
                          color: '#fff',
                          marginBottom: 5,
                        }}>
                          User: {claim.userIdMasked}
                        </Text>
                        <Text style={{
                          fontSize: 12,
                          color: '#999',
                        }}>
                          Claimed: {new Date(claim.claimedAt).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          )}
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
            <Text style={styles.cuisineModalTitle}>🍽️ Cuisine Filter</Text>
            <Text style={styles.cuisineModalSubtitle}>
              {excludedCuisines.length === 0 
                ? 'Showing all cuisine types' 
                : `Hiding ${excludedCuisines.length} cuisine type${excludedCuisines.length === 1 ? '' : 's'}`
              }
            </Text>
            
            <ScrollView style={styles.cuisineScrollView}>
              <View style={styles.cuisineGrid}>
                {cuisineTypes.map((cuisine) => {
                  const isExcluded = excludedCuisines.includes(cuisine.id);
                  const isShowingAll = excludedCuisines.length === 0;
                  
                  return (
                    <TouchableOpacity
                      key={cuisine.id}
                      style={[
                        styles.cuisineOption,
                        cuisine.id === 'all' && isShowingAll && styles.cuisineOptionAll,
                        isExcluded && styles.cuisineOptionExcluded
                      ]}
                      onPress={() => handleCuisineSelect(cuisine.id)}
                    >
                      <View style={styles.cuisineOptionContent}>
                        <Text style={[
                          styles.cuisineEmoji,
                          isExcluded && styles.cuisineEmojiExcluded
                        ]}>
                          {cuisine.emoji}
                        </Text>
                        <Text style={[
                          styles.cuisineName,
                          cuisine.id === 'all' && isShowingAll && styles.cuisineNameAll,
                          isExcluded && styles.cuisineNameExcluded
                        ]}>
                          {cuisine.name}
                        </Text>
                        {isExcluded && cuisine.id !== 'all' && (
                          <View style={styles.cuisineExcludedIcon}>
                            <Text style={styles.cuisineExcludedText}>✕</Text>
                          </View>
                        )}
                        {cuisine.id === 'all' && isShowingAll && (
                          <View style={styles.cuisineAllIcon}>
                            <Text style={styles.cuisineAllText}>✓</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
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
                style={[styles.cuisineModalButton, styles.clearButton]}
                onPress={() => setExcludedCuisines([])}
              >
                <Text style={styles.clearButtonText}>Show All</Text>
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
    backgroundColor: '#1a1a2e', // Deep navy blue
  },
  webview: {
    flex: 1,
  },
  header: {
    padding: 15,
    backgroundColor: '#2c6f57', // Green header
    paddingTop: 50,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#000000', // Black border accent
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerLogo: {
    width: 120,
    height: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff', // White text on green background
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
    borderWidth: 2,
    borderColor: '#000000',
    borderLeftWidth: 4,
    borderLeftColor: '#4682b4', // Blue accent left border
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
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#000000', // Black border
    borderTopWidth: 5,
    borderTopColor: '#4682b4', // Blue accent top border
  },
  modalHeader: {
    backgroundColor: '#2c6f57', // Green header
    padding: 15,
    paddingTop: 50,
    paddingRight: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'relative',
    borderBottomWidth: 3,
    borderBottomColor: '#000000', // Black accent
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#4682b4', // Steel blue close button
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#000000', // Black border
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff', // White text on green background
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)', // Light white subtitle
    fontWeight: '600',
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
  loadingMenuText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  coverPhotoSection: {
    marginBottom: 20,
  },
  coverImageContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    width: '100%',
  },
  coverImage: {
    width: '100%',
    minHeight: 200,
    maxHeight: 400,
    borderRadius: 10,
    resizeMode: 'contain',
  },
  imageLoadingIndicator: {
    position: 'absolute',
    zIndex: 1,
  },
  menuImageSection: {
    marginBottom: 20,
  },
  menuImageContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
    minHeight: 250,
    maxHeight: 400,
  },
  menuImage: {
    width: '100%',
    height: '100%',
    minHeight: 250,
    borderRadius: 10,
  },
  menuImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuImageOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
  
  // Drops Section Styles
  dropsSection: {
    marginBottom: 20,
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#4682b4',
  },
  dropsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dropsTitleContainer: {
    marginBottom: 15,
  },
  dropsButtonContainer: {
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  createDropButton: {
    backgroundColor: '#4682b4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  createDropButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  dropMessageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  dropMessage: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dropForm: {
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  dropFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  dropFieldLabel: {
    fontSize: 14,
    color: '#4682b4',
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
  },
  dropInputContainer: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4682b4',
  },
  dropInput: {
    color: '#fff',
    fontSize: 16,
    padding: 12,
    minHeight: 45,
  },
  dropTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropRowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dropHalfInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  submitDropButton: {
    backgroundColor: '#2c6f57',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  submitDropButtonDisabled: {
    backgroundColor: '#666',
    borderColor: '#999',
  },
  submitDropButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Customer Drops Section Styles
  customerDropsSection: {
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
  },
  claimedDropCard: {
    backgroundColor: '#d4edda',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#c3e6cb',
    alignItems: 'center',
  },
  claimedDropTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
    textAlign: 'center',
  },
  claimedDropText: {
    fontSize: 14,
    color: '#155724',
    marginBottom: 5,
  },
  claimCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#155724',
    letterSpacing: 2,
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#c3e6cb',
    borderStyle: 'dashed',
  },
  claimedDropExpires: {
    fontSize: 12,
    color: '#155724',
    fontStyle: 'italic',
  },
  claimMessageContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  claimMessage: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  noDropsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDropsText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  dropsContainer: {
    marginTop: 10,
  },
  dropCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dropTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 6,
  },
  dropDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
    lineHeight: 18,
  },
  dropDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dropDetail: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  claimDropButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimDropButtonActive: {
    backgroundColor: '#2c6f57',
  },
  claimDropButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  claimDropButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  claimDropButtonTextActive: {
    color: '#fff',
  },
  claimDropButtonTextDisabled: {
    color: '#666',
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
  menuItemImageContainer: {
    position: 'relative',
  },
  menuItemImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  newItemBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#f39c12',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  newItemBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
  emptyMenuIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyMenuSubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 10,
  },
  addMenuButton: {
    backgroundColor: '#2c6f57',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  addMenuButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
    marginBottom: 10,
    color: '#2c6f57',
  },
  cuisineModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontStyle: 'italic',
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
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    position: 'relative',
  },
  cuisineOptionSelected: {
    borderColor: '#2c6f57',
    backgroundColor: '#2c6f57',
  },
  cuisineOptionExcluded: {
    borderColor: '#e74c3c',
    backgroundColor: '#ffe6e6',
    opacity: 0.7,
  },
  cuisineOptionAll: {
    borderColor: '#4682b4',
    backgroundColor: '#4682b4',
  },
  cuisineOptionContent: {
    alignItems: 'center',
    width: '100%',
  },
  cuisineEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  cuisineEmojiExcluded: {
    opacity: 0.5,
  },
  cuisineName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    lineHeight: 14,
  },
  cuisineNameSelected: {
    color: 'white',
  },
  cuisineNameAll: {
    color: 'white',
  },
  cuisineNameExcluded: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  cuisineCheckmark: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#2c6f57',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  cuisineCheckmarkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cuisineExcludedIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  cuisineExcludedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cuisineAllIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#4682b4',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  cuisineAllText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  clearButton: {
    backgroundColor: '#4682b4',
  },
  applyButton: {
    backgroundColor: '#2c6f57',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  
  // Cart-related styles
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  cartButton: {
    borderRadius: 25,
    padding: 10,
    position: 'relative',
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cartButtonActive: {
    backgroundColor: '#27ae60',
    borderWidth: 3,
    borderColor: '#fff',
  },
  cartButtonInactive: {
    backgroundColor: '#e74c3c',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cartButtonContent: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cartIconContainer: {
    position: 'relative',
  },
  cartButtonLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  cartButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 5,
  },
  quickMenuButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: '#2c6f57',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quickMenuButtonText: {
    color: '#2c6f57',
    fontSize: 12,
    fontWeight: '600',
  },
  favoriteButton: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  favoriteButtonActive: {
    backgroundColor: '#ffe6e6',
    borderColor: '#ff6b6b',
  },
  favoriteButtonInactive: {
    backgroundColor: '#fff',
    borderColor: '#2c6f57',
  },
  favoriteButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  favoriteButtonTextActive: {
    color: '#ff6b6b',
  },
  favoriteButtonTextInactive: {
    color: '#2c6f57',
  },
  cateringButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: '#2c6f57',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cateringButtonText: {
    color: '#2c6f57',
    fontSize: 12,
    fontWeight: '600',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  addToCartButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#000000',
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCartText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
  },
  emptyCartSubtext: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '600',
    marginBottom: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 15,
    color: '#333',
  },
  removeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
  },
  cartSummary: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  checkoutButton: {
    backgroundColor: '#2c6f57',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Truck visibility toggle styles
  ownerControlsContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 1000,
    alignItems: 'flex-end',
  },
  truckToggleButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000000',
  },
  toggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  visibilityInfoText: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    maxWidth: 280,
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  // Owner drops list styles
  ownerDropsList: {
    marginTop: 15,
  },
  ownerDropsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  ownerDropCard: {
    backgroundColor: '#2c2c54',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#40407a',
  },
  ownerDropHeader: {
    marginBottom: 8,
  },
  ownerDropTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  ownerDropExpiry: {
    fontSize: 12,
    color: '#bbb',
  },
  ownerDropDescription: {
    fontSize: 14,
    color: '#ddd',
    marginBottom: 12,
    lineHeight: 20,
  },
  ownerDropStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ownerDropStat: {
    alignItems: 'center',
    flex: 1,
  },
  ownerDropStatLabel: {
    fontSize: 12,
    color: '#bbb',
    marginBottom: 4,
  },
  ownerDropStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  viewCodesButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewCodesButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  
  // Modal overlay style
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Ensure it's above everything
    elevation: 1000, // Android elevation
  },
  
  // Claim codes modal styles
  claimCodesModalContent: {
    backgroundColor: '#2c2c54',
    borderRadius: 20,
    margin: 20,
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  claimCodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#40407a',
  },
  claimCodesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noCodesContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noCodesText: {
    color: '#bbb',
    fontSize: 16,
  },
  claimCodesList: {
    maxHeight: 400,
  },
  claimCodeCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    margin: 10,
    borderWidth: 1,
    borderColor: '#40407a',
  },
  claimCodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  claimCodeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    fontFamily: 'monospace',
  },
  claimCodeExpiry: {
    fontSize: 12,
    color: '#bbb',
  },
  claimCodeUserId: {
    fontSize: 12,
    color: '#ddd',
    marginBottom: 4,
  },
  claimCodeCreated: {
    fontSize: 12,
    color: '#bbb',
  },
});
