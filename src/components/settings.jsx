import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import OwnerSettings from './OwnerSettings';
import CustomerSettings from './CustomerSettings';
import MediaUploader from './MediaUploader';

const Settings = () => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [plan, setPlan] = useState(null);
  const [cardInfo, setCardInfo] = useState(null);
  const [cancelMsg, setCancelMsg] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [stripeMsg, setStripeMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRole = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRole(userData.role);
          setSubscriptionId(userData.subscriptionId || null);
          setPlan(userData.plan || 'basic');
          setCardInfo(userData.cardInfo || null);
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    };

    fetchRole();
  }, [navigate]);

  const handleCancelSubscription = async () => {
    if (!subscriptionId) {
      setCancelMsg('No active subscription found.');
      return;
    }
    setCancelLoading(true);
    setCancelMsg('');
    try {
      const res = await fetch('/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      const data = await res.json();
      if (data.canceled) {
        setCancelMsg('Subscription canceled. You will not be billed again.');
      } else {
        setCancelMsg(data.error?.message || 'Error canceling subscription.');
      }
    } catch (err) {
      setCancelMsg('Error canceling subscription.');
    }
    setCancelLoading(false);
  };

  // NEW: Stripe Customer Portal handler
  const handleManageSubscription = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      console.log('Using API URL:', API_URL);
      console.log('All env vars:', import.meta.env);
      
      if (!API_URL) {
        setStripeMsg('API URL not configured. Please check environment variables.');
        return;
      }

      if (!auth.currentUser?.uid) {
        setStripeMsg('User not authenticated. Please log in again.');
        return;
      }

      console.log('User ID being sent:', auth.currentUser.uid);
      setStripeMsg('Connecting to server...'); // Show loading state
      
      const res = await fetch(`${API_URL}/create-customer-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: auth.currentUser.uid }),
      });

      const data = await res.json();
      console.log('Server response data:', data);
      
      if (!res.ok) {
        console.error('Server response:', data);
        throw new Error(`HTTP error! status: ${res.status} - ${data.error?.message || 'Unknown error'}`);
      }

      if (data.url) {
        setStripeMsg('Redirecting to Stripe portal...');
        window.location.href = data.url; // Redirect to Stripe portal
      } else {
        setStripeMsg(data.error?.message || 'Could not open Stripe portal.');
      }
    } catch (error) {
      console.error('Error in handleManageSubscription:', error);
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setStripeMsg('Unable to connect to server. Please check your internet connection or try again later.');
      } else if (error.message.includes('userDoc.exists is not a function')) {
        setStripeMsg('Server configuration issue detected. Please contact support or try again later. As an alternative, you can manage your subscription directly at stripe.com/billing with your account email.');
      } else {
        setStripeMsg(`Error: ${error.message}`);
      }
    }
  };

  if (loading) {
    return <p>Loading settings...</p>;
  }
  
  return (
    <div>
      {role === 'owner' && (
        <OwnerSettings
          plan={plan}
          cardInfo={cardInfo}
          handleManageSubscription={handleManageSubscription}
          stripeMsg={stripeMsg}
        />
      )}
      {role === 'customer' && <CustomerSettings />}
      {role && role !== 'customer' && role !== 'owner' && (
        <p>Role not found. Please contact support.</p>
      )}
    </div>
  );
};

export default Settings;