import React from 'react';
import { getPlanDetails } from '../utils/stripe';
import '../assets/EventOrganizerPlanSelector.css';

const EventOrganizerPlanSelector = ({ selectedPlan, onPlanSelect }) => {
  const eventPlans = [
    {
      id: 'event-basic',
      name: 'Event Starter',
      price: 'Free',
      period: 'forever',
      description: 'Perfect for getting started with event organizing',
      features: [
        'Up to 3 events per month',
        'Basic event page with details',
        'Vendor application management',
        'Map location marker',
        'Email notifications',
        'Basic analytics'
      ],
      buttonText: 'Start Free',
      trialText: 'Always Free'
    },
    {
      id: 'event-premium',
      name: 'Event Premium',
      price: '$29.00',
      period: '/month',
      description: 'Full-featured plan for professional event organizers',
      features: [
        'Unlimited events',
        'Enhanced event pages with photos',
        'Priority map placement',
        'Advanced vendor matching',
        'SMS and email notifications',
        'Detailed analytics dashboard',
        'Custom branding options',
        'Social media integration',
        'Featured map placement',
        'Custom event marketing tools',
        'White-label event pages',
        'API access for integrations',
        'Dedicated account manager',
        'Custom reporting',
        'Multi-user team access',
        'Priority vendor recommendations'
      ],
      buttonText: 'Get Premium',
      popular: true,
      trialText: 'Free Trial Available*'
    }
  ];

  return (
    <React.Fragment>
      <div style={{
        backgroundColor: '#0B0B1A',
        padding: '30px 20px',
        marginTop: '30px',
        borderRadius: '12px',
        border: '1px solid #1A1036',
        color: '#FFFFFF',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div className="plan-selector-header" style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <h3 style={{
            color: '#FF4EC9',
            fontSize: '1.8rem',
            fontWeight: '700',
            marginBottom: '10px'
          }}>🎪 Choose Your Event Organizer Plan</h3>
          <p style={{
            color: '#FFFFFF',
            fontSize: '1.1rem',
            opacity: '0.9'
          }}>Select the plan that best fits your event organizing needs</p>
        </div>

      <div className="plans-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '25px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {eventPlans.map((plan) => (
          <div 
            key={plan.id}
            className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
            onClick={() => onPlanSelect(plan.id)}
            style={{
              backgroundColor: selectedPlan === plan.id ? '#4DBFFF !important' : '#0B0B1A',
              border: selectedPlan === plan.id ? '3px solid #FF4EC9' : plan.popular ? '2px solid #4DBFFF' : '2px solid #1A1036',
              borderRadius: '12px',
              padding: '25px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              boxShadow: selectedPlan === plan.id ? '0 8px 32px rgba(255, 78, 201, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.2)',
              transform: selectedPlan === plan.id ? 'translateY(-5px)' : 'none'
            }}
          >
            {plan.popular && (
              <div className="popular-badge" style={{
                position: 'absolute',
                top: '-10px',
                right: '20px',
                backgroundColor: '#4DBFFF',
                color: '#0B0B1A',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(77, 191, 255, 0.3)'
              }}>
                ⭐ Most Popular
              </div>
            )}
            
            <div className="plan-header" style={{
              marginBottom: '20px'
            }}>
              <h4 style={{
                color: '#FF4EC9',
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '10px'
              }}>{plan.name}</h4>
              {plan.trialText && (
                <div className="trial-badge" style={{
                  backgroundColor: '#00E676',
                  color: '#0B0B1A',
                  padding: '4px 12px',
                  borderRadius: '15px',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'inline-block',
                  marginBottom: '10px'
                }}>🎉 {plan.trialText}</div>
              )}
              <div className="plan-price" style={{
                marginBottom: '15px'
              }}>
                <span className="price" style={{
                  color: '#FFFFFF',
                  fontSize: '2rem',
                  fontWeight: '700'
                }}>{plan.price}</span>
                <span className="period" style={{
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  opacity: '0.8'
                }}>{plan.period}</span>
              </div>
              <p className="plan-description" style={{
                color: '#FFFFFF',
                fontSize: '0.95rem',
                opacity: '0.9',
                lineHeight: '1.4'
              }}>{plan.description}</p>
            </div>

            <div className="plan-features" style={{
              marginBottom: '25px'
            }}>
              <ul style={{
                listStyle: 'none',
                padding: '0',
                margin: '0'
              }}>
                {plan.features.map((feature, index) => (
                  <li key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    color: '#FFFFFF',
                    fontSize: '0.9rem'
                  }}>
                    <span className="feature-icon" style={{
                      color: '#00E676',
                      fontWeight: '700',
                      marginRight: '10px',
                      fontSize: '1rem'
                    }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="plan-action">
              <button 
                type="button"
                className={`plan-button ${selectedPlan === plan.id ? 'selected' : ''}`}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: selectedPlan === plan.id ? '#00E676' : plan.price === 'Free' ? '#4DBFFF' : '#FF4EC9',
                  color: '#0B0B1A'
                }}
                onMouseOver={(e) => {
                  if (selectedPlan !== plan.id) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(255, 78, 201, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                {selectedPlan === plan.id ? '✓ Selected' : plan.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="plan-selector-footer" style={{
        textAlign: 'center',
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#1A1036',
        borderRadius: '8px',
        border: '1px solid #4DBFFF'
      }}>
        <div className="trial-info" style={{
          marginBottom: '20px'
        }}>
          <h4 style={{
            color: '#FF4EC9',
            fontSize: '1.2rem',
            fontWeight: '700',
            marginBottom: '15px'
          }}>🎯 Your 30-Day Free Trial Includes:</h4>
          <div className="trial-benefits" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '15px'
          }}>
            <span style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>✅ Full access to all plan features</span>
            <span style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>✅ No setup fees or hidden charges</span>
            <span style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>✅ Cancel anytime during trial</span>
            <span style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>✅ Billing starts after 30 days</span>
          </div>
        </div>
        <p style={{
          color: '#FFFFFF',
          fontSize: '0.9rem',
          margin: '15px 0',
          opacity: '0.9'
        }}>
          <span className="guarantee-icon" style={{
            marginRight: '8px'
          }}>🛡️</span>
          30-day money-back guarantee • Cancel anytime • No setup fees
        </p>
        <div className="trial-note">
          <p style={{
            color: '#4DBFFF',
            fontSize: '0.8rem',
            margin: '0',
            fontStyle: 'italic'
          }}><small><strong>*30-Day Free Trial:</strong> Available with valid referral code during signup</small></p>
        </div>
      </div>
    </div>
    </React.Fragment>
  );
};

export default EventOrganizerPlanSelector;
