import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { sendCateringRequestEmail } from "./cateringEmailService.js";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

// Initialize Firestore
const db = getFirestore();

/**
 * Firebase Function to handle catering request emails
 * Called from the mobile app when a user submits a catering request
 */
export const sendCateringRequest = onCall(async (request) => {
  try {
    // Validate that user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to send catering requests');
    }

    const { data } = request;
    
    // Validate required fields (removed truckOwnerEmail since we'll fetch it server-side)
    const requiredFields = [
      'customerName',
      'customerEmail', 
      'customerPhone',
      'eventDate',
      'eventTime',
      'eventLocation',
      'guestCount',
      'truckName'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        throw new HttpsError('invalid-argument', `Missing required field: ${field}`);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.customerEmail)) {
      throw new HttpsError('invalid-argument', 'Invalid customer email format');
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

    logger.info('📧 Processing catering request', {
      truckName: data.truckName,
      customerEmail: data.customerEmail,
      truckOwnerEmail: truckOwnerEmail,
      userId: request.auth.uid
    });

    // Send the catering request email
    const result = await sendCateringRequestEmail({
      ...data,
      truckOwnerEmail
    });

    logger.info('✅ Catering request processed successfully', {
      messageId: result.messageId,
      truckName: data.truckName,
      userId: request.auth.uid
    });

    return {
      success: true,
      message: 'Catering request sent successfully',
      messageId: result.messageId
    };

  } catch (error) {
    logger.error('❌ Catering request failed', {
      error: error.message,
      code: error.code,
      userId: request.auth?.uid,
      truckName: request.data?.truckName
    });

    // Re-throw HttpsError for proper client handling
    if (error instanceof HttpsError) {
      throw error;
    }

    // Wrap other errors in HttpsError
    throw new HttpsError('internal', `Failed to send catering request: ${error.message}`);
  }
});
