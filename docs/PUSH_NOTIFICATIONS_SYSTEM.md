# Personalized Push Notifications System

## Overview
The personalized push notification system engages customers by alerting them when their favorite food trucks are nearby or creating new deals. This feature increases app engagement, vendor satisfaction, and drives monetization through the freemium model.

## Architecture

### Frontend Components

#### 1. NotificationService (`src/utils/notificationService.js`)
- **Purpose**: Core Firebase Cloud Messaging integration
- **Key Features**:
  - Permission management
  - Token registration and refreshing
  - Message listening (foreground/background)
  - Token cleanup on signout

#### 2. NotificationPreferences (`src/components/NotificationPreferences.jsx`)
- **Purpose**: Customer-facing preferences management
- **Features**:
  - Toggle notifications on/off
  - Granular preferences (favorite trucks, deals, weekly digest)
  - Visual preference settings with real-time updates

#### 3. NotificationBanner (`src/components/NotificationBanner.jsx`)
- **Purpose**: Subtle promotion to enable notifications
- **Features**:
  - Sticky banner for unregistered customers
  - Dismissible with localStorage persistence
  - Direct link to preferences page

#### 4. useNotifications Hook (`src/hooks/useNotifications.js`)
- **Purpose**: Centralized notification state management
- **Features**:
  - Permission status tracking
  - Preference synchronization with Firestore
  - Test notification capability
  - Token refresh management

### Backend Triggers

#### 1. Truck Location Updates (`functions/notificationTriggers.js`)
```javascript
exports.onTruckLocationUpdate = onDocumentWritten({
  document: 'trucks/{truckId}'
}, async (event) => {
  // Detects when trucks move within 2 miles of customers
  // Prevents spam with 1-hour cooldown
  // Only notifies users who favorited the truck
});
```

#### 2. Deal Creation (`functions/notificationTriggers.js`)
```javascript
exports.onDropCreated = onDocumentCreated({
  document: 'drops/{dropId}'
}, async (event) => {
  // Alerts customers when favorite trucks create deals
  // Includes deal details and expiration
  // Respects user deal notification preferences
});
```

#### 3. Weekly Digest (`functions/notificationTriggers.js`)
```javascript
exports.sendWeeklyDigest = onSchedule('every sunday 18:00', async (context) => {
  // Sunday evening summary of nearby activity
  // Includes nearby trucks and favorite truck deals
  // Opt-in only feature
});
```

## Integration Points

### 1. Firebase Collections

#### Users Collection
```javascript
{
  uid: "user123",
  favoriteTrucks: ["truck1", "truck2"],
  location: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  notificationPreferences: {
    favoriteTrucks: true,
    deals: true,
    weeklyDigest: false
  }
}
```

#### Notification Tokens Collection
```javascript
{
  userId: "user123",
  token: "fcm_token_string",
  active: true,
  createdAt: timestamp,
  lastUsed: timestamp
}
```

#### Sent Notifications Collection (Anti-spam)
```javascript
{
  userId: "user123",
  type: "truck_nearby", // "truck_deal", "weekly_digest"
  identifier: "truck1", // truckId or "weekly"
  timestamp: timestamp,
  payload: {...}
}
```

### 2. Environment Variables
```env
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### 3. Service Worker (`public/firebase-messaging-sw.js`)
- Handles background message reception
- Shows notifications when app is not in foreground
- Routes notification clicks to appropriate app sections

## Monetization Impact

### Customer Engagement
- **Favorite Truck Alerts**: Increases app opens when trucks are nearby
- **Deal Notifications**: Creates urgency and drives purchases
- **Weekly Digest**: Maintains regular engagement and discovery

### Vendor Benefits
- **Increased Visibility**: Customers notified of proximity
- **Deal Promotion**: Direct channel to interested customers
- **Customer Retention**: Keeps trucks top-of-mind

### Revenue Drivers
1. **Higher App Engagement**: More active users = higher plan upgrade potential
2. **Vendor Satisfaction**: Better customer reach = higher upgrade rates
3. **Premium Features**: Advanced notification analytics for Pro+ users

## User Experience Flow

### First-Time Setup
1. Customer creates account
2. NotificationBanner appears suggesting notifications
3. User navigates to `/notifications`
4. One-click enable with permission request
5. Preferences automatically saved

### Ongoing Usage
1. User favorites trucks through normal app flow
2. Backend monitors truck locations via Firestore triggers
3. Proximity/deal notifications sent automatically
4. User can manage preferences anytime in settings

### Notification Types

#### 1. Proximity Alerts
- **Trigger**: Favorite truck within 2 miles
- **Frequency**: Max 1 per truck per hour
- **Content**: "{Truck Name} is nearby! 🚚"

#### 2. Deal Notifications
- **Trigger**: Favorite truck creates new drop/deal
- **Frequency**: Max 1 per truck per hour for deals
- **Content**: "🎉 {Truck Name} has a new deal! {Deal Details}"

#### 3. Weekly Digest
- **Trigger**: Sunday 6 PM (scheduled)
- **Frequency**: Weekly (opt-in)
- **Content**: Summary of nearby activity and favorite truck deals

## Analytics & Metrics

### Tracked Events
- Notification permissions granted/denied
- Notifications sent/delivered/clicked
- Preference changes
- Banner dismissals

### Success Metrics
- Notification opt-in rate: Target 65%+
- Click-through rate: Target 15%+
- App engagement increase: Target 25%+
- Customer retention improvement: Target 20%+

## Technical Considerations

### Performance
- Efficient distance calculations using Haversine formula
- Batch token management to prevent rate limits
- Automatic cleanup of invalid tokens

### Privacy
- Location data only used for proximity calculations
- Users control all notification preferences
- Clear opt-out mechanisms

### Reliability
- Fallback handling for token refresh failures
- Graceful degradation when permissions denied
- Anti-spam protection with cooldown periods

## Future Enhancements

### Advanced Features
- **Geofencing**: More precise location-based triggers
- **Smart Timing**: ML-based optimal notification timing
- **Rich Notifications**: Images and interactive actions

### Premium Features
- **Analytics Dashboard**: Detailed notification performance for truck owners
- **Custom Campaigns**: Targeted notification campaigns for Pro users
- **A/B Testing**: Notification content optimization

## Development Checklist

### ✅ Completed
- [x] Firebase Cloud Messaging integration
- [x] Customer notification preferences UI
- [x] Backend triggers for proximity and deals
- [x] Service worker for background notifications
- [x] Anti-spam and cooldown mechanisms
- [x] Integration with existing app architecture

### 🔄 In Progress
- [ ] Testing with real truck location updates
- [ ] Analytics integration for notification tracking
- [ ] Performance optimization for large user bases

### 📋 Future Tasks
- [ ] Advanced notification analytics dashboard
- [ ] Rich notification content with images
- [ ] Machine learning for optimal notification timing
- [ ] Integration with upgrade nudge system for analytics

## Deployment Notes

1. **Firebase Console Setup**:
   - Enable Cloud Messaging
   - Generate VAPID key
   - Configure service worker path

2. **Environment Configuration**:
   - Add VAPID key to environment variables
   - Ensure service worker is accessible at root

3. **Testing**:
   - Test notification permissions in different browsers
   - Verify background message handling
   - Test proximity calculations with sample data

4. **Monitoring**:
   - Set up Cloud Function logs monitoring
   - Track notification delivery rates
   - Monitor token refresh patterns

This system creates a comprehensive notification experience that drives engagement while respecting user preferences and privacy.
