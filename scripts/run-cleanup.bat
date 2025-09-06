@echo off
echo.
echo ===================================================
echo     Ping My Appetite - Firebase Database Cleanup
echo ===================================================
echo.
echo This script will clean up your Firebase database by removing:
echo  - Truck locations for deleted users
echo  - Truck data for deleted users
echo  - Menu items for deleted users
echo.
echo Make sure you have:
echo  1. Installed all dependencies (firebase, firebase-admin)
echo  2. Have serviceAccountKey.json in this directory
echo.
echo Press any key to continue or CTRL+C to cancel...
pause > nul

echo.
echo Running comprehensive cleanup script...
echo.
node comprehensive-cleanup.js

echo.
echo Cleanup process complete!
echo.
echo Press any key to exit...
pause > nul
