import React, { useState, useEffect } from 'react';
import { useAuthContext } from './AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  trackNudgeShown, 
  trackNudgeDismissed, 
  trackNudgeConversion,
  trackManualLocationUpdate as trackLocationUpdate
} from '../utils/upgradeAnalytics';
import './UpgradeNudges.css';

const NUDGE_TRIGGERS = {
  MANUAL_LOCATION_FREQUENCY: {
    threshold: 3, // Show after 3 manual updates
    cooldown: 24 * 60 * 60 * 1000, // 24 hours between nudges
    type: 'location_frequency'
  },
  MANUAL_LOCATION_STREAK: {
    threshold: 5, // Show after 5 consecutive days of updates
    cooldown: 48 * 60 * 60 * 1000, // 48 hours between nudges
    type: 'location_streak'
  },
  SESSION_LENGTH: {
    threshold: 30 * 60 * 1000, // 30 minutes active session
    cooldown: 48 * 60 * 60 * 1000,
    type: 'session_length'
  }
};

const NUDGE_MESSAGES = {
  location_frequency: {
    title: "🚀 Tired of Updating Your Location?",
    message: "You've manually updated your location 3 times today. Pro plan users enjoy automatic GPS tracking!",
    cta: "Upgrade to Pro for $9.99/month",
    benefits: [
      "✅ Real-time GPS auto-tracking",
      "✅ No more manual updates",
      "✅ Always visible to customers",
      "✅ Access to citywide heat maps"
    ]
  },
  location_streak: {
    title: "🎯 You're a Location Update Champion!",
    message: "You've been diligently updating your location for 5 days straight. Let us handle that for you!",
    cta: "Unlock GPS Auto-Tracking with Pro",
    benefits: [
      "✅ Set it and forget it GPS tracking",
      "✅ More time to focus on customers",
      "✅ Never miss potential customers",
      "✅ Professional heat map analytics"
    ]
  },
  session_length: {
    title: "💪 You're Working Hard Out There!",
    message: "You've been active for over 30 minutes. Pro users never worry about location updates during long shifts.",
    cta: "Upgrade to Pro - Only $9.99/month",
    benefits: [
      "✅ Automatic location tracking all day",
      "✅ Focus on cooking, not updating",
      "✅ Customers always know where you are",
      "✅ Boost your visibility and sales"
    ]
  }
};

const UpgradeNudge = ({ nudgeType, onDismiss, onUpgrade }) => {
  const nudgeData = NUDGE_MESSAGES[nudgeType];
  
  if (!nudgeData) return null;

  return (
    <div className="upgrade-nudge-overlay">
      <div className="upgrade-nudge-modal">
        <div className="upgrade-nudge-header">
          <h3>{nudgeData.title}</h3>
          <button className="close-btn" onClick={onDismiss}>×</button>
        </div>
        
        <div className="upgrade-nudge-content">
          <p className="nudge-message">{nudgeData.message}</p>
          
          <div className="benefits-list">
            {nudgeData.benefits.map((benefit, index) => (
              <div key={index} className="benefit-item">{benefit}</div>
            ))}
          </div>
          
          <div className="nudge-actions">
            <button 
              className="upgrade-btn-primary"
              onClick={onUpgrade}
            >
              {nudgeData.cta}
            </button>
            <button 
              className="upgrade-btn-secondary"
              onClick={onDismiss}
            >
              Maybe Later
            </button>
          </div>
          
          <div className="nudge-footer">
            <small>💰 30-day free trial • Cancel anytime • Upgrade instantly</small>
          </div>
        </div>
      </div>
    </div>
  );
};

const UpgradeNudgeManager = () => {
  const { user, userPlan, userRole } = useAuthContext();
  const [currentNudge, setCurrentNudge] = useState(null);
  const [nudgeHistory, setNudgeHistory] = useState({});

  // Only show nudges for Basic plan owners
  const shouldShowNudges = userRole === 'owner' && userPlan === 'basic';

  useEffect(() => {
    if (!shouldShowNudges || !user?.uid) return;

    loadNudgeHistory();
    setupLocationUpdateListener();
    setupSessionTracker();
  }, [shouldShowNudges, user?.uid]);

  const loadNudgeHistory = async () => {
    try {
      const nudgeRef = doc(db, 'nudgeHistory', user.uid);
      const nudgeDoc = await getDoc(nudgeRef);
      
      if (nudgeDoc.exists()) {
        setNudgeHistory(nudgeDoc.data());
      }
    } catch (error) {
      console.error('Error loading nudge history:', error);
    }
  };

  const saveNudgeHistory = async (updatedHistory) => {
    try {
      const nudgeRef = doc(db, 'nudgeHistory', user.uid);
      await setDoc(nudgeRef, {
        ...updatedHistory,
        updatedAt: serverTimestamp()
      });
      setNudgeHistory(updatedHistory);
    } catch (error) {
      console.error('Error saving nudge history:', error);
    }
  };

  const setupLocationUpdateListener = () => {
    // Track manual location updates
    const today = new Date().toDateString();
    const locationUpdatesKey = `locationUpdates_${today}`;
    
    // This would be called from your manual location update component
    window.trackManualLocationUpdate = () => {
      if (!shouldShowNudges) return;
      
      const updatesToday = (nudgeHistory[locationUpdatesKey] || 0) + 1;
      const updatedHistory = {
        ...nudgeHistory,
        [locationUpdatesKey]: updatesToday,
        lastLocationUpdate: Date.now()
      };
      
      saveNudgeHistory(updatedHistory);
      
      // Check if we should show a nudge
      if (updatesToday >= NUDGE_TRIGGERS.MANUAL_LOCATION_FREQUENCY.threshold) {
        showNudgeIfCooldownPassed('location_frequency');
      }
    };

    // Track consecutive days of updates for streak nudge
    checkLocationUpdateStreak();
  };

  const setupSessionTracker = () => {
    const sessionStart = Date.now();
    
    const checkSessionLength = () => {
      const sessionLength = Date.now() - sessionStart;
      
      if (sessionLength >= NUDGE_TRIGGERS.SESSION_LENGTH.threshold) {
        showNudgeIfCooldownPassed('session_length');
      }
    };

    // Check session length every 5 minutes
    const sessionInterval = setInterval(checkSessionLength, 5 * 60 * 1000);
    
    return () => clearInterval(sessionInterval);
  };

  const checkLocationUpdateStreak = () => {
    const today = new Date();
    let streak = 0;
    
    // Check last 7 days for consecutive updates
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateKey = `locationUpdates_${checkDate.toDateString()}`;
      
      if (nudgeHistory[dateKey] && nudgeHistory[dateKey] > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    if (streak >= NUDGE_TRIGGERS.MANUAL_LOCATION_STREAK.threshold) {
      showNudgeIfCooldownPassed('location_streak');
    }
  };

  const showNudgeIfCooldownPassed = (nudgeType) => {
    const lastShown = nudgeHistory[`lastShown_${nudgeType}`] || 0;
    const cooldown = NUDGE_TRIGGERS[nudgeType]?.cooldown || 24 * 60 * 60 * 1000;
    
    if (Date.now() - lastShown > cooldown) {
      setCurrentNudge(nudgeType);
      // Track that the nudge was shown
      trackNudgeShown(user.uid, nudgeType, {
        trigger: NUDGE_TRIGGERS[nudgeType]?.type,
        userPlan,
        timestamp: Date.now()
      });
    }
  };

  const handleNudgeDismiss = async () => {
    if (currentNudge) {
      const updatedHistory = {
        ...nudgeHistory,
        [`lastShown_${currentNudge}`]: Date.now(),
        [`dismissed_${currentNudge}`]: (nudgeHistory[`dismissed_${currentNudge}`] || 0) + 1
      };
      
      await saveNudgeHistory(updatedHistory);
      
      // Track the dismissal
      trackNudgeDismissed(user.uid, currentNudge, 'maybe_later');
    }
    
    setCurrentNudge(null);
  };

  const handleUpgrade = () => {
    // Track conversion
    if (currentNudge) {
      const updatedHistory = {
        ...nudgeHistory,
        [`converted_${currentNudge}`]: Date.now(),
        conversionNudgeType: currentNudge
      };
      
      saveNudgeHistory(updatedHistory);
      
      // Track the conversion in analytics
      trackNudgeConversion(user.uid, currentNudge, 'clicked_upgrade');
    }
    
    // Redirect to upgrade page
    window.location.href = '/pricing';
  };

  // Don't render anything if nudges shouldn't be shown
  if (!shouldShowNudges) return null;

  return (
    <>
      {currentNudge && (
        <UpgradeNudge
          nudgeType={currentNudge}
          onDismiss={handleNudgeDismiss}
          onUpgrade={handleUpgrade}
        />
      )}
    </>
  );
};

export default UpgradeNudgeManager;

// Hook to trigger nudges from other components
export const useUpgradeNudges = () => {
  const { userPlan, userRole } = useAuthContext();
  
  const triggerManualLocationUpdate = () => {
    if (userRole === 'owner' && userPlan === 'basic' && window.trackManualLocationUpdate) {
      window.trackManualLocationUpdate();
    }
    
    // Also track in analytics for revenue optimization
    if (userRole === 'owner' && userPlan === 'basic') {
      trackLocationUpdate(user?.uid);
    }
  };

  return {
    triggerManualLocationUpdate
  };
};
