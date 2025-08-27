import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const OrderManagement = ({ userRole = null }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [userTruckRole, setUserTruckRole] = useState(userRole);

  useEffect(() => {
    if (user) {
      // If role not provided, fetch from Firestore
      if (!userRole) {
        fetchUserRole();
      } else {
        setUserTruckRole(userRole);
      }
      fetchOrders();
    }
  }, [user, userRole]);

  const fetchUserRole = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserTruckRole(userData.role || 'customer');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserTruckRole('customer');
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/marketplace/orders', {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:3000/api/marketplace/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update local state
        setOrders(currentOrders =>
          currentOrders.map(order =>
            order.id === orderId
              ? { ...order, status: newStatus }
              : order
          )
        );
      } else {
        console.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      confirmed: '#17a2b8',
      preparing: '#fd7e14',
      ready: '#28a745',
      completed: '#6c757d',
      cancelled: '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      confirmed: '✅',
      preparing: '👨‍🍳',
      ready: '🔔',
      completed: '✔️',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

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

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '300px' 
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading orders...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ 
        textAlign: 'center', 
        color: '#2c6f57', 
        marginBottom: '30px' 
      }}>
        {userTruckRole === 'owner' ? '📋 Order Management' : '🛒 My Orders'}
      </h2>

      {/* Status Filter Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '30px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {['all', 'pending', 'confirmed', 'preparing', 'ready', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: activeTab === status ? 'none' : '1px solid #ddd',
              backgroundColor: activeTab === status ? '#2c6f57' : 'white',
              color: activeTab === status ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '14px',
              textTransform: 'capitalize'
            }}
          >
            {status === 'all' ? 'All Orders' : status}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: '#666'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>No orders found</div>
          <div style={{ fontSize: '14px' }}>
            {userTruckRole === 'owner' 
              ? 'Orders will appear here when customers place them'
              : 'Your orders will appear here after you place them'
            }
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredOrders.map(order => (
            <div key={order.id} style={{
              border: '1px solid #ddd',
              borderRadius: '12px',
              padding: '20px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {/* Order Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '15px',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <h3 style={{ 
                    margin: '0 0 5px 0', 
                    color: '#2c6f57',
                    fontSize: '18px'
                  }}>
                    Order #{order.id.slice(-8)}
                  </h3>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#666' 
                  }}>
                    {formatDate(order.createdAt)}
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: getStatusColor(order.status),
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {getStatusIcon(order.status)} {order.status.toUpperCase()}
                </div>
              </div>

              {/* Order Items */}
              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ 
                  color: '#333', 
                  marginBottom: '10px',
                  fontSize: '16px'
                }}>
                  Items:
                </h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {order.items?.map((item, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px'
                    }}>
                      <span style={{ flex: 1 }}>
                        {item.quantity}x {item.name}
                      </span>
                      <span style={{ 
                        fontWeight: 'bold',
                        color: '#2c6f57'
                      }}>
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  )) || (
                    <div style={{ color: '#666', fontStyle: 'italic' }}>
                      No items details available
                    </div>
                  )}
                </div>
              </div>

              {/* Order Total */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '15px',
                borderTop: '1px solid #eee',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#2c6f57'
              }}>
                <span>Total:</span>
                <span>{formatPrice(order.total || order.subtotal)}</span>
              </div>

              {/* Action Buttons for Truck Owners */}
              {userTruckRole === 'owner' && order.status !== 'completed' && order.status !== 'cancelled' && (
                <div style={{ 
                  marginTop: '15px',
                  display: 'flex',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}>
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ✅ Confirm Order
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ❌ Cancel
                      </button>
                    </>
                  )}
                  
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      style={{
                        backgroundColor: '#fd7e14',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      👨‍🍳 Start Preparing
                    </button>
                  )}
                  
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      style={{
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      🔔 Mark Ready
                    </button>
                  )}
                  
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      style={{
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      ✔️ Complete Order
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
