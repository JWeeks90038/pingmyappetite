import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import CustomerDashboardScreen from '../screens/CustomerDashboardScreen';
import OwnerDashboardScreen from '../screens/OwnerDashboardScreen';
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

// Owner Tab Navigator
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
  console.log('🔍 AppNavigator Render:', {
    timestamp: new Date().toISOString(),
    hasUser: !!user,
    userId: user?.uid,
    userRole,
    hasUserData: !!userData,
    userData: userData ? {
      plan: userData.plan,
      subscriptionStatus: userData.subscriptionStatus,
      role: userData.role,
      uid: userData.uid
    } : null
  });

  if (!user) {
    console.log('🔍 No user - showing AuthStack');
    return <AuthStack />;
  }

  if (!userData) {
    console.log('🔍 User exists but no userData yet - showing AuthStack while loading');
    return <AuthStack />;
  }

  // CRITICAL SECURITY CHECK: Users with paid plans MUST complete payment
  // Check if user needs to complete payment
  const needsPayment = userData && 
    (userData.plan === 'pro' || userData.plan === 'all-access' || userData.plan === 'event-premium') && 
    (userData.subscriptionStatus === 'pending' || !userData.subscriptionStatus || userData.paymentCompleted !== true);

  console.log('🔍 Payment Check:', {
    needsPayment,
    plan: userData?.plan,
    subscriptionStatus: userData?.subscriptionStatus,
    paymentCompleted: userData?.paymentCompleted,
    condition1: userData?.plan === 'pro' || userData?.plan === 'all-access' || userData?.plan === 'event-premium',
    condition2: userData?.subscriptionStatus === 'pending' || !userData?.subscriptionStatus || userData?.paymentCompleted !== true,
    bothConditions: (userData?.plan === 'pro' || userData?.plan === 'all-access' || userData?.plan === 'event-premium') && (userData?.subscriptionStatus === 'pending' || !userData?.subscriptionStatus || userData?.paymentCompleted !== true)
  });

  // Additional security check - if user has a paid plan but no active subscription, force payment
  const hasPaidPlan = userData?.plan === 'pro' || userData?.plan === 'all-access' || userData?.plan === 'event-premium';
  
  // CRITICAL SECURITY FIX: Users must complete payment BEFORE accessing any paid features
  // Trial status is ONLY valid if payment was successfully completed first
  const hasCompletedPayment = userData?.paymentCompleted === true;
  const hasActiveOrTrialSubscription = userData?.subscriptionStatus === 'active' || userData?.subscriptionStatus === 'trialing';
  
  // ULTRA-STRICT ENFORCEMENT: Both payment completion AND subscription status required
  // Users cannot access features with trial status if payment failed
  const shouldForcePayment = hasPaidPlan && (!hasCompletedPayment || !hasActiveOrTrialSubscription);
  
  // ADDITIONAL SECURITY: Block trialing status without payment completion
  const hasTrialWithoutPayment = userData?.subscriptionStatus === 'trialing' && userData?.paymentCompleted !== true;
  
  console.log('🔒 ULTRA-STRICT Security Check:', {
    hasPaidPlan,
    hasCompletedPayment,
    hasActiveOrTrialSubscription,
    hasTrialWithoutPayment,
    shouldForcePayment: shouldForcePayment || hasTrialWithoutPayment,
    subscriptionStatus: userData?.subscriptionStatus,
    paymentCompleted: userData?.paymentCompleted,
    SECURITY_RULE: 'Payment completion required BEFORE any access',
    ENFORCING_PAYMENT: shouldForcePayment || hasTrialWithoutPayment
  });

  // If user needs payment, show payment in a stack
  if (needsPayment || shouldForcePayment || hasTrialWithoutPayment) {
    console.log('🚨 CHECKOUT REQUIRED - Access Denied:', {
      plan: userData?.plan,
      subscriptionStatus: userData?.subscriptionStatus,
      paymentCompleted: userData?.paymentCompleted,
      reason: needsPayment ? 'needsPayment' : 'shouldForcePayment',
      securityLevel: 'STRICT - Payment before trial access'
    });
    
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
    console.log('🚨 EVENT PREMIUM PAYMENT REQUIRED - Explicit Block:', {
      plan: userData.plan,
      paymentCompleted: userData.paymentCompleted,
      subscriptionStatus: userData.subscriptionStatus
    });
    
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
  console.log('🔍 Final Navigation Decision:', {
    userRole: userRole === 'owner' ? 'OwnerTabs' : userRole === 'event-organizer' ? 'OwnerTabs' : 'CustomerTabs',
    plan: userData?.plan,
    subscriptionStatus: userData?.subscriptionStatus,
    paymentCompleted: userData?.paymentCompleted
  });

  // FINAL SECURITY CHECK: Block any event-premium users without COMPLETED payment
  // Even trialing status requires payment completion first
  if (userData?.plan === 'event-premium' && userData?.paymentCompleted !== true) {
    console.log('🚨 FINAL SECURITY BLOCK: Event Premium user without completed payment detected', {
      subscriptionStatus: userData?.subscriptionStatus,
      paymentCompleted: userData?.paymentCompleted,
      BLOCKING_REASON: 'Payment not completed regardless of subscription status'
    });
    
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
