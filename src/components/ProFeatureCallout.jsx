import React from 'react';
import { useAuthContext } from './AuthContext';
import { trackFeatureCalloutClick } from '../utils/upgradeAnalytics';
import './UpgradeNudges.css';

const ProFeatureCallout = ({ 
  feature, 
  description, 
  ctaText = "Upgrade to Pro", 
  benefits = [],
  className = "",
  style = {} 
}) => {
  const { userPlan, userRole, user } = useAuthContext();

  // Only show for Basic plan users
  if (userRole !== 'owner' || userPlan !== 'basic') {
    return null;
  }

  const handleUpgradeClick = () => {
    // Track the click for analytics
    trackFeatureCalloutClick(user?.uid, feature, 'upgrade_clicked');
    
    window.location.href = '/pricing';
  };

  return (
    <div className={`pro-feature-callout ${className}`} style={style}>
      <div className="feature-title">{feature}</div>
      <div className="feature-description">{description}</div>
      
      {benefits.length > 0 && (
        <div style={{ margin: '12px 0' }}>
          {benefits.map((benefit, index) => (
            <div key={index} style={{ fontSize: '0.9rem', color: '#0d47a1', marginBottom: '4px' }}>
              ✅ {benefit}
            </div>
          ))}
        </div>
      )}
      
      <button 
        onClick={handleUpgradeClick}
        className="upgrade-link"
        style={{
          background: 'linear-gradient(135deg, #007bff, #0056b3)',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '0.9rem',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseOver={e => e.target.style.transform = 'translateY(-1px)'}
        onMouseOut={e => e.target.style.transform = 'translateY(0)'}
      >
        {ctaText} →
      </button>
    </div>
  );
};

// Specific callout components for common features
export const GPSTrackingCallout = () => (
  <ProFeatureCallout
    feature="🚀 Real-Time GPS Tracking"
    description="Stop manually updating your location. Let Pro plan handle it automatically."
    benefits={[
      "Automatic location updates every 30 seconds",
      "Never miss customers looking for you",
      "Focus on cooking, not updating"
    ]}
    ctaText="Upgrade to Pro for $9.99/month"
  />
);

export const HeatMapCallout = () => (
  <ProFeatureCallout
    feature="🔥 Citywide Heat Maps"
    description="See where customers are craving food with advanced demand analytics."
    benefits={[
      "Visual demand zones across the city",
      "Find the best locations to park",
      "Maximize your revenue potential"
    ]}
    ctaText="Unlock Heat Maps with Pro"
  />
);

export const AnalyticsCallout = () => (
  <ProFeatureCallout
    feature="📊 Advanced Analytics"
    description="Get insights into your business performance with detailed analytics."
    benefits={[
      "30-day performance reports",
      "Customer engagement metrics", 
      "Revenue optimization insights"
    ]}
    ctaText="Get Analytics with All Access"
  />
);

export default ProFeatureCallout;
