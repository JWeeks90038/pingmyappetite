import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { sendWelcomeEmail, sendAdminSignupNotification } from "./welcomeEmailService.js";

/**
 * Firebase Function that triggers when a new user document is created
 * Sends a welcome email based on the user type
 */
export const sendWelcomeEmailOnSignup = onDocumentCreated("users/{userId}", async (event) => {
  try {
    const userData = event.data?.data();
    const userId = event.params.userId;

    if (!userData) {
      logger.error(`No user data found for user ${userId}`);
      return;
    }

    if (!userData.email) {
      logger.error(`No email found for user ${userId}`);
      return;
    }

    // Determine user type based on the data structure
    let userType = 'customer'; // default
    
    if (userData.role) {
      userType = userData.role;
    } else if (userData.ownerName || userData.truckName) {
      userType = 'owner';
    } else if (userData.organizationName || userData.contactName) {
      userType = 'organizer';
    }

    logger.info(`🔍 DEBUG - User signup detected:`, {
      userId,
      email: userData.email,
      detectedRole: userData.role,
      finalUserType: userType,
      hasOwnerName: !!userData.ownerName,
      hasTruckName: !!userData.truckName,
      hasOrgName: !!userData.organizationName
    });

    logger.info(`Sending welcome email to new ${userType}: ${userData.email}`);

    // Send welcome email to user
    const welcomeResult = await sendWelcomeEmail(userData, userType);
    
    if (welcomeResult.success) {
      logger.info(`Welcome email sent successfully to ${userData.email}`);
    } else {
      logger.error(`Failed to send welcome email to ${userData.email}: ${welcomeResult.error}`);
    }

    // Send admin notification email
    logger.info(`Sending admin notification for new ${userType}: ${userData.email}`);
    const adminResult = await sendAdminSignupNotification(userData, userType);
    
    if (adminResult.success) {
      logger.info(`Admin notification sent successfully for ${userData.email}`);
    } else {
      logger.error(`Failed to send admin notification for ${userData.email}: ${adminResult.error}`);
    }

  } catch (error) {
    logger.error("Error in sendWelcomeEmailOnSignup function:", error);
  }
});

/**
 * Manual function to send welcome email (for testing or manual triggers)
 */
export const sendWelcomeEmailManual = onDocumentCreated("manualWelcomeEmails/{docId}", async (event) => {
  try {
    const data = event.data?.data();
    
    if (!data || !data.userId || !data.userType) {
      logger.error("Invalid manual welcome email request");
      return;
    }

    // This would typically fetch user data from Firestore
    // For now, we'll use the provided data
    const result = await sendWelcomeEmail(data.userData, data.userType);
    
    if (result.success) {
      logger.info(`Manual welcome email sent successfully to ${data.userData.email}`);
    } else {
      logger.error(`Failed to send manual welcome email: ${result.error}`);
    }

  } catch (error) {
    logger.error("Error in sendWelcomeEmailManual function:", error);
  }
});
