import React from 'react';
import { getPlanDetails } from '../utils/stripe';
import '../assets/MobileKitchenPlanSelector.css';

const MobileKitchenPlanSelector = ({ selectedPlan, onPlanSelect }) => {
  const mobileKitchenPlans = [
    {
      id: 'basic',
      name: 'Starter',
      price: 'Free',
      period: '/forever',
      description: 'Perfect for getting started with your mobile kitchen',
      features: [
        'Appear on discovery map',
        'View demand pins',
        'Access truck dashboard',
        'Real-time GPS tracking',
        'Menu photo uploads',
        'Basic profile management'
      ],
      buttonText: 'Start Free',
      isFree: true
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$9',
      period: '/month',
      description: 'Most popular choice for active mobile kitchen owners',
      features: [
        'Everything in Starter',
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
      price: '$19',
      period: '/month',
      description: 'Full-featured plan for professional mobile kitchens',
      features: [
        'Everything in Starter & Pro',
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
    <div style={{
      backgroundColor: '#0B0B1A',
      padding: '30px 20px',
      marginTop: '30px',
      borderRadius: '12px',
      border: '1px solid #1A1036',
      color: '#FFFFFF',
      minHeight: '100px',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <style>{`
        .plan-card.selected {
          background-color: #1A1036 !important;
          background: #1A1036 !important;
          color: #FFFFFF !important;
        }
        .plan-card.selected * {
          color: #FFFFFF !important;
        }
        .plan-card.selected .plan-header h4 {
          color: #FF4EC9 !important;
        }
        .plan-card.selected .price {
          color: #FFFFFF !important;
        }
        .plan-card.selected .period {
          color: #FFFFFF !important;
        }
        .plan-card.selected .plan-description {
          color: #FFFFFF !important;
        }
        .plan-card.selected .feature-icon {
          color: #00E676 !important;
        }
      `}</style>
      <div className="plan-selector-header" style={{
        textAlign: 'center',
        marginBottom: '30px'
      }}>
        <h3 style={{
          color: '#FF4EC9',
          fontSize: '1.8rem',
          fontWeight: '700',
          marginBottom: '10px'
        }}>🚚 Choose Your Mobile Kitchen Plan</h3>
        <p style={{
          color: '#FFFFFF',
          fontSize: '1.1rem',
          opacity: '0.9'
        }}>Select the plan that best fits your mobile kitchen business needs</p>
      </div>

      <div className="plans-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '25px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {mobileKitchenPlans.map((plan) => (
          <div 
            key={plan.id}
            className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''} ${plan.isFree ? 'free-plan' : ''}`}
            onClick={() => onPlanSelect(plan.id)}
            style={{
              backgroundColor: selectedPlan === plan.id ? '#4DBFFF' : '#0B0B1A',
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
            
            {plan.isFree && (
              <div className="free-badge" style={{
                position: 'absolute',
                top: '-10px',
                right: '20px',
                backgroundColor: '#00E676',
                color: '#0B0B1A',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(0, 230, 118, 0.3)'
              }}>
                🎉 Free Forever
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
                className={`plan-button ${selectedPlan === plan.id ? 'selected' : ''} ${plan.isFree ? 'free-button' : ''}`}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: selectedPlan === plan.id ? '#00E676' : plan.isFree ? '#4DBFFF' : '#FF4EC9',
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
        <p style={{
          color: '#FFFFFF',
          fontSize: '0.9rem',
          margin: '0',
          opacity: '0.9'
        }}>
          <span className="guarantee-icon" style={{
            marginRight: '8px'
          }}>🛡️</span>
          30-day money-back guarantee on paid plans • Cancel anytime • No setup fees
        </p>
      </div>
    </div>
  );
};

export default MobileKitchenPlanSelector;
