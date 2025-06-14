import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles.css'; // Or your specific footer CSS file

const Footer = () => {
  return (
    <footer className="footer">
      {/* Privacy Policy link at the top of the footer */}
      <div className="footer-top">
        <Link to="/faq" className="footer-link">
          FAQ
        </Link>

        <span className="footer-divider">  |  </span>

        <Link to="/PrivacyPolicy" className="footer-link">
          Privacy Policy
        </Link>

        <span className="footer-divider">  |  </span>
        
        <Link to="/TermsOfService" className="footer-link">
          Terms of Service
        </Link>

        <span className="footer-divider">  |  </span>

        <Link to="/RefundPolicy" className="footer-link">
          Refund Policy
        </Link>
      </div>

      {/* Add other footer content here */}
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Grubana. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
