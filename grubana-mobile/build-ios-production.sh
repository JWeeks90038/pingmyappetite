#!/bin/bash
# Production iOS Build Script for Grubana Mobile

echo "🚀 Starting production iOS build for Grubana..."

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Set production environment
export NODE_ENV=production

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install

# Clear any previous builds and cache
echo "🧹 Clearing cache..."
npx expo r -c
rm -rf .expo
rm -rf node_modules/.cache

# Verify EAS CLI is installed and up to date
echo "🔧 Checking EAS CLI..."
npx eas-cli@latest --version

# Login to EAS (if not already logged in)
echo "🔐 Verifying EAS authentication..."
npx eas whoami

# Build for production (App Store)
echo "🏗️ Building production iOS .ipa for App Store..."
npx eas build --platform ios --profile production --clear-cache

echo "✅ Production build initiated!"
echo "📱 Monitor build progress at: https://expo.dev/accounts/[your-account]/projects/grubana-mobile/builds"
echo "⬇️ Download your .ipa when complete and upload to App Store Connect"
