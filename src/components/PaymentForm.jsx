import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

const priceId = "price_1RShnKRq7ehrln63Ej7fYWz6"; // <-- Replace with real Price ID

const PaymentForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

    const handlePaymentSuccess = async () => {
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        subscriptionStatus: "active"
      });
      navigate("/dashboard");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Create payment method
    const cardElement = elements.getElement(CardElement);
    const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
      billing_details: { email },
    });
    if (pmError) {
      setMessage(pmError.message);
      setLoading(false);
      return;
    }

    // 2. Call backend to create subscription
  const res = await fetch('/create-subscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    paymentMethodId: paymentMethod.id,
    priceId,
    uid: auth.currentUser.uid
  }),
});

const data = await res.json();
    if (data.error) {
      setMessage(data.error.message);
      setLoading(false);
      return;
    }

    if (data.error) {
      setMessage(data.error.message);
      setLoading(false);
      return;
    }

if (!data.clientSecret) {
  setMessage("Subscription created!");
  setLoading(false);
  await handlePaymentSuccess();
  return;
}

// Confirm payment if clientSecret exists
const confirmResult = await stripe.confirmCardPayment(data.clientSecret);
if (confirmResult.error) {
  setMessage(confirmResult.error.message);
} else if (confirmResult.paymentIntent.status === "succeeded") {
  setMessage("Subscription successful!");
  await handlePaymentSuccess();
}
setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <CardElement />
      <button type="submit" disabled={!stripe || loading}>
        {loading ? "Processing..." : "Subscribe $19.99/month"}
      </button>
      {message && <div>{message}</div>}
    </form>
  );
};

export default PaymentForm;