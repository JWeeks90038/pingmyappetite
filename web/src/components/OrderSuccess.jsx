import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // You could fetch order details here if needed
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Processing your order...</div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      {/* Success Icon */}
      <div style={{
        fontSize: '80px',
        marginBottom: '20px'
      }}>
        ✅
      </div>

      {/* Success Message */}
      <h1 style={{
        color: '#28a745',
        marginBottom: '20px',
        fontSize: '32px'
      }}>
        Order Placed Successfully!
      </h1>

      <p style={{
        fontSize: '18px',
        color: '#666',
        marginBottom: '30px',
        lineHeight: '1.6'
      }}>
        Thank you for your order! You'll receive an email confirmation shortly.
        The food truck will start preparing your order and you'll be notified when it's ready.
      </p>

      {/* Order Info */}
      {sessionId && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#2c6f57', marginBottom: '10px' }}>
            Order Details
          </h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Session ID: {sessionId}
          </p>
        </div>
      )}

      {/* Next Steps */}
      <div style={{
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '30px',
        textAlign: 'left'
      }}>
        <h3 style={{ color: '#0066cc', marginBottom: '15px' }}>
          What happens next?
        </h3>
        <ul style={{ color: '#0066cc', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>You'll receive an email confirmation</li>
          <li style={{ marginBottom: '8px' }}>The food truck will confirm your order</li>
          <li style={{ marginBottom: '8px' }}>You'll be notified when your food is ready</li>
          <li>Head to the truck location to pick up your order</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '15px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <Link 
          to="/my-orders"
          style={{
            backgroundColor: '#2c6f57',
            color: 'white',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'inline-block'
          }}
        >
          🍽️ Track Your Order
        </Link>
        
        <Link 
          to="/dashboard"
          style={{
            backgroundColor: 'white',
            color: '#2c6f57',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            border: '2px solid #2c6f57',
            display: 'inline-block'
          }}
        >
          Back to Map
        </Link>
      </div>

      {/* Support */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <p style={{ color: '#666', margin: 0 }}>
          Need help? Contact us at{' '}
          <a 
            href="mailto:support@grubana.com"
            style={{ color: '#2c6f57', textDecoration: 'none' }}
          >
            support@grubana.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default OrderSuccess;
