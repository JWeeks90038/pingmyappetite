import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import PreOrderSystem from './PreOrderSystem';

const PreOrderContent = ({ truckId, cart, setCart }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showPreOrderSystem, setShowPreOrderSystem] = useState(false);

  useEffect(() => {
    if (!truckId) {
      console.log('PreOrderContent: No truckId provided');
      return;
    }

    console.log('PreOrderContent: Setting up menu items listener for truckId:', truckId);

    const menuItemsQuery = query(
      collection(db, 'menuItems'),
      where('ownerId', '==', truckId)
    );

    const unsubscribe = onSnapshot(menuItemsQuery, (snapshot) => {
      console.log('PreOrderContent: Menu items query snapshot received:', snapshot.docs.length, 'items');
      
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('PreOrderContent: Menu item found:', doc.id, data);
        return {
          id: doc.id,
          ...data
        };
      });

      console.log('PreOrderContent: Final menu items array:', items);
      setMenuItems(items);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(items.map(item => item.category))];
      setCategories(uniqueCategories.sort());
      
      setLoading(false);
    }, (error) => {
      console.error('PreOrderContent: Error fetching menu items:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [truckId]);

  const addToCart = (item) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return currentCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...currentCart, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (itemId) => {
    setCart(currentCart => {
      return currentCart.reduce((acc, cartItem) => {
        if (cartItem.id === itemId) {
          if (cartItem.quantity > 1) {
            acc.push({ ...cartItem, quantity: cartItem.quantity - 1 });
          }
          // If quantity is 1, don't add to acc (removes item)
        } else {
          acc.push(cartItem);
        }
        return acc;
      }, []);
    });
  };

  const getItemQuantityInCart = (itemId) => {
    const cartItem = cart.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const handleOrderComplete = (orderId, orderData) => {
    console.log('✅ Order completed:', orderId);
    setShowPreOrderSystem(false);
    // Clear cart after successful order
    setCart([]);
  };

  // Toggle between menu and pre-order system
  if (showPreOrderSystem) {
    return (
      <PreOrderSystem 
        truckId={truckId}
        menuItems={menuItems}
        cart={cart}
        setCart={setCart}
        onOrderComplete={handleOrderComplete}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading menu...</div>
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>No menu items available</div>
        <div style={{ fontSize: '14px', color: '#999' }}>
          This truck hasn't added their menu items yet
        </div>
      </div>
    );
  }

  const renderItemsByCategory = (category) => {
    const categoryItems = menuItems.filter(item => item.category === category);
    
    if (categoryItems.length === 0) return null;

    return (
      <div key={category} style={{ marginBottom: '30px' }}>
        <h3 style={{ 
          color: '#2c6f57', 
          marginBottom: '15px',
          fontSize: '20px',
          borderBottom: '2px solid #2c6f57',
          paddingBottom: '5px'
        }}>
          {category}
        </h3>
        <div style={{ display: 'grid', gap: '15px' }}>
          {categoryItems.map(item => {
            const quantityInCart = getItemQuantityInCart(item.id);
            
            return (
              <div key={item.id} style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '10px'
                }}>
                  {/* Menu Item Image */}
                  {item.image && (
                    <div style={{ 
                      marginRight: '15px',
                      flexShrink: 0
                    }}>
                      <img 
                        src={item.image} 
                        alt={item.name}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #ddd'
                        }}
                        onLoad={() => console.log('✅ Menu item image loaded:', item.name, item.image)}
                        onError={(e) => {
                          console.error('❌ Menu item image failed to load:', item.name, item.image);
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div style={{ flex: 1 }}>
                    <h4 style={{ 
                      margin: '0 0 5px 0', 
                      color: '#333',
                      fontSize: '18px'
                    }}>
                      {item.name}
                    </h4>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 'bold', 
                      color: '#2c6f57',
                      marginBottom: '10px' 
                    }}>
                      ${parseFloat(item.price || 0).toFixed(2)}
                    </div>
                  </div>
                  
                  {/* Cart Controls */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px' 
                  }}>
                    {quantityInCart === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        style={{
                          backgroundColor: '#2c6f57',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        Add to Cart
                      </button>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          −
                        </button>
                        
                        <span style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          padding: '0 8px'
                        }}>
                          {quantityInCart}
                        </span>
                        
                        <button
                          onClick={() => addToCart(item)}
                          style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {item.description && (
                  <p style={{ 
                    margin: '0 0 10px 0', 
                    color: '#666',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {item.description}
                  </p>
                )}
                
                {item.ingredients && (
                  <p style={{ 
                    margin: '0', 
                    color: '#888',
                    fontSize: '12px',
                    fontStyle: 'italic'
                  }}>
                    Ingredients: {item.ingredients}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* Header with Cart Summary */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ 
          margin: 0,
          color: '#2c6f57', 
          fontSize: '24px'
        }}>
          🍽️ Menu
        </h3>
        
        {cart.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ fontSize: '16px', color: '#666' }}>
              {cart.reduce((total, item) => total + item.quantity, 0)} items in cart
            </div>
            <button
              onClick={() => setShowPreOrderSystem(true)}
              style={{
                backgroundColor: '#2c6f57',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              🛒 View Cart & Order
            </button>
          </div>
        )}
      </div>
      
      {categories.length > 0 ? (
        categories.map(category => renderItemsByCategory(category))
      ) : (
        <div style={{ color: '#666' }}>No menu categories found</div>
      )}

      {/* Floating Cart Button (when cart has items) */}
      {cart.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <button
            onClick={() => setShowPreOrderSystem(true)}
            style={{
              backgroundColor: '#2c6f57',
              color: 'white',
              border: 'none',
              padding: '15px 20px',
              borderRadius: '50px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            🛒 {cart.reduce((total, item) => total + item.quantity, 0)} items
          </button>
        </div>
      )}
    </div>
  );
};

export default PreOrderContent;
