import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      // Retrieve session details and update user's subscription status
      const updateUserSubscription = async () => {
        try {
          const user = auth.currentUser;
          if (user) {
            // Fetch session details from your server to get plan info
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${API_URL}/session-details`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            });

            let planType = 'all-access'; // default
            let customerId = null;
            let subscriptionId = null;
            
            if (response.ok) {
              const sessionData = await response.json();
              planType = sessionData.planType || 'all-access';
              customerId = sessionData.customerId;
              subscriptionId = sessionData.subscriptionId;

              // Ensure subscriptionId is available before updating Firestore
              if (!subscriptionId) {
                console.error('Stripe subscription ID is missing. Firestore update will be incomplete.');
              }

              console.log('Session data:', sessionData);
            } else {
              console.error('Failed to fetch session details:', response.status);
            }

            // Update user document with subscription info
            const updateData = {
              subscriptionStatus: 'trialing',
              subscriptionSessionId: sessionId,
              plan: planType, // Ensure the Firestore field matches the variable
              updatedAt: new Date()
            };

            // Add Stripe customer ID if available
            if (customerId) {
              updateData.stripeCustomerId = customerId;
            }

            // Add subscription ID if available
            if (subscriptionId) {
              updateData.subscriptionId = subscriptionId;
            }

            await updateDoc(doc(db, 'users', user.uid), updateData);
            
            console.log('User subscription updated:', updateData);
          }
          setLoading(false);
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        } catch (err) {
          console.error('Error updating subscription:', err);
          setError('There was an error processing your subscription.');
          setLoading(false);
        }
      };

      updateUserSubscription();
    } else {
      setError('Invalid session.');
      setLoading(false);
    }
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="success-container" style={{ textAlign: 'center', padding: '50px', maxWidth: '600px', margin: '0 auto' }}>
        <h1>Processing your subscription...</h1>
        <div className="loading-spinner">⏳</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="success-container" style={{ textAlign: 'center', padding: '50px', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ color: 'red' }}>Error</h1>
        <p>{error}</p>
        <button 
          onClick={() => navigate('/pricing')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#2c6f57',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Back to Pricing
        </button>
      </div>
    );
  }

  return (
    <div className="success-container" style={{ textAlign: 'center', padding: '50px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
      <h1 style={{ color: '#2c6f57' }}>Welcome to Grubana!</h1>
      <h2>Your 30-day free trial has started!</h2>
      
      <div style={{ backgroundColor: '#f0f8f4', padding: '20px', borderRadius: '8px', margin: '30px 0' }}>
        <h3>What happens next:</h3>
        <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
          <li>✅ Your free trial is active for 30 days</li>
          <li>🔒 You won't be charged until the trial ends</li>
          <li>📊 Full access to all premium features</li>
          <li>❌ Cancel anytime before the trial ends</li>
        </ul>
      </div>

      <p>Redirecting to your dashboard in a few seconds...</p>
      
      <button 
        onClick={() => navigate('/dashboard')}
        style={{
          padding: '12px 24px',
          backgroundColor: '#2c6f57',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Go to Dashboard Now
      </button>
    </div>
  );
};

export default Success;
