import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Now using the auth imported here
import '../assets/index.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const role = userData.role;

            if (role === 'owner') {
              navigate('/dashboard');
            } else if (role === 'event-organizer') {
              navigate('/event-dashboard');
            } else {
              navigate('/customer-dashboard');
            }
          } else {
            console.error('No user document found.');
            navigate('/customer-dashboard'); // Default fallback
          }

          unsubscribe(); // Clean up the listener
        }
      });
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login to Your Account</h2>

      <form onSubmit={handleLogin}>
        <label htmlFor="email">Email Address:</label>
        <input
          type="email"
          id="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>

      <p className="signup-redirect">
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>
      <p style={{ marginTop: '6px' }}>
        <Link to="/forgotpassword">Forgot Password?</Link>
      </p>
    </div>
  );
};

export default Login;
