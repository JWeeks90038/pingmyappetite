// Welcome Email Service - Handles automatic welcome emails after signup
// Integrates with existing Formspree and notification systems

/**
 * Send welcome email for free users immediately after signup
 * Uses Formspree for immediate delivery
 */
export const sendFreeUserWelcomeEmail = async (userData) => {
  try {
    const { email, username, role, plan } = userData;
    
    // Create welcome message based on user role
    const welcomeMessages = {
      customer: {
        subject: '🎉 Welcome to Grubana - Discover Amazing Food Trucks!',
        title: `Welcome to Grubana, ${username}! 🚚🍴`,
        content: `
Thank you for joining the Grubana community! You're now part of the ultimate food truck discovery platform.

As a Foodie Fan, you can:
✅ Discover food trucks near you
✅ Get real-time location updates
✅ Receive notifications about deals and favorites
✅ Save your favorite trucks
✅ Never miss out on great food again!

Get started by exploring trucks in your area and adding your favorites for personalized notifications.

Happy food hunting!
The Grubana Team

P.S. Make sure to enable notifications in your settings to get alerts when your favorite trucks are nearby!
        `
      },
      owner: {
        subject: '🎉 Welcome to Grubana - Start Growing Your Food Truck Business!',
        title: `Welcome to Grubana, ${username}! 🚚💼`,
        content: `
Thank you for joining Grubana! You're now part of a thriving community of mobile food entrepreneurs.

Your Basic Plan includes:
✅ Appear on the Grubana discovery map
✅ Access to your truck dashboard
✅ Manual location updates
✅ Basic customer engagement tools

Next steps to get started:
1. Complete your truck profile in the dashboard
2. Add your menu and photos
3. Update your location to start getting discovered
4. Consider upgrading to Pro or All-Access for advanced features

Ready to grow your business? Visit your dashboard to get started!

The Grubana Team

Questions? Reply to this email or contact us at flavor@grubana.com
        `
      },
      'event-organizer': {
        subject: '🎉 Welcome to Grubana - Connect Amazing Food with Your Events!',
        title: `Welcome to Grubana, ${username}! 🎪🍴`,
        content: `
Welcome to Grubana's Event Organizer platform! You're now equipped to bring amazing food trucks to your events.

As an Event Organizer, you can:
✅ Create and manage events
✅ Connect with verified food trucks
✅ Review vendor applications
✅ Build amazing food experiences for your attendees

Your journey starts now:
1. Access your Event Dashboard
2. Create your first event
3. Start receiving vendor applications
4. Build unforgettable food experiences

Visit your dashboard to create your first event!

The Grubana Events Team

P.S. Consider our paid plans for unlimited events and premium features!
        `
      }
    };

    const messageConfig = welcomeMessages[role] || welcomeMessages.customer;
    
    // Send via Formspree (using existing form ID)
    const response = await fetch('https://formspree.io/f/mpwlvzaj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: messageConfig.subject,
        message: messageConfig.content,
        username: username,
        user_role: role,
        user_plan: plan,
        email_type: 'welcome_free_user',
        _subject: messageConfig.subject,
        _replyto: 'flavor@grubana.com'
      }),
    });

    if (!response.ok) {
      throw new Error(`Formspree request failed: ${response.status}`);
    }

    console.log(`✅ Free user welcome email sent to ${email} (${role})`);
    return { success: true, method: 'formspree' };
    
  } catch (error) {
    console.error('❌ Error sending free user welcome email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email for paid users after successful payment
 * This will be called from Firebase Functions after Stripe webhook
 */
export const sendPaidUserWelcomeEmail = async (userData, subscriptionData) => {
  try {
    const { email, username, role, plan } = userData;
    const { subscriptionId, customerId } = subscriptionData;
    
    // Create premium welcome messages
    const premiumWelcomeMessages = {
      owner: {
        pro: {
          subject: '🎉 Welcome to Grubana Pro - Your Business Growth Starts Now!',
          content: `
Congratulations ${username}! Your Grubana Pro subscription is now active! 🚚💼

Your Pro Plan ($9.99/month) includes:
✅ Real-time GPS tracking for customers
✅ Advanced analytics and insights
✅ Priority placement in search results
✅ Customer notification system
✅ Enhanced profile features
✅ Mobile app integration

Your 30-day free trial has started! Here's what to do next:

1. 📍 Enable real-time GPS tracking in your dashboard
2. 📊 Set up your analytics preferences
3. 📸 Upload high-quality photos of your truck and food
4. 📱 Download the Grubana mobile app for easy updates
5. 🔔 Configure your notification preferences

Start maximizing your Pro benefits today: https://grubana.com/dashboard

Questions about your Pro features? We're here to help at flavor@grubana.com

Welcome to the Pro community!
The Grubana Pro Team
          `
        },
        'all-access': {
          subject: '🎉 Welcome to Grubana All-Access - The Ultimate Food Truck Experience!',
          content: `
Welcome to the top tier, ${username}! Your All-Access subscription is now active! 🚚👑

Your All-Access Plan ($19.99/month) includes EVERYTHING:
✅ All Pro features
✅ Advanced customer targeting
✅ Premium analytics dashboard
✅ Social media integration
✅ Email marketing tools
✅ Priority customer support
✅ White-label options
✅ API access for custom integrations

Your 30-day free trial has started! Here's your premium roadmap:

1. 🎯 Set up advanced customer targeting
2. 📊 Access your premium analytics dashboard
3. 📱 Integrate your social media accounts
4. 📧 Configure email marketing campaigns
5. 🏷️ Explore white-label customization options
6. 🔗 Consider API integrations for your website

Unlock the full potential: https://grubana.com/dashboard

Your dedicated support team is ready to help you succeed: flavor@grubana.com

Welcome to All-Access excellence!
The Grubana Elite Team
          `
        }
      },
      'event-organizer': {
        'event-starter': {
          subject: '🎉 Welcome to Event Starter - Your Events Just Got Better!',
          content: `
Congratulations ${username}! Your Event Starter subscription is now active! 🎪🍴

Your Event Starter Plan ($29.99/month) includes:
✅ Up to 3 events per month
✅ Vendor application management
✅ Basic event promotion
✅ Email notifications
✅ Customer support

Your 30-day free trial has started! Get your first event rolling:

1. 📅 Create your first event in the dashboard
2. 📝 Set up vendor requirements and application process
3. 📢 Share your event to start receiving applications
4. 📧 Manage vendor communications
5. 🎉 Execute your amazing event!

Start creating memorable events: https://grubana.com/event-dashboard

Need help planning your first event? Contact us at flavor@grubana.com

Happy event organizing!
The Grubana Events Team
          `
        },
        'event-pro': {
          subject: '🎉 Welcome to Event Pro - Unlimited Event Possibilities!',
          content: `
Welcome to the next level, ${username}! Your Event Pro subscription is now active! 🎪⭐

Your Event Pro Plan ($49.99/month) includes:
✅ Unlimited events
✅ Advanced vendor matching
✅ Premium event promotion
✅ Analytics and reporting
✅ Priority vendor access
✅ Custom branding options

Your 30-day free trial has started! Here's your pro roadmap:

1. 🎯 Set up advanced vendor matching preferences
2. 📊 Access your event analytics dashboard
3. 🎨 Customize your event branding
4. 📢 Utilize premium promotion features
5. 🤝 Connect with priority vendors
6. 📈 Track your event success metrics

Maximize your event potential: https://grubana.com/event-dashboard

Your Pro success team is here to help: flavor@grubana.com

Welcome to Pro-level events!
The Grubana Events Pro Team
          `
        },
        'event-premium': {
          subject: '🎉 Welcome to Event Premium - The Ultimate Event Experience!',
          content: `
Welcome to the pinnacle, ${username}! Your Event Premium subscription is now active! 🎪👑

Your Event Premium Plan ($99.99/month) includes EVERYTHING:
✅ All Pro features
✅ White-label event platform
✅ API access and integrations
✅ Dedicated account manager
✅ Custom vendor contracts
✅ Advanced analytics suite
✅ Priority everything!

Your 30-day free trial has started! Here's your premium experience:

1. 🏷️ Set up your white-label event platform
2. 🔗 Explore API integrations for your systems
3. 👨‍💼 Schedule a call with your account manager
4. 📋 Access premium vendor contract templates
5. 📊 Dive into your advanced analytics suite
6. 🎯 Plan your enterprise-level events

Your dedicated account manager will contact you within 24 hours to help you get the most from Premium.

Enterprise-level events start here: https://grubana.com/event-dashboard

Direct access to your Premium team: flavor@grubana.com

Welcome to Premium excellence!
The Grubana Enterprise Team
          `
        }
      }
    };

    const messageConfig = premiumWelcomeMessages[role]?.[plan];
    
    if (!messageConfig) {
      console.warn(`⚠️ No premium welcome message config for role: ${role}, plan: ${plan}`);
      return { success: false, error: 'No message configuration found' };
    }

    // Send via Formspree with premium user context
    const response = await fetch('https://formspree.io/f/mpwlvzaj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: messageConfig.subject,
        message: messageConfig.content,
        username: username,
        user_role: role,
        user_plan: plan,
        subscription_id: subscriptionId,
        customer_id: customerId,
        email_type: 'welcome_paid_user',
        trial_status: 'active',
        _subject: messageConfig.subject,
        _replyto: 'flavor@grubana.com'
      }),
    });

    if (!response.ok) {
      throw new Error(`Formspree request failed: ${response.status}`);
    }

    console.log(`✅ Paid user welcome email sent to ${email} (${role} - ${plan})`);
    return { success: true, method: 'formspree', plan: plan };
    
  } catch (error) {
    console.error('❌ Error sending paid user welcome email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send SMS welcome notification if user has phone number and SMS enabled
 */
export const sendWelcomeSMS = async (userData) => {
  try {
    const { phone, username, role, notificationPreferences, smsConsent } = userData;
    
    // Check if SMS notifications are enabled and user consented during signup
    const hasValidSMSPermission = (
      (notificationPreferences?.smsNotifications || smsConsent) && // Either setting enabled or explicit consent
      phone && 
      phone.length > 0
    );
    
    if (!hasValidSMSPermission) {
      console.log('📱 SMS welcome skipped - no consent, notifications disabled, or no phone number');
      return { success: false, reason: 'SMS not consented to or no phone' };
    }

    // Import Twilio service
    const { sendNotificationSMS, validatePhoneNumber } = await import('./twilioService.js');
    
    // Validate phone number
    if (!validatePhoneNumber(phone)) {
      console.warn('📱 Invalid phone number format for SMS welcome');
      return { success: false, error: 'Invalid phone number' };
    }

    // Create SMS welcome messages
    const smsMessages = {
      customer: `🎉 Welcome to Grubana, ${username}! Discover amazing food trucks near you. Enable location for personalized notifications. Reply STOP to opt out.`,
      owner: `🎉 Welcome to Grubana, ${username}! Your truck is now discoverable. Visit your dashboard to complete setup and start growing your business!`,
      'event-organizer': `🎉 Welcome to Grubana Events, ${username}! Start creating amazing food experiences. Visit your dashboard to plan your first event!`
    };

    const smsMessage = smsMessages[role] || smsMessages.customer;
    
    // Send SMS
    const result = await sendNotificationSMS(phone, 'Welcome to Grubana!', smsMessage);
    
    if (result.success) {
      console.log(`📱 Welcome SMS sent to ${phone} for user: ${username}`);
      return { success: true, method: 'sms' };
    } else {
      console.error(`📱 Failed to send welcome SMS: ${result.error}`);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('📱 Error sending welcome SMS:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Main welcome notification orchestrator
 * Determines which welcome messages to send based on user type and payment status
 */
export const sendWelcomeNotifications = async (userData, isPaidUser = false, subscriptionData = null) => {
  const results = {
    email: null,
    sms: null,
    timestamp: new Date().toISOString()
  };

  try {
    // Send appropriate email
    if (isPaidUser && subscriptionData) {
      results.email = await sendPaidUserWelcomeEmail(userData, subscriptionData);
    } else {
      results.email = await sendFreeUserWelcomeEmail(userData);
    }

    // Send SMS if user preferences allow
    results.sms = await sendWelcomeSMS(userData);

    console.log('🎉 Welcome notification results:', {
      user: userData.username,
      email: userData.email,
      role: userData.role,
      plan: userData.plan,
      isPaid: isPaidUser,
      results: results
    });

    return results;
    
  } catch (error) {
    console.error('❌ Error in welcome notification orchestrator:', error);
    return {
      email: { success: false, error: error.message },
      sms: { success: false, error: error.message },
      timestamp: new Date().toISOString()
    };
  }
};

export default {
  sendFreeUserWelcomeEmail,
  sendPaidUserWelcomeEmail,
  sendWelcomeSMS,
  sendWelcomeNotifications
};
