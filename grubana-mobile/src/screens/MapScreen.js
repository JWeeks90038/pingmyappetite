import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, Image, ActivityIndicator, TextInput, Linking, KeyboardAvoidingView, Platform, Animated, Alert, FlatList } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../components/AuthContext';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, serverTimestamp, addDoc, getDocs, query, where, orderBy, Timestamp, deleteDoc, limit, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Ionicons } from '@expo/vector-icons';
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { calculateStripeConnectPayment, preparePaymentIntentData } from '../utils/paymentConfig';
import { calculateEstimatedTime, getTimeDescription } from '../utils/estimatedTimeCalculator';
import { useTheme } from '../theme/ThemeContext';
import { ThemedView, ThemedText, ThemedButton, ThemedCard } from '../theme/ThemedComponents';
import { colors } from '../theme/colors';
import FoodiePhotoService from '../services/FoodiePhotoService';
import LeaderboardService from '../services/LeaderboardService';
// TODO: Re-enable these imports when expo-auth-session is working
// import { useCalendarEvents } from '../components/CalendarEventsContext';
// import CalendarConnectModal from '../components/CalendarConnectModal';
// import CalendarEventsDisplay from '../components/CalendarEventsDisplay';
import { isCalendarFeatureAuthorized, shouldShowCalendarComingSoon, getCalendarButtonText } from '../utils/calendarFeatureAccess';

import FoodieGameService from '../services/FoodieGameService';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createThemedStyles(theme), [theme]);
  
  // DEBUG: Console log to confirm code changes are active

  
  // Test Firebase connection immediately
  useEffect(() => {
    const testFirebaseConnection = async () => {
      try {
 
        
        // Try a simple Firebase read
        const testDoc = doc(db, 'users', user?.uid || 'test');
        const testSnapshot = await getDoc(testDoc);
      
        
        // Try to read truckLocations collection
        const truckLocsRef = collection(db, 'truckLocations');
        const truckLocsSnapshot = await getDocs(truckLocsRef);

        
        // Try to read trucks collection  
        const trucksRef = collection(db, 'trucks');
        const trucksSnapshot = await getDocs(trucksRef);

        
        // Try to read menuItems collection
        const menuRef = collection(db, 'menuItems');
        const menuSnapshot = await getDocs(menuRef);
    
        
      } catch (error) {}
    };
    
    if (user) {
      testFirebaseConnection();
    }
  }, [user]);
  
  // Load user's favorites - re-enabled
  useEffect(() => {
    if (!user?.uid) {
      setUserFavorites(new Set());
      return;
    }


    
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
      

      setUserFavorites(favoriteSet);
    }, (error) => {
 
      // Set empty favorites to prevent undefined issues
      setUserFavorites(new Set());
    });

    return () => unsubscribe();
  }, [user?.uid]);
  
  // Load current check-in from AsyncStorage
  useEffect(() => {
    const loadCheckIn = async () => {
      try {
        const checkInData = await AsyncStorage.getItem('current_checkin');
        if (checkInData) {
          const checkIn = JSON.parse(checkInData);
          // Check if check-in hasn't expired (45 minutes)
          const checkInTime = checkIn.timestamp;
          const now = Date.now();
          const expirationTime = 45 * 60 * 1000; // 45 minutes in milliseconds
          
          if (now - checkInTime < expirationTime) {
            setCurrentCheckIn(checkIn);
          } else {
            // Check-in expired, clear it
            await AsyncStorage.removeItem('current_checkin');
            setCurrentCheckIn(null);
          }
        }
      } catch (error) {

      }
    };

    loadCheckIn();

    // Set up periodic check for check-in expiration
    const interval = setInterval(loadCheckIn, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);
  
  // Load favorite counts for all trucks (for owners to see analytics)
  useEffect(() => {
    if (!foodTrucks.length) return;


    
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
          counts.set(truckId, 0);
        }
      }
      

      setTruckFavoriteCounts(counts);
    };

    loadFavoriteCounts();
  }, [foodTrucks]);

  // Fetch leaderboard data for trophy badges
  useEffect(() => {

    
    if (!location) {
  
      setLeaderboardLoading(true);
      return;
    }

    const fetchLeaderboardData = async () => {
      try {
        setLeaderboardLoading(true);
      
        
        const topTaggedPhotos = await LeaderboardService.getTopTaggedPhotos(
          location.coords.latitude,
          location.coords.longitude
        );
        
        // Extract user IDs from leaderboard data
        const userIds = new Set();
        topTaggedPhotos.forEach(photo => {
          if (photo.userId) {
            userIds.add(photo.userId);
          }
        });
        
  
        setLeaderboardUserIds(userIds);
      } catch (error) {
  
        setLeaderboardUserIds(new Set()); // Clear on error
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [location]);



  // Function to refresh leaderboard data (call after photo operations)
  const refreshLeaderboardData = async () => {
    if (!location) return;
    
    try {

      const topTaggedPhotos = await LeaderboardService.getTopTaggedPhotos(
        location.coords.latitude,
        location.coords.longitude
      );
      
      // Extract user IDs from leaderboard data
      const userIds = new Set();
      topTaggedPhotos.forEach(photo => {
        if (photo.userId) {
          userIds.add(photo.userId);
        }
      });
      
      setLeaderboardUserIds(userIds);
      
      // Also refresh the map markers to update trophy badges
      if (nearbyFoodies && nearbyFoodies.length > 0) {
        refreshFoodieMarkers(nearbyFoodies);
      }
      
    } catch (error) {

    }
  };

  // Refresh leaderboard data when screen comes into focus (e.g., returning from PhotoUpload)
  useFocusEffect(
    React.useCallback(() => {
      // Small delay to ensure any navigation state changes have completed
      const timer = setTimeout(() => {
        if (location && nearbyFoodies && nearbyFoodies.length > 0) {
          refreshLeaderboardData();
        }
      }, 500);

      return () => clearTimeout(timer);
    }, [location, nearbyFoodies])
  );
  
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
  const [showTruckIcon, setShowTruckIcon] = useState(null); // Toggle for truck icon visibility (owners only) - null until loaded from Firebase
  const [lastActivityTime, setLastActivityTime] = useState(Date.now()); // Track user activity
  const [imageAspectRatio, setImageAspectRatio] = useState(null);
  
  // 🚀 PERFORMANCE: Privacy settings cache to avoid repeated Firebase calls
  const [privacyCache, setPrivacyCache] = useState(new Map());
  const [privacyCacheTimestamp, setPrivacyCacheTimestamp] = useState(0);
  const PRIVACY_CACHE_DURATION = 30 * 1000; // 30 seconds cache
  
  // 🌍 PERFORMANCE: Geographic filtering for large-scale deployments
  const [viewBounds, setViewBounds] = useState(null);
  
  // Foodie Check-in State
  const [currentCheckIn, setCurrentCheckIn] = useState(null);
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

  // User check-in state (lightweight gamification)
  const [userCheckIn, setUserCheckIn] = useState(null);

  // Nearby foodies state for map display
  const [nearbyFoodies, setNearbyFoodies] = useState([]);
  const [loadingFoodies, setLoadingFoodies] = useState(false);

  // Leaderboard state for trophy badges
  const [leaderboardUserIds, setLeaderboardUserIds] = useState(new Set());
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  // Foodie photo gallery states
  const [showFoodieGallery, setShowFoodieGallery] = useState(false);
  const [selectedFoodie, setSelectedFoodie] = useState(null);
  const [foodiePhotos, setFoodiePhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  
  // Full-screen photo viewer states
  const [showFullScreenPhoto, setShowFullScreenPhoto] = useState(false);
  const [fullScreenPhotoUrl, setFullScreenPhotoUrl] = useState(null);
  const [fullScreenPhotoData, setFullScreenPhotoData] = useState(null);

  // Photo upload states
  // Photo upload state managed by dedicated PhotoUploadScreen

  // Catering booking states
  const [showCateringModal, setShowCateringModal] = useState(false);
  
  // Reviews states
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  
  // Calendar states
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // NEW item tracking (client-side workaround)
  const [newItemIds, setNewItemIds] = useState(new Set());

  // Client-side new items tracking functions
  const getNewItemIds = async (userId) => {
    try {
      const stored = await AsyncStorage.getItem(`newItemIds_${userId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
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

  // Toast notification system for production-safe alerts
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'
  const [showToast, setShowToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Custom modal system for confirmations (replaces Alert.alert)
  const [customModal, setCustomModal] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
  });

  // Toast notification function
  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowToast(false);
    });
  };

  // Custom modal function (replaces Alert.alert)
  const showCustomModal = (title, message, onConfirm = null, confirmText = 'OK', cancelText = 'Cancel', showCancel = false) => {
    setCustomModal({
      visible: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
      showCancel,
    });
  };

  const hideCustomModal = () => {
    setCustomModal({
      visible: false,
      title: '',
      message: '',
      onConfirm: null,
      confirmText: 'OK',
      cancelText: 'Cancel',
      showCancel: false,
    });
  };

  // Function to check if truck is currently open based on business hours
  const checkTruckOpenStatus = (businessHours) => {
    if (!businessHours) {

      return 'open'; // Default to open if no hours set
    }
    
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime12 = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
    

    
    const dayHours = businessHours[currentDay];
    if (!dayHours || dayHours.closed) {

      return 'closed';
    }
    

    // Helper function to convert AM/PM time to minutes since midnight for easy comparison
    const timeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      

      
      const timeStr_clean = timeStr.trim();
      
      // Check if it's already 24-hour format (no AM/PM)
      if (!timeStr_clean.includes('AM') && !timeStr_clean.includes('PM')) {
        // 24-hour format like "09:00" or "17:00"
        const timeParts = timeStr_clean.split(':');
        if (timeParts.length !== 2) {
   
          return 0;
        }
        
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
   
          return 0;
        }
        
        const totalMinutes = hours * 60 + minutes;
      
        return totalMinutes;
      }
      
      // 12-hour format with AM/PM - handle various whitespace characters
      const parts = timeStr_clean.split(/\s+/); // Split on any whitespace (space, non-breaking space, etc.)

      
      if (parts.length !== 2) {

        
        // Try alternative parsing for edge cases
        const ampmMatch = timeStr_clean.match(/(AM|PM)/i);
        if (ampmMatch) {
          const ampm = ampmMatch[0].toUpperCase();
          const timeOnly = timeStr_clean.replace(/(AM|PM)/i, '').trim();

          
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
      
              return totalMinutes;
            }
          }
        }
        
        return 0;
      }
      
      const [time, period] = parts;
 
      
      const timeParts = time.split(':');

      
      if (timeParts.length !== 2) {

        return 0;
      }
      
      let hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      

      
      if (isNaN(hours) || isNaN(minutes)) {
  
        return 0;
      }
      
      // Validate ranges for 12-hour format
      
      if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
        
        return 0;
      }
      
      // Convert to 24-hour format for calculation
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours = hours + 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      const totalMinutes = hours * 60 + minutes;
 
      return totalMinutes;
    };
    
    // Convert all times to minutes since midnight for comparison
    const currentMinutes = timeToMinutes(currentTime12);
    const openMinutes = timeToMinutes(dayHours.open);
    const closeMinutes = timeToMinutes(dayHours.close);
    

    
    // Check if current time is within business hours
    let isOpen = false;
    
    if (closeMinutes > openMinutes) {
      // Normal case: open and close on same day (e.g., 9:00 AM to 6:00 PM)
      // Current time must be >= open time AND < close time (not <=, because at close time you're closed)
      isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    
    } else {
      // Overnight case: close time is next day (e.g., 10:00 PM to 2:00 AM)
      isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;

    }
    
    if (isOpen) {
     
      return 'open';
    } else {
  
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
  // TODO: Re-enable when expo-auth-session is working
  // const { calendarEvents, isConnected: isCalendarConnected, syncEvents } = useCalendarEvents();
  
  // Mock calendar data for coming soon functionality
  const calendarEvents = [];
  const isCalendarConnected = false;
  const syncEvents = () => {};
  
  const navigation = useNavigation();

  // Mock food truck data scattered across Riverside County, CA cities and towns (fallback for development)
  const mockFoodTrucks = [
    { 
      id: 1, 
      name: "Tasty Tacos", 
      truckName: "Tasty Tacos",
      lat: 33.8309, 
      lng: -117.0934, 
      status: "closed", 
      popularity: 85, 
      type: "mexican", 
      cuisineType: "mexican",
      kitchenType: "truck",
      coverUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&crop=center", // Taco truck
      phone: "(951) 555-0101",
      description: "Authentic Mexican street tacos made fresh daily"
    }, // Downtown Riverside
    { 
      id: 2, 
      name: "Burger Paradise", 
      truckName: "Burger Paradise",
      lat: 33.7294, 
      lng: -116.2453, 
      status: "closed", 
      popularity: 92, 
      type: "american", 
      cuisineType: "american",
      kitchenType: "truck",
      coverUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&crop=center", // Burger truck
      phone: "(760) 555-0102",
      description: "Gourmet burgers with locally sourced ingredients"
    }, // Palm Desert
    { 
      id: 3, 
      name: "Pizza Express", 
      truckName: "Pizza Express",
      lat: 33.6981, 
      lng: -117.1633, 
      status: "closed", 
      popularity: 67, 
      type: "italian", 
      cuisineType: "italian",
      kitchenType: "trailer",
      coverUrl: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop&crop=center", // Pizza truck
      phone: "(951) 555-0103",
      description: "Wood-fired artisan pizzas made to order"
    }, // Lake Elsinore
    { 
      id: 4, 
      name: "Sushi Roll", 
      truckName: "Sushi Roll",
      lat: 33.6839, 
      lng: -116.5453, 
      status: "open", 
      popularity: 78, 
      type: "japanese", 
      cuisineType: "japanese",
      kitchenType: "truck",
      coverUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop&crop=center", // Sushi
      phone: "(760) 555-0104",
      description: "Fresh sushi and Japanese fusion cuisine"
    }, // Desert Hot Springs
    { 
      id: 5, 
      name: "BBQ Master", 
      truckName: "BBQ Master",
      lat: 33.6803, 
      lng: -117.3803, 
      status: "closed", 
      popularity: 95, 
      type: "bbq", 
      cuisineType: "bbq",
      kitchenType: "cart",
      coverUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop&crop=center", // BBQ truck
      phone: "(951) 555-0105",
      description: "Slow-smoked meats and traditional BBQ sides"
    }, // Murrieta
    { 
      id: 6, 
      name: "Seoul Kitchen", 
      truckName: "Seoul Kitchen",
      lat: 33.7456, 
      lng: -116.9744, 
      status: "closed", 
      popularity: 88, 
      type: "korean", 
      cuisineType: "korean",
      kitchenType: "truck",
      coverUrl: "https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop&crop=center", // Korean BBQ
      phone: "(951) 555-0106",
      description: "Korean BBQ and fusion dishes with a modern twist"
    }, // Moreno Valley
    { 
      id: 7, 
      name: "Mediterranean Delights", 
      truckName: "Mediterranean Delights",
      lat: 33.9425, 
      lng: -117.2717, 
      status: "closed", 
      popularity: 82, 
      type: "mediterranean", 
      cuisineType: "mediterranean",
      kitchenType: "truck",
      coverUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop&crop=center", // Mediterranean food
      phone: "(909) 555-0107",
      description: "Fresh Mediterranean cuisine with authentic flavors"
    }, // Corona
    { 
      id: 8, 
      name: "Sweet Treats", 
      truckName: "Sweet Treats",
      lat: 33.9806, 
      lng: -117.3753, 
      status: "closed", 
      popularity: 76, 
      type: "desserts", 
      cuisineType: "desserts",
      kitchenType: "truck",
      coverUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop&crop=center", // Ice cream truck
      phone: "(909) 555-0108",
      description: "Artisan ice cream and gourmet desserts"
    }, // Chino
    { 
      id: 9, 
      name: "Pho Real", 
      truckName: "Pho Real",
      lat: 33.8754, 
      lng: -117.5458, 
      status: "closed", 
      popularity: 84, 
      type: "vietnamese", 
      cuisineType: "asian-fusion",
      kitchenType: "truck",
      coverUrl: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=300&fit=crop&crop=center", // Vietnamese pho
      phone: "(951) 555-0109",
      description: "Authentic Vietnamese pho and banh mi sandwiches"
    }, // Norco
    { 
      id: 10, 
      name: "Coffee & More", 
      truckName: "Coffee & More",
      lat: 33.7175, 
      lng: -116.2728, 
      status: "closed", 
      popularity: 79, 
      type: "coffee", 
      cuisineType: "coffee",
      kitchenType: "cart",
      coverUrl: "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=400&h=300&fit=crop&crop=center", // Coffee truck
      phone: "(760) 555-0110",
      description: "Specialty coffee, pastries, and breakfast items"
    } // Palm Springs
  ];


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
    { id: 'caribbean', name: 'Caribbean', emoji: '🍹' },
  { id: 'latin', name: 'Latin American', emoji: '🫓' },
  { id: 'colombian', name: 'Colombian', emoji: '🥟' },
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
  if (name.includes('caribbean')) return 'caribbean';
  if (name.includes('colombian') || name.includes('colombia')) return 'colombian';
    if (name.includes('greek')) return 'greek';
    if (name.includes('coffee') || name.includes('espresso')) return 'coffee';
    if (name.includes('dessert') || name.includes('ice cream') || name.includes('donut')) return 'desserts';
    if (name.includes('healthy') || name.includes('salad') || name.includes('vegan')) return 'healthy';
    if (name.includes('southern') || name.includes('soul')) return 'southern';
    
    // Default to American if no specific pattern is found
    return 'american';
  };

  // Function to add test ping data to Firestore for heatmap testing
  // (Removed addTestPingData and test ping logic)

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
 
      // Only trigger truck data refresh, not full map regeneration
      // This will be handled by the truck data listeners, not by regenerating the entire map
  
    }, [])
  );
  */

  // Fetch owner data for current user
  useEffect(() => {
    const fetchOwnerData = async () => {
      if (!user?.uid) return;

      
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { uid: user.uid, ...docSnap.data() };
          setOwnerData(data);

        }
      } catch (error) {
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

    
    if (showMenuModal && selectedTruck?.ownerId) {

      loadMenuItems(selectedTruck.ownerId);
      
      // Load reviews for rating display

      loadReviews(selectedTruck.ownerId);
      
      // Drops will be loaded by the real-time listener useEffect
    } else {
   
    }
  }, [showMenuModal, selectedTruck?.ownerId]);

  // Real-time listener for drops when modal is open
  useEffect(() => {
    if (!showMenuModal || !selectedTruck?.ownerId) {
      return;
    }

    // Only set up real-time listener for customers, event organizers, or owners viewing other trucks
    if (userRole === 'customer' || userRole === 'event-organizer' || (userRole === 'owner' && selectedTruck.ownerId !== user?.uid)) {
 
      
      const dropsQuery = query(
        collection(db, "drops"),
        where("truckId", "==", selectedTruck.ownerId)
      );
      
      const unsubscribeDrops = onSnapshot(dropsQuery, (snapshot) => {
        const now = new Date();
        

        
        const allDrops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Log each drop with details
        allDrops.forEach((drop, index) => {
          const expiresAt = drop.expiresAt?.toDate() || new Date(0);
          const claimedCount = drop.claimedBy?.length || 0;
          const remaining = (drop.quantity || 0) - claimedCount;
          const isExpired = expiresAt <= now;
          const hasRemaining = remaining > 0;
          
        
        });
        
        const activeDrops = allDrops.filter(drop => {
          const expiresAt = drop.expiresAt?.toDate() || new Date(0);
          const remaining = (drop.quantity || 0) - (drop.claimedBy?.length || 0);
          return expiresAt > now && remaining > 0;
        });
        

        setTruckDrops(activeDrops);
        setLoadingDrops(false);
      }, (error) => {
        setLoadingDrops(false);
      });

      return () => {

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
  
        setImageAspectRatio(aspectRatio);
        setLoadingImageSize(false);
      },
      (error) => {
      
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
  
      return;
    }
    

    setLoadingMenu(true);
    setMenuItems([]);
    
    try {
      // Load NEW item IDs for this truck owner

      const ownerNewItemIds = await getNewItemIds(truckOwnerId);
      setNewItemIds(ownerNewItemIds);

      
      // Query Firestore directly for menu items

      
      const menuItemsRef = collection(db, 'menuItems');
      const menuQuery = query(menuItemsRef, where('ownerId', '==', truckOwnerId));
      
      
      const menuSnapshot = await getDocs(menuQuery);
   
      
      if (menuSnapshot.empty) {
  
        
        // Debug: Let's see all documents in the menuItems collection
     
        const allMenuItemsRef = collection(db, 'menuItems');
        const allMenuSnapshot = await getDocs(allMenuItemsRef);
      
        
        allMenuSnapshot.forEach((doc) => {
          const data = doc.data();
  
          if (data.ownerId === truckOwnerId) {
    
          }
        });
        
   
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

   
        if (items.length > 0) {

        }
        
        // Log NEW badge status for each item
        items.forEach(item => {
          const shouldShowNew = item.isNewItem || ownerNewItemIds.has(item.id);
          
        });
        
        setMenuItems(items);
      }
    } catch (error) {
      setMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  };

  // Favorites functionality
  const toggleFavorite = async (truckId, truckName) => {
    if (!user?.uid || !truckId) {
      showToastMessage('Please log in to favorite trucks', 'error');
      return;
    }

    try {
      const isFavorited = userFavorites.has(truckId);

      
      if (isFavorited) {
        // Remove from favorites - delete ALL matching records (handles duplicates)

        
        const favoritesQuery = query(
          collection(db, 'favorites'),
          where('userId', '==', user.uid),
          where('truckId', '==', truckId)
        );
        
        const snapshot = await getDocs(favoritesQuery);
  
        
        // Delete ALL matching records (handles duplicates)
        if (!snapshot.empty) {
          const deletePromises = snapshot.docs.map(docSnapshot => 
            deleteDoc(doc(db, 'favorites', docSnapshot.id))
          );
          await Promise.all(deletePromises);
 
        } else {

        }
      } else {
        // Add to favorites
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          truckId: truckId,
          truckName: truckName,
          createdAt: serverTimestamp(),
        });
        
        // Award points for expressing interest via favoriting
        try {
          await FoodieGameService.awardPoints(user.uid, 5, `Favorited ${truckName}`, {
            actionType: 'express_interest',
            displayName: user.displayName,
            truckId: truckId,
            truckName: truckName
          });
          
          // Update mission progress for expressing interest
          const result = await FoodieGameService.updateMissionProgress(user.uid, 'express_interest', 1);
          
          if (result.missionCompleted) {
            showToastMessage(`Truck favorited! Mission complete: ${result.missionCompleted.missionTitle} (+${result.missionCompleted.pointsAwarded} XP)`, 'success');
          } else {
            showToastMessage(`${truckName} favorited! (+5 XP)`, 'success');
          }
        } catch (gamificationError) {

          showToastMessage(`${truckName} favorited!`, 'success');
        }
      }
    } catch (error) {
   
      showToastMessage('Failed to update favorite. Please try again.', 'error');
    }
  };


  // Helper function to get rating summary for a truck (for map markers)
  const getTruckRatingSummary = async (truckId) => {
    if (!truckId) return { averageRating: 0, reviewCount: 0 };
    
    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('truckId', '==', truckId)
      );
      
      const snapshot = await getDocs(reviewsQuery);
      const reviewsData = snapshot.docs.map(doc => doc.data());
      
      if (reviewsData.length === 0) {
        return { averageRating: 0, reviewCount: 0 };
      }
      
      const total = reviewsData.reduce((sum, review) => sum + (review.rating || 0), 0);
      const average = total / reviewsData.length;
      
      return {
        averageRating: parseFloat(average.toFixed(1)),
        reviewCount: reviewsData.length
      };
    } catch (error) {
      return { averageRating: 0, reviewCount: 0 };
    }
  };

  // Reviews functionality
  const loadReviews = async (truckId) => {
    if (!truckId) {
   
      return;
    }
    
 
    setLoadingReviews(true);
    try {

      
      // Try with orderBy first, fallback to simple query if index not ready
      let reviewsQuery;
      try {
 
        reviewsQuery = query(
          collection(db, 'reviews'),
          where('truckId', '==', truckId),
          orderBy('createdAt', 'desc')
        );
      } catch (indexError) {
   
        reviewsQuery = query(
          collection(db, 'reviews'),
          where('truckId', '==', truckId)
        );
      }
      
      const snapshot = await getDocs(reviewsQuery);
      const reviewsData = snapshot.docs.map(doc => {
        const data = doc.data();
        let createdAt = new Date('2024-01-01'); // Default to old date instead of current time
        
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt.seconds) {
            // Handle Firestore timestamp object
            createdAt = new Date(data.createdAt.seconds * 1000);
          } else if (data.createdAt instanceof Date) {
            createdAt = data.createdAt;
          } else {
            createdAt = new Date(data.createdAt);
          }
        }
        
        return {
          id: doc.id,
          ...data,
          createdAt: createdAt,
        };
      });
      
      // Sort manually if we couldn't use orderBy
      reviewsData.sort((a, b) => b.createdAt - a.createdAt);
      
  
      setReviews(reviewsData);
    } catch (error) {

      
      if (error.code === 'permission-denied') {

      }
      
      // Try simple query without any ordering if the complex query fails
      try {
   
        const simpleQuery = query(
          collection(db, 'reviews'),
          where('truckId', '==', truckId)
        );
        const simpleSnapshot = await getDocs(simpleQuery);
        const simpleReviewsData = simpleSnapshot.docs.map(doc => {
          const data = doc.data();
          let createdAt = new Date('2024-01-01'); // Default to old date instead of current time
          
          if (data.createdAt) {
            if (typeof data.createdAt.toDate === 'function') {
              createdAt = data.createdAt.toDate();
            } else if (data.createdAt.seconds) {
              // Handle Firestore timestamp object
              createdAt = new Date(data.createdAt.seconds * 1000);
            } else if (data.createdAt instanceof Date) {
              createdAt = data.createdAt;
            } else {
              createdAt = new Date(data.createdAt);
            }
          }
          
          return {
            id: doc.id,
            ...data,
            createdAt: createdAt,
          };
        });
        
        // Sort manually
        simpleReviewsData.sort((a, b) => b.createdAt - a.createdAt);
        
    
        setReviews(simpleReviewsData);
      } catch (fallbackError) {

        showToastMessage('Failed to load reviews. Please try again later.', 'error');
      }
    } finally {
      setLoadingReviews(false);
    }
  };

  const submitReview = async () => {

    
    if (!user || !selectedTruck?.ownerId) {
      showToastMessage('Unable to submit review. Please try again.', 'error');
      return;
    }

    // Check if user is trying to review their own truck
    if (user.uid === selectedTruck.ownerId) {
      showToastMessage('You cannot review your own food truck.', 'error');
      return;
    }

    if (!newReview.comment.trim()) {
      showToastMessage('Please write a comment for your review.', 'error');
      return;
    }

    // Check if user already reviewed this truck
    try {
  
      const existingReviewQuery = query(
        collection(db, 'reviews'),
        where('truckId', '==', selectedTruck.ownerId),
        where('userId', '==', user.uid)
      );
      
      const existingSnapshot = await getDocs(existingReviewQuery);
      if (!existingSnapshot.empty) {
        showToastMessage('You have already reviewed this food truck. You can only submit one review per truck.', 'error');
        return;
      }

 
      setSubmittingReview(true);
      
      const reviewData = {
        truckId: selectedTruck.ownerId,
        truckName: selectedTruck.name || 'Food Truck',
        userId: user.uid,
        userName: userData?.username || userData?.displayName || user?.displayName || 'Anonymous',
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        createdAt: serverTimestamp(),
      };

      

      

      
      // Test Firebase connectivity first
 
      try {
        const testCollection = collection(db, 'test');
        await addDoc(testCollection, { 
          test: 'connectivity', 
          timestamp: new Date().toISOString(),
          user: user.uid 
        });

      } catch (testError) {
       
        throw new Error(`Firebase connectivity issue: ${testError.message}`);
      }
      
      // Test writing to reviews collection specifically
 
      try {
        const reviewsCollection = collection(db, 'reviews');
        const testReviewData = {
          userId: user.uid,
          truckId: selectedTruck.ownerId,
          rating: 5,
          comment: 'Test review',
          createdAt: new Date().toISOString(),
          truckName: selectedTruck.name,
          userName: userData?.username || userData?.displayName || user?.displayName || 'Anonymous'
        };
        await addDoc(reviewsCollection, testReviewData);
    
      } catch (testError) {
      
        throw new Error(`Reviews collection issue: ${testError.message}`);
      }
      
      const reviewsCollection = collection(db, 'reviews');
    
      
      await addDoc(reviewsCollection, reviewData);
      
 
      showToastMessage('Your review has been submitted!', 'success');
      
      // Reset form and reload reviews with a small delay to ensure document is saved
      setNewReview({ rating: 5, comment: '' });
      
      // Small delay to ensure the review document is properly written before reloading
      setTimeout(() => {
        loadReviews(selectedTruck.ownerId);
      }, 500);
      
    } catch (error) {
      
      // Try to get more Firebase-specific error details
      if (error.code) {
      }
      
      showToastMessage(`Failed to submit review: ${error.message}`, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStarRating = (rating, onPress = null, size = 24) => {
    return (
      <View style={styles.starRating}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={size}
              color={star <= rating ? '#FFD700' : '#ddd'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
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
      showToastMessage("You must be logged in to create a drop.", 'error');
      return;
    }

    if (!dropFormData.title.trim() || !dropFormData.description.trim()) {
      showToastMessage("Please fill in all required fields.", 'error');
      return;
    }

    if (!location) {
      showToastMessage("Location not available. Please try again.", 'error');
      return;
    }

    // Check user role permission
    if (userRole !== 'owner') {
      showToastMessage("Only business owners can create drops.", 'error');
      return;
    }

    setCreatingDrop(true);
    
    try {
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

 
      
      await addDoc(collection(db, "drops"), drop);
      

      
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
      showToastMessage(`Failed to create drop: ${error.message}`, 'error');
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
      

      setTruckDrops(activeDrops);
    } catch (error) {

      setTruckDrops([]);
    } finally {
      setLoadingDrops(false);
    }
  };

  // Real-time listener for truck drops
  useEffect(() => {
    if (!selectedTruck?.ownerId || !showMenuModal) return;


    
    const dropsQuery = query(
      collection(db, "drops"),
      where("truckId", "==", selectedTruck.ownerId)
    );
    
    const unsubscribe = onSnapshot(dropsQuery, (snapshot) => {
      const now = new Date();
      

      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
   
      });
      
      const activeDrops = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(drop => {
          const expiresAt = drop.expiresAt?.toDate() || new Date(0);
          const remaining = (drop.quantity || 0) - (drop.claimedBy?.length || 0);
          const isActive = expiresAt > now && remaining > 0;
        
          return isActive;
        });
      
    
      setTruckDrops(activeDrops);
    });

    return () => {
   
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
      
   
      
      try {
       
        
      
        
        await updateDoc(updateDropRef, {
          claimedBy: newClaimedBy
        });
        
      
        
        // Verify the update by reading the document back
        const verifySnap = await getDoc(updateDropRef);
        if (verifySnap.exists()) {
          const verifyData = verifySnap.data();
        
        } else {
        
        }
        
      } catch (updateError) {
    
        
        // If it's a permission error, provide specific feedback
        if (updateError.code === 'permission-denied') {
          setClaimMessage("Permission denied: Unable to claim this drop. Please check if you've already claimed it.");
          setTimeout(() => setClaimMessage(""), 5000);
          return;
        }
        
        throw updateError;
      }
      
  
      
      // Update local state
      setUserClaims(updatedClaims);

      const code = `GRB-${user.uid.slice(-4).toUpperCase()}${dropId.slice(-2)}`;
      setClaimCode(code);
      setClaimedDrop({ ...dropData, id: dropId });
      
      setClaimMessage("Drop claimed successfully! Show your code to the truck owner.");
      setTimeout(() => setClaimMessage(""), 5000);
      
      // Real-time listener will automatically update the drops UI
      
    } catch (error) {
    
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
          }
        }
      } catch (error) {
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

          return;
        }
        
        // Validate the parsed date
        if (isNaN(dropExpiresAt.getTime())) {

          return;
        }
      } catch (error) {
      
        return;
      }
      
   
      
      if (now > dropExpiresAt) {
  
        
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
      
          } catch (error) {
      
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

    setShowClaimCodesModal(false);
  }, []);

  // Debug: Monitor showClaimCodesModal state changes
  useEffect(() => {

    if (showClaimCodesModal) {
 
      
      // Auto-close modal after 30 seconds as a safety measure
      const autoCloseTimer = setTimeout(() => {
    
        setShowClaimCodesModal(false);
      }, 30000);
      
      return () => {
        clearTimeout(autoCloseTimer);
      };
    }
  }, [showClaimCodesModal]);

  // Cart functionality
  const addToCart = (item) => {

    
    // Check if truck is currently open before allowing pre-order
    if (selectedTruck?.businessHours) {
      const truckOpenStatus = checkTruckOpenStatus(selectedTruck.businessHours);

      
      if (truckOpenStatus === 'closed') {
        showCustomModal(
          '🚫 Mobile Kitchen Closed', 
          'Sorry, this mobile kitchen is currently closed and not accepting pre-orders. Pre-orders are only available during their open hours.',
          null,
          'OK',
          '',
          false
        );
        return;
      }
    } else {
     
    }
    
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
    showToastMessage(`${item.name} has been added to your cart!`, 'success');
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

      
      // Update both collections to keep them in sync
      const truckDocRef = doc(db, 'trucks', user.uid);
      const truckLocationRef = doc(db, 'truckLocations', user.uid);
      
      const updateData = {
        visible: isVisible,
        lastActivityTime: Date.now(),
        lastToggleTime: Date.now(),
        updatedAt: serverTimestamp()
      };
      

      
      // Update trucks collection
      await updateDoc(truckDocRef, updateData);

      
      // Update truckLocations collection (create if doesn't exist)
      await setDoc(truckLocationRef, updateData, { merge: true });
    
      

      
      // Force reload truck data to reflect changes immediately

      
      // 🚀 PERFORMANCE: Invalidate privacy cache to reflect immediate changes
 
      setPrivacyCache(new Map());
      setPrivacyCacheTimestamp(0);
      
    } catch (error) {

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
     
        }
      }
    } catch (error) {

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
  
        
        // Check if truck should be auto-hidden due to inactivity
        await checkTruckExpiry();
      } else {
        // For users with no existing visibility data, default to visible (all plans)

        setShowTruckIcon(true);
        // Also save this default to Firebase
        await updateTruckVisibility(true);
      }
      
    
    } catch (error) {
   
    }
  };

  // Menu image functionality
  const openFullScreenMenu = () => {
    if (!selectedTruck?.menuUrl) return;
    
    showCustomModal(
      '📋 Full Menu',
      'Opening full-size menu image...',
      () => {
        if (selectedTruck.menuUrl) {
          Linking.openURL(selectedTruck.menuUrl);
        }
      },
      'Open in Browser',
      'Cancel',
      true
    );
  };

  // Social media URL opener with error handling
  const openURL = async (url, platform) => {
    try {
      if (!url) {

        return;
      }
      
      // Ensure URL has proper protocol
      let formattedUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        formattedUrl = `https://${url}`;
      }
      
      const supported = await Linking.canOpenURL(formattedUrl);
      
      if (supported) {
        await Linking.openURL(formattedUrl);
      } else {

      }
    } catch (error) {

    }
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
      showCustomModal(
        '📤 Share Menu',
        shareText,
        () => {
          // In a full implementation, you'd copy to clipboard
          showToastMessage('Menu link has been copied to clipboard', 'success');
        },
        'Copy Link',
        'Cancel',
        true
      );
    } catch (error) {
      showToastMessage('Unable to share menu', 'error');
    }
  };

  // Open foodie photo gallery
  const openFoodieGallery = async (foodieId, foodieName) => {
    try {
      setSelectedFoodie({ id: foodieId, name: foodieName });
      setShowFoodieGallery(true);
      setLoadingPhotos(true);
      
      // Fetch photos from foodiePhotos collection
      const photosQuery = query(
        collection(db, 'foodiePhotos'),
        where('userId', '==', foodieId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const photosSnapshot = await getDocs(photosQuery);
      const photos = photosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
      }));
      
      // Check which photos the current user has liked
      if (user?.uid && photos.length > 0) {
        const photoIds = photos.map(photo => photo.id);
        const likesQuery = query(
          collection(db, 'photoLikes'),
          where('userId', '==', user.uid),
          where('photoId', 'in', photoIds)
        );
        
        const likesSnapshot = await getDocs(likesQuery);
        const likedPhotoIds = new Set(likesSnapshot.docs.map(doc => doc.data().photoId));
        
        // Add isLikedByUser property to each photo
        const photosWithLikeStatus = photos.map(photo => ({
          ...photo,
          isLikedByUser: likedPhotoIds.has(photo.id)
        }));
        
        setFoodiePhotos(photosWithLikeStatus);
      } else {
        // No user or no photos - set isLikedByUser to false for all
        const photosWithLikeStatus = photos.map(photo => ({
          ...photo,
          isLikedByUser: false
        }));
        
        setFoodiePhotos(photosWithLikeStatus);
      }
      setLoadingPhotos(false);
    } catch (error) {
  
      setLoadingPhotos(false);
      
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        showToastMessage('Photo gallery needs setup. Please try again in a moment.', 'info');
      } else {
        showToastMessage('Unable to load photos', 'error');
      }
      
      // Set empty photos array so gallery still opens
      setFoodiePhotos([]);
    }
  };

  // Like/unlike a foodie photo
  const togglePhotoLike = async (photoId, isLiked) => {
    if (!user?.uid) return;
    
    try {
      const photoRef = doc(db, 'foodiePhotos', photoId);
      const likeRef = doc(db, 'photoLikes', `${photoId}_${user.uid}`);
      
      if (isLiked) {
        // Unlike - remove like document
        await deleteDoc(likeRef);
        await updateDoc(photoRef, {
          likeCount: increment(-1)
        });
      } else {
        // Like - add like document  
        await setDoc(likeRef, {
          photoId,
          userId: user.uid,
          timestamp: serverTimestamp()
        });
        await updateDoc(photoRef, {
          likeCount: increment(1)
        });
      }
      
      // Update local state
      setFoodiePhotos(prevPhotos => 
        prevPhotos.map(photo => 
          photo.id === photoId 
            ? { 
                ...photo, 
                likeCount: (photo.likeCount || 0) + (isLiked ? -1 : 1),
                isLikedByUser: !isLiked
              }
            : photo
        )
      );
    } catch (error) {
  
      showToastMessage('Unable to update like', 'error');
    }
  };

  // Delete photo function - only allows users to delete their own photos
  const deletePhoto = async (photoId, imageUrl) => {
    if (!user?.uid) return;
    
    try {
      // Show confirmation dialog
      showCustomModal(
        'Delete Photo',
        'Are you sure you want to delete this photo? This action cannot be undone.',
        async () => {
          try {
  
            
            // Import Firebase functions
            const { doc, deleteDoc } = await import('firebase/firestore');
            const { ref, deleteObject } = await import('firebase/storage');
            const { db, storage } = await import('../firebase');
            
            // Delete from Firestore
            await deleteDoc(doc(db, 'foodiePhotos', photoId));
            
            // Delete from Storage
            // Extract storage path from download URL
            const urlParts = imageUrl.split('/o/')[1].split('?')[0];
            const storagePath = decodeURIComponent(urlParts);
  
            
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef);
            
            // Remove from local state
            setFoodiePhotos(prev => prev.filter(photo => photo.id !== photoId));
            
            // Refresh leaderboard data to update trophy badges
            await refreshLeaderboardData();
            

            showToastMessage('Photo deleted successfully', 'success');
            
          } catch (error) {
   
            showToastMessage('Failed to delete photo', 'error');
          }
        },
        'Delete',
        'Cancel',
        true
      );
    } catch (error) {

    }
  };

  // Photo upload functions moved to dedicated PhotoUploadScreen

  // Fetch claim codes for a specific drop (owner only)
  const fetchClaimCodes = async (dropId) => {
    if (!user || userRole !== 'owner') return;
    
    setLoadingClaimCodes(true);
    try {

      
      // Get the drop document to access claimedBy array
      const dropRef = doc(db, 'drops', dropId);
      const dropSnap = await getDoc(dropRef);
      
      if (!dropSnap.exists()) {
  
        setClaimCodes([]);
        return;
      }
      
      const dropData = dropSnap.data();
      const claimedBy = dropData.claimedBy || [];
      
    
      
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
   
    } catch (error) {

      setClaimCodes([]);
    } finally {
      setLoadingClaimCodes(false);
    }
  };

  const placeOrder = async () => {

    
    if (cart.length === 0) {
      showToastMessage('Please add items to your cart before placing an order.', 'error');
      return;
    }

    if (!user) {
      showToastMessage('Please log in to place an order.', 'error');
      return;
    }



    if (!selectedTruck?.stripeConnectAccountId) {

      
      showCustomModal(
        'Payment Setup In Progress', 
        'This business is still setting up payment processing. Please try again in a few minutes, or contact the business owner if this persists.',
        async () => {
            
          // Force reload the map data which will fetch fresh truck information
          try {
            // Trigger a map refresh by updating the trucks data hash
            setTrucksDataHash(Date.now().toString());
    
          } catch (error) {
          
          }
        },
        'Refresh & Retry',
        'Cancel',
        true
      );
      return;
    }

    try {

      
      // Calculate payment amounts
      const subtotal = parseFloat(getTotalPrice());
      const salesTax = parseFloat(getSalesTax());
      const finalTotal = parseFloat(getFinalTotal());
      
      // Calculate platform fees (hidden from customer but still collected)
      const paymentBreakdown = calculateStripeConnectPayment(cart, selectedTruck);
      
   
      
      if (!paymentBreakdown.isValid) {
        if (paymentBreakdown.orderTotal < 5.00) {
          throw new Error(`Minimum order amount is $5.00. Please add more items to your cart. Current total: $${paymentBreakdown.orderTotal.toFixed(2)}`);
        } else {
          throw new Error('Payment setup incomplete. Please ensure the business has completed their payment setup.');
        }
      }

      // Calculate smart estimated preparation time
      const currentTime = new Date();
      
      // Get current pending/preparing orders count for queue calculation
      let currentQueueSize = 0;
      try {
        const queueQuery = query(
          collection(db, 'orders'),
          where('truckId', '==', selectedTruck?.ownerId || selectedTruck?.id),
          where('status', 'in', ['pending', 'confirmed', 'preparing'])
        );
        const queueSnapshot = await getDocs(queueQuery);
        currentQueueSize = queueSnapshot.size;
     
      } catch (error) {
        // Silently handle permissions error - queue size calculation is optional
        // Using default of 0 orders won't significantly impact time estimates
   
        currentQueueSize = 0;
      }

      const estimatedTimeData = calculateEstimatedTime({
        items: cart,
        orderTime: currentTime,
        truckData: selectedTruck,
        currentOrders: currentQueueSize
      });

   

      // Create order in Firebase first to get order ID
      const orderData = {
        customerId: user.uid, // Changed from userId to customerId to match security rules
        userId: user.uid, // Keep userId for backward compatibility
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
        platformFeePercentage: paymentBreakdown.commissionPercentage,
        platformFeeAmount: paymentBreakdown.commissionAmount,
        vendorReceives: finalTotal - paymentBreakdown.commissionAmount, // Vendor gets total minus platform fee
        
        // Status tracking
        status: 'pending_payment',
        paymentStatus: 'pending_payment', // Changed from 'pending' to be more explicit
        deliveryMethod: 'pickup',
        
        // Smart estimated time
        estimatedPrepTime: estimatedTimeData.estimatedMinutes,
        estimatedTimeCalculation: estimatedTimeData.breakdown,
        estimatedTimeDescription: getTimeDescription(estimatedTimeData.estimatedMinutes),
        isEstimatedTimeOverridden: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };


      
      // Test basic Firebase connection first
      try {

        const testDoc = await addDoc(collection(db, 'test'), { test: true, timestamp: new Date() });

      } catch (testError) {

      }
      
      // Declare orderId outside try block for broader scope
      let orderId;
      
      try {
        const docRef = await addDoc(collection(db, 'orders'), orderData);
        orderId = docRef.id;
   
      } catch (orderError) {

    
        throw orderError;
      }

      // Prepare payment intent data with customer's total amount (including tax)
      const customPaymentBreakdown = {
        ...paymentBreakdown,
        orderTotal: finalTotal,
        orderTotalCents: Math.round(finalTotal * 100),
        // Platform fee stays the same percentage but is now calculated on the total with tax
        platformFeeAmount: finalTotal * paymentBreakdown.commissionPercentage,
        vendorReceives: finalTotal - (finalTotal * paymentBreakdown.commissionPercentage)
      };
      
      const paymentIntentData = preparePaymentIntentData(customPaymentBreakdown, {
        ...orderData,
        orderId
      });

      // Call your server to create payment intent
   
      const apiUrl = 'https://pingmyappetite-production.up.railway.app';

      
      const response = await fetch(`${apiUrl}/api/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentIntentData)
      });




      
      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 200)}`);
      }
      
      const responseText = await response.text();

      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
      
      const { client_secret, payment_intent_id } = responseData;

      
      if (!client_secret) {
        throw new Error('Failed to create payment intent');
      }



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
  
        throw new Error('Failed to initialize payment: ' + initError.message);
      }


      // Present payment sheet


      if (paymentError) {
        if (paymentError.code === 'Canceled') {
  
          // Update order status to canceled
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'cancelled',
            paymentStatus: 'cancelled',
            cancelledAt: serverTimestamp()
          });
          return;
        } else {
          throw new Error('Payment failed: ' + paymentError.message);
        }
      }

      // Payment successful - update order

      await updateDoc(doc(db, 'orders', orderId), {
        status: 'pending',    // Changed from 'confirmed' to 'pending' - mobile kitchen owner must confirm first
        paymentStatus: 'paid',
        paymentIntentId: payment_intent_id,
        paidAt: serverTimestamp()
      });

      // Clear cart and close modals
      setCart([]);
      setShowCartModal(false);
      setShowMenuModal(false);
      
      // Show success message with customer-friendly breakdown
      showCustomModal(
        'Order Placed Successfully! 🎉',
        `Order ID: ${orderId.substring(0, 8)}...\n\n` +
        `Subtotal: $${subtotal.toFixed(2)}\n` +
        `Sales Tax: $${salesTax.toFixed(2)}\n` +
        `Total Paid: $${finalTotal.toFixed(2)}\n\n` +
        `Your order has been sent to the mobile kitchen owner for confirmation. You'll be notified once they confirm your order and start preparing it!`,
        null,
        'Great!',
        '',
        false
      );

    } catch (error) {

      showCustomModal(
        'Payment Error', 
        error.message || 'Failed to process payment. Please try again.',
        null,
        'OK',
        '',
        false
      );
    }
  };

  // Handle catering form submission
  const handleCateringSubmit = async () => {
    // Validate required fields
    const { customerName, customerEmail, customerPhone, eventDate, eventTime, eventLocation, guestCount } = cateringFormData;
    
    if (!customerName || !customerEmail || !customerPhone) {
      showToastMessage('Please fill in your name, email, and phone number.', 'error');
      return;
    }

    if (!eventDate || !eventTime || !eventLocation || !guestCount) {
      showToastMessage('Please provide event date, time, location, and estimated guest count.', 'error');
      return;
    }

    setSubmittingCateringForm(true);

    try {
   
      
      // Check if we have the required truck owner ID
      if (!selectedTruck?.ownerId) {
        showToastMessage('Unable to find truck owner information. Please try again later.', 'error');
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



      const result = await sendCateringRequest(functionData);
      


      if (result.data.success) {
        showCustomModal(
          'Catering Request Sent! 🎉',
          `Your catering request has been sent to ${selectedTruck?.name}. They will contact you directly at ${customerEmail} to discuss pricing, menu options, and availability.`,
          null,
          'Great!',
          '',
          false
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
      showCustomModal(
        'Error',
        'Failed to send catering request. Please try contacting the business directly or try again later.',
        null,
        'OK',
        '',
        false
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
      showToastMessage('Please fill in your name, email, and phone number.', 'error');
      return;
    }

    if (!eventName || !eventDate || !eventTime || !eventLocation || !expectedAttendance) {
      showToastMessage('Please provide event name, date, time, location, and expected attendance.', 'error');
      return;
    }

    setSubmittingFestivalForm(true);

    try {
 
      
      // Check if we have the required truck owner ID
      if (!selectedTruck?.ownerId) {
        showToastMessage('Unable to find truck owner information. Please try again later.', 'error');
        setSubmittingFestivalForm(false);
        return;
      }

      // Send email to truck owner using Firebase Function with SendGrid
  
      
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



      const result = await sendFestivalRequest(functionData);
      


      if (result.data.success) {
        showCustomModal(
          'Festival Booking Request Sent! 🎪',
          `Your festival booking request has been sent to ${selectedTruck?.name}. They will contact you directly at ${organizerEmail} to discuss availability, booth fees, and event details.`,
          null,
          'Excellent!',
          '',
          false
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
      showCustomModal(
        'Error',
        'Failed to send festival booking request. Please try contacting the business directly or try again later.',
        null,
        'OK',
        '',
        false
      );
    } finally {
      setSubmittingFestivalForm(false);
    }
  };

  // Load real-time data from Firebase
  useEffect(() => {

    
    // Allow guest users to browse trucks and events without authentication
    // Only skip loading if we're in a state where user status is still being determined
    

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

      // Note: For production, consider using GeoHash or external geographic indexing
      // Firebase doesn't support efficient geo queries without additional indexing
    }
    
    const unsubscribeTrucks = onSnapshot(
      query, 
      async (snapshot) => {

        
      
        
        // 🚀 PERFORMANCE: Early truncation for large datasets
        const totalTrucks = snapshot.size;
        const trucksToProcess = Math.min(totalTrucks, MAX_TRUCKS_PER_LOAD);
        
        if (totalTrucks > MAX_TRUCKS_PER_LOAD) {
          
        }
        
        const trucksWithOwnerData = [];
        
        if (snapshot.size === 0) {

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
            
          
        }

        // 🚀 PERFORMANCE OPTIMIZATION: Use cached privacy settings or batch load
        const allTruckIds = filteredTrucks.map(doc => doc.id);
        const now = Date.now();
        const isCacheValid = (now - privacyCacheTimestamp) < PRIVACY_CACHE_DURATION;
        
        
        
        let trucksPrivacyMap = {};
        
        if (isCacheValid && privacyCache.size > 0) {
          // Use cached privacy settings
 
          allTruckIds.forEach(id => {
            if (privacyCache.has(id)) {
              trucksPrivacyMap[id] = privacyCache.get(id);
            }
          });
        } else {
          // Cache expired or empty - batch load fresh privacy settings
         
          
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
             
                    return { id: truckId, visible: false, exists: false };
                  }
                })
              );
              batchPromises.push(batchPromise);
            }
            
            const batchArrays = await Promise.all(batchPromises);
            const batchResults = batchArrays.flat();
            
            
            
            // Update cache
            const newCache = new Map();
            batchResults.forEach(result => {
              trucksPrivacyMap[result.id] = result;
              newCache.set(result.id, result);
            });
            
            setPrivacyCache(newCache);
            setPrivacyCacheTimestamp(now);
            
          
          } catch (error) {
    
            return { trucksToDisplay: [], trucksWithOwnerData: [] };
          }
        }
        
        for (const docSnapshot of filteredTrucks) {
          const truckData = { id: docSnapshot.id, ...docSnapshot.data() };
          
          // SPECIAL DEBUG: Track your "True" truck specifically
          const isTrueTruck = truckData.truckName === 'True';
          if (isTrueTruck) {
         
          }
          
          
          
          // 🔒 FAST PRIVACY CHECK: Use pre-loaded privacy data
          const trucksPrivacy = trucksPrivacyMap[truckData.id];
          const trucksVisible = trucksPrivacy ? trucksPrivacy.visible : undefined;
          const locationsVisible = truckData.visible;
          
      
          
          // If EITHER collection has visible=false, hide the truck (most restrictive wins)
          if (trucksVisible === false || locationsVisible === false) {
            
            continue;
          }
          
          // Special case: If this is "The Grubber" and we're expecting it to be hidden
          if ((truckData.truckName || '').includes('Grubber')) {
           
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
        
     
        
        // SPECIAL DEBUG for "True" truck
        if (isTrueTruck) {
          
        }
        
        if (!isVisible) {
      
          continue;
        }
        
        // Get complete owner data and payment data for each truck
        try {
          // Get owner data from users collection
          const ownerDoc = await getDoc(doc(db, 'users', truckData.ownerUid || truckData.id));
          
          // Get payment data from trucks collection 
          const paymentDoc = await getDoc(doc(db, 'trucks', truckData.ownerUid || truckData.id));
          
       
          
          let paymentData = {};
          if (paymentDoc.exists()) {
            paymentData = paymentDoc.data();
       
          } else {
       
          }
          
          if (ownerDoc.exists()) {
            const ownerData = ownerDoc.data();
        
            
            // Merge truck location data with complete owner profile data AND payment data
            // Prioritize 'cuisine' field over 'cuisineType' field
           
            const actualCuisine = ownerData.cuisine || ownerData.cuisineType || inferCuisineType(ownerData.truckName || ownerData.username);
            const finalTruckData = {
              ...truckData,
              ...paymentData, // Include payment data from trucks collection
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
              businessHours: ownerData.businessHours, // Add business hours for status calculation
              description: ownerData.description // Add description for display in modal
            };
            
            
            trucksWithOwnerData.push(finalTruckData);
          } else {
    
            // Include truck with basic data and sensible defaults INCLUDING payment data
            trucksWithOwnerData.push({
              ...truckData,
              ...paymentData, // Include payment data even if owner data is missing
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
         
          } else {
  
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
      

      
      // DETAILED PRIVACY DEBUG: Log every truck and its visibility status

      trucksWithOwnerData.forEach((truck, index) => {

      });
      
      // Mark that we've received Firebase data (even if empty due to privacy filtering)
      setHasReceivedFirebaseData(true);
      
      if (trucksWithOwnerData.length === 0) {
        
      }
      
      setFoodTrucks(trucksWithOwnerData);
    },
    (error) => {

      
      // Mark that we've received a Firebase response (even if it's an error)
      setHasReceivedFirebaseData(true);
      
      // Set empty array to avoid showing mock data if there's a real error
      setFoodTrucks([]);
    });

    // Load customer pings for heatmap (kitchen owners/event organizers) and individual markers (customers)
    let unsubscribePings = null;

    
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
        
        // Only include pings within reasonable distance (1000km radius) for better coverage
        // Skip distance filtering if no user location available
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
          const withinRange = distance <= 1000; // Temporarily increase to 1000km for testing
  
          return isFinite(lat) && isFinite(lng) && isRecent && withinRange;
        }        return isFinite(lat) && isFinite(lng) && isRecent;
      });
      
      setCustomerPings(pings);
    });

    // Load events for event organizers and display on map for all users
    let unsubscribeEvents = null;
 
    
    unsubscribeEvents = onSnapshot(collection(db, "events"), async (snapshot) => {

      
      const eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })).filter(event => {
        // Filter for events that should be visible on map
        const hasCoordinates = event.latitude && event.longitude;
        const isPublished = event.status !== 'draft'; // Hide draft events
        
  
        
        return hasCoordinates && isPublished;
      });
      
      // Fetch organizer logos for events that need them
      const eventsWithLogos = await Promise.all(eventsData.map(async (event) => {
        if (event.organizerId && (!event.organizerLogoUrl || event.organizerLogoUrl.trim() === '')) {
          try {
        
            const organizerRef = doc(db, 'users', event.organizerId);
            const organizerSnap = await getDoc(organizerRef);
            
            if (organizerSnap.exists()) {
              const organizerData = organizerSnap.data();
              const logoUrl = organizerData.logoUrl || '';
          
              
              return {
                ...event,
                organizerLogoUrl: logoUrl
              };
            }
          } catch (error) {
          }
        }
        
        return event;
      }));
      
  
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
    
    
    (async () => {
    
      let { status } = await Location.requestForegroundPermissionsAsync();

      setLocationPermission(status);
      
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Please enable location access in settings.');

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

        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000, // 15 second timeout
        });
        
        setLocation(location);
       

        // Save location for ALL users so they appear on the map
        if (user?.uid) {
          try {
            // Update user's current location in users collection for foodie markers
            const userDocRef = doc(db, 'users', user.uid);
            const userLocationData = {
              currentLocation: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              },
              lastKnownLocation: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              },
              lastActive: serverTimestamp(),
              lastActivityTime: Date.now()
            };
            
            await setDoc(userDocRef, userLocationData, { merge: true });
 
            
            // Additional logic for food truck owners
            if (userRole === 'owner') {
              // Wait for sessionId and ownerData if they're not ready yet
              let attempts = 0;
              const maxAttempts = 10; // Wait up to 5 seconds (500ms * 10)
              
              while ((!sessionId || !ownerData) && attempts < maxAttempts) {
     
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
                attempts++;
              }
              
              if (sessionId && ownerData) {
         
              } else {
         
              }
              
              // Save to Firestore as truck location
              const truckDocRef = doc(db, 'truckLocations', user.uid);
              
              // Only set visible field if showTruckIcon is not null (i.e., loaded from Firebase)
              // This prevents overwriting the saved visibility preference during initial load
              const locationData = {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
                isLive: true,
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
              
              // Only set visible field if showTruckIcon has been loaded from Firebase
              // This prevents overwriting the saved visibility preference during initial load
              if (showTruckIcon !== null) {
                locationData.visible = showTruckIcon;

              } else {
        
              }
              
              // Save to trucks collection for persistence and visibility management
              const trucksDocRef = doc(db, 'trucks', user.uid);
              await setDoc(trucksDocRef, locationData, { merge: true });
              
              await setDoc(truckDocRef, locationData, { merge: true });
  
            }
          } catch (firebaseError) {
          
          }
        }
        
      } catch (locationError) {
     
        
        // Provide helpful error message for all users
        setErrorMsg('Unable to get your current location. Please check your location settings and try again. Showing all trucks nationwide for now.');
      
        
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

  // Additional effect to ensure user location is updated when location changes
  useEffect(() => {
    const saveLateLoadedLocation = async () => {
      if (user?.uid && location) {
        try {
          // Update user's current location for all users
          const userDocRef = doc(db, 'users', user.uid);
          const userLocationData = {
            currentLocation: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            },
            lastKnownLocation: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            },
            lastActive: serverTimestamp(),
            lastActivityTime: Date.now()
          };
          
          await setDoc(userDocRef, userLocationData, { merge: true });
      
          
          // Additional truck owner logic
          if (userRole === 'owner' && sessionId && ownerData) {

            
            const truckDocRef = doc(db, 'truckLocations', user.uid);
            
            // Only set visible field if showTruckIcon is not null (i.e., loaded from Firebase)
            // This prevents overwriting the saved visibility preference during initial load
            const locationData = {
              lat: location.coords.latitude,
            lng: location.coords.longitude,
            isLive: true,
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
          
          // Only set visible field if showTruckIcon has been loaded from Firebase
          // This prevents overwriting the saved visibility preference during initial load
          if (showTruckIcon !== null) {
            locationData.visible = showTruckIcon;
          }
          
          // Save to both collections
          const trucksDocRef = doc(db, 'trucks', user.uid);
          await setDoc(trucksDocRef, locationData, { merge: true });
          await setDoc(truckDocRef, locationData, { merge: true });
          }
        } catch (error) {
 
        }
      }
    };
    
    saveLateLoadedLocation();
  }, [sessionId, ownerData, location, userRole, user, showTruckIcon]);

  // Subscribe to nearby foodies for map display
  useEffect(() => {

    
    const lat = location?.coords?.latitude || location?.latitude;
    const lng = location?.coords?.longitude || location?.longitude;
    
    if (!lat || !lng || !user?.uid) {
   
      setNearbyFoodies([]);
      return;
    }

    let unsubscribe = null;
    let isActive = true;
    
    const setupFoodiesSubscription = async () => {
      try {
        if (!isActive) return;
        
  
        setLoadingFoodies(true);
        
        unsubscribe = await FoodieGameService.subscribeToNearbyFoodies(
          location,
          10, // 10km radius
          (foodies) => {
            if (isActive) {
              setNearbyFoodies(foodies);
              setLoadingFoodies(false);
            }
          }
        );
      } catch (error) {
    
        if (isActive) {
          setNearbyFoodies([]);
          setLoadingFoodies(false);
        }
      }
    };

    setupFoodiesSubscription();

    return () => {
      isActive = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [location?.coords?.latitude, location?.coords?.longitude, location?.latitude, location?.longitude, user?.uid]);

  // Periodically update user's lastActive timestamp to keep them visible on the map
  useEffect(() => {
    if (!user?.uid) return;

    const updateLastActive = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          lastActive: serverTimestamp(),
          lastActivityTime: Date.now()
        }, { merge: true });

      } catch (error) {

      }
    };

    // Update immediately
    updateLastActive();

    // Update every 5 minutes to keep user visible
    const interval = setInterval(updateLastActive, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.uid]);

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
    // Temporarily bypass leaderboard loading check to get map working again
    // TODO: Fix leaderboard loading issue
    // if (leaderboardLoading) {

    //   return;
    // }

    const generateHTML = async () => {
      // Use default location if user location is not available (for ping display purposes)
      let currentLocation = location;
      if (!location) {

        currentLocation = {
          coords: {
            latitude: 33.5586493, // Default to roughly Murrieta area (where the pings are)
            longitude: -117.1574504
          }
        };
      }
      
      
      
      // 🚀 PERFORMANCE: Start performance monitoring
      const perfStart = Date.now();
      const initialTruckCount = foodTrucks.length;
      
      setWebViewReady(false); // Reset ready state when regenerating HTML
      const html = await createMapHTML();
      
      // 🚀 PERFORMANCE: Log performance metrics
      const perfEnd = Date.now();
      const processingTime = perfEnd - perfStart;
      

      
      if (initialTruckCount > MAX_TRUCKS_PER_LOAD) {
    
      } else {
  
      }
      
      setMapHTML(html);
    };
    
    generateHTML();
  }, [location, trucksDataHash, customerPings, events, userPlan, showTruckIcon, excludedCuisines, userFavorites, currentCheckIn, nearbyFoodies, leaderboardUserIds, leaderboardLoading]);
  // NOTE: Using trucksDataHash instead of foodTrucks to prevent unnecessary regeneration
  // NOTE: Added leaderboardUserIds and leaderboardLoading to ensure map updates when leaderboard data changes

  // Pre-fetch and convert images to base64 for WebView
  const convertImageToBase64 = async (imageUrl) => {
    try {

      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          
          resolve(reader.result);
        };
        reader.onerror = () => {
  
          reject(new Error('Failed to convert to base64'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
 
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
    
      return {
        type: 'logo',
        data: logoUrl,
        html: `<div style="width: 50px; height: 50px; border-radius: 50%; border: 3px solid #FFD700; overflow: hidden; box-shadow: 0 3px 10px rgba(0,0,0,0.4); background: white; display: flex; align-items: center; justify-content: center; position: relative;">
          <img src="${logoUrl}" style="width: calc(100% - 6px); height: calc(100% - 6px); object-fit: cover; border-radius: 50%;" this.style.display='none';" />
          <div style="position: absolute; bottom: -2px; right: -2px; width: 16px; height: 16px; background: #FFD700; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.3); border: 2px solid white; font-size: 10px;">⭐</div>
        </div>`
      };
    }
    
    // Option 2: Use initials with event status-based colors (fallback only)
 
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
    // Use default location if user location is not available
    let currentLocation = location;
    if (!location) {
      currentLocation = {
        coords: {
          latitude: 33.5586493,
          longitude: -117.1574504
        }
      };
    }
    
    const userLat = currentLocation.coords.latitude;
    const userLng = currentLocation.coords.longitude;
    
    // Combine real truck data with mock data for demonstration purposes
    // Always show mock trucks to provide a rich demo experience
    let trucksToDisplay = [...mockFoodTrucks];
    
    // Add real Firebase trucks if available (they will appear alongside mock trucks)
    if (foodTrucks.length > 0) {
      trucksToDisplay = [...trucksToDisplay, ...foodTrucks];
    }
    
    
    
    // CRITICAL DEBUG: Check specifically for "The Grubber"
    const grubberTruck = trucksToDisplay.find(t => (t.truckName || t.name || '').toLowerCase().includes('grubber'));
    if (grubberTruck) {
   
      
    } else {
  
    }
    
    if (foodTrucks.length === 0 && hasReceivedFirebaseData) {
   
    } else if (foodTrucks.length === 0 && !hasReceivedFirebaseData) {

    }
    
    // Filter out current user's truck if they've toggled it off (owners only)
    if (userRole === 'owner' && user && !showTruckIcon) {
    
      
      // Filter out the current user's truck
      trucksToDisplay = trucksToDisplay.filter(truck => truck.uid !== user.uid);
      
    
    } else if (userRole === 'owner' && user && showTruckIcon) {
 
    }
    
    // SPECIAL DEBUG: Check if "True" truck made it to the display list
    const trueTruckInDisplay = trucksToDisplay.find(t => t.truckName === 'True');
    if (trueTruckInDisplay) {
    
    } else {
   
    }
    
    // Pre-process trucks with base64 images
 
    
    // 🚀 PERFORMANCE: Implement lazy loading for large datasets
    const MAX_CONCURRENT_IMAGES = 10; // Process max 10 images at once
    const ENABLE_LAZY_LOADING = trucksToDisplay.length > 20; // Enable for 20+ trucks
    
    let processedTrucks;
    
    if (ENABLE_LAZY_LOADING) {

      
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
     
              try {
                base64Image = await convertImageToBase64(truck.coverUrl);
              } catch (error) {
       
              }
            } else if (skipImageProcessing) {
     
            }
            
            // Load rating data for this truck (in batch processing)
   
            const ratingData = await getTruckRatingSummary(truck.ownerId || truck.id);
  
            
            const personalizedIcon = generatePersonalizedIcon({
              ...truck,
              base64CoverImage: base64Image
            });
            
            return {
              ...truck,
              base64CoverImage: base64Image,
              hasCustomIcon: !!base64Image,
              personalizedIcon: personalizedIcon,
              // Add rating data
              averageRating: ratingData.averageRating,
              reviewCount: ratingData.reviewCount
            };
          })
        );
        
        processedTrucks.push(...batchResults);
      
      }
    } else {
      // Standard processing for smaller datasets
      processedTrucks = await Promise.all(
        trucksToDisplay.map(async (truck) => {
          let base64Image = null;
          
          if (truck.coverUrl && truck.coverUrl.trim() !== '') {
            
            base64Image = await convertImageToBase64(truck.coverUrl);
          }
          
          // Load rating data for this truck
  
          const ratingData = await getTruckRatingSummary(truck.ownerId || truck.id);

          
          const personalizedIcon = generatePersonalizedIcon({
            ...truck,
            base64CoverImage: base64Image
          });
          
          return {
            ...truck,
            base64CoverImage: base64Image,
            hasCustomIcon: !!base64Image,
            personalizedIcon: personalizedIcon,
            // Add rating data
            averageRating: ratingData.averageRating,
            reviewCount: ratingData.reviewCount
          };
        })
      );
    }
    
    const successCount = processedTrucks.filter(truck => truck.hasCustomIcon).length;

    
    // Pre-process events with personalized icons

    const processedEvents = await Promise.all(
      events.map(async (event) => {
        let base64Logo = null;
        
        if (event.organizerLogoUrl && event.organizerLogoUrl.trim() !== '') {
 
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

    
    // 🔍 DEBUG: Log the processed truck data
 
    processedTrucks.forEach((truck, index) => {
    
    });
    

   
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
  
    } catch (error) {
 
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

    } catch (error) {
  
      sanitizedEvents = [];
    }

    let sanitizedPings = [];
    try {
      sanitizedPings = JSON.parse(JSON.stringify(customerPings)); // Deep clone to remove any problematic references
  
    } catch (error) {

      sanitizedPings = [];
    }

    let sanitizedFoodies = [];
    try {
      sanitizedFoodies = JSON.parse(JSON.stringify(nearbyFoodies)); // Deep clone to remove any problematic references

    } catch (error) {
  
      sanitizedFoodies = [];
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
                background: linear-gradient(135deg, #0B0B1A 0%, #1A1036 100%);
                box-shadow: 0 8px 24px rgba(255, 78, 201, 0.15), 0 0 20px rgba(77, 191, 255, 0.1);
                border: 1px solid #FF4EC9;
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
                color: #FFFFFF;
                margin-bottom: 8px;
                text-shadow: 0 0 8px rgba(255, 78, 201, 0.5);
            }
            
            .truck-rating-popup {
                margin: 0 15px 12px 15px;
                padding: 8px 12px;
                background: linear-gradient(135deg, #1A1036 0%, #2D1B4E 100%);
                border-radius: 8px;
                border: 1px solid #4DBFFF;
                box-shadow: 0 0 10px rgba(77, 191, 255, 0.3);
            }
            
            .rating-stars {
                font-size: 16px;
                margin-bottom: 4px;
                letter-spacing: 2px;
            }
            
            .rating-text {
                font-size: 12px;
                font-weight: 600;
                color: #4DBFFF;
                text-align: center;
            }
            
            .no-rating {
                font-size: 11px;
                color: #B0B3C2;
                font-style: italic;
                text-align: center;
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
                color: #B0B3C2;
                margin: 4px 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            
            .view-details-btn {
                background: linear-gradient(135deg, #FF4EC9 0%, #E91E63 100%);
                color: white;
                border: none;
                padding: 12px 16px;
                border-radius: 0 0 12px 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(255, 78, 201, 0.3), 0 0 20px rgba(255, 78, 201, 0.2);
                width: 100%;
                margin-top: 15px;
            }
            
            .view-details-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(255, 78, 201, 0.4), 0 0 25px rgba(255, 78, 201, 0.3);
            }
            
            .leaflet-popup-content-wrapper {
                border-radius: 12px;
                overflow: hidden;
                background: linear-gradient(135deg, #0B0B1A 0%, #1A1036 100%) !important;
                border: 2px solid #FF4EC9 !important;
                box-shadow: 0 8px 32px rgba(255, 78, 201, 0.3), 0 4px 16px rgba(77, 191, 255, 0.2) !important;
            }
            
            .leaflet-popup-tip {
                background: #0B0B1A !important;
                border: 2px solid #FF4EC9 !important;
            }
            .controls {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 1000;
                background: #1A1036;
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
                border: 2px solid #FF4EC9;
                border-radius: 8px;
                background: #1A1036;
                color: #FFFFFF;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
                box-shadow: 0 0 10px rgba(255, 78, 201, 0.3);
            }
            .control-btn:hover { 
                background: #FF4EC9; 
                box-shadow: 0 0 20px rgba(255, 78, 201, 0.6);
                transform: translateY(-1px);
            }
            .control-btn:active { 
                background: #4DBFFF; 
                border-color: #4DBFFF;
                box-shadow: 0 0 15px rgba(77, 191, 255, 0.5);
                transform: scale(0.98);
            }
            .control-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background: #B0B3C2;
                border-color: #B0B3C2;
                box-shadow: none;
            }
            .plan-notice {
                position: absolute;
                bottom: 10px;
                left: 10px;
                right: 10px;
                z-index: 1000;
                background: rgba(26, 16, 54, 0.95);
                color: #FFFFFF;
                padding: 10px;
                border-radius: 8px;
                border: 2px solid #FF4EC9;
                text-align: center;
                font-size: 12px;
                box-shadow: 0 0 15px rgba(255, 78, 201, 0.4);
            }
            .heatmap-controls {
                position: absolute;
                bottom: 80px;
                right: 10px;
                z-index: 1000;
                background: #1A1036;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
            
            /* Ping Marker Cluster Styles */
            .ping-cluster {
                background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
                border: 3px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 3px 10px rgba(155, 89, 182, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .ping-cluster div {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            
            .ping-cluster span {
                color: white;
                font-weight: bold;
                font-size: 14px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }
            
            .ping-cluster-small {
                width: 30px;
                height: 30px;
            }
            
            .ping-cluster-small span {
                font-size: 12px;
            }
            
            .ping-cluster-medium {
                width: 40px;
                height: 40px;
            }
            
            .ping-cluster-large {
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                box-shadow: 0 3px 10px rgba(231, 76, 60, 0.4);
            }
            
            .ping-cluster-large span {
                font-size: 16px;
            }

            /* Foodie Marker Cluster Styles */
            .foodie-cluster {
                background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
                border: 3px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 3px 10px rgba(76, 175, 80, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .foodie-cluster div {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            
            .foodie-cluster span {
                color: white;
                font-weight: bold;
                font-size: 12px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }
            
            .foodie-cluster-small {
                width: 25px;
                height: 25px;
            }
            
            .foodie-cluster-small span {
                font-size: 10px;
            }
            
            .foodie-cluster-medium {
                width: 35px;
                height: 35px;
            }
            
            .foodie-cluster-large {
                width: 45px;
                height: 45px;
                background: linear-gradient(135deg, #FF5722 0%, #D84315 100%);
                box-shadow: 0 3px 10px rgba(255, 87, 34, 0.4);
            }
            
            .foodie-cluster-large span {
                font-size: 14px;
            }

            .foodie-marker {
                border: none !important;
                background: transparent !important;
            }
        </style>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>
        <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
    </head>
    <body>
        <div id="map"></div>
        <div class="controls">
            <button class="control-btn" onclick="event.stopPropagation(); centerOnUser();">📍 My Location</button>
            <button class="control-btn" onclick="event.stopPropagation(); showCuisineSelector();">🍽️ Cuisine Type</button>
            <button class="control-btn" onclick="event.stopPropagation(); toggleStatusFilter();" id="statusFilterBtn">📊 Show All</button>
            <button class="control-btn" onclick="event.stopPropagation(); toggleHeatmap();">🔥 Toggle Heatmap</button>
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
                background: #0B0B1A;
                padding: 10px;
                border-radius: 8px;
                border: 2px solid #FF4EC9;
                box-shadow: 0 0 20px rgba(255, 78, 201, 0.3);
            }
            .control-btn {
                display: block;
                width: 100%;
                padding: 8px;
                margin: 5px 0;
                border: 2px solid #FF4EC9;
                border-radius: 8px;
                background: #1A1036;
                color: #FFFFFF;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
                box-shadow: 0 0 10px rgba(255, 78, 201, 0.3);
            }
            .control-btn:hover { 
                background: #FF4EC9; 
                box-shadow: 0 0 20px rgba(255, 78, 201, 0.6);
                transform: translateY(-1px);
            }
            .plan-notice {
                position: absolute;
                bottom: 10px;
                left: 10px;
                right: 10px;
                z-index: 1000;
                background: rgba(26, 16, 54, 0.95);
                color: #FFFFFF;
                padding: 10px;
                border-radius: 8px;
                border: 2px solid #FF4EC9;
                text-align: center;
                font-size: 12px;
                box-shadow: 0 0 15px rgba(255, 78, 201, 0.4);
            }
            .heatmap-controls {
                position: absolute;
                bottom: 80px;
                right: 10px;
                z-index: 1000;
                background: #0B0B1A;
                padding: 10px;
                border-radius: 8px;
                border: 2px solid #4DBFFF;
                box-shadow: 0 0 20px rgba(77, 191, 255, 0.3);
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
   
            
            if (typeof L.heatLayer === 'undefined') {
                
                // Try to load the plugin again
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
                script.onload = function() {
      
                };
                script.onerror = function() {
           
                };
                document.head.appendChild(script);
            }
            
            // Initialize map (using let for function accessibility)
      
            let map = L.map('map').setView([${userLat}, ${userLng}], 14);
    
            
            // Add OpenStreetMap tiles
  
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);


            
            // Initialize marker cluster group for ping markers
            let pingMarkerCluster = L.markerClusterGroup({
                disableClusteringAtZoom: 16, // Disable clustering when zoomed in close
                maxClusterRadius: 50, // Maximum distance between markers to cluster
                iconCreateFunction: function(cluster) {
                    const count = cluster.getChildCount();
                    let size = 'small';
                    if (count > 10) size = 'large';
                    else if (count > 5) size = 'medium';
                    
                    return L.divIcon({
                        html: '<div><span>' + count + '</span></div>',
                        className: 'ping-cluster ping-cluster-' + size,
                        iconSize: L.point(40, 40)
                    });
                }
            });
            map.addLayer(pingMarkerCluster);
            
            // Helper function to clear and refresh ping markers
            function refreshPingMarkers(pings) {
        ('Refreshing ping markers with', pings.length, 'pings');
                pingMarkerCluster.clearLayers();
                
                pings.forEach((ping, index) => {
                    if (ping.lat && ping.lng) {
                        const marker = L.marker([ping.lat, ping.lng], {
                            icon: L.divIcon({
                                className: 'ping-marker',
                                html: '<div style="background: #9b59b6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 12px;">📍</div>',
                                iconSize: [20, 20],
                                iconAnchor: [10, 10]
                            })
                        });
                        
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
                        pingMarkerCluster.addLayer(marker);
                    }
                });
                
          
            }

            // Initialize marker cluster group for foodie markers
            let foodieMarkerCluster = L.markerClusterGroup({
                disableClusteringAtZoom: 16, // Disable clustering when zoomed in close
                maxClusterRadius: 40, // Maximum distance between markers to cluster
                iconCreateFunction: function(cluster) {
                    const count = cluster.getChildCount();
                    let size = 'small';
                    if (count > 10) size = 'large';
                    else if (count > 5) size = 'medium';
                    
                    return L.divIcon({
                        html: '<div><span>' + count + '</span></div>',
                        className: 'foodie-cluster foodie-cluster-' + size,
                        iconSize: L.point(35, 35)
                    });
                }
            });
            map.addLayer(foodieMarkerCluster);
            
            // Helper function to clear and refresh foodie markers
            function refreshFoodieMarkers(foodies) {
       
                foodieMarkerCluster.clearLayers();
                
                foodies.forEach((foodie, index) => {
                    if (foodie.location && foodie.location.latitude && foodie.location.longitude) {
                        // Check if this is the current user and use their check-in data if available
                        const userCheckInData = ${JSON.stringify(currentCheckIn)};
                        let actualHungerLevel = foodie.hungerLevel;
                        
                        // Override hunger level for current user if they have an active check-in
                        if (userCheckInData && foodie.userId === '${user?.uid}' && userCheckInData.hungerLevel) {
                            actualHungerLevel = userCheckInData.hungerLevel;
                        }
                        
                        // Determine border color and status emoji based on hunger level
                        let borderColor = '#4CAF50'; // interested (green)
                        let statusEmoji = '👀'; // browsing
                        
                        if (actualHungerLevel === 'hungry') {
                            borderColor = '#FF9800'; // orange
                            statusEmoji = '😋';
                        } else if (actualHungerLevel === 'starving') {
                            borderColor = '#F44336'; // red
                            statusEmoji = '🤤';
                        }
                        
                        // Create circular marker with profile image
                        const profileImageUrl = foodie.profileImageUrl || foodie.profileUrl;
                        let markerHtml = '';
                        
                        // Check if this foodie is on the leaderboard for trophy badge
                        const isLeaderboardUser = leaderboardUserIds.has(foodie.userId || foodie.id);
                 
                        
                        const trophyBadge = isLeaderboardUser ? 
                            '<div style="position: absolute; top: -5px; left: -5px; background: linear-gradient(135deg, #FFD700, #FFA500); width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; font-size: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(255, 215, 0, 0.4); z-index: 10;">🏆</div>' : '';

                        if (profileImageUrl) {
                            markerHtml = \`<div style="width: 34px; height: 34px; border-radius: 50%; border: 3px solid \${borderColor}; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.3); position: relative;">
                                <img src="\${profileImageUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<div style=\\'width: 100%; height: 100%; background: \${borderColor}; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;\\'>👤</div>';">
                                <div style="position: absolute; bottom: -3px; right: -3px; background: white; width: 16px; height: 16px; border-radius: 50%; border: 2px solid \${borderColor}; font-size: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">\${statusEmoji}</div>
                                \${trophyBadge}
                            </div>\`;
                        } else {
                            // Fallback to emoji marker with status
                            markerHtml = \`<div style="background: \${borderColor}; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 18px; position: relative;">
                                👤
                                <div style="position: absolute; bottom: -3px; right: -3px; background: white; width: 16px; height: 16px; border-radius: 50%; border: 2px solid \${borderColor}; font-size: 10px; display: flex; align-items: center; justify-content: center; color: \${borderColor}; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">\${statusEmoji}</div>
                                \${trophyBadge}
                            </div>\`;
                        }
                        
                        const marker = L.marker([foodie.location.latitude, foodie.location.longitude], {
                            icon: L.divIcon({
                                className: 'foodie-marker',
                                html: markerHtml,
                                iconSize: [34, 34],
                                iconAnchor: [17, 17]
                            })
                        });
                        
                        const hungerLevel = foodie.hungerLevel || 'interested';
                        const hungerDescription = hungerLevel === 'interested' ? 'Browsing' : hungerLevel.charAt(0).toUpperCase() + hungerLevel.slice(1);
                        const timeAgo = Math.floor((Date.now() - (foodie.timestamp?.seconds ? foodie.timestamp.seconds * 1000 : Date.now())) / (1000 * 60));
                        
                        const popupContent = \`
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px; text-align: center; padding: 4px;">
                                <div style="margin-bottom: 12px;">
                                    \${profileImageUrl ? 
                                        \`<img src="\${profileImageUrl}" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid #FF4EC9; object-fit: cover; box-shadow: 0 4px 12px rgba(255, 78, 201, 0.3);" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                         <div style="display: none; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #FF4EC9 0%, #4DBFFF 100%); align-items: center; justify-content: center; color: #FFFFFF; font-size: 28px; margin: 0 auto; box-shadow: 0 4px 12px rgba(255, 78, 201, 0.3);">👤</div>\` : 
                                        \`<div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #FF4EC9 0%, #4DBFFF 100%); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 28px; margin: 0 auto; box-shadow: 0 4px 12px rgba(255, 78, 201, 0.3);">👤</div>\`
                                    }
                                </div>
                                <h4 style="margin: 0 0 12px 0; color: #FFFFFF; font-size: 18px; font-weight: 600; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">🍽️ \${foodie.username || 'Foodie'} \${isLeaderboardUser ? '🏆' : ''}</h4>
                                \${isLeaderboardUser ? '<p style="margin: 6px 0; color: #FFD700; font-size: 13px; font-weight: 600; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);">⭐ Featured Photographer</p>' : ''}
                                <!-- Debug: isLeaderboardUser = \${isLeaderboardUser} for \${foodie.username} -->
                                <p style="margin: 6px 0; font-size: 14px; color: #FFFFFF;"><strong style="color: #4DBFFF;">Status:</strong> \${hungerDescription} \${statusEmoji}</p>
                                \${foodie.checkedIn ? '<p style="margin: 8px 0; color: #00E676; font-weight: 600; font-size: 13px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);">✓ Recently Checked In</p>' : '<p style="margin: 8px 0; color: #FFFFFF; opacity: 0.7; font-size: 13px;">Active on Map</p>'}
                                <div style="margin-top: 14px;">
                                    <button onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: 'foodieGallery', foodieId: '\${foodie.id}', foodieName: '\${foodie.username || 'Foodie'}'}))" 
                                            style="background: linear-gradient(135deg, #FF4EC9 0%, #4DBFFF 100%); color: #FFFFFF; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(255, 78, 201, 0.4); transition: all 0.2s ease; min-width: 140px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);">
                                        📸 View Photos
                                    </button>
                                </div>
                            </div>
                        \`;
                        
                        marker.bindPopup(popupContent);
                        foodieMarkerCluster.addLayer(marker);
                    }
                });
            }
       

            // User location marker

            const userIcon = L.divIcon({
                html: '<div style="background: #007AFF; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,122,255,0.3);"></div>',
                iconSize: [20, 20],
                className: 'user-marker'
            });
            
            L.marker([${userLat}, ${userLng}], { icon: userIcon })
                .addTo(map)
                .bindPopup('<div class="truck-popup"><div class="truck-name">📍 Your Location</div></div>');

            // Note: User check-in is now handled through the foodie markers system
            // The user will appear in the nearbyFoodies list with their current hunger level
            
            // DEBUG: Check if execution continues past user marker creation
  
            
            // SAFE logging to prevent JavaScript crashes
   
            try {
                const trucksCount = (foodTrucks && Array.isArray(foodTrucks)) ? foodTrucks.length : 'undefined or not array';
 
            } catch (e) {
       
            }
            

            try {
                const eventsCount = (events && Array.isArray(events)) ? events.length : 'undefined or not array';
        
            } catch (e) {
      
            }
            
            // IMMEDIATE TEST - Call marker creation right here

            try {
                if (typeof createTruckMarkers !== 'undefined') {
        
                    createTruckMarkers(foodTrucks);
                } else {
        
                }
            } catch (error) {
         
            }

   
            
            // Star rating generator function for popup
            function generateStarRating(rating) {
                const fullStars = Math.floor(rating);
                const hasHalfStar = rating % 1 >= 0.5;
                const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
                
                let stars = '';
                
                // Full stars
                for (let i = 0; i < fullStars; i++) {
                    stars += '⭐';
                }
                
                // Half star
                if (hasHalfStar) {
                    stars += '⭐'; // Using full star for simplicity in popup
                }
                
                // Empty stars
                for (let i = 0; i < emptyStars; i++) {
                    stars += '☆';
                }
                
                return stars;
            }
            
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
     
                }
                
                const now = new Date();
                const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
                const currentTime12 = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
                

                
                const dayHours = businessHours[currentDay];
                if (!dayHours || dayHours.closed) {
          
                    return 'closed';
                }
                
     
                
                // Helper function to convert AM/PM time to minutes since midnight for easy comparison
                const timeToMinutes = (timeStr) => {
                    if (!timeStr) return 0;
                    
    
                    
                    const timeStr_clean = timeStr.trim();
                    
                    // Check if it's already 24-hour format (no AM/PM)
                    if (!timeStr_clean.includes('AM') && !timeStr_clean.includes('PM')) {
                        // 24-hour format like "09:00" or "17:00"
                        const timeParts = timeStr_clean.split(':');
                        if (timeParts.length !== 2) {
              
                            return 0;
                        }
                        
                        const hours = parseInt(timeParts[0], 10);
                        const minutes = parseInt(timeParts[1], 10);
                        
                        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                
                            return 0;
                        }
                        
                        const totalMinutes = hours * 60 + minutes;
               
                        return totalMinutes;
                    }
                    
                    // 12-hour format with AM/PM - handle various whitespace characters
                    const parts = timeStr_clean.split(/\s+/); // Split on any whitespace (space, non-breaking space, etc.)
             
                    
                    if (parts.length !== 2) {
            
                        
                        // Try alternative parsing for edge cases
                        const ampmMatch = timeStr_clean.match(/(AM|PM)/i);
                        if (ampmMatch) {
                            const ampm = ampmMatch[0].toUpperCase();
                            const timeOnly = timeStr_clean.replace(/(AM|PM)/i, '').trim();
              
                            
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
                             
                                    return totalMinutes;
                                }
                            }
                        }
                        
                        return 0;
                    }
                    
                    const [time, period] = parts;
               
                    
                    const timeParts = time.split(':');
                  
                    
                    if (timeParts.length !== 2) {
              
                        return 0;
                    }
                    
                    let hours = parseInt(timeParts[0], 10);
                    const minutes = parseInt(timeParts[1], 10);
                    
               
                    
                    if (isNaN(hours) || isNaN(minutes)) {
                   
                        return 0;
                    }
                    
                    // Validate ranges for 12-hour format
                   
                    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
                        
                        return 0;
                    }
                    
                    // Convert to 24-hour format for calculation
                    if (period.toUpperCase() === 'PM' && hours !== 12) {
                        hours = hours + 12;
                    } else if (period.toUpperCase() === 'AM' && hours === 12) {
                        hours = 0;
                    }
                    
                    const totalMinutes = hours * 60 + minutes;

                    return totalMinutes;
                };
                
                // Convert all times to minutes since midnight for comparison
                const currentMinutes = timeToMinutes(currentTime12);
                const openMinutes = timeToMinutes(dayHours.open);
                const closeMinutes = timeToMinutes(dayHours.close);
                
       
                
                // Check if current time is within business hours
                let isOpen = false;
                
                if (closeMinutes > openMinutes) {
                    // Normal case: open and close on same day (e.g., 9:00 AM to 6:00 PM)
                    // Current time must be >= open time AND < close time (not <=, because at close time you're closed)
                    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
           
                } else {
                    // Overnight case: close time is next day (e.g., 10:00 PM to 2:00 AM)
                    isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
           
                }
                
                if (isOpen) {
            
                    return 'open';
                } else {
                
                    return 'closed';
                }
            }

            // CRITICAL DEBUG: Check if we reach data initialization section
    
            
            // Food truck data with pre-processed icons
  
            let foodTrucks = [];
            try {
                foodTrucks = ${JSON.stringify(sanitizedTrucks)};
         
            } catch (error) {
      
                foodTrucks = [];
            }
            
            // Event data with pre-processed icons
 
            let events = [];
            try {
                const eventsData = ${JSON.stringify(sanitizedEvents)};

                events = eventsData;
         
            } catch (error) {
              
                events = [];
            }
            
            // Customer ping data for heatmap (kitchen owners/event organizers) and individual markers (customers)
    
            let customerPings = [];
            try {
                customerPings = ${JSON.stringify(sanitizedPings)};
          
            } catch (error) {
       
                customerPings = [];
            }

            // Nearby foodies data for foodie marker display
            let nearbyFoodies = [];
            try {
                nearbyFoodies = ${JSON.stringify(sanitizedFoodies)};
    
            } catch (error) {
   
                customerPings = [];
            }

            // Leaderboard user IDs for trophy badges
            const leaderboardUserIds = new Set(${JSON.stringify(Array.from(leaderboardUserIds))});
            const leaderboardReady = ${!leaderboardLoading};
    
            
            // CRITICAL SUCCESS LOG: Confirm WebView data initialization completed

            if (foodTrucks.length > 0) {
             
            }
            
            // Add some mock ping data for testing if no real data
      // (Removed mockPings and testPings fallback logic)
      const testPings = customerPings;

            const userPlan = '${userPlan}';
            const userRole = '${userRole}';
   
            // Show heatmap for kitchen owners and event organizers, individual markers for customers
            const showHeatmapFeatures = userRole === 'owner' || userRole === 'event-organizer';
            const showIndividualPingMarkers = userRole === 'customer';
   
            
            let truckMarkers = [];
            let eventMarkers = [];
            let heatmapLayer = null;
            var showHeatmap = false;
            
            // Status filter: 'all', 'hideOpen', 'hideClosed'
            var statusFilter = 'all';
            
            // User favorites from React state
            var userFavorites = new Set([${Array.from(userFavorites || new Set()).map(fav => `"${fav}"`).join(', ')}]); // From React state
            
     

            // Create circular icon using canvas (SIMPLIFIED for Leaflet WebView)
            const createCircularIcon = (imageUrl, size = 40) => {
                return new Promise((resolve) => {
         
                    
                    // Validate imageUrl
                    if (!imageUrl || typeof imageUrl !== 'string') {
                  
                        resolve(null);
                        return;
                    }

                    // Handle Firebase Storage URLs with CORS-friendly transformation
                    let processedUrl = imageUrl;
                    const isFirebaseStorage = imageUrl.includes('firebasestorage.googleapis.com');
                    
                    if (isFirebaseStorage) {
             
                        
                        // Check if URL already has alt=media (which it should for newer Firebase URLs)
                        if (imageUrl.includes('alt=media')) {
                         
                            processedUrl = imageUrl;
                        } else {
                            // Transform Firebase Storage URL to work with CORS
                            processedUrl = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 'alt=media';
              
                        }
                 
                    }

                    const img = new Image();
                    // Try without crossOrigin first for WebView compatibility
                    
             
                    
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
                       
                            resolve(dataUrl);
                        } catch (error) {
                  
                            // Try with CORS as fallback
                            const corsImg = new Image();
                            corsImg.crossOrigin = 'anonymous';
                            
                            corsImg.onload = () => {
                                try {
                                 
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
                                    
                           
                                    resolve(canvas.toDataURL());
                                } catch (canvasError) {
                        
                                    resolve(null);
                                }
                            };
                            
                            corsImg.onerror = () => {
                           
                                resolve(null);
                            };
                            
                            corsImg.src = processedUrl;
                        }
                    };
                    
                    img.onerror = (error) => {
      
                        resolve(null);
                    };
                    
                    // Add timeout to prevent hanging
                    setTimeout(() => {
    
                        resolve(null);
                    }, 6000);
                    
 
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

            function createTruckMarkers(trucks = foodTrucks) {
                // Define trucksToUse in function scope first
                let trucksToUse = [];
                
                try {

                    
                    if (typeof map === 'undefined') {
                      
                        return;
                    }

                    // Log the actual truck data we're working with
                    trucksToUse = trucks || foodTrucks || [];
                    
                    // Apply cuisine filtering if active
                    if (typeof selectedCuisineType !== 'undefined' && selectedCuisineType && selectedCuisineType.length > 0) {
                        trucksToUse = trucksToUse.filter(truck => {
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
                    }
                    
                    
                    // Clear existing markers
          
                    truckMarkers.forEach(marker => map.removeLayer(marker));
                    truckMarkers = [];
      
                    
                    // If no trucks provided, simply return (don't create test markers)
                    if (!trucksToUse || trucksToUse.length === 0) {
                    
                        return;
                    }
                    
            
                } catch (error) {
          
                    return;
                }

                // Use final trucks array for processing
                const trucksToProcess = trucksToUse;
                for (let i = 0; i < trucksToProcess.length; i++) {
                    const truck = trucksToProcess[i];
               
                    
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
                
                    
                    // Use pre-processed personalized icon
                    let iconHtml;
                    if (truck.personalizedIcon && truck.personalizedIcon.html) {
                        iconHtml = truck.personalizedIcon.html;
            
                    } else {
                        // Fallback to default icon
                        iconHtml = getDefaultTruckIcon(kitchenType);
          
                    }
                    
                    // Add heart indicator if user has favorited this truck (with safety check)
                    const truckId = truck.ownerId || truck.id;
                    let isFavorited = false;
                    try {
                        isFavorited = userFavorites && typeof userFavorites.has === 'function' && userFavorites.has(truckId);
                    } catch (error) {
       
                        isFavorited = false;
                    }
                    
                    if (isFavorited) {
                        iconHtml = \`
                            <div style="position: relative; display: inline-block;">
                                \${iconHtml}
                                <div style="position: absolute; top: -5px; right: -5px; width: 20px; height: 20px; background: #ff6b6b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">❤️</div>
                            </div>
                        \`;
           
                    }
                    
                    const truckIcon = L.divIcon({
                        html: iconHtml,
                        iconSize: [55, 55],
                        className: 'truck-marker'
                    });

                    const lat = truck.lat || truck.latitude;
                    const lng = truck.lng || truck.longitude;
                    
                  
                    
                    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                     
                        continue;
                    }

                   
                    
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
                                
                                <!-- Rating Display in Popup -->
                                <div class="truck-rating-popup">
                                    \${truck.reviewCount > 0 ? \`
                                        <div class="rating-stars">
                                            \${generateStarRating(truck.averageRating)}
                                        </div>
                                        <div class="rating-text">
                                            \${truck.averageRating}/5 (\${truck.reviewCount} review\${truck.reviewCount !== 1 ? 's' : ''})
                                        </div>
                                    \` : \`
                                        <div class="no-rating">No reviews yet</div>
                                    \`}
                                </div>
                                
                                <div class="truck-status \${statusClass}">\${statusEmoji} \${truckStatus.toUpperCase()}</div>
                                <div class="truck-details">\${(truck.cuisine || truck.cuisineType || truck.type || 'American').charAt(0).toUpperCase() + (truck.cuisine || truck.cuisineType || truck.type || 'American').slice(1)}</div>
                                <div class="truck-details"> Type: \${kitchenType.charAt(0).toUpperCase() + kitchenType.slice(1)}</div>
                                \${truck.popularity ? \`<div class="truck-details">⭐ Popularity: \${truck.popularity}%</div>\` : ''}
                                <button class="view-details-btn" onclick="openTruckDetails('\${truck.ownerId || truck.id}', '\${truckName}', '\${truck.cuisine || truck.cuisineType || truck.type || 'General Food'}', '\${truck.base64CoverImage || truck.coverUrl || ''}', '\${truck.menuUrl || ''}', '\${truck.instagram || ''}', '\${truck.facebook || ''}', '\${truck.twitter || ''}', '\${truck.tiktok || ''}', '\${(truck.businessHours ? JSON.stringify(truck.businessHours).replace(/'/g, '&apos;').replace(/"/g, '&quot;') : '{}')}')">
                                    📋 View Full Details
                                </button>
                            </div>
                        \`);
                    
                    truckMarkers.push(marker);
                  
                    
                    } catch (truckError) {
                    }
                }
                
           
            }

            // Create event markers with pre-processed personalized icons
            function createEventMarkers(eventsToDisplay = events) {
                try {
          
                    
                    if (typeof map === 'undefined') {
               
                        return;
                    }
                    
                    // Clear existing event markers
                    eventMarkers.forEach(marker => map.removeLayer(marker));
                    eventMarkers = [];
                } catch (error) {
             
                    return;
                }

                for (const event of eventsToDisplay) {
                    const eventTitle = event.title || event.eventName || 'Event';
                    const eventStatus = event.status || 'upcoming';
                    
           
                    
                    // Use pre-processed event icon
                    let iconHtml;
                    if (event.eventIcon && event.eventIcon.html) {
                        iconHtml = event.eventIcon.html;
                 
                    } else {
                        // Fallback to default event icon
                        iconHtml = '<div style="width: 50px; height: 50px; border-radius: 50%; background: #FF6B35; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; border: 3px solid #000000; box-shadow: 0 3px 10px rgba(0,0,0,0.4);">🎪</div>';
                 
                    }
                    
                    const eventIcon = L.divIcon({
                        html: iconHtml,
                        iconSize: [50, 50],
                        className: 'event-marker'
                    });

                    const lat = event.latitude;
                    const lng = event.longitude;
                    
                    if (!lat || !lng) {
            
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
                  
                }
                

            }

            // Function to handle truck details modal (communicates with React Native)
            function openTruckDetails(truckId, truckName, cuisine, coverUrl, menuUrl, instagram, facebook, twitter, tiktok, businessHoursJson) {
   
                
                // Parse business hours JSON
                let businessHours = {};
                try {
                    if (businessHoursJson && businessHoursJson !== 'undefined') {
                        businessHours = JSON.parse(businessHoursJson);
               
                    }
                } catch (error) {
       
                    businessHours = {};
                }
                
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
                        socialLinks: socialLinks,
                        businessHours: businessHours
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
                    return timeString; // Return original string if error occurs
                }
            }

            // Function to handle event details modal (communicates with React Native)
            function openEventDetails(eventId, eventTitle, eventType, logoUrl, description, dateStr, timeStr, location) {
      
                
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

            // Create heatmap from customer pings (kitchen owners/event organizers only)
            function createHeatmap() {
  
                
                if (!showHeatmapFeatures) {
           
                    return;
                }
                
                if (testPings.length === 0) {
           
                    return;
                }
                
                // Filter pings by cuisine exclusions
                const filteredPings = filterPingsByCuisine(testPings, selectedCuisineType);
          
                
                const heatData = filteredPings.map(ping => {
                    const lat = Number(ping.lat || ping.latitude);
                    const lng = Number(ping.lng || ping.longitude);
                    const intensity = 0.8; // Base intensity for customer pings
              
                    return [lat, lng, intensity];
                }).filter(point => {
                    const isValid = point[0] && point[1] && isFinite(point[0]) && isFinite(point[1]);
                    if (!isValid) {
                 
                    }
                    return isValid;
                });
                
       
                
                if (heatData.length === 0) {
                 
                    return;
                }
                
                try {
                    // Ensure L.heatLayer is available
                    if (typeof L.heatLayer === 'undefined') {
                  
                
                        return;
                    }
                    
                    
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
   
                    
                    // Immediately test adding to map
                    if (map) {
               
                        map.addLayer(heatmapLayer);
                        showHeatmap = true;
                
                    }
                } catch (error) {
        
                }
            }

            // Toggle functions
            function toggleHeatmap() {
       
                
                if (!showHeatmapFeatures) {
         
                    return;
                }
                
                if (showHeatmap) {
                    // Hide heatmap
                    if (heatmapLayer) {
              
                        map.removeLayer(heatmapLayer);
                    }
                    showHeatmap = false;
                    
                } else {
                    // Show heatmap
                    if (!heatmapLayer) {
               
                        createHeatmap();
                    }
                    
                    if (heatmapLayer) {
              
                        map.addLayer(heatmapLayer);
                        showHeatmap = true;
          
                    } else {
    
                
                    }
                }
            }

            // Toggle truck status visibility
            function toggleTruckStatus() {
     
                
                try {
     
                    
                    // Use window variables as backup if local ones are undefined
                    const currentShowClosed = typeof showClosedTrucks !== 'undefined' ? showClosedTrucks : window.showClosedTrucks;
                    const currentShowOpen = typeof showOpenTrucks !== 'undefined' ? showOpenTrucks : window.showOpenTrucks;
                    
                   
                } catch (error) {
              
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
   
                } else if (!currentShowClosed && currentShowOpen) {
                    // Currently hiding closed - hide open trucks instead
                    showClosedTrucks = true;
                    showOpenTrucks = false;
                    window.showClosedTrucks = true;
                    window.showOpenTrucks = false;
           
                } else if (currentShowClosed && !currentShowOpen) {
                    // Currently hiding open - Show All trucks
                    showClosedTrucks = true;
                    showOpenTrucks = true;
                    window.showClosedTrucks = true;
      
                }
                
                // Send state update back to React Native
                if (window.ReactNativeWebView) {
                    const message = {
                        type: 'TRUCK_FILTER_CHANGED',
                        showClosedTrucks: window.showClosedTrucks,
                        showOpenTrucks: window.showOpenTrucks
                    };
                    window.ReactNativeWebView.postMessage(JSON.stringify(message));
   
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

                if (typeof foodTrucks !== 'undefined' && foodTrucks !== null) {
                
                } else {
           
                }
                
                try {
                 
                    applyTruckStatusFilter();
            
                } catch (error) {
    
                }
            }
            
            // Apply truck status filtering
            function applyTruckStatusFilter() {
                // Prevent rapid filtering operations
                if (window.filteringInProgress) {
               
                    return;
                }
                
                window.filteringInProgress = true;
                
                
                if (!foodTrucks || !Array.isArray(foodTrucks)) {
            
                    window.filteringInProgress = false;
                    return;
                }
                
       
                
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
        
                }
                
                // Apply status filter based on statusFilter variable
                const statusFilteredTrucks = [];
                filtered.forEach(truck => {
                    let truckStatus = truck.status || 'open';
                    
                    // Try to get business hours from truck data or owner data
                    let businessHours = truck.businessHours || truck.ownerData?.businessHours;
                    
                    // If no business hours found, treat as always open for testing
                    if (!businessHours) {
                   
                        truckStatus = 'open';
                    } else {
                        // Calculate status from business hours
                        truckStatus = checkTruckOpenStatus(businessHours);
             
                    }
                    
                    let shouldShow = true; // Default to show
                    
                    if (statusFilter === 'hide-open') {
                        // Hide open trucks, show closed trucks
                        shouldShow = !(truckStatus === 'open' || truckStatus === 'busy');
                       
                    } else if (statusFilter === 'hide-closed') {
                        // Hide closed trucks, show open trucks
                        shouldShow = (truckStatus === 'open' || truckStatus === 'busy');
                        
                    } else {
                        // Show all trucks (statusFilter === 'all')
                        shouldShow = true;

                    }
                    
                    if (shouldShow) {
                        statusFilteredTrucks.push(truck);
                    }
                });
                
          
                createTruckMarkers(statusFilteredTrucks);
    
                
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
                
                const isExcluded = excludedCuisines.some(excludedType => {
                    const normalizedExcluded = excludedType.toLowerCase().trim();
              
                    
                    // Direct match
                    if (itemCuisine === normalizedExcluded) {
                        return true;
                    }
                    
                    // Partial match for compound cuisines
                    if (itemCuisine.includes(normalizedExcluded) || normalizedExcluded.includes(itemCuisine)) {
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
                            if (itemCuisine.includes('bbq') || normalizedExcluded.includes('bbq')) {
                              
                            }
                            return true;
                        }
                    }
                    
           
                    return false;
                });
                
                // Debug logging for BBQ results
                if (itemCuisine.includes('bbq') || excludedCuisines.some(exc => exc.includes('bbq'))) {
                
                }

                return isExcluded;
            }

            // Filter customer pings by excluded cuisines
            function filterPingsByCuisine(pings, excludedCuisines) {
            
                
                if (excludedCuisines.length === 0) {
            
                    return pings;
                }
                
                const filtered = pings.filter(ping => {
                    const pingCuisine = ping.cuisineType || ping.cuisine || 'food';
                    const shouldExclude = isCuisineExcluded(pingCuisine, excludedCuisines);
              
                    return !shouldExclude;
                });
                
             
                return filtered;
            }

            function showCuisineSelector() {
     
                
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
                
     
                
                // Cycle through: 'all' -> 'hide-open' -> 'hide-closed' -> 'all'
                if (statusFilter === 'all') {
                    statusFilter = 'hide-open';
                } else if (statusFilter === 'hide-open') {
                    statusFilter = 'hide-closed';
                } else {
                    statusFilter = 'all';
                }
                

                
                // Update button text and styling
                if (button) {
                    if (statusFilter === 'all') {
                        button.textContent = '📊 Show All';
                        // Default styling for "Show All" state
                        button.style.background = '#1A1036';
                        button.style.borderColor = '#FF4EC9';
                        button.style.boxShadow = '0 0 10px rgba(255, 78, 201, 0.3)';
                    } else if (statusFilter === 'hide-open') {
                        button.textContent = '📊 Hide Open';
                        // Active filtering state - neon pink background
                        button.style.background = '#FF4EC9';
                        button.style.borderColor = '#FF4EC9';
                        button.style.boxShadow = '0 0 20px rgba(255, 78, 201, 0.6)';
                    } else if (statusFilter === 'hide-closed') {
                        button.textContent = '📊 Hide Closed';
                        // Active filtering state - neon blue background
                        button.style.background = '#4DBFFF';
                        button.style.borderColor = '#4DBFFF';
                        button.style.boxShadow = '0 0 20px rgba(77, 191, 255, 0.6)';
                    }
                }
                
                // Apply the filter to trucks
                applyTruckStatusFilter();
                
       
            }

            try {
                createTruckMarkers(foodTrucks || []);
     
            } catch (error) {
       
            }
            
            try {
                createEventMarkers();
       
            } catch (error) {
    
            }
            
            // Listen for messages from React Native using the proper WebView mechanism
            if (window.ReactNativeWebView) {
        
                
                // Override the default message handler
                window.addEventListener('message', function(event) {
                    try {
             
                        const message = JSON.parse(event.data);
                  
                        handleCuisineFilterMessage(message);
                    } catch (error) {
             
                    }
                });
                
                // Send test message to React Native to verify connection
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'WEBVIEW_READY',
                    message: 'WebView message handler is ready'
                }));
        
            } else {
             
            }
            
                // Handle message types
            function handleCuisineFilterMessage(message) {
                // Handle truck visibility updates
                if (message.type === 'updateTruckVisibility') {
       
                    const ownerId = message.ownerId;
                    const visible = message.visible;
                    
           
                    
                    // Find the truck marker by ownerId and update its visibility
                    if (truckMarkers && truckMarkers.length > 0) {
       
                        let found = false;
                        
                        for (let i = 0; i < truckMarkers.length; i++) {
                            const marker = truckMarkers[i];
                            const truckData = marker.options && marker.options.truckData;
                            
                         
                            
                            if (truckData && (truckData.ownerId === ownerId || truckData.id === ownerId)) {
                          
                                
                                // For Leaflet markers, we remove from map to hide, add to map to show
                                if (!visible) {
                                    marker.remove();
                          
                                } else {
                                    marker.addTo(map);
            
                                }
                                
                                found = true;
                            }
                        }
                        
                        if (!found) {
                      
                        }
                    } else {
                  
                    }
                    
                    return;
                }
                
                // Handle cuisine filter
                if (message.type === 'APPLY_CUISINE_FILTER') {
                    const cuisineType = message.cuisineType;
                    
                    selectedCuisineType = cuisineType;                    // Filter out excluded cuisines (show all by default, hide deselected)
                    let filtered = foodTrucks;
                    if (cuisineType.length > 0) {
                
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
                         
                            return !shouldExclude;
                        });
                    }
                    

                    
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
                    
                   
                    createTruckMarkers(statusFiltered);
                    
                    // Also filter events (events don't typically have cuisine types, so Show All for now)
                   
                    createEventMarkers(events);
                    
                    // Also update heatmap and ping markers with cuisine filter
                    if (showHeatmapFeatures) {
                        // Update heatmap for kitchen owners and event organizers
                        createHeatmap();
                    } else if (showIndividualPingMarkers) {
                        // Update individual ping markers for customers only
                        
                        // Filter and refresh ping markers using helper function
                        const realPings = ${JSON.stringify(customerPings)};
                        const filteredPings = filterPingsByCuisine(realPings, selectedCuisineType);
                        refreshPingMarkers(filteredPings);
                        
                        // Also refresh foodie markers
                        refreshFoodieMarkers(nearbyFoodies);
                    } else {
                        // No ping marker updates for other user roles during cuisine filtering
                    }
                }
            }
          

            
            if (showHeatmapFeatures) {
                // Show heatmap for kitchen owners and event organizers
                createHeatmap();
                
                // Always show heatmap by default for owners and event organizers
                if (heatmapLayer) {
             
                    map.addLayer(heatmapLayer);
                    showHeatmap = true;
          
                } else {
          
                }
                
                // Also show foodie markers for owners and event organizers
                refreshFoodieMarkers(nearbyFoodies);
            } else if (showIndividualPingMarkers) {
                // Show individual ping markers for customers only
          
                
                // Add individual ping markers for customers (with cuisine filtering)
                const realPings = ${JSON.stringify(customerPings)};
            
                const filteredPings = filterPingsByCuisine(realPings, selectedCuisineType);
             
                
                if (filteredPings.length === 0) {
                 
                } else {
              
                }
                
                // Use helper function to create clustered ping markers
                refreshPingMarkers(filteredPings);
                
                // Also refresh foodie markers for all customers
                refreshFoodieMarkers(nearbyFoodies);
                
            } else {
                // No ping display for other user roles
            }

            // Real-time status update system
            function updateTruckStatuses() {
              
                let statusChanged = false;
                
                // Update each truck marker with current status
                truckMarkers.forEach((marker) => {
                    // Get truck data stored in marker options
                    const truck = marker.options.truckData;
                    if (truck && truck.businessHours) {
                        const currentStatus = checkTruckOpenStatus(truck.businessHours);
                        const previousStatus = truck.status || 'open';
                        
                        if (currentStatus !== previousStatus) {
                        
                            
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
                                    <button class="view-details-btn" onclick="openTruckDetails('\${truck.id}', '\${truckName}', '\${truck.cuisine || truck.cuisineType || truck.type || 'General Food'}', '\${truck.base64CoverImage || truck.coverUrl || ''}', '\${truck.menuUrl || ''}', '\${truck.instagram || ''}', '\${truck.facebook || ''}', '\${truck.twitter || ''}', '\${truck.tiktok || ''}', '\${JSON.stringify(truck.businessHours || {})}')">
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
       
            setInterval(updateTruckStatuses, 60000); // Check every minute
            
            // Also check immediately after 30 seconds to catch recent changes
            setTimeout(updateTruckStatuses, 30000);

            // Create initial markers AFTER all functions are defined

            
            // Call marker creation functions with error handling
            try {
                createTruckMarkers(foodTrucks);
         
            } catch (error) {
       
            }
            
            try {
                createEventMarkers(events);
        
            } catch (error) {
            
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
  const handleWebViewMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      // Forward WebView console messages to React Native console
      if (message.type === 'CONSOLE_LOG') {
        const prefix = message.level === 'ERROR' ? '🔴 WEBVIEW ERROR:' : '🟦 WEBVIEW:';

        return;
      }
      
      // Handle WebView ready message for debugging
      if (message.type === 'WEBVIEW_READY') {
   
        setWebViewReady(true);
        
        // Apply any pending cuisine filter
        if (pendingCuisineFilter !== null) {
   
          const filterMessage = {
            type: 'APPLY_CUISINE_FILTER',
            cuisineType: pendingCuisineFilter
          };
          
          webViewRef.current?.postMessage(JSON.stringify(filterMessage));
          setPendingCuisineFilter(null);
        }
        return;
      }
      
      // GUEST MODE RESTRICTION: Prevent guests from opening modals
      if (!user && (message.type === 'OPEN_TRUCK_DETAILS' || message.type === 'OPEN_EVENT_DETAILS')) {
        showToastMessage('Sign in to view details and interact with food trucks and events', 'success');
        return;
      }
      
      if (message.type === 'OPEN_TRUCK_DETAILS') {

        const { id, name, cuisine, coverUrl, menuUrl, socialLinks, businessHours } = message.data;

        // Fetch payment data from trucks collection for this specific truck
        let paymentData = {};
        let ownerData = {};
        
        try {
          const paymentDoc = await getDoc(doc(db, 'trucks', id));
          if (paymentDoc.exists()) {
            paymentData = paymentDoc.data();
   
          } else {
 
          }
        } catch (error) {

        }
        
        // Fetch owner data (including phone number) from users collection
        try {
          // Get the ownerId from the truck document (paymentData) or use truck id as fallback
          const ownerId = paymentData.ownerId || id;
  
          
          const userDoc = await getDoc(doc(db, 'users', ownerId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            ownerData = {
              phone: userData.phone,
              email: userData.email,
              ownerName: userData.displayName || userData.username || userData.truckName,
              description: userData.description,
              // Don't include coverUrl here as it's passed from WebView
            };
   
          } else {
  
            // Fallback: try to get from mobileKitchens collection
            const mobileKitchenDoc = await getDoc(doc(db, 'mobileKitchens', id));
            if (mobileKitchenDoc.exists()) {
              const kitchenData = mobileKitchenDoc.data();
              ownerData = {
                phone: kitchenData.phone,
                email: kitchenData.email,
                ownerName: kitchenData.ownerName,
                description: kitchenData.description,
                // Don't include coverUrl here as it's passed from WebView
              };
            }
          }
        } catch (error) {
    
        }
        
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
          ownerId: id,
          businessHours: businessHours || {},
          // Include payment data for pre-order processing
          ...paymentData,
          // Include owner contact information
          ...ownerData
        };
        

        setSelectedTruck(truckData);

        setShowMenuModal(true);
   
        // Load drops for this truck (for both customers and owners)
        loadTruckDrops(id);
      } else if (message.type === 'OPEN_EVENT_DETAILS') {
        const { id, title, eventType, logoUrl, description, date, time, location } = message.data;
        

        
        // Show event details alert
        showCustomModal(
          `🎪 ${title}`,
          `${description ? description + '\n\n' : ''}📅 Date: ${date}${time ? `\n🕐 Time: ${time}` : ''}${location ? `\n📍 Location: ${location}` : ''}${eventType ? `\n🎯 Type: ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}` : ''}`,
          () => 
          'More Info',
          'Close',
          true
        );
      } else if (message.type === 'SHOW_CUISINE_MODAL') {

        setShowCuisineModal(true);
     
      } else if (message.type === 'foodieGallery') {
        // Handle foodie photo gallery opening
        const { foodieId, foodieName } = message;
        await openFoodieGallery(foodieId, foodieName);
        
      } else if (message.type === 'TRUCK_FILTER_CHANGED') {
        // Handle truck status filter state changes from WebView
      
        // NOTE: Not updating React state to prevent map regeneration - WebView handles filtering internally
       
      }
    } catch (error) {
      
    }
  };

  // Handle cuisine filter application
  const handleApplyCuisineFilter = () => {

    
    const message = {
      type: 'APPLY_CUISINE_FILTER',
      cuisineType: excludedCuisines
    };
    
    // Always try to send immediately first
    if (webViewRef.current) {

      try {
        webViewRef.current.postMessage(JSON.stringify(message));
  
        // Clear any pending filter since we sent it
        setPendingCuisineFilter(null);
      } catch (error) {
    
        setPendingCuisineFilter(excludedCuisines);
      }
    } else {
 
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
          source={require('../../assets/logo.png')} 
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
        onError={(e) => ('', e)}
        onHttpError={(e) => ('', e)}
      />
      
      {/* Truck Visibility Toggle (Food Truck Owners Only) */}
      {userRole === 'owner' && (
        <View style={styles.ownerControlsContainer}>
          <TouchableOpacity
            style={[styles.truckToggleButton, { 
              opacity: showTruckIcon === null ? 0.6 : 1 
            }]}
            disabled={showTruckIcon === null}
            onPress={async () => {
              if (showTruckIcon === null) return; // Don't allow toggle while loading
              
              try {
                const newVisibility = !showTruckIcon;
            
                
                // Update local state first - this will trigger map regeneration via useEffect
                setShowTruckIcon(newVisibility);
                
                // Update database to persist the preference
                await updateTruckVisibility(newVisibility);
                await updateLastActivity(); // Update activity when user interacts
                
          
              } catch (error) {
     
                // Revert state on error
                setShowTruckIcon(!showTruckIcon);
              }
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.toggleContainer, { 
              backgroundColor: showTruckIcon === null ? theme.colors.background.tertiary : 
                             showTruckIcon ? theme.colors.accent.pink : theme.colors.background.secondary,
              borderColor: showTruckIcon === null ? theme.colors.border :
                          showTruckIcon ? theme.colors.accent.pink : theme.colors.border,
              ...(showTruckIcon === true ? theme.shadows.neonPink : {})
            }]}>
              <Ionicons 
                name={showTruckIcon === null ? 'hourglass-outline' : 
                     showTruckIcon ? 'car' : 'car-outline'} 
                size={18} 
                color={theme.colors.text.primary}
              />
              <Text style={styles.toggleText}>
                {showTruckIcon === null ? 'Loading...' : 
                 showTruckIcon ? 'Hide Icon' : 'Show Icon'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Visibility Info Text */}
          <Text style={styles.visibilityInfoText}>
            💡 Your map icon stays visible to customers and event organizers even when you log out, unless "Hide Icon" is enabled
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
              
              {/* Open/Closed Status Indicator - REMOVED */}
              {/* 
              {selectedTruck?.businessHours && (
                <View style={[
                  styles.statusIndicator,
                  checkTruckOpenStatus(selectedTruck.businessHours) === 'open' 
                    ? styles.statusOpen 
                    : styles.statusClosed
                ]}>
                  <Text style={[
                    styles.statusText,
                    checkTruckOpenStatus(selectedTruck.businessHours) === 'open' 
                      ? styles.statusTextOpen 
                      : styles.statusTextClosed
                  ]}>
                    {checkTruckOpenStatus(selectedTruck.businessHours) === 'open' ? '🟢 OPEN' : '🔴 CLOSED'}
                  </Text>
                  {checkTruckOpenStatus(selectedTruck.businessHours) === 'closed' && (
                    <Text style={styles.statusSubtext}>Pre-orders unavailable</Text>
                  )}
                </View>
              )}
              */}
              
              {/* Clean Rating Display */}
              {reviews.length > 0 ? (
                <View style={styles.ratingContainer}>
                  <View style={styles.starRatingContainer}>
                    {renderStarRating(parseFloat(getAverageRating()), null, 20)}
                  </View>
                  <Text style={styles.averageRatingText}>
                    {getAverageRating()} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                  </Text>
                </View>
              ) : (
                <Text style={[styles.averageRatingText, {opacity: 0.7, marginTop: 8}]}>
                  No reviews yet
                </Text>
              )}
            </View>
            
            {/* Header Buttons - Organized in rows */}
            <View style={styles.headerButtonsWrapper}>
              {/* First Row - Primary Actions */}
              <View style={styles.headerButtonsRow}>
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
      
                      toggleFavorite(truckId, truckName);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name={userFavorites.has(selectedTruck.ownerId) ? "heart" : "heart-outline"} 
                      size={20} 
                      color={userFavorites.has(selectedTruck.ownerId) ? colors.accent.pink : colors.accent.blue} 
                    />
                    <Text style={[
                      styles.favoriteButtonText,
                      userFavorites.has(selectedTruck.ownerId) ? styles.favoriteButtonTextActive : styles.favoriteButtonTextInactive
                    ]}>
                      {userFavorites.has(selectedTruck.ownerId) ? 'Favorited' : 'Favorite'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Reviews Button - Show for all users */}
                <TouchableOpacity 
                  style={styles.reviewsButton}
                  onPress={() => {
             
                    
                    // Close truck modal first to prevent modal conflicts
                    setShowMenuModal(false);
                    
                    // Small delay to ensure truck modal closes before opening reviews modal
                    setTimeout(() => {
                      setShowReviewsModal(true);
            
                      loadReviews(selectedTruck?.ownerId);
                    }, 100);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name="star" 
                    size={20} 
                    color={colors.accent.blue} 
                  />
                  <Text style={styles.reviewsButtonText}>Reviews</Text>
                </TouchableOpacity>
                
                {/* Quick Menu Button - Show for all trucks */}
                <TouchableOpacity 
                  style={styles.quickMenuButton}
                  onPress={() => scrollToMenuSection()}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name="restaurant" 
                    size={20} 
                    color={colors.accent.blue} 
                  />
                  <Text style={styles.quickMenuButtonText}>Menu</Text>
                </TouchableOpacity>
              </View>
              
              {/* Second Row - Order Actions */}
              <View style={styles.headerButtonsRow}>
                {/* Cart Button */}
                <TouchableOpacity 
                  style={[
                    styles.cartButton,
                    getTotalItems() > 0 ? styles.cartButtonActive : styles.cartButtonInactive,
                    selectedTruck?.businessHours && checkTruckOpenStatus(selectedTruck.businessHours) === 'closed' 
                      ? styles.cartButtonDisabled 
                      : null
                  ]}
                  onPress={() => {
          
                    const status = selectedTruck?.businessHours ? checkTruckOpenStatus(selectedTruck.businessHours) : 'no-hours';
                   
                    // Check if truck is open before accessing cart
                    if (selectedTruck?.businessHours && checkTruckOpenStatus(selectedTruck.businessHours) === 'closed') {
                      showCustomModal(
                        '🚫 Mobile Kitchen Closed', 
                        'This mobile kitchen is currently closed. Pre-orders are only available during their open hours.',
                        null,
                        'OK',
                        '',
                        false
                      );
                      return;
                    }
                    

                    setShowCartModal(true);
                  }}
                  disabled={selectedTruck?.businessHours && checkTruckOpenStatus(selectedTruck.businessHours) === 'closed'}
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
                    <Text style={styles.cartButtonText}>
                      {selectedTruck?.businessHours && checkTruckOpenStatus(selectedTruck.businessHours) === 'closed' 
                        ? 'Closed' 
                        : 'Pre-order Cart'
                      }
                    </Text>
                  </View>
                </TouchableOpacity>
                
                {/* Book Truck for Catering Button - Show for all trucks */}
                <TouchableOpacity 
                  style={styles.cateringButton}
                  onPress={() => {
        
                    setShowCateringModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name="calendar" 
                    size={20} 
                    color={colors.accent.blue} 
                  />
                  <Text style={styles.cateringButtonText}>Book Catering</Text>
                </TouchableOpacity>

                {/* Book Festival Button - Show only for event organizers */}
                {userRole === 'event-organizer' && (
                  <TouchableOpacity 
                    style={[styles.cateringButton, styles.festivalButton]}
                    onPress={() => {
          
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
                      color={colors.accent.pink} 
                    />
                    <Text style={[styles.cateringButtonText, styles.festivalButtonText]}>Book Festival</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            

          </View>

          <ScrollView ref={modalScrollViewRef} style={styles.modalContent}>
            {/* Calendar Integration Section - Available for truck owners (Demo: showing for all trucks to test functionality) */}
            {selectedTruck && (
              <View style={styles.calendarSection}>
                <View style={styles.calendarTitleContainer}>
                  <Text style={styles.sectionTitle}>📅 Google Calendar</Text>
                  {isCalendarConnected && (
                    <View style={styles.calendarStatusBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={styles.calendarStatusText}>Connected</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.calendarButtonContainer}>
                  <View 
                    style={[
                      styles.calendarConnectButton,
                      styles.calendarComingSoonButton,
                      styles.calendarDisabledButton
                    ]}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={20} 
                      color="#999" 
                    />
                    <Text style={[
                      styles.calendarConnectButtonText,
                      styles.calendarComingSoonButtonText,
                      styles.calendarDisabledButtonText
                    ]}>
                      Coming Soon
                    </Text>
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonBadgeText}>In Development</Text>
                    </View>
                  </View>
                </View>
                
                {/* Display upcoming events - Only for authorized users */}
                {/* TODO: Re-enable when expo-auth-session is working */}
                {/* 
                !shouldShowCalendarComingSoon(user) && isCalendarConnected && calendarEvents.length > 0 && (
                  <View style={styles.upcomingEventsContainer}>
                    <Text style={styles.upcomingEventsTitle}>Upcoming Events:</Text>
                    <CalendarEventsDisplay 
                      events={calendarEvents.slice(0, 3)} 
                      showTitle={false}
                      compact={true}
                    />
                  </View>
                )
                */}
              </View>
            )}

            {/* Truck Info Section */}
            <View style={styles.truckInfoSection}>
              {selectedTruck?.coverUrl && (
                <View style={styles.coverPhotoSection}>
                  <Text style={styles.sectionTitle}>📸 Logo Photo</Text>
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
                      onError={(error) => ('')}
                      onLoad={() => ('')}
                    />
                  </View>
                </View>
              )}
              
              {/* Mobile Kitchen Description */}
         
              {selectedTruck?.description && selectedTruck.description.trim() && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionText}>
                    {selectedTruck.description}
                  </Text>
                </View>
              )}
              
              {/* Menu Image Section */}
              {selectedTruck?.menuUrl && (
                <View style={styles.menuImageSection}>
                  <Text style={styles.sectionTitle}>📋 Menu</Text>
                  <TouchableOpacity 
                    style={styles.menuImageContainer}
                    onPress={() => {
                      // Open full-screen menu viewer - simplified for production
                      openFullScreenMenu();
                    }}
                    activeOpacity={0.8}
                  >
                    <Image 
                      source={{ uri: selectedTruck.menuUrl }} 
                      style={styles.menuImage}
                      resizeMode="contain"
                      onError={(error) => ('')}
                      onLoad={() => ('')}
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
                      <TouchableOpacity 
                        style={styles.socialIcon}
                        onPress={() => openURL(selectedTruck.socialLinks.instagram, 'Instagram')}
                      >
                        <Ionicons name="logo-instagram" size={28} color="#E4405F" />
                      </TouchableOpacity>
                    )}
                    {selectedTruck.socialLinks?.facebook && (
                      <TouchableOpacity 
                        style={styles.socialIcon}
                        onPress={() => openURL(selectedTruck.socialLinks.facebook, 'Facebook')}
                      >
                        <Ionicons name="logo-facebook" size={28} color="#1877F2" />
                      </TouchableOpacity>
                    )}
                    {selectedTruck.socialLinks?.twitter && (
                      <TouchableOpacity 
                        style={styles.socialIcon}
                        onPress={() => openURL(selectedTruck.socialLinks.twitter, 'X/Twitter')}
                      >
                        <Ionicons name="logo-twitter" size={28} color="#000000" />
                      </TouchableOpacity>
                    )}
                    {selectedTruck.socialLinks?.tiktok && (
                      <TouchableOpacity 
                        style={styles.socialIcon}
                        onPress={() => openURL(selectedTruck.socialLinks.tiktok, 'TikTok')}
                      >
                        <Ionicons name="logo-tiktok" size={28} color="#000000" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Drops Section - Available for all truck owners */}
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
                        
                              
                              if (showClaimCodesModal) {
                                // Modal is already open, close it
                     
                                setShowClaimCodesModal(false);
                              } else {
                                // Modal is closed, open it
                        
                                fetchClaimCodes(drop.id);
                                setShowClaimCodesModal(true);
                              }
                       
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
                            onLoadStart={() => ('')}
                            onLoad={() => ('')}
                            onError={(error) => ('')}
                          />
                        )}
                        
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
                          style={[
                            styles.addToCartButton,
                            selectedTruck?.businessHours && checkTruckOpenStatus(selectedTruck.businessHours) === 'closed' 
                              ? styles.addToCartButtonDisabled 
                              : null
                          ]}
                          onPress={() => {
                            const status = selectedTruck?.businessHours ? checkTruckOpenStatus(selectedTruck.businessHours) : 'no-hours';
                            addToCart(item);
                          }}
                          disabled={selectedTruck?.businessHours && checkTruckOpenStatus(selectedTruck.businessHours) === 'closed'}
                        >
                          <Ionicons 
                            name={selectedTruck?.businessHours && checkTruckOpenStatus(selectedTruck.businessHours) === 'closed' ? "lock-closed" : "add-circle"} 
                            size={16} 
                            color={selectedTruck?.businessHours && checkTruckOpenStatus(selectedTruck.businessHours) === 'closed' ? "#999" : "#fff"} 
                          />
                          <Text style={[
                            styles.addToCartButtonText,
                            selectedTruck?.businessHours && checkTruckOpenStatus(selectedTruck.businessHours) === 'closed' 
                              ? styles.addToCartButtonTextDisabled 
                              : null
                          ]}>
                            {selectedTruck?.businessHours && checkTruckOpenStatus(selectedTruck.businessHours) === 'closed' 
                              ? 'Closed' 
                              : 'Add to Cart'
                            }
                          </Text>
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
                backgroundColor: theme.colors.background.primary, 
                marginTop: 60,
                borderRadius: 20,
                margin: 20,
                width: '90%',
                maxHeight: '80%',
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.neonPink,
                elevation: 10
              }}>
                {/* Cart Header */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border
                }}>
                  <Text style={{ 
                    fontSize: 24, 
                    fontWeight: 'bold',
                    color: colors.text.primary
                  }}>
                    🛒 Your Cart
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
             
                      setShowCartModal(false);
                    }}
                    style={{
                      padding: 8,
                      borderRadius: 20,
                      backgroundColor: theme.colors.background.secondary,
                      borderWidth: 1,
                      borderColor: colors.accent.pink,
                    }}
                  >
                    <Ionicons name="close" size={20} color={colors.accent.pink} />
                  </TouchableOpacity>
                </View>

                {/* Cart Items */}
                <ScrollView style={{ maxHeight: 300, padding: 20 }}>
                  {cart.length === 0 ? (
                    <View style={{ alignItems: 'center', padding: 30 }}>
                      <Text style={{ fontSize: 18, color: theme.colors.text.secondary, textAlign: 'center' }}>
                        Your cart is empty
                      </Text>
                      <Text style={{ fontSize: 14, color: theme.colors.text.secondary, textAlign: 'center', marginTop: 10 }}>
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
                        borderBottomColor: theme.colors.border
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text.primary }}>
                            {item.name}
                          </Text>
                          <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 2 }}>
                            ${item.price.toFixed(2)} each
                          </Text>
                        </View>
                        
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center',
                          backgroundColor: theme.colors.background.secondary,
                          borderRadius: 8,
                          padding: 5
                        }}>
                          <TouchableOpacity 
                            onPress={() => updateQuantity(item.id, item.quantity - 1)}
                            style={{
                              backgroundColor: theme.colors.accent.pink,
                              borderRadius: 15,
                              width: 30,
                              height: 30,
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}
                          >
                            <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: 'bold' }}>-</Text>
                          </TouchableOpacity>
                          
                          <Text style={{ 
                            marginHorizontal: 15, 
                            fontSize: 16, 
                            fontWeight: 'bold',
                            color: colors.text.primary,
                            minWidth: 20,
                            textAlign: 'center'
                          }}>
                            {item.quantity}
                          </Text>
                          
                          <TouchableOpacity 
                            onPress={() => updateQuantity(item.id, item.quantity + 1)}
                            style={{
                              backgroundColor: theme.colors.accent.blue,
                              borderRadius: 15,
                              width: 30,
                              height: 30,
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}
                          >
                            <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: 'bold' }}>+</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={{ 
                          fontSize: 16, 
                          fontWeight: 'bold',
                          color: colors.accent.blue,
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
                    borderTopColor: theme.colors.border,
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
                        <Text style={{ fontSize: 16, color: colors.text.secondary }}>
                          Subtotal:
                        </Text>
                        <Text style={{ fontSize: 16, color: colors.text.primary }}>
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
                        <Text style={{ fontSize: 14, color: colors.text.secondary }}>
                          Sales Tax (8.75%):
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.text.secondary }}>
                          ${getSalesTax()}
                        </Text>
                      </View>

                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.border
                      }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary }}>
                          Total:
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.accent.blue }}>
                          ${getFinalTotal()}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity 
                      onPress={placeOrder}
                      style={{
                        backgroundColor: theme.colors.accent.pink,
                        borderRadius: 12,
                        padding: 18,
                        alignItems: 'center',
                        marginBottom: 10,
                        ...theme.shadows.neonPink,
                      }}
                    >
                      <Text style={{ 
                        fontSize: 18, 
                        color: colors.text.primary,
                        fontWeight: 'bold'
                      }}>
                        Pay with Stripe (${getFinalTotal()})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => {
           
                        setShowCartModal(false);
                      }}
                      style={{
                        backgroundColor: theme.colors.background.secondary,
                        borderRadius: 12,
                        padding: 15,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Text style={{ 
                        fontSize: 16, 
                        color: colors.text.secondary,
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
              backgroundColor: 'rgba(11, 11, 26, 0.95)',
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
                  backgroundColor: colors.background.primary,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.accent.pink,
                  shadowColor: colors.accent.pink,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  elevation: 15,
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
                  borderBottomColor: colors.accent.pink,
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: colors.text.primary,
                    flex: 1,
                  }}>
                    🎉 Book {selectedTruck?.name} for Catering
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCateringModal(false)}
                    style={{
                      padding: 8,
                      borderRadius: 20,
                      backgroundColor: colors.background.secondary,
                      borderWidth: 1,
                      borderColor: colors.accent.pink,
                    }}
                  >
                    <Ionicons name="close" size={20} color={colors.accent.pink} />
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
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 5 }}>
                      Your Name *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: theme.colors.background.secondary,
                        color: theme.colors.text.primary,
                      }}
                      value={cateringFormData.customerName}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, customerName: text }))}
                      placeholder="Enter your full name"
                      placeholderTextColor={theme.colors.text.secondary}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Email */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 5 }}>
                      Email Address *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: theme.colors.background.secondary,
                        color: theme.colors.text.primary,
                      }}
                      value={cateringFormData.customerEmail}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, customerEmail: text }))}
                      placeholder="your.email@example.com"
                      placeholderTextColor={theme.colors.text.secondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Phone */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 5 }}>
                      Phone Number *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: theme.colors.background.secondary,
                        color: theme.colors.text.primary,
                      }}
                      value={cateringFormData.customerPhone}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, customerPhone: text }))}
                      placeholder="(555) 123-4567"
                      placeholderTextColor={theme.colors.text.secondary}
                      keyboardType="phone-pad"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Event Date */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 5 }}>
                      Event Date *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: theme.colors.background.secondary,
                        color: theme.colors.text.primary,
                      }}
                      value={cateringFormData.eventDate}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, eventDate: text }))}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor={theme.colors.text.secondary}
                      returnKeyType="next"
                    />
                  </View>

                  {/* Event Time */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 5 }}>
                      Event Time *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: theme.colors.background.secondary,
                        color: theme.colors.text.primary,
                      }}
                      value={cateringFormData.eventTime}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, eventTime: text }))}
                      placeholder="e.g., 12:00 PM - 3:00 PM"
                      placeholderTextColor={theme.colors.text.secondary}
                      returnKeyType="next"
                    />
                  </View>

                  {/* Event Location */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 5 }}>
                      Event Location *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: theme.colors.background.secondary,
                        color: theme.colors.text.primary,
                        minHeight: 50,
                        textAlignVertical: 'top',
                      }}
                      value={cateringFormData.eventLocation}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, eventLocation: text }))}
                      placeholder="Full address or venue name"
                      placeholderTextColor={theme.colors.text.secondary}
                      multiline={true}
                      numberOfLines={2}
                      returnKeyType="next"
                    />
                  </View>

                  {/* Guest Count */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 5 }}>
                      Estimated Guest Count *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: theme.colors.background.secondary,
                        color: theme.colors.text.primary,
                      }}
                      value={cateringFormData.guestCount}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, guestCount: text }))}
                      placeholder="e.g., 50-75 people"
                      placeholderTextColor={theme.colors.text.secondary}
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Special Requests */}
                  <View style={{ marginBottom: 25 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 5 }}>
                      Special Requests or Details
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                        backgroundColor: theme.colors.background.secondary,
                        color: theme.colors.text.primary,
                        minHeight: 100,
                        textAlignVertical: 'top',
                      }}
                      value={cateringFormData.specialRequests}
                      onChangeText={(text) => setCateringFormData(prev => ({ ...prev, specialRequests: text }))}
                      placeholder="Any dietary restrictions, special menu requests, or other details..."
                      placeholderTextColor={theme.colors.text.secondary}
                      multiline={true}
                      numberOfLines={4}
                      returnKeyType="done"
                    />
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: submittingCateringForm ? theme.colors.text.secondary : theme.colors.accent.pink,
                      padding: 15,
                      borderRadius: 10,
                      alignItems: 'center',
                      marginBottom: 15,
                      ...(!submittingCateringForm ? theme.shadows.neonPink : {}),
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
                    color: colors.text.secondary,
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
              backgroundColor: 'rgba(11, 11, 26, 0.95)',
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
                  backgroundColor: colors.background.primary,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.accent.pink,
                  shadowColor: colors.accent.pink,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  elevation: 15,
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
                  borderBottomColor: colors.accent.pink,
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: colors.text.primary,
                    flex: 1,
                  }}>
                    🎪 Book {selectedTruck?.name} for Festival
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowFestivalModal(false)}
                    style={{
                      padding: 8,
                      borderRadius: 20,
                      backgroundColor: colors.background.secondary,
                      borderWidth: 1,
                      borderColor: colors.accent.pink,
                    }}
                  >
                    <Ionicons name="close" size={20} color={colors.accent.pink} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Organizer Information */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: colors.text.primary,
                      marginBottom: 15,
                    }}>
                      📋 Organizer Information
                    </Text>

                    {/* Organizer Name */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Organization/Contact Name *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="Enter organization or contact name"
                        placeholderTextColor={theme.colors.text.secondary}
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
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Contact Email *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="Enter your email address"
                        placeholderTextColor={theme.colors.text.secondary}
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
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Contact Phone *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="Enter your phone number"
                        placeholderTextColor={theme.colors.text.secondary}
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
                      color: colors.text.primary,
                      marginBottom: 15,
                    }}>
                      🎪 Event Information
                    </Text>

                    {/* Event Name */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Event Name *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="Enter event name"
                        placeholderTextColor={theme.colors.text.secondary}
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
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Event Date *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="MM/DD/YYYY"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={festivalFormData.eventDate}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, eventDate: text }))}
                      />
                    </View>

                    {/* Event Time */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Event Time *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="e.g. 10:00 AM - 6:00 PM"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={festivalFormData.eventTime}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, eventTime: text }))}
                      />
                    </View>

                    {/* Event Location */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Event Location *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="Enter event location/venue"
                        placeholderTextColor={theme.colors.text.secondary}
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
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Event Address
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="Enter full address (optional)"
                        placeholderTextColor={theme.colors.text.secondary}
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
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Expected Attendance *
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="e.g. 500-1000 people"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={festivalFormData.expectedAttendance}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, expectedAttendance: text }))}
                      />
                    </View>

                    {/* Event Duration */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Event Duration
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="e.g. 1 day, 2 days, weekend"
                        placeholderTextColor={theme.colors.text.secondary}
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
                      color: colors.text.primary,
                      marginBottom: 15,
                    }}>
                      📋 Event Details
                    </Text>

                    {/* Spaces Available */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Available Vendor Spaces
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="e.g. 20 food trucks, 10x10 spaces"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={festivalFormData.spacesAvailable}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, spacesAvailable: text }))}
                      />
                    </View>

                    {/* Amenities */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text.primary,
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
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          marginBottom: 8,
                          backgroundColor: festivalFormData.electricityProvided ? colors.background.secondary : theme.colors.background.secondary,
                        }}
                        onPress={() => setFestivalFormData(prev => ({ ...prev, electricityProvided: !prev.electricityProvided }))}
                      >
                        <Ionicons 
                          name={festivalFormData.electricityProvided ? "checkbox" : "square-outline"} 
                          size={20} 
                          color={festivalFormData.electricityProvided ? colors.accent.blue : colors.text.secondary} 
                        />
                        <Text style={{ marginLeft: 10, fontSize: 16, color: colors.text.primary }}>
                          Electricity provided
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          backgroundColor: festivalFormData.waterProvided ? colors.background.secondary : theme.colors.background.secondary,
                        }}
                        onPress={() => setFestivalFormData(prev => ({ ...prev, waterProvided: !prev.waterProvided }))}
                      >
                        <Ionicons 
                          name={festivalFormData.waterProvided ? "checkbox" : "square-outline"} 
                          size={20} 
                          color={festivalFormData.waterProvided ? colors.accent.blue : colors.text.secondary} 
                        />
                        <Text style={{ marginLeft: 10, fontSize: 16, color: colors.text.primary }}>
                          Water access provided
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Booth Fee */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Booth Fee Structure
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="e.g. $200/day, $500/weekend, or negotiable"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={festivalFormData.boothFee}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, boothFee: text }))}
                      />
                    </View>

                    {/* Sales Percentage */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Sales Percentage (if applicable)
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                        }}
                        placeholder="e.g. 10% of sales, or none"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={festivalFormData.salesPercentage}
                        onChangeText={(text) => setFestivalFormData(prev => ({ ...prev, salesPercentage: text }))}
                      />
                    </View>

                    {/* Event Description */}
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Event Description
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                          height: 80,
                          textAlignVertical: 'top',
                        }}
                        placeholder="Describe your event, theme, target audience, etc."
                        placeholderTextColor={theme.colors.text.secondary}
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
                        color: colors.text.primary,
                        marginBottom: 5,
                      }}>
                        Special Requirements
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 16,
                          backgroundColor: theme.colors.background.secondary,
                          color: theme.colors.text.primary,
                          height: 60,
                          textAlignVertical: 'top',
                        }}
                        placeholder="Any special setup requirements, restrictions, etc."
                        placeholderTextColor={theme.colors.text.secondary}
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
                      backgroundColor: submittingFestivalForm ? colors.background.tertiary : colors.accent.pink,
                      padding: 15,
                      borderRadius: 10,
                      alignItems: 'center',
                      marginBottom: 15,
                      borderWidth: 1,
                      borderColor: colors.accent.pink,
                      shadowColor: colors.accent.pink,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 5,
                    }}
                    onPress={() => handleFestivalSubmit()}
                    disabled={submittingFestivalForm || !festivalFormData.organizerName || !festivalFormData.organizerEmail || !festivalFormData.organizerPhone || !festivalFormData.eventName}
                    activeOpacity={0.8}
                  >
                    {submittingFestivalForm ? (
                      <ActivityIndicator size="small" color={colors.text.primary} />
                    ) : (
                      <Text style={{
                        color: colors.text.primary,
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
                    color: colors.text.secondary,
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

      {/* Reviews Modal */}
      <Modal
        visible={showReviewsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReviewsModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Close Button - Positioned relative to modalContainer, not modalHeader */}
          <TouchableOpacity 
            style={styles.reviewsCloseButton}
            onPress={() => {
         
              setShowReviewsModal(false);
              // Small delay to ensure reviews modal closes before opening menu modal
              setTimeout(() => {
                setShowMenuModal(true);
              }, 100);
            }}
            activeOpacity={0.6}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.reviewsCloseButtonText}>✕</Text>
          </TouchableOpacity>
          
          <View style={styles.modalHeader}>
            {/* Grubana Logo - Centered in header */}
            <View style={styles.headerLogoContainer}>
              <Image 
                source={require('../../assets/logo.png')}
                style={styles.reviewsModalLogo}
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                ⭐ Reviews for {selectedTruck?.name || 'Food Truck'}
              </Text>
              {reviews.length > 0 && (
                <Text style={styles.modalSubtitle}>
                  {getAverageRating()} ⭐ ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                </Text>
              )}
            </View>
          </View>

          {/* Truck Logo/Cover Image - Positioned below header */}
          {selectedTruck?.coverUrl && (
            <View style={styles.reviewModalImageContainer}>
              <Image 
                source={{ uri: selectedTruck.coverUrl }}
                style={styles.reviewModalTruckImage}
                resizeMode="cover"
              />
            </View>
          )}

          <ScrollView style={styles.modalContent}>
            {/* Write Review Section - Only for customers */}
            {userRole === 'customer' && (
              <View style={styles.reviewFormSection}>
                <Text style={styles.sectionTitle}>
                  {selectedTruck?.name || 'Food Truck'} 
                </Text>
                <View style={styles.reviewForm}>
                  <Text style={styles.ratingLabel}>Select Rating:</Text>
                  {renderStarRating(newReview.rating, (rating) => setNewReview(prev => ({ ...prev, rating })))}
                  
                  <Text style={styles.commentLabel}>Write a Review:</Text>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Share your experience with this food truck..."
                    value={newReview.comment}
                    onChangeText={(text) => setNewReview(prev => ({ ...prev, comment: text }))}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                  />
                  <Text style={styles.characterCount}>{newReview.comment.length}/500</Text>
                  
                  <TouchableOpacity
                    style={[styles.submitReviewButton, submittingReview && styles.disabledButton]}
                    onPress={submitReview}
                    disabled={submittingReview}
                  >
                    {submittingReview ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitReviewButtonText}>Submit Review</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Reviews List */}
            <View style={styles.reviewsListSection}>
              <Text style={styles.sectionTitle}>📝 Customer Reviews</Text>
              
              {loadingReviews ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2c6f57" />
                  <Text style={styles.loadingText}>Loading reviews...</Text>
                </View>
              ) : reviews.length === 0 ? (
                <View style={styles.emptyReviewsContainer}>
                  <Text style={styles.emptyReviewsIcon}>⭐</Text>
                  <Text style={styles.emptyReviewsTitle}>No Reviews Yet</Text>
                  <Text style={styles.emptyReviewsText}>
                    Be the first to share your experience with this food truck!
                  </Text>
                </View>
              ) : (
                <View style={styles.reviewsList}>
                  {reviews.map((review) => (
                    <View key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <Text style={styles.reviewerName}>{review.userName}</Text>
                        <View style={styles.reviewRating}>
                          {renderStarRating(review.rating, null, 16)}
                        </View>
                      </View>
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                      <Text style={styles.reviewDate}>
                        {review.createdAt.toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
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

      {/* Toast Notification */}
      {showToast && (
        <Animated.View 
          style={[
            styles.toastContainer, 
            { opacity: toastOpacity },
            toastType === 'error' ? styles.toastError : styles.toastSuccess
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Custom Modal (replaces Alert.alert) */}
      <Modal
        visible={customModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideCustomModal}
      >
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalContainer}>
            <Text style={styles.customModalTitle}>{customModal.title}</Text>
            <Text style={styles.customModalMessage}>{customModal.message}</Text>
            
            <View style={styles.customModalButtons}>
              {customModal.showCancel && (
                <TouchableOpacity 
                  style={[styles.customModalButton, styles.customModalCancelButton]}
                  onPress={hideCustomModal}
                >
                  <Text style={styles.customModalCancelText}>{customModal.cancelText}</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.customModalButton, styles.customModalConfirmButton]}
                onPress={() => {
                  if (customModal.onConfirm) {
                    customModal.onConfirm();
                  }
                  hideCustomModal();
                }}
              >
                <Text style={styles.customModalConfirmText}>{customModal.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Connect Modal - Only for authorized users */}
      {/* TODO: Re-enable when expo-auth-session is working */}
      {/* <CalendarConnectModal
        visible={showCalendarModal && !shouldShowCalendarComingSoon(user)}
        onClose={() => setShowCalendarModal(false)}
        truckName={selectedTruck?.name || 'Food Truck'}
      /> */}

      {/* Foodie Photo Gallery Modal */}
      <Modal
        visible={showFoodieGallery}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFoodieGallery(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowFoodieGallery(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              📸 {selectedFoodie?.name}'s Photos
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            {loadingPhotos ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading photos...</Text>
              </View>
            ) : foodiePhotos.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateIcon}>📷</Text>
                <Text style={styles.emptyStateTitle}>No Photos Yet</Text>
                <Text style={styles.emptyStateText}>
                  {selectedFoodie?.name} hasn't shared any food photos yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={foodiePhotos}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={styles.photoGrid}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.photoItem}
                    onPress={() => {
      
                      // Close the photo gallery modal first
                      setShowFoodieGallery(false);
                      // Then open the full-screen photo viewer
                      setFullScreenPhotoUrl(item.imageUrl);
                      setFullScreenPhotoData(item);
                      setShowFullScreenPhoto(true);
               
                    }}
                    activeOpacity={0.8}
                  >
                    <Image 
                      source={{ uri: item.imageUrl }} 
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                    {/* Like button - top right */}
                    <View style={styles.photoOverlay}>
                      <TouchableOpacity
                        style={styles.likeButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          togglePhotoLike(item.id, item.isLikedByUser);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={item.isLikedByUser ? "heart" : "heart-outline"} 
                          size={16} 
                          color={item.isLikedByUser ? "#FF3B30" : "#FFFFFF"} 
                        />
                        <Text style={styles.likeCount}>{item.likeCount || 0}</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Delete button - top left, only show for photo owner */}
                    {item.userId === user?.uid && (
                      <View style={styles.photoDeleteOverlay}>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            setShowFoodieGallery(false); // Close gallery before showing modal
                            setTimeout(() => {
                              deletePhoto(item.id, item.imageUrl);
                            }, 300); // Small delay to ensure modal closes first
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name="trash-outline" 
                            size={16} 
                            color="#FFFFFF" 
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {/* Tagged Food Truck - bottom overlay */}
                    {item.taggedTruck && (
                      <View style={styles.truckTagOverlay}>
                        <View style={styles.truckTag}>
                          <Ionicons name="restaurant" size={12} color="#FFFFFF" />
                          <Text style={styles.truckTagText} numberOfLines={1}>
                            {item.taggedTruck.truckName}
                          </Text>
                        </View>
                      </View>
                    )}
                    
                    {item.description && (
                      <View style={styles.photoDescription}>
                        <Text style={styles.photoDescriptionText} numberOfLines={2}>
                          {item.description}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>



      {/* Photo upload handled by dedicated PhotoUploadScreen */}

      {/* Floating Action Button for Photo Upload */}
      {user && (
        <TouchableOpacity
          style={[styles.photoFAB, { 
            opacity: 0.95
          }]}
          onPress={() => {
      
            navigation.navigate('PhotoUpload', { 
              location,
              onPhotoUploaded: refreshLeaderboardData // Pass callback to refresh leaderboard
            });
          }}
          activeOpacity={0.8}
        >
          <View style={styles.fabIconContainer}>
            <Ionicons name="camera" size={26} color="#4DBFFF" style={styles.fabIcon} />
          </View>
        </TouchableOpacity>
      )}

      {/* Full-Screen Photo Viewer - Using absolute positioning instead of Modal */}
      {showFullScreenPhoto && (
        <View style={styles.fullScreenPhotoContainer}>
     
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.fullScreenCloseButton}
            onPress={() => {
       
              setShowFullScreenPhoto(false);
              setShowFoodieGallery(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* Full-Screen Photo */}
          {fullScreenPhotoUrl && (
            <>
              <Image 
                source={{ uri: fullScreenPhotoUrl }}
                style={styles.fullScreenPhoto}
                resizeMode="contain"
              />
              
              {/* Tagged Food Truck Display in Full Screen */}
              {fullScreenPhotoData?.taggedTruck && (
                <View style={styles.fullScreenTruckTag}>
                  <View style={styles.fullScreenTruckTagContent}>
                    <Ionicons name="restaurant" size={16} color="#FFFFFF" />
                    <Text style={styles.fullScreenTruckTagText}>
                      {fullScreenPhotoData.taggedTruck.truckName}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}

    </View>
  );
}

// Create themed styles function
const createThemedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  webview: {
    flex: 1,
  },
  header: {
    padding: 15,
    backgroundColor: theme.colors.background.secondary,
    paddingTop: 50,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  headerLogo: {
    width: 280,
    height: 120,
    marginTop: -20,
    marginBottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
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
    backgroundColor: 'rgba(11, 11, 26, 0.95)',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#FF4EC9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#FF4EC9',
    borderLeftWidth: 4,
    borderLeftColor: '#4DBFFF', // Blue accent left border
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
    color: theme.colors.text.secondary,
    marginTop: 5,
    fontStyle: 'italic',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    borderWidth: 3,
    borderColor: theme.colors.accent.pink,
    borderTopWidth: 5,
    borderTopColor: theme.colors.accent.blue,
  },
  modalHeader: {
    backgroundColor: theme.colors.background.secondary,
    padding: 5,
    paddingTop: 0,
    paddingRight: -10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'relative',
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerLogoContainer: {
    position: 'absolute',
    top: 5,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  reviewsModalLogo: {
    width: 200,
    height: 80,
    backgroundColor: 'transparent',
    marginTop: -20,
    marginBottom: -20,
  },
  closeButton: {
    position: 'absolute',
    top: 55,
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
    textAlign: 'center',
  },
  reviewModalImageContainer: {
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  reviewModalTruckImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  modalSubtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'center',
    borderWidth: 1,
  },
  statusOpen: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  statusClosed: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusTextOpen: {
    color: '#155724',
  },
  statusTextClosed: {
    color: '#721c24',
  },
  statusSubtext: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    color: '#721c24',
    fontStyle: 'italic',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'center',
  },
  starRatingContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  averageRatingText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
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
    color: theme.colors.accent.pink,
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingMenuText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  coverPhotoSection: {
    marginBottom: 20,
  },
  coverImageContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coverImage: {
    width: '100%',
    minHeight: 200,
    maxHeight: 400,
    borderRadius: 10,
    resizeMode: 'contain',
  },
  descriptionSection: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  socialIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  
  // Calendar Section Styles
  calendarSection: {
    marginBottom: 20,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
    ...theme.shadows.neonBlue,
  },
  calendarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  calendarStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  calendarStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  calendarButtonContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  calendarConnectButton: {
    backgroundColor: theme.colors.accent.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 200,
    ...theme.shadows.neonBlue,
  },
  calendarConnectedButton: {
    backgroundColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  calendarConnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  calendarComingSoonButton: {
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  calendarComingSoonButtonText: {
    color: theme.colors.text.secondary,
  },
  calendarDisabledButton: {
    backgroundColor: theme.colors.background.tertiary,
    borderColor: theme.colors.border,
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  calendarDisabledButtonText: {
    color: '#999',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: theme.colors.accent.pink,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    ...theme.shadows.neonPink,
  },
  comingSoonBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  upcomingEventsContainer: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  upcomingEventsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  
  // Drops Section Styles
  dropsSection: {
    marginBottom: 20,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
    ...theme.shadows.neonBlue,
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
  planUpgradeContainer: {
    marginBottom: 15,
  },
  planUpgradeCard: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#f39c12',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    gap: 8,
  },
  planUpgradeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f39c12',
  },
  planUpgradeText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 4,
  },
  planUpgradeSubtext: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  createDropButton: {
    backgroundColor: theme.colors.accent.blue,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.neonBlue,
  },
  createDropButtonText: {
    color: theme.colors.text.primary,
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
    backgroundColor: theme.colors.background.secondary,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.neonBlue,
  },
  dropFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  dropFieldLabel: {
    fontSize: 14,
    color: theme.colors.accent.blue,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
  },
  dropInputContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
  },
  dropInput: {
    color: theme.colors.text.primary,
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
    backgroundColor: theme.colors.accent.pink,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.neonPink,
  },
  submitDropButtonDisabled: {
    backgroundColor: theme.colors.text.secondary,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  submitDropButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Customer Drops Section Styles
  customerDropsSection: {
    marginBottom: 20,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.neonBlue,
  },
  claimedDropCard: {
    backgroundColor: 'rgba(255, 78, 201, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.colors.accent.pink,
    alignItems: 'center',
    ...theme.shadows.neonPink,
  },
  claimedDropTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.accent.pink,
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
    color: theme.colors.background.primary,
    letterSpacing: 2,
    marginVertical: 10,
    padding: 10,
    backgroundColor: theme.colors.accent.pink,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.accent.pink,
    borderStyle: 'dashed',
    ...theme.shadows.neonPink,
  },
  claimedDropExpires: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  claimMessageContainer: {
    padding: 10,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  claimMessage: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  noDropsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDropsText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  dropsContainer: {
    marginTop: 10,
  },
  dropCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.neonBlue,
  },
  dropTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.accent.pink,
    marginBottom: 6,
  },
  dropDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
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
    color: theme.colors.text.secondary,
    flex: 1,
  },
  claimDropButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text.primary,
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent.blue,
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 12,
    color: colors.text.secondary,
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
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  cuisineModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: theme.colors.accent.pink,
  },
  cuisineModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: theme.colors.text.secondary,
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
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    position: 'relative',
  },
  cuisineOptionSelected: {
    borderColor: theme.colors.accent.pink,
    backgroundColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  cuisineOptionExcluded: {
    borderColor: theme.colors.accent.pink,
    backgroundColor: theme.colors.background.primary,
    opacity: 0.7,
  },
  cuisineOptionAll: {
    borderColor: theme.colors.accent.blue,
    backgroundColor: theme.colors.accent.blue,
    ...theme.shadows.neonBlue,
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
    color: theme.colors.text.primary,
    lineHeight: 14,
  },
  cuisineNameSelected: {
    color: theme.colors.text.primary,
  },
  cuisineNameAll: {
    color: theme.colors.text.primary,
  },
  cuisineNameExcluded: {
    color: theme.colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  cuisineCheckmark: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.accent.pink,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.text.primary,
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
    borderTopColor: theme.colors.border,
  },
  cuisineModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButton: {
    backgroundColor: theme.colors.background.secondary,
  },
  clearButton: {
    backgroundColor: theme.colors.accent.blue,
    ...theme.shadows.neonBlue,
  },
  applyButton: {
    backgroundColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  
  // Cart-related styles
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 25,
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
  cartButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
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
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 0,
    width: '100%',
  },
  headerButtonsWrapper: {
    width: '100%',
    gap: 8,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
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
  reviewsButton: {
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
  reviewsButtonText: {
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
  addToCartButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  addToCartButtonTextDisabled: {
    color: '#999',
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
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background.secondary,
  },
  toggleText: {
    color: theme.colors.text.primary,
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
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  ownerDropHeader: {
    marginBottom: 8,
  },
  ownerDropTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  ownerDropExpiry: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  ownerDropDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
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
  
  // Reviews Modal Styles
  reviewFormSection: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  reviewForm: {
    gap: 15,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  starRating: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  starButton: {
    padding: 4,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  submitReviewButton: {
    backgroundColor: '#2c6f57',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitReviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewsListSection: {
    marginBottom: 20,
  },
  emptyReviewsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  emptyReviewsIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyReviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptyReviewsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  reviewsList: {
    gap: 15,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  disabledButton: {
    opacity: 0.6,
  },
  
  // Reviews Modal Styles
  reviewsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewsModalContent: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  reviewsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  reviewsModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  reviewsCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 12,
    backgroundColor: theme.colors.accent.pink,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 30,
    borderWidth: 3,
    borderColor: theme.colors.border,
    ...theme.shadows.neonPink,
  },
  reviewsCloseButtonText: {
    fontSize: 24,
    color: theme.colors.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
  },
  averageRatingContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
    ...theme.shadows.neonBlue,
  },
  averageRatingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.accent.pink,
    marginBottom: 5,
  },
  averageStars: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  reviewCount: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  leaveReviewSection: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
    ...theme.shadows.neonBlue,
  },
  starRatingContainer: {
    marginBottom: 15,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent.blue,
    marginBottom: 8,
  },
  starRatingInput: {
    flexDirection: 'row',
    gap: 8,
  },
  commentInputContainer: {
    marginBottom: 15,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent.blue,
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'right',
    marginTop: 5,
  },
  submitReviewButton: {
    backgroundColor: theme.colors.accent.pink,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.neonPink,
  },
  submitReviewButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewsListSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  reviewsList: {
    maxHeight: 300,
  },
  reviewCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.neonBlue,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  emptyReviewsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyReviewsIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyReviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  emptyReviewsText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },

  // Toast notification styles
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  toastSuccess: {
    backgroundColor: '#4CAF50',
  },
  toastError: {
    backgroundColor: '#f44336',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Custom modal styles (replaces Alert.alert)
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  customModalContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    maxWidth: '90%',
  },
  customModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  customModalMessage: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  customModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  customModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  customModalCancelButton: {
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  customModalConfirmButton: {
    backgroundColor: theme.colors.primary,
  },
  customModalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  customModalConfirmText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // Photo Gallery Styles
  photoGrid: {
    padding: 8,
  },
  photoItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  photoImage: {
    width: '100%',
    height: '70%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photoDeleteOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  truckTagOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
  },
  truckTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 78, 201, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  truckTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
  },
  likeCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  photoDescription: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 6,
  },
  photoDescriptionText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },

  // Photo Upload Styles
  photoFAB: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A1036', // Secondary Background: Deep purple
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#FF4EC9',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    borderWidth: 2,
    borderColor: '#FF4EC9', // Primary Accent: Neon pink outline
  },
  fabIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Full-Screen Photo Viewer Styles
  fullScreenPhotoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999, // For Android
  },
  fullScreenCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenPhoto: {
    width: '100%',
    height: '100%',
  },
  fullScreenTruckTag: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'flex-start',
  },
  fullScreenTruckTagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 78, 201, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  fullScreenTruckTagText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  photoOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoOptionsContainer: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  photoOptionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  photoOptionsSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  photoOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  photoOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  photoCancelButton: {
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  photoCancelText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },

});
