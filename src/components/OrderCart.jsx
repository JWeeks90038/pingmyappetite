import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const OrderCart = ({ cart, setCart, truckId, truckName }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(currentCart =>
      currentCart.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeFromCart = (itemId) => {
    setCart(currentCart => currentCart.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      return total + (parseFloat(item.price || 0) * item.quantity);
    }, 0);
  };

  const handleCheckout = async () => {
    if (!user) {
      alert('Please log in to place an order');
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/marketplace/orders/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          truckId: truckId,
          items: cart.map(item => ({
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price || 0),
            quantity: item.quantity
          })),
          customerEmail: user.email,
          successUrl: `${window.location.origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/order-cancelled`
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to process checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = calculateTotal();
  const platformFee = subtotal * 0.02; // 2% platform fee
  const total = subtotal;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ 
        color: '#333', 
        marginBottom: '20px',
        fontSize: '20px',
        textAlign: 'center'
      }}>
        Your Order
      </h3>

      {cart.length === 0 ? (
        <div style={{ 
          flex: 1,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#666',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🛒</div>
            <div>Your cart is empty</div>
            <div style={{ fontSize: '14px', marginTop: '5px' }}>
              Add items from the menu to get started
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            marginBottom: '20px'
          }}>
            {cart.map(item => (
              <div key={item.id} style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '10px',
                backgroundColor: 'white'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      fontSize: '14px',
                      marginBottom: '4px'
                    }}>
                      {item.name}
                    </div>
                    <div style={{ 
                      color: '#2c6f57',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      ${parseFloat(item.price || 0).toFixed(2)}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeFromCart(item.id)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#dc3545',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '0',
                      marginLeft: '8px'
                    }}
                  >
                    ×
                  </button>
                </div>
                
                {/* Quantity Controls */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      style={{
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      -
                    </button>
                    
                    <span style={{ 
                      minWidth: '20px', 
                      textAlign: 'center',
                      fontSize: '14px'
                    }}>
                      {item.quantity}
                    </span>
                    
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      style={{
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      +
                    </button>
                  </div>
                  
                  <div style={{ 
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    ${(parseFloat(item.price || 0) * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div style={{
            borderTop: '2px solid #eee',
            paddingTop: '15px',
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '12px',
              color: '#666'
            }}>
              <span>Platform fee (2%):</span>
              <span>${platformFee.toFixed(2)}</span>
            </div>
            
            <div style={{ 
              borderTop: '1px solid #eee',
              paddingTop: '8px',
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#2c6f57'
            }}>
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            style={{
              backgroundColor: loading ? '#ccc' : '#2c6f57',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '15px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Processing...' : `Checkout - $${total.toFixed(2)}`}
          </button>

          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            textAlign: 'center',
            marginTop: '10px',
            lineHeight: '1.4'
          }}>
            You'll be redirected to secure payment processing.
            <br />
            Orders are processed by {truckName}.
          </div>
        </>
      )}
    </div>
  );
};

export default OrderCart;
