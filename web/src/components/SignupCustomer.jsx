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
    <div className="signup-customer-wrapper">
      <div className="form-container">
        <h1>Create Your Account</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <label htmlFor="full-name">Full Name</label>
          <input
            type="text"
            id="full-name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />

          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="phone-number">Phone Number</label>
          <input
            type="tel"
            id="phone-number"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
          />
          
          {formData.phoneNumber && (
            <div className="sms-consent-section">
              <label className="consent-checkbox">
                <input
                  type="checkbox"
                  name="smsConsent"
                  checked={formData.smsConsent}
                  onChange={handleChange}
                />
                <span className="consent-text">
                  I agree to receive SMS notifications from Grubana about food truck locations, deals, and account updates. 
                  Message and data rates may apply. Text STOP to opt out at any time. 
                  <a href="/sms-consent" target="_blank" rel="noopener noreferrer">View SMS Terms</a>
                </span>
              </label>
            </div>
          )}

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            type="password"
            id="confirm-password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <label htmlFor="address">Address (Optional)</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />

          <button type="submit">Sign Up</button>
        </form>

        <p>Already have an account? <a href="/login-customer">Login here</a></p>
      </div>

      <Footer />
    </div>
  );
};

export default CustomerSignUp;
