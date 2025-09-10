// metro.config.js for grubana-mobile
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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
