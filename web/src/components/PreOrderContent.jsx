import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import PreOrderSystem from './PreOrderSystem';

const PreOrderContent = ({ truckId, cart, setCart }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showPreOrderSystem, setShowPreOrderSystem] = useState(false);
  const [businessHours, setBusinessHours] = useState(null);
  const [truckStatus, setTruckStatus] = useState('open'); // default to open

  // Business hours checking function (same as mobile app)
  const checkTruckOpenStatus = (businessHours) => {
    if (!businessHours) {
      console.log('⏰ Web: No business hours data - defaulting to OPEN');
      return 'open'; // Default to open if no hours set
    }
    
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime12 = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
    
    console.log('⏰ Web: Checking truck status for', currentDay, 'at', currentTime12);
    console.log('⏰ Web: Business hours data:', businessHours);
    
    const dayHours = businessHours[currentDay];
    if (!dayHours || dayHours.closed) {
      console.log('⏰ Web: Truck is marked as CLOSED today');
      return 'closed';
    }
    
    console.log('⏰ Web: Today\'s hours:', dayHours.open, '-', dayHours.close);
    console.log('⏰ Web: Current time:', currentTime12);
    
    // Helper function to convert AM/PM time to minutes since midnight for easy comparison
    const timeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      
      const timeStr_clean = timeStr.trim();
      
      // Check if it's already 24-hour format (no AM/PM)
      if (!timeStr_clean.includes('AM') && !timeStr_clean.includes('PM')) {
        // 24-hour format like "09:00" or "17:00"
        const timeParts = timeStr_clean.split(':');
        if (timeParts.length !== 2) {
          console.log('❌ Invalid 24-hour format - expected "HH:MM", got:', timeStr);
          return 0;
        }
        
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          console.log('❌ Invalid 24-hour time values - hours:', hours, 'minutes:', minutes);
          return 0;
        }
        
        const totalMinutes = hours * 60 + minutes;
        console.log('⏰ Converted 24-hour', timeStr, 'to', totalMinutes, 'minutes since midnight');
        return totalMinutes;
      }
      
      // 12-hour format with AM/PM - handle various whitespace characters
      const parts = timeStr_clean.split(/\s+/); // Split on any whitespace (space, non-breaking space, etc.)
      
      if (parts.length !== 2) {
        console.log('❌ Invalid time format - expected "H:MM AM/PM", got:', timeStr);
        
        // Try alternative parsing for edge cases
        const ampmMatch = timeStr_clean.match(/(AM|PM)/i);
        if (ampmMatch) {
          const ampm = ampmMatch[0].toUpperCase();
          const timeOnly = timeStr_clean.replace(/(AM|PM)/i, '').trim();
          
          const timeParts = timeOnly.split(':');
          if (timeParts.length === 2) {
            let hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            
            if (!isNaN(hours) && !isNaN(minutes) && hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
              // Convert to 24-hour format
              if (ampm === 'PM' && hours !== 12) {
                hours = hours + 12;
              } else if (ampm === 'AM' && hours === 12) {
                hours = 0;
              }
              
              const totalMinutes = hours * 60 + minutes;
              console.log('✅ Alternative parsing successful:', timeStr, '→', totalMinutes, 'minutes');
              return totalMinutes;
            }
          }
        }
        
        return 0;
      }
      
      const [time, period] = parts;
      
      const timeParts = time.split(':');
      
      if (timeParts.length !== 2) {
        console.log('❌ Invalid time part - expected "H:MM", got:', time);
        return 0;
      }
      
      let hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.log('❌ Failed to parse time:', time, '-> hours:', hours, 'minutes:', minutes);
        return 0;
      }
      
      // Validate hour range for 12-hour format
      if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
        console.log('❌ Invalid time values - hours should be 1-12, minutes 0-59. Got hours:', hours, 'minutes:', minutes);
        return 0;
      }
      
      // Convert to 24-hour format
      if (period && period.toUpperCase() === 'PM' && hours !== 12) {
        hours = hours + 12;
      } else if (period && period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      const totalMinutes = hours * 60 + minutes;
      console.log('✅ Converted', timeStr, '→', totalMinutes, 'minutes since midnight');
      return totalMinutes;
    };
    
    const currentMinutes = timeToMinutes(currentTime12);
    const openMinutes = timeToMinutes(dayHours.open);
    const closeMinutes = timeToMinutes(dayHours.close);
    
    console.log('⏰ Web: Time comparison - current:', currentMinutes, 'open:', openMinutes, 'close:', closeMinutes);
    
    let isOpen = false;
    
    if (closeMinutes > openMinutes) {
      // Normal day hours (e.g., 9 AM to 5 PM)
      isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    } else {
      // Overnight hours (e.g., 10 PM to 2 AM)
      isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    }
    
    console.log('⏰ Web: Final status determination - isOpen:', isOpen);
    return isOpen ? 'open' : 'closed';
  };

  // Fetch business hours for the truck owner
  useEffect(() => {
    if (!truckId) return;

    const fetchBusinessHours = async () => {
      try {
        console.log('⏰ Web: Fetching business hours for truck owner:', truckId);
        const ownerDoc = await getDoc(doc(db, 'users', truckId));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data();
          const hours = ownerData.businessHours;
          console.log('⏰ Web: Owner business hours:', hours);
          setBusinessHours(hours);
          
          // Check current status
          const status = checkTruckOpenStatus(hours);
          console.log('⏰ Web: Current truck status:', status);
          setTruckStatus(status);
        } else {
          console.log('⏰ Web: Owner document not found');
          setTruckStatus('open'); // Default to open if no data
        }
      } catch (error) {
        console.error('⏰ Web: Error fetching business hours:', error);
        setTruckStatus('open'); // Default to open on error
      }
    };

    fetchBusinessHours();
    
    // Update status every minute
    const interval = setInterval(() => {
      if (businessHours) {
        const status = checkTruckOpenStatus(businessHours);
        setTruckStatus(status);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [truckId, businessHours]);

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
    console.log('🛒 Web: Adding item to cart:', item.name);
    
    // Check if truck is currently open before allowing pre-order
    if (truckStatus === 'closed') {
      alert('🚫 Mobile Kitchen Closed\n\nSorry, this mobile kitchen is currently closed and not accepting pre-orders. Pre-orders are only available during their open hours.');
      return;
    }
    
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
                        disabled={truckStatus === 'closed'}
                        style={{
                          backgroundColor: truckStatus === 'closed' ? '#ccc' : '#2c6f57',
                          color: truckStatus === 'closed' ? '#666' : 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          cursor: truckStatus === 'closed' ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          opacity: truckStatus === 'closed' ? 0.6 : 1
                        }}
                      >
                        {truckStatus === 'closed' ? 'Closed' : 'Add to Cart'}
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
                          disabled={truckStatus === 'closed'}
                          style={{
                            backgroundColor: truckStatus === 'closed' ? '#ccc' : '#28a745',
                            color: truckStatus === 'closed' ? '#666' : 'white',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            cursor: truckStatus === 'closed' ? 'not-allowed' : 'pointer',
                            opacity: truckStatus === 'closed' ? 0.6 : 1
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
      {/* Business Hours Status Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '15px',
        padding: '10px 15px',
        backgroundColor: truckStatus === 'open' ? '#d4edda' : '#f8d7da',
        border: `1px solid ${truckStatus === 'open' ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '8px',
        color: truckStatus === 'open' ? '#155724' : '#721c24'
      }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
          {truckStatus === 'open' ? '🟢 OPEN' : '🔴 CLOSED'}
        </span>
        {truckStatus === 'closed' && (
          <span style={{ marginLeft: '10px', fontSize: '14px' }}>
            - Pre-orders unavailable
          </span>
        )}
      </div>

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
              onClick={() => {
                if (truckStatus === 'closed') {
                  alert('🚫 Mobile Kitchen Closed\n\nSorry, this mobile kitchen is currently closed and not accepting pre-orders. Pre-orders are only available during their open hours.');
                  return;
                }
                setShowPreOrderSystem(true);
              }}
              disabled={truckStatus === 'closed'}
              style={{
                backgroundColor: truckStatus === 'closed' ? '#ccc' : '#2c6f57',
                color: truckStatus === 'closed' ? '#666' : 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: truckStatus === 'closed' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                opacity: truckStatus === 'closed' ? 0.6 : 1,
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
            disabled={truckStatus === 'closed'}
            style={{
              backgroundColor: truckStatus === 'closed' ? '#ccc' : '#2c6f57',
              color: truckStatus === 'closed' ? '#666' : 'white',
              border: 'none',
              padding: '15px 20px',
              borderRadius: '50px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: truckStatus === 'closed' ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              opacity: truckStatus === 'closed' ? 0.6 : 1
            }}
          >
            {truckStatus === 'closed' ? '🔒 CLOSED' : `🛒 ${cart.reduce((total, item) => total + item.quantity, 0)} items`}
          </button>
        </div>
      )}
    </div>
  );
};

export default PreOrderContent;
