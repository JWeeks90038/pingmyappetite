import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Dimensions, Modal, Image, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useAuth } from '../components/AuthContext';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, serverTimestamp, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { calculateStripeConnectPayment, preparePaymentIntentData } from '../utils/paymentConfig';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [foodTrucks, setFoodTrucks] = useState([]);
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
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
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

  // Function to load menu items from Firestore directly
  const loadMenuItems = async (truckOwnerId) => {
    if (!truckOwnerId) {
      console.log("No truck owner ID provided");
      return;
    }
    
    console.log("🍽️ Loading menu items for truck owner:", truckOwnerId);
    setLoadingMenu(true);
    setMenuItems([]);
    
    try {
      // Query Firestore directly for menu items
      console.log("� Querying Firestore for menu items with ownerId:", truckOwnerId);
      
      const menuItemsRef = collection(db, 'menuItems');
      const menuSnapshot = await getDocs(query(menuItemsRef, where('ownerId', '==', truckOwnerId)));
      
      if (menuSnapshot.empty) {
        console.log("📭 No menu items found in Firestore for this truck owner");
        
        // Fallback: Create sample menu items for testing
        console.log("🔄 Using fallback sample menu items for testing");
        const sampleMenuItems = [
          {
            id: `sample_1_${truckOwnerId}`,
            name: "Classic Burger",
            description: "Juicy beef patty with lettuce, tomato, and our special sauce",
            price: 12.99,
            image: "https://via.placeholder.com/150/FF6B35/FFFFFF?text=Burger",
            category: "Burgers"
          },
          {
            id: `sample_2_${truckOwnerId}`,
            name: "Cheese Fries", 
            description: "Golden crispy fries topped with melted cheddar cheese",
            price: 8.50,
            image: "https://via.placeholder.com/150/4ECDC4/FFFFFF?text=Fries",
            category: "Sides"
          },
          {
            id: `sample_3_${truckOwnerId}`,
            name: "Chicken Tacos",
            description: "Three soft tacos with grilled chicken, salsa, and fresh cilantro",
            price: 10.75,
            image: "https://via.placeholder.com/150/45B7D1/FFFFFF?text=Tacos",
            category: "Mexican"
          },
          {
            id: `sample_4_${truckOwnerId}`,
            name: "Chocolate Shake",
            description: "Rich and creamy chocolate milkshake topped with whipped cream",
            price: 5.99,
            image: "https://via.placeholder.com/150/8E44AD/FFFFFF?text=Shake",
            category: "Beverages"
          }
        ];
        
        setMenuItems(sampleMenuItems);
        console.log("✅ Loaded fallback menu items:", sampleMenuItems.length, "items");
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
        }
        setMenuItems(items);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      setMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  };

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
        'This food truck has not set up payment processing yet. Please try again later or contact the truck owner directly.'
      );
      return;
    }

    try {
      console.log('� Starting Stripe Connect payment process...');
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
        `The food truck owner will receive your order and contact you shortly for pickup!`,
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
              coverUrl: (ownerData.coverUrl || ownerData.coverURL) ? (ownerData.coverUrl || ownerData.coverURL).substring(0, 50) + '...' : 'None',
              menuUrl: ownerData.menuUrl ? 'Yes' : 'No',
              socialCount: [ownerData.instagram, ownerData.facebook, ownerData.twitter, ownerData.tiktok].filter(Boolean).length
            });
            
            // Merge truck location data with complete owner profile data
            trucksWithOwnerData.push({
              ...truckData,
              truckName: ownerData.truckName || ownerData.username || 'Food Truck',
              cuisineType: ownerData.cuisineType || 'Food',
              coverUrl: ownerData.coverUrl || ownerData.coverURL, // Check both case variations
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
      
      if (userPlan === 'pro' || userPlan === 'all-access') {
        console.log('📍 MapScreen: Loaded', pings.length, 'customer pings for heatmap (Pro/All-Access)');
      } else {
        console.log('📍 MapScreen: Loaded', pings.length, 'customer pings for individual markers (Basic)');
      }
      console.log('📍 Sample ping data:', pings.slice(0, 3));
      console.log('📍 ALL ping data for debugging:', pings);
      console.log('📍 User plan for display mode:', userPlan);
      setCustomerPings(pings);
    });

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

        // Special handling for All-Access food truck owners - save to Firebase
        if (userRole === 'owner' && userPlan === 'all-access' && user?.uid && sessionId && ownerData) {
          console.log('🌍 MapScreen: All-Access owner - saving truck location to Firebase');
          try {
            // Save to Firestore as truck location
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
              coverUrl: ownerData.coverUrl || ownerData.coverURL || null, // Check both case variations
            };
            
            await setDoc(truckDocRef, locationData, { merge: true });
            console.log('✅ MapScreen: All-Access owner truck location saved to Firebase');
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

  // Generate map HTML when location, trucks, or pings change
  useEffect(() => {
    const generateHTML = async () => {
      if (!location) {
        setMapHTML('');
        return;
      }
      
      console.log('🗺️ Generating map HTML with processed truck icons...');
      const html = await createMapHTML();
      setMapHTML(html);
    };
    
    generateHTML();
  }, [location, foodTrucks, customerPings, userPlan]);

  // Mock food truck data with heatmap intensity (fallback for development)
  const mockFoodTrucks = [
    { id: 1, name: "Tasty Tacos", lat: 40.7580, lng: -73.9855, status: "open", popularity: 85, type: "mexican", kitchenType: "truck" },
    { id: 2, name: "Burger Paradise", lat: 40.7614, lng: -73.9776, status: "open", popularity: 92, type: "american", kitchenType: "truck" },
    { id: 3, name: "Pizza Express", lat: 40.7505, lng: -73.9934, status: "closed", popularity: 67, type: "italian", kitchenType: "trailer" },
    { id: 4, name: "Sushi Roll", lat: 40.7589, lng: -73.9851, status: "open", popularity: 78, type: "japanese", kitchenType: "truck" },
    { id: 5, name: "BBQ Master", lat: 40.7558, lng: -73.9863, status: "busy", popularity: 95, type: "bbq", kitchenType: "cart" },
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

  const createMapHTML = async () => {
    if (!location) return '';
    
    const userLat = location.coords.latitude;
    const userLng = location.coords.longitude;
    
    // Use real truck data if available, otherwise fallback to mock data
    const trucksToDisplay = foodTrucks.length > 0 ? foodTrucks : mockFoodTrucks;
    
    // Pre-process trucks with base64 images
    console.log('�️ Pre-processing', trucksToDisplay.length, 'truck images...');
    const processedTrucks = await Promise.all(
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
    
    const successCount = processedTrucks.filter(truck => truck.hasCustomIcon).length;
    console.log(`🎯 Successfully processed ${successCount}/${trucksToDisplay.length} truck images`);
    
    // 🔍 DEBUG: Log the processed truck data
    console.log('🗺️ WEBVIEW DEBUG: About to create map with processed truck data:');
    console.log('🗺️ Total trucks to display:', processedTrucks.length);
    processedTrucks.forEach((truck, index) => {
      console.log(`🚛 Truck ${index + 1}:`, {
        name: truck.truckName || truck.name,
        hasCustomIcon: truck.hasCustomIcon,
        iconType: truck.personalizedIcon.type,
        cuisineType: truck.cuisineType
      });
    });
    
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



        ${(userPlan === 'pro' || userPlan === 'all-access') ? `
        <div class="heatmap-controls">
            <div style="font-size: 12px; margin-bottom: 5px;">🔥 Demand Heatmap</div>
            <div style="font-size: 11px; color: #666;">Firebase: ${customerPings.length} pings | Using: REAL DATA</div>
            <div style="font-size: 10px; color: #999; margin-top: 5px;">Plan: ${userPlan} | Live Mode</div>
        </div>
        ` : ''}

        <script>
            // WEBVIEW CONSOLE FORWARDING: Capture all console messages and send to React Native
            const originalConsoleLog = console.log;
            const originalConsoleError = console.error;
            
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

            // Food truck data with pre-processed icons
            const foodTrucks = ${JSON.stringify(processedTrucks)};
            
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
                        console.log('� Final processed URL:', processedUrl);
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
                } else {
                    // Default truck icon
                    return '<div style="background: #2c6f57; ' + baseStyle + '">🚛</div>';
                }
            };

            // Create truck markers with pre-processed personalized icons
            function createTruckMarkers(trucks = foodTrucks) {
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
                    
                    console.log('🚛 Processing truck:', truckName);
                    console.log('🎨 Icon type:', truck.personalizedIcon ? truck.personalizedIcon.type : 'default');
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
                    
                    const truckIcon = L.divIcon({
                        html: iconHtml,
                        iconSize: [55, 55],
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
                                    \${truck.base64CoverImage ? \`<img src="\${truck.base64CoverImage}" class="truck-cover-image" />\` : truck.coverUrl ? \`<img src="\${truck.coverUrl}" class="truck-cover-image" onerror="this.style.display='none'" />\` : ''}
                                    <div class="truck-name">\${truckName}</div>
                                </div>
                                <div class="truck-status \${statusClass}">\${statusEmoji} \${(truck.status || 'OPEN').toUpperCase()}</div>
                                <div class="truck-details">🍽️ \${(truck.cuisineType || truck.type || 'Food').charAt(0).toUpperCase() + (truck.cuisineType || truck.type || 'Food').slice(1)}</div>
                                <div class="truck-details">📱 Kitchen: \${kitchenType.charAt(0).toUpperCase() + kitchenType.slice(1)}</div>
                                \${truck.popularity ? \`<div class="truck-details">⭐ Popularity: \${truck.popularity}%</div>\` : ''}
                                <button class="view-details-btn" onclick="openTruckDetails('\${truck.id}', '\${truckName}', '\${truck.cuisineType || truck.type || 'Food'}', '\${truck.base64CoverImage || truck.coverUrl || ''}', '\${truck.menuUrl || ''}', '\${truck.instagram || ''}', '\${truck.facebook || ''}', '\${truck.twitter || ''}', '\${truck.tiktok || ''}')">
                                    📋 View Full Details
                                </button>
                            </div>
                        \`);
                    
                    truckMarkers.push(marker);
                    console.log('✅ Added marker for:', truckName, 'with icon type:', truck.personalizedIcon ? truck.personalizedIcon.type : 'default');
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
                console.log('📋 Basic plan user - showing individual ping markers');
                
                // Add individual ping markers for basic users
                const realPings = ${JSON.stringify(customerPings)};
                console.log('📍 Adding', realPings.length, 'individual ping markers for basic user');
                
                realPings.forEach((ping, index) => {
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
                        console.log('📍 Added ping marker', index + 1, 'at', ping.lat, ping.lng);
                    }
                });
                
                console.log('✅ Finished adding individual ping markers for basic user');
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
  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      // Forward WebView console messages to React Native console
      if (message.type === 'CONSOLE_LOG') {
        const prefix = message.level === 'ERROR' ? '🔴 WEBVIEW ERROR:' : '🟦 WEBVIEW:';
        console.log(`${prefix} ${message.message}`);
        return;
      }
      
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
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image 
          source={require('../../assets/grubana-logo-tshirt.png')} 
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>
      
      <WebView
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
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                🚚 {selectedTruck?.name || 'Food Truck'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {selectedTruck?.cuisine} Cuisine
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.cartButton}
              onPress={() => {
                console.log('🛒 Cart button pressed! Current cart items:', cart.length);
                console.log('🛒 Current showCartModal state:', showCartModal);
                setShowCartModal(true);
                console.log('🛒 Set showCartModal to true');
                
                // Test with Alert as backup
                setTimeout(() => {
                  console.log('🛒 showCartModal state after setState:', showCartModal);
                  if (!showCartModal) {
                    Alert.alert('Modal Debug', 'Modal state might not be updating properly');
                  }
                }, 100);
              }}
            >
              <Ionicons name="cart" size={20} color="#fff" />
              {getTotalItems() > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
                </View>
              )}
            </TouchableOpacity>
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
                        <TouchableOpacity 
                          style={styles.addToCartButton}
                          onPress={() => addToCart({ ...item, id: item.id || `item_${index}` })}
                        >
                          <Ionicons name="add-circle" size={16} color="#fff" />
                          <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                        </TouchableOpacity>
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

      {/* Shopping Cart Overlay - Working Cart with Checkout */}
      {console.log('🛒 RENDER CHECK: showCartModal =', showCartModal)}

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
    padding: 20,
    paddingTop: 60,
    paddingRight: 70,
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
  
  // Cart-related styles
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  cartButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 20,
    padding: 8,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#000000',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  cartBadgeText: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: 'bold',
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
});
