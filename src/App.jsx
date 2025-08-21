import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect } from 'react';

import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import OwnerLayout from './layouts/OwnerLayout';

import Navbar from './components/navbar';
import { useAuth } from './components/AuthContext'; // <-- Import AuthContext

// Import mobile fixes CSS
import './assets/mobile-fixes.css';

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
import NetworkStatus from "./components/NetworkStatus";
import ErrorBoundary from "./components/ErrorBoundary";
import MobileGoogleMapsWrapper from "./components/MobileGoogleMapsWrapper";
import { clearAppCache, checkAppVersion } from "./utils/cacheUtils";

// Define outside of component
const LIBRARIES = ['places', 'visualization'];

// App version for cache busting
const APP_VERSION = '1.0.8'; // Increment this when layout changes are made

// Initialize Stripe with environment variable
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log('Stripe key loaded:', stripeKey ? `${stripeKey.substring(0, 7)}...` : 'NOT FOUND');

const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
console.log('🗺️ Google Maps API key loaded:', googleMapsKey ? `${googleMapsKey.substring(0, 7)}...` : 'NOT FOUND');

// Robust Stripe initialization with validation and error handling
const stripePromise = stripeKey && stripeKey.length > 0 && stripeKey !== 'undefined' 
  ? loadStripe(stripeKey).catch((error) => {
      console.error('💳 Stripe loading failed:', error);
      // Return null on error to prevent app crash
      return null;
    })
  : Promise.resolve(null);

// Add network connectivity check
const checkNetworkConnectivity = () => {
  if (!navigator.onLine) {
    console.warn('🌐 Network: Device appears to be offline');
    return false;
  }
  return true;
};

// Listen for network changes
window.addEventListener('online', () => {
  console.log('🌐 Network: Connection restored');
});

window.addEventListener('offline', () => {
  console.warn('🌐 Network: Connection lost');
});

// Global error handler for unhandled promise rejections (especially Firebase permission errors)
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  
  // Handle Firebase permission-denied errors gracefully
  if (event.reason && event.reason.code === 'permission-denied') {
    console.log('🚨 Global handler: Firebase permission denied error caught during logout');
    // Prevent the error from bubbling up and showing to user
    event.preventDefault();
    return;
  }
  
  // Handle generic Firebase permission errors
  if (event.reason && typeof event.reason === 'string' && 
      event.reason.includes('Missing or insufficient permissions')) {
    console.log('🚨 Global handler: Firebase permission error caught during logout');
    // Prevent the error from bubbling up and showing to user
    event.preventDefault();
    return;
  }
  
  // Handle Firestore connectivity errors (400 Bad Request)
  if (event.reason && (
      event.reason.message?.includes('Failed to fetch') ||
      event.reason.message?.includes('400') ||
      event.reason.message?.includes('Bad Request') ||
      event.reason.code === 'unavailable'
    )) {
    console.log('🚨 Global handler: Firestore connectivity error caught:', event.reason.message);
    // Prevent the error from bubbling up and showing to user
    event.preventDefault();
    return;
  }
  
  // Let other errors bubble up normally
});

function ProtectedDashboardRoute({ children }) {
  const { user, userPlan, userSubscriptionStatus, loading } = useAuth();

  console.log('🚀 LATEST CODE: ProtectedDashboardRoute - Version e1da37bc');
  console.log('ProtectedDashboardRoute - userPlan:', userPlan, 'userSubscriptionStatus:', userSubscriptionStatus);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  // CRITICAL FIX: For paid plans, wait for subscription status to load
  // This prevents race condition where userSubscriptionStatus is still null
  const isPaidPlan = userPlan === "pro" || userPlan === "all-access";
  const subscriptionStatusLoading = isPaidPlan && userSubscriptionStatus === null;
  
  if (subscriptionStatusLoading) {
    return <div>Loading subscription status...</div>;
  }

  // SECURITY: Only allow access if user has valid plan and subscription status
  // Basic plan is always allowed
  // Pro/All Access require active or trialing subscription status
  const hasValidAccess = 
    userPlan === "basic" || 
    (userPlan === "pro" && (userSubscriptionStatus === "active" || userSubscriptionStatus === "trialing")) ||
    (userPlan === "all-access" && (userSubscriptionStatus === "active" || userSubscriptionStatus === "trialing"));

  if (!hasValidAccess) {
    console.log('🚨 BLOCKING ACCESS - Plan:', userPlan, 'Status:', userSubscriptionStatus);
    // Redirect to signup to upgrade plan instead of checkout page
    return <Navigate to="/signup" />;
  }

  console.log('✅ ALLOWING ACCESS - Plan:', userPlan, 'Status:', userSubscriptionStatus);
  return children;
}

function App() {
  const { user, userRole, loading } = useAuth();

  // Check Firebase readiness
  useEffect(() => {
    import('./firebase').then(({ auth, db }) => {
      if (!auth || !db) {
        console.error('🔥 Firebase services not properly initialized');
      } else {
        console.log('🔥 Firebase services ready');
      }
    }).catch(error => {
      console.error('🔥 Failed to import Firebase:', error);
    });
  }, []);

  // Cache busting mechanism for mobile browsers
  useEffect(() => {
    const checkVersion = () => {
      const storedVersion = localStorage.getItem('app_version');
      if (storedVersion !== APP_VERSION) {
        console.log(`🔄 App version updated from ${storedVersion} to ${APP_VERSION} - clearing cache`);
        
        // Clear various caches
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              console.log(`🗑️ Clearing cache: ${cacheName}`);
              caches.delete(cacheName);
            });
          });
        }
        
        // Update stored version
        localStorage.setItem('app_version', APP_VERSION);
        
        // Force a hard reload on mobile if this is a version change
        if (storedVersion && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          console.log('📱 Mobile detected - forcing hard reload for cache refresh');
          window.location.reload(true);
        }
      }
    };

    // Make cache utilities available globally for debugging  
    // (They're already on window in cacheUtils.js, but keeping this for consistency)
    window.clearAppCache = clearAppCache;
    window.checkAppVersion = checkAppVersion;
    
    checkVersion();
  }, []);

  window.auth = getAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }

  // Add Stripe validation before rendering Elements
  if (!stripePromise) {
    console.error('Stripe failed to initialize - check environment variables');
    // For now, render without Stripe to prevent app crash
    return (
      <ErrorBoundary>
      <MobileGoogleMapsWrapper googleMapsApiKey={googleMapsKey}>
        <BrowserRouter>
          <NetworkStatus />
          <div style={{padding: '20px', background: '#fff3cd', textAlign: 'center'}}>
            ⚠️ Payment system temporarily unavailable. Please try again later.
          </div>
          <Navbar />
          <ScrollToTop />
          <Routes>
            {/* All your existing routes */}
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
              <Route path="/checkout" element={<div>Payment system temporarily unavailable</div>} />
              <Route path="/success" element={<Success />} />
            </Route>

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
      </MobileGoogleMapsWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Elements stripe={stripePromise}>
      <MobileGoogleMapsWrapper
        googleMapsApiKey={googleMapsKey}
        libraries={LIBRARIES}
        onLoad={() => console.log('🗺️ Google Maps API loaded successfully (main)')}
        onError={(error) => console.error('🗺️ Google Maps API failed to load (main):', error)}
        loadingElement={<div>Loading Maps...</div>}
      >
        <BrowserRouter>
          <NetworkStatus />
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
    </MobileGoogleMapsWrapper>
    </Elements>
    </ErrorBoundary>
  );
}

export default App;
