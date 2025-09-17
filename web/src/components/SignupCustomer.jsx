import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { validatePhoneNumber } from '../utils/phoneValidation';
import Footer from '../components/footer';
import '../assets/styles.css';

const CustomerSignUp = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    address: '',
    smsConsent: false,
  });

  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate phone number if provided
    if (formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)) {
      setError('Please enter a valid US phone number (10 digits)');
      return;
    }

    const auth = getAuth();
    
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // Create user document in Firestore with phone number and notification preferences
      const userDocRef = doc(db, 'users', user.uid);
      const userData = {
        uid: user.uid,
        username: formData.fullName,
        email: formData.email,
        phone: formData.phoneNumber,
        address: formData.address || '',
        role: 'customer',
        plan: 'basic',
        subscriptionStatus: 'active',
        
        // Notification preferences based on SMS consent
        notificationPreferences: {
          emailNotifications: true,
          smsNotifications: formData.smsConsent || false, // Based on explicit consent
          favoriteTrucks: true,
          dealAlerts: true,
          weeklyDigest: true
        },
        
        // Store explicit SMS consent for compliance
        smsConsent: formData.smsConsent || false,
        smsConsentTimestamp: formData.smsConsent ? serverTimestamp() : null,
        
        createdAt: serverTimestamp(),
        menuUrl: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        twitter: ''
      };
      
      await setDoc(userDocRef, userData);
      console.log('✅ User document created successfully with phone number');
      
      // Send welcome email and SMS for customer
      try {
        console.log('📧 Sending welcome notifications for customer...');
        const { sendWelcomeNotifications } = await import('../utils/welcomeEmailService.js');
        const welcomeResults = await sendWelcomeNotifications(userData, false);
        console.log('📧 Welcome notifications results:', welcomeResults);
      } catch (emailError) {
        console.error('📧 Failed to send welcome notifications (non-blocking):', emailError);
        // Don't fail signup if welcome email fails
      }
      
      // Redirect to customer dashboard
      navigate('/customer-dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message);
    }
  };

  return (
    <div className="signup-customer-wrapper" style={{
      backgroundColor: '#0B0B1A',
      minHeight: '100vh',
      padding: '40px 20px'
    }}>
      <div className="form-container" style={{
        backgroundColor: '#0B0B1A',
        color: '#FFFFFF',
        padding: '40px',
        borderRadius: '12px',
        maxWidth: '600px',
        margin: '0 auto',
        boxShadow: '0 8px 32px rgba(255, 78, 201, 0.1)',
        border: '1px solid #1A1036'
      }}>
        <h1 style={{ 
          color: '#FF4EC9', 
          textAlign: 'center', 
          marginBottom: '30px',
          fontSize: '2.5rem',
          fontWeight: '700'
        }}>Create Your Account</h1>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          textAlign: 'center'
        }}>
          {error && <div className="error-message" style={{
            backgroundColor: '#FF4EC9',
            color: '#0B0B1A',
            padding: '12px 16px',
            borderRadius: '8px',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '20px'
          }}>{error}</div>}

          <label htmlFor="full-name" style={{
            color: '#4DBFFF',
            fontWeight: '600',
            marginBottom: '8px',
            textAlign: 'center'
          }}>Full Name</label>
          <input
            type="text"
            id="full-name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            style={{
              backgroundColor: '#1A1036',
              color: '#FFFFFF',
              border: '2px solid #4DBFFF',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              textAlign: 'center'
            }}
          />

          <label htmlFor="email" style={{
            color: '#4DBFFF',
            fontWeight: '600',
            marginBottom: '8px',
            textAlign: 'center'
          }}>Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{
              backgroundColor: '#1A1036',
              color: '#FFFFFF',
              border: '2px solid #4DBFFF',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              textAlign: 'center'
            }}
          />

          <label htmlFor="phone-number" style={{
            color: '#4DBFFF',
            fontWeight: '600',
            marginBottom: '8px',
            textAlign: 'center'
          }}>Phone Number</label>
          <input
            type="tel"
            id="phone-number"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
            style={{
              backgroundColor: '#1A1036',
              color: '#FFFFFF',
              border: '2px solid #4DBFFF',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              textAlign: 'center'
            }}
          />
          
          {formData.phoneNumber && (
            <div className="sms-consent-section" style={{
              backgroundColor: '#1A1036',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #4DBFFF',
              marginTop: '10px'
            }}>
              <label className="consent-checkbox" style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  name="smsConsent"
                  checked={formData.smsConsent}
                  onChange={handleChange}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#FF4EC9',
                    marginTop: '2px'
                  }}
                />
                <span className="consent-text" style={{
                  color: '#FFFFFF',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  I agree to receive SMS notifications from Grubana about food truck locations, deals, and account updates. 
                  Message and data rates may apply. Text STOP to opt out at any time. 
                  <a href="/sms-consent" target="_blank" rel="noopener noreferrer" style={{
                    color: '#4DBFFF',
                    textDecoration: 'underline'
                  }}>View SMS Terms</a>
                </span>
              </label>
            </div>
          )}

          <label htmlFor="password" style={{
            color: '#4DBFFF',
            fontWeight: '600',
            marginBottom: '8px',
            textAlign: 'center'
          }}>Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={{
              backgroundColor: '#1A1036',
              color: '#FFFFFF',
              border: '2px solid #4DBFFF',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              textAlign: 'center'
            }}
          />

          <label htmlFor="confirm-password" style={{
            color: '#4DBFFF',
            fontWeight: '600',
            marginBottom: '8px',
            textAlign: 'center'
          }}>Confirm Password</label>
          <input
            type="password"
            id="confirm-password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            style={{
              backgroundColor: '#1A1036',
              color: '#FFFFFF',
              border: '2px solid #4DBFFF',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              textAlign: 'center'
            }}
          />

          <label htmlFor="address" style={{
            color: '#4DBFFF',
            fontWeight: '600',
            marginBottom: '8px',
            textAlign: 'center'
          }}>Address (Optional)</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            style={{
              backgroundColor: '#1A1036',
              color: '#FFFFFF',
              border: '2px solid #4DBFFF',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              textAlign: 'center'
            }}
          />

          <button type="submit" style={{
            backgroundColor: '#FF4EC9',
            color: '#0B0B1A',
            border: 'none',
            borderRadius: '8px',
            padding: '14px 32px',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginTop: '20px',
            width: '100%'
          }} onMouseOver={(e) => {
            e.target.style.backgroundColor = '#4DBFFF';
            e.target.style.transform = 'translateY(-2px)';
          }} onMouseOut={(e) => {
            e.target.style.backgroundColor = '#FF4EC9';
            e.target.style.transform = 'translateY(0)';
          }}>Sign Up</button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          color: '#FFFFFF'
        }}>Already have an account? <a href="/login-customer" style={{
          color: '#4DBFFF',
          textDecoration: 'underline'
        }}>Login here</a></p>
      </div>

      <Footer />
    </div>
  );
};

export default CustomerSignUp;
