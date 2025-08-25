import React, { useState } from 'react';
import { getPlanDetails, getPriceId } from '../utils/stripe';
import '../assets/EventSubscription.css';

const EventSubscriptionPlans = ({ onPlanSelect, currentPlan = null }) => {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan || 'event-starter');

  const eventPlans = [
    'event-starter',
    'event-pro', 
    'event-premium'
  ];

  const handlePlanSelect = (planType) => {
    setSelectedPlan(planType);
    if (onPlanSelect) {
      onPlanSelect(planType);
    }
  };

  const formatPrice = (priceInCents) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  return (
    <div className="subscription-plans-container">
      <div className="plans-header">
        <h2>🎪 Event Organizer Subscription Plans</h2>
        <p>Choose the perfect plan to showcase your events and connect with vendors</p>
      </div>

      <div className="plans-grid">
        {eventPlans.map((planType) => {
          const plan = getPlanDetails(planType);
          const isSelected = selectedPlan === planType;
          const isPopular = planType === 'event-pro';

          return (
            <div 
              key={planType}
              className={`plan-card ${isSelected ? 'selected' : ''} ${isPopular ? 'popular' : ''}`}
              onClick={() => handlePlanSelect(planType)}
            >
              {isPopular && (
                <div className="popular-badge">
                  ⭐ Most Popular
                </div>
              )}
              
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="plan-price">
                  <span className="price">{formatPrice(plan.price)}</span>
                  <span className="period">/month</span>
                </div>
              </div>

              <div className="plan-features">
                <ul>
                  {plan.features.map((feature, index) => (
                    <li key={index}>
                      <span className="checkmark">✅</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="plan-action">
                <button 
                  className={`select-plan-btn ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlanSelect(planType);
                  }}
                >
                  {isSelected ? '✓ Selected' : 'Select Plan'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="plans-footer">
        <div className="guarantee">
          <h4>🛡️ 30-Day Money-Back Guarantee</h4>
          <p>Not satisfied? Get a full refund within 30 days, no questions asked.</p>
        </div>
        
        <div className="plan-benefits">
          <h4>🎯 Why Choose Our Event Platform?</h4>
          <div className="benefits-grid">
            <div className="benefit">
              <span className="benefit-icon">🗺️</span>
              <span>Prominent map visibility</span>
            </div>
            <div className="benefit">
              <span className="benefit-icon">🚚</span>
              <span>Connect with quality vendors</span>
            </div>
            <div className="benefit">
              <span className="benefit-icon">📊</span>
              <span>Real-time analytics</span>
            </div>
            <div className="benefit">
              <span className="benefit-icon">📱</span>
              <span>Mobile-optimized experience</span>
            </div>
            <div className="benefit">
              <span className="benefit-icon">🎪</span>
              <span>Event promotion tools</span>
            </div>
            <div className="benefit">
              <span className="benefit-icon">💬</span>
              <span>Vendor communication</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventSubscriptionPlans;
