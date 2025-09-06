import React from 'react';
import { Link } from 'react-router-dom';

const OrderCancelled = () => {
  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      {/* Cancelled Icon */}
      <div style={{
        fontSize: '80px',
        marginBottom: '20px'
      }}>
        ❌
      </div>

      {/* Cancelled Message */}
      <h1 style={{
        color: '#dc3545',
        marginBottom: '20px',
        fontSize: '32px'
      }}>
        Order Cancelled
      </h1>

      <p style={{
        fontSize: '18px',
        color: '#666',
        marginBottom: '30px',
        lineHeight: '1.6'
      }}>
        Your order was cancelled and no payment was processed. 
        You can go back and try placing your order again.
      </p>

      {/* Info Box */}
      <div style={{
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <h3 style={{ color: '#856404', marginBottom: '10px' }}>
          Why was my order cancelled?
        </h3>
        <ul style={{ 
          color: '#856404', 
          textAlign: 'left',
          paddingLeft: '20px',
          margin: 0
        }}>
          <li style={{ marginBottom: '5px' }}>You clicked "Cancel" during checkout</li>
          <li style={{ marginBottom: '5px' }}>You closed the payment window</li>
          <li style={{ marginBottom: '5px' }}>There was a payment processing issue</li>
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
          to="/dashboard"
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
          Try Again
        </Link>
        
        <Link 
          to="/"
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
          Back to Home
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
          Having trouble? Contact us at{' '}
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

export default OrderCancelled;
