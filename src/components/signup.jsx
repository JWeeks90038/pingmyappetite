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
};

      if (formData.role === 'owner' && (formData.plan === 'pro' || formData.plan === 'all-access')) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await setDoc(doc(db, 'truckLocations', user.uid), {
          ...formData,
          ownerUid: user.uid,
          uid: user.uid,
          truckName: formData.truckName,
          kitchenType: formData.kitchenType,
          cuisine: formData.cuisine,
          lat: latitude,
          lng: longitude,
          isLive: true,
          visible: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastActive: Date.now(),
        }, { merge: true });
        //console.log('Truck location updated with geolocation');
      },
      (error) => {
        console.error('Geolocation error:', error);
      }
    );
  }
}

       // Create user document in 'users' collection
        await setDoc(doc(db, 'users', user.uid), userData);

      // Navigate based on the role and plan
      // Redirect based on plan
if (formData.plan === 'pro' || formData.plan === 'all-access') {
  navigate('/checkout', { state: { selectedPlan: formData.plan } }); 
} else {
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
        <option value="tacos">Tacos</option>
        <option value="bbq">BBQ</option>
        <option value="pizza">Pizza</option>
        <option value="sushi">Sushi</option>
        <option value="vegan">Vegan</option>
        <option value="burgers">Burgers</option>
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
