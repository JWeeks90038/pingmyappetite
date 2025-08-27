import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { SUBSCRIPTION_PLANS, getAllSubscriptionPlans } from '../server/paymentConfig';

const SubscriptionManagement = () => {
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Get current subscription
      const response = await fetch(`http://localhost:3000/api/marketplace/subscription/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data.subscription);
      }
      
      // Set available plans
      setAvailablePlans(getAllSubscriptionPlans());
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (newPlanId) => {
    if (!user || processing) return;
    
    try {
      setProcessing(true);
      setError('');
      
      const currentPlanId = currentSubscription?.planId || 'basic';
      
      if (currentPlanId === newPlanId) {
        setError('You are already on this plan');
        return;
      }
      
      // For paid plans, we would need to collect payment method
      // For now, let's handle the basic (free) plan switch
      if (newPlanId === 'basic') {
        const response = await fetch(`http://localhost:3000/api/marketplace/subscription/${user.uid}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user.getIdToken()}`
          },
          body: JSON.stringify({
            planId: newPlanId
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setCurrentSubscription(data.subscription || { planId: newPlanId });
          alert(`Successfully switched to ${SUBSCRIPTION_PLANS[newPlanId].name} plan!`);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to update subscription');
        }
      } else {
        // For paid plans, you would integrate with Stripe Elements
        // to collect payment method and then call the subscription API
        setError('Paid plan upgrades require payment method integration (coming soon)');
      }
      
    } catch (error) {
      console.error('Error changing plan:', error);
      setError('Failed to change subscription plan');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading subscription information...</div>
      </div>
    );
  }

  const currentPlan = currentSubscription?.plan || SUBSCRIPTION_PLANS.basic;
  const currentPlanId = currentSubscription?.planId || 'basic';

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#333', marginBottom: '10px' }}>Subscription Management</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Manage your food truck's subscription plan and platform fees
      </p>

      {error && (
        <div style={{
          backgroundColor: '#fee',
          color: '#c33',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}

      {/* Current Plan Status */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ color: '#333', margin: '0 0 10px 0' }}>Current Plan</h3>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c6f57', marginBottom: '10px' }}>
          {currentPlan.name}
          {currentPlan.price > 0 && (
            <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#666' }}>
              {' '}${currentPlan.price}/month
            </span>
          )}
        </div>
        <div style={{ fontSize: '18px', color: '#e74c3c', marginBottom: '10px' }}>
          Platform Fee: {(currentPlan.platformFeePercentage * 100).toFixed(1)}% per item
        </div>
        <div style={{ color: '#666' }}>
          Status: {currentSubscription?.subscriptionStatus || 'Active'}
        </div>
      </div>

      {/* Available Plans */}
      <h3 style={{ color: '#333', marginBottom: '20px' }}>Available Plans</h3>
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {availablePlans.map(plan => {
          const isCurrentPlan = plan.id === currentPlanId;
          const isUpgrade = plan.price > currentPlan.price;
          const isDowngrade = plan.price < currentPlan.price;
          
          return (
            <div
              key={plan.id}
              style={{
                border: isCurrentPlan ? '2px solid #2c6f57' : '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: isCurrentPlan ? '#f0f8f4' : 'white',
                position: 'relative'
              }}
            >
              {isCurrentPlan && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '20px',
                  backgroundColor: '#2c6f57',
                  color: 'white',
                  padding: '5px 15px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  CURRENT PLAN
                </div>
              )}
              
              <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{plan.name}</h4>
              
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c6f57', marginBottom: '15px' }}>
                {plan.price === 0 ? 'Free' : `$${plan.price.toFixed(2)}/month`}
              </div>
              
              <div style={{ fontSize: '16px', color: '#e74c3c', marginBottom: '15px' }}>
                Platform Fee: {(plan.platformFeePercentage * 100).toFixed(1)}% per item
              </div>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                {plan.features.map((feature, index) => (
                  <li key={index} style={{ padding: '5px 0', color: '#666' }}>
                    ✓ {feature}
                  </li>
                ))}
              </ul>
              
              {!isCurrentPlan && (
                <button
                  onClick={() => handlePlanChange(plan.id)}
                  disabled={processing}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: isUpgrade ? '#2c6f57' : isDowngrade ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    opacity: processing ? 0.6 : 1
                  }}
                >
                  {processing ? 'Processing...' : isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Switch Plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Fee Comparison */}
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ color: '#333', marginBottom: '15px' }}>Fee Comparison Example</h3>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Platform fees on a $100 order:
        </p>
        
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {availablePlans.map(plan => {
            const exampleOrderValue = 10000; // $100 in cents
            const platformFee = exampleOrderValue * plan.platformFeePercentage;
            const truckReceives = exampleOrderValue - platformFee;
            
            return (
              <div key={plan.id} style={{ 
                padding: '15px', 
                backgroundColor: 'white', 
                borderRadius: '6px',
                border: plan.id === currentPlanId ? '2px solid #2c6f57' : '1px solid #ddd'
              }}>
                <div style={{ fontWeight: 'bold', color: '#333' }}>{plan.name}</div>
                <div style={{ color: '#e74c3c', fontSize: '14px' }}>
                  Platform Fee: ${(platformFee / 100).toFixed(2)}
                </div>
                <div style={{ color: '#2c6f57', fontSize: '14px' }}>
                  You Receive: ${(truckReceives / 100).toFixed(2)}
                </div>
                {plan.price > 0 && (
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    + ${plan.price}/month subscription
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagement;
