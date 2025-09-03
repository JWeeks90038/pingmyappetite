import { logger } from "firebase-functions/v2";
import sgMail from "@sendgrid/mail";
import { getConfig } from "./config.js";

/**
 * Send festival booking request email to truck owner via SendGrid
 * @param {Object} festivalData - Festival booking request data
 */
export const sendFestivalRequestEmail = async (festivalData) => {
  try {
    // Get configuration
    const config = getConfig();
    const sendGridApiKey = config.sendGridApiKey;
    
    if (!sendGridApiKey) {
      logger.error('❌ SENDGRID_API_KEY environment variable not set');
      throw new Error('SendGrid API key not configured');
    }

    logger.info('📧 Initializing SendGrid for festival request');
    sgMail.setApiKey(sendGridApiKey);
    
    // Use flavor@grubana.com as requested
    const fromEmail = 'flavor@grubana.com';
    logger.info('📧 Using sender email:', fromEmail);
    
    const {
      organizerName,
      organizerEmail,
      organizerPhone,
      eventName,
      eventDate,
      eventTime,
      eventLocation,
      eventAddress,
      expectedAttendance,
      eventDuration,
      spacesAvailable,
      electricityProvided,
      waterProvided,
      boothFee,
      salesPercentage,
      eventDescription,
      specialRequirements,
      truckName,
      truckOwnerEmail
    } = festivalData;

    logger.info('📧 Sending festival booking request email', {
      truckName,
      truckOwnerEmail,
      organizerEmail,
      eventName
    });

    const emailContent = {
      to: truckOwnerEmail,
      from: {
        email: fromEmail,
        name: 'Grubana - Festival Bookings'
      },
      replyTo: {
        email: organizerEmail,
        name: organizerName
      },
      subject: `🎪 Festival Booking Request for ${truckName} - ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: #7c2d12; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">🎪 Festival Booking Request</h1>
            <p style="color: #fff; margin: 10px 0 0 0; font-size: 16px;">for ${truckName}</p>
          </div>
          
          <div style="background-color: #fff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
              🎉 You have a new festival booking request from <strong>${organizerName}</strong>!
            </p>
            
            <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #7c2d12; margin-top: 0;">📋 Organizer Information</h3>
              <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li><strong>Organization/Contact:</strong> ${organizerName}</li>
                <li><strong>Email:</strong> ${organizerEmail}</li>
                <li><strong>Phone:</strong> ${organizerPhone}</li>
              </ul>
            </div>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">🎪 Event Details</h3>
              <ul style="color: #856404; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li><strong>Event Name:</strong> ${eventName}</li>
                <li><strong>Date:</strong> ${eventDate}</li>
                <li><strong>Time:</strong> ${eventTime}</li>
                <li><strong>Location:</strong> ${eventLocation}</li>
                ${eventAddress ? `<li><strong>Address:</strong> ${eventAddress}</li>` : ''}
                <li><strong>Expected Attendance:</strong> ${expectedAttendance}</li>
                ${eventDuration ? `<li><strong>Duration:</strong> ${eventDuration}</li>` : ''}
              </ul>
            </div>
            
            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0066cc; margin-top: 0;">🏪 Vendor Information</h3>
              <ul style="color: #0066cc; line-height: 1.8; margin: 0; padding-left: 20px;">
                ${spacesAvailable ? `<li><strong>Available Spaces:</strong> ${spacesAvailable}</li>` : ''}
                <li><strong>Electricity:</strong> ${electricityProvided ? '✅ Provided' : '❌ Not provided'}</li>
                <li><strong>Water Access:</strong> ${waterProvided ? '✅ Provided' : '❌ Not provided'}</li>
                ${boothFee ? `<li><strong>Booth Fee:</strong> ${boothFee}</li>` : ''}
                ${salesPercentage ? `<li><strong>Sales Percentage:</strong> ${salesPercentage}</li>` : ''}
              </ul>
            </div>
            
            ${eventDescription ? `
            <div style="background-color: #f0fff0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d5a2d; margin-top: 0;">📖 Event Description</h3>
              <p style="color: #2d5a2d; line-height: 1.6; margin: 0;">${eventDescription}</p>
            </div>
            ` : ''}
            
            ${specialRequirements ? `
            <div style="background-color: #ffe7e7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #b30000; margin-top: 0;">⚠️ Special Requirements</h3>
              <p style="color: #b30000; line-height: 1.6; margin: 0;">${specialRequirements}</p>
            </div>
            ` : ''}
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #155724;">📞 Next Steps</h3>
              <p style="color: #155724; line-height: 1.6; margin: 0;">
                Please contact ${organizerName} directly at <strong>${organizerEmail}</strong> or <strong>${organizerPhone}</strong> 
                to discuss your participation in this festival, including booth setup, menu options, and any questions about the event details.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px; text-align: center; font-style: italic;">
              This festival booking request was submitted through the Grubana mobile app.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="mailto:${organizerEmail}?subject=Re: Festival Booking Request - ${eventName}" 
                 style="background-color: #7c2d12; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Contact Event Organizer
              </a>
            </div>
          </div>
        </div>
      `,
      text: `
Festival Booking Request for ${truckName}

Event: ${eventName}

Organizer Information:
• Organization/Contact: ${organizerName}
• Email: ${organizerEmail}
• Phone: ${organizerPhone}

Event Details:
• Event Name: ${eventName}
• Date: ${eventDate}
• Time: ${eventTime}
• Location: ${eventLocation}
${eventAddress ? `• Address: ${eventAddress}` : ''}
• Expected Attendance: ${expectedAttendance}
${eventDuration ? `• Duration: ${eventDuration}` : ''}

Vendor Information:
${spacesAvailable ? `• Available Spaces: ${spacesAvailable}` : ''}
• Electricity: ${electricityProvided ? 'Provided' : 'Not provided'}
• Water Access: ${waterProvided ? 'Provided' : 'Not provided'}
${boothFee ? `• Booth Fee: ${boothFee}` : ''}
${salesPercentage ? `• Sales Percentage: ${salesPercentage}` : ''}

${eventDescription ? `Event Description:\n${eventDescription}\n` : ''}
${specialRequirements ? `Special Requirements:\n${specialRequirements}\n` : ''}

Please contact the event organizer directly to discuss your participation in this festival.

This request was submitted through the Grubana app.
      `.trim()
    };

    const result = await sgMail.send(emailContent);
    
    logger.info('✅ Festival booking email sent successfully', {
      messageId: result[0].headers['x-message-id'],
      truckName,
      truckOwnerEmail,
      eventName
    });

    return {
      success: true,
      messageId: result[0].headers['x-message-id']
    };

  } catch (error) {
    logger.error('❌ Failed to send festival booking email', {
      error: error.message,
      code: error.code,
      response: error.response?.body || error.response,
      status: error.response?.status,
      truckName: festivalData.truckName,
      truckOwnerEmail: festivalData.truckOwnerEmail,
      eventName: festivalData.eventName,
      fromEmail: 'flavor@grubana.com'
    });

    // Log the full error for debugging
    if (error.response && error.response.body) {
      logger.error('❌ SendGrid detailed error:', error.response.body);
    }

    throw new Error(`Failed to send festival booking email: ${error.message}`);
  }
};
