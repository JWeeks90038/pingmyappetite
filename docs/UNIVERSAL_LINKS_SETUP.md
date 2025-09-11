# Universal Links Setup Instructions

## Apple Developer Setup Required

### 1. Get Your Team ID and Bundle ID
- Team ID: Found in Apple Developer Console under "Membership"
- Bundle ID: Should be `com.grubana.mobile` (or your chosen ID)

### 2. Update Apple App Site Association
Replace `TEAMID` in the following files with your actual Apple Team ID:
- `web/public/.well-known/apple-app-site-association`

### 3. iOS App Configuration

#### A. Add Entitlements (Expo/EAS)
In your `app.json` or `app.config.js`, add:

```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.developer.associated-domains": [
          "applinks:grubana.com"
        ]
      }
    }
  }
}
```

#### B. For React Native CLI projects, add to ios/YourApp/YourApp.entitlements:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:grubana.com</string>
    </array>
</dict>
</plist>
```

### 4. Verify Universal Links
- Deploy the `.well-known/apple-app-site-association` file to your web server
- Test with Apple's validator: https://branch.io/resources/aasa-validator/
- File must be served at: https://grubana.com/.well-known/apple-app-site-association

### 5. How It Works

1. **User completes Stripe onboarding**
2. **Stripe redirects to**: `https://grubana.com/stripe-redirect/complete`
3. **iOS recognizes Universal Link** and opens your app automatically
4. **App receives link** with params and navigates to TruckOnboardingScreen
5. **Success!** User is back in the app with completed setup

### 6. Testing

#### Development Testing:
- Use custom scheme: `grubana://stripe-onboarding?complete=true`
- Works in Expo Go and development builds

#### Production Testing:
- Use Universal Links: `https://grubana.com/stripe-redirect/complete`
- Works in TestFlight and App Store builds

### 7. Fallback Strategy

If Universal Links fail:
1. Show instructions to manually open the app
2. Provide App Store download link
3. Allow continuation in web browser
4. Session state preserved for when user returns to app

## Files Updated:

- ✅ `web/public/.well-known/apple-app-site-association`
- ✅ `web/public/stripe-redirect/complete.html`
- ✅ `web/public/stripe-redirect/refresh.html`
- ✅ `web/src/server/marketplaceRoutes.js`
- ✅ `grubana-mobile/App.js`

## Next Steps:

1. Get your Apple Team ID from developer console
2. Update the TEAMID placeholder in apple-app-site-association
3. Add entitlements to your iOS app configuration
4. Build and test with EAS/TestFlight
5. Deploy updated backend with Universal Link URLs
