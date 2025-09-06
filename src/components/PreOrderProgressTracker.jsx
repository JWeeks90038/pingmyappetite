import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const PreOrderProgressTracker = ({ orderId, onStatusChange }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    // Real-time order tracking
    const unsubscribe = onSnapshot(
      doc(db, 'orders', orderId),
      (doc) => {
        if (doc.exists()) {
          const orderData = { id: doc.id, ...doc.data() };
          setOrder(orderData);
          
          // Calculate time remaining
          updateTimeRemaining(orderData);
          
          // Notify parent of status changes
          if (onStatusChange) {
            onStatusChange(orderData.status, orderData);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error tracking order:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  useEffect(() => {
    // Update time remaining every minute
    const interval = setInterval(() => {
      if (order) {
        updateTimeRemaining(order);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [order]);

  const updateTimeRemaining = (orderData) => {
    if (!orderData.estimatedReadyTime) return;

    const readyTime = orderData.estimatedReadyTime.toDate 
      ? orderData.estimatedReadyTime.toDate()
      : new Date(orderData.estimatedReadyTime);
    
    const now = new Date();
    const timeRemainingMs = readyTime.getTime() - now.getTime();
    const timeRemainingMinutes = Math.max(0, Math.ceil(timeRemainingMs / (1000 * 60)));

    setEstimatedTimeRemaining(timeRemainingMinutes);
  };

  const getOrderSteps = () => [
    {
      key: 'pending',
      label: 'Order Placed',
      icon: '📋',
      description: 'Your order has been received',
      estimatedDuration: '1-2 min'
    },
    {
      key: 'confirmed',
      label: 'Confirmed',
      icon: '✅',
      description: 'Food truck confirmed your order',
      estimatedDuration: '0-1 min'
    },
    {
      key: 'preparing',
      label: 'Preparing',
      icon: '👨‍🍳',
      description: 'Your delicious food is being prepared',
      estimatedDuration: `${order?.estimatedPrepTime || 15} min`
    },
    {
      key: 'ready',
      label: 'Ready',
      icon: '🔔',
      description: 'Ready for pickup!',
      estimatedDuration: 'Pickup now'
    },
    {
      key: 'completed',
      label: 'Completed',
      icon: '✨',
      description: 'Order completed',
      estimatedDuration: 'Done'
    }
  ];

  const getCurrentStepIndex = () => {
    const steps = getOrderSteps();
    return steps.findIndex(step => step.key === order?.status);
  };

  const getStepStatus = (stepIndex) => {
    const currentIndex = getCurrentStepIndex();
    
    if (order?.status === 'cancelled') return 'cancelled';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStatusMessage = () => {
    if (!order) return '';

    const messages = {
      pending: {
        title: '⏳ Order Placed',
        subtitle: 'Waiting for truck confirmation...',
        action: 'The food truck will confirm your order shortly'
      },
      confirmed: {
        title: '✅ Order Confirmed!',
        subtitle: `Estimated prep time: ${order.estimatedPrepTime || 15} minutes`,
        action: 'Your order is now in the preparation queue'
      },
      preparing: {
        title: '👨‍🍳 Being Prepared',
        subtitle: estimatedTimeRemaining 
          ? `About ${estimatedTimeRemaining} minutes remaining`
          : 'Your food is being prepared with care',
        action: 'The chef is working on your delicious order!'
      },
      ready: {
        title: '🔔 Ready for Pickup!',
        subtitle: 'Your order is hot and ready',
        action: 'Head to the food truck location to collect your order'
      },
      completed: {
        title: '✨ Order Complete',
        subtitle: 'Thanks for your business!',
        action: 'Hope you enjoyed your meal from our food truck'
      },
      cancelled: {
        title: '❌ Order Cancelled',
        subtitle: 'This order was cancelled',
        action: 'Refund will be processed within 3-5 business days'
      }
    };

    return messages[order.status] || messages.pending;
  };

  const formatTimeEstimate = (minutes) => {
    if (minutes <= 0) return 'Any moment now!';
    if (minutes === 1) return '1 minute';
    if (minutes <= 5) return `${minutes} minutes`;
    if (minutes <= 15) return `${Math.ceil(minutes / 5) * 5} minutes`;
    return `${Math.ceil(minutes / 5) * 5} minutes`;
  };

  const getProgressPercentage = () => {
    const steps = getOrderSteps();
    const currentIndex = getCurrentStepIndex();
    
    if (order?.status === 'cancelled') return 0;
    if (currentIndex === -1) return 0;
    
    return ((currentIndex + 1) / steps.length) * 100;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666', marginBottom: '10px' }}>
            📱 Loading order status...
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>
          ❌ Order not found
        </div>
      </div>
    );
  }

  const statusMessage = getStatusMessage();

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      margin: '20px 0'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '25px',
        paddingBottom: '20px',
        borderBottom: '1px solid #e9ecef'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#2c6f57',
          marginBottom: '5px'
        }}>
          {statusMessage.title}
        </div>
        <div style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '10px'
        }}>
          {statusMessage.subtitle}
        </div>
        <div style={{
          fontSize: '14px',
          color: '#888'
        }}>
          Order #{order.id.substring(0, 8)}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{
          backgroundColor: '#e9ecef',
          borderRadius: '12px',
          height: '8px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: order.status === 'cancelled' ? '#dc3545' : '#28a745',
            height: '100%',
            width: `${getProgressPercentage()}%`,
            borderRadius: '12px',
            transition: 'width 0.5s ease-in-out',
            position: 'relative'
          }}>
            {/* Animated shimmer effect */}
            {order.status === 'preparing' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shimmer 2s infinite'
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Status Steps */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '25px',
        position: 'relative'
      }}>
        {getOrderSteps().map((step, index) => {
          const status = getStepStatus(index);
          
          return (
            <div key={step.key} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              position: 'relative'
            }}>
              {/* Step Icon */}
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: 
                  status === 'completed' ? '#28a745' :
                  status === 'current' ? '#007bff' :
                  status === 'cancelled' ? '#dc3545' : '#e9ecef',
                color: status === 'pending' ? '#666' : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '8px',
                border: status === 'current' ? '3px solid #007bff' : 'none',
                boxShadow: status === 'current' ? '0 0 15px rgba(0,123,255,0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                {status === 'completed' ? '✓' : step.icon}
              </div>

              {/* Step Label */}
              <div style={{
                fontSize: '12px',
                fontWeight: status === 'current' ? 'bold' : 'normal',
                color: 
                  status === 'completed' ? '#28a745' :
                  status === 'current' ? '#007bff' :
                  status === 'cancelled' ? '#dc3545' : '#666',
                marginBottom: '4px',
                textAlign: 'center'
              }}>
                {step.label}
              </div>

              {/* Step Description */}
              {status === 'current' && (
                <div style={{
                  fontSize: '10px',
                  color: '#666',
                  textAlign: 'center',
                  maxWidth: '80px'
                }}>
                  {step.description}
                </div>
              )}

              {/* Connection Line */}
              {index < getOrderSteps().length - 1 && (
                <div style={{
                  position: 'absolute',
                  top: '25px',
                  left: '75%',
                  width: '50%',
                  height: '2px',
                  backgroundColor: status === 'completed' ? '#28a745' : '#e9ecef',
                  zIndex: -1
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Time Remaining Display */}
      {order.status === 'preparing' && estimatedTimeRemaining !== null && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '12px',
          padding: '15px',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#856404',
            marginBottom: '5px'
          }}>
            ⏱️ {formatTimeEstimate(estimatedTimeRemaining)}
          </div>
          <div style={{
            fontSize: '14px',
            color: '#856404'
          }}>
            Estimated time remaining
          </div>
        </div>
      )}

      {/* Action Message */}
      <div style={{
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        padding: '15px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '14px',
          color: '#495057'
        }}>
          {statusMessage.action}
        </div>
      </div>

      {/* Live Updates Indicator */}
      <div style={{
        marginTop: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        fontSize: '11px',
        color: '#666'
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: '#28a745',
          animation: order.status === 'preparing' ? 'pulse 2s infinite' : 'none'
        }} />
        Live updates • Last updated {new Date().toLocaleTimeString()}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default PreOrderProgressTracker;
