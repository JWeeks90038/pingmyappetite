import { Link } from 'react-router-dom';
import '../assets/styles.css';
import PaymentForm from './PaymentForm';

const Checkout = () => {
  return (
    <>
      <section className="checkout-container">
        <h1>Secure Checkout</h1>
        <p>Subscribe to the All-Access Plan for $19.99/month.</p>

        {/* All-Access Plan Features */}
        <div className="all-access-features" style={{ margin: "24px 0" }}>
          <h3>All-Access Plan Includes:</h3>
          <div style={{ textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
            <div>✅ Real-time location tracking for your food truck</div>
            <div>✅ Unlimited drop notifications to customers</div>
            <div>✅ Access to advanced analytics and customer insights</div>
            <div>✅ Social media integration and promotion tools</div>
            <div>✅ Priority support</div>
            <div>...and more exclusive features!</div>
          </div>
        </div>

        <h2>Payment Details</h2>
        <div id="payment-form">
          <PaymentForm amount={1999} />
        </div>

        <p className="secure-info">🔒 Secure Payment via Stripe</p>
      </section>
    </>
  );
};

export default Checkout;