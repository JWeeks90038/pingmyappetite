import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { sendFestivalRequestEmail } from "./festivalEmailService.js";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

// Initialize Firestore
const db = getFirestore();

/**
 * Firebase Function to handle festival booking request emails
 * Called from the mobile app when an event organizer submits a festival booking request
 */
export const sendFestivalRequest = onCall(async (request) => {
  try {
    // Validate that user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to send festival booking requests');
    }

    const { data } = request;
    
    // Validate required fields
    const requiredFields = [
      'organizerName',
      'organizerEmail', 
      'organizerPhone',
      'eventName',
      'eventDate',
      'eventTime',
      'eventLocation',
      'expectedAttendance',
      'truckName'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        throw new HttpsError('invalid-argument', `Missing required field: ${field}`);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.organizerEmail)) {
      throw new HttpsError('invalid-argument', 'Invalid organizer email format');
    }

    // Fetch truck owner email from Firestore using ownerId
    let truckOwnerEmail = null;
    if (data.ownerId) {
      try {
        logger.info('🔍 Fetching owner email for ownerId:', data.ownerId);
        const ownerDoc = await db.collection('users').doc(data.ownerId).get();
        if (ownerDoc.exists) {
          const ownerData = ownerDoc.data();
          truckOwnerEmail = ownerData.email;
          logger.info('✅ Found owner email from Firestore:', truckOwnerEmail);
        } else {
          logger.error('❌ Owner document not found for ownerId:', data.ownerId);
        }
      } catch (error) {
        logger.error('❌ Error fetching owner data from Firestore:', error);
      }
    }

    // If no ownerId provided, try to get from truckOwnerEmail field (fallback)
    if (!truckOwnerEmail && data.truckOwnerEmail) {
      truckOwnerEmail = data.truckOwnerEmail;
      logger.info('✅ Using provided truckOwnerEmail:', truckOwnerEmail);
    }

    if (!truckOwnerEmail) {
      throw new HttpsError('invalid-argument', 'Unable to find truck owner email. Please try again.');
    }

    // Validate truck owner email format
    if (!emailRegex.test(truckOwnerEmail)) {
      throw new HttpsError('invalid-argument', 'Invalid truck owner email format');
    }

    logger.info('📧 Processing festival booking request', {
      truckName: data.truckName,
      organizerEmail: data.organizerEmail,
      truckOwnerEmail: truckOwnerEmail,
      eventName: data.eventName,
      userId: request.auth.uid
    });

    // Store the festival booking request in Firestore
    try {
      const festivalRequestData = {
        ...data,
        truckOwnerEmail,
        organizerId: request.auth.uid,
        createdAt: new Date(),
        status: 'pending'
      };

      const docRef = await db.collection('festivalBookingRequests').add(festivalRequestData);
      logger.info('✅ Festival booking request stored in Firestore with ID:', docRef.id);
    } catch (firestoreError) {
      logger.error('❌ Error storing festival booking request in Firestore:', firestoreError);
      // Don't throw error here, continue with email sending even if Firestore fails
    }

    // Send the festival booking request email
    const result = await sendFestivalRequestEmail({
      ...data,
      truckOwnerEmail
    });

    logger.info('✅ Festival booking request processed successfully', {
      messageId: result.messageId,
      truckName: data.truckName,
      eventName: data.eventName,
      userId: request.auth.uid
    });

    return {
      success: true,
      message: 'Festival booking request sent successfully',
      messageId: result.messageId
    };

  } catch (error) {
    logger.error('❌ Festival booking request failed', {
      error: error.message,
      code: error.code,
      userId: request.auth?.uid,
      truckName: request.data?.truckName,
      eventName: request.data?.eventName
    });

    // Re-throw HttpsError for proper client handling
    if (error instanceof HttpsError) {
      throw error;
    }

    // Wrap other errors in HttpsError
    throw new HttpsError('internal', `Failed to send festival booking request: ${error.message}`);
  }
});
