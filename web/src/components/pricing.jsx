import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/footer';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';


const Pricing = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const handleSubscribe = (plan = 'all-access', userType = 'owner') => {
    if (!user) {
      // Redirect to signup with appropriate role and plan pre-selected
      if (userType === 'owner') {
        navigate(`/signup?role=owner&plan=${plan}`);
      } else if (userType === 'event-organizer') {
        navigate(`/signup?role=event-organizer&plan=${plan}`);
      } else {
        navigate('/signup');
      }
    } else if (userRole === 'owner' && userType === 'owner') {
      // Pass the plan type to checkout for existing food truck owners
      navigate('/checkout', { state: { selectedPlan: plan } });
    } else if (userRole === 'event-organizer' && userType === 'event-organizer') {
      // Pass the plan type to checkout for existing event organizers
      navigate('/checkout', { state: { selectedPlan: plan } });
    } else {
      navigate('/signup');
    }
  };

  return (
    <div style={{
      backgroundColor: '#0B0B1A',
      minHeight: '100vh',
      color: '#FFFFFF'
    }}>
      <style>{`
        /* Ensure proper styling for any remaining external classes */
        body {
          background-color: #0B0B1A !important;
        }
      `}</style>
      {/* Header Section */}
      <section style={{
        backgroundColor: '#1A1036',
        padding: '60px 20px',
        textAlign: 'center',
        borderBottom: '1px solid #FF4EC9'
      }}>
        <h1 style={{
          color: '#FFFFFF',
          fontSize: '36px',
          fontWeight: '700',
          marginBottom: '20px',
          textAlign: 'center'
        }}>Choose Your Plan</h1>
        <p style={{
          color: '#FFFFFF',
          fontSize: '18px',
          opacity: '0.8',
          textAlign: 'center'
        }}>Find the perfect plan for your business needs</p>
      </section>

      {/* Food Truck & Trailer Owners Section */}
      <section style={{
        backgroundColor: '#1A1036',
        padding: '60px 20px',
        maxWidth: '1200px',
        margin: '0 auto',
        border: '1px solid #4DBFFF',
        borderRadius: '12px',
        marginBottom: '40px'
      }}>
        <h2 style={{
          color: '#FF4EC9',
          fontSize: '28px',
          fontWeight: '600',
          marginBottom: '15px',
          textAlign: 'center'
        }}>🚚 Food Truck & Trailer Owners</h2>
        <h3 style={{
          color: '#FFFFFF',
          fontSize: '20px',
          fontWeight: '400',
          marginBottom: '15px',
          textAlign: 'center'
        }}>Gain visibility, track demand, and connect with hungry customers.</h3>
        <p style={{
          color: '#4DBFFF',
          fontSize: '16px',
          fontWeight: '500',
          marginBottom: '40px',
          textAlign: 'center'
        }}>*Try Pro or All Access free for 30 days*</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          
          {/* Starter Plan - Free */}
          <div style={{
              backgroundColor: '#1A1036',
              border: '1px solid #4DBFFF',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              boxSizing: 'border-box'
            }}>
            <h3 style={{
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '15px'
            }}>STARTER</h3>
            <p style={{
              color: '#4DBFFF',
              fontSize: '36px',
              fontWeight: '700',
              margin: '0'
            }}>Free</p>
            <p style={{
              color: '#FFFFFF',
              fontSize: '14px',
              opacity: '0.7',
              marginBottom: '25px'
            }}>forever</p>
            <div style={{
              textAlign: 'left',
              marginBottom: '30px'
            }}>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Appear on discovery map</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ View demand pins</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Access truck dashboard</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Real-time GPS tracking</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Menu photo uploads</div>
              <div style={{ color: '#FF4EC9', marginBottom: '8px', fontSize: '14px' }}>❌ Lower pre-order fees</div>
              <div style={{ color: '#FF4EC9', marginBottom: '8px', fontSize: '14px' }}>❌ Citywide heat maps</div>
              <div style={{ color: '#FF4EC9', marginBottom: '8px', fontSize: '14px' }}>❌ Advanced analytics</div>
              <div style={{ color: '#FF4EC9', marginBottom: '8px', fontSize: '14px' }}>❌ Promotional drops</div>
            </div>
            <button 
              style={{
                backgroundColor: '#4DBFFF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
                transition: 'background-color 0.3s ease'
              }}
              onClick={() => handleSubscribe('basic', 'owner')}
            >
              Start Free
            </button>
          </div>

          {/* Pro Plan - $9.99 */}
          <div style={{
              backgroundColor: '#1A1036',
              border: '2px solid #FF4EC9',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              position: 'relative',
              transform: 'scale(1.05)',
              boxShadow: '0 8px 32px rgba(255, 78, 201, 0.3)',
              boxSizing: 'border-box'
            }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#FF4EC9',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>⭐ Most Popular</div>
            <h3 style={{
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '15px',
              marginTop: '10px'
            }}>PRO</h3>
            <p style={{
              color: '#FF4EC9',
              fontSize: '36px',
              fontWeight: '700',
              margin: '0'
            }}>$9</p>
            <p style={{
              color: '#FFFFFF',
              fontSize: '14px',
              opacity: '0.7',
              marginBottom: '25px'
            }}>per month</p>
            <div style={{
              textAlign: 'left',
              marginBottom: '30px'
            }}>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Everything in Starter</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Real-time GPS tracking</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Real-time menu display</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Citywide heat maps</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Basic engagement metrics</div>
              <div style={{ color: '#FF4EC9', marginBottom: '8px', fontSize: '14px' }}>❌ Advanced analytics</div>
              <div style={{ color: '#FF4EC9', marginBottom: '8px', fontSize: '14px' }}>❌ Promotional drops</div>
            </div>
            <button
              style={{
                backgroundColor: '#FF4EC9',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
                transition: 'background-color 0.3s ease'
              }}
              onClick={() => handleSubscribe('pro', 'owner')}
            >
              Start Free 30-Day Trial
            </button>
          </div>

          {/* All Access Plan - $19.99 */}
          <div style={{
              backgroundColor: '#1A1036',
              border: '1px solid #4DBFFF',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              boxSizing: 'border-box'
            }}>
            <h3 style={{
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '15px'
            }}>ALL ACCESS</h3>
            <p style={{
              color: '#4DBFFF',
              fontSize: '36px',
              fontWeight: '700',
              margin: '0'
            }}>$19</p>
            <p style={{
              color: '#FFFFFF',
              fontSize: '14px',
              opacity: '0.7',
              marginBottom: '25px'
            }}>per month</p>
            <div style={{
              textAlign: 'left',
              marginBottom: '30px'
            }}>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Everything in Starter & Pro</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Advanced analytics dashboard</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Create promotional drops</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Featured placement</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Priority support</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Custom branding</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Export data</div>
            </div>
            <button
              style={{
                backgroundColor: '#4DBFFF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
                transition: 'background-color 0.3s ease'
              }}
              onClick={() => handleSubscribe('all-access', 'owner')}
            >
              Start Free 30-Day Trial
            </button>
          </div>
        </div>
      </section>

      {/* Event Organizers Section */}
      <section style={{
        backgroundColor: '#1A1036',
        padding: '60px 20px',
        maxWidth: '1200px',
        margin: '0 auto',
        border: '1px solid #4DBFFF',
        borderRadius: '12px',
        marginBottom: '40px'
      }}>
        <h2 style={{
          color: '#FF4EC9',
          fontSize: '28px',
          fontWeight: '600',
          marginBottom: '15px',
          textAlign: 'center'
        }}>🎪 Event Organizers</h2>
        <h3 style={{
          color: '#FFFFFF',
          fontSize: '20px',
          fontWeight: '400',
          marginBottom: '15px',
          textAlign: 'center'
        }}>Create memorable events and connect with quality vendors.</h3>
        <p style={{
          color: '#4DBFFF',
          fontSize: '16px',
          fontWeight: '500',
          marginBottom: '40px',
          textAlign: 'center'
        }}>*30-day money-back guarantee on all plans*</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          
          {/* Event Starter Plan - Free */}
          <div style={{
              backgroundColor: '#1A1036',
              border: '1px solid #4DBFFF',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              boxSizing: 'border-box'
            }}>
            <h3 style={{
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '15px'
            }}>EVENT STARTER</h3>
            <p style={{
              color: '#4DBFFF',
              fontSize: '36px',
              fontWeight: '700',
              margin: '0'
            }}>Free</p>
            <p style={{
              color: '#FFFFFF',
              fontSize: '14px',
              opacity: '0.7',
              marginBottom: '25px'
            }}>forever</p>
            <div style={{
              textAlign: 'left',
              marginBottom: '30px'
            }}>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Up to 3 events per month</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Basic event page with details</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Vendor application management</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Map location marker</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Email notifications</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Basic analytics</div>
            </div>
            <button
              style={{
                backgroundColor: '#4DBFFF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
                transition: 'background-color 0.3s ease'
              }}
              onClick={() => handleSubscribe('event-basic', 'event-organizer')}
            >
              Start Free
            </button>
          </div>

          {/* Event Premium Plan */}
          <div style={{
              backgroundColor: '#1A1036',
              border: '2px solid #FF4EC9',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              position: 'relative',
              transform: 'scale(1.05)',
              boxShadow: '0 8px 32px rgba(255, 78, 201, 0.3)',
              boxSizing: 'border-box'
            }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#FF4EC9',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>⭐ Most Popular</div>
            <h3 style={{
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '15px',
              marginTop: '10px'
            }}>EVENT PREMIUM</h3>
            <p style={{
              color: '#FF4EC9',
              fontSize: '36px',
              fontWeight: '700',
              margin: '0'
            }}>$29.00</p>
            <p style={{
              color: '#FFFFFF',
              fontSize: '14px',
              opacity: '0.7',
              marginBottom: '25px'
            }}>per month</p>
            <div style={{
              textAlign: 'left',
              marginBottom: '30px'
            }}>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Unlimited events</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Enhanced event pages with photos</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Priority map placement</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Advanced vendor matching</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ SMS and email notifications</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Detailed analytics dashboard</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Custom branding options</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Social media integration</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Featured map placement</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Custom event marketing tools</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ White-label event pages</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ API access for integrations</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Dedicated account manager</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Custom reporting</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Multi-user team access</div>
              <div style={{ color: '#00E676', marginBottom: '8px', fontSize: '14px' }}>✅ Priority vendor recommendations</div>
            </div>
            <button
              style={{
                backgroundColor: '#FF4EC9',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
                transition: 'background-color 0.3s ease'
              }}
              onClick={() => handleSubscribe('event-premium', 'event-organizer')}
            >
              Choose Premium
            </button>
          </div>
        </div>
      </section>

      {/* Payment Integration */}
      <section style={{
        backgroundColor: '#1A1036',
        padding: '60px 20px',
        textAlign: 'center',
        border: '1px solid #4DBFFF',
        borderRadius: '12px',
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '40px'
      }}>
        <h2 style={{
          color: '#FFFFFF',
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '15px'
        }}>Secure Payments with Stripe</h2>
        <p style={{
          color: '#FFFFFF',
          fontSize: '16px',
          opacity: '0.8',
          marginBottom: '20px'
        }}>We use Stripe to process payments securely and efficiently.</p>
        <img
          src="https://stripe.com/img/v3/home/twitter.png"
          alt="Stripe Payments"
          style={{ height: "40px", marginTop: "10px" }}
        />
      </section>

      {/* Testimonials */}
      <section style={{
        backgroundColor: '#1A1036',
        padding: '60px 20px',
        maxWidth: '1200px',
        margin: '0 auto',
        border: '1px solid #4DBFFF',
        borderRadius: '12px',
        marginBottom: '40px'
      }}>
        <h2 style={{
          color: '#FFFFFF',
          fontSize: '28px',
          fontWeight: '600',
          marginBottom: '40px',
          textAlign: 'center'
        }}>What Our Users Say</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '30px'
        }}>
          <div style={{
              backgroundColor: '#1A1036',
              border: '1px solid #4DBFFF',
              borderRadius: '12px',
              padding: '25px',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}>
            <p style={{
              color: '#FFFFFF',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '20px',
              fontStyle: 'italic'
            }}>"Since joining the All Access plan, my food truck has doubled its sales. The heat maps and analytics are game changers!"</p>
            <h4 style={{
              color: '#FF4EC9',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '5px'
            }}>🚚 Mike's Tacos</h4>
            <span style={{
              color: '#4DBFFF',
              fontSize: '12px',
              fontWeight: '500'
            }}>Food Truck Owner</span>
          </div>
          <div style={{
            backgroundColor: '#1A1036 !important',
            border: '1px solid #4DBFFF',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}>
            <p style={{
              color: '#FFFFFF',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '20px',
              fontStyle: 'italic'
            }}>"Being featured on the map has helped me reach more customers every day. Worth every penny!"</p>
            <h4 style={{
              color: '#FF4EC9',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '5px'
            }}>🍔 Patty's Burgers</h4>
            <span style={{
              color: '#4DBFFF',
              fontSize: '12px',
              fontWeight: '500'
            }}>Food Truck Owner</span>
          </div>
          <div style={{
              backgroundColor: '#1A1036',
              border: '1px solid #4DBFFF',
              borderRadius: '12px',
              padding: '25px',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}>
            <p style={{
              color: '#FFFFFF',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '20px',
              fontStyle: 'italic'
            }}>"Event Pro has transformed how we manage our farmers market. Vendor applications are so much easier now!"</p>
            <h4 style={{
              color: '#FF4EC9',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '5px'
            }}>🎪 Downtown Events</h4>
            <span style={{
              color: '#4DBFFF',
              fontSize: '12px',
              fontWeight: '500'
            }}>Event Organizer</span>
          </div>
          <div style={{
            backgroundColor: '#1A1036 !important',
            border: '1px solid #4DBFFF',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}>
            <p style={{
              color: '#FFFFFF',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '20px',
              fontStyle: 'italic'
            }}>"The vendor matching feature helped us find the perfect food trucks for our festival. Highly recommended!"</p>
            <h4 style={{
              color: '#FF4EC9',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '5px'
            }}>🎊 Summer Festival Co.</h4>
            <span style={{
              color: '#4DBFFF',
              fontSize: '12px',
              fontWeight: '500'
            }}>Event Organizer</span>
          </div>
        </div>
      </section>

      <div style={{
        textAlign: 'center',
        padding: '40px 20px'
      }}>
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          style={{
            display: "inline-block",
            color: "#4DBFFF",
            textDecoration: "none",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "16px",
            padding: "12px 24px",
            border: "1px solid #4DBFFF",
            borderRadius: "8px",
            transition: "all 0.3s ease"
          }}
        >
          Back to Top ↑
        </a>
      </div>

    </div>
  );
};

export default Pricing;