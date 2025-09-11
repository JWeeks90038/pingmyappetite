# Vendor Application Email System Setup

This system uses SendGrid to send automated emails for vendor applications to events.

## Environment Setup

### 1. SendGrid API Key Configuration

The system requires a SendGrid API key to be configured as an environment variable:

```bash
# For local development, add to your .env file:
SENDGRID_API_KEY=your_sendgrid_api_key_here

# For Firebase Functions deployment, use:
firebase functions:config:set sendgrid.api_key="your_sendgrid_api_key_here"
```

### 2. SendGrid Account Setup

1. Create a SendGrid account at https://sendgrid.com
2. Generate an API key with Mail Send permissions
3. Verify your sender email domain (recommend using flavor@grubana.com)
4. Set up sender authentication (SPF, DKIM records)

### 3. Email Templates

The system includes two email templates:

#### Vendor Application Notification (to Event Organizer)
- Sent when a vendor applies to an event
- Contains vendor details, menu description, and contact information
- Includes direct contact link to vendor

#### Vendor Application Confirmation (to Vendor)
- Sent to vendor after successful application submission
- Confirms application receipt and provides next steps
- Includes application summary and event details

### 4. Firebase Triggers

The system uses Firestore triggers to automatically send emails:
- Trigger: `onDocumentCreated("vendorApplications/{applicationId}")`
- Function: `onVendorApplicationCreated`

### 5. Required Firestore Collections

Ensure these collections exist:
- `vendorApplications` - Vendor application documents
- `events` - Event details with organizer information
- `users` - User profiles including email addresses

### 6. Testing

To test the email system:
1. Create a vendor application document in Firestore
2. Ensure the related event and user documents exist
3. Check Firebase Functions logs for successful email delivery
4. Verify emails arrive in both organizer and vendor inboxes

### 7. Production Deployment

Before deploying to production:
1. Set the correct SendGrid API key in Firebase Functions config
2. Verify sender email domain is properly authenticated
3. Test with real email addresses
4. Monitor Firebase Functions logs for any errors

## Troubleshooting

### Common Issues

1. **403 Forbidden from SendGrid**
   - Check API key permissions
   - Verify sender email is authenticated
   - Ensure API key is properly set in environment

2. **Event or User Not Found**
   - Verify Firestore document structure
   - Check that referenced documents exist
   - Review Firebase Functions logs

3. **Email Not Delivered**
   - Check SendGrid dashboard for delivery status
   - Verify recipient email addresses
   - Check spam folders

### Logs and Monitoring

Monitor the system through:
- Firebase Functions logs
- SendGrid delivery dashboard
- Application error reporting
