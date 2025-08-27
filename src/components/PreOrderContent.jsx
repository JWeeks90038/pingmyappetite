import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const PreOrderContent = ({ truckId, cart, setCart }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!truckId) return;

    const menuItemsQuery = query(
      collection(db, 'menuItems'),
      where('ownerId', '==', truckId)
    );

    const unsubscribe = onSnapshot(menuItemsQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setMenuItems(items);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(items.map(item => item.category))];
      setCategories(uniqueCategories.sort());
      
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

  const getItemQuantityInCart = (itemId) => {
    const cartItem = cart.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

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
                      color: '#2c6f57' 
                    }}>
                      ${parseFloat(item.price || 0).toFixed(2)}
                    </div>
                  </div>
                  
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
                      fontWeight: 'bold',
                      position: 'relative'
                    }}
                  >
                    Add to Cart
                    {quantityInCart > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        backgroundColor: '#ff6b6b',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {quantityInCart}
                      </span>
                    )}
                  </button>
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
    <div>
      <h3 style={{ 
        color: '#333', 
        marginBottom: '20px',
        fontSize: '24px'
      }}>
        Menu
      </h3>
      
      {categories.length > 0 ? (
        categories.map(category => renderItemsByCategory(category))
      ) : (
        <div style={{ color: '#666' }}>No menu categories found</div>
      )}
    </div>
  );
};

export default PreOrderContent;
