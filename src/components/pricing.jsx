import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/footer';
import '../assets/styles.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const Pricing = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const handleSubscribe = () => {
    if (!user || userRole !== 'owner') {
      navigate('/signup');
    } else {
      navigate('/checkout');
    }
  };
  return (
    <div>

      {/* Pricing Section */}
      <section className="pricing">
        <h1>Food Truck & Trailer Owners</h1>
        <h2>Gain visibility, track demand, and connect with hungry customers.</h2>
        <h3>*Try it free for 30 days*</h3>
        <p>More eyes = more orders!</p>

        {/* Pricing Plans */}
        <div className="pricing-plan">

          {/* Basic Plan */}
          <div className="plan basic-plan">
            <h2>BASIC</h2>
            <p className="price">Free</p>
            <ul>
              <li>✅ Appear on the Grubana discovery map</li>
              <li>✅ Get pinged by nearby customers</li>
              <li>✅ Access your truck dashboard</li>
              <li>✅ Manual location updates</li>
            </ul>
            <button className="subscribe-btn disabled" disabled>Included</button>
          </div>

          {/* Pro Plan */}
          <div className="plan pro-plan">
            <h2>ALL ACCESS</h2>
            <p className="price">$19.99 / month</p>
            <ul>
              <li>✅ Real-time menu display on map icon</li>
              <li>✅ Access to citywide heat maps showing demand zones</li>
              <li>✅ 30-day engagement analytics (pings, views, locations)</li> {/* Analytics exclusive to All Access */}
              <li>✅ Radius-based trend alerts (e.g. “interest within 10km”)</li>
              <li>✅ Priority placement on trending truck lists</li>
              <li>✅ Scheduled location publishing (pre-set your route)</li>
              <li>✅ Unlock exclusive promotional features (menu drops, featured placement)</li>
            </ul>
            <button
    className="subscribe-btn"
    onClick={handleSubscribe}
  >
    Start Free 30-Day Trial
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
        <h2>What Our Food Trucks Say</h2>
        <div className="testimonial">
          <p>"Since joining the All Access plan, my food truck has doubled its sales. The heat maps, deal drops and analytics are game changers!"</p>
          <h4>🚚 Mike's Tacos</h4>
        </div>
        <div className="testimonial">
          <p>"Being featured on the map has helped me reach more customers every day. Worth every penny!"</p>
          <h4>🍔 Patty's Burgers</h4>
        </div>
      </section>

    </div>
  );
};

export default Pricing;