import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthContextProvider, useAuth } from './src/components/AuthContext';
import { ThemeProvider } from './src/theme/ThemeContext';
import theme from './src/theme/colors';
import NotificationService from './src/services/notificationService';

// Import screens
import LoginScreen from './src/screens/LoginScreen.js';
import SignupSelectionScreen from './src/screens/SignupSelectionScreen.js';
import CustomerSignupScreen from './src/screens/CustomerSignupScreen.js';
import OwnerSignupScreen from './src/screens/OwnerSignupScreen.js';
import EventOrganizerSignupScreen from './src/screens/EventOrganizerSignupScreen.js';
import SecureCheckoutScreen from './src/screens/SecureCheckoutScreen.js';
import HomeScreen from './src/screens/HomeScreen.js';
import MapScreen from './src/screens/MapScreen.js';
import CustomerDashboardScreen from './src/screens/CustomerDashboardScreen.js';
import ProfileScreen from './src/screens/ProfileScreen.js';
import PingScreen from './src/screens/PingScreen.js';
import AnalyticsScreen from './src/screens/AnalyticsScreenFresh.js';
import EventsScreen from './src/screens/EventsScreen.js';
import MenuManagementScreen from './src/screens/MenuManagementScreen.js';
import LocationManagementScreen from './src/screens/LocationManagementScreen.js';
import TruckOnboardingScreen from './src/screens/TruckOnboardingScreen.js';
import OrderManagementScreen from './src/screens/OrderManagementScreen.js';
import CustomerOrdersScreen from './src/screens/CustomerOrdersScreen.js';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Deep linking configuration
const linking = {
  prefixes: [
    'grubana://', // Custom scheme for development
    'https://grubana.com/app', // Universal Links for production
    'https://grubana.com/stripe-redirect' // Stripe completion Universal Links
  ],
  config: {
    screens: {
      MainTabs: {
        screens: {
          CustomerProfile: 'profile',
          OwnerProfile: 'profile',
          EventOrganizerProfile: 'profile',
        },
      },
      TruckOnboarding: {
        path: 'stripe-onboarding',
        parse: {
          complete: (complete) => complete === 'true',
          refresh: (refresh) => refresh === 'true',
        },
      },
      StripeComplete: {
        path: 'stripe-redirect/complete',
        parse: {
          complete: () => true,
        },
      },
      StripeRefresh: {
        path: 'stripe-redirect/refresh', 
        parse: {
          refresh: () => true,
        },
      },
    },
  },
  // Handle deep link events
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    return url;
  },
  subscribe(listener) {
    // Listen for incoming deep links when app is already open
    const onReceiveURL = ({ url }) => listener(url);
    
    // Use the new Linking.addEventListener that returns a subscription object
    const subscription = Linking.addEventListener('url', onReceiveURL);
    
    return () => {
      // Use the subscription's remove method
      if (subscription && subscription.remove) {
        subscription.remove();
      }
    };
  },
};

// Auth Stack for login/register
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignupSelection" component={SignupSelectionScreen} />
      <Stack.Screen name="CustomerSignup" component={CustomerSignupScreen} />
      <Stack.Screen name="OwnerSignup" component={OwnerSignupScreen} />
      <Stack.Screen name="EventOrganizerSignup" component={EventOrganizerSignupScreen} />
      <Stack.Screen name="SecureCheckoutScreen" component={SecureCheckoutScreen} />
    </Stack.Navigator>
  );
}

// Guest Navigation - Browse without authentication
function GuestTabs() {
  const safeTheme = theme?.colors ? theme : {
    colors: {
      accent: { pink: '#FF4EC9' },
      text: { secondary: '#B0B3C2' },
      background: { secondary: '#1A1036' },
      border: '#2A2A3A'
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'GuestBrowse') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'GuestMap') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'GuestEvents') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'GuestLogin') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: safeTheme.colors.accent.pink,
        tabBarInactiveTintColor: safeTheme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: safeTheme.colors.background.secondary,
          borderTopColor: safeTheme.colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="GuestBrowse" 
        component={HomeScreen}
        options={{ title: 'Browse' }}
      />
      <Tab.Screen 
        name="GuestMap" 
        component={MapScreen}
        options={{ title: 'Map' }}
      />
      <Tab.Screen 
        name="GuestEvents" 
        component={EventsScreen}
        options={{ title: 'Events' }}
      />
      <Tab.Screen 
        name="GuestLogin" 
        component={AuthStack}
        options={{ title: 'Sign In' }}
      />
    </Tab.Navigator>
  );
}

// Main App Tabs - Customer Version
function CustomerTabs() {
  // Defensive check for theme structure
  const safeTheme = theme?.colors ? theme : {
    colors: {
      accent: { pink: '#FF4EC9' },
      text: { secondary: '#B0B3C2' },
      background: { secondary: '#1A1036' },
      border: '#2A2A3A'
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'CustomerHome') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'CustomerMap') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'CustomerOrders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'CustomerEvents') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'CustomerPing') {
            iconName = focused ? 'radio' : 'radio-outline';
          } else if (route.name === 'CustomerProfile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: safeTheme.colors.accent.pink,
        tabBarInactiveTintColor: safeTheme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: safeTheme.colors.background.secondary,
          borderTopColor: safeTheme.colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="CustomerHome" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="CustomerMap" 
        component={MapScreen}
        options={{ title: 'Map' }}
      />
      <Tab.Screen 
        name="CustomerOrders" 
        component={CustomerOrdersScreen}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen 
        name="CustomerEvents" 
        component={EventsScreen}
        options={{ title: 'Events' }}
      />
      <Tab.Screen 
        name="CustomerPing" 
        component={PingScreen}
        options={{ title: 'Send Ping' }}
      />
      <Tab.Screen 
        name="CustomerProfile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Main App Tabs - Event Organizer Version
function EventOrganizerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'EventOrganizerHome') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'EventOrganizerMap') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'EventOrganizerEvents') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'EventOrganizerAnalytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'EventOrganizerProfile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF4EC9',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="EventOrganizerHome" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="EventOrganizerMap" 
        component={MapScreen}
        options={{ title: 'Map' }}
      />
      <Tab.Screen 
        name="EventOrganizerEvents" 
        component={EventsScreen}
        options={{ title: 'My Events' }}
      />
      <Tab.Screen 
        name="EventOrganizerAnalytics" 
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen 
        name="EventOrganizerProfile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Main App Tabs - Mobile Kitchen Business Owner Version
function OwnerTabs() {
  // Defensive check for theme structure
  const safeTheme = theme?.colors ? theme : {
    colors: {
      accent: { pink: '#FF4EC9' },
      text: { secondary: '#B0B3C2' },
      background: { secondary: '#1A1036' },
      border: '#2A2A3A'
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'OwnerHome') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'OwnerOrders') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'OwnerMap') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'OwnerEvents') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'OwnerAnalytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'OwnerProfile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: safeTheme.colors.accent.pink,
        tabBarInactiveTintColor: safeTheme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: safeTheme.colors.background.secondary,
          borderTopColor: safeTheme.colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="OwnerHome" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="OwnerOrders" 
        component={OrderManagementScreen}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen 
        name="OwnerMap" 
        component={MapScreen}
        options={{ title: 'Map' }}
      />
      <Tab.Screen 
        name="OwnerEvents" 
        component={EventsScreen}
        options={{ title: 'Events' }}
      />
      <Tab.Screen 
        name="OwnerAnalytics" 
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen 
        name="OwnerProfile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Main Stack Navigator that contains tabs and business tool screens
function MainStackNavigator() {
  const { userRole, userData } = useAuth();
  
  // Function to determine which tab navigator to show based on user role
  const getTabNavigator = () => {

    
    switch (userRole) {
      case 'owner':

        return <OwnerTabs />;
      case 'event-organizer':
     
        return <EventOrganizerTabs />;
      case 'customer':
      default:

        return <CustomerTabs />;
    }
  };
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {() => getTabNavigator()}
      </Stack.Screen>
      <Stack.Screen 
        name="MenuManagement" 
        component={MenuManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="LocationManagement" 
        component={LocationManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TruckOnboarding" 
        component={TruckOnboardingScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Inner app component that uses auth context
function AppContent() {
  const { user, loading, userData } = useAuth();
  const notificationsInitialized = useRef(false);

  // Initialize notifications when user is authenticated
  useEffect(() => {
    if (user && userData && userData.uid && !notificationsInitialized.current) {

      
      // Clear badge count when app opens
      NotificationService.clearBadgeCount();
      
      NotificationService.initialize(userData.uid)
        .then((success) => {
          if (success) {
   
            notificationsInitialized.current = true;
          } else {

          }
        })
        .catch((error) => {
  
        });
    }

    // Cleanup notifications when component unmounts or user changes
    return () => {
      if (!user) {
 
        NotificationService.cleanup();
        notificationsInitialized.current = false;
      }
    };
  }, [user?.uid]); // Only depend on user ID, not the entire userData object



  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Payment completion check removed - using commission-based model
  const needsPayment = false;



  if (needsPayment) {
    const safeTheme = theme?.colors ? theme : {
      colors: {
        accent: { pink: '#FF4EC9', blue: '#4DBFFF' },
        background: { primary: '#0B0B1A', secondary: '#1A1036' },
        text: { primary: '#FFFFFF' },
        border: '#2A2A3A'
      }
    };

    const navigationTheme = {
      dark: true,
      colors: {
        primary: safeTheme.colors.accent.pink,
        background: safeTheme.colors.background.primary,
        card: safeTheme.colors.background.secondary,
        text: safeTheme.colors.text.primary,
        border: safeTheme.colors.border,
        notification: safeTheme.colors.accent.blue,
      },
    };

    return (
      <NavigationContainer
        linking={linking}
        theme={navigationTheme}
      >
        <StatusBar style="light" backgroundColor={safeTheme.colors.background.primary} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen 
            name="SecureCheckoutScreen" 
            component={SecureCheckoutScreen}
            initialParams={{
              plan: userData.plan,
              hasValidReferral: userData.hasValidReferral,
              referralCode: userData.referralCode,
              userId: user.uid
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  const safeTheme = theme?.colors ? theme : {
    colors: {
      accent: { pink: '#FF4EC9', blue: '#4DBFFF' },
      background: { primary: '#0B0B1A', secondary: '#1A1036' },
      text: { primary: '#FFFFFF' },
      border: '#2A2A3A'
    }
  };

  const navigationTheme = {
    dark: true,
    colors: {
      primary: safeTheme.colors.accent.pink,
      background: safeTheme.colors.background.primary,
      card: safeTheme.colors.background.secondary,
      text: safeTheme.colors.text.primary,
      border: safeTheme.colors.border,
      notification: safeTheme.colors.accent.blue,
    },
  };

  return (
    <NavigationContainer
      linking={linking}
      theme={navigationTheme}
    >
      <StatusBar style="light" backgroundColor={safeTheme.colors.background.primary} />
      {user ? <MainStackNavigator /> : <GuestTabs />}
    </NavigationContainer>
  );
}

export default function App() {
  // Use environment variable for Stripe publishable key with fallback
  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_live_51RSgWMRsRfaVTYCjJJtygE6gtMfcv5Gi0EIK4GGB2IefhoK4gVgf6NxwQSXgJbc8zu1VskfzN3ghavd3awwRafXk00FjrvGznT';
  

  
  const stripeConfig = {
    publishableKey: stripePublishableKey,
    merchantIdentifier: 'merchant.com.pingmyappetite.grubana',
    urlScheme: 'grubana',
    setReturnUrlSchemeOnAndroid: true,
  };

  return (
    <StripeProvider {...stripeConfig}>
      <ThemeProvider>
        <AuthContextProvider>
          <AppContent />
        </AuthContextProvider>
      </ThemeProvider>
    </StripeProvider>
  );
}
