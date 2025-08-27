import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { auth } from "../firebase";
import { getPriceId } from "../utils/stripe";

const PaymentForm = ({ planType = 'all-access', hasValidReferral = false, referralCode = '', userId = null }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCheckout = async () => {
    setLoading(true);
    setMessage("");

    try {
      const user = auth.currentUser;
      const priceId = getPriceId(planType);
      
      if (!priceId) {
        setMessage("Price configuration error. Please try again.");
        setLoading(false);
        return;
      }

      // Use your API base URL
      const API_URL = import.meta.env.VITE_API_URL || 'https://pingmyappetite-production.up.railway.app';
      console.log('Using API URL:', API_URL);
      console.log('Environment VITE_API_URL:', import.meta.env.VITE_API_URL);
      
      const response = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: priceId,
          planType: planType,
          uid: user?.uid || userId,
          hasValidReferral: hasValidReferral,
          referralCode: referralCode,
        }),
      });

      const { sessionId, url, error } = await response.json();
      
      if (error) {
        setMessage(error);
        setLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
      
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setMessage('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="payment-form">
      {message && (
        <div className="error-message" style={{ color: 'red', marginBottom: '16px' }}>
          {message}
        </div>
      )}
      
      <div className="checkout-info" style={{ marginBottom: '20px', textAlign: 'center' }}>
        {hasValidReferral ? (
          <>
            <p><strong>🎉 Referral Applied: {referralCode}</strong></p>
            <p><strong>✅ 30-day free trial included</strong></p>
            <p>You won't be charged until your trial ends</p>
            <p>Cancel anytime during your trial period</p>
          </>
        ) : (
          <>
            <p><strong>⚡ Start immediately - No trial period</strong></p>
            <p>Your subscription starts today with full access</p>
            <p>Cancel anytime from your dashboard</p>
          </>
        )}
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="checkout-button"
        style={{
          width: '100%',
          padding: '12px 24px',
          backgroundColor: '#2c6f57',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Processing...' : hasValidReferral ? `Start Your 30-Day Free Trial` : `Subscribe to ${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`}
      </button>
      
      <div className="powered-by-stripe" style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#666' }}>
        Powered by Stripe
      </div>
    </div>
  );
};

export default PaymentForm;
