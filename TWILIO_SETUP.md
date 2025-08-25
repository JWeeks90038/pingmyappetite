# Twilio Configuration Guide

## Required Environment Variables

Add these environment variables to your deployment environment (Vercel, Railway, etc.):

### For your main application (.env.local or production environment):
```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### For Firebase Cloud Functions:

1. Set these environment variables in Firebase:
```bash
firebase functions:config:set twilio.account_sid="your_account_sid_here"
firebase functions:config:set twilio.auth_token="your_auth_token_here"
firebase functions:config:set twilio.phone_number="+1234567890"
```

2. Or use Firebase environment configuration:
```bash
firebase functions:config:set twilio.account_sid="ACxxxxx"
firebase functions:config:set twilio.auth_token="your_auth_token"
firebase functions:config:set twilio.phone_number="+15551234567"
```

## Getting Your Twilio Credentials

1. **Account SID & Auth Token:**
   - Go to https://console.twilio.com/
   - Your Account SID and Auth Token are on the main dashboard

2. **Phone Number:**
   - Go to Phone Numbers > Manage > Active numbers
   - Use one of your purchased Twilio phone numbers
   - Format: +1234567890 (include country code)

## Testing SMS Functionality

You can test if SMS is working by:

1. **Check configuration in console:**
   ```javascript
   import { checkTwilioConfig } from './src/utils/twilioService.js';
   console.log(checkTwilioConfig());
   ```

2. **Send test SMS:**
   ```javascript
   import { sendNotificationSMS } from './src/utils/twilioService.js';
   
   sendNotificationSMS('+1234567890', 'Test', 'This is a test message')
     .then(result => console.log('SMS Result:', result));
   ```

## Deployment Notes

- **Vercel:** Add environment variables in your Vercel dashboard
- **Railway:** Add environment variables in your Railway project settings
- **Firebase Functions:** Use `firebase functions:config:set` commands above

## Phone Number Validation

The system automatically:
- Validates US phone number formats (10 or 11 digits)
- Converts to E.164 format (+1234567890)
- Handles various input formats (with/without country code, with/without formatting)

## SMS Message Limits

- SMS messages are limited to 160 characters for single SMS
- Messages longer than 150 characters are automatically truncated
- Links and truck information are added when space allows

## Error Handling

The system gracefully handles:
- Missing Twilio credentials (falls back to push notifications only)
- Invalid phone numbers (skips SMS, continues with other notification methods)
- Twilio API errors (logs error but doesn't crash the application)
