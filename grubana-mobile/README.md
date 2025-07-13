# Grubana Mobile

The official mobile app for Grubana - connecting food truck lovers with their favorite mobile eateries.

## Features

### For Customers
- 📍 Send location-based pings to food trucks
- 🗺️ Real-time map showing active food trucks
- ❤️ Favorite food trucks
- 🎯 Claim food drops and special offers
- 🔔 Push notifications for nearby trucks

### For Food Truck Owners
- 📍 Live location tracking and sharing
- 📊 Analytics dashboard for customer pings
- 🎯 Create and manage food drops
- 📱 Share QR codes for easy discovery
- 💬 Manage customer interactions

## Tech Stack

- **React Native** with Expo
- **Firebase** for backend services
- **React Navigation** for navigation
- **React Native Maps** for map functionality
- **Expo Location** for location services

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Expo CLI installed globally: `npm install -g @expo/cli`
- iOS Simulator (for iOS development) or Android Studio (for Android development)
- Expo Go app on your physical device (for testing)

### Installation

1. Navigate to the mobile project directory:
   ```bash
   cd grubana-mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Choose your development platform:
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan the QR code with Expo Go app on your phone

### Development Commands

```bash
# Start development server
npx expo start

# Start with specific platform
npx expo start --ios
npx expo start --android
npx expo start --web

# Build for production
npx expo build:ios
npx expo build:android

# Run on specific device
npx expo run:ios
npx expo run:android
```

## Project Structure

```
grubana-mobile/
├── src/
│   ├── components/
│   │   ├── AuthContext.js
│   │   └── Navigation.js
│   ├── screens/
│   │   ├── HomeScreen.js
│   │   ├── LoginScreen.js
│   │   ├── SignupScreen.js
│   │   ├── CustomerDashboardScreen.js
│   │   ├── OwnerDashboardScreen.js
│   │   └── SettingsScreen.js
│   ├── services/
│   │   └── firebase.js
│   └── constants/
│       └── cuisineTypes.js
├── assets/
├── App.js
└── app.json
```

## Key Features Implementation

### Authentication
- Firebase Auth integration
- Role-based navigation (Customer vs Owner)
- Persistent login state

### Maps & Location
- Real-time location tracking for food trucks
- Customer location for ping sending
- Custom markers for trucks and food drops

### Data Synchronization
- Real-time updates via Firestore listeners
- Offline-friendly architecture
- Optimistic UI updates

## Configuration

### Firebase Setup
The app uses the same Firebase configuration as the web app. Make sure Firebase is properly configured with:
- Authentication enabled
- Firestore database rules configured
- Storage rules for file uploads

### Maps Configuration
- Google Maps API key required for iOS/Android
- Location permissions configured in app.json

### Push Notifications
- Expo push notifications for real-time alerts
- Configure notification permissions

## Building for Production

### iOS
1. Configure iOS bundle identifier in `app.json`
2. Set up Apple Developer account
3. Build with EAS Build or Expo CLI

### Android
1. Configure Android package name in `app.json`
2. Set up Google Play Console account
3. Build with EAS Build or Expo CLI

## Environment Variables

Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_API_URL=your-api-url
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on both iOS and Android
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or create an issue in the repository.
