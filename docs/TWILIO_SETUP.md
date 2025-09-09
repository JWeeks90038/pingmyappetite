# Twilio Configuration Guide

## ⚠️ SECURITY WARNING
**NEVER put your Twilio credentials directly in your code!** Always use environment variables.

## Required Environment Variables

### Step 1: Get Your Twilio Credentials
1. **Account SID & Auth Token:**
   - Go to https://console.twilio.com/
   - Your Account SID and Auth Token are on the main dashboard
   - Account SID starts with "AC" (e.g., AC1234567890abcdef...)
   - Auth Token is a 32-character string

2. **API SID & API Secret Key:**
   - Go to https://console.twilio.com/
   - Navigate to Account > API keys & tokens
   - API SID starts with "SK" (e.g., SK1234567890abcdef...)
   - API Secret Key is a long alphanumeric string
   - These provide enhanced security for API calls

3. **Phone Number:**
   - Go to Phone Numbers > Manage > Active numbers
   - Use one of your purchased Twilio phone numbers
   - Format: +1234567890 (include country code)

### Step 2: Local Development Setup
Add these to your `.env.local` file (already added for you):
```
TWILIO_ACCOUNT_SID=ACxxxxx...      # Replace with your actual Account SID
TWILIO_AUTH_TOKEN=xxxxx...         # Replace with your actual Auth Token  
TWILIO_API_SID=SKxxxxx...          # Replace with your actual API SID
TWILIO_API_SECRET_KEY=xxxxx...     # Replace with your actual API Secret Key
TWILIO_PHONE_NUMBER=+1234567890    # Replace with your Twilio phone number
```

### Step 3: Production Environment Setup

#### For Railway (your current hosting):
1. Go to your Railway project dashboard
2. Go to Variables tab
3. Add these environment variables:
   - `TWILIO_ACCOUNT_SID`: Your Account SID (starts with AC)
   - `TWILIO_AUTH_TOKEN`: Your Auth Token
   - `TWILIO_API_SID`: Your API SID (starts with SK)
   - `TWILIO_API_SECRET_KEY`: Your API Secret Key
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number

#### For Firebase Cloud Functions:
```bash
firebase functions:config:set twilio.account_sid="ACxxxxx..."
firebase functions:config:set twilio.auth_token="your_auth_token"
firebase functions:config:set twilio.api_sid="SKxxxxx..."
firebase functions:config:set twilio.api_secret_key="your_api_secret_key"
firebase functions:config:set twilio.phone_number="+15551234567"
```

## Authentication Methods
Twilio supports two authentication methods:

1. **Basic Authentication (Account SID + Auth Token):**
   - Primary method for most API calls
   - Account SID + Auth Token

2. **API Key Authentication (API SID + API Secret Key):**
   - Enhanced security for production environments
   - API SID + API Secret Key
   - More granular permissions control

The code will automatically use API Key authentication if both API SID and API Secret Key are provided, otherwise it falls back to basic authentication.

## Testing SMS Functionality

You can test if SMS is working by:

1. **Check configuration in console:**
   ```javascript
   import { checkTwilioConfig } from './src/utils/twilioService.js';
 
   ```

2. **Send test SMS:**
   ```javascript
   import { sendNotificationSMS } from './src/utils/twilioService.js';
   
   sendNotificationSMS('+1234567890', 'Test', 'This is a test message')
     .then(result => ('SMS Result:', result));
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
