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
    <div style={{
      backgroundColor: '#0B0B1A',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(255, 78, 201, 0.2)',
      border: '1px solid #1A1036',
      width: '100%',
      maxWidth: '500px',
      margin: '20px auto',
      textAlign: 'center'
    }}>
      <h2 style={{
        color: '#FFFFFF',
        marginBottom: '30px',
        fontSize: '24px',
        fontWeight: '600',
        textAlign: 'center'
      }}>Login to Your Account</h2>

      <form onSubmit={handleLogin} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <label htmlFor="email" style={{
            color: '#FFFFFF',
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            textAlign: 'center'
          }}>Email Address:</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#1A1036',
              border: '1px solid #4DBFFF',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <label htmlFor="password" style={{
            color: '#FFFFFF',
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            textAlign: 'center'
          }}>Password:</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#1A1036',
              border: '1px solid #4DBFFF',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button type="submit" disabled={isLoading} style={{
          padding: '14px 28px',
          backgroundColor: isLoading ? '#666' : '#FF4EC9',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.3s ease',
          marginTop: '10px'
        }}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        {error && <p style={{ 
          color: '#FF4EC9', 
          margin: '10px 0 0 0', 
          fontSize: '14px',
          textAlign: 'center' 
        }}>{error}</p>}
      </form>

      <p style={{
        color: '#FFFFFF',
        marginTop: '30px',
        fontSize: '14px',
        textAlign: 'center'
      }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{
          color: '#4DBFFF',
          textDecoration: 'none',
          fontWeight: '500'
        }}>Sign Up</Link>
      </p>
      <p style={{ 
        marginTop: '10px',
        textAlign: 'center'
      }}>
        <Link to="/forgotpassword" style={{
          color: '#4DBFFF',
          textDecoration: 'none',
          fontSize: '14px'
        }}>Forgot Password?</Link>
      </p>
    </div>
  );
};

export default Login;
