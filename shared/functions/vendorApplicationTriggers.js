import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db } from "./config.js";
import { sendVendorApplicationNotification, sendVendorApplicationConfirmation } from "./vendorApplicationEmailService.js";

/**
 * Trigger when a new vendor application is created
 * Sends notification to event organizer and confirmation to vendor
 */
export const onVendorApplicationCreated = onDocumentCreated(
  "vendorApplications/{applicationId}",
  async (event) => {
    try {
      const applicationData = event.data.data();
      const applicationId = event.params.applicationId;

      logger.info('Processing new vendor application', {
        applicationId,
        eventId: applicationData.eventId,
        vendorName: applicationData.businessName,
        fullApplicationData: JSON.stringify(applicationData)
      });

      // Check if eventId exists
      if (!applicationData.eventId) {
        logger.error('No eventId found in vendor application', {
          applicationId,
          applicationData: JSON.stringify(applicationData)
        });
        return;
      }

      // Get event details to find the organizer
      const eventDoc = await db.collection('events').doc(applicationData.eventId).get();
      
      if (!eventDoc.exists) {
        logger.error('Event not found for vendor application', {
          applicationId,
          eventId: applicationData.eventId
        });
        return;
      }

      const eventData = eventDoc.data();
      
      // Get organizer details using organizerId field
      const organizerDoc = await db.collection('users').doc(eventData.organizerId).get();
      
      if (!organizerDoc.exists) {
        logger.error('Event organizer not found', {
          applicationId,
          organizerId: eventData.organizerId
        });
        return;
      }

      const organizerData = organizerDoc.data();

      // Format event date properly
      let formattedDate = 'TBD';
      let formattedTime = eventData.time || 'TBD';
      
      if (eventData.startDate) {
        try {
          // Handle Firestore Timestamp
          const eventDate = eventData.startDate.toDate ? eventData.startDate.toDate() : new Date(eventData.startDate);
          formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (error) {
          logger.error('Error formatting event date', { error: error.message, startDate: eventData.startDate });
          formattedDate = 'Date formatting error';
        }
      }

      // Prepare complete application data with event details
      const completeApplicationData = {
        ...applicationData,
        eventTitle: eventData.title,
        eventDate: formattedDate,
        eventTime: formattedTime,
        eventLocation: eventData.location || eventData.address
      };

      // Send notification to event organizer
      try {
        await sendVendorApplicationNotification(completeApplicationData, organizerData);
        logger.info('Vendor application notification sent to organizer', {
          applicationId,
          organizerEmail: organizerData.email
        });
      } catch (error) {
        logger.error('Failed to send notification to organizer', {
          applicationId,
          organizerEmail: organizerData.email,
          error: error.message
        });
      }

      // Send confirmation to vendor
      try {
        await sendVendorApplicationConfirmation(completeApplicationData);
        logger.info('Vendor application confirmation sent to vendor', {
          applicationId,
          vendorEmail: applicationData.contactEmail
        });
      } catch (error) {
        logger.error('Failed to send confirmation to vendor', {
          applicationId,
          vendorEmail: applicationData.contactEmail,
          error: error.message
        });
      }

      // Update application document with notification status
      await db.collection('vendorApplications').doc(applicationId).update({
        notificationSent: true,
        confirmationSent: true,
        processedAt: new Date()
      });

      logger.info('Vendor application processing completed', {
        applicationId,
        vendorName: applicationData.businessName,
        eventTitle: eventData.title
      });

    } catch (error) {
      logger.error('Error processing vendor application', {
        applicationId: event.params.applicationId,
        error: error.message,
        stack: error.stack
      });
    }
  }
);
