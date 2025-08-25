# Formspree Notification Integration

## Overview
Successfully integrated Formspree for email and SMS notifications based on user preferences. Users can now choose to receive notifications via:
- Email (using Formspree)
- SMS (using Formspree + webhook automation)
- Push notifications (existing Firebase FCM)

## What's Implemented

### 1. Phone Number Collection
- **Signup Form**: Collects phone numbers during customer registration
- **Settings Page**: Allows users to add/edit phone numbers and notification preferences
- **Database**: Stores phone numbers and preferences in Firestore user documents

### 2. Notification Preferences
- **Email Notifications**: Toggle in settings, saves to `notificationPreferences.emailNotifications`
- **SMS Notifications**: Toggle in settings, saves to `notificationPreferences.smsNotifications`
- **Real-time Updates**: Preferences update immediately in Firestore when changed

### 3. Multi-Channel Delivery
- **Client-side**: `notificationService.js` handles preference-based delivery
- **Server-side**: Firebase Cloud Functions send notifications via multiple channels
- **Formspree Integration**: Uses existing form ID `mpwlvzaj` for email delivery

## Formspree Configuration Needed

### Current Setup
```
Form ID: mpwlvzaj (already in use for referral notifications)
Endpoint: https://formspree.io/f/mpwlvzaj
```

### Email Notifications
✅ **Ready to use** - sends to user's email address with:
- Subject: Notification title
- Message: Notification body
- Metadata: truck_id, drop_id, user_id
- Reply-to: noreply@grubana.com

### SMS Notifications
⚠️ **Requires Webhook Setup** - Currently sends to Formspree with webhook trigger:
```
_webhook: 'https://your-automation-service.com/send-sms'
```

**Options for SMS:**
1. **Zapier Integration**: Connect Formspree → Zapier → SMS service (Twilio, etc.)
2. **Make.com Integration**: Connect Formspree → Make.com → SMS service
3. **Custom Webhook**: Build your own SMS endpoint

## Notification Types Integrated

### 1. Truck Proximity Notifications
- **Trigger**: When favorite truck comes within notification radius
- **Delivery**: Email + SMS + Push (based on user preferences)
- **Location**: `functions/notificationTriggers.js` - `onTruckLocationUpdate`

### 2. Deal Notifications  
- **Trigger**: When favorite truck creates new deals/drops
- **Delivery**: Email + SMS + Push (based on user preferences)
- **Location**: `functions/notificationTriggers.js` - `onDropCreate`

### 3. Weekly Digest
- **Trigger**: Scheduled weekly summary
- **Delivery**: Email + SMS + Push (based on user preferences)
- **Location**: `functions/notificationTriggers.js` - `sendWeeklyDigest`

## User Experience Flow

### Signup
1. User enters email, password, and phone number
2. System saves user with default notification preferences:
   - Email: enabled
   - SMS: enabled (if phone provided)
   - All notification types: enabled

### Settings Management
1. User can toggle email/SMS preferences independently
2. Phone number can be added/edited
3. Changes save immediately to Firestore
4. UI shows phone requirement for SMS notifications

### Notification Delivery
1. System checks user preferences before sending
2. Sends via enabled channels only
3. Logs delivery results for debugging
4. Falls back to push notification if other methods fail

## Next Steps

### For Email (Ready Now)
- ✅ Users will receive email notifications immediately
- ✅ Check Formspree dashboard for delivery logs

### For SMS (Requires Setup)
1. **Choose SMS Provider**:
   - Zapier + Twilio (recommended)
   - Make.com + TextMagic
   - Custom webhook + Twilio API

2. **Configure Webhook**:
   - Update webhook URL in `functions/notificationTriggers.js`
   - Test webhook receives Formspree data
   - Parse phone number and message fields

3. **Optional: Separate Form**:
   - Create dedicated Formspree form for SMS
   - Update form ID in notification functions

## Testing

### Test Email Notifications
1. Sign up with real email
2. Enable email notifications in settings
3. Trigger notification (favorite a truck, wait for proximity/deals)
4. Check email inbox and Formspree logs

### Test SMS (After Webhook Setup)
1. Add phone number in settings
2. Enable SMS notifications
3. Trigger notification
4. Check webhook logs and SMS delivery

## Security Notes
- Phone numbers stored in Firestore (secured by rules)
- Notification preferences respect user choices
- Formspree handles email delivery securely
- SMS webhook should validate requests from Formspree
