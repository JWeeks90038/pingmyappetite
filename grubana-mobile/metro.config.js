// metro.config.js for grubana-mobile
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro only looks in the mobile app directory
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Exclude parent directory node_modules to prevent conflicts
config.resolver.blockList = [
  /.*\/node_modules\/react-native\/.*/,
  /.*\/node_modules\/@react-native\/.*/
];

module.exports = config;
