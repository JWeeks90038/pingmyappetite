# Production Notification System Setup Guide

## Overview
This guide explains how to transition from the current Expo development environment to a production-ready React Native app with Firebase Cloud Messaging (FCM).

## Current State vs Production

### **Current Development (Expo)**
- ✅ Uses `expo-notifications` for development testing
- ✅ Uses device push tokens for basic functionality
- ✅ Works in Expo Go and development builds
- ⚠️ Limited to Expo's notification service

### **Production Ready (Standalone React Native)**
- ✅ Uses Firebase Cloud Messaging (FCM) directly
- ✅ Works independently of Expo services
- ✅ Full control over notification delivery
- ✅ Better performance and reliability

## Migration Steps

### **1. Install Production Dependencies**

When you're ready to eject from Expo, install these packages:

```bash
# Core Firebase messaging
npm install @react-native-firebase/app @react-native-firebase/messaging

# iOS badge count support
npm install @react-native-community/push-notification-ios

# Android local notifications (optional)
npm install react-native-push-notification
```

### **2. Firebase Configuration**

#### **A. Add Firebase Config Files**

**iOS**: Add `GoogleService-Info.plist` to `ios/YourApp/`
**Android**: Add `google-services.json` to `android/app/`

#### **B. Update iOS Configuration**

In `ios/YourApp/AppDelegate.m` or `AppDelegate.mm`:

```objc
#import <Firebase.h>
#import <UserNotifications/UserNotifications.h>
#import <RNCPushNotificationIOS.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];
  
  // Define UNUserNotificationCenter
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;
  
  return YES;
}

// Required for iOS push notifications
- (void)application:(UIApplication *)application didRegisterUserNotificationSettings:(UIUserNotificationSettings *)notificationSettings
{
  [RNCPushNotificationIOS didRegisterUserNotificationSettings:notificationSettings];
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [RNCPushNotificationIOS didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  [RNCPushNotificationIOS didFailToRegisterForRemoteNotificationsWithError:error];
}

- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [RNCPushNotificationIOS didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

- (void)application:(UIApplication *)application didReceiveLocalNotification:(UILocalNotification *)notification
{
  [RNCPushNotificationIOS didReceiveLocalNotification:notification];
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
{
  completionHandler(UNNotificationPresentationOptionSound | UNNotificationPresentationOptionAlert | UNNotificationPresentationOptionBadge);
}

@end
```

#### **C. Update Android Configuration**

In `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.0.0'
    implementation 'com.google.firebase:firebase-analytics:21.0.0'
}
```

In `android/build.gradle`:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

### **3. Update Notification Service**

The `FCMNotificationService.js` is already prepared for both environments. When you eject:

1. **Automatic Detection**: The service detects if running in Expo or standalone
2. **Graceful Fallback**: Uses appropriate notification methods for each environment
3. **Same API**: No changes needed in your app code

### **4. Backend Configuration**

#### **A. Update Firebase Cloud Functions**

The current `orderNotificationService.js` already supports FCM tokens. Ensure your Firebase project has:

1. **Cloud Messaging API enabled**
2. **Service account key with messaging permissions**
3. **VAPID keys for web notifications** (if supporting web)

#### **B. VAPID Key Setup** (for web support)

1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Generate VAPID key pair
3. Update the FCM service with your VAPID key:

```javascript
// In fcmNotificationService.js, replace:
vapidKey: 'your-vapid-key-here'
// With your actual VAPID key
```

### **5. Testing the Migration**

#### **Development Testing** (Current)
```javascript
// Test in Expo environment
FCMNotificationService.testNotification('customer');

// Should show: { environment: 'expo', isInitialized: true }
```

#### **Production Testing** (After ejection)
```javascript
// Test in standalone environment
FCMNotificationService.testNotification('truck_owner');

// Should show: { environment: 'standalone', isInitialized: true }
```

### **6. Badge Count Management**

The system automatically handles badge counts across platforms:

#### **iOS**
- Uses native badge count API
- Increments with each notification
- Clears when app opens or user views orders

#### **Android**
- Uses notification channel badges (Android 8.0+)
- Handled by system notifications
- Clears when notifications are dismissed

### **7. Production Deployment Checklist**

#### **Before Ejecting from Expo:**
- ✅ Test current FCM implementation thoroughly
- ✅ Verify all notification types work correctly
- ✅ Test badge counting on both platforms
- ✅ Confirm Firebase project configuration

#### **During Ejection:**
- ✅ Install production dependencies
- ✅ Add Firebase configuration files
- ✅ Update native iOS/Android configurations
- ✅ Test FCM token generation

#### **After Ejection:**
- ✅ Verify standalone notification service works
- ✅ Test all notification scenarios
- ✅ Confirm badge counting functionality
- ✅ Performance test with high notification volume

## Benefits of This Approach

### **🔄 Seamless Transition**
- Same API between development and production
- No code changes required in React Native components
- Automatic environment detection

### **🚀 Production Ready**
- Direct Firebase integration
- Better performance and reliability
- Full control over notification delivery

### **📱 Cross-Platform**
- Works on iOS and Android
- Consistent badge count behavior
- Native notification handling

### **🛡️ Future Proof**
- Independent of Expo services
- Compatible with latest React Native versions
- Scalable for enterprise use

## Support & Troubleshooting

### **Common Issues**

1. **Token Generation Fails**
   - Verify Firebase configuration files are correct
   - Check network connectivity
   - Ensure permissions are granted

2. **Notifications Not Received**
   - Verify FCM token is saved to Firestore
   - Check Firebase Cloud Function logs
   - Test with Firebase Console directly

3. **Badge Count Not Working**
   - iOS: Verify notification permissions include badges
   - Android: Check if launcher supports badges

### **Debug Commands**

```javascript
// Check service status


// Test token generation
FCMNotificationService.initialize(userId).then();

// Test local notification
FCMNotificationService.testNotification('customer');
```

The FCM notification system is now production-ready and will seamlessly transition from Expo to standalone React Native! 🎉
