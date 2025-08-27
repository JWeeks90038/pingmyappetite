import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const TruckOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [accountDetails, setAccountDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('payment');
  const [menuItems, setMenuItems] = useState([]);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    image: null
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user) {
      checkAccountStatus();
      loadMenuItems();
    }
  }, [user]);

  const checkAccountStatus = async () => {
    try {
      console.log('🔍 Checking account status - user object:', user);
      console.log('🔍 User type:', typeof user);
      console.log('🔍 User has getIdToken method:', typeof user?.getIdToken === 'function');
      
      const token = await user.getIdToken();
      console.log('🔍 Token obtained for status check:', token ? 'Token received' : 'No token');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('🌍 Making status API call to:', `${apiUrl}/api/marketplace/trucks/status`);
      
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      setAccountStatus(data.status || 'no_account');
      setAccountDetails(data);
    } catch (error) {
      console.error('Error checking account status:', error);
    }
  };

  const loadMenuItems = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/${user.uid}/menu`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.items || []);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const createStripeAccount = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          truckId: user.uid,
          email: user.email,
          country: 'US'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAccountStatus('created');
        setAccountDetails(data);
        await checkAccountStatus();
      } else {
        throw new Error(data.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Failed to create Stripe account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getOnboardingLink = async () => {
    setLoading(true);
    try {
      console.log('🔐 Getting onboarding link - user object:', user);
      console.log('🔐 User type:', typeof user);
      console.log('🔐 User has getIdToken method:', typeof user?.getIdToken === 'function');
      
      const token = await user.getIdToken();
      console.log('🔐 Token obtained:', token ? 'Token received' : 'No token');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('🌍 Making API call to:', `${apiUrl}/api/marketplace/trucks/onboarding-link`);
      
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/onboarding-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          truckId: user.uid,
          accountId: accountDetails?.stripeAccountId || accountDetails?.accountId
        })
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = data.onboardingUrl;
      } else {
        throw new Error(data.error || 'Failed to create onboarding link');
      }
    } catch (error) {
      console.error('Error getting onboarding link:', error);
      alert('Failed to get onboarding link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      alert('Please provide at least a name and price for the menu item.');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (imageFile) {
        imageUrl = await uploadImageToFirebase(imageFile);
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/${user.uid}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          ...newMenuItem,
          price: parseFloat(newMenuItem.price),
          image: imageUrl
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMenuItems(prev => [...prev, data.item]);
        setNewMenuItem({
          name: '',
          price: '',
          description: '',
          category: '',
          image: null
        });
        clearImageSelection();
        alert('Menu item added successfully!');
      } else {
        throw new Error('Failed to add menu item');
      }
    } catch (error) {
      console.error('Error adding menu item:', error);
      alert('Failed to add menu item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteMenuItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/${user.uid}/menu/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      if (response.ok) {
        setMenuItems(prev => prev.filter(item => item.id !== itemId));
        alert('Menu item deleted successfully!');
      } else {
        throw new Error('Failed to delete menu item');
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Failed to delete menu item. Please try again.');
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, etc.)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToFirebase = async (file) => {
    try {
      setUploadingImage(true);
      
      const storage = getStorage();
      const fileName = `menu-items/${user.uid}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, fileName);
      
      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
    setNewMenuItem(prev => ({ ...prev, image: null }));
  };

  const renderAccountStatus = () => {
    if (!accountStatus) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px',
          color: '#666'
        }}>
          <div>Loading account status...</div>
        </div>
      );
    }

    switch (accountStatus) {
      case 'no_account':
        return (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#856404', marginBottom: '15px' }}>
              🏪 Set Up Your Stripe Connect Account
            </h3>
            <p style={{ color: '#856404', marginBottom: '15px' }}>
              To start accepting orders and payments from customers, you need to set up a Stripe Connect account. 
              This allows you to receive payments directly with our flexible tiered platform fee structure based on your chosen subscription plan.
            </p>
            <button
              onClick={createStripeAccount}
              disabled={loading}
              style={{
                backgroundColor: '#2c6f57',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Setting up...' : '🔗 Connect with Stripe'}
            </button>
          </div>
        );

      case 'created':
      case 'pending':
        return (
          <div style={{
            backgroundColor: '#cce5ff',
            border: '1px solid #99ccff',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#0066cc', marginBottom: '15px' }}>
              ⏳ Complete Your Stripe Setup
            </h3>
            <p style={{ color: '#0066cc', marginBottom: '15px' }}>
              Your Stripe account has been created! Complete the onboarding process to start receiving payments.
            </p>
            
            <button
              onClick={getOnboardingLink}
              disabled={loading}
              style={{
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginRight: '10px'
              }}
            >
              {loading ? 'Loading...' : '✅ Complete Stripe Onboarding'}
            </button>
          </div>
        );

      case 'active':
        return (
          <div style={{
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#155724', marginBottom: '15px' }}>
              ✅ Payment Setup Complete!
            </h3>
            <p style={{ color: '#155724', marginBottom: '15px' }}>
              Your Stripe account is active and ready to receive payments. Customers can now place pre-orders!
            </p>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '15px', 
              borderRadius: '6px',
              marginTop: '15px'
            }}>
              <div style={{ color: '#155724', marginBottom: '10px' }}>
                <strong>Account Details:</strong>
              </div>
              <div style={{ fontSize: '14px', color: '#155724' }}>
                • Account ID: {accountDetails?.stripeAccountId?.slice(0, 12)}...
                <br />
                • Status: Ready to accept payments
                <br />
                • Platform fees: Based on your subscription plan (Basic: 5%, Pro: 2.5%, All-Access: 0%)
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#721c24', marginBottom: '15px' }}>
              ❌ Account Setup Issue
            </h3>
            <p style={{ color: '#721c24', marginBottom: '15px' }}>
              There's an issue with your payment account setup. Please try again or contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh Status
            </button>
          </div>
        );
    }
  };

  const renderMenuManagement = () => {
    return (
      <div style={{ padding: '20px' }}>
        {/* Add New Menu Item */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#2c6f57', marginBottom: '20px' }}>
            🍽️ Add New Menu Item
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Item Name (e.g., Classic Cheeseburger)"
              value={newMenuItem.name}
              onChange={(e) => setNewMenuItem(prev => ({ ...prev, name: e.target.value }))}
              style={{
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Price (e.g., 12.99)"
              value={newMenuItem.price}
              onChange={(e) => setNewMenuItem(prev => ({ ...prev, price: e.target.value }))}
              style={{
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <textarea
              placeholder="Description (optional)"
              value={newMenuItem.description}
              onChange={(e) => setNewMenuItem(prev => ({ ...prev, description: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                minHeight: '80px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Image Upload Section */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold', 
              color: '#2c6f57' 
            }}>
              📸 Menu Item Photo (optional)
            </label>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
              {/* File Upload */}
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{
                    padding: '8px',
                    border: '2px dashed #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    width: '100%',
                    backgroundColor: '#f8f9fa'
                  }}
                />
                <div style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  marginTop: '5px' 
                }}>
                  Max 5MB • JPG, PNG, WebP supported
                </div>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div style={{ 
                  position: 'relative',
                  width: '80px', 
                  height: '80px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #2c6f57'
                }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <button
                    onClick={clearImageSelection}
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {uploadingImage && (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                backgroundColor: '#cce5ff',
                border: '1px solid #99ccff',
                borderRadius: '4px',
                fontSize: '14px',
                color: '#0066cc'
              }}>
                📤 Uploading image...
              </div>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <select
              value={newMenuItem.category}
              onChange={(e) => setNewMenuItem(prev => ({ ...prev, category: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Select Category (optional)</option>
              <option value="appetizers">Appetizers</option>
              <option value="mains">Main Dishes</option>
              <option value="sides">Sides</option>
              <option value="desserts">Desserts</option>
              <option value="drinks">Drinks</option>
              <option value="specials">Daily Specials</option>
            </select>
          </div>

          <button
            onClick={addMenuItem}
            disabled={loading || uploadingImage || !newMenuItem.name || !newMenuItem.price}
            style={{
              width: '100%',
              backgroundColor: '#2c6f57',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: (!newMenuItem.name || !newMenuItem.price || loading || uploadingImage) ? 'not-allowed' : 'pointer',
              opacity: (!newMenuItem.name || !newMenuItem.price || loading || uploadingImage) ? 0.6 : 1
            }}
          >
            {uploadingImage ? '📤 Uploading Image...' : (loading ? 'Adding...' : '➕ Add Item')}
          </button>
        </div>

        {/* Current Menu Items */}
        <div>
          <h3 style={{ color: '#2c6f57', marginBottom: '20px' }}>
            📋 Your Current Menu ({menuItems.length} items)
          </h3>
          
          {menuItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              color: '#666'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🍽️</div>
              <h4>No menu items yet</h4>
              <p>Add your first menu item above to get started!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {menuItems.map((item, index) => (
                <div
                  key={item.id || index}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Item Image */}
                  {item.image && (
                    <div style={{ 
                      width: '100%', 
                      height: '180px', 
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px'
                      }}>
                        <button
                          onClick={() => deleteMenuItem(item.id)}
                          style={{
                            backgroundColor: 'rgba(220, 53, 69, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Item Content */}
                  <div style={{ padding: '15px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      marginBottom: '10px' 
                    }}>
                      <h4 style={{ margin: 0, color: '#2c6f57', fontSize: '16px' }}>
                        {item.name}
                      </h4>
                      {!item.image && (
                        <button
                          onClick={() => deleteMenuItem(item.id)}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c6f57', marginBottom: '8px' }}>
                      ${parseFloat(item.price).toFixed(2)}
                    </div>
                    
                    {item.description && (
                      <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
                        {item.description}
                      </p>
                    )}
                    
                    {item.category && (
                      <div style={{
                        display: 'inline-block',
                        backgroundColor: '#e9f7f1',
                        color: '#2c6f57',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {item.category}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px' 
      }}>
        <h1 style={{ color: '#2c6f57', marginBottom: '10px' }}>
          🚚 Food Truck Management
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Set up payments and manage your menu
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e9ecef',
        marginBottom: '30px',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => setActiveTab('payment')}
          style={{
            backgroundColor: activeTab === 'payment' ? '#2c6f57' : 'transparent',
            color: activeTab === 'payment' ? 'white' : '#2c6f57',
            border: 'none',
            padding: '12px 24px',
            marginRight: '10px',
            borderRadius: '8px 8px 0 0',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          💳 Payment Setup
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          style={{
            backgroundColor: activeTab === 'menu' ? '#2c6f57' : 'transparent',
            color: activeTab === 'menu' ? 'white' : '#2c6f57',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px 8px 0 0',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🍽️ Menu Management
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'payment' ? (
        <div>
          {renderAccountStatus()}

          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <h3 style={{ color: '#2c6f57', marginBottom: '15px' }}>
              💰 How Our Tiered Payment Structure Works
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#2c6f57', marginBottom: '10px' }}>📋 Order Process:</h4>
              <ul style={{ color: '#666', lineHeight: '1.6', marginBottom: '15px' }}>
                <li>Customers browse your menu and place orders before arriving</li>
                <li>You receive instant notifications when orders come in</li>
                <li>Payments are processed securely through Stripe Connect</li>
                <li>You get paid directly to your bank account within 2 business days</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#2c6f57', marginBottom: '10px' }}>💳 Subscription Plans & Platform Fees:</h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div style={{
                  backgroundColor: '#fff3cd',
                  border: '2px solid #ffc107',
                  borderRadius: '8px',
                  padding: '15px',
                  textAlign: 'center'
                }}>
                  <h5 style={{ color: '#856404', margin: '0 0 8px 0' }}>🆓 Basic Plan</h5>
                  <div style={{ color: '#856404', fontSize: '14px' }}>
                    <strong>Free</strong><br/>
                    5% platform fee per order
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: '#d1ecf1',
                  border: '2px solid #17a2b8',
                  borderRadius: '8px',
                  padding: '15px',
                  textAlign: 'center'
                }}>
                  <h5 style={{ color: '#0c5460', margin: '0 0 8px 0' }}>⭐ Pro Plan</h5>
                  <div style={{ color: '#0c5460', fontSize: '14px' }}>
                    <strong>$9.99/month</strong><br/>
                    2.5% platform fee per order
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: '#d4edda',
                  border: '2px solid #28a745',
                  borderRadius: '8px',
                  padding: '15px',
                  textAlign: 'center'
                }}>
                  <h5 style={{ color: '#155724', margin: '0 0 8px 0' }}>🏆 All-Access Plan</h5>
                  <div style={{ color: '#155724', fontSize: '14px' }}>
                    <strong>$19.99/month</strong><br/>
                    0% platform fee per order
                  </div>
                </div>
              </div>
              <p style={{ color: '#666', fontSize: '14px', fontStyle: 'italic' }}>
                💡 Platform fees are automatically deducted from your payout - customers always pay full menu price
              </p>
            </div>
            
            <div>
              <h4 style={{ color: '#2c6f57', marginBottom: '10px' }}>🔒 Security & Support:</h4>
              <ul style={{ color: '#666', lineHeight: '1.6' }}>
                <li>Bank-level security with PCI DSS compliance</li>
                <li>24/7 fraud monitoring and chargeback protection</li>
                <li>Dedicated customer support for order issues</li>
                <li>Real-time order tracking and analytics dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        renderMenuManagement()
      )}

      {/* Back to Dashboard */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '30px' 
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px',
        fontSize: '14px',
        color: '#666'
      }}>
        Need help? Contact support at support@grubana.com
      </div>
    </div>
  );
};

export default TruckOnboarding;
