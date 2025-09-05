import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/footer';
import '../assets/styles.css';

const SMSConsent = () => {
  return (
    <div className="legal-page-container">
      <div className="legal-content">
        <h1>SMS Messaging Consent & Terms</h1>
        <div className="last-updated">Last Updated: August 25, 2025</div>

        <section className="consent-section">
          <h2>📱 SMS Program Consent</h2>
          <p>
            By providing your mobile phone number to Grubana and checking the SMS notifications option during signup or in your account settings, you expressly consent to receive text messages from Grubana about:
          </p>
          <ul>
            <li>🚚 <strong>Truck location alerts</strong> - When your favorite trucks are nearby</li>
            <li>🎉 <strong>Deal notifications</strong> - Special offers and promotions from mobile kitchen businesses</li>
            <li>📧 <strong>Account updates</strong> - Welcome messages, subscription changes, and important account information</li>
            <li>📊 <strong>Weekly digest</strong> - Summary of new trucks and deals in your area</li>
            <li>🔔 <strong>Event notifications</strong> - Updates about local food events and gatherings</li>
          </ul>
        </section>

        <section className="consent-section">
          <h2>✅ How You Provide Consent</h2>
          <p>You provide consent to receive SMS messages by:</p>
          <ol>
            <li><strong>Signup Form:</strong> Entering your phone number during account creation</li>
            <li><strong>Settings Page:</strong> Adding or updating your phone number in account settings</li>
            <li><strong>Explicit Opt-in:</strong> Checking the "Enable SMS Notifications" option</li>
            <li><strong>Confirmation:</strong> Receiving and acknowledging our welcome SMS</li>
          </ol>
          
          <div className="consent-example">
            <h3>Example Opt-in Process:</h3>
            <div className="signup-example">
              <p><strong>During Signup:</strong></p>
              <div className="form-example">
                <p>📱 Phone Number: <code>[Your Phone Number]</code></p>
                <p>☑️ <strong>I agree to receive SMS notifications from Grubana about truck locations, deals, and account updates.</strong></p>
                <p><em>Message and data rates may apply. Text STOP to opt out at any time.</em></p>
              </div>
            </div>
          </div>
        </section>

        <section className="consent-section">
          <h2>📞 Message Details</h2>
          <div className="message-details">
            <div className="detail-item">
              <h3>📊 Message Frequency</h3>
              <p>Message frequency varies based on your notification preferences and mobile kitchen business activity in your area. You may receive:</p>
              <ul>
                <li>Up to 5 messages per day for location alerts</li>
                <li>Weekly digest messages (1 per week)</li>
                <li>Occasional promotional messages (max 2 per week)</li>
                <li>Account-related messages as needed</li>
              </ul>
            </div>
            
            <div className="detail-item">
              <h3>💰 Message & Data Rates</h3>
              <p>Message and data rates may apply according to your mobile carrier's plan. Grubana does not charge for SMS messages, but your carrier may.</p>
            </div>
            
            <div className="detail-item">
              <h3>📱 Supported Carriers</h3>
              <p>Our SMS service is available on all major U.S. carriers including Verizon, AT&T, T-Mobile, Sprint, and most prepaid carriers.</p>
            </div>
          </div>
        </section>

        <section className="consent-section">
          <h2>🛑 How to Opt Out</h2>
          <p>You can stop receiving SMS messages at any time by:</p>
          
          <div className="opt-out-methods">
            <div className="opt-out-method">
              <h3>1. Text STOP</h3>
              <p>Reply <strong>STOP</strong> to any SMS message from Grubana</p>
              <div className="example-message">
                <strong>Example:</strong> Text "STOP" to opt out of all messages
              </div>
            </div>
            
            <div className="opt-out-method">
              <h3>2. Account Settings</h3>
              <p>Disable SMS notifications in your <Link to="/settings">account settings</Link></p>
            </div>
            
            <div className="opt-out-method">
              <h3>3. Contact Support</h3>
              <p>Email us at <a href="mailto:flavor@grubana.com">flavor@grubana.com</a> to opt out</p>
            </div>
          </div>
          
          <div className="opt-out-confirmation">
            <p><strong>Confirmation:</strong> You'll receive a final SMS confirming your opt-out request has been processed.</p>
          </div>
        </section>

        <section className="consent-section">
          <h2>🔄 Help & Support</h2>
          <p>For help with SMS messages, you can:</p>
          <ul>
            <li><strong>Text HELP</strong> to any Grubana SMS for assistance</li>
            <li><strong>Email Support:</strong> <a href="mailto:flavor@grubana.com">flavor@grubana.com</a></li>
            <li><strong>Visit Help:</strong> <Link to="/support">Support Center</Link></li>
          </ul>
        </section>

        <section className="consent-section">
          <h2>📋 Privacy & Data Protection</h2>
          <p>
            Your phone number and SMS preferences are protected according to our <Link to="/privacy-policy">Privacy Policy</Link>. We:
          </p>
          <ul>
            <li>🔒 Never share your phone number with third parties</li>
            <li>🛡️ Use secure systems to store your contact information</li>
            <li>📊 Only send messages you've consented to receive</li>
            <li>🗑️ Delete your phone number if you close your account</li>
          </ul>
        </section>

        <section className="consent-section">
          <h2>⚖️ Terms & Conditions</h2>
          <p>
            By consenting to SMS messages, you agree to our SMS program terms in addition to our general <Link to="/terms-of-service">Terms of Service</Link>. We reserve the right to:
          </p>
          <ul>
            <li>Modify message frequency based on system capacity</li>
            <li>Suspend SMS service for maintenance</li>
            <li>Update these terms with 30 days notice</li>
            <li>Terminate SMS service for users who violate our terms</li>
          </ul>
        </section>

        <section className="contact-section">
          <h2>📞 Contact Information</h2>
          <div className="contact-details">
            <p><strong>Grubana SMS Program</strong></p>
            <p>Email: <a href="mailto:flavor@grubana.com">flavor@grubana.com</a></p>
            <p>Website: <a href="https://grubana.com">https://grubana.com</a></p>
            <p>Support: Text HELP to any Grubana message</p>
          </div>
        </section>

        <div className="legal-footer">
          <p>
            <strong>Important:</strong> This consent page serves as proof of opt-in for our SMS messaging program in compliance with Twilio and TCPA requirements.
          </p>
          <p>
            <Link to="/">← Back to Home</Link> | <Link to="/privacy-policy">Privacy Policy</Link> | <Link to="/terms-of-service">Terms of Service</Link>
          </p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default SMSConsent;
