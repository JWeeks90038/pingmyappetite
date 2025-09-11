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
        vendorName: applicationData.businessName
      });

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
      
      // Get organizer details
      const organizerDoc = await db.collection('users').doc(eventData.organizer).get();
      
      if (!organizerDoc.exists) {
        logger.error('Event organizer not found', {
          applicationId,
          organizerId: eventData.organizer
        });
        return;
      }

      const organizerData = organizerDoc.data();

      // Prepare complete application data with event details
      const completeApplicationData = {
        ...applicationData,
        eventTitle: eventData.title,
        eventDate: eventData.date,
        eventTime: eventData.time,
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
