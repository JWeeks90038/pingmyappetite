import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase"; // make sure this is your Firebase auth export

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await sendPasswordResetEmail(auth, email, {
        url: 'https://www.grubana.com/password-reset-success',
        handleCodeInApp: false,
      });
      setMessage("Password reset email sent! Check your inbox.");
    } catch (err) {
      setError("Failed to send reset email. Please try again.");
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
        marginBottom: '20px',
        fontSize: '24px',
        fontWeight: '600',
        textAlign: 'center'
      }}>Forgot Password</h2>
      
      <p style={{
        color: '#FFFFFF',
        marginBottom: '30px',
        fontSize: '16px',
        opacity: '0.8',
        lineHeight: '1.5'
      }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleReset} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <label style={{
            color: '#FFFFFF',
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            textAlign: 'center'
          }}>Email Address:</label>
          <input
            type="email"
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
        
        <button type="submit" style={{
          padding: '14px 28px',
          backgroundColor: '#FF4EC9',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background-color 0.3s ease',
          marginTop: '10px'
        }}>Send Reset Link</button>
      </form>
      
      {message && (
        <p style={{ 
          color: '#00E676', 
          margin: '20px 0 0 0', 
          fontSize: '14px',
          textAlign: 'center',
          padding: '12px',
          backgroundColor: 'rgba(0, 230, 118, 0.1)',
          borderRadius: '8px',
          border: '1px solid #00E676'
        }}>{message}</p>
      )}
      
      {error && (
        <p style={{ 
          color: '#FF4EC9', 
          margin: '20px 0 0 0', 
          fontSize: '14px',
          textAlign: 'center',
          padding: '12px',
          backgroundColor: 'rgba(255, 78, 201, 0.1)',
          borderRadius: '8px',
          border: '1px solid #FF4EC9'
        }}>{error}</p>
      )}
    </div>
  );
};

export default ForgotPassword;
