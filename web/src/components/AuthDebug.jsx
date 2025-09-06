import React from 'react';
import { useAuth } from './AuthContext';

const AuthDebug = () => {
  const { user, userRole, userPlan, userSubscriptionStatus, loading } = useAuth();

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: '#000', 
      color: '#fff', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>🔍 Auth Debug</h4>
      <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
      <p><strong>User:</strong> {user ? user.email : 'None'}</p>
      <p><strong>Role:</strong> {userRole || 'None'}</p>
      <p><strong>Plan:</strong> {userPlan || 'None'}</p>
      <p><strong>Status:</strong> {userSubscriptionStatus || 'None'}</p>
      <p><strong>Current URL:</strong> {window.location.pathname}</p>
    </div>
  );
};

export default AuthDebug;
