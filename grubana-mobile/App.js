import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
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

// Main App Tabs - Customer Version
function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Ping') {
            iconName = focused ? 'radio' : 'radio-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.accent.pink,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background.secondary,
          borderTopColor: theme.colors.border,
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
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ title: 'Map' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={CustomerOrdersScreen}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen 
        name="Events" 
        component={EventsScreen}
        options={{ title: 'Events' }}
      />
      <Tab.Screen 
        name="Ping" 
        component={PingScreen}
        options={{ title: 'Send Ping' }}
      />
      <Tab.Screen 
        name="Profile" 
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

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Profile') {
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
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ title: 'Map' }}
      />
      <Tab.Screen 
        name="Events" 
        component={EventsScreen}
        options={{ title: 'My Events' }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Main App Tabs - Mobile Kitchen Business Owner Version
function OwnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.accent.pink,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background.secondary,
          borderTopColor: theme.colors.border,
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
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrderManagementScreen}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ title: 'Map' }}
      />
      <Tab.Screen 
        name="Events" 
        component={EventsScreen}
        options={{ title: 'Events' }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen 
        name="Profile" 
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

  // Check if user needs to complete payment
  // CRITICAL SECURITY: All paid plan users must have paymentCompleted = true
  // Subscription status alone is not sufficient (can be set by failed payments)
  const needsPayment = user && userData && 
    !(userData.role === 'event-organizer' && userData.plan === 'event-basic') &&
    (userData.plan === 'pro' || userData.plan === 'all-access' || 
     userData.plan === 'event-premium') && 
    (userData.paymentCompleted !== true);



  if (needsPayment) {

    return (
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: theme.colors.accent.pink,
            background: theme.colors.background.primary,
            card: theme.colors.background.secondary,
            text: theme.colors.text.primary,
            border: theme.colors.border,
            notification: theme.colors.accent.blue,
          },
        }}
      >
        <StatusBar style="light" backgroundColor={theme.colors.background.primary} />
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

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: theme.colors.accent.pink,
          background: theme.colors.background.primary,
          card: theme.colors.background.secondary,
          text: theme.colors.text.primary,
          border: theme.colors.border,
          notification: theme.colors.accent.blue,
        },
      }}
    >
      <StatusBar style="light" backgroundColor={theme.colors.background.primary} />
      {user ? <MainStackNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  // Use the same Stripe publishable key from your web app
  const stripePublishableKey = 'pk_live_51RSgWMRsRfaVTYCjJJtygE6gtMfcv5Gi0EIK4GGB2IefhoK4gVgf6NxwQSXgJbc8zu1VskfzN3ghavd3awwRafXk00FjrvGznT';
  
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
