// Formspree Welcome Email Service
// This would replace the SendGrid welcome email functionality

const sendWelcomeEmailViaFormspree = async (userEmail, username, plan) => {
  try {
    // Create a separate Formspree form for welcome emails
    const response = await fetch('https://formspree.io/f/YOUR_WELCOME_EMAIL_FORM_ID', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: userEmail,
        username: username,
        plan: plan,
        _subject: `Welcome to Grubana - ${plan} Plan!`,
        _template: plan, // You can use this to trigger different templates
        // Formspree can use webhooks to trigger other services
        _webhook: 'https://your-automation-service.com/send-welcome-email',
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error sending welcome email via Formspree:', error);
    return false;
  }
};

// Usage in signup process
export const sendWelcomeEmail = async (email, username, plan) => {
  // Option 1: Direct Formspree submission
  await sendWelcomeEmailViaFormspree(email, username, plan);
  
  // Option 2: Use Formspree + Zapier/Make.com automation
  // Formspree can trigger Zapier which can send rich HTML emails
};

export default sendWelcomeEmail;
