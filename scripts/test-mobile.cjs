#!/usr/bin/env node

/**
 * Mobile App Test Script
 * This script helps you test the mobile app with event functionality
 */

const { execSync } = require('child_process');
const path = require('path');

const MOBILE_DIR = path.join(__dirname, 'grubana-mobile');



try {
  // Change to mobile directory
  process.chdir(MOBILE_DIR);


  // Check if package.json exists
  const fs = require('fs');
  if (!fs.existsSync('package.json')) {
    throw new Error('package.json not found in mobile directory');
  }

  execSync('npm install', { stdio: 'inherit' });


  try {
    execSync('npx expo --version', { stdio: 'inherit' });
  } catch (error) {

    execSync('npm install -g @expo/cli', { stdio: 'inherit' });
  }




} catch (error) {

  process.exit(1);
}
