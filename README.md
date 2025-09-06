# Grubana Monorepo

A comprehensive food truck locator platform with separate web and mobile applications.

## Project Structure

```
grubana-monorepo/
├── web/                          # React web application
│   ├── src/                     # Web application source code
│   ├── public/                  # Static assets for web
│   ├── dist/                    # Built web application
│   ├── package.json             # Web dependencies
│   ├── vite.config.js          # Vite configuration with path aliases
│   └── .env                     # Web environment variables
│
├── grubana-mobile/              # React Native mobile app
│   ├── screens/                 # Mobile screens
│   ├── components/              # Mobile components
│   ├── navigation/              # Navigation configuration
│   ├── context/                 # React Context providers
│   ├── functions/               # Mobile-specific cloud functions
│   ├── App.js                   # Main mobile app entry point
│   ├── app.json                 # Expo configuration
│   ├── package.json             # Mobile dependencies
│   ├── babel.config.js          # Babel configuration
│   └── .env                     # Mobile environment variables
│
├── shared/                      # Shared resources
│   ├── functions/               # Firebase Cloud Functions
│   ├── config/                  # Firebase configuration files
│   │   ├── firebase.json
│   │   ├── firestore.rules
│   │   ├── firestore.indexes.json
│   │   └── storage.rules
│   └── utils/                   # Shared utility functions
│
├── scripts/                     # Development and debugging scripts
│   ├── debug-*.js              # Debugging utilities
│   ├── test-*.js               # Testing scripts
│   └── fix-*.js                # Data migration scripts
│
├── firebase.json                # Main Firebase configuration
├── package.json                 # Root package.json for monorepo
└── README.md                    # This file
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 8+
- Firebase CLI
- Expo CLI (for mobile development)

### Installation

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   - Copy environment variables to `web/.env` and `grubana-mobile/.env`
   - Configure Firebase project settings

### Development

#### Web Application
```bash
# Start web development server
npm run dev:web

# Build web application
npm run build:web

# Deploy web application
npm run deploy:web
```

#### Mobile Application
```bash
# Start mobile development server
npm run start:mobile

# Build for iOS
npm run build:ios

# Build for Android
npm run build:android
```

#### Firebase Functions
```bash
# Deploy functions
npm run deploy:functions

# Deploy everything (web + functions)
npm run deploy:all
```

## Path Aliases

The project uses path aliases for cleaner imports:

### Web Application
- `@/` → `./src/`
- `@shared/` → `../shared/`
- `@functions/` → `../shared/functions/`
- `@config/` → `../shared/config/`
- `@utils/` → `../shared/utils/`

### Mobile Application
- Imports use relative paths to shared resources
- Mobile-specific functions in `grubana-mobile/functions/`

## Environment Variables

### Web (.env)
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `VITE_API_URL` - Backend API URL
- `VITE_FIREBASE_VAPID_KEY` - Firebase push notification key

### Mobile (.env)
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `API_URL` - Backend API URL
- `FIREBASE_VAPID_KEY` - Firebase push notification key

## Deployment

### Web Application
The web app is deployed using Firebase Hosting:
```bash
npm run deploy:web
```

### Mobile Application
Use Expo Application Services (EAS):
```bash
# iOS
npm run build:ios
npm run submit:ios

# Android
npm run build:android
npm run submit:android
```

## Architecture Notes

- **Monorepo Structure**: Web and mobile apps share Firebase functions and configuration
- **Separation of Concerns**: Web-specific code in `web/`, mobile-specific in `grubana-mobile/`
- **Shared Resources**: Common Firebase functions and utilities in `shared/`
- **Path Aliases**: Configured for clean, maintainable imports
- **Environment Separation**: Platform-specific environment variables for security

🚀 **Live Demo:** https://grubana.vercel.app

🔒 **Note:** This repo includes only the frontend logic. The backend, including Firebase Cloud Functions, authentication rules, and analytics processing, is kept private for security.

## 🧩 Features
- 📍 Interactive map showing live food truck locations
- 🌶️ Real-time "ping" and "drop" system for customer engagement
- 🔥 Heatmap showing areas of high activity
- 🎯 Distance-based filtering and user tracking
- 📲 Mobile-responsive design with geolocation support

## 🛠️ Tech Stack
- React (Vite or CRA, depending on setup)
- Firebase (client-side only) – Firestore, Auth, Hosting
- Leaflet / Google Maps for real-time maps
- Chart.js for analytics visuals
- Vercel for deployment

## 📁 What's in this repo
- ✅ Fully functional frontend app
- ❌ No backend code or sensitive data
- 🧪 Example environment file: .env.example

## 🧼 Security Notice
All backend logic, private API keys, and Firestore rules are stored securely and not included in this public repo.

For more details on the Grubana project or a full-stack demo, feel free to reach out.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# Last updated: Mon Aug 11 12:34:37 PDT 2025
