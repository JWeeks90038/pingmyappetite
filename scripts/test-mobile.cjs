#!/usr/bin/env node

/**
 * Mobile App Test Script
 * This script helps you test the mobile app with event functionality
 */

const { execSync } = require('child_process');
const path = require('path');

const MOBILE_DIR = path.join(__dirname, 'grubana-mobile');

console.log('🚀 Mobile App Test Script');
console.log('========================');

try {
  // Change to mobile directory
  process.chdir(MOBILE_DIR);
  console.log('📁 Changed to mobile directory:', MOBILE_DIR);

  // Check if package.json exists
  const fs = require('fs');
  if (!fs.existsSync('package.json')) {
    throw new Error('package.json not found in mobile directory');
  }

  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('🔧 Checking Expo CLI...');
  try {
    execSync('npx expo --version', { stdio: 'inherit' });
  } catch (error) {
    console.log('📱 Installing Expo CLI...');
    execSync('npm install -g @expo/cli', { stdio: 'inherit' });
  }

  console.log('✅ Setup complete!');
  console.log('');
  console.log('🎯 To test the mobile app:');
  console.log('1. Run: cd grubana-mobile');
  console.log('2. Run: npx expo start');
  console.log('3. Use Expo Go app to scan QR code');
  console.log('');
  console.log('🔍 Features to test:');
  console.log('- Event markers on map (circular with organization logos)');
  console.log('- Event modal when tapping markers');
  console.log('- Event status colors (blue/orange/green borders)');
  console.log('- Food truck markers');
  console.log('- Location permissions');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
