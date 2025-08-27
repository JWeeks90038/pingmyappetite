import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CustomerOrderTracking = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active, completed

  useEffect(() => {
    if (user) {
      fetchOrders();
      
      // Set up real-time order updates
      const interval = setInterval(fetchOrders, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/marketplace/orders`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Sort orders by creation date, newest first
        const sortedOrders = data.sort((a, b) => {
          const dateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt);
          const dateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt);
          return dateB - dateA;
        });
        setOrders(sortedOrders);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrderStages = () => [
    { key: 'pending', label: 'Order Placed', icon: '⏳', description: 'Your order has been received' },
    { key: 'confirmed', label: 'Confirmed', icon: '✅', description: 'Food truck confirmed your order' },
    { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', description: 'Your food is being prepared' },
    { key: 'ready', label: 'Ready', icon: '🔔', description: 'Your order is ready for pickup!' },
    { key: 'completed', label: 'Completed', icon: '✔️', description: 'Order completed' }
  ];

  const getCurrentStageIndex = (status) => {
    const stages = getOrderStages();
    return stages.findIndex(stage => stage.key === status);
  };

  const getStageStatus = (order, stageIndex) => {
    const currentIndex = getCurrentStageIndex(order.status);
    
    if (order.status === 'cancelled') return 'cancelled';
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleString();
  };

  const formatPrice = (price) => {
    return `$${parseFloat(price || 0).toFixed(2)}`;
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'active') {
      return ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status);
    }
    return ['completed', 'cancelled'].includes(order.status);
  });

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '300px' 
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading your orders...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ 
        textAlign: 'center', 
        color: '#2c6f57', 
        marginBottom: '30px',
        fontSize: '28px'
      }}>
        🍽️ Track Your Orders
      </h2>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '30px',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '12px 24px',
            borderRadius: '25px',
            border: activeTab === 'active' ? 'none' : '1px solid #ddd',
            backgroundColor: activeTab === 'active' ? '#2c6f57' : 'white',
            color: activeTab === 'active' ? 'white' : '#666',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          🔥 Active Orders
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          style={{
            padding: '12px 24px',
            borderRadius: '25px',
            border: activeTab === 'completed' ? 'none' : '1px solid #ddd',
            backgroundColor: activeTab === 'completed' ? '#2c6f57' : 'white',
            color: activeTab === 'completed' ? 'white' : '#666',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          📋 Order History
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#666',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>
            {activeTab === 'active' ? '🍽️' : '📋'}
          </div>
          <div style={{ fontSize: '20px', marginBottom: '10px', fontWeight: 'bold' }}>
            {activeTab === 'active' ? 'No active orders' : 'No order history'}
          </div>
          <div style={{ fontSize: '16px' }}>
            {activeTab === 'active' 
              ? 'Place your first order to see it tracked here!'
              : 'Your completed orders will appear here'
            }
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '25px' }}>
          {filteredOrders.map(order => (
            <div key={order.id} style={{
              border: '1px solid #e0e0e0',
              borderRadius: '16px',
              backgroundColor: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {/* Order Header */}
              <div style={{
                backgroundColor: order.status === 'cancelled' ? '#fff5f5' : '#f8f9fa',
                padding: '20px',
                borderBottom: '1px solid #e0e0e0'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '10px'
                }}>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 5px 0', 
                      color: '#2c6f57',
                      fontSize: '20px'
                    }}>
                      Order #{order.id.slice(-8)}
                    </h3>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#666',
                      marginBottom: '5px'
                    }}>
                      {formatDate(order.createdAt)} • {getTimeAgo(order.createdAt)}
                    </div>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      Total: {formatPrice(order.total || order.subtotal)}
                    </div>
                  </div>

                  {order.status === 'cancelled' && (
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      ❌ CANCELLED
                    </div>
                  )}
                </div>

                {/* Order Items Summary */}
                <div style={{ 
                  fontSize: '14px', 
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  {order.items?.map(item => `${item.quantity}x ${item.name}`).join(', ') || 'Order details'}
                </div>
              </div>

              {/* Progress Tracker */}
              {order.status !== 'cancelled' && (
                <div style={{ padding: '25px' }}>
                  <div style={{ position: 'relative' }}>
                    {/* Progress Line */}
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      left: '20px',
                      right: '20px',
                      height: '3px',
                      backgroundColor: '#e0e0e0',
                      borderRadius: '2px',
                      zIndex: 1
                    }}>
                      <div style={{
                        height: '100%',
                        backgroundColor: '#28a745',
                        borderRadius: '2px',
                        width: `${(getCurrentStageIndex(order.status) / (getOrderStages().length - 1)) * 100}%`,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>

                    {/* Stage Icons and Labels */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      position: 'relative',
                      zIndex: 2
                    }}>
                      {getOrderStages().map((stage, index) => {
                        const status = getStageStatus(order, index);
                        
                        return (
                          <div 
                            key={stage.key}
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center',
                              flex: 1,
                              textAlign: 'center'
                            }}
                          >
                            {/* Stage Icon */}
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: 
                                status === 'completed' ? '#28a745' :
                                status === 'current' ? '#2c6f57' : '#e0e0e0',
                              color: 
                                status === 'completed' || status === 'current' ? 'white' : '#999',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              marginBottom: '8px',
                              transition: 'all 0.3s ease',
                              transform: status === 'current' ? 'scale(1.1)' : 'scale(1)',
                              boxShadow: status === 'current' ? '0 0 10px rgba(44, 111, 87, 0.3)' : 'none'
                            }}>
                              {status === 'completed' ? '✓' : stage.icon}
                            </div>

                            {/* Stage Label */}
                            <div style={{
                              fontSize: '12px',
                              fontWeight: status === 'current' ? 'bold' : 'normal',
                              color: 
                                status === 'completed' ? '#28a745' :
                                status === 'current' ? '#2c6f57' : '#999',
                              marginBottom: '4px'
                            }}>
                              {stage.label}
                            </div>

                            {/* Stage Description */}
                            <div style={{
                              fontSize: '10px',
                              color: '#999',
                              lineHeight: '1.2',
                              maxWidth: '80px'
                            }}>
                              {status === 'current' ? stage.description : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current Status Message */}
                  <div style={{
                    backgroundColor: 
                      order.status === 'ready' ? '#e7f3ff' : 
                      order.status === 'preparing' ? '#fff3cd' : '#f8f9fa',
                    border: `1px solid ${
                      order.status === 'ready' ? '#b3d9ff' : 
                      order.status === 'preparing' ? '#ffeaa7' : '#dee2e6'
                    }`,
                    borderRadius: '8px',
                    padding: '15px',
                    marginTop: '20px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: 
                        order.status === 'ready' ? '#0066cc' :
                        order.status === 'preparing' ? '#856404' : '#495057',
                      marginBottom: '5px'
                    }}>
                      {order.status === 'pending' && '⏳ Waiting for confirmation...'}
                      {order.status === 'confirmed' && '✅ Order confirmed! Preparing soon...'}
                      {order.status === 'preparing' && '👨‍🍳 Your delicious food is being prepared!'}
                      {order.status === 'ready' && '🔔 Ready for pickup! Come get your order!'}
                      {order.status === 'completed' && '✅ Order completed. Thanks for your business!'}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      {order.status === 'ready' && 'Head to the food truck location to pick up your order'}
                      {order.status === 'preparing' && 'Estimated preparation time: 10-15 minutes'}
                      {order.status === 'confirmed' && 'The food truck has confirmed your order'}
                      {order.status === 'pending' && 'The food truck will confirm your order shortly'}
                    </div>
                  </div>
                </div>
              )}

              {/* Cancelled Order Message */}
              {order.status === 'cancelled' && (
                <div style={{
                  backgroundColor: '#fff5f5',
                  border: '1px solid #f5c6cb',
                  borderRadius: '8px',
                  padding: '20px',
                  margin: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#721c24', marginBottom: '8px' }}>
                    ❌ Order Cancelled
                  </div>
                  <div style={{ fontSize: '14px', color: '#721c24' }}>
                    This order was cancelled. If you were charged, you should receive a refund within 3-5 business days.
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerOrderTracking;
