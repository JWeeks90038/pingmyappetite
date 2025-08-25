import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Footer from '../components/footer';
import { Link } from 'react-router-dom';
import { getPriceId } from '../utils/stripe';
import EventOrganizerPlanSelector from './EventOrganizerPlanSelector';
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
    password: '',
    confirmPassword: '',
    location: '',
    cuisine: '',
    hours: '',
    description: '',
    kitchenType: '',
    plan: '',
    referralCode: '', // Add referral code field
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
  if (formData.plan && ['event-starter', 'event-pro', 'event-premium'].includes(formData.plan)) {
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
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
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
      if (formData.role === 'event-organizer' && formData.plan && ['event-starter', 'event-pro', 'event-premium'].includes(formData.plan)) {
        console.log('🔄 Creating Stripe checkout session for event organizer plan:', formData.plan);
        
        try {
          // Create Stripe checkout session directly
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
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
              hasValidReferral: false, // No referral codes for event organizers yet
              referralCode: null,
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

      // For basic plan, customers, or free event organizers, save user data and redirect to dashboard
      if (formData.role === 'customer' || formData.plan === 'basic' || (formData.role === 'event-organizer' && !formData.plan)) {
        console.log('🔄 Saving user data and redirecting to appropriate dashboard');
        await setDoc(doc(db, 'users', user.uid), userData);
        console.log('✅ User document saved to Firestore with role:', userData.role);
        
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
    <div className="sign-up-container">
      <h1>Sign Up</h1>
      <p>Create your account to get started with Grubana.</p>

      <form id="signup-form" onSubmit={handleSubmit}>
  {error && <div className="error-message">{error}</div>}

  <label htmlFor="role">Sign up as:</label>
  <select
    id="role"
    name="role"
    value={formData.role}
    onChange={handleChange}
    required
  >
    <option value="">Select Role</option>
    <option value="customer">Foodie Fan</option>
    <option value="owner">Mobile Kitchen Owner</option>
    <option value="event-organizer">Event Organizer</option>
  </select>

  <label htmlFor="username">Username</label>
  <input
    type="text"
    id="username"
    name="username"
    value={formData.username}
    onChange={handleChange}
    required
    placeholder="Choose a username"
  />

  {formData.role === 'owner' && (
    <>
      <label>Type of Mobile Kitchen:</label>
      <div className="kitchen-radio-group">
      <label className="kitchen-radio-option">
          <input
            type="radio"
            name="kitchenType"
            value="truck"
            checked={formData.kitchenType === 'truck'}
            onChange={handleChange}
            required
          />{' '}
           <span>Food Truck</span>
        </label>
        {' '}
        <label className="kitchen-radio-option">
          <input
            type="radio"
            name="kitchenType"
            value="trailer"
            checked={formData.kitchenType === 'trailer'}
            onChange={handleChange}
            required
          />{' '}
          <span>Food Trailer</span>
        </label>
      </div>

      <label htmlFor="truck-name">Mobile Kitchen Name</label>
      <input
        type="text"
        id="truck-name"
        name="truckName"
        value={formData.truckName}
        onChange={handleChange}
        required
        placeholder="Enter your food truck name"
      />

      <label htmlFor="owner-name">Owner's Name</label>
      <input
        type="text"
        id="owner-name"
        name="ownerName"
        value={formData.ownerName}
        onChange={handleChange}
        required
        placeholder="Enter the owner's name"
      />

      <label htmlFor="phone">Phone Number</label>
      <input
        type="tel"
        id="phone"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        required
        placeholder="Enter your phone number"
      />

      <label htmlFor="location">Location (City)</label>
      <input
        type="text"
        id="location"
        name="location"
        value={formData.location}
        onChange={handleChange}
        required
        placeholder="Enter your food truck location"
      />

      <label htmlFor="cuisine">Cuisine Type</label>
      <select
        id="cuisine"
        name="cuisine"
        value={formData.cuisine}
        onChange={handleChange}
        required
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

      <label htmlFor="hours">Service Hours</label>
      <input
        type="text"
        id="hours"
        name="hours"
        value={formData.hours}
        onChange={handleChange}
        required
        placeholder="Enter your service hours (e.g., 11 AM - 9 PM)"
      />

      <label htmlFor="description">Food Truck Description</label>
      <textarea
        id="description"
        name="description"
        rows="4"
        value={formData.description}
        onChange={handleChange}
        placeholder="Tell us more about your food truck and menu"
      />
    </>
  )}

  {formData.role === 'event-organizer' && (
    <>
      <label htmlFor="organization-name">Organization Name</label>
      <input
        type="text"
        id="organization-name"
        name="organizationName"
        value={formData.organizationName}
        onChange={handleChange}
        required
        placeholder="Enter your organization name"
      />

      <label htmlFor="organization-type">Organization Type</label>
      <select
        id="organization-type"
        name="organizationType"
        value={formData.organizationType}
        onChange={handleChange}
        required
      >
        <option value="">Select Organization Type</option>
        <option value="non-profit">Non-Profit</option>
        <option value="city">City/Municipality</option>
        <option value="private">Private Company</option>
        <option value="corporate">Corporate</option>
      </select>

      <label htmlFor="contact-person">Contact Person</label>
      <input
        type="text"
        id="contact-person"
        name="contactPerson"
        value={formData.contactPerson}
        onChange={handleChange}
        required
        placeholder="Enter primary contact person"
      />

      <label htmlFor="phone">Phone Number</label>
      <input
        type="tel"
        id="phone"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        required
        placeholder="Enter your phone number"
      />

      <label htmlFor="organization-address">Organization Address</label>
      <input
        type="text"
        id="organization-address"
        name="address"
        value={formData.address}
        onChange={handleChange}
        required
        placeholder="Enter your organization address"
      />

      <label htmlFor="website">Website (Optional)</label>
      <input
        type="url"
        id="website"
        name="website"
        value={formData.website}
        onChange={handleChange}
        placeholder="Enter your website URL"
      />

      <label htmlFor="experience-years">Years of Event Experience</label>
      <select
        id="experience-years"
        name="experienceYears"
        value={formData.experienceYears}
        onChange={handleChange}
        required
      >
        <option value="">Select Experience Level</option>
        <option value="0">New to event organizing</option>
        <option value="1">1-2 years</option>
        <option value="3">3-5 years</option>
        <option value="6">6-10 years</option>
        <option value="11">10+ years</option>
      </select>

      <label htmlFor="event-description">Tell us about your events</label>
      <textarea
        id="event-description"
        name="eventDescription"
        rows="4"
        value={formData.eventDescription}
        onChange={handleChange}
        placeholder="Describe the types of events you organize (festivals, markets, corporate events, etc.)"
      />

      <EventOrganizerPlanSelector
        selectedPlan={formData.plan}
        onPlanSelect={handlePlanSelect}
      />
    </>
  )}

  <label htmlFor="email">Email Address</label>
  <input
    type="email"
    id="email"
    name="email"
    value={formData.email}
    onChange={handleChange}
    required
    placeholder="Enter your email address"
  />

  <label htmlFor="password">Password</label>
  <input
    type="password"
    id="password"
    name="password"
    value={formData.password}
    onChange={handleChange}
    required
    placeholder="Enter a password"
  />

  <label htmlFor="confirm-password">Confirm Password</label>
  <input
    type="password"
    id="confirm-password"
    name="confirmPassword"
    value={formData.confirmPassword}
    onChange={handleChange}
    required
    placeholder="Confirm your password"
  />

{formData.role === 'owner' && (
  <>
    <label htmlFor="plan">Choose Your Plan:</label>
    <select
      id="plan"
      name="plan"
      value={formData.plan}
      onChange={handleChange}
      required
    >
      <option value="">Select Plan</option>
      <option value="basic">Basic (Free) - Discovery map, truck/trailer & menu photo uploads, manual location updates</option>
      <option value="pro">Pro ($9.99/month) - Basic + Real-time GPS tracking + heat map features showing demand areas</option>
      <option value="all-access">All Access ($19.99/month) - Basic/Pro + Analytics + exclusive deal drops</option>
    </select>

    {(formData.plan === 'pro' || formData.plan === 'all-access') && (
      <>
        <label htmlFor="referralCode">Referral Code (Optional)</label>
        <input
          type="text"
          id="referralCode"
          name="referralCode"
          value={formData.referralCode}
          onChange={handleChange}
          placeholder="Enter referral code for special offers"
          style={{
            borderColor: formData.referralCode && !isValidReferral ? '#dc3545' : 
                        formData.referralCode && isValidReferral ? '#28a745' : '#ccc'
          }}
        />
        {referralMessage && (
          <div style={{
            padding: '8px',
            borderRadius: '4px',
            marginTop: '5px',
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
  </>
)}

  <button type="submit" className="btn">Sign Up</button>
  <p>Already have an account? <Link to="/login">Login</Link></p>
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
