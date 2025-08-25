import React from 'react';
import { useAuthContext } from './AuthContext';
import './UpgradeNudges.css';

const ManualLocationIndicator = ({ lastUpdate, onUpgradeClick }) => {
  const { userPlan, userRole } = useAuthContext();

  // Only show for Basic plan owners
  if (userRole !== 'owner' || userPlan !== 'basic') {
    return null;
  }

  const formatLastUpdate = (lastUpdate) => {
    if (!lastUpdate) return 'Never';
    
    const now = new Date();
    const updateTime = new Date(lastUpdate);
    const diffMinutes = Math.floor((now - updateTime) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  return (
    <div className="manual-location-indicator">
      <span className="icon">📍</span>
      <div>
        <strong>Manual Location Mode</strong>
        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
          Last updated: {formatLastUpdate(lastUpdate)}
        </div>
        <button 
          onClick={onUpgradeClick}
          style={{
            background: 'none',
            border: 'none',
            color: '#856404',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '0.8rem',
            padding: 0,
            marginTop: '4px'
          }}
        >
          Switch to auto GPS tracking →
        </button>
      </div>
    </div>
  );
};

export default ManualLocationIndicator;
