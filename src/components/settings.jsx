import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import OwnerSettings from './OwnerSettings';
import CustomerSettings from './CustomerSettings';

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
      const res = await fetch('http://localhost:4242/cancel-subscription', {
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
    const res = await fetch('http://localhost:4242/create-customer-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: auth.currentUser.uid }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url; // Redirect to Stripe portal
    } else {
      setStripeMsg(data.error?.message || 'Could not open Stripe portal.');
    }
  };

  if (loading) {
    return <p>Loading settings...</p>;
  }
  
  if (role === 'owner') {
    return (
      <>
        <OwnerSettings />
        <div style={{ marginTop: 32 }}>
          <h3>Subscription Management</h3>
          <p>
            <strong>Current Plan:</strong> {plan === 'all-access' ? 'All-Access (Paid)' : 'Basic (Free)'}
          </p>
          {cardInfo && (
            <p>
              <strong>Card on file:</strong> {cardInfo.brand?.toUpperCase()} ending in {cardInfo.last4}
            </p>
          )}
          <button onClick={handleManageSubscription}>
            Manage Subscription
          </button>
          {stripeMsg && (
  <p style={{ color: "red", marginTop: "10px" }}>{stripeMsg}</p>
)}
        </div>
      </>
    );
  } else if (role === 'customer') {
    return <CustomerSettings />;
  } else {
    return <p>Role not found. Please contact support.</p>;
  }
};

export default Settings;