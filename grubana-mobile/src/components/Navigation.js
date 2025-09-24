import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import CustomerDashboardScreen from '../screens/CustomerDashboardScreen';
import OwnerDashboardScreen from '../screens/OwnerDashboardScreen';
import EventsScreen from '../screens/EventsScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OwnerSignupScreen from '../screens/OwnerSignupScreen';
import CustomerSignupScreen from '../screens/CustomerSignupScreen';
import SecureCheckoutScreen from '../screens/SecureCheckoutScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Import AuthContext
import { useAuth } from './AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Customer Tab Navigator
const CustomerTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Dashboard') {
            iconName = focused ? 'location' : 'location-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2c6f57',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#2c6f57',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Grubana' }}
      />
      <Tab.Screen 
        name="Dashboard" 
        component={CustomerDashboardScreen}
        options={{ title: 'Send Pings' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

// Owner Tab Navigator - Updated to include Events
const OwnerTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Dashboard') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2c6f57',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#2c6f57',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Grubana' }}
      />
      <Tab.Screen 
        name="Dashboard" 
        component={OwnerDashboardScreen}
        options={{ title: 'Truck Dashboard' }}
      />
      <Tab.Screen 
        name="Events" 
        component={EventsScreen}
        options={{ title: 'My Events' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

// Auth Stack Navigator
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2c6f57',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ title: 'Welcome to Grubana' }}
      />
      <Stack.Screen 
        name="Signup" 
        component={SignupScreen}
        options={{ title: 'Create Account' }}
      />
      <Stack.Screen 
        name="OwnerSignup" 
        component={OwnerSignupScreen}
        options={{ title: 'Mobile Kitchen Business Signup' }}
      />
      <Stack.Screen 
        name="CustomerSignup" 
        component={CustomerSignupScreen}
        options={{ title: 'Customer Signup' }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={SecureCheckoutScreen}
        options={{ title: 'Secure Checkout' }}
      />
    </Stack.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { user, userRole, userData } = useAuth();

  // Enhanced debug logging
  if (!user) {
        return <AuthStack />;
  }

  if (!userData) {
        return <AuthStack />;
  }

  // Commission-based model - no subscription payment required
  const needsPayment = false;
  const hasPaidPlan = false;
  
  // All users have access to features with commission-based model
  const hasCompletedPayment = true;
  const hasActiveOrTrialSubscription = true;
  
  // ULTRA-STRICT ENFORCEMENT: Both payment completion AND subscription status required
  // Users cannot access features with trial status if payment failed
  const shouldForcePayment = hasPaidPlan && (!hasCompletedPayment || !hasActiveOrTrialSubscription);
  
  // ADDITIONAL SECURITY: Block trialing status without payment completion
  const hasTrialWithoutPayment = userData?.subscriptionStatus === 'trialing' && userData?.paymentCompleted !== true;
  
    // If user needs payment, show payment in a stack
  if (needsPayment || shouldForcePayment || hasTrialWithoutPayment) {
        return (
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2c6f57',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            gestureEnabled: false, // Completely disable all gestures
            headerLeft: null, // Remove all back buttons
            headerBackVisible: false, // Hide back button
          }}
        >
          <Stack.Screen 
            name="Checkout" 
            component={SecureCheckoutScreen}
            options={{ 
              title: 'Secure Checkout',
              headerLeft: null, // Prevent going back
              gestureEnabled: false, // Disable swipe to go back
              headerBackTitleVisible: false,
              headerBackVisible: false,
              presentation: 'card', // Fullscreen presentation
              cardOverlayEnabled: false, // Prevent background interaction
              cardStyle: { backgroundColor: '#fff' }, // Ensure fullscreen coverage
              animationEnabled: false, // Prevent animation glitches
              headerRight: null, // Remove any header buttons
            }}
            initialParams={{
              plan: userData.plan,
              hasValidReferral: userData.hasValidReferral,
              referralCode: userData.referralCode,
              userId: user.uid,
              securityEnforced: true
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // ADDITIONAL SAFETY CHECK: Explicit event-premium payment enforcement
  if (userData?.plan === 'event-premium' && userData?.paymentCompleted !== true) {
        return (
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2c6f57',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            gestureEnabled: false,
            headerLeft: null,
            headerBackVisible: false,
          }}
        >
          <Stack.Screen 
            name="Checkout" 
            component={SecureCheckoutScreen}
            options={{ 
              title: 'Payment Required',
              headerLeft: null,
              gestureEnabled: false,
              headerBackTitleVisible: false,
              headerBackVisible: false,
              presentation: 'card',
              cardOverlayEnabled: false,
              cardStyle: { backgroundColor: '#fff' },
              animationEnabled: false,
              headerRight: null,
            }}
            initialParams={{
              plan: userData.plan,
              hasValidReferral: userData.hasValidReferral,
              referralCode: userData.referralCode,
              userId: user.uid,
              securityEnforced: true
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Return different navigators based on user role
    // FINAL SECURITY CHECK: Block any event-premium users without COMPLETED payment
  // Even trialing status requires payment completion first
  if (userData?.plan === 'event-premium' && userData?.paymentCompleted !== true) {
        return (
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#2c6f57' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            gestureEnabled: false,
            headerLeft: null,
            headerBackVisible: false,
          }}
        >
          <Stack.Screen 
            name="Checkout" 
            component={SecureCheckoutScreen}
            options={{ 
              title: 'Payment Required',
              headerLeft: null,
              gestureEnabled: false,
              headerBackTitleVisible: false,
              headerBackVisible: false,
              presentation: 'card',
              cardOverlayEnabled: false,
              cardStyle: { backgroundColor: '#fff' },
              animationEnabled: false,
              headerRight: null,
            }}
            initialParams={{
              plan: userData.plan,
              hasValidReferral: userData.hasValidReferral,
              referralCode: userData.referralCode,
              userId: user.uid,
              securityEnforced: true
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  if (userRole === 'owner' || userRole === 'event-organizer') {
    return <OwnerTabs />;
  } else {
    return <CustomerTabs />;
  }
};

export default function Navigation() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
