import { onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';
import { logger } from 'firebase-functions';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Custom password reset service using SendGrid
 * Generates secure reset tokens and sends emails from verified domain
 */
export const sendCustomPasswordReset = onCall(async (request) => {
  try {
    const { email } = request.data;
    
    if (!email) {
      throw new Error('Email is required');
    }

    // Verify user exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      // Don't reveal if email exists for security
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return { success: true, message: 'If this email exists, a reset link has been sent.' };
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = Date.now() + (60 * 60 * 1000); // 1 hour expiry

    // Store reset token in Firestore
    await admin.firestore().collection('passwordResetTokens').doc(userRecord.uid).set({
      token: resetToken,
      email: email,
      expiresAt: new Date(resetExpiry),
      createdAt: new Date(),
      used: false
    });

    // Create reset URL pointing to your domain
    const resetUrl = `https://foodtruckfinder-27eba.web.app/reset-password.html?token=${resetToken}&uid=${userRecord.uid}`;

    // Email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Grubana Password</title>
        <style>
          .email-container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #2c6f57; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { 
            display: inline-block; 
            background-color: #2c6f57; 
            color: white; 
            padding: 12px 25px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>🍽️ Grubana</h1>
            <h2>Password Reset Request</h2>
          </div>
          
          <div class="content">
            <p>Hello,</p>
            
            <p>We received a request to reset your Grubana account password. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Your Password</a>
            </div>
            
            <p><strong>This link will expire in 1 hour.</strong></p>
            
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <p>For security, this link can only be used once.</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="font-size: 12px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="word-break: break-all;">${resetUrl}</span>
            </p>
          </div>
          
          <div class="footer">
            <p>© 2025 Grubana - Your Food Truck Finder</p>
            <p>This email was sent from our verified domain to ensure security.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Reset Your Grubana Password

Hello,

We received a request to reset your Grubana account password. If you made this request, visit this link to reset your password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

For security, this link can only be used once.

© 2025 Grubana - Your Food Truck Finder
    `;

    // Send email via SendGrid
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'flavor@grubana.com',
        name: 'Grubana'
      },
      subject: 'Reset Your Grubana Password',
      text: emailText,
      html: emailHtml,
      // Custom tracking
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false }
      }
    };

    await sgMail.send(msg);

    logger.info(`Password reset email sent successfully to: ${email}`);
    
    return { 
      success: true, 
      message: 'If this email exists, a reset link has been sent.' 
    };

  } catch (error) {
    logger.error('Error in sendCustomPasswordReset:', error);
    throw new Error('Failed to send password reset email. Please try again.');
  }
});

/**
 * Verify and consume password reset token
 */
export const verifyPasswordResetToken = onCall(async (request) => {
  try {
    const { token, uid } = request.data;
    
    if (!token || !uid) {
      throw new Error('Token and UID are required');
    }

    // Get token from Firestore
    const tokenDoc = await admin.firestore()
      .collection('passwordResetTokens')
      .doc(uid)
      .get();

    if (!tokenDoc.exists) {
      throw new Error('Invalid or expired reset token');
    }

    const tokenData = tokenDoc.data();

    // Verify token matches and is not expired or used
    if (tokenData.token !== token || 
        tokenData.used || 
        new Date() > tokenData.expiresAt.toDate()) {
      throw new Error('Invalid or expired reset token');
    }

    // Mark token as used
    await admin.firestore()
      .collection('passwordResetTokens')
      .doc(uid)
      .update({ used: true, usedAt: new Date() });

    return { 
      success: true, 
      email: tokenData.email,
      message: 'Token verified successfully' 
    };

  } catch (error) {
    logger.error('Error in verifyPasswordResetToken:', error);
    throw new Error('Invalid or expired reset token');
  }
});

/**
 * Complete password reset with new password
 */
export const completePasswordReset = onCall(async (request) => {
  try {
    const { token, uid, newPassword } = request.data;
    
    if (!token || !uid || !newPassword) {
      throw new Error('Token, UID, and new password are required');
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Verify token one more time
    const tokenDoc = await admin.firestore()
      .collection('passwordResetTokens')
      .doc(uid)
      .get();

    if (!tokenDoc.exists) {
      throw new Error('Invalid reset session');
    }

    const tokenData = tokenDoc.data();

    if (tokenData.token !== token || !tokenData.used) {
      throw new Error('Invalid reset session');
    }

    // Update user password in Firebase Auth
    await admin.auth().updateUser(uid, {
      password: newPassword
    });

    // Delete the used token
    await admin.firestore()
      .collection('passwordResetTokens')
      .doc(uid)
      .delete();

    logger.info(`Password reset completed successfully for UID: ${uid}`);

    return { 
      success: true, 
      message: 'Password reset successfully' 
    };

  } catch (error) {
    logger.error('Error in completePasswordReset:', error);
    throw new Error('Failed to reset password. Please try again.');
  }
});
