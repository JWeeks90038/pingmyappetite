# Password Reset Setup Instructions

## Overview
The custom password reset system has been implemented with:
1. **Custom Firebase Functions** - Using SendGrid to send emails from `flavor@grubana.com`
2. **Password Reset Page** - HTML page for users to reset their passwords
3. **Mobile App Integration** - Updated ProfileScreen to use custom reset function

## Files Created/Updated

### Firebase Functions (Deployed ✅)
- `functions/passwordResetService.js` - Custom password reset with SendGrid
- `functions/index.js` - Added password reset exports
- `grubana-mobile/src/firebase.js` - Added Firebase Functions import
- `grubana-mobile/src/screens/ProfileScreen.js` - Updated to use custom reset

### Website Files (Needs Deployment)
- `reset-password.html` - Password reset page for grubana.com

## Deployment Steps

### 1. Deploy reset-password.html to grubana.com
Upload the `reset-password.html` file to your grubana.com website so it's accessible at:
```
https://grubana.com/reset-password.html
```

### 2. Test the Flow
1. In the mobile app, go to Profile → "Send Password Reset Email"
2. Check your email (should come from flavor@grubana.com)
3. Click the reset link (should go to grubana.com/reset-password)
4. Enter new password and submit
5. Return to mobile app to login with new password

## How It Works

### Step 1: User Requests Reset
- User taps "Send Password Reset Email" in ProfileScreen
- App calls `sendCustomPasswordReset` Firebase Function
- Function generates secure token and stores in Firestore
- SendGrid sends email from `flavor@grubana.com` with reset link

### Step 2: User Clicks Email Link
- Link format: `https://grubana.com/reset-password?token=xxx&uid=xxx`
- Browser opens reset-password.html page
- Page calls `verifyPasswordResetToken` to validate link

### Step 3: User Resets Password
- User enters new password in form
- Page calls `completePasswordReset` Firebase Function
- Function updates password in Firebase Auth
- Token is deleted to prevent reuse

## Security Features
- **Secure tokens**: 32-byte random tokens with 1-hour expiry
- **One-time use**: Tokens are deleted after successful reset
- **Domain verification**: Emails sent from verified SendGrid domain
- **Token validation**: Multiple checks for token validity and expiry

## Email Template
The password reset emails include:
- Professional HTML design with Grubana branding
- Clear call-to-action button
- 1-hour expiry notice
- Security disclaimer
- Fallback text version

## Troubleshooting

### If emails don't send:
1. Check SendGrid API key in Firebase Functions environment
2. Verify `flavor@grubana.com` is verified in SendGrid
3. Check Firebase Functions logs for errors

### If reset page doesn't work:
1. Ensure reset-password.html is uploaded to grubana.com
2. Check browser console for JavaScript errors
3. Verify Firebase config in HTML file matches your project

### If password reset fails:
1. Check that token hasn't expired (1 hour limit)
2. Ensure token wasn't already used
3. Verify Firebase Functions are deployed correctly

## Firebase Functions Status
✅ sendCustomPasswordReset - Deployed
✅ verifyPasswordResetToken - Deployed  
✅ completePasswordReset - Deployed

## Next Steps
1. Upload reset-password.html to grubana.com
2. Test the complete flow
3. Monitor Firebase Functions logs for any issues

## Email Preview
Emails will show:
- **From**: Grubana <flavor@grubana.com>
- **Subject**: Reset Your Grubana Password
- **Content**: Professional HTML template with reset link
- **Link**: https://grubana.com/reset-password?token=xxx&uid=xxx
