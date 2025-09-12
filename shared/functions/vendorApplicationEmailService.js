import { logger } from "firebase-functions/v2";
import sgMail from "@sendgrid/mail";

// Configure SendGrid API key from environment variables
// Set this in Firebase Functions config: firebase functions:config:set sendgrid.api_key="your-key-here"
// Or set SENDGRID_API_KEY environment variable in your deployment environment
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "your-sendgrid-api-key-here";
sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Send vendor application notification email to event organizer
 * @param {Object} applicationData - Vendor application data
 * @param {Object} organizerData - Event organizer data
 */
export const sendVendorApplicationNotification = async (applicationData, organizerData) => {
  try {
    const equipmentTypes = {
      'food-truck': 'Food Truck',
      'food-trailer': 'Food Trailer',
      'cart': 'Food Cart',
      'catering': 'Catering Setup',
      'other': 'Other'
    };

    const applicationType = equipmentTypes[applicationData.equipmentType] || applicationData.equipmentType;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'flavor@grubana.com';
    
    logger.info('Sending vendor application notification', {
      to: organizerData.email,
      from: fromEmail,
      eventTitle: applicationData.eventTitle,
      vendorName: applicationData.businessName
    });
    
    const msg = {
      to: organizerData.email,
      from: fromEmail, // Use environment variable
      subject: `New Vendor Application for ${applicationData.eventTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #FF6B6B, #4ECDC4); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🍽️ New Vendor Application</h1>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Event Details</h2>
            <p><strong>Event:</strong> ${applicationData.eventTitle}</p>
            <p><strong>Date:</strong> ${applicationData.eventDate}</p>
            <p><strong>Time:</strong> ${applicationData.eventTime}</p>
            <p><strong>Location:</strong> ${applicationData.eventLocation}</p>
          </div>

          <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Vendor Information</h2>
            <p><strong>Business Name:</strong> ${applicationData.businessName}</p>
            <p><strong>Contact Name:</strong> ${applicationData.contactName}</p>
            <p><strong>Email:</strong> ${applicationData.contactEmail}</p>
            <p><strong>Phone:</strong> ${applicationData.contactPhone}</p>
            <p><strong>Equipment Type:</strong> ${applicationType}</p>
          </div>

          ${applicationData.menuDescription ? `
          <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Menu Description</h2>
            <p>${applicationData.menuDescription}</p>
          </div>
          ` : ''}

          ${applicationData.specialRequests ? `
          <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Special Requests</h2>
            <p>${applicationData.specialRequests}</p>
          </div>
          ` : ''}

          <div style="text-align: center; padding: 20px;">
            <p style="color: #666; margin-bottom: 20px;">Please review this application and respond to the vendor directly.</p>
            <a href="mailto:${applicationData.contactEmail}" 
               style="display: inline-block; background: linear-gradient(135deg, #FF6B6B, #4ECDC4); color: white; 
                      padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
              Contact Vendor
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999;">
            <p>This notification was sent from Grubana Event Management</p>
            <p>Visit <a href="https://grubana.com" style="color: #4ECDC4;">grubana.com</a> to manage your events</p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);
    logger.info('Vendor application notification sent successfully', {
      to: organizerData.email,
      eventTitle: applicationData.eventTitle,
      vendorName: applicationData.businessName
    });

    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    logger.error('Error sending vendor application notification:', error);
    throw error;
  }
};

/**
 * Send confirmation email to vendor after application submission
 * @param {Object} applicationData - Vendor application data
 */
export const sendVendorApplicationConfirmation = async (applicationData) => {
  try {
    const equipmentTypes = {
      'food-truck': 'Food Truck',
      'food-trailer': 'Food Trailer',
      'cart': 'Food Cart',
      'catering': 'Catering Setup',
      'other': 'Other'
    };

    const applicationType = equipmentTypes[applicationData.equipmentType] || applicationData.equipmentType;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'flavor@grubana.com';
    
    logger.info('Sending vendor application confirmation', {
      to: applicationData.contactEmail,
      from: fromEmail,
      eventTitle: applicationData.eventTitle,
      vendorName: applicationData.businessName
    });
    
    const msg = {
      to: applicationData.contactEmail,
      from: fromEmail, // Use environment variable
      subject: `Application Received - ${applicationData.eventTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4ECDC4, #44A08D); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Application Received!</h1>
          </div>
          
          <div style="background-color: #f0f8ff; padding: 25px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4ECDC4;">
            <h2 style="color: #333; margin-top: 0;">Thank you for your application!</h2>
            <p>Hi ${applicationData.contactName},</p>
            <p>We've successfully received your vendor application for <strong>${applicationData.eventTitle}</strong>. 
               The event organizer has been notified and will review your application.</p>
          </div>

          <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Application Summary</h2>
            <p><strong>Event:</strong> ${applicationData.eventTitle}</p>
            <p><strong>Date:</strong> ${applicationData.eventDate}</p>
            <p><strong>Time:</strong> ${applicationData.eventTime}</p>
            <p><strong>Location:</strong> ${applicationData.eventLocation}</p>
            <p><strong>Your Business:</strong> ${applicationData.businessName}</p>
            <p><strong>Equipment Type:</strong> ${applicationType}</p>
          </div>

          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">What happens next?</h3>
            <ul style="color: #856404; margin: 0; padding-left: 20px;">
              <li>The event organizer will review your application</li>
              <li>They will contact you directly with their decision</li>
              <li>If accepted, you'll receive event details and setup instructions</li>
              <li>Questions? Feel free to contact the organizer directly</li>
            </ul>
          </div>

          <div style="text-align: center; padding: 20px;">
            <p style="color: #666; margin-bottom: 20px;">Need to make changes to your application?</p>
            <a href="https://grubana.com/vendor-portal" 
               style="display: inline-block; background: linear-gradient(135deg, #4ECDC4, #44A08D); color: white; 
                      padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
              Vendor Portal
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999;">
            <p>This confirmation was sent from Grubana Event Management</p>
            <p>Visit <a href="https://grubana.com" style="color: #4ECDC4;">grubana.com</a> for more information</p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);
    logger.info('Vendor application confirmation sent successfully', {
      to: applicationData.contactEmail,
      eventTitle: applicationData.eventTitle,
      vendorName: applicationData.businessName
    });

    return { success: true, message: 'Confirmation sent successfully' };
  } catch (error) {
    logger.error('Error sending vendor application confirmation:', error);
    throw error;
  }
};
