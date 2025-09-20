import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
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

// Immediate loading for lightweight components
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import RefundPolicy from './components/RefundPolicy';
import Login from './components/login';
import Signup from './components/signup';
import SignupCustomer from './components/SignupCustomer';
import ForgotPassword from './components/ForgotPassword';
import Success from './components/Success';
import Settings from './components/settings';
import SMSConsent from './components/SMSConsent';
import SMSTest from './components/SMSTest';
import Logout from './components/logout';
import FAQ from './components/FAQ';
import NotificationPreferences from './components/NotificationPreferences';

// Lazy loading for heavy components
const Home = React.lazy(() => import('./components/home'));
const Dashboard = React.lazy(() => import('./components/dashboard'));
const CustomerDashboard = React.lazy(() => import('./components/CustomerDashboard'));
const EventDashboard = React.lazy(() => import('./components/EventDashboard'));
const Analytics = React.lazy(() => import('./components/analytics'));
const UpgradeAnalyticsDashboard = React.lazy(() => import('./components/UpgradeAnalyticsDashboard'));
const Messages = React.lazy(() => import('./components/messages'));
const PingRequests = React.lazy(() => import('./components/PingRequests'));

// Suspense wrapper for lazy components
const SuspenseWrapper = ({ children }) => (
  <React.Suspense fallback={<div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '200px', 
    color: '#4DBFFF' 
  }}>Loading...</div>}>
    {children}
  </React.Suspense>
);
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

// Load API keys but don't log them for performance
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Safely pass Google Maps API key (with fallback)
const safeGoogleMapsKey = googleMapsKey || 'test-key';

// Create Stripe promise lazily
let stripePromise = null;
const getStripePromise = () => {
  if (!stripePromise && stripeKey) {
    stripePromise = loadStripe(stripeKey);
  }
  return stripePromise;
};

// Routes that need Google Maps
const ROUTES_NEEDING_MAPS = [
  '/',
  '/home',
  '/dashboard',
  '/customer-dashboard',
  '/event-dashboard'
];

// Check if current route needs maps
const routeNeedsMaps = (pathname) => {
  return ROUTES_NEEDING_MAPS.some(route => {
    if (route === '/') return pathname === '/';
    return pathname.startsWith(route);
  });
};

// Add network connectivity check function
const checkNetworkConnectivity = () => {
  if (!navigator.onLine) {

    return false;
  }
  return true;
};

function ProtectedDashboardRoute({ children }) {
  const { user, userPlan, userSubscriptionStatus, loading } = useAuth();

  // Don't log in production for performance
  if (import.meta.env.MODE === 'development') {
    console.log('🔍 ProtectedDashboardRoute DEBUG:', {
      user: !!user,
      userPlan,
      userSubscriptionStatus,
      loading,
      userSubscriptionStatusType: typeof userSubscriptionStatus
    });
  }

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // CRITICAL FIX: For paid plans, wait for subscription status to load
  // BUT allow admin overrides (null status) to pass through
  const isPaidPlan = userPlan === "pro" || userPlan === "all-access" || userPlan === "event-premium";
  
  // Only consider it "loading" if we're still in the initial loading state
  // Don't block if userSubscriptionStatus is explicitly null (admin override)
  const subscriptionStatusLoading = isPaidPlan && userSubscriptionStatus === undefined && loading;
  
  if (subscriptionStatusLoading) {
    return <div>Loading subscription status...</div>;
  }

  // SECURITY: Only allow access if user has valid plan and subscription status
  // TEMP FIX: Always allow basic access to prevent infinite redirects
  const hasValidAccess = 
    userPlan === "basic" || 
    !userPlan || // Allow access if plan is not yet loaded
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
    )) ||
    (userPlan === "event-premium" && (
      userSubscriptionStatus === "active" || 
      userSubscriptionStatus === "trialing" ||
      userSubscriptionStatus === "admin-override" ||
      userSubscriptionStatus === null
    ));

  if (import.meta.env.MODE === 'development') {
    console.log('🔍 Access validation:', {
      hasValidAccess,
      userPlan,
      userSubscriptionStatus
    });
  }

  if (!hasValidAccess) {
    return <Navigate to="/contact" replace />;
  }

  return children;
}

function App() {
  const { user, userRole, loading } = useAuth();
  
  // Debug logging with timestamp to track re-renders
  const renderTime = new Date().toISOString();
  // Performance: Removed debug logs for faster rendering

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
              icon: '/grubana-logo-vector.png',
              badge: '/grubana-logo-vector.png',
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

  return (
    <ErrorBoundary>
      <Elements stripe={getStripePromise()}>
      <MobileGoogleMapsWrapper 
        googleMapsApiKey={safeGoogleMapsKey}
        libraries={LIBRARIES}
        onLoad={() => console.log('Google Maps loaded successfully')}
        onError={(error) => console.error('Maps loading error:', error)}
        loadingElement={<div></div>}
      >
        <BrowserRouter future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}>
          <NetworkStatus />
          <Navbar />
          <ScrollToTop />
          <UpgradeNudgeManager />
        <Routes>
          {/* Public Pages */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<SuspenseWrapper><Home /></SuspenseWrapper>} />
            <Route path="/login" element={user ? (userRole === 'customer' ? <Navigate to="/customer-dashboard" replace /> : userRole === 'owner' ? <Navigate to="/dashboard" replace /> : userRole === 'event-organizer' ? <Navigate to="/event-dashboard" replace /> : <div>Loading...</div>) : <Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/home" element={<SuspenseWrapper><Home /></SuspenseWrapper>} />
            <Route path="/forgotpassword" element={<ForgotPassword />} />
            <Route path="/about" element={<About />} />
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
            <Route path="/menu-management" element={userRole === 'owner' ? <MenuManagement /> : <Navigate to="/login" replace />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/order-cancelled" element={<OrderCancelled />} />
            <Route path="/marketplace-test" element={<MarketplaceTest />} />
          </Route>

          {/* Customer Pages */}
          <Route element={<CustomerLayout />}>
            <Route path="/customer-dashboard" element={userRole === 'customer' ? <SuspenseWrapper><CustomerDashboard /></SuspenseWrapper> : <Navigate to="/login" replace />} />
            <Route path="/my-orders" element={userRole === 'customer' ? <CustomerOrderTracking /> : <Navigate to="/login" replace />} />
            <Route path="/messages" element={userRole === 'customer' ? <SuspenseWrapper><Messages /></SuspenseWrapper> : <Navigate to="/login" replace />} />
            <Route path="/ping-requests" element={userRole === 'customer' ? <SuspenseWrapper><PingRequests /></SuspenseWrapper> : <Navigate to="/login" replace />} />
            <Route path="/notifications" element={userRole === 'customer' ? <NotificationPreferences /> : <Navigate to="/login" replace />} />
          </Route>

          {/* Owner Pages */}
          <Route element={<OwnerLayout />}>
            <Route path="/dashboard" element={userRole === 'owner' ? <ProtectedDashboardRoute><SuspenseWrapper><Dashboard /></SuspenseWrapper></ProtectedDashboardRoute> : <Navigate to="/login" replace />} />
            <Route path="/analytics" element={userRole === 'owner' ? <SuspenseWrapper><Analytics /></SuspenseWrapper> : <Navigate to="/login" replace />} />
            <Route path="/upgrade-analytics" element={<SuspenseWrapper><UpgradeAnalyticsDashboard /></SuspenseWrapper>} />
          </Route>

          {/* Event Organizer Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/event-dashboard" element={userRole === 'event-organizer' ? <SuspenseWrapper><EventDashboard /></SuspenseWrapper> : <Navigate to="/login" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MobileGoogleMapsWrapper>
    </Elements>
    </ErrorBoundary>
  );
}

export default App;
