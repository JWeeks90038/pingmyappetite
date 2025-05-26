import { Link } from 'react-router-dom';
import '../assets/styles.css';
import PaymentForm from './PaymentForm';

const Checkout = () => {
  return (
    <>
      <nav>
        <Link to="/home">Home</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/contact">Contact</Link>
      </nav>

      <section className="checkout-container">
        <h1>Secure Checkout</h1>
        <p>Subscribe to the All-Access Plan for $19.99/month.</p>

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
