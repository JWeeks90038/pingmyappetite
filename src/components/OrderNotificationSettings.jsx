import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const OrderNotificationSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    smsNotifications: false,
    orderStatusUpdates: true,
    estimatedTimeUpdates: true,
    promotionalMessages: false
  });
  const [userInfo, setUserInfo] = useState({
    phone: '',
    phoneVerified: false,
    email: '',
    emailVerified: false
  });
  const [phoneInput, setPhoneInput] = useState('');
  const [verificationStep, setVerificationStep] = useState(null);

  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  const loadUserPreferences = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        setUserInfo({
          phone: userData.phone || '',
          phoneVerified: userData.phoneVerified || false,
          email: userData.email || user.email || '',
          emailVerified: userData.emailVerified !== false
        });
        
        setPreferences({
          smsNotifications: userData.notificationPreferences?.sms === true,
          orderStatusUpdates: userData.notificationPreferences?.orderStatus !== false,
          estimatedTimeUpdates: userData.notificationPreferences?.estimatedTime !== false,
          promotionalMessages: userData.notificationPreferences?.promotional === true
        });
        
        setPhoneInput(userData.phone || '');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPreferences: {
          sms: newPreferences.smsNotifications,
          orderStatus: newPreferences.orderStatusUpdates,
          estimatedTime: newPreferences.estimatedTimeUpdates,
          promotional: newPreferences.promotionalMessages
        },
        updatedAt: new Date()
      });
      
      console.log('✅ Order notification preferences updated');
    } catch (error) {
      console.error('❌ Error updating preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatPhoneDisplay = (phone) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
    }
    return phone;
  };

  const handleSMSToggle = async () => {
    if (!preferences.smsNotifications && !userInfo.phoneVerified) {
      setVerificationStep('phone');
    } else {
      const newPreferences = { ...preferences, smsNotifications: !preferences.smsNotifications };
      setPreferences(newPreferences);
      await updatePreferences(newPreferences);
    }
  };

  const handlePhoneUpdate = async () => {
    try {
      const cleanPhone = phoneInput.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        alert('Please enter a valid 10-digit phone number');
        return;
      }

      setSaving(true);
      
      await updateDoc(doc(db, 'users', user.uid), {
        phone: phoneInput,
        phoneVerified: false,
        updatedAt: new Date()
      });
      
      setUserInfo(prev => ({ 
        ...prev, 
        phone: phoneInput, 
        phoneVerified: false
      }));
      
      setVerificationStep('verifying');
      
      // Demo: auto-verify after 2 seconds
      setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            phoneVerified: true
          });
          
          setUserInfo(prev => ({ ...prev, phoneVerified: true }));
          
          const newPreferences = { ...preferences, smsNotifications: true };
          setPreferences(newPreferences);
          await updatePreferences(newPreferences);
          
          setVerificationStep(null);
          alert('✅ Phone number verified! SMS notifications enabled.');
        } catch (error) {
          console.error('Error verifying phone:', error);
          setVerificationStep(null);
          alert('❌ Verification failed. Please try again.');
        } finally {
          setSaving(false);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error updating phone:', error);
      alert('Failed to update phone number');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading notification settings...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: '#2c6f57', marginBottom: '30px', textAlign: 'center' }}>
        📱 Order Notification Settings
      </h2>
      
      {/* SMS Notifications */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📱 SMS Updates
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              Receive text messages for order status changes
            </p>
            {userInfo.phone && userInfo.phoneVerified && (
              <p style={{ margin: '5px 0 0 0', color: '#28a745', fontSize: '12px' }}>
                ✅ Phone verified: {formatPhoneDisplay(userInfo.phone)}
              </p>
            )}
          </div>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '50px',
            height: '24px'
          }}>
            <input
              type="checkbox"
              checked={preferences.smsNotifications}
              onChange={handleSMSToggle}
              disabled={!userInfo.phoneVerified}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: userInfo.phoneVerified ? 'pointer' : 'not-allowed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: preferences.smsNotifications ? '#2c6f57' : '#ccc',
              borderRadius: '24px',
              transition: '0.3s',
              opacity: userInfo.phoneVerified ? 1 : 0.5
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '18px',
                width: '18px',
                left: preferences.smsNotifications ? '26px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: '0.3s'
              }} />
            </span>
          </label>
        </div>
        
        {(!userInfo.phone || !userInfo.phoneVerified) && (
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '15px',
            marginTop: '10px'
          }}>
            <p style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '14px' }}>
              📞 Add your phone number to enable SMS notifications
            </p>
            {verificationStep === 'phone' ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '6px'
                  }}
                />
                <button
                  onClick={handlePhoneUpdate}
                  disabled={saving}
                  style={{
                    backgroundColor: '#2c6f57',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {saving ? 'Verifying...' : 'Verify Phone'}
                </button>
                <button
                  onClick={() => setVerificationStep(null)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : verificationStep === 'verifying' ? (
              <div style={{ color: '#007bff', fontSize: '14px' }}>
                📱 Sending verification SMS... (Demo: auto-verifying in 2 seconds)
              </div>
            ) : (
              <button
                onClick={() => setVerificationStep('phone')}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Add Phone Number
              </button>
            )}
          </div>
        )}
      </div>

      {/* Order Status Notifications */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>🔔 Order Status Notifications</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.orderStatusUpdates}
              onChange={async (e) => {
                const newPreferences = { ...preferences, orderStatusUpdates: e.target.checked };
                setPreferences(newPreferences);
                await updatePreferences(newPreferences);
              }}
              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
            />
            <div>
              <div style={{ fontWeight: 'bold', color: '#333' }}>Order Status Updates</div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Get notified when your order is confirmed, being prepared, ready, or completed
              </div>
            </div>
          </label>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.estimatedTimeUpdates}
              onChange={async (e) => {
                const newPreferences = { ...preferences, estimatedTimeUpdates: e.target.checked };
                setPreferences(newPreferences);
                await updatePreferences(newPreferences);
              }}
              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
            />
            <div>
              <div style={{ fontWeight: 'bold', color: '#333' }}>Estimated Time Updates</div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Receive dynamic time estimates based on order complexity and truck capacity
              </div>
            </div>
          </label>
        </div>
        
        <div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.promotionalMessages}
              onChange={async (e) => {
                const newPreferences = { ...preferences, promotionalMessages: e.target.checked };
                setPreferences(newPreferences);
                await updatePreferences(newPreferences);
              }}
              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
            />
            <div>
              <div style={{ fontWeight: 'bold', color: '#333' }}>Promotional Messages</div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Receive notifications about deals, discounts, and special offers
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Estimated Time Information */}
      <div style={{
        background: 'linear-gradient(135deg, #e3f2fd, #f3e5f5)',
        border: '1px solid #bbdefb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{
          color: '#1976d2',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⏱️ Smart Time Estimates
        </h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>
          Our system calculates accurate preparation times based on:
        </p>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '5px', fontSize: '14px', color: '#333' }}>
            Number and complexity of items ordered
          </li>
          <li style={{ marginBottom: '5px', fontSize: '14px', color: '#333' }}>
            Current truck capacity and queue length
          </li>
          <li style={{ marginBottom: '5px', fontSize: '14px', color: '#333' }}>
            Peak time adjustments (lunch & dinner rush)
          </li>
          <li style={{ marginBottom: '5px', fontSize: '14px', color: '#333' }}>
            Historical preparation times for each truck
          </li>
          <li style={{ marginBottom: '5px', fontSize: '14px', color: '#333' }}>
            Special instructions and customizations
          </li>
        </ul>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
          Times are updated in real-time as conditions change.
        </p>
      </div>

      {/* Save Indicator */}
      {saving && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '10px',
          textAlign: 'center',
          color: '#856404',
          marginBottom: '20px'
        }}>
          💾 Saving preferences...
        </div>
      )}

      {/* Information */}
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '15px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>ℹ️ About Order Notifications</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '5px', fontSize: '14px', color: '#666' }}>
            📱 SMS notifications require phone verification
          </li>
          <li style={{ marginBottom: '5px', fontSize: '14px', color: '#666' }}>
            ⏱️ Time estimates improve with each order
          </li>
          <li style={{ marginBottom: '5px', fontSize: '14px', color: '#666' }}>
            🔔 Notifications are sent instantly when status changes
          </li>
          <li style={{ marginBottom: '5px', fontSize: '14px', color: '#666' }}>
            🔕 You can disable or customize notifications anytime
          </li>
        </ul>
      </div>
    </div>
  );
};

export default OrderNotificationSettings;
