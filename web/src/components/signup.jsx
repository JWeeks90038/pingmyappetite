import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Footer from '../components/footer';
import { Link } from 'react-router-dom';
import { getPriceId } from '../utils/stripe';
import EventOrganizerPlanSelector from './EventOrganizerPlanSelector';
import MobileKitchenPlanSelector from './MobileKitchenPlanSelector';
import '../assets/styles.css';


const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    role: '',
    username: '',
    truckName: '',
    ownerName: '',
    email: '',
    phone: '',
    zipCode: '',
    password: '',
    confirmPassword: '',
    location: '',
    cuisine: '',
    hours: '',
    description: '',
    kitchenType: '',
    plan: '',
    referralCode: '', // Add referral code field
    smsConsent: false, // Add SMS consent checkbox
    // Event organizer fields
    organizationName: '',
    organizationType: '',
    contactPerson: '',
    address: '',
    website: '',
    experienceYears: '',
    eventDescription: '',
  });

  const [error, setError] = useState(null);
  const [isValidReferral, setIsValidReferral] = useState(false);
  const [referralMessage, setReferralMessage] = useState('');

  // Handle URL parameters for pre-selecting role
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const roleParam = urlParams.get('role');
    
    if (roleParam === 'event-organizer') {
      setFormData(prevState => ({
        ...prevState,
        role: 'event-organizer'
      }));
    } else if (roleParam === 'owner') {
      setFormData(prevState => ({
        ...prevState,
        role: 'owner'
      }));
    } else if (roleParam === 'customer') {
      setFormData(prevState => ({
        ...prevState,
        role: 'customer'
      }));
    }
  }, [location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));

    // Validate referral code in real-time
    if (name === 'referralCode') {
      validateReferralCode(value);
    }
  };

  const handlePlanSelect = (planId) => {
    setFormData((prevState) => ({
      ...prevState,
      plan: planId,
    }));
  };

  const validateReferralCode = (code) => {
    if (!code.trim()) {
      setIsValidReferral(false);
      setReferralMessage('');
      return;
    }

    if (code.toLowerCase() === 'arayaki_hibachi') {
      setIsValidReferral(true);
      setReferralMessage('✅ Valid referral code applied!');
    } else {
      setIsValidReferral(false);
      setReferralMessage('❌ Invalid referral code. This code is not recognized.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate event organizer plan selection
    if (formData.role === 'event-organizer' && !formData.plan) {
      setError('Please select a subscription plan to continue');
      return;
    }

    // Validate food truck plan selection
    if (formData.role === 'owner' && !formData.plan) {
      setError('Please select a plan to continue');
      return;
    }

    const auth = getAuth();
    const db = getFirestore();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

    const {
  password,
  confirmPassword,
  ...fieldsToSave
} = formData;

// Determine the correct plan and subscription status based on user selection
let userPlan = formData.plan || 'basic';
let subscriptionStatus = 'active'; // Default for basic plan

// For paid plans, set initial status appropriately
if (formData.role === 'owner' && (formData.plan === 'pro' || formData.plan === 'all-access')) {
  userPlan = formData.plan;
  subscriptionStatus = 'pending'; // Will be updated by webhook after payment
}

// Event organizers with paid plans
if (formData.role === 'event-organizer') {
  if (formData.plan && ['event-basic', 'event-premium'].includes(formData.plan)) {
    userPlan = formData.plan;
    subscriptionStatus = 'pending'; // Will be updated by webhook after payment
  } else {
    userPlan = 'basic';
    subscriptionStatus = 'active';
  }
}

const userData = {
  ...fieldsToSave,
  uid: user.uid,
  createdAt: serverTimestamp(),
  plan: userPlan,
  subscriptionStatus: subscriptionStatus,
  subscriptionId: null, // Placeholder for Stripe subscription ID
  referralCode: formData.referralCode?.toLowerCase() === 'arayaki_hibachi' ? formData.referralCode : null,
  hasValidReferral: formData.referralCode?.toLowerCase() === 'arayaki_hibachi',
  
  // Notification preferences based on SMS consent
  notificationPreferences: {
    emailNotifications: true, // Default enabled
    smsNotifications: formData.smsConsent || false, // Based on explicit consent
    favoriteTrucks: true,
    dealAlerts: true,
    weeklyDigest: true
  },
  
  // Store explicit SMS consent for compliance
  smsConsent: formData.smsConsent || false,
  smsConsentTimestamp: formData.smsConsent ? serverTimestamp() : null,
};

            // CRITICAL: Save user document to Firestore FIRST before redirecting to payment
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('✅ User document saved to Firestore with role:', userData.role);

      // If valid referral code used, create referral document
      if (formData.referralCode?.toLowerCase() === 'arayaki_hibachi') {
        console.log('🎯 Creating referral document for Arayaki_Hibachi code');
        try {
          await setDoc(doc(db, 'referrals', user.uid), {
            userId: user.uid,
            userEmail: formData.email,
            userName: formData.username || formData.ownerName || '',
            truckName: formData.truckName || '',
            referralCode: formData.referralCode,
            selectedPlan: formData.plan,
            signupAt: serverTimestamp(),
            paymentCompleted: false,
            emailSent: false
          });
          console.log('✅ Referral document created successfully');
        } catch (referralError) {
          console.error('❌ Error creating referral document:', referralError);
          // Don't fail signup if referral document creation fails
        }
      }

      // For paid plans (pro/all-access), redirect directly to Stripe checkout
      if (formData.role === 'owner' && (formData.plan === 'pro' || formData.plan === 'all-access')) {
        console.log('🔄 Creating Stripe checkout session for paid plan:', formData.plan);
        
        try {
          // Create Stripe checkout session directly
          const API_URL = import.meta.env.VITE_API_URL || 'https://pingmyappetite-production.up.railway.app';
          const priceId = getPriceId(formData.plan);
          
          if (!priceId) {
            setError('Price configuration error. Please contact support.');
            return;
          }
          
          const checkoutResponse = await fetch(`${API_URL}/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              priceId: priceId,
              planType: formData.plan,
              uid: user.uid,
              hasValidReferral: formData.referralCode?.toLowerCase() === 'arayaki_hibachi',
              referralCode: formData.referralCode,
            }),
          });

          const { url, error } = await checkoutResponse.json();
          
          if (error) {
            console.error('Stripe checkout error:', error);
            setError(`Payment setup failed: ${error}`);
            return;
          }

          console.log('✅ Redirecting directly to Stripe checkout');
          // Redirect directly to Stripe Checkout
          window.location.href = url;
          return;
          
        } catch (checkoutErr) {
          console.error('Error creating Stripe checkout:', checkoutErr);
          setError('Failed to setup payment. Please try again.');
          return;
        }
      }

      // For event organizer paid plans, redirect to Stripe checkout
      if (formData.role === 'event-organizer' && formData.plan && ['event-basic', 'event-premium'].includes(formData.plan)) {
        console.log('🔄 Creating Stripe checkout session for event organizer plan:', formData.plan);
        
        try {
          // Create Stripe checkout session directly
          const API_URL = import.meta.env.VITE_API_URL || 'https://pingmyappetite-production.up.railway.app';
          const priceId = getPriceId(formData.plan);
          
          if (!priceId) {
            setError('Price configuration error. Please contact support.');
            return;
          }
          
          const checkoutResponse = await fetch(`${API_URL}/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              priceId: priceId,
              planType: formData.plan,
              uid: user.uid,
              userType: 'event-organizer',
              hasValidReferral: formData.referralCode?.toLowerCase() === 'arayaki_hibachi',
              referralCode: formData.referralCode,
            }),
          });

          const { url, error } = await checkoutResponse.json();
          
          if (error) {
            console.error('Stripe checkout error:', error);
            setError(`Payment setup failed: ${error}`);
            return;
          }

          console.log('✅ Redirecting directly to Stripe checkout');
          // Redirect directly to Stripe Checkout
          window.location.href = url;
          return;
          
        } catch (checkoutErr) {
          console.error('Error creating Stripe checkout:', checkoutErr);
          setError('Failed to setup payment. Please try again.');
          return;
        }
      }

      // For starter plan, customers, or free event organizers, save user data and redirect to dashboard
      if (formData.role === 'customer' || formData.plan === 'basic' || (formData.role === 'event-organizer' && !formData.plan)) {
        console.log('🔄 Saving user data and redirecting to appropriate dashboard');
        await setDoc(doc(db, 'users', user.uid), userData);
        console.log('✅ User document saved to Firestore with role:', userData.role);
        
        // Send welcome email for free users
        try {
          console.log('📧 Sending welcome email for free user...');
          const { sendWelcomeNotifications } = await import('../utils/welcomeEmailService.js');
          const welcomeResults = await sendWelcomeNotifications(userData, false);
          console.log('📧 Welcome email results:', welcomeResults);
        } catch (emailError) {
          console.error('📧 Failed to send welcome email (non-blocking):', emailError);
          // Don't fail signup if welcome email fails
        }
        
        if (formData.role === 'customer') {
          navigate('/customer-dashboard');
        } else if (formData.role === 'event-organizer') {
          navigate('/event-dashboard');
        } else {
          navigate('/dashboard');
        }
        return;
      }

    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.message || 'An error occurred during signup');
    }
  };

  return (
    <div className="sign-up-container" style={{
      backgroundColor: '#0B0B1A',
      color: '#FFFFFF',
      padding: '40px',
      borderRadius: '12px',
      maxWidth: '600px',
      margin: '40px auto',
      boxShadow: '0 8px 32px rgba(255, 78, 201, 0.1)',
      border: '1px solid #1A1036'
    }}>
      <h1 style={{ 
        color: '#FF4EC9', 
        textAlign: 'center', 
        marginBottom: '20px',
        fontSize: '2.5rem',
        fontWeight: '700'
      }}>Sign Up</h1>
      <p style={{ 
        color: '#FFFFFF', 
        textAlign: 'center', 
        marginBottom: '30px',
        fontSize: '1.1rem',
        opacity: '0.9'
      }}>Create your account to get started with Grubana.</p>

      <form id="signup-form" onSubmit={handleSubmit} style={{
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

  <label htmlFor="role" style={{
    color: '#4DBFFF',
    fontWeight: '600',
    marginBottom: '8px',
    textAlign: 'center'
  }}>Sign up as:</label>
  <select
    id="role"
    name="role"
    value={formData.role}
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
      transition: 'border-color 0.3s ease'
    }}
  >
    <option value="">Select Role</option>
    <option value="customer">Foodie Fan</option>
    <option value="owner">Business Owner</option>
    <option value="event-organizer">Event Organizer</option>
  </select>

  <label htmlFor="username" style={{
    color: '#4DBFFF',
    fontWeight: '600',
    marginBottom: '8px',
    textAlign: 'center'
  }}>Username</label>
  <input
    type="text"
    id="username"
    name="username"
    value={formData.username}
    onChange={handleChange}
    required
    placeholder="Choose a username"
    style={{
      backgroundColor: '#1A1036',
      color: '#FFFFFF',
      border: '2px solid #4DBFFF',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.3s ease'
    }}
  />

  {formData.role === 'customer' && (
    <>
      <label htmlFor="phone" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px',
        textAlign: 'center'
      }}>Phone Number</label>
      <input
        type="tel"
        id="phone"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        required
        placeholder="Enter your phone number"
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
      
      <label htmlFor="zipCode" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px',
        textAlign: 'center'
      }}>Zip Code</label>
      <input
        type="text"
        id="zipCode"
        name="zipCode"
        value={formData.zipCode}
        onChange={handleChange}
        required
        placeholder="Enter your zip code (e.g., 12345)"
        maxLength="10"
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
      
      {formData.phone && (
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
    </>
  )}

  {formData.role === 'owner' && (
    <>
      <label style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '12px',
        textAlign: 'center'
      }}>Type of Mobile Kitchen Business:</label>
      <div className="kitchen-radio-group" style={{
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        marginBottom: '10px',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
      <label className="kitchen-radio-option" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        color: '#FFFFFF'
      }}>
          <input
            type="radio"
            name="kitchenType"
            value="truck"
            checked={formData.kitchenType === 'truck'}
            onChange={handleChange}
            required
            style={{
              width: '18px',
              height: '18px',
              accentColor: '#FF4EC9'
            }}
          />{' '}
           <span>Truck</span>
        </label>
        {' '}
        <label className="kitchen-radio-option" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          color: '#FFFFFF'
        }}>
          <input
            type="radio"
            name="kitchenType"
            value="trailer"
            checked={formData.kitchenType === 'trailer'}
            onChange={handleChange}
            required
            style={{
              width: '18px',
              height: '18px',
              accentColor: '#FF4EC9'
            }}
          />{' '}
          <span>Trailer</span>
        </label>
        {' '}
        <label className="kitchen-radio-option" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          color: '#FFFFFF'
        }}>
          <input
            type="radio"
            name="kitchenType"
            value="cart"
            checked={formData.kitchenType === 'cart'}
            onChange={handleChange}
            required
            style={{
              width: '18px',
              height: '18px',
              accentColor: '#FF4EC9'
            }}
          />{' '}
          <span>Cart</span>
        </label>
        {' '}
        <label className="kitchen-radio-option" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          color: '#FFFFFF'
        }}>
          <input
            type="radio"
            name="kitchenType"
            value="popup"
            checked={formData.kitchenType === 'popup'}
            onChange={handleChange}
            required
            style={{
              width: '18px',
              height: '18px',
              accentColor: '#FF4EC9'
            }}
          />{' '}
          <span>Popup</span>
        </label>
      </div>

      <label htmlFor="truck-name" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Business Name</label>
      <input
        type="text"
        id="truck-name"
        name="truckName"
        value={formData.truckName}
        onChange={handleChange}
        required
        placeholder="Enter your business name"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />

      <label htmlFor="owner-name" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Owner's Name</label>
      <input
        type="text"
        id="owner-name"
        name="ownerName"
        value={formData.ownerName}
        onChange={handleChange}
        required
        placeholder="Enter the owner's name"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />

      <label htmlFor="phone" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Phone Number</label>
      <input
        type="tel"
        id="phone"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        required
        placeholder="Enter your phone number"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />
      
      {formData.phone && (
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
              I agree to receive SMS notifications from Grubana about customer engagement, deals notifications, and account updates. 
              Message and data rates may apply. Text STOP to opt out at any time. 
              <a href="/sms-consent" target="_blank" rel="noopener noreferrer" style={{
                color: '#4DBFFF',
                textDecoration: 'underline'
              }}>View SMS Terms</a>
            </span>
          </label>
        </div>
      )}

      <label htmlFor="location" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Location (City)</label>
      <input
        type="text"
        id="location"
        name="location"
        value={formData.location}
        onChange={handleChange}
        required
        placeholder="Enter your business location"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />

      <label htmlFor="cuisine" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Cuisine Type</label>
      <select
        id="cuisine"
        name="cuisine"
        value={formData.cuisine}
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
          transition: 'border-color 0.3s ease'
        }}
      >
        <option value="">Select Cuisine</option>
        <option value="american">American</option>
        <option value="asian-fusion">Asian Fusion</option>
        <option value="bbq">BBQ</option>
        <option value="burgers">Burgers</option>
        <option value="chinese">Chinese</option>
        <option value="coffee">Coffee & Café</option>
        <option value="desserts">Desserts & Sweets</option>
        <option value="drinks">Drinks & Beverages</option>
        <option value="greek">Greek</option>
        <option value="halal">Halal</option>
        <option value="healthy">Healthy & Fresh</option>
        <option value="indian">Indian</option>
        <option value="italian">Italian</option>
        <option value="korean">Korean</option>
        <option value="latin">Latin American</option>
        <option value="mediterranean">Mediterranean</option>
        <option value="mexican">Mexican</option>
        <option value="pizza">Pizza</option>
        <option value="seafood">Seafood</option>
        <option value="southern">Southern Comfort</option>
        <option value="sushi">Sushi & Japanese</option>
        <option value="thai">Thai</option>
        <option value="vegan">Vegan & Vegetarian</option>
        <option value="wings">Wings</option>
        <option value="other">Other</option>
      </select>

      <label htmlFor="hours" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Service Hours</label>
      <input
        type="text"
        id="hours"
        name="hours"
        value={formData.hours}
        onChange={handleChange}
        required
        placeholder="Enter your service hours (e.g., 11 AM - 9 PM)"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />

      <label htmlFor="description" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Business Description</label>
      <textarea
        id="description"
        name="description"
        rows="4"
        value={formData.description}
        onChange={handleChange}
        placeholder="Tell us more about your business and menu"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease',
          resize: 'vertical',
          minHeight: '100px'
        }}
      />

      <MobileKitchenPlanSelector
        selectedPlan={formData.plan}
        onPlanSelect={handlePlanSelect}
      />
    </>
  )}

  {formData.role === 'event-organizer' && (
    <>
      <label htmlFor="organization-name" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Organization Name</label>
      <input
        type="text"
        id="organization-name"
        name="organizationName"
        value={formData.organizationName}
        onChange={handleChange}
        required
        placeholder="Enter your organization name"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />

      <label htmlFor="organization-type" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Organization Type</label>
      <select
        id="organization-type"
        name="organizationType"
        value={formData.organizationType}
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
          transition: 'border-color 0.3s ease'
        }}
      >
        <option value="">Select Organization Type</option>
        <option value="non-profit">Non-Profit</option>
        <option value="city">City/Municipality</option>
        <option value="private">Private Company</option>
        <option value="corporate">Corporate</option>
      </select>

      <label htmlFor="contact-person" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Contact Person</label>
      <input
        type="text"
        id="contact-person"
        name="contactPerson"
        value={formData.contactPerson}
        onChange={handleChange}
        required
        placeholder="Enter primary contact person"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />

      <label htmlFor="phone" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Phone Number</label>
      <input
        type="tel"
        id="phone"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        required
        placeholder="Enter your phone number"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />
      
      {formData.phone && (
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
              I agree to receive SMS notifications from Grubana about vendor applications, event updates, and account notifications. 
              Message and data rates may apply. Text STOP to opt out at any time. 
              <a href="/sms-consent" target="_blank" rel="noopener noreferrer" style={{
                color: '#4DBFFF',
                textDecoration: 'underline'
              }}>View SMS Terms</a>
            </span>
          </label>
        </div>
      )}

      <label htmlFor="organization-address" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Organization Address</label>
      <input
        type="text"
        id="organization-address"
        name="address"
        value={formData.address}
        onChange={handleChange}
        required
        placeholder="Enter your organization address"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />

      <label htmlFor="website" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Website (Optional)</label>
      <input
        type="url"
        id="website"
        name="website"
        value={formData.website}
        onChange={handleChange}
        placeholder="Enter your website URL"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />

      <label htmlFor="experience-years" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Years of Event Experience</label>
      <select
        id="experience-years"
        name="experienceYears"
        value={formData.experienceYears}
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
          transition: 'border-color 0.3s ease'
        }}
      >
        <option value="">Select Experience Level</option>
        <option value="0">New to event organizing</option>
        <option value="1">1-2 years</option>
        <option value="3">3-5 years</option>
        <option value="6">6-10 years</option>
        <option value="11">10+ years</option>
      </select>

      <label htmlFor="event-description" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Tell us about your events</label>
      <textarea
        id="event-description"
        name="eventDescription"
        rows="4"
        value={formData.eventDescription}
        onChange={handleChange}
        placeholder="Describe the types of events you organize (festivals, markets, corporate events, etc.)"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease',
          resize: 'vertical',
          minHeight: '100px'
        }}
      />

      <EventOrganizerPlanSelector
        selectedPlan={formData.plan}
        onPlanSelect={handlePlanSelect}
      />
    </>
  )}

  <label htmlFor="email" style={{
    color: '#4DBFFF',
    fontWeight: '600',
    marginBottom: '8px'
  }}>Email Address</label>
  <input
    type="email"
    id="email"
    name="email"
    value={formData.email}
    onChange={handleChange}
    required
    placeholder="Enter your email address"
    style={{
      backgroundColor: '#1A1036',
      color: '#FFFFFF',
      border: '2px solid #4DBFFF',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.3s ease'
    }}
  />

  <label htmlFor="password" style={{
    color: '#4DBFFF',
    fontWeight: '600',
    marginBottom: '8px'
  }}>Password</label>
  <input
    type="password"
    id="password"
    name="password"
    value={formData.password}
    onChange={handleChange}
    required
    placeholder="Enter a password"
    style={{
      backgroundColor: '#1A1036',
      color: '#FFFFFF',
      border: '2px solid #4DBFFF',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.3s ease'
    }}
  />

  <label htmlFor="confirm-password" style={{
    color: '#4DBFFF',
    fontWeight: '600',
    marginBottom: '8px'
  }}>Confirm Password</label>
  <input
    type="password"
    id="confirm-password"
    name="confirmPassword"
    value={formData.confirmPassword}
    onChange={handleChange}
    required
    placeholder="Confirm your password"
    style={{
      backgroundColor: '#1A1036',
      color: '#FFFFFF',
      border: '2px solid #4DBFFF',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.3s ease'
    }}
  />

  {/* Referral code section for food truck owners with paid plans */}
  {formData.role === 'owner' && (formData.plan === 'pro' || formData.plan === 'all-access') && (
    <>
      <label htmlFor="referralCode" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Referral Code (Optional)</label>
      <input
        type="text"
        id="referralCode"
        name="referralCode"
        value={formData.referralCode}
        onChange={handleChange}
        placeholder="Enter referral code for special offers"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: formData.referralCode && !isValidReferral ? '2px solid #dc3545' : 
                  formData.referralCode && isValidReferral ? '2px solid #28a745' : '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />
      {referralMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginTop: '10px',
          fontSize: '14px',
          backgroundColor: isValidReferral ? '#d4edda' : '#f8d7da',
          border: `1px solid ${isValidReferral ? '#c3e6cb' : '#f5c6cb'}`,
          color: isValidReferral ? '#155724' : '#721c24'
        }}>
          {referralMessage}
        </div>
      )}
    </>
  )}

  {/* Referral code section for event organizers with paid plans */}
  {formData.role === 'event-organizer' && formData.plan && ['event-basic', 'event-premium'].includes(formData.plan) && (
    <>
      <label htmlFor="referralCode" style={{
        color: '#4DBFFF',
        fontWeight: '600',
        marginBottom: '8px'
      }}>Referral Code (Optional)</label>
      <input
        type="text"
        id="referralCode"
        name="referralCode"
        value={formData.referralCode}
        onChange={handleChange}
        placeholder="Enter referral code for 30-day free trial"
        style={{
          backgroundColor: '#1A1036',
          color: '#FFFFFF',
          border: formData.referralCode && !isValidReferral ? '2px solid #dc3545' : 
                  formData.referralCode && isValidReferral ? '2px solid #28a745' : '2px solid #4DBFFF',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '16px',
          outline: 'none',
          transition: 'border-color 0.3s ease'
        }}
      />
      {referralMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginTop: '10px',
          fontSize: '14px',
          backgroundColor: isValidReferral ? '#d4edda' : '#f8d7da',
          border: `1px solid ${isValidReferral ? '#c3e6cb' : '#f5c6cb'}`,
          color: isValidReferral ? '#155724' : '#721c24'
        }}>
          {referralMessage}
        </div>
      )}
    </>
  )}

  <button type="submit" className="btn" style={{
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
  <p style={{
    textAlign: 'center',
    marginTop: '20px',
    color: '#FFFFFF'
  }}>Already have an account? <Link to="/login" style={{
    color: '#4DBFFF',
    textDecoration: 'underline'
  }}>Login</Link></p>
</form>

<a
  href="#"
  onClick={e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  style={{
    display: "inline-block",
    margin: "30px auto 0 auto",
    color: "#2c6f57",
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: "bold"
  }}
>
  Back to Top ↑
</a>
    </div>
  );
};

export default SignUp;
