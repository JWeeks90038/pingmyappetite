import React from 'react';
import { getPlanDetails } from '../utils/stripe';
import '../assets/MobileKitchenPlanSelector.css';

const MobileKitchenPlanSelector = ({ selectedPlan, onPlanSelect }) => {
  const mobileKitchenPlans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 'Free',
      period: '/forever',
      description: 'Perfect for getting started with your mobile kitchen',
      features: [
        'Appear on discovery map',
        'View demand pins',
        'Access truck dashboard',
        'Manual location updates',
        'Menu photo uploads',
        'Basic profile management'
      ],
      buttonText: 'Start Free',
      isFree: true
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$9.99',
      period: '/month',
      description: 'Most popular choice for active mobile kitchen owners',
      features: [
        'Everything in Basic',
        'Real-time GPS tracking',
        'Real-time menu display',
        'Citywide heat maps',
        'Basic engagement metrics',
        'Priority map placement',
        'Enhanced analytics'
      ],
      buttonText: 'Choose Pro',
      popular: true
    },
    {
      id: 'all-access',
      name: 'All Access',
      price: '$19.99',
      period: '/month',
      description: 'Full-featured plan for professional mobile kitchens',
      features: [
        'Everything in Basic & Pro',
        'Advanced analytics dashboard',
        'Create promotional drops',
        'Featured placement',
        'Trend alerts',
        'Priority support',
        'Custom branding',
        'Export data',
        'Multiple locations'
      ],
      buttonText: 'Go All Access'
    }
  ];

  return (
    <div className="mobile-kitchen-plan-selector">
      <div className="plan-selector-header">
        <h3>🚚 Choose Your Mobile Kitchen Plan</h3>
        <p>Select the plan that best fits your mobile kitchen business needs</p>
      </div>

      <div className="plans-grid">
        {mobileKitchenPlans.map((plan) => (
          <div 
            key={plan.id}
            className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''} ${plan.isFree ? 'free-plan' : ''}`}
            onClick={() => onPlanSelect(plan.id)}
          >
            {plan.popular && (
              <div className="popular-badge">
                ⭐ Most Popular
              </div>
            )}
            
            {plan.isFree && (
              <div className="free-badge">
                🎉 Free Forever
              </div>
            )}
            
            <div className="plan-header">
              <h4>{plan.name}</h4>
              <div className="plan-price">
                <span className="price">{plan.price}</span>
                <span className="period">{plan.period}</span>
              </div>
              <p className="plan-description">{plan.description}</p>
            </div>

            <div className="plan-features">
              <ul>
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <span className="feature-icon">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="plan-action">
              <button 
                type="button"
                className={`plan-button ${selectedPlan === plan.id ? 'selected' : ''} ${plan.isFree ? 'free-button' : ''}`}
              >
                {selectedPlan === plan.id ? '✓ Selected' : plan.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="plan-selector-footer">
        <p>
          <span className="guarantee-icon">🛡️</span>
          30-day money-back guarantee on paid plans • Cancel anytime • No setup fees
        </p>
      </div>
    </div>
  );
};

export default MobileKitchenPlanSelector;
