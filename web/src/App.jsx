import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import React from 'react';

import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import OwnerLayout from './layouts/OwnerLayout';

import Navbar from './components/navbar';
import { useAuth } from './components/AuthContext';
import UpgradeNudgeManager from './components/UpgradeNudges';
import { notificationService } from './utils/notificationService';

// Import mobile fixes CSS
import './assets/mobile-fixes.css';

import Login from './components/login';
import Dashboard from './components/dashboard';
import CustomerDashboard from './components/CustomerDashboard';
import EventDashboard from './components/EventDashboard';
import Home from './components/home';
import ForgotPassword from './components/ForgotPassword';
import Pricing from './components/pricing';
import Success from './components/Success';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import RefundPolicy from './components/RefundPolicy';
import Settings from './components/settings';
import Signup from './components/signup';
import SignupCustomer from './components/SignupCustomer';
import SMSConsent from './components/SMSConsent';
import SMSTest from './components/SMSTest';
import Logout from './components/logout';
import Analytics from './components/analytics';
import UpgradeAnalyticsDashboard from './components/UpgradeAnalyticsDashboard';
import Messages from './components/messages';
import PingRequests from './components/PingRequests';
import FAQ from './components/FAQ';
import NotificationPreferences from './components/NotificationPreferences';
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
import TruckOnboarding from "./components/TruckOnboarding";
import MenuManagement from "./components/MenuManagement";
import CustomerOrderTracking from "./components/CustomerOrderTracking";
import OrderSuccess from "./components/OrderSuccess";
import OrderCancelled from "./components/OrderCancelled";
import MarketplaceTest from "./components/MarketplaceTest";
import { clearAppCache, checkAppVersion } from "./utils/cacheUtils";

// Define outside of component
const LIBRARIES = ['places', 'visualization'];

// App version for cache busting
const APP_VERSION = '1.0.8';

// Initialize Stripe with environment variable
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log('Stripe key loaded:', stripeKey ? `${stripeKey.substring(0, 7)}...` : 'NOT FOUND');

const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
console.log('🗺️ Google Maps API key loaded:', googleMapsKey ? `${googleMapsKey.substring(0, 7)}...` : 'NOT FOUND');

// Conditionally create Stripe promise
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// Safely pass Google Maps API key (with fallback)
const safeGoogleMapsKey = googleMapsKey || 'test-key';

// Add network connectivity check function
const checkNetworkConnectivity = () => {
  if (!navigator.onLine) {

    return false;
  }
  return true;
};

function ProtectedDashboardRoute({ children }) {
  const { user, userPlan, userSubscriptionStatus, loading } = useAuth();

  console.log('🚀 LATEST CODE: ProtectedDashboardRoute - Version 8b0c6718');
  console.log('🔍 ProtectedDashboardRoute DEBUG:', {
    user: !!user,
    userPlan,
    userSubscriptionStatus,
    loading,
    userSubscriptionStatusType: typeof userSubscriptionStatus
  });

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  // CRITICAL FIX: For paid plans, wait for subscription status to load
  // BUT allow admin overrides (null status) to pass through
  const isPaidPlan = userPlan === "pro" || userPlan === "all-access";
  
  // Only consider it "loading" if we're still in the initial loading state
  // Don't block if userSubscriptionStatus is explicitly null (admin override)
  const subscriptionStatusLoading = isPaidPlan && userSubscriptionStatus === undefined && loading;
  
  console.log('🔍 Subscription loading check:', {
    isPaidPlan,
    subscriptionStatusLoading,
    userSubscriptionStatus,
    userSubscriptionStatusIsNull: userSubscriptionStatus === null,
    userSubscriptionStatusIsUndefined: userSubscriptionStatus === undefined
  });
  
  if (subscriptionStatusLoading) {
    console.log('⏳ Waiting for subscription status to load...');
    return <div>Loading subscription status...</div>;
  }

  // SECURITY: Only allow access if user has valid plan and subscription status
  const hasValidAccess = 
    userPlan === "basic" || 
    (userPlan === "pro" && (
      userSubscriptionStatus === "active" || 
      userSubscriptionStatus === "trialing" ||
      userSubscriptionStatus === "admin-override" ||
      userSubscriptionStatus === null
    )) ||
    (userPlan === "all-access" && (
      userSubscriptionStatus === "active" || 
      userSubscriptionStatus === "trialing" ||
      userSubscriptionStatus === "admin-override" ||
      userSubscriptionStatus === null
    ));

  console.log('🔍 Access validation:', {
    hasValidAccess,
    userPlan,
    userSubscriptionStatus,
    isBasic: userPlan === "basic",
    isPro: userPlan === "pro",
    isAllAccess: userPlan === "all-access",
    statusIsActive: userSubscriptionStatus === "active",
    statusIsTrialing: userSubscriptionStatus === "trialing",
    statusIsAdminOverride: userSubscriptionStatus === "admin-override",
    statusIsNull: userSubscriptionStatus === null
  });

  if (!hasValidAccess) {

    return <Navigate to="/signup" />;
  }


  return children;
}

function App() {
  const { user, userRole, loading } = useAuth();
  
  // Debug logging with timestamp to track re-renders
  const renderTime = new Date().toISOString();
  console.log(`🏁 App component render at ${renderTime}:`, { loading, user: user?.email, userRole });
  console.log('🗺️ Current URL:', window.location.href);

  // Check Firebase readiness
  useEffect(() => {
    import('./firebase').then(({ auth, db }) => {
      if (!auth || !db) {
 
      } else {

      }
    }).catch(error => {
    
    });
  }, []);

  // Setup event listeners and cache management
  useEffect(() => {
    // Setup network event listeners
    const handleOnline = () => {
    
    };

    const handleOffline = () => {
  
    };

    // Setup global error handler
    const handleUnhandledRejection = (event) => {
  
      
      // Handle Firebase permission-denied errors gracefully
      if (event.reason && event.reason.code === 'permission-denied') {
   
        event.preventDefault();
        return;
      }
      
      // Handle generic Firebase permission errors
      if (event.reason && typeof event.reason === 'string' && 
          event.reason.includes('Missing or insufficient permissions')) {
      
        event.preventDefault();
        return;
      }
      
      // Handle FirebaseError objects with permission denied
      if (event.reason && event.reason.constructor && 
          event.reason.constructor.name === 'FirebaseError' &&
          event.reason.message && event.reason.message.includes('Missing or insufficient permissions')) {
     
        event.preventDefault();
        return;
      }
      
      // Handle snapshot listener permission errors specifically
      if (event.reason && event.reason.toString && 
          event.reason.toString().includes('Missing or insufficient permissions')) {
     
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
  
        event.preventDefault();
        return;
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Development cache clearing (only once per session)
    if (import.meta.env.MODE === 'development' && !window.__cacheCleared) {
 
      window.__cacheCleared = true;
    }

    // Cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Initialize notification service when user is authenticated
  useEffect(() => {
    if (user && userRole === 'customer') {
  
      
      setTimeout(() => {
        notificationService.setupMessageListener((payload) => {
          console.log('🔔 Received foreground notification:', payload);
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(payload.notification?.title || 'Grubana', {
              body: payload.notification?.body || 'New notification',
              icon: '/grubana-logo.png',
              badge: '/grubana-logo.png',
              tag: payload.data?.type || 'general',
              data: payload.data
            });
          }
        });
      }, 1000);
    }
  }, [user, userRole]);

  // Cache busting mechanism for mobile browsers (disabled in development)
  useEffect(() => {
    const checkVersion = () => {
      const storedVersion = localStorage.getItem('app_version');
      const reloadFlag = sessionStorage.getItem('version_reload_done');
      
      if (storedVersion !== APP_VERSION && !reloadFlag) {
        console.log(`🔄 App version updated from ${storedVersion} to ${APP_VERSION} - clearing cache`);
        
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              console.log(`🗑️ Clearing cache: ${cacheName}`);
              caches.delete(cacheName);
            });
          });
        }
        
        localStorage.setItem('app_version', APP_VERSION);
        
        // Only reload on mobile and NOT in development mode
        if (storedVersion && 
            import.meta.env.MODE !== 'development' &&
            /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          console.log('📱 Mobile detected - scheduling reload for cache refresh');
          sessionStorage.setItem('version_reload_done', 'true');
          setTimeout(() => {
            window.location.reload(true);
          }, 100);
        } else {
          localStorage.setItem('app_version', APP_VERSION);
          console.log('🚫 Skipping reload in development mode');
        }
      }
    };

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

    return (
      <ErrorBoundary>
      <MobileGoogleMapsWrapper googleMapsApiKey={safeGoogleMapsKey}>
        <BrowserRouter>
          <NetworkStatus />
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '16px 20px',
            textAlign: 'center',
            color: 'white',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            overflow: 'hidden',
            position: 'relative',
            borderBottom: '3px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{
                fontSize: '24px',
                animation: 'mobileAppBounce 2s infinite'
              }}>
                📱
              </div>
              <span style={{
                fontSize: '18px',
                fontWeight: 'bold',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                letterSpacing: '0.5px',
                background: 'linear-gradient(45deg, #fff, #f0f8ff)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Mobile App Launching Very Soon!!
              </span>
              <div style={{
                fontSize: '20px',
                animation: 'mobileAppPulse 1.5s infinite'
              }}>
                🚀
              </div>
            </div>
            <div style={{
              position: 'absolute',
              top: '0',
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              animation: 'mobileAppShimmer 3s infinite'
            }}></div>
          </div>
          <Navbar />
          <ScrollToTop />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={user ? <Navigate to={userRole === 'customer' ? "/customer-dashboard" : "/dashboard"} /> : <Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/home" element={<Home />} />
              <Route path="/forgotpassword" element={<ForgotPassword />} />
              <Route path="/about" element={<About />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/privacypolicy" element={<PrivacyPolicy />} />
              <Route path="/termsofservice" element={<TermsOfService />} />
              <Route path="/refundpolicy" element={<RefundPolicy />} />
              <Route path="/sms-consent" element={<SMSConsent />} />
              <Route path="/sms-test" element={<SMSTest />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/signup-customer" element={<SignupCustomer />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/success" element={<Success />} />
              <Route path="/truck-onboarding" element={<TruckOnboarding />} />
              <Route path="/menu-management" element={
                userRole === 'owner' ? <MenuManagement /> : <Navigate to="/login" />
              } />
              <Route path="/my-orders" element={<CustomerOrderTracking />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/order-cancelled" element={<OrderCancelled />} />
              <Route path="/marketplace-test" element={<MarketplaceTest />} />
            </Route>

            <Route element={<CustomerLayout />}>
              <Route path="/customer-dashboard" element={userRole === 'customer' ? <CustomerDashboard /> : <Navigate to="/login" />} />
              <Route path="/messages" element={userRole === 'customer' ? <Messages /> : <Navigate to="/login" />} />
              <Route path="/ping-requests" element={userRole === 'customer' ? <PingRequests /> : <Navigate to="/login" />} />
              <Route path="/settings" element={userRole === 'customer' ? <Settings /> : <Navigate to="/login" />} />
              <Route path="/notifications" element={userRole === 'customer' ? <NotificationPreferences /> : <Navigate to="/login" />} />
            </Route>

            <Route element={<OwnerLayout />}>
              <Route path="/dashboard" element={userRole === 'owner' ? <ProtectedDashboardRoute><Dashboard /></ProtectedDashboardRoute> : <Navigate to="/login" />} />
              <Route path="/analytics" element={userRole === 'owner' ? <Analytics /> : <Navigate to="/login" />} />
              <Route path="/upgrade-analytics" element={<UpgradeAnalyticsDashboard />} />
            </Route>

            <Route element={<PublicLayout />}>
              <Route path="/event-dashboard" element={<EventDashboard />} />
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
        googleMapsApiKey={safeGoogleMapsKey}
        libraries={LIBRARIES}
        onLoad={() => ('')}
        onError={(error) => ('')}
        loadingElement={<div>Loading Maps...</div>}
      >
        <BrowserRouter>
          <NetworkStatus />
          <Navbar />
          <ScrollToTop />
          <UpgradeNudgeManager />
        <Routes>
          {/* Public Pages */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={user ? (userRole === 'customer' ? <Navigate to="/customer-dashboard" /> : userRole === 'owner' ? <Navigate to="/dashboard" /> : <div>Loading...</div>) : <Login />} />
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
            <Route path="/success" element={<Success />} />
            <Route path="/truck-onboarding" element={<TruckOnboarding />} />
            <Route path="/menu-management" element={userRole === 'owner' ? <MenuManagement /> : <Navigate to="/login" />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/order-cancelled" element={<OrderCancelled />} />
            <Route path="/marketplace-test" element={<MarketplaceTest />} />
          </Route>

          {/* Customer Pages */}
          <Route element={<CustomerLayout />}>
            <Route path="/customer-dashboard" element={userRole === 'customer' ? <CustomerDashboard /> : <Navigate to="/login" />} />
            <Route path="/my-orders" element={userRole === 'customer' ? <CustomerOrderTracking /> : <Navigate to="/login" />} />
            <Route path="/messages" element={userRole === 'customer' ? <Messages /> : <Navigate to="/login" />} />
            <Route path="/ping-requests" element={userRole === 'customer' ? <PingRequests /> : <Navigate to="/login" />} />
            <Route path="/notifications" element={userRole === 'customer' ? <NotificationPreferences /> : <Navigate to="/login" />} />
            <Route path="/settings" element={userRole === 'customer' ? <Settings /> : <Navigate to="/login" />} />
          </Route>

          {/* Owner Pages */}
          <Route element={<OwnerLayout />}>
            <Route path="/dashboard" element={userRole === 'owner' ? <ProtectedDashboardRoute><Dashboard /></ProtectedDashboardRoute> : <Navigate to="/login" />} />
            <Route path="/analytics" element={userRole === 'owner' ? <Analytics /> : <Navigate to="/login" />} />
          </Route>

          {/* Event Organizer Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/event-dashboard" element={<EventDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MobileGoogleMapsWrapper>
    </Elements>
    </ErrorBoundary>
  );
}

export default App;
