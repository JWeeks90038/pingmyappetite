import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import PreOrderWaitTimeEstimator from './PreOrderWaitTimeEstimator';
import PreOrderProgressTracker from './PreOrderProgressTracker';

const PreOrderSystem = ({ truckId, menuItems, cart, setCart, onOrderComplete }) => {
  const { user } = useAuth();
  const [orderStage, setOrderStage] = useState('cart'); // cart, checkout, placing, tracking
  const [currentOrder, setCurrentOrder] = useState(null);
  const [waitTimeEstimate, setWaitTimeEstimate] = useState(null);
  const [checkoutData, setCheckoutData] = useState({
    specialInstructions: '',
    customerName: '',
    customerPhone: '',
    pickupPreference: 'asap' // asap, scheduled
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load user data for checkout
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setCheckoutData(prev => ({
          ...prev,
          customerName: userData.displayName || userData.username || '',
          customerPhone: userData.phone || ''
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const handleEstimateUpdate = (estimate) => {
    setWaitTimeEstimate(estimate);
  };

  const proceedToCheckout = () => {
    if (cart.length === 0) {
      setError('Your cart is empty. Please add items before checkout.');
      return;
    }
    setOrderStage('checkout');
    setError(null);
  };

  const placeOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!checkoutData.customerName.trim()) {
        throw new Error('Please enter your name');
      }

      // Prepare order data
      const orderData = {
        // Customer info
        customerId: user?.uid || 'guest',
        customerName: checkoutData.customerName.trim(),
        customerPhone: checkoutData.customerPhone.trim(),
        
        // Order details
        truckId,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
          customizations: item.customizations || []
        })),
        
        // Pricing
        subtotal: calculateCartTotal(),
        tax: calculateCartTotal() * 0.08, // 8% tax
        totalAmount: calculateCartTotal() * 1.08,
        
        // Timing estimates
        estimatedPrepTime: waitTimeEstimate?.currentWaitTime || 15,
        estimatedReadyTime: waitTimeEstimate?.estimatedReadyTime || 
          new Date(Date.now() + 15 * 60 * 1000),
        
        // Order metadata
        specialInstructions: checkoutData.specialInstructions.trim(),
        pickupPreference: checkoutData.pickupPreference,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Platform info
        platform: 'web',
        source: 'pre-order'
      };

      console.log('📋 Placing order:', orderData);

      // Create order in Firestore
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      console.log('✅ Order created with ID:', orderRef.id);

      // Clear cart and update UI
      setCart([]);
      setCurrentOrder({ id: orderRef.id, ...orderData });
      setOrderStage('tracking');

      // Notify parent component
      if (onOrderComplete) {
        onOrderComplete(orderRef.id, orderData);
      }

    } catch (error) {
      console.error('❌ Error placing order:', error);
      setError(error.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (newStatus, orderData) => {
    console.log('📱 Order status changed:', newStatus);
    
    // Update local order state
    setCurrentOrder(prev => ({
      ...prev,
      status: newStatus,
      ...orderData
    }));

    // Show notification based on status
    if (newStatus === 'confirmed') {
      showNotification('✅ Order Confirmed!', 'Your order has been confirmed and is being prepared.');
    } else if (newStatus === 'preparing') {
      showNotification('👨‍🍳 Preparing Your Order', 'The chef is now preparing your delicious meal!');
    } else if (newStatus === 'ready') {
      showNotification('🔔 Order Ready!', 'Your order is ready for pickup!');
    }
  };

  const showNotification = (title, body) => {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/grubana-logo.png',
        badge: '/truck-icon.png'
      });
    }

    // You could also trigger push notifications here
    console.log('📱 Notification:', title, body);
  };

  const resetOrder = () => {
    setOrderStage('cart');
    setCurrentOrder(null);
    setWaitTimeEstimate(null);
    setError(null);
  };

  // Cart Stage
  if (orderStage === 'cart') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        {/* Wait Time Estimator */}
        <PreOrderWaitTimeEstimator 
          truckId={truckId}
          cartItems={cart}
          onEstimateUpdate={handleEstimateUpdate}
        />

        {/* Cart Summary */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#2c6f57' }}>
            🛒 Your Order ({cart.length} items)
          </h3>
          
          {cart.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#666'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🛒</div>
              <div>Your cart is empty</div>
              <div style={{ fontSize: '14px', marginTop: '5px' }}>
                Add items from the menu to get started
              </div>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid #eee'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Qty: {item.quantity} × ${item.price.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold' }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '15px',
                paddingTop: '15px',
                borderTop: '2px solid #eee',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                <span>Total:</span>
                <span>${(calculateCartTotal() * 1.08).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {/* Proceed Button */}
        {cart.length > 0 && (
          <button
            onClick={proceedToCheckout}
            style={{
              width: '100%',
              backgroundColor: '#2c6f57',
              color: 'white',
              border: 'none',
              padding: '15px',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            Continue to Checkout →
          </button>
        )}

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '10px',
            borderRadius: '8px',
            marginTop: '10px'
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // Checkout Stage
  if (orderStage === 'checkout') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#2c6f57' }}>
            📋 Order Details
          </h3>

          {/* Customer Information */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Your Name *
            </label>
            <input
              type="text"
              value={checkoutData.customerName}
              onChange={(e) => setCheckoutData(prev => ({
                ...prev,
                customerName: e.target.value
              }))}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="Enter your name"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Phone Number (optional)
            </label>
            <input
              type="tel"
              value={checkoutData.customerPhone}
              onChange={(e) => setCheckoutData(prev => ({
                ...prev,
                customerPhone: e.target.value
              }))}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="For order updates"
            />
          </div>

          {/* Special Instructions */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Special Instructions
            </label>
            <textarea
              value={checkoutData.specialInstructions}
              onChange={(e) => setCheckoutData(prev => ({
                ...prev,
                specialInstructions: e.target.value
              }))}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Any special requests or dietary requirements..."
            />
          </div>

          {/* Wait Time Reminder */}
          {waitTimeEstimate && (
            <div style={{
              backgroundColor: '#e7f3ff',
              border: '1px solid #b3d9ff',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                ⏱️ Estimated Wait Time: {waitTimeEstimate.currentWaitTime} minutes
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Ready around {waitTimeEstimate.estimatedReadyTime?.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setOrderStage('cart')}
              style={{
                flex: 1,
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ← Back to Cart
            </button>
            
            <button
              onClick={placeOrder}
              disabled={loading || !checkoutData.customerName.trim()}
              style={{
                flex: 2,
                backgroundColor: loading ? '#ccc' : '#2c6f57',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '📤 Placing Order...' : '🚀 Place Order'}
            </button>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '10px',
              borderRadius: '8px',
              marginTop: '15px'
            }}>
              ❌ {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Order Tracking Stage
  if (orderStage === 'tracking' && currentOrder) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <PreOrderProgressTracker 
          orderId={currentOrder.id}
          onStatusChange={handleStatusChange}
        />
        
        {/* Order Actions */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '20px',
          textAlign: 'center'
        }}>
          <button
            onClick={resetOrder}
            style={{
              backgroundColor: '#2c6f57',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            🛒 Place Another Order
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PreOrderSystem;
