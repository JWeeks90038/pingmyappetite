@echo off
echo 🚀 Mobile App - Direct Start
echo ============================

echo Changing to mobile directory...
cd /d "E:\ping-my-appetite\grubana-mobile"
echo Current directory: %CD%

echo Starting Expo from mobile directory only...
npx expo start --tunnel

pause
