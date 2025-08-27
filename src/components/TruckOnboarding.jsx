import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const TruckOnboarding = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [accountDetails, setAccountDetails] = useState(null);

  useEffect(() => {
    if (user) {
      checkAccountStatus();
    }
  }, [user]);

  const checkAccountStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/marketplace/trucks/status', {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      const data = await response.json();
      setAccountStatus(data.status || 'no_account');
      setAccountDetails(data);
    } catch (error) {
      console.error('Error checking account status:', error);
    }
  };

  const createStripeAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/marketplace/trucks/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          email: user.email,
          country: 'US'
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Account created, now get onboarding link
        await getOnboardingLink();
      } else {
        throw new Error(data.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Failed to create Stripe account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getOnboardingLink = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/marketplace/trucks/onboarding-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          refreshUrl: window.location.href,
          returnUrl: window.location.href
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create onboarding link');
      }
    } catch (error) {
      console.error('Error getting onboarding link:', error);
      alert('Failed to get onboarding link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderAccountStatus = () => {
    if (!accountStatus) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px',
          color: '#666'
        }}>
          Checking account status...
        </div>
      );
    }

    switch (accountStatus) {
      case 'no_account':
        return (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#856404', marginBottom: '15px' }}>
              🏪 Set Up Your Payment Account
            </h3>
            <p style={{ color: '#856404', marginBottom: '15px' }}>
              To start accepting orders and payments from customers, you need to set up a Stripe payment account. 
              This is secure and free - Stripe handles all payment processing for you.
            </p>
            <button
              onClick={createStripeAccount}
              disabled={loading}
              style={{
                backgroundColor: '#2c6f57',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Setting up...' : 'Set Up Payment Account'}
            </button>
          </div>
        );

      case 'pending':
        return (
          <div style={{
            backgroundColor: '#cce5ff',
            border: '1px solid #99ccff',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#0066cc', marginBottom: '15px' }}>
              ⏳ Account Setup In Progress
            </h3>
            <p style={{ color: '#0066cc', marginBottom: '15px' }}>
              Your payment account is being set up. You may need to complete additional verification steps.
            </p>
            
            {accountDetails && !accountDetails.detailsSubmitted && (
              <div style={{ marginBottom: '15px' }}>
                <button
                  onClick={getOnboardingLink}
                  disabled={loading}
                  style={{
                    backgroundColor: '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Loading...' : 'Complete Setup'}
                </button>
              </div>
            )}

            {accountDetails?.requirements && (
              <div style={{ 
                backgroundColor: 'white', 
                padding: '15px', 
                borderRadius: '6px',
                marginTop: '15px'
              }}>
                <h4 style={{ color: '#0066cc', marginBottom: '10px' }}>
                  Required Information:
                </h4>
                <ul style={{ color: '#0066cc', margin: 0, paddingLeft: '20px' }}>
                  {accountDetails.requirements.currently_due?.map((req, index) => (
                    <li key={index} style={{ marginBottom: '5px' }}>
                      {req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'active':
        return (
          <div style={{
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#155724', marginBottom: '15px' }}>
              ✅ Payment Account Active
            </h3>
            <p style={{ color: '#155724', marginBottom: '15px' }}>
              Great! Your payment account is set up and ready to accept orders. 
              Customers can now place pre-orders from your truck.
            </p>
            
            <div style={{ 
              backgroundColor: 'white', 
              padding: '15px', 
              borderRadius: '6px',
              marginTop: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#155724' }}>Charges Enabled:</span>
                <span style={{ color: accountDetails?.chargesEnabled ? '#28a745' : '#dc3545' }}>
                  {accountDetails?.chargesEnabled ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#155724' }}>Payouts Enabled:</span>
                <span style={{ color: accountDetails?.payoutsEnabled ? '#28a745' : '#dc3545' }}>
                  {accountDetails?.payoutsEnabled ? '✅ Yes' : '❌ No'}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h2 style={{ 
        textAlign: 'center', 
        color: '#2c6f57', 
        marginBottom: '30px' 
      }}>
        💳 Payment Setup
      </h2>

      {renderAccountStatus()}

      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <h3 style={{ color: '#2c6f57', marginBottom: '15px' }}>
          How Pre-Orders Work
        </h3>
        <ul style={{ color: '#666', lineHeight: '1.6' }}>
          <li>Customers can browse your menu and place orders before arriving</li>
          <li>You'll receive notifications when orders come in</li>
          <li>Payments are processed securely through Stripe</li>
          <li>You get paid directly to your bank account (minus small processing fees)</li>
          <li>Platform takes a 2% fee to support the service</li>
        </ul>
      </div>

      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px',
        fontSize: '14px',
        color: '#666'
      }}>
        Need help? Contact support at support@grubana.com
      </div>
    </div>
  );
};

export default TruckOnboarding;
