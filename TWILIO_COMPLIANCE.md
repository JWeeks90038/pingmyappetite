# Twilio Toll-Free SMS Compliance Guide

## 📋 Overview
This guide explains how Grubana complies with Twilio's toll-free messaging requirements for SMS notifications.

## ✅ Compliance Checklist

### 1. **Opt-in Consent Collection** ✅
- **Location**: SMS consent checkboxes on signup forms
- **Method**: Explicit checkbox with clear terms
- **Proof**: `/sms-consent` page with detailed terms
- **Storage**: `smsConsent` and `smsConsentTimestamp` in Firestore

### 2. **Clear Consent Language** ✅
Users see this consent text:
```
I agree to receive SMS notifications from Grubana about [context-specific content]. 
Message and data rates may apply. Text STOP to opt out at any time. 
View SMS Terms
```

### 3. **Opt-out Mechanisms** ✅
- **STOP Command**: Users can text "STOP" to opt out
- **Account Settings**: Toggle SMS notifications in user settings
- **Support Email**: Contact grubana.co@gmail.com to opt out

### 4. **Message Frequency Disclosure** ✅
Clearly stated in SMS consent page:
- Up to 5 messages per day for location alerts
- Weekly digest messages (1 per week)
- Occasional promotional messages (max 2 per week)
- Account-related messages as needed

### 5. **Help Command Support** ✅
- Users can text "HELP" for assistance
- Support contact information provided

## 🌐 **Proof of Consent URL for Twilio**

**Primary URL**: `https://grubana.com/sms-consent`

This page contains:
- ✅ Complete SMS program terms
- ✅ Opt-in process explanation
- ✅ Message frequency details
- ✅ Opt-out instructions
- ✅ Help and support information
- ✅ Company contact details

## 📱 **SMS Program Details**

### **Program Purpose**
Food truck discovery and customer engagement platform

### **Message Types**
1. **Location Alerts**: When favorite trucks are nearby
2. **Deal Notifications**: Special offers and promotions
3. **Account Updates**: Welcome, subscription changes
4. **Weekly Digest**: Summary of new trucks and deals
5. **Event Notifications**: Food truck events and gatherings

### **Target Audience**
- Food truck customers (location alerts, deals)
- Food truck owners (customer engagement, analytics)
- Event organizers (vendor applications, updates)

### **Consent Collection Points**
1. **Customer Signup**: Phone number + SMS consent checkbox
2. **Truck Owner Signup**: Phone number + SMS consent checkbox  
3. **Event Organizer Signup**: Phone number + SMS consent checkbox
4. **Account Settings**: Enable/disable SMS notifications

## 🔒 **Data Protection**

### **Storage**
- Phone numbers encrypted in Firestore
- Consent timestamps recorded
- Opt-out preferences respected immediately

### **Access Control**
- Only authorized Grubana systems can send SMS
- No third-party access to phone numbers
- Secure Twilio API key management

## 📊 **Compliance Monitoring**

### **Opt-out Handling**
- Automatic processing of STOP commands
- Manual opt-out via support email
- Settings page toggle functionality

### **Message Tracking**
- Delivery confirmation via Twilio
- Error handling for invalid numbers
- Frequency monitoring and limits

## 🚀 **Implementation Status**

### ✅ **Completed**
- SMS consent collection on all signup forms
- Comprehensive consent page at `/sms-consent`
- Consent storage in user profiles
- Welcome SMS respects consent preferences
- Professional SMS program terms

### 📝 **For Twilio Submission**
1. **Proof of Consent URL**: `https://grubana.com/sms-consent`
2. **Business Description**: Food truck discovery platform connecting customers with mobile food vendors
3. **Use Case**: Location alerts, deal notifications, account updates
4. **Opt-in Method**: Website signup forms with explicit consent checkboxes
5. **Opt-out Method**: STOP command, account settings, email support

## 📞 **Contact Information for Twilio**

**Business Name**: Grubana  
**Website**: https://grubana.com  
**Support Email**: grubana.co@gmail.com  
**SMS Consent Page**: https://grubana.com/sms-consent  
**Privacy Policy**: https://grubana.com/privacypolicy  
**Terms of Service**: https://grubana.com/termsofservice  

## � Sample Content for Twilio Verification

### Use Case Description:
```
SMS notifications are sent to users of Grubana (food truck owners, event organizers, and customers) who have explicitly opted in during signup. Messages include welcome texts, account updates, event reminders, and important service notifications. Users must provide their phone number and consent to receive SMS during registration.
```

### Sample SMS Message:
```
Welcome to Grubana! Thanks for signing up. You'll receive updates about your account, events, and important notifications here. Reply STOP to unsubscribe at any time.
```

### Additional Sample Messages:
```
- "Your Grubana account has been activated! Start exploring food trucks in your area."
- "Event reminder: Food Truck Festival tomorrow at 2 PM. Don't miss out!"
- "Payment confirmed! Your Pro subscription is now active. Enjoy premium features."
```

## �🔧 **Technical Implementation**

### **Consent Verification**
```javascript
// User data includes consent tracking
{
  smsConsent: true/false,
  smsConsentTimestamp: timestamp,
  notificationPreferences: {
    smsNotifications: true/false
  }
}
```

### **SMS Sending Logic**
```javascript
// Only send if explicit consent given
const canSendSMS = userData.smsConsent && 
                   userData.notificationPreferences?.smsNotifications && 
                   userData.phone;
```

This comprehensive implementation ensures full compliance with Twilio's toll-free messaging requirements and TCPA regulations.
