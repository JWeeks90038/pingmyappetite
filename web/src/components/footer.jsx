import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles.css'; // Or your specific footer CSS file

const Footer = () => {
  return (
    <footer style={{
      backgroundColor: '#0B0B1A',
      padding: '30px 20px',
      borderTop: '1px solid #1A1036',
      marginTop: '40px',
      textAlign: 'center'
    }}>
      {/* Privacy Policy link at the top of the footer */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <Link to="/faq" style={{
          color: '#4DBFFF',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'color 0.3s ease'
        }}>
          FAQ
        </Link>

        <span style={{
          color: '#FFFFFF',
          fontSize: '14px',
          margin: '0 5px'
        }}>|</span>

        <Link to="/PrivacyPolicy" style={{
          color: '#4DBFFF',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'color 0.3s ease'
        }}>
          Privacy Policy
        </Link>

        <span style={{
          color: '#FFFFFF',
          fontSize: '14px',
          margin: '0 5px'
        }}>|</span>
        
        <Link to="/TermsOfService" style={{
          color: '#4DBFFF',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'color 0.3s ease'
        }}>
          Terms of Service
        </Link>

        <span style={{
          color: '#FFFFFF',
          fontSize: '14px',
          margin: '0 5px'
        }}>|</span>

        <Link to="/RefundPolicy" style={{
          color: '#4DBFFF',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'color 0.3s ease'
        }}>
          Refund Policy
        </Link>
      </div>

      {/* Add other footer content here */}
      <div style={{
        borderTop: '1px solid #1A1036',
        paddingTop: '20px'
      }}>
        <p style={{
          color: '#FFFFFF',
          fontSize: '14px',
          margin: '0',
          opacity: '0.8'
        }}>&copy; {new Date().getFullYear()} Grubana. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
