import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthContextProvider } from './src/components/AuthContext';
import Navigation from './src/components/Navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthContextProvider>
        <Navigation />
        <StatusBar style="light" />
      </AuthContextProvider>
    </SafeAreaProvider>
  );
}
