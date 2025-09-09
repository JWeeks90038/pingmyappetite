import { doc, setDoc, getDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Analytics utilities for tracking upgrade nudge performance
 */

// Track when a nudge is shown
export const trackNudgeShown = async (userId, nudgeType, context = {}) => {
  try {
    const analyticsRef = doc(db, 'upgradeAnalytics', `${userId}_${nudgeType}`);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    await setDoc(analyticsRef, {
      userId,
      nudgeType,
      lastShown: serverTimestamp(),
      showCount: increment(1),
      [`shows_${today}`]: increment(1),
      context,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log(`📊 Nudge shown tracked: ${nudgeType} for user ${userId}`);
  } catch (error) {

  }
};

// Track when a nudge is dismissed
export const trackNudgeDismissed = async (userId, nudgeType, reason = 'dismissed') => {
  try {
    const analyticsRef = doc(db, 'upgradeAnalytics', `${userId}_${nudgeType}`);
    const today = new Date().toISOString().split('T')[0];
    
    await updateDoc(analyticsRef, {
      lastDismissed: serverTimestamp(),
      dismissCount: increment(1),
      [`dismissals_${today}`]: increment(1),
      lastDismissalReason: reason,
      updatedAt: serverTimestamp()
    });
    
    console.log(`📊 Nudge dismissal tracked: ${nudgeType} - ${reason}`);
  } catch (error) {

  }
};

// Track when a user clicks upgrade from a nudge
export const trackNudgeConversion = async (userId, nudgeType, conversionType = 'clicked_upgrade') => {
  try {
    const analyticsRef = doc(db, 'upgradeAnalytics', `${userId}_${nudgeType}`);
    const today = new Date().toISOString().split('T')[0];
    
    await updateDoc(analyticsRef, {
      lastConversion: serverTimestamp(),
      conversionCount: increment(1),
      [`conversions_${today}`]: increment(1),
      lastConversionType: conversionType,
      updatedAt: serverTimestamp()
    });
    
    // Also track in a global conversions collection for easier querying
    const globalConversionRef = doc(db, 'upgradeConversions', `${userId}_${Date.now()}`);
    await setDoc(globalConversionRef, {
      userId,
      nudgeType,
      conversionType,
      timestamp: serverTimestamp(),
      date: today
    });
    
    console.log(`📊 Nudge conversion tracked: ${nudgeType} - ${conversionType}`);
  } catch (error) {

  }
};

// Track manual location updates (for frequency-based nudges)
export const trackManualLocationUpdate = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const analyticsRef = doc(db, 'locationUpdateAnalytics', userId);
    
    await setDoc(analyticsRef, {
      userId,
      lastUpdate: serverTimestamp(),
      totalUpdates: increment(1),
      [`updates_${today}`]: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log(`📊 Manual location update tracked for user ${userId}`);
  } catch (error) {

  }
};

// Get nudge analytics for a specific user
export const getNudgeAnalytics = async (userId) => {
  try {
    const analyticsRef = doc(db, 'upgradeAnalytics', userId);
    const doc = await getDoc(analyticsRef);
    
    if (doc.exists()) {
      return doc.data();
    }
    return null;
  } catch (error) {

    return null;
  }
};

// Calculate conversion rate for a nudge type
export const calculateConversionRate = (analytics) => {
  if (!analytics || !analytics.showCount) return 0;
  
  const shows = analytics.showCount || 0;
  const conversions = analytics.conversionCount || 0;
  
  return shows > 0 ? ((conversions / shows) * 100).toFixed(2) : 0;
};

// Get aggregated analytics for admin dashboard
export const getAggregatedAnalytics = async () => {
  try {
    // This would require a cloud function to aggregate data
    // For now, return a placeholder structure
    return {
      totalNudgesShown: 0,
      totalConversions: 0,
      overallConversionRate: 0,
      nudgeTypes: {
        location_frequency: { shows: 0, conversions: 0, rate: 0 },
        location_streak: { shows: 0, conversions: 0, rate: 0 },
        session_length: { shows: 0, conversions: 0, rate: 0 }
      }
    };
  } catch (error) {

    return null;
  }
};

// Track feature callout interactions
export const trackFeatureCalloutClick = async (userId, feature, action = 'clicked') => {
  try {
    const analyticsRef = doc(db, 'featureCalloutAnalytics', `${userId}_${feature}`);
    const today = new Date().toISOString().split('T')[0];
    
    await setDoc(analyticsRef, {
      userId,
      feature,
      lastClick: serverTimestamp(),
      clickCount: increment(1),
      [`clicks_${today}`]: increment(1),
      lastAction: action,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log(`📊 Feature callout click tracked: ${feature} - ${action}`);
  } catch (error) {

  }
};
