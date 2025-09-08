import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../assets/styles.css';
import PaymentForm from './PaymentForm';

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const selectedPlan = location.state?.selectedPlan || 'all-access';
  const hasValidReferral = location.state?.hasValidReferral || false;
  const referralCode = location.state?.referralCode || '';
  const userId = location.state?.userId;

  // Function to go back to previous plan
  const handleGoBackToPreviousPlan = async () => {
    const currentUserPlan = userData?.plan || 'basic';
    
    // Determine what plan to go back to
    let previousPlanName = 'Starter (Free)';
    if (currentUserPlan === 'pro') {
      previousPlanName = 'Pro Plan';
    } else if (currentUserPlan === 'all-access') {
      previousPlanName = 'All-Access Plan';
    } else if (currentUserPlan === 'event-premium') {
      previousPlanName = 'Event Premium Plan';
    }

    if (window.confirm(`Are you sure you want to go back to your ${previousPlanName}? You can always upgrade again later.`)) {
      try {
        // Update user document to remove any pending upgrade flags
        if (userData && user) {
          await updateDoc(doc(db, 'users', user.uid), {
            pendingUpgrade: null,
            upgradeAttempt: null,
            lastUpgradeAttempt: new Date().toISOString()
          });
        }
        
        // Navigate back based on user role
        if (userData?.role === 'organizer') {
          navigate('/dashboard');
        } else if (userData?.role === 'owner') {
          navigate('/dashboard');
        } else {
          navigate('/dashboard');
        }
        
      } catch (error) {
        console.error('Error returning to previous plan:', error);
        alert('Failed to return to previous plan. Please try again.');
      }
    }
  };

  const planDetails = {
    pro: {
      name: 'Pro Plan',
      price: '$9.99/month',
      amount: 999,
      features: [
        '✅ Everything in Starter',
        '✅ Real-time GPS location tracking',
        '✅ Access to citywide heat maps showing demand zones'
      ]
    },
    'all-access': {
      name: 'All Access Plan',
      price: '$19.99/month',
      amount: 1999,
      features: [
        '✅ Everything in Starter & Pro',
        '✅ Advanced analytics dashboard',
        '✅ Create promotional drops and deals'
      ]
    }
  };

  const currentPlan = planDetails[selectedPlan];

  return (
    <>
      <section className="checkout-container">
        <h1>Secure Checkout</h1>
        <p>Subscribe to the {currentPlan.name} for {currentPlan.price}.</p>
        
        {/* Go Back to Previous Plan Button */}
        {userData?.plan && userData.plan !== 'basic' && (
          <div style={{ 
            textAlign: 'center', 
            margin: '20px 0' 
          }}>
            <button 
              onClick={handleGoBackToPreviousPlan}
              style={{
                backgroundColor: '#f8f9fa',
                border: '2px solid #2c6f57',
                borderRadius: '8px',
                padding: '12px 24px',
                color: '#2c6f57',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e8f5e8';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#f8f9fa';
              }}
            >
              ← Go Back to {userData.plan === 'pro' ? 'Pro Plan' : 
                          userData.plan === 'all-access' ? 'All-Access Plan' : 
                          userData.plan === 'event-premium' ? 'Event Premium Plan' : 
                          'Previous Plan'}
            </button>
          </div>
        )}

        {hasValidReferral ? (
          <div style={{ 
            backgroundColor: '#d4edda', 
            border: '1px solid #c3e6cb', 
            borderRadius: '8px', 
            padding: '15px', 
            margin: '20px 0',
            textAlign: 'center' 
          }}>
            <p style={{ margin: '0', color: '#155724', fontWeight: 'bold' }}>
              🎉 Referral Code Applied: {referralCode}
            </p>
            <p style={{ margin: '5px 0 0 0', color: '#155724' }}>
              <strong>30-day free trial included!</strong> No charges during trial period.
            </p>
          </div>
        ) : (
          <p><strong>30-day free trial included!</strong></p>
        )}

        {/* Selected Plan Features */}
        <div className="selected-plan-features" style={{ margin: "24px 0" }}>
          <h3>{currentPlan.name} Includes:</h3>
          <div style={{ textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
            {currentPlan.features.map((feature, index) => (
              <div key={index} style={{ margin: "8px 0" }}>{feature}</div>
            ))}
          </div>
        </div>

        <h2>Payment Details</h2>
        <div id="payment-form">
          <PaymentForm 
            planType={selectedPlan} 
            hasValidReferral={hasValidReferral}
            referralCode={referralCode}
            userId={userId}
          />
        </div>

        <p className="secure-info">🔒 Secure Payment via Stripe</p>
        <p className="trial-info">💡 Your 30-day free trial starts immediately. You won't be charged until the trial ends.</p>
      </section>
    </>
  );
};

export default Checkout;