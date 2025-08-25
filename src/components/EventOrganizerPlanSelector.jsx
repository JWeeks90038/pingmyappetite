import React from 'react';
import { getPlanDetails } from '../utils/stripe';
import '../assets/EventOrganizerPlanSelector.css';

const EventOrganizerPlanSelector = ({ selectedPlan, onPlanSelect }) => {
  const eventPlans = [
    {
      id: 'event-starter',
      name: 'Event Starter',
      price: '$29.99',
      period: '/month',
      description: 'Perfect for getting started with event organizing',
      features: [
        'Up to 3 events per month',
        'Basic event page with details',
        'Vendor application management',
        'Map location marker',
        'Email notifications',
        'Basic analytics'
      ],
      buttonText: 'Start with Starter'
    },
    {
      id: 'event-pro',
      name: 'Event Pro',
      price: '$49.99',
      period: '/month',
      description: 'Most popular choice for active event organizers',
      features: [
        'Unlimited events',
        'Enhanced event pages with photos',
        'Priority map placement',
        'Advanced vendor matching',
        'SMS and email notifications',
        'Detailed analytics dashboard',
        'Custom branding options',
        'Social media integration'
      ],
      buttonText: 'Choose Pro',
      popular: true
    },
    {
      id: 'event-premium',
      name: 'Event Premium',
      price: '$99.99',
      period: '/month',
      description: 'Full-featured plan for professional event organizers',
      features: [
        'Everything in Event Pro',
        'Featured map placement',
        'Custom event marketing tools',
        'White-label event pages',
        'API access for integrations',
        'Dedicated account manager',
        'Custom reporting',
        'Multi-user team access',
        'Priority vendor recommendations'
      ],
      buttonText: 'Go Premium'
    }
  ];

  return (
    <div className="event-organizer-plan-selector">
      <div className="plan-selector-header">
        <h3>🎪 Choose Your Event Organizer Plan</h3>
        <p>Select the plan that best fits your event organizing needs</p>
      </div>

      <div className="plans-grid">
        {eventPlans.map((plan) => (
          <div 
            key={plan.id}
            className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
            onClick={() => onPlanSelect(plan.id)}
          >
            {plan.popular && (
              <div className="popular-badge">
                ⭐ Most Popular
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
                className={`plan-button ${selectedPlan === plan.id ? 'selected' : ''}`}
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
          30-day money-back guarantee • Cancel anytime • No setup fees
        </p>
      </div>
    </div>
  );
};

export default EventOrganizerPlanSelector;
