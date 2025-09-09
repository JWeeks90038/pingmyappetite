import { logger } from "firebase-functions/v2";
import sgMail from "@sendgrid/mail";

// Initialize SendGrid with API key from environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send welcome email via SendGrid
 * @param {Object} userData - User data for personalization
 * @param {string} userType - Type of user (customer, owner, organizer)
 */
export const sendWelcomeEmail = async (userData, userType) => {
  try {
    const welcomeTemplates = {
      customer: {
        subject: "Welcome to Grubana - Start Finding Amazing Food Trucks",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: #2c6f57; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 28px;">Welcome to Grubana! </h1>
            </div>
            
            <div style="background-color: #fff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
              <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                Hi ${userData.username || userData.name || 'there'}!
              </p>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                You're now part of our amazing food truck community! Here's what you can do:
              </p>
              
              <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li> <strong>Send pings</strong> to find nearby food trucks</li>
                  <li> <strong>Discover events</strong> and food truck gatherings</li>
                  <li> <strong>Rate and review</strong> your favorite trucks</li>
                  <li> <strong>Get notifications</strong> when trucks are in your area</li>
                </ul>
              </div>
              
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h3 style="margin-top: 0; color: #856404;"> We're Just Getting Started!</h3>
                <p style="color: #856404; line-height: 1.6; margin: 0;">
                  Grubana is new and we're actively onboarding food trucks to create more activity on the maps. 
                  You might see fewer trucks initially, but we're growing every day! Thank you for being an early adopter 
                  and helping us build something amazing together.
                </p>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Your account is ready to go! Download our mobile app or visit our website to start exploring.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://grubana.com" style="background-color: #2c6f57; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Start Food Hunting!
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Need help? Just reply to this email or use the Contact Us feature in your account.
              </p>
              
              <p style="color: #333; font-weight: bold;">Happy food hunting!</p>
              <p style="color: #2c6f57; font-weight: bold;">The Grubana Team</p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <div style="text-align: center;">
                <p style="color: #999; font-size: 14px; margin: 10px 0;">
                  Follow us for the latest updates
                </p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">
                  🌐 <a href="https://grubana.com" style="color: #2c6f57;">grubana.com</a> | 
                  📧 <a href="mailto:flavor@grubana.com" style="color: #2c6f57;">flavor@grubana.com</a>
                </p>
              </div>
            </div>
          </div>
        `
      },
      owner: {
        subject: "Welcome to Grubana - Grow Your Food Truck Business",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: #2c6f57; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 28px;">Welcome to Grubana!</h1>
            </div>
            
            <div style="background-color: #fff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
              <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                Hi ${userData.ownerName || userData.name || 'there'}!
              </p>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Thank you for joining our food truck platform. You're now ready to:
              </p>
              
              <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li> <strong>Go live</strong> and share your location with hungry customers</li>
                  <li> <strong>Receive pings</strong> from customers looking for food</li>
                  <li> <strong>Track</strong> your business analytics</li>
                  <li> <strong>Participate</strong> in food truck events</li>
                  <li> <strong>Grow</strong> your customer base</li>
                </ul>
              </div>
              
              <div style="background-color: ${userData.plan === 'premium' ? '#fff3cd' : '#e8f5e8'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${userData.plan === 'premium' ? '#ffc107' : '#28a745'};">
                <h3 style="margin-top: 0; color: #333;">${userData.plan === 'premium' ? ' Premium Features Unlocked:' : ' Starter Plan Active:'}</h3>
                ${userData.plan === 'premium' ? 
                  `<ul style="color: #333; line-height: 1.6; margin: 10px 0; padding-left: 20px;">
                    <li>Advanced analytics and insights</li>
                    <li>Priority event placement</li>
                    <li>Enhanced customer engagement tools</li>
                    <li>Premium support</li>
                  </ul>` : 
                  `<ul style="color: #333; line-height: 1.6; margin: 10px 0; padding-left: 20px;">
                    <li>Basic location sharing</li>
                    <li>Customer ping notifications</li>
                    <li>Event participation</li>
                    <li>Upgrade anytime for premium features</li>
                  </ul>`}
              </div>
              
              <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
                <h3 style="margin-top: 0; color: #1565c0;">🚀 Welcome to Our Growing Community!</h3>
                <p style="color: #1565c0; line-height: 1.6; margin: 0;">
                  Grubana is new and we're actively onboarding food trucks like yours to create a vibrant marketplace. 
                  As an early partner, you'll help shape our platform and be part of building something special from the ground up. 
                  We're here to support your success every step of the way!
                </p>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Ready to get started? Log in to your dashboard and set up your truck profile.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://grubana.com/owner-dashboard" style="background-color: #2c6f57; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Access Your Dashboard
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Questions? We're here to help! Use the Contact Support feature or reply to this email.
              </p>
              
              <p style="color: #333; font-weight: bold;">Let's grow your business together!</p>
              <p style="color: #2c6f57; font-weight: bold;">The Grubana Team</p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <div style="text-align: center;">
                <p style="color: #999; font-size: 14px; margin: 10px 0;">
                  Business Support
                </p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">
                  🌐 <a href="https://grubana.com" style="color: #2c6f57;">grubana.com</a> | 
                  📧 <a href="mailto:flavor@grubana.com" style="color: #2c6f57;">flavor@grubana.com</a>
                </p>
              </div>
            </div>
          </div>
        `
      },
      organizer: {
        subject: "Welcome to Grubana - Create Amazing Food Truck Events",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: #2c6f57; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 28px;">Welcome to Grubana Events! </h1>
            </div>
            
            <div style="background-color: #fff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
              <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                Hi ${userData.contactName || userData.name || 'there'}!
              </p>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Thank you for joining our platform. As an event organizer, you can now:
              </p>
              
              <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li> <strong>Create and manage</strong> food truck events</li>
                  <li> <strong>Schedule</strong> festivals and markets</li>
                  <li> <strong>Invite</strong> food trucks to your events</li>
                  <li> <strong>Engage</strong> with the food truck community</li>
                  <li> <strong>Track</strong> event success and attendance</li>
                </ul>
              </div>
              
              ${userData.organizationType ? `
                <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #333;"><strong>Organization:</strong> ${userData.organizationType}</p>
                </div>
              ` : ''}
              
              ${userData.description ? `
                <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #333;"><strong>About:</strong> ${userData.description}</p>
                </div>
              ` : ''}
              
              <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9c27b0;">
                <h3 style="margin-top: 0; color: #7b1fa2;">🚀 Building the Future of Food Events!</h3>
                <p style="color: #7b1fa2; line-height: 1.6; margin: 0;">
                  Grubana is new and we're actively onboarding food trucks to create exciting events and opportunities. 
                  As an early event organizer, you're helping us build a thriving community that connects amazing food 
                  with great events. Together, we're creating something special!
                </p>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Your event organizing tools are ready! Log in to start creating your first event.
              </p>
              
              ${userData.referralCode === 'Arayaki_Hibachi' ? `
                <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                  <h3 style="margin-top: 0; color: #333;">🎁 Special Welcome!</h3>
                  <p style="margin-bottom: 0; color: #333;">You signed up with our partner referral code! You have 30 days of premium access to explore all features.</p>
                </div>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://grubana.com/events" style="background-color: #2c6f57; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Create Your First Event
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Need assistance setting up your first event? Our team is here to help!
              </p>
              
              <p style="color: #333; font-weight: bold;">Let's create memorable food experiences together!</p>
              <p style="color: #2c6f57; font-weight: bold;">The Grubana Team</p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <div style="text-align: center;">
                <p style="color: #999; font-size: 14px; margin: 10px 0;">
                  Event Support
                </p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">
                  🌐 <a href="https://grubana.com" style="color: #2c6f57;">grubana.com</a> | 
                  📧 <a href="mailto:flavor@grubana.com" style="color: #2c6f57;">flavor@grubana.com</a>
                </p>
              </div>
            </div>
          </div>
        `
      }
    };

    const emailTemplate = welcomeTemplates[userType];
    if (!emailTemplate) {
      throw new Error(`Unknown user type: ${userType}`);
    }

    const msg = {
      to: userData.email,
      from: {
        email: 'flavor@grubana.com',
        name: 'Grubana Team'
      },
      subject: emailTemplate.subject,
      html: emailTemplate.html
    };

    await sgMail.send(msg);
    logger.info(`Welcome email sent successfully to ${userData.email} (${userType})`);
    return { success: true };

  } catch (error) {
    logger.error(`Failed to send welcome email to ${userData.email}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Send admin notification email when a new user signs up
 * @param {Object} userData - User data for the notification
 * @param {string} userType - Type of user (customer, owner, organizer)
 */
export const sendAdminSignupNotification = async (userData, userType) => {
  try {
    // Determine user role display name
    const roleNames = {
      'customer': 'Customer (Foodie Fan)',
      'owner': 'Mobile Kitchen Owner',
      'event-organizer': 'Event Organizer',
      'organizer': 'Event Organizer'
    };

    const roleName = roleNames[userType] || userType;
    const userName = userData.username || userData.ownerName || userData.contactName || userData.displayName || 'Unknown';
    const userEmail = userData.email;
    const userPhone = userData.phone || 'Not provided';
    const signupTime = new Date().toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Build additional info based on user type
    let additionalInfo = '';
    
    if (userType === 'owner') {
      additionalInfo = `
        <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #333;">🚚 Business Details:</h3>
          <p style="margin: 5px 0;"><strong>Business Name:</strong> ${userData.truckName || 'Not provided'}</p>
          <p style="margin: 5px 0;"><strong>Cuisine Type:</strong> ${userData.cuisine || 'Not provided'}</p>
          <p style="margin: 5px 0;"><strong>Kitchen Type:</strong> ${userData.kitchenType || 'Not provided'}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${userData.location || 'Not provided'}</p>
          <p style="margin: 5px 0;"><strong>Plan Selected:</strong> ${userData.plan || 'Not specified'}</p>
          <p style="margin: 5px 0;"><strong>Referral Code:</strong> ${userData.referralCode || 'None'}</p>
        </div>
      `;
    } else if (userType === 'event-organizer' || userType === 'organizer') {
      additionalInfo = `
        <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #333;">🎪 Organization Details:</h3>
          <p style="margin: 5px 0;"><strong>Organization:</strong> ${userData.organizationName || 'Not provided'}</p>
          <p style="margin: 5px 0;"><strong>Organization Type:</strong> ${userData.organizationType || 'Not provided'}</p>
          <p style="margin: 5px 0;"><strong>Website:</strong> ${userData.website || 'Not provided'}</p>
          <p style="margin: 5px 0;"><strong>Plan Selected:</strong> ${userData.plan || 'Not specified'}</p>
          <p style="margin: 5px 0;"><strong>Description:</strong> ${userData.description || 'Not provided'}</p>
        </div>
      `;
    } else if (userType === 'customer') {
      additionalInfo = `
        <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #333;">👤 Customer Details:</h3>
          <p style="margin: 5px 0;"><strong>Address:</strong> ${userData.address || 'Not provided'}</p>
          <p style="margin: 5px 0;"><strong>Plan:</strong> ${userData.plan || 'Basic'}</p>
          <p style="margin: 5px 0;"><strong>SMS Consent:</strong> ${userData.smsConsent ? 'Yes' : 'No'}</p>
          <p style="margin: 5px 0;"><strong>Referral Code:</strong> ${userData.referralCode || 'None'}</p>
        </div>
      `;
    }

    const notificationTemplate = {
      subject: `🎉 New ${roleName} Signup - ${userName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: #2c6f57; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">🎉 New User Signup</h1>
          </div>
          
          <div style="background-color: #fff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
              A new user has joined Grubana!
            </p>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #333;">📋 User Information</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${userName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${userPhone}</p>
              <p style="margin: 5px 0;"><strong>User Type:</strong> ${roleName}</p>
              <p style="margin: 5px 0;"><strong>Signup Time:</strong> ${signupTime} EST</p>
              <p style="margin: 5px 0;"><strong>User ID:</strong> ${userData.uid || 'Not available'}</p>
            </div>

            ${additionalInfo}
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="margin-top: 0; color: #856404;">⚡ Next Steps</h3>
              <ul style="color: #856404; margin: 10px 0; padding-left: 20px;">
                <li>Welcome email sent to user automatically</li>
                <li>User account created in Firebase Auth and Firestore</li>
                <li>User can now access their ${userType === 'customer' ? 'customer dashboard' : userType === 'owner' ? 'business dashboard' : 'event organizer dashboard'}</li>
                ${userType === 'owner' ? '<li>Consider reaching out for onboarding assistance</li>' : ''}
                ${userType === 'event-organizer' || userType === 'organizer' ? '<li>May need help setting up first event</li>' : ''}
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://console.firebase.google.com/project/foodtruckfinder-27eba/firestore/data" 
                 style="background-color: #2c6f57; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">
                View in Firebase Console
              </a>
              <a href="https://grubana.com/admin" 
                 style="background-color: #007bff; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Admin Dashboard
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This is an automated notification from the Grubana signup system.
            </p>
          </div>
        </div>
      `
    };

    const msg = {
      to: 'flavor@grubana.com',
      from: {
        email: 'flavor@grubana.com',
        name: 'Grubana Signup System'
      },
      subject: notificationTemplate.subject,
      html: notificationTemplate.html
    };

    await sgMail.send(msg);
    logger.info(`Admin signup notification sent for new ${userType}: ${userName} (${userEmail})`);
    return { success: true };

  } catch (error) {
    logger.error(`Failed to send admin signup notification for ${userData.email}:`, error);
    return { success: false, error: error.message };
  }
};
