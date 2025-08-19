import { Link, useLocation } from 'react-router-dom';
import '../assets/styles.css';
import PaymentForm from './PaymentForm';

const Checkout = () => {
  const location = useLocation();
  const selectedPlan = location.state?.selectedPlan || 'all-access';

  const planDetails = {
    pro: {
      name: 'Pro Plan',
      price: '$9.99/month',
      amount: 999,
      features: [
        '✅ Everything in Basic',
        '✅ Real-time GPS location tracking',
        '✅ Access to citywide heat maps showing demand zones'
      ]
    },
    'all-access': {
      name: 'All Access Plan',
      price: '$19.99/month',
      amount: 1999,
      features: [
        '✅ Everything in Basic & Pro',
        '✅ Advanced analytics dashboard',
        '✅ Create promotional drops and deals'
      ]
    }
  };

  const currentPlan = planDetails[selectedPlan];

  return (
    <>
      <section className="checkout-container">
        <h1>Secure Checkout</h1>
        <p>Subscribe to the {currentPlan.name} for {currentPlan.price}.</p>
        <p><strong>30-day free trial included!</strong></p>

        {/* Selected Plan Features */}
        <div className="selected-plan-features" style={{ margin: "24px 0" }}>
          <h3>{currentPlan.name} Includes:</h3>
          <div style={{ textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
            {currentPlan.features.map((feature, index) => (
              <div key={index} style={{ margin: "8px 0" }}>{feature}</div>
            ))}
          </div>
        </div>

        <h2>Payment Details</h2>
        <div id="payment-form">
          <PaymentForm planType={selectedPlan} />
        </div>

        <p className="secure-info">🔒 Secure Payment via Stripe</p>
        <p className="trial-info">💡 Your 30-day free trial starts immediately. You won't be charged until the trial ends.</p>
      </section>
    </>
  );
};

export default Checkout;