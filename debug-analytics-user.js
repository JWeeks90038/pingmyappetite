// Debug script to check user role and favorites analytics
// Run this in the mobile app console or add temporarily to AnalyticsScreenFresh.js

import { useAuth } from '../components/AuthContext';

export const debugUserAnalytics = () => {
  const { user, userData, userRole } = useAuth();
  
  // Check if analytics should show
  const shouldShowAnalytics = user && userData && (userRole === 'owner' || userRole === 'event-organizer');
  
  // Check role variations
  if (userData) {
  }
  
  return {
    user,
    userData,
    userRole,
    shouldShowAnalytics
  };
};

// Alternative: Add this directly to AnalyticsScreenFresh.js at the top of the component:
/*

  hasUser: !!user,
  hasUserData: !!userData,
  userRole,
  userDataRole: userData?.role,
  userUid: user?.uid,
  userDataUid: userData?.uid,
  shouldShow: user && userData && (userRole === 'owner' || userRole === 'event-organizer')
});
*/
