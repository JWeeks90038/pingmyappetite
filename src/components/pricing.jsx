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
     <section className="pricing-section">
  <h1>Food Truck & Trailer Owners</h1>
  <h2>Gain visibility, track demand, and connect with hungry customers.</h2>
  <h3>*Try it free for 30 days*</h3>
  <p>More eyes = more orders!</p>
  <div className="pricing-container">
    <div className="pricing-plan">
      <h2>BASIC</h2>
      <p className="price">Free</p>
    <div>
      <div>✅ Appear on the Grubana discovery map</div>
      <div>✅ Get pinged by nearby customers</div>
      <div>✅ Access your truck dashboard</div>
      <div>✅ Manual location updates</div>
      <div>❌ Real-time menu display on map icon</div>
      <div>❌ Access to citywide heat maps showing demand zones</div>
      <div>❌ 30-day engagement analytics (pings, views, locations)</div>
      <div>❌ Radius-based trend alerts (e.g. “interest within 10km”)</div>
      <div>❌ Priority placement on trending truck lists</div>
      <div>❌ Scheduled location publishing (pre-set your route)</div>
      <div>❌ Unlock exclusive promotional features (menu drops, featured placement)</div>
    </div>
    <button className="subscribe-btn disabled" disabled>Included</button>
  </div>
  <div className="pricing-plan">
    <h2>ALL ACCESS</h2>
    <p className="price">$19.99 / month</p>
    <div>
      <div>✅ Real-time menu display on map icon</div>
      <div>✅ Access to citywide heat maps showing demand zones</div>
      <div>✅ 30-day engagement analytics (pings, views, locations)</div>
      <div>✅ Radius-based trend alerts (e.g. “interest within 10km”)</div>
      <div>✅ Priority placement on trending truck lists</div>
      <div>✅ Scheduled location publishing (pre-set your route)</div>
      <div>✅ Unlock exclusive promotional features (menu drops, featured placement)</div>
      <div>✅ Appear on the Grubana discovery map</div>
      <div>✅ Get pinged by nearby customers</div>
      <div>✅ Access your truck dashboard</div>
      <div>✅ Manual location updates</div>
    </div>
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

      <a
  href="#top"
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