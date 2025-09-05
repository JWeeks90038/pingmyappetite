// Formspree Referral Notification Service
// This replaces the SendGrid referral notification functionality

const sendReferralNotificationViaFormspree = async (referralData) => {
  try {
    const { referralCode, newUserEmail, newUserName, truckName, selectedPlan, userId } = referralData;
    
    // Create notification content
    const notificationContent = `
🎉 NEW REFERRAL SIGNUP - Arayaki Hibachi

Referral Details:
• Referral Code Used: ${referralCode}
• New User Name: ${newUserName}
• New User Email: ${newUserEmail}
• Business Name: ${truckName || 'Not specified'}
• Selected Plan: ${selectedPlan}
• User ID: ${userId}

30-Day Free Trial: This user will receive a 30-day free trial for their ${selectedPlan} plan subscription.

This notification was automatically sent when someone used the Arayaki Hibachi referral code during signup.

Best regards,
Grubana System
    `;

    // Send to Formspree endpoint
    // Replace 'mblakpqg' with your actual Formspree form ID
    const response = await fetch('https://formspree.io/f/mblakpqg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'flavor@grubana.com',
        subject: `🎯 New Arayaki Hibachi Referral - ${newUserName} (${selectedPlan} plan)`,
        message: notificationContent,
        referralCode: referralCode,
        newUserEmail: newUserEmail,
        newUserName: newUserName,
        truckName: truckName,
        selectedPlan: selectedPlan,
        userId: userId,
        _subject: `🎯 New Arayaki Hibachi Referral - ${newUserName} (${selectedPlan} plan)`,
        // Optional: Add webhook for additional processing
        // _webhook: 'https://your-automation-service.com/process-referral',
      }),
    });

    if (!response.ok) {
      throw new Error(`Formspree request failed: ${response.status}`);
    }

    console.log('Referral notification sent successfully via Formspree');
    return { success: true, message: 'Referral notification sent successfully' };
    
  } catch (error) {
    console.error('Error sending referral notification via Formspree:', error);
    return { success: false, error: error.message };
  }
};

// Main export function
export const sendReferralNotification = async (referralData) => {
  // Validate required fields
  const { referralCode, newUserEmail, newUserName } = referralData;
  
  if (!referralCode || !newUserEmail || !newUserName) {
    throw new Error('Referral code, user email, and user name are required');
  }

  // Only send notification for the specific referral code
  if (referralCode.toLowerCase() !== 'arayaki_hibachi') {
    throw new Error('Invalid referral code');
  }

  return await sendReferralNotificationViaFormspree(referralData);
};

export default sendReferralNotification;
