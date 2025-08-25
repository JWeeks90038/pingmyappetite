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
        
        // Default notification preferences
        notificationPreferences: {
          emailNotifications: true,
          smsNotifications: true,
          favoriteTrucks: true,
          dealAlerts: true,
          weeklyDigest: true
        },
        
        createdAt: serverTimestamp(),
        menuUrl: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        twitter: ''
      };
      
      await setDoc(userDocRef, userData);
      console.log('✅ User document created successfully with phone number');
      
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
