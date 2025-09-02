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
import PaymentScreen from '../screens/PaymentScreen';
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
        name="Payment" 
        component={PaymentScreen}
        options={{ title: 'Complete Payment' }}
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

  // Check if user needs to complete payment
  const needsPayment = userData && 
    (userData.plan === 'pro' || userData.plan === 'all-access') && 
    (userData.subscriptionStatus === 'pending' || !userData.subscriptionStatus);

  console.log('🔍 Payment Check:', {
    needsPayment,
    plan: userData?.plan,
    subscriptionStatus: userData?.subscriptionStatus,
    condition1: userData?.plan === 'pro' || userData?.plan === 'all-access',
    condition2: userData?.subscriptionStatus === 'pending' || !userData?.subscriptionStatus,
    bothConditions: (userData?.plan === 'pro' || userData?.plan === 'all-access') && (userData?.subscriptionStatus === 'pending' || !userData?.subscriptionStatus)
  });

  // If user needs payment, show payment in a stack
  if (needsPayment) {
    console.log('🎯 Showing Payment Screen for:', userData?.plan);
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
          name="Payment" 
          component={PaymentScreen}
          options={{ 
            title: 'Complete Payment',
            headerLeft: null, // Prevent going back
          }}
          initialParams={{
            plan: userData.plan,
            hasValidReferral: userData.hasValidReferral,
            referralCode: userData.referralCode,
            userId: user.uid
          }}
        />
      </Stack.Navigator>
    );
  }

  // Return different navigators based on user role
  console.log('🔍 Navigating to:', userRole === 'owner' ? 'OwnerTabs' : 'CustomerTabs');
  if (userRole === 'owner') {
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
