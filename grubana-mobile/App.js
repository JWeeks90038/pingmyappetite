import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthContextProvider, useAuth } from './src/components/AuthContext';

// Import screens
import LoginScreen from './src/screens/LoginScreen.js';
import SignupSelectionScreen from './src/screens/SignupSelectionScreen.js';
import CustomerSignupScreen from './src/screens/CustomerSignupScreen.js';
import OwnerSignupScreen from './src/screens/OwnerSignupScreen.js';
import EventOrganizerSignupScreen from './src/screens/EventOrganizerSignupScreen.js';
import PaymentScreen from './src/screens/PaymentScreen.js';
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
      <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
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
          } else if (route.name === 'Events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Ping') {
            iconName = focused ? 'radio' : 'radio-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2c6f57',
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
        tabBarActiveTintColor: '#2c6f57',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Event Dashboard' }}
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

// Main App Tabs - Food Truck Owner Version
function OwnerTabs() {
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
        tabBarActiveTintColor: '#2c6f57',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Dashboard' }}
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
  const { userRole } = useAuth();
  
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
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {user ? <MainStackNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  // Use the same Stripe publishable key from your web app
  const stripePublishableKey = 'pk_live_51RSgWMRsRfaVTYCjJJtygE6gtMfcv5Gi0EIK4GGB2IefhoK4gVgf6NxwQSXgJbc8zu1VskfzN3ghavd3awwRafXk00FjrvGznT';
  
  return (
    <StripeProvider publishableKey={stripePublishableKey}>
      <AuthContextProvider>
        <AppContent />
      </AuthContextProvider>
    </StripeProvider>
  );
}
