import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';

import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import OwnerLayout from './layouts/OwnerLayout';

import Navbar from './components/navbar';
import { useAuth } from './components/AuthContext'; // <-- Import AuthContext

import Login from './components/login';
import Dashboard from './components/dashboard';
import CustomerDashboard from './components/CustomerDashboard';
import Home from './components/home';
import ForgotPassword from './components/ForgotPassword';
import Pricing from './components/pricing';
import Checkout from './components/checkout';
import Success from './components/Success';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import RefundPolicy from './components/RefundPolicy';
import Settings from './components/settings';
import Signup from './components/signup';
import SignupCustomer from './components/SignupCustomer';
import Logout from './components/logout';
import Analytics from './components/analytics';
import Messages from './components/messages';
import PingRequests from './components/PingRequests';
import FAQ from './components/FAQ'; 
import { getAuth } from 'firebase/auth';
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PaymentForm from "./components/PaymentForm";
import useSubscriptionStatus from "./hooks/useSubscriptionStatus";
import { auth } from "./firebase";
import ScrollToTop from "./components/ScrollToTop";
import Contact from "./components/contact";
import About from "./components/about";

// Define outside of component
const LIBRARIES = ['places', 'visualization'];
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function ProtectedDashboardRoute({ children }) {
  const { user, userPlan, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  // Allow both "all-access" and "basic" plans
  if (userPlan !== "all-access" && userPlan !== "basic") return <Navigate to="/checkout" />;

  return children;
}

function App() {
  const { user, userRole, loading } = useAuth();

  window.auth = getAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Elements stripe={stripePromise}>
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={LIBRARIES} 
    >
      <BrowserRouter>
        <Navbar /> {/* Always render Navbar */}
        <ScrollToTop /> {/* Scroll to top on route change */}
        <Routes>
          {/* Public Pages */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route
              path="/login"
              element={
                user ? (
                  userRole === 'customer' ? (
                    <Navigate to="/customer-dashboard" />
                  ) : userRole === 'owner' ? (
                    <Navigate to="/dashboard" />
                  ) : (
                    <div>Loading...</div>
                  )
                ) : (
                  <Login />
                )
              }
            />
            <Route path="/signup" element={<Signup />} />
            <Route path="/home" element={<Home />} />
            <Route path="/forgotpassword" element={<ForgotPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacypolicy" element={<PrivacyPolicy />} />
            <Route path="/termsofservice" element={<TermsOfService />} />
            <Route path="/refundpolicy" element={<RefundPolicy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/signup-customer" element={<SignupCustomer />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/success" element={<Success />} />
          </Route>

          {/* Customer Pages */}
          <Route element={<CustomerLayout />}>
            <Route
              path="/customer-dashboard"
              element={
                userRole === 'customer' ? (
                  <CustomerDashboard />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/messages"
              element={
                userRole === 'customer' ? <Messages /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/ping-requests"
              element={
                userRole === 'customer' ? <PingRequests /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/settings"
              element={
                userRole === 'customer' ? <Settings /> : <Navigate to="/login" />
              }
            />
          </Route>

          {/* Owner Pages */}
          <Route element={<OwnerLayout />}>
            <Route
  path="/dashboard"
  element={
    userRole === 'owner' ? (
      <ProtectedDashboardRoute>
        <Dashboard />
      </ProtectedDashboardRoute>
    ) : (
      <Navigate to="/login" />
    )
  }
/>
            <Route
              path="/analytics"
              element={
                userRole === 'owner' ? <Analytics /> : <Navigate to="/login" />
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </LoadScript>
    </Elements>
  );
}

export default App;
