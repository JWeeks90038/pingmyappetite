import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase';

// Import screens
import LoginScreen from './src/screens/LoginScreen.js';
import SignupSelectionScreen from './src/screens/SignupSelectionScreen.js';
import CustomerSignupScreen from './src/screens/CustomerSignupScreen.js';
import OwnerSignupScreen from './src/screens/OwnerSignupScreen.js';
import PaymentScreen from './src/screens/PaymentScreen.js';
import HomeScreen from './src/screens/HomeScreen.js';
import MapScreen from './src/screens/MapScreen.js';
import ProfileScreen from './src/screens/ProfileScreen.js';
import PingScreen from './src/screens/PingScreen.js';
import AnalyticsScreen from './src/screens/AnalyticsScreen.js';
import MenuManagementScreen from './src/screens/MenuManagementScreen.js';
import LocationManagementScreen from './src/screens/LocationManagementScreen.js';

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
        options={{ title: 'Live Trucks' }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ title: 'Map' }}
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
function MainStackNavigator({ userRole }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {() => userRole === 'owner' ? <OwnerTabs /> : <CustomerTabs />}
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
    </Stack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          setUserRole(userData?.role || 'customer');
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('customer'); // Default to customer
        }
      } else {
        setUserRole(null);
      }
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const renderMainApp = () => {
    return <MainStackNavigator userRole={userRole} />;
  };

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {user ? renderMainApp() : <AuthStack />}
    </NavigationContainer>
  );
}
