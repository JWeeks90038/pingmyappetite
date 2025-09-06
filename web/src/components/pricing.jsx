import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/footer';
import '../assets/styles.css';
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
    <div>
      {/* Header Section */}
      <section className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>Find the perfect plan for your business needs</p>
      </section>

      {/* Food Truck & Trailer Owners Section */}
      <section className="pricing-section">
        <h2>🚚 Food Truck & Trailer Owners</h2>
        <h3>Gain visibility, track demand, and connect with hungry customers.</h3>
        <p className="trial-offer">*Try Pro or All Access free for 30 days*</p>
        <div className="pricing-container">
          
          {/* Starter Plan - Free */}
          <div className="pricing-plan">
            <h3>STARTER</h3>
            <p className="price">Free</p>
            <p className="price-period">forever</p>
            <div className="features-list">
              <div className="feature">✅ Appear on discovery map</div>
              <div className="feature">✅ View demand pins</div>
              <div className="feature">✅ Access truck dashboard</div>
              <div className="feature">✅ Manual location updates</div>
              <div className="feature">✅ Menu photo uploads</div>
              <div className="feature">❌ Real-time GPS tracking</div>
              <div className="feature">❌ Citywide heat maps</div>
              <div className="feature">❌ Advanced analytics</div>
              <div className="feature">❌ Promotional drops</div>
            </div>
            <button 
              className="subscribe-btn"
              onClick={() => handleSubscribe('basic', 'owner')}
            >
              Start Free
            </button>
          </div>

          {/* Pro Plan - $9.99 */}
          <div className="pricing-plan popular">
            <div className="popular-badge">⭐ Most Popular</div>
            <h3>PRO</h3>
            <p className="price">$9</p>
            <p className="price-period">per month</p>
            <div className="features-list">
              <div className="feature">✅ Everything in Starter</div>
              <div className="feature">✅ Real-time GPS tracking</div>
              <div className="feature">✅ Real-time menu display</div>
              <div className="feature">✅ Citywide heat maps</div>
              <div className="feature">✅ Basic engagement metrics</div>
              <div className="feature">❌ Advanced analytics</div>
              <div className="feature">❌ Promotional drops</div>
            </div>
            <button
              className="subscribe-btn"
              onClick={() => handleSubscribe('pro', 'owner')}
            >
              Start Free 30-Day Trial
            </button>
          </div>

          {/* All Access Plan - $19.99 */}
          <div className="pricing-plan">
            <h3>ALL ACCESS</h3>
            <p className="price">$19</p>
            <p className="price-period">per month</p>
            <div className="features-list">
              <div className="feature">✅ Everything in Starter & Pro</div>
              <div className="feature">✅ Advanced analytics dashboard</div>
              <div className="feature">✅ Create promotional drops</div>
              <div className="feature">✅ Featured placement</div>
              <div className="feature">✅ Priority support</div>
              <div className="feature">✅ Custom branding</div>
              <div className="feature">✅ Export data</div>
            </div>
            <button
              className="subscribe-btn"
              onClick={() => handleSubscribe('all-access', 'owner')}
            >
              Start Free 30-Day Trial
            </button>
          </div>
        </div>
      </section>

      {/* Event Organizers Section */}
      <section className="pricing-section event-organizer-section">
        <h2>🎪 Event Organizers</h2>
        <h3>Create memorable events and connect with quality vendors.</h3>
        <p className="trial-offer">*30-day money-back guarantee on all plans*</p>
        <div className="pricing-container">
          
          {/* Event Starter Plan - Free */}
          <div className="pricing-plan">
            <h3>EVENT STARTER</h3>
            <p className="price">Free</p>
            <p className="price-period">forever</p>
            <div className="features-list">
              <div className="feature">✅ Up to 3 events per month</div>
              <div className="feature">✅ Basic event page with details</div>
              <div className="feature">✅ Vendor application management</div>
              <div className="feature">✅ Map location marker</div>
              <div className="feature">✅ Email notifications</div>
              <div className="feature">✅ Basic analytics</div>
            </div>
            <button
              className="subscribe-btn"
              onClick={() => handleSubscribe('event-basic', 'event-organizer')}
            >
              Start Free
            </button>
          </div>

          {/* Event Premium Plan */}
          <div className="pricing-plan popular">
            <div className="popular-badge">⭐ Most Popular</div>
            <h3>EVENT PREMIUM</h3>
            <p className="price">$29.00</p>
            <p className="price-period">per month</p>
            <div className="features-list">
              <div className="feature">✅ Unlimited events</div>
              <div className="feature">✅ Enhanced event pages with photos</div>
              <div className="feature">✅ Priority map placement</div>
              <div className="feature">✅ Advanced vendor matching</div>
              <div className="feature">✅ SMS and email notifications</div>
              <div className="feature">✅ Detailed analytics dashboard</div>
              <div className="feature">✅ Custom branding options</div>
              <div className="feature">✅ Social media integration</div>
              <div className="feature">✅ Featured map placement</div>
              <div className="feature">✅ Custom event marketing tools</div>
              <div className="feature">✅ White-label event pages</div>
              <div className="feature">✅ API access for integrations</div>
              <div className="feature">✅ Dedicated account manager</div>
              <div className="feature">✅ Custom reporting</div>
              <div className="feature">✅ Multi-user team access</div>
              <div className="feature">✅ Priority vendor recommendations</div>
            </div>
            <button
              className="subscribe-btn"
              onClick={() => handleSubscribe('event-premium', 'event-organizer')}
            >
              Choose Premium
            </button>
          </div>
        </div>
      </section>

      {/* Payment Integration */}
      <section className="payment-section">
        <h2>Secure Payments with Stripe</h2>
        <p>We use Stripe to process payments securely and efficiently.</p>
        <img
          src="https://stripe.com/img/v3/home/twitter.png"
          alt="Stripe Payments"
          style={{ height: "40px", marginTop: "10px" }}
        />
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <h2>What Our Users Say</h2>
        <div className="testimonial-grid">
          <div className="testimonial">
            <p>"Since joining the All Access plan, my food truck has doubled its sales. The heat maps and analytics are game changers!"</p>
            <h4>🚚 Mike's Tacos</h4>
            <span className="user-type">Food Truck Owner</span>
          </div>
          <div className="testimonial">
            <p>"Being featured on the map has helped me reach more customers every day. Worth every penny!"</p>
            <h4>🍔 Patty's Burgers</h4>
            <span className="user-type">Food Truck Owner</span>
          </div>
          <div className="testimonial">
            <p>"Event Pro has transformed how we manage our farmers market. Vendor applications are so much easier now!"</p>
            <h4>🎪 Downtown Events</h4>
            <span className="user-type">Event Organizer</span>
          </div>
          <div className="testimonial">
            <p>"The vendor matching feature helped us find the perfect food trucks for our festival. Highly recommended!"</p>
            <h4>🎊 Summer Festival Co.</h4>
            <span className="user-type">Event Organizer</span>
          </div>
        </div>
      </section>

      <a
        href="#"
        onClick={e => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        style={{
          display: "inline-block",
          margin: "30px auto 0 auto",
          color: "#2c6f57",
          textDecoration: "underline",
          cursor: "pointer",
          fontWeight: "bold"
        }}
      >
        Back to Top ↑
      </a>

    </div>
  );
};

export default Pricing;