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

// Remove console statements and debugging in production
if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
    output: {
      comments: false,
    },
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
  };
}

module.exports = config;
