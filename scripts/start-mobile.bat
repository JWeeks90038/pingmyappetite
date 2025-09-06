@echo off
echo 🚀 Starting Mobile App Testing
echo ================================

cd /d "E:\ping-my-appetite\grubana-mobile"

echo 📁 Current directory: %CD%

echo 📦 Checking mobile app setup...
if not exist package.json (
    echo ❌ package.json not found in mobile directory
    pause
    exit /b 1
)

echo 🔧 Installing/updating dependencies...
call npm install

echo 📱 Starting Expo development server...
echo.
echo 📋 Instructions:
echo 1. Download "Expo Go" app on your phone
echo 2. Scan the QR code that appears
echo 3. Test the event markers and modal functionality
echo.

call npx expo start

pause
