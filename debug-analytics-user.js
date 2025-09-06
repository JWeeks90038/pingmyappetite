// Debug script to check user role and favorites analytics
// Run this in the mobile app console or add temporarily to AnalyticsScreenFresh.js

import { useAuth } from '../components/AuthContext';

export const debugUserAnalytics = () => {
  const { user, userData, userRole } = useAuth();
  
  console.log('🔍 DEBUG: User Analytics Data');
  console.log('==========================================');
  console.log('📧 user.uid:', user?.uid);
  console.log('👤 userData:', userData);
  console.log('🎭 userRole:', userRole);
  console.log('🏷️ userData.role:', userData?.role);
  console.log('🍰 userData.kitchenType:', userData?.kitchenType);
  console.log('==========================================');
  
  // Check if analytics should show
  const shouldShowAnalytics = user && userData && (userRole === 'owner' || userRole === 'event-organizer');
  console.log('✅ Should show analytics:', shouldShowAnalytics);
  
  // Check role variations
  if (userData) {
    console.log('🔍 Checking role variations:');
    console.log('  userData.role === "owner":', userData.role === 'owner');
    console.log('  userData.role === "truck_owner":', userData.role === 'truck_owner');
    console.log('  userData.kitchenType exists:', !!userData.kitchenType);
    console.log('  userRole === "owner":', userRole === 'owner');
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
console.log('🔍 ANALYTICS DEBUG:', {
  hasUser: !!user,
  hasUserData: !!userData,
  userRole,
  userDataRole: userData?.role,
  userUid: user?.uid,
  userDataUid: userData?.uid,
  shouldShow: user && userData && (userRole === 'owner' || userRole === 'event-organizer')
});
*/
