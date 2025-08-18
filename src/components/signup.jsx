import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Footer from '../components/footer';
import { Link } from 'react-router-dom';
import '../assets/styles.css';


const SignUp = () => {
  const navigate = useNavigate();
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
  });

  const [error, setError] = useState(null);

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

const userData = {
  ...fieldsToSave,
  uid: user.uid,
  createdAt: serverTimestamp(),
  plan: 'basic',
  subscriptionStatus: 'active', // Basic is always active
  subscriptionId: null, // Placeholder for Stripe subscription ID
};

      // For Pro/All Access plans, create basic account first, then redirect to checkout
      if (formData.role === 'owner' && (formData.plan === 'pro' || formData.plan === 'all-access')) {
        // Set basic location data for geolocation (will be upgraded after payment)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              await setDoc(doc(db, 'truckLocations', user.uid), {
                ownerUid: user.uid,
                uid: user.uid,
                truckName: formData.truckName,
                kitchenType: formData.kitchenType,
                cuisine: formData.cuisine,
                lat: latitude,
                lng: longitude,
                isLive: false, // Start as hidden until payment
                visible: false, // Start as hidden until payment
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastActive: Date.now(),
              }, { merge: true });
            },
            (error) => {
              console.error('Geolocation error:', error);
            }
          );
        }
      }

      // Create user document in 'users' collection (always as Basic first)
      await setDoc(doc(db, 'users', user.uid), userData);

      // Send welcome email for Basic plan users
      if (formData.plan === 'basic' || !formData.plan) {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          console.log('Sending welcome email to:', formData.email, 'via API:', API_URL);
          
          const response = await fetch(`${API_URL}/api/send-welcome-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              username: formData.username || formData.ownerName,
              plan: 'basic'
            }),
          });

          const result = await response.json();
          console.log('Welcome email response:', result);
          
          if (!response.ok) {
            console.error('Welcome email failed:', result);
          }
        } catch (emailErr) {
          console.error('Error sending welcome email:', emailErr);
          // Don't fail signup if email fails
        }
      }

      // Redirect based on intended plan
      console.log('🔍 Signup Debug - formData.role:', formData.role);
      console.log('🔍 Signup Debug - formData.plan:', formData.plan);
      console.log('🔍 Signup Debug - Checking redirect logic...');
      
      if (formData.role === 'owner' && (formData.plan === 'pro' || formData.plan === 'all-access')) {
        console.log('🔄 Redirecting to checkout for paid plan:', formData.plan);
        // For paid plans, redirect to checkout
        navigate('/checkout', { state: { selectedPlan: formData.plan, userId: user.uid } });
      } else {
        console.log('🔄 Redirecting to dashboard for basic plan or customer');
        // Basic plan or customer - go directly to dashboard
        navigate(formData.role === 'customer' ? '/customer-dashboard' : '/dashboard');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error signing up:', err);
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
      <option value="basic">Basic (Free) - Discovery map, demand pins, manual updates</option>
      <option value="pro">Pro ($9.99/month) - Real-time GPS tracking + menu display</option>
      <option value="all-access">All Access ($19.99/month) - Analytics, drops, featured placement</option>
    </select>
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
