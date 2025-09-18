import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles.css';

const PrivacyPolicy = () => {
  const pageStyle = {
    backgroundColor: '#0B0B1A',
    color: '#FFFFFF',
    minHeight: '100vh',
    padding: '0',
    overflow: 'visible'
  };

  const containerStyle = {
    backgroundColor: '#1A1036',
    color: '#FFFFFF',
    padding: '40px',
    margin: '0',
    borderRadius: '0',
    textAlign: 'center',
    maxWidth: '800px',
    marginLeft: 'auto',
    marginRight: 'auto',
    minHeight: 'auto',
    height: 'auto'
  };

  const sectionStyle = {
    color: '#FFFFFF',
    marginBottom: '30px'
  };

  const headingStyle = {
    color: '#4DBFFF',
    borderBottom: '2px solid #4DBFFF',
    paddingBottom: '10px'
  };

  const textStyle = {
    color: '#FFFFFF',
    lineHeight: '1.6'
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Keep only the scrollbar that works with the button */
          html {
            overflow-y: auto;
            overflow-x: hidden;
            height: 100%;
          }
          
          body {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            scroll-behavior: smooth !important;
            height: auto !important;
            max-height: none !important;
          }
          
          #root {
            height: auto !important;
            max-height: none !important;
            min-height: 100vh;
            overflow-y: hidden !important;
            overflow-x: hidden !important;
          }
          
          main {
            height: auto !important;
            max-height: none !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          
          .legal-container {
            text-align: center;
            height: auto !important;
            max-height: none !important;
          }
          .legal-container p,
          .legal-container div,
          .legal-container li,
          .legal-container span {
            color: #FFFFFF !important;
            text-align: center;
            margin: 0 auto;
          }
          .legal-container h2 {
            color: #4DBFFF !important;
            text-align: center;
          }
          .legal-container a {
            color: #4DBFFF !important;
          }
          .section {
            text-align: center;
            margin: 0 auto 30px auto;
            max-width: 700px;
          }
        `
      }} />
      <div style={pageStyle}>
      <section className="legal-container" style={containerStyle}>
        <h1 style={{ color: '#FF4EC9', textAlign: 'center', marginBottom: '30px' }}>Privacy Policy</h1>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>1. Introduction</h2>
    <p>
      Welcome to Grubana. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how Grubana (“we”, “us”, “our”, or “the Company”) collects, uses, discloses, and safeguards your information when you use our website, mobile application, and related services (collectively, the “Platform”).
    </p>
    <p>
      By accessing or using our Platform, you agree to the collection and use of information in accordance with this Privacy Policy.
    </p>
  </section>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>2. Information We Collect</h2>
    <div>
    <div><strong>Personal Information:</strong> Name, email address, phone number, username, password (hashed), payment information, and other identifiers you provide during registration or use of the Platform.</div><br></br>
    <div><strong>Business Information:</strong> Business name, owner name, location, cuisine type, service hours, description, and other business-related details.</div><br></br>
    <div><strong>Usage Data:</strong> IP address, browser type, device information, access times, pages viewed, referring URLs, and interactions with the Platform.</div><br></br>
    <div><strong>Location Data:</strong> If you enable location services, we may collect precise or approximate geolocation data to provide location-based services.</div><br></br>
    <div><strong>Cookies and Tracking Technologies:</strong> We use cookies, web beacons, and similar technologies to collect information about your interactions with our Platform.</div><br></br>
    <div><strong>Third-Party Information:</strong> We may receive information about you from third-party services (e.g., payment processors, analytics providers, social media platforms) if you interact with them through our Platform.</div><br></br>
  </div>
  </section>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>3. How We Use Your Information</h2>
    <div>
      <div>To create and manage your account and profile.</div><br></br>
      <div>To process payments and manage subscriptions.</div><br></br>
      <div>To provide, operate, and improve our Platform and services.</div><br></br>
      <div>To personalize your experience and deliver relevant content and recommendations.</div><br></br>
      <div>To communicate with you about your account, updates, promotions, and customer support.</div><br></br>
      <div>To send welcome emails and SMS notifications (with your consent).</div><br></br>
      <div>To deliver transactional messages including account confirmations, payment receipts, and service updates.</div><br></br>
      <div>To send promotional emails and SMS messages (only with your explicit consent).</div><br></br>
      <div>To monitor and analyze usage and trends to improve user experience.</div><br></br>
      <div>To enforce our Terms of Service and protect the security and integrity of our Platform.</div><br></br>
      <div>To comply with legal obligations and resolve disputes.</div><br></br>
    </div>
  </section>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>4. Legal Basis for Processing (for EEA/UK users)</h2>
    <p>
      If you are located in the European Economic Area or the United Kingdom, we process your personal data based on the following legal grounds:
    </p>
    <div>
      <div>Your consent</div><br></br>
      <div>Performance of a contract</div><br></br>
      <div>Compliance with legal obligations</div><br></br>
      <div>Our legitimate business interests</div><br></br>
    </div>
  </section>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>5. Data Security</h2>
    <p>
      We implement industry-standard security measures to protect your personal data, including encryption, secure servers, and access controls. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
    </p>
  </section>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>6. Sharing Your Information</h2>
    <div>
      <div>
        <strong>Service Providers:</strong> We may share your information with trusted third-party vendors who help us operate our Platform, process payments, provide analytics, or deliver communications.
      </div><br></br>
      <div>
        <strong>Legal Requirements:</strong> We may disclose your information if required by law, regulation, legal process, or governmental request.
      </div><br></br>
      <div>
        <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
      </div><br></br>
      <div>
        <strong>With Your Consent:</strong> We may share your information for other purposes with your explicit consent.
      </div><br></br>
      </div>
  </section>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>7. Email and SMS Communications</h2>
    <div>
      <div>
        <strong>Email Communications:</strong> We may send you various types of emails including:
      </div><br></br>
      <div style={{marginLeft: '20px'}}>
        <div>• Welcome emails when you create an account</div>
        <div>• Transactional emails (payment confirmations, password resets, account updates)</div>
        <div>• Service announcements and important platform updates</div>
        <div>• Marketing emails (only with your consent, you can unsubscribe anytime)</div>
      </div><br></br>
      
      <div>
        <strong>SMS/Text Messaging:</strong> If you provide your phone number and consent to receive SMS messages, we may send:
      </div><br></br>
      <div style={{marginLeft: '20px'}}>
        <div>• Welcome text messages when you create an account</div>
        <div>• Account notifications and security alerts</div>
        <div>• Event reminders and important updates</div>
        <div>• Promotional messages (only with explicit consent)</div>
      </div><br></br>
      
      <div>
        <strong>Consent and Opt-Out:</strong>
      </div><br></br>
      <div style={{marginLeft: '20px'}}>
        <div>• SMS consent is collected through an explicit checkbox during signup</div>
        <div>• You can opt-out of SMS messages by replying "STOP" to any text message</div>
        <div>• You can unsubscribe from marketing emails using the unsubscribe link</div>
        <div>• You can manage your communication preferences in your account settings</div>
        <div>• Transactional messages (like password resets) cannot be disabled as they are essential for service operation</div>
      </div><br></br>
      
      <div>
        <strong>Message Frequency and Charges:</strong>
      </div><br></br>
      <div style={{marginLeft: '20px'}}>
        <div>• SMS frequency varies based on your activity and preferences</div>
        <div>• Standard message and data rates may apply from your mobile carrier</div>
        <div>• We do not charge for SMS messages, but your carrier's rates apply</div>
      </div><br></br>
      
      <div>
        <strong>Third-Party Services:</strong> We use trusted third-party services (Formspree for emails, Twilio for SMS) to deliver communications. These services are bound by strict privacy and security agreements.</div><br></br>
    </div>
  </section>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>8. Cookies and Tracking Technologies</h2>
    <p>
      We use cookies and similar technologies to enhance your experience, analyze usage, and deliver personalized content. You can control cookies through your browser settings, but disabling cookies may affect your ability to use certain features of our Platform.
    </p>
  </section>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>9. International Data Transfers</h2>
    <p>
      Your information may be transferred to and maintained on servers located outside your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using our Platform, you consent to such transfers.
    </p>
  </section>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>10. Data Retention</h2>
    <p>
      We retain your personal data only as long as necessary to fulfill the purposes described in this Privacy Policy, comply with legal obligations, resolve disputes, and enforce our agreements. When no longer needed, your data will be securely deleted or anonymized.
    </p>
  </section>

    <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>11. Your Rights and Choices</h2>
    <div>
      <div>You have the right to access, update, or delete your personal data.</div><br></br>
      <div>You may withdraw your consent at any time where processing is based on consent.</div><br></br>
      <div>You may object to or restrict certain processing of your data.</div><br></br>
      <div>You may request a copy of your data in a portable format.</div><br></br>
      <div>You can opt-out of marketing emails and SMS messages at any time.</div><br></br>
      <div>To exercise your rights, please contact us at flavor@grubana.com.</div><br></br>
    </div>
  </section>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>12. Children's Privacy</h2>
    <p>
      Our Platform is not intended for children under 13 (or under 16 in the EEA/UK). We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will take steps to delete such information.
    </p>
  </section>

  <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>13. Third-Party Links</h2>
    <p>
      Our Platform may contain links to third-party websites or services. We are not responsible for the privacy practices or content of those third parties. We encourage you to review their privacy policies before providing any information.
    </p>
  </section>

   <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>14. User Responsibilities</h2>
    <p>
      You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Please notify us immediately of any unauthorized use or security breach.
    </p>
  </section>

    <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>15. Changes to This Privacy Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. Any changes will be posted on this page with the updated date. Your continued use of the Platform after changes are posted constitutes your acceptance of those changes.
    </p>
  </section>

    <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2 style={{ color: '#4DBFFF', borderBottom: '2px solid #4DBFFF', paddingBottom: '10px' }}>16. Contact Us</h2>
    <p>
      If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at <a href="mailto:flavor@grubana.com" style={{ color: '#4DBFFF', textDecoration: 'underline' }}>flavor@grubana.com</a>.
    </p>
  </section>

    <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2>11. Children’s Privacy</h2>
    <p>
      Our Platform is not intended for children under 13 (or under 16 in the EEA/UK). We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will take steps to delete such information.
    </p>
  </section>

    <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2>12. Third-Party Links</h2>
    <p>
      Our Platform may contain links to third-party websites or services. We are not responsible for the privacy practices or content of those third parties. We encourage you to review their privacy policies before providing any information.
    </p>
  </section>

    <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2>13. User Responsibilities</h2>
    <p>
      You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Please notify us immediately of any unauthorized use or security breach.
    </p>
  </section>

    <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2>14. Changes to This Privacy Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. Any changes will be posted on this page with the updated date. Your continued use of the Platform after changes are posted constitutes your acceptance of those changes.
    </p>
  </section>

    <section className="section" style={{ color: '#FFFFFF', backgroundColor: '#0B0B1A', marginBottom: '30px' }}>
    <h2>15. Contact Us</h2>
    <p>
      If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at <a href="mailto:flavor@grubana.com" style={{ color: '#4DBFFF', textDecoration: 'underline' }}>flavor@grubana.com</a>.
    </p>
  </section>
      </section>

<div style={{ textAlign: 'center', width: '100%', marginTop: '30px' }}>
<a
  href="#"
  onClick={e => {
    e.preventDefault();
    e.stopPropagation();
    
    // Simple scroll to top
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      // Fallback for older browsers
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }}
  style={{
    display: "inline-block",
    margin: "0 auto",
    color: "#FF4EC9",
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
    padding: "10px 20px",
    backgroundColor: "#1A1036",
    borderRadius: "5px",
    border: "2px solid #FF4EC9",
    transition: "all 0.3s ease"
  }}
  onMouseEnter={e => {
    e.target.style.backgroundColor = "#FF4EC9";
    e.target.style.color = "#0B0B1A";
  }}
  onMouseLeave={e => {
    e.target.style.backgroundColor = "#1A1036";
    e.target.style.color = "#FF4EC9";
  }}
>
  Back to Top ↑
</a>
</div>

{/* Add some extra spacing to ensure scrollable content */}
<div style={{ height: '200px', padding: '40px', textAlign: 'center' }}>
  <p style={{ color: '#FFFFFF', opacity: 0.7 }}>
    For questions about this Privacy Policy, please contact us at privacy@grubana.com
  </p>
</div>
        
      </div>
    </>
  );
};

export default PrivacyPolicy;
