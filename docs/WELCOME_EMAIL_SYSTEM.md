# Welcome Email System Documentation

## Overview
Automatic welcome emails are now sent to all users after signup, with different content for free vs paid subscribers.

## How It Works

### Free Users (Basic Plans & Customers)
- **Trigger**: Immediately after successful signup
- **Method**: Formspree (existing form ID: mpwlvzaj)
- **Location**: Client-side in signup components
- **Content**: Role-specific welcome messages with next steps

### Paid Users (Pro, All-Access, Event Plans)
- **Trigger**: After successful Stripe payment via webhook
- **Method**: Formspree (same form ID)
- **Location**: Server-side in Stripe webhook handler
- **Content**: Plan-specific welcome with feature breakdown

### SMS Notifications (Optional)
- **Trigger**: With email for users who have phone numbers and SMS enabled
- **Method**: Twilio integration
- **Requirement**: Valid phone number + SMS notifications enabled
- **Content**: Short welcome message with key next steps

## Integration Points

### 1. Free User Signup Flow
```javascript
// In signup.jsx and SignupCustomer.jsx
const { sendWelcomeNotifications } = await import('../utils/welcomeEmailService.js');
const welcomeResults = await sendWelcomeNotifications(userData, false);
```

### 2. Paid User Webhook
```javascript
// In server/index.js - customer.subscription.created event
// Automatically sends welcome email via Formspree after payment
```

### 3. SMS Configuration
```javascript
// In .env file
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

## Welcome Email Content

### Customers (Foodie Fans)
- Platform introduction
- How to discover food trucks
- Notification setup guidance
- Dashboard access

### Mobile Kitchen Owners
- **Basic Plan**: Profile setup, location updates, upgrade options
- **Pro Plan**: Real-time GPS features, analytics, trial info
- **All-Access**: Advanced features, promotional tools, priority support

### Event Organizers
- **Basic**: Event creation basics, vendor management intro
- **Event Starter**: 3 events/month, application management, trial info
- **Event Pro**: Unlimited events, advanced matching, premium features
- **Event Premium**: White-label platform, API access, account manager

## Configuration

### Formspree Setup
- **Form ID**: mpwlvzaj (already configured)
- **Endpoint**: https://formspree.io/f/mpwlvzaj
- **Fields**: to, subject, message, user metadata
- **Reply-to**: flavor@grubana.com

### Twilio Setup (For SMS)
1. Get credentials from https://console.twilio.com/
2. Add to environment variables:
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN  
   - TWILIO_PHONE_NUMBER
3. Users control SMS preferences in settings

### Environment Variables
```bash
# Required for SMS (optional feature)
TWILIO_ACCOUNT_SID=ACxxxxx...
TWILIO_AUTH_TOKEN=xxxxx...
TWILIO_PHONE_NUMBER=+1234567890
```

## Testing

### Test Free User Welcome
1. Sign up with any role using basic plan
2. Check email inbox for immediate welcome email
3. Verify correct role-specific content

### Test Paid User Welcome  
1. Sign up with pro/all-access/event plan
2. Complete Stripe payment
3. Check email for premium welcome with trial info
4. Verify plan-specific feature breakdown

### Test SMS (if configured)
1. Add phone number during signup
2. Enable SMS notifications in settings
3. Sign up and verify SMS welcome message
4. Check Twilio logs for delivery confirmation

## Troubleshooting

### Email Not Received
- Check Formspree dashboard for delivery logs
- Verify email address is valid
- Check spam/junk folders
- Ensure Formspree form mpwlvzaj is active

### SMS Not Received
- Check if TWILIO environment variables are set
- Verify phone number format (+1XXXXXXXXXX)
- Check user has SMS notifications enabled
- Review Twilio console for error logs

### Paid User Emails
- Verify Stripe webhook is working
- Check server logs for webhook processing
- Ensure user has stripeCustomerId in Firestore
- Confirm subscription metadata includes uid and planType

## Benefits

### For Users
- Clear onboarding guidance
- Plan-specific feature education
- Multiple communication channels (email + SMS)
- Professional welcome experience

### For Business
- Improved user activation
- Reduced support queries
- Higher trial-to-paid conversion
- Better user engagement from day one

## Future Enhancements

### Potential Additions
- Welcome email sequences (day 1, 3, 7)
- Plan-specific video tutorials
- Personalized onboarding checklists
- A/B testing for email content
- Rich HTML email templates via Zapier/Make.com

### Analytics Tracking
- Email open rates (via Formspree)
- SMS delivery rates (via Twilio)
- User activation metrics
- Trial conversion tracking
