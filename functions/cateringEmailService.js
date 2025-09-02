import { logger } from "firebase-functions/v2";
import sgMail from "@sendgrid/mail";
import { getConfig } from "./config.js";

/**
 * Send catering request email to truck owner via SendGrid
 * @param {Object} cateringData - Catering request data
 */
export const sendCateringRequestEmail = async (cateringData) => {
  try {
    // Get configuration
    const config = getConfig();
    const sendGridApiKey = config.sendGridApiKey;
    
    if (!sendGridApiKey) {
      logger.error('❌ SENDGRID_API_KEY environment variable not set');
      throw new Error('SendGrid API key not configured');
    }

    logger.info('📧 Initializing SendGrid');
    sgMail.setApiKey(sendGridApiKey);
    
    // Get sender email from environment variable
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@grubana.com';
    logger.info('📧 Using sender email:', fromEmail);
    
    const {
      customerName,
      customerEmail,
      customerPhone,
      eventDate,
      eventTime,
      eventLocation,
      guestCount,
      specialRequests,
      truckName,
      truckOwnerEmail
    } = cateringData;

    logger.info('📧 Sending catering request email', {
      truckName,
      truckOwnerEmail,
      customerEmail
    });

    const emailContent = {
      to: truckOwnerEmail,
      from: {
        email: fromEmail,
        name: 'Grubana - Food Truck Catering'
      },
      replyTo: {
        email: customerEmail,
        name: 'Catering Requestor'
      },
      subject: `🎉 New Catering Request for ${truckName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: #2c6f57; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">🎉 New Catering Request</h1>
            <p style="color: #fff; margin: 10px 0 0 0; font-size: 16px;">for ${truckName}</p>
          </div>
          
          <div style="background-color: #fff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
              You have a new catering request!
            </p>
            
            <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c6f57; margin-top: 0;">Customer Information</h3>
              <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li><strong>Name:</strong> ${customerName}</li>
                <li><strong>Email:</strong> ${customerEmail}</li>
                <li><strong>Phone:</strong> ${customerPhone}</li>
              </ul>
            </div>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">Event Details</h3>
              <ul style="color: #856404; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li><strong>Date:</strong> ${eventDate}</li>
                <li><strong>Time:</strong> ${eventTime}</li>
                <li><strong>Location:</strong> ${eventLocation}</li>
                <li><strong>Estimated Guests:</strong> ${guestCount}</li>
              </ul>
            </div>
            
            ${specialRequests && specialRequests !== 'None' ? `
            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0066cc; margin-top: 0;">Special Requests</h3>
              <p style="color: #0066cc; line-height: 1.6; margin: 0;">${specialRequests}</p>
            </div>
            ` : ''}
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #155724;">📞 Next Steps</h3>
              <p style="color: #155724; line-height: 1.6; margin: 0;">
                Please contact the catering requestor directly at <strong>${customerEmail}</strong> or <strong>${customerPhone}</strong> 
                to discuss pricing, menu options, and availability for their event.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px; text-align: center; font-style: italic;">
              This request was submitted through the Grubana mobile app.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="mailto:${customerEmail}?subject=Re: Catering Request for ${eventDate}" 
                 style="background-color: #2c6f57; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Reply to Customer
              </a>
            </div>
          </div>
        </div>
      `,
      text: `
New Catering Request for ${truckName}

Customer Information:
• Name: ${customerName}
• Email: ${customerEmail}
• Phone: ${customerPhone}

Event Details:
• Date: ${eventDate}
• Time: ${eventTime}
• Location: ${eventLocation}
• Estimated Guests: ${guestCount}

Special Requests:
${specialRequests || 'None'}

Please contact the customer directly to discuss pricing, menu options, and availability.

This request was submitted through the Grubana app.
      `.trim()
    };

    const result = await sgMail.send(emailContent);
    
    logger.info('✅ Catering email sent successfully', {
      messageId: result[0].headers['x-message-id'],
      truckName,
      truckOwnerEmail
    });

    return {
      success: true,
      messageId: result[0].headers['x-message-id']
    };

  } catch (error) {
    logger.error('❌ Failed to send catering email', {
      error: error.message,
      code: error.code,
      response: error.response?.body || error.response,
      status: error.response?.status,
      truckName: cateringData.truckName,
      truckOwnerEmail: cateringData.truckOwnerEmail,
      fromEmail: 'no-reply@grubana.com'
    });

    // Log the full error for debugging
    if (error.response && error.response.body) {
      logger.error('❌ SendGrid detailed error:', error.response.body);
    }

    throw new Error(`Failed to send catering email: ${error.message}`);
  }
};
