# Firebase VAPID Key Setup Guide

## The Issue
The current VAPID key in the `.env` file appears to be a placeholder. You need to get the actual VAPID key from Firebase Console.

## Steps to Get Real VAPID Key:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `foodtruckfinder-27eba`
3. **Go to Project Settings** (gear icon)
4. **Click on "Cloud Messaging" tab**
5. **Scroll down to "Web Push certificates" section**
6. **If no certificate exists**:
   - Click "Generate key pair"
   - Copy the generated key
7. **If certificate exists**:
   - Copy the existing key

## Update Environment Variable:

Replace the current placeholder in `.env`:
```bash
# Current (placeholder)
VITE_FIREBASE_VAPID_KEY=BGzSxZ-wCzPtPUUwWGbJUwWJrlZuqJ2p_-JMRb1f8_HhTNpb9oF3Vl3GmEOKvNu2CmLbJZu0jVu3Dj4_TpZjYzE

# Replace with real key from Firebase Console
VITE_FIREBASE_VAPID_KEY=YOUR_ACTUAL_VAPID_KEY_FROM_FIREBASE
```

## Restart Development Server:
After updating the `.env` file, restart your development server for changes to take effect.

## Expected Result:
- FCM token registration should work without authentication errors
- Push notifications should function properly
- No more "401 Unauthorized" errors from FCM

## Alternative: Test Without VAPID
For testing purposes, you can temporarily remove the VAPID key parameter to see if basic FCM works:

```javascript
const token = await getToken(messaging); // Without VAPID key
```

But production deployments should always use a VAPID key for security.
