import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc,
  getDoc, 
  getDocs,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Foodie Game Service
 * Handles gamification, check-ins, missions, and accountability features
 */
class FoodieGameService {
  constructor() {
    this.STORAGE_KEYS = {
      LAST_CHECKIN: 'foodie_last_checkin',
      DAILY_STREAK: 'foodie_daily_streak',
      CACHED_LEVEL: 'foodie_cached_level'
    };
    
    // Points system configuration
    this.POINTS = {
      CHECKIN: 10,
      PREORDER: 25,
      FIRST_TRUCK_VISIT: 50,
      DAILY_STREAK: 15,
      MISSION_COMPLETE: 100,
      CALL_OUT_VERIFIED: 20,
      REVIEW_TRUCK: 30
    };
    
    // Level thresholds
    this.LEVELS = [
      { level: 1, xp: 0, title: 'Newbie Foodie', icon: '🍽️' },
      { level: 2, xp: 100, title: 'Hungry Explorer', icon: '🍕' },
      { level: 3, xp: 300, title: 'Street Food Scout', icon: '🌮' },
      { level: 4, xp: 600, title: 'Mobile Kitchen Master', icon: '🚚' },
      { level: 5, xp: 1000, title: 'Foodie Legend', icon: '👑' },
      { level: 6, xp: 1500, title: 'Culinary Champion', icon: '🏆' },
      { level: 7, xp: 2500, title: 'Gourmet Guardian', icon: '⭐' },
      { level: 8, xp: 4000, title: 'Epic Eater', icon: '💎' },
      { level: 9, xp: 6000, title: 'Food Truck Sage', icon: '🎯' },
      { level: 10, xp: 10000, title: 'Ultimate Foodie', icon: '🔥' }
    ];
    
    // Mission types
    this.MISSION_TYPES = {
      DAILY_CHECKIN: 'daily_checkin',
      VISIT_NEW_TRUCKS: 'visit_new_trucks',
      PREORDER_STREAK: 'preorder_streak',
      EXPLORE_AREAS: 'explore_areas',
      SOCIAL_ENGAGEMENT: 'social_engagement'
    };

    // Achievement definitions
    this.ACHIEVEMENTS = {
      // Streak Achievements
      FIRST_CHECKIN: { id: 'first_checkin', title: 'Welcome Foodie!', points: 25, icon: '🎉' },
      STREAK_3: { id: 'streak_3', title: 'Getting Started', points: 50, icon: '🔥' },
      STREAK_7: { id: 'streak_7', title: 'Week Warrior', points: 100, icon: '⚡' },
      STREAK_30: { id: 'streak_30', title: 'Monthly Master', points: 500, icon: '👑' },
      
      // Exploration Achievements
      EXPLORER_5: { id: 'explorer_5', title: 'Local Explorer', points: 75, icon: '🗺️' },
      EXPLORER_25: { id: 'explorer_25', title: 'Area Expert', points: 200, icon: '🧭' },
      EXPLORER_100: { id: 'explorer_100', title: 'Master Explorer', points: 1000, icon: '🌟' },
      
      // Social Achievements
      SOCIAL_BUTTERFLY: { id: 'social_butterfly', title: 'Social Butterfly', points: 150, icon: '🦋' },
      REVIEW_MASTER: { id: 'review_master', title: 'Review Master', points: 300, icon: '⭐' },
      
      // Special Achievements
      NIGHT_OWL: { id: 'night_owl', title: 'Night Owl', points: 100, icon: '🦉' },
      EARLY_BIRD: { id: 'early_bird', title: 'Early Bird', points: 100, icon: '🐦' },
      WEEKEND_WARRIOR: { id: 'weekend_warrior', title: 'Weekend Warrior', points: 150, icon: '🏆' }
    };

    // Combo system for rapid actions
    this.COMBO_THRESHOLDS = {
      QUICK_COMBO: { time: 30000, multiplier: 1.5, name: 'Quick Combo!' }, // 30 seconds
      FAST_COMBO: { time: 60000, multiplier: 2.0, name: 'Fast Combo!' }, // 1 minute
      SUPER_COMBO: { time: 120000, multiplier: 3.0, name: 'Super Combo!' } // 2 minutes
    };
  }



  /**
   * Get user's total points and level information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User points data
   */
  async getUserPoints(userId) {
    try {
      const userDocRef = doc(db, 'foodieProfiles', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create new profile
        const initialData = {
          totalPoints: 0,
          weeklyPoints: 0,
          checkInStreak: 0,
          uniqueLocations: 0,
          lastCheckIn: null,
          level: 1,
          createdAt: serverTimestamp(),
          // Enhanced gamification
          consecutiveDays: 0,
          longestStreak: 0,
          comboMultiplier: 1,
          lastComboTime: null,
          achievementsUnlocked: [],
          badges: [],
          favoriteCuisines: {},
          explorationScore: 0,
          socialScore: 0,
          weeklyRank: null,
          monthlyRank: null
        };
        
        await setDoc(userDocRef, initialData);
        return initialData;
      }
      
      return userDoc.data();
    } catch (error) {
 
      return { totalPoints: 0, weeklyPoints: 0, checkInStreak: 0, uniqueLocations: 0 };
    }
  }

  /**
   * Get user's earned badges
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of badges
   */
  async getUserBadges(userId) {
    try {
      // Simple query without orderBy to avoid index requirement for now
      const badgesQuery = query(
        collection(db, 'foodieBadges'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(badgesQuery);
      const badges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort in memory by earnedAt descending
      return badges.sort((a, b) => {
        const aTime = a.earnedAt?.toDate?.() || new Date(a.earnedAt || 0);
        const bTime = b.earnedAt?.toDate?.() || new Date(b.earnedAt || 0);
        return bTime.getTime() - aTime.getTime();
      });
    } catch (error) {
   
      return [];
    }
  }

  /**
   * Get nearby foodies (one-time fetch, more reliable than real-time listener)
   * @param {Object} location - Center location
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Promise<Array>} Array of nearby foodies
   */
  async getNearbyFoodies(location, radiusKm = 5) {
    try {

      
      const usersQuery = query(
        collection(db, 'users'),
        limit(100)
      );
      
      const snapshot = await getDocs(usersQuery);
      const allUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      

      
      // Debug: Show some sample user data
      const usersWithLocation = allUsers.filter(u => u.currentLocation || u.lastKnownLocation);
      if (usersWithLocation.length > 0) {
  
      }
      
      // Filter for users who have location data and are not mobile kitchen owners
      const activeUsers = allUsers.filter(user => {
        // Exclude mobile kitchen owners (they have truckName or role === 'owner')
        if (user.truckName || user.role === 'owner') {
    
          return false;
        }
        
        return user.currentLocation?.latitude && user.currentLocation?.longitude ||
               user.lastKnownLocation?.latitude && user.lastKnownLocation?.longitude;
      });

      // Process each user and check distance
      const foodiesWithStatus = [];
      
      for (const user of activeUsers) {
        try {
          // Get user location
          let userLocation = user.currentLocation || user.lastKnownLocation;
          
          // Simple distance filter
          const lat1 = location.coords ? location.coords.latitude : location.latitude;
          const lng1 = location.coords ? location.coords.longitude : location.longitude;
          const lat2 = userLocation.latitude;
          const lng2 = userLocation.longitude;
          
          const distance = this.calculateDistance(lat1, lng1, lat2, lng2);
          if (distance > radiusKm) {
            continue;
          }

          // Check for recent check-in status
          let hungerLevel = 'interested';
          let checkedIn = false;
          
          try {
            const checkInsQuery = query(
              collection(db, 'foodieCheckins'),
              where('userId', '==', user.id),
              where('active', '==', true),
              limit(1)
            );
            
            const checkInSnapshot = await getDocs(checkInsQuery);
            if (!checkInSnapshot.empty) {
              const checkInData = checkInSnapshot.docs[0].data();
              const checkinTime = checkInData.timestamp?.toDate?.() || new Date(checkInData.timestamp);
              const isRecent = (Date.now() - checkinTime.getTime()) < (45 * 60 * 1000);
              
              if (isRecent) {
                hungerLevel = checkInData.hungerLevel || 'interested';
                checkedIn = true;
              }
            }
          } catch (checkInError) {
            // Ignore check-in errors, just use default values
       
          }

          const foodieData = {
            id: user.id,
            userId: user.id,
            username: user.username || user.displayName || 'Foodie',
            profileImageUrl: user.profileImageUrl || user.profilePhotoURL || user.photoURL || user.profileUrl,
            location: userLocation,
            hungerLevel,
            checkedIn,
            lastActive: user.lastActive,
            timestamp: user.lastActive,
            level: user.level || 1,
            totalXP: user.totalXP || 0
          };
          
          foodiesWithStatus.push(foodieData);
        } catch (error) {
   
          continue;
        }
      }
      

      return foodiesWithStatus;
      
    } catch (error) {

      return [];
    }
  }

  /**
   * Subscribe to nearby foodies for real-time updates (uses polling instead of listeners)
   * @param {Object} location - Center location
   * @param {number} radiusKm - Radius in kilometers
   * @param {Function} callback - Callback for updates
   * @returns {Promise<Function>} Unsubscribe function
   */
  async subscribeToNearbyFoodies(location, radiusKm = 5, callback) {
    try {
      let isActive = true;
      let isFetching = false; // Prevent concurrent requests
      
      const fetchFoodies = async () => {
        if (!isActive || isFetching) return;
        
        isFetching = true;
        try {
          const foodies = await this.getNearbyFoodies(location, radiusKm);
          if (isActive) {
   
            callback(foodies);
          }
        } catch (error) {
       
          if (isActive) {
            callback([]);
          }
        } finally {
          isFetching = false;
        }
      };
      
      // Initial fetch with a small delay to avoid race conditions
      setTimeout(fetchFoodies, 500);
      
      // Set up polling (every 30 seconds to reduce load)
      const intervalId = setInterval(fetchFoodies, 30000);
      
      // Return unsubscribe function
      return () => {
        isActive = false;
        clearInterval(intervalId);
   
      };
      
    } catch (error) {

      callback([]);
      return () => {};
    }
  }

  /**
   * Get available missions for user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Available missions
   */
  /**
   * Get all mission templates (used for completion and reference)
   */
  getAllMissionTemplates() {
    return [
      {
        id: 'daily_checkin',
        title: 'Daily Check-In',
        description: 'Check in to any location today to earn XP',
        type: 'location',
        difficulty: 'easy',
        points: 15,
        requirements: ['Check in to 1 location on the map'],
        progress: { current: 0, target: 1 }
      },
      {
        id: 'try_3_trucks',
        title: 'Mobile Food Explorer',
        description: 'Visit 3 or more mobile food vendors this week with photo verification',
        type: 'explorer',
        difficulty: 'medium',
        points: 100,
        requirements: ['Visit 3+ mobile food vendors', 'Take verification photos at each visit'],
        progress: { current: 0, target: 3 }
      },
      {
        id: 'first_order',
        title: 'First Order',
        description: 'Place your first pre-order through the app',
        type: 'social',
        difficulty: 'easy',
        points: 25,
        requirements: ['Place a pre-order with any food truck'],
        progress: { current: 0, target: 1 }
      },
      {
        id: 'express_interest',
        title: 'Show Interest',
        description: 'Send a ping or favorite a food truck',
        type: 'social',
        difficulty: 'easy',
        points: 10,
        requirements: ['Send a ping OR favorite a food truck on the map'],
        progress: { current: 0, target: 1 }
      }
    ];
  }

  async getAvailableMissions(userId) {
    try {
      // Get user's active missions to avoid showing duplicates
      const activeMissions = await this.getActiveMissions(userId);
      const activeMissionIds = activeMissions.map(m => m.missionId);

      // Get all missions and filter out ones that are already active
      const allMissions = this.getAllMissionTemplates();
      return allMissions.filter(mission => !activeMissionIds.includes(mission.id));
    } catch (error) {

      return [];
    }
  }

  /**
   * Get active missions for user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Active missions
   */
  async getActiveMissions(userId) {
    try {
      const missionsQuery = query(
        collection(db, 'activeMissions'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(missionsQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
   
      return [];
    }
  }

  /**
   * Get completed missions for today
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Completed missions
   */
  async getCompletedMissionsToday(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Simplified query - just get user's missions and filter by date in memory
      const missionsQuery = query(
        collection(db, 'completedMissions'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(missionsQuery);
      const allMissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter for today's missions in memory to avoid compound index requirement
      const todaysMissions = allMissions.filter(mission => {
        const completedTime = mission.completedAt?.toDate?.() || new Date(mission.completedAt);
        return completedTime >= today;
      });
      
      // Sort by completedAt in memory
      return todaysMissions.sort((a, b) => {
        const aTime = a.completedAt?.toDate?.() || new Date(a.completedAt);
        const bTime = b.completedAt?.toDate?.() || new Date(b.completedAt);
        return bTime - aTime; // desc order
      });
    } catch (error) {

      return [];
    }
  }

  /**
   * Start a mission
   * @param {string} userId - User ID
   * @param {string} missionId - Mission ID
   * @returns {Promise<Object>} Result
   */
  async startMission(userId, missionId) {
    try {
      // Check if user already has this mission active
      const existingQuery = query(
        collection(db, 'activeMissions'),
        where('userId', '==', userId),
        where('missionId', '==', missionId),
        where('status', '==', 'active')
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        return { success: false, error: 'Mission already active' };
      }

      // Get mission details to set proper target
      const availableMissions = await this.getAvailableMissions(userId);
      const missionDetails = availableMissions.find(m => m.id === missionId);
      
      const missionData = {
        userId,
        missionId,
        status: 'active',
        startedAt: serverTimestamp(),
        progress: { 
          current: 0, 
          target: missionDetails?.progress?.target || 1 
        }
      };
      
      await addDoc(collection(db, 'activeMissions'), missionData);
      return { success: true };
    } catch (error) {

      return { success: false, error: error.message };
    }
  }

  /**
   * Get recent call-outs in area
   * @param {Object} location - Location
   * @param {number} hoursBack - Hours to look back
   * @returns {Promise<Array>} Recent call-outs
   */
  async getRecentCallOuts(location, hoursBack = 24) {
    try {
      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      
      const callOutsQuery = query(
        collection(db, 'foodieCallOuts'),
        where('timestamp', '>=', cutoffTime),
        limit(20)
      );
      
      const snapshot = await getDocs(callOutsQuery);
      const callOuts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by timestamp in memory to avoid index requirement
      return callOuts.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return bTime - aTime; // desc order
      });
    } catch (error) {

      return [];
    }
  }

  /**
   * Submit a call-out
   * @param {string} userId - User ID
   * @param {Object} callOutData - Call-out data
   * @returns {Promise<Object>} Result
   */
  async submitCallOut(userId, callOutData) {
    try {
      const callOut = {
        userId,
        ...callOutData,
        timestamp: serverTimestamp(),
        status: 'active'
      };
      
      await addDoc(collection(db, 'foodieCallOuts'), callOut);
      
      // Award points
      await this.awardPoints(userId, this.POINTS.CALL_OUT_VERIFIED);
      
      return { success: true, pointsEarned: this.POINTS.CALL_OUT_VERIFIED };
    } catch (error) {
 
      return { success: false, error: error.message };
    }
  }

  /**
   * Award points to user
   * @param {string} userId - User ID
   * @param {number} points - Points to award
   * @returns {Promise<Object>} Result
   */
  async awardPoints(userId, points, actionType = 'general') {
    try {
      const userDocRef = doc(db, 'foodieProfiles', userId);
      const userDoc = await getDoc(userDocRef);
      
      let currentData = { 
        totalPoints: 0, 
        weeklyPoints: 0,
        lastComboTime: null,
        comboMultiplier: 1,
        achievementsUnlocked: []
      };
      if (userDoc.exists()) {
        currentData = userDoc.data();
      }

      // Calculate combo multiplier
      const now = Date.now();
      let comboMultiplier = 1;
      let comboMessage = null;
      
      if (currentData.lastComboTime) {
        const timeDiff = now - (currentData.lastComboTime.toDate?.()?.getTime() || currentData.lastComboTime);
        
        if (timeDiff <= this.COMBO_THRESHOLDS.QUICK_COMBO.time) {
          comboMultiplier = this.COMBO_THRESHOLDS.SUPER_COMBO.multiplier;
          comboMessage = this.COMBO_THRESHOLDS.SUPER_COMBO.name;
        } else if (timeDiff <= this.COMBO_THRESHOLDS.FAST_COMBO.time) {
          comboMultiplier = this.COMBO_THRESHOLDS.FAST_COMBO.multiplier;
          comboMessage = this.COMBO_THRESHOLDS.FAST_COMBO.name;
        } else if (timeDiff <= this.COMBO_THRESHOLDS.SUPER_COMBO.time) {
          comboMultiplier = this.COMBO_THRESHOLDS.QUICK_COMBO.multiplier;
          comboMessage = this.COMBO_THRESHOLDS.QUICK_COMBO.name;
        }
      }

      // Apply combo multiplier
      const finalPoints = Math.round(points * comboMultiplier);
      
      const updatedData = {
        totalPoints: (currentData.totalPoints || 0) + finalPoints,
        weeklyPoints: (currentData.weeklyPoints || 0) + finalPoints,
        lastPointsEarned: finalPoints,
        lastPointsEarnedAt: serverTimestamp(),
        lastComboTime: serverTimestamp(),
        comboMultiplier: comboMultiplier
      };

      // Check for new achievements
      const newAchievements = await this.checkAchievements(userId, updatedData, actionType);
      
      if (userDoc.exists()) {
        await updateDoc(userDocRef, updatedData);
      } else {
        // Create new document if it doesn't exist
        await setDoc(userDocRef, {
          ...updatedData,
          createdAt: serverTimestamp(),
          achievementsUnlocked: [],
          badges: []
        });
      }
      
      return { 
        success: true, 
        newTotal: updatedData.totalPoints,
        pointsAwarded: finalPoints,
        originalPoints: points,
        comboMultiplier: comboMultiplier,
        comboMessage: comboMessage,
        newAchievements: newAchievements
      };
    } catch (error) {
     
      return { success: false, error: error.message };
    }
  }

  /**
   * Check and unlock new achievements
   */
  async checkAchievements(userId, userData, actionType) {
    try {
      const newAchievements = [];
      const currentAchievements = userData.achievementsUnlocked || [];
      
      // Check streak achievements
      const streak = userData.checkInStreak || 0;
      if (streak >= 30 && !currentAchievements.includes('streak_30')) {
        newAchievements.push(this.ACHIEVEMENTS.STREAK_30);
      } else if (streak >= 7 && !currentAchievements.includes('streak_7')) {
        newAchievements.push(this.ACHIEVEMENTS.STREAK_7);
      } else if (streak >= 3 && !currentAchievements.includes('streak_3')) {
        newAchievements.push(this.ACHIEVEMENTS.STREAK_3);
      }

      // Check exploration achievements
      const locations = userData.uniqueLocations || 0;
      if (locations >= 100 && !currentAchievements.includes('explorer_100')) {
        newAchievements.push(this.ACHIEVEMENTS.EXPLORER_100);
      } else if (locations >= 25 && !currentAchievements.includes('explorer_25')) {
        newAchievements.push(this.ACHIEVEMENTS.EXPLORER_25);
      } else if (locations >= 5 && !currentAchievements.includes('explorer_5')) {
        newAchievements.push(this.ACHIEVEMENTS.EXPLORER_5);
      }

      // Check time-based achievements
      const hour = new Date().getHours();
      if (actionType === 'checkin') {
        if (hour >= 22 || hour <= 4) { // Night owl (10 PM - 4 AM)
          if (!currentAchievements.includes('night_owl')) {
            newAchievements.push(this.ACHIEVEMENTS.NIGHT_OWL);
          }
        } else if (hour >= 5 && hour <= 8) { // Early bird (5 AM - 8 AM)
          if (!currentAchievements.includes('early_bird')) {
            newAchievements.push(this.ACHIEVEMENTS.EARLY_BIRD);
          }
        }
      }

      // Award achievement points and update user
      if (newAchievements.length > 0) {
        const achievementPoints = newAchievements.reduce((sum, ach) => sum + ach.points, 0);
        const userDocRef = doc(db, 'foodieProfiles', userId);
        
        await updateDoc(userDocRef, {
          totalPoints: userData.totalPoints + achievementPoints,
          achievementsUnlocked: [...currentAchievements, ...newAchievements.map(a => a.id)]
        });
      }

      return newAchievements;
    } catch (error) {
 
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates
   * @param {number} lat1 - Latitude 1
   * @param {number} lng1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lng2 - Longitude 2
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Check in a foodie at a specific location
   * @param {string} userId - User ID
   * @param {Object} location - Location coordinates {latitude, longitude}
   * @param {string} hungerLevel - Hunger level (interested, hungry, starving)
   * @returns {Promise<Object>} Check-in result with points earned
   */
  async checkInFoodie(userId, location, hungerLevel = 'interested') {
    try {
      const checkinData = {
        userId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        hungerLevel, // 'interested', 'hungry', 'starving'
        timestamp: serverTimestamp(),
        expiresAt: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes
        active: true
      };

      // Add check-in to database
      const docRef = await addDoc(collection(db, 'foodieCheckins'), checkinData);
      
      // Award points for check-in
      await this.awardPoints(userId, this.POINTS.CHECKIN);
      
      // Check for daily streak
      await this.updateDailyStreak(userId);
      
      // Check and update mission progress (this may complete missions)
      const missionResult = await this.updateMissionProgress(userId, 'checkin', 1);
      
      // Store last check-in locally
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_CHECKIN, Date.now().toString());
      
      // Store current check-in data for map display (with regular timestamp for local storage)
      const localCheckinData = {
        ...checkinData,
        timestamp: Date.now() // Use regular timestamp for local storage
      };
      await AsyncStorage.setItem('current_checkin', JSON.stringify(localCheckinData));
      
      return {
        success: true,
        checkinId: docRef.id,
        pointsAwarded: this.POINTS.CHECKIN,
        checkInData: checkinData,
        missionCompleted: missionResult?.missionCompleted || null
      };
    } catch (error) {
  
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active foodies on map
   */
  async getActiveFoodies(bounds) {
    try {
      const now = new Date();
      const foodiesRef = collection(db, 'foodieCheckins');
      const q = query(
        foodiesRef,
        where('active', '==', true),
        where('expiresAt', '>', now)
      );
      
      const snapshot = await getDocs(q);
      const foodies = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // Filter by bounds if provided
        if (bounds) {
          const { latitude, longitude } = data.location;
          if (latitude >= bounds.south && latitude <= bounds.north &&
              longitude >= bounds.west && longitude <= bounds.east) {
            foodies.push({
              id: doc.id,
              ...data
            });
          }
        } else {
          foodies.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      return this.clusterFoodies(foodies);
    } catch (error) {
    
      return [];
    }
  }

  /**
   * Cluster nearby foodies to reduce map clutter
   */
  clusterFoodies(foodies, clusterDistance = 0.001) { // ~100m
    const clusters = [];
    const processed = new Set();
    
    foodies.forEach((foodie, index) => {
      if (processed.has(index)) return;
      
      const cluster = {
        id: `cluster_${Date.now()}_${index}`,
        location: foodie.location,
        foodies: [foodie],
        hungerLevels: [foodie.hungerLevel]
      };
      
      // Find nearby foodies to cluster
      foodies.forEach((otherFoodie, otherIndex) => {
        if (index !== otherIndex && !processed.has(otherIndex)) {
          const distance = this.calculateDistance(
            foodie.location,
            otherFoodie.location
          );
          
          if (distance <= clusterDistance) {
            cluster.foodies.push(otherFoodie);
            cluster.hungerLevels.push(otherFoodie.hungerLevel);
            processed.add(otherIndex);
          }
        }
      });
      
      processed.add(index);
      clusters.push(cluster);
    });
    
    return clusters;
  }

  /**
   * Calculate distance between two coordinates (in degrees)
   */
  calculateDistance(coord1, coord2) {
    const lat1 = coord1.latitude;
    const lon1 = coord1.longitude;
    const lat2 = coord2.latitude;
    const lon2 = coord2.longitude;
    
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
  }

  /**
   * Report truck (Call Out functionality)
   */
  async reportTruck(userId, truckId, reason, location, description = '') {
    try {
      const reportData = {
        reporterId: userId,
        truckId,
        reason, // 'not_here', 'closed', 'delayed', 'false_info'
        location,
        description,
        timestamp: serverTimestamp(),
        status: 'pending', // 'pending', 'verified', 'dismissed'
        votes: 1
      };

      const docRef = await addDoc(collection(db, 'truckReports'), reportData);
      
      // Award points for verified reports (pending verification)
      await this.awardPoints(userId, this.POINTS.CALL_OUT_VERIFIED);
      
      return {
        success: true,
        reportId: docRef.id,
        message: 'Report submitted successfully'
      };
    } catch (error) {
  
      return { success: false, error: error.message };
    }
  }

  /**
   * Express interest in a truck
   */
  async expressInterest(userId, truckId, location) {
    try {
      const interestData = {
        userId,
        truckId,
        location,
        timestamp: serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        active: true
      };

      const docRef = await addDoc(collection(db, 'truckInterest'), interestData);
      
      return {
        success: true,
        interestId: docRef.id
      };
    } catch (error) {

      return { success: false, error: error.message };
    }
  }

  /**
   * Get truck interest/demand data
   */
  async getTruckDemand(truckId) {
    try {
      const now = new Date();
      const interestRef = collection(db, 'truckInterest');
      const q = query(
        interestRef,
        where('truckId', '==', truckId),
        where('active', '==', true),
        where('expiresAt', '>', now)
      );
      
      const snapshot = await getDocs(q);
      const interests = [];
      
      snapshot.forEach(doc => {
        interests.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return {
        count: interests.length,
        interests
      };
    } catch (error) {
 
      return { count: 0, interests: [] };
    }
  }

  /**
   * Award points to user (LEGACY METHOD - using userStats collection)
   * Currently not used - all points are managed through foodieProfiles collection
   */
  /*
  async awardPoints(userId, points, reason) {
    try {
      // Get current user stats
      const userStatsRef = doc(db, 'userStats', userId);
      const userStatsDoc = await getDoc(userStatsRef);
      
      let currentXP = 0;
      let currentLevel = 1;
      
      if (userStatsDoc.exists()) {
        const data = userStatsDoc.data();
        currentXP = data.totalXP || 0;
        currentLevel = data.level || 1;
      }
      
      const newXP = currentXP + points;
      const newLevel = this.calculateLevel(newXP);
      
      // Update user stats
      await setDoc(userStatsRef, {
        totalXP: newXP,
        level: newLevel,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      // Log the point transaction
      await addDoc(collection(db, 'pointTransactions'), {
        userId,
        points,
        reason,
        timestamp: serverTimestamp(),
        newTotal: newXP
      });
      
      // Check for level up
      const leveledUp = newLevel > currentLevel;
      if (leveledUp) {
        await this.handleLevelUp(userId, newLevel);
      }
      
      return {
        pointsAwarded: points,
        newTotal: newXP,
        newLevel,
        leveledUp
      };
    } catch (error) {
   
      return null;
    }
  }
  */

  /**
   * Calculate user level based on XP
   */
  calculateLevel(xp) {
    for (let i = this.LEVELS.length - 1; i >= 0; i--) {
      if (xp >= this.LEVELS[i].xp) {
        return this.LEVELS[i].level;
      }
    }
    return 1;
  }

  /**
   * Get level info by level number
   */
  getLevelInfo(level) {
    return this.LEVELS.find(l => l.level === level) || this.LEVELS[0];
  }

  /**
   * Handle level up rewards and badges
   */
  async handleLevelUp(userId, newLevel) {
    try {
      const levelInfo = this.getLevelInfo(newLevel);
      
      // Award level up badge
      await this.awardBadge(userId, `level_${newLevel}`, {
        name: `Level ${newLevel}: ${levelInfo.title}`,
        description: `Reached level ${newLevel}!`,
        icon: levelInfo.icon,
        rarity: newLevel >= 8 ? 'legendary' : newLevel >= 5 ? 'epic' : 'rare'
      });
      
      // Send level up notification
      // TODO: Implement push notification
      
      return true;
    } catch (error) {
   
      return false;
    }
  }

  /**
   * Award badge to user
   */
  async awardBadge(userId, badgeId, badgeData) {
    try {
      const userBadgeRef = doc(db, 'userBadges', `${userId}_${badgeId}`);
      
      await updateDoc(userBadgeRef, {
        userId,
        badgeId,
        ...badgeData,
        earnedAt: serverTimestamp()
      }, { merge: true });
      
      return true;
    } catch (error) {
    
      return false;
    }
  }

  /**
   * Update daily streak
   */
  async updateDailyStreak(userId) {
    try {
      const lastCheckin = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_CHECKIN);
      const now = new Date();
      const today = now.toDateString();
      
      if (lastCheckin) {
        const lastDate = new Date(parseInt(lastCheckin)).toDateString();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
        
        if (lastDate === yesterday) {
          // Continue streak
          const currentStreak = await AsyncStorage.getItem(this.STORAGE_KEYS.DAILY_STREAK) || '0';
          const newStreak = parseInt(currentStreak) + 1;
          
          await AsyncStorage.setItem(this.STORAGE_KEYS.DAILY_STREAK, newStreak.toString());
          await this.awardPoints(userId, this.POINTS.DAILY_STREAK);
          
          // Award streak badges
          if (newStreak === 7) {
            await this.awardBadge(userId, 'week_streak', {
              name: 'Week Warrior',
              description: '7 day check-in streak!',
              icon: '🔥'
            });
          }
          
          return newStreak;
        } else if (lastDate !== today) {
          // Reset streak
          await AsyncStorage.setItem(this.STORAGE_KEYS.DAILY_STREAK, '1');
          return 1;
        }
      } else {
        // First check-in
        await AsyncStorage.setItem(this.STORAGE_KEYS.DAILY_STREAK, '1');
        return 1;
      }
    } catch (error) {
    
      return 0;
    }
  }

  /**
   * Get user game stats
   */
  async getUserStats(userId) {
    try {
      const userStatsRef = doc(db, 'userStats', userId);
      const userStatsDoc = await getDoc(userStatsRef);
      
      if (userStatsDoc.exists()) {
        const data = userStatsDoc.data();
        const levelInfo = this.getLevelInfo(data.level || 1);
        
        return {
          totalXP: data.totalXP || 0,
          level: data.level || 1,
          levelInfo,
          ...data
        };
      } else {
        // Create initial stats
        const initialStats = {
          totalXP: 0,
          level: 1,
          levelInfo: this.getLevelInfo(1),
          createdAt: serverTimestamp()
        };
        
        await updateDoc(userStatsRef, initialStats, { merge: true });
        return initialStats;
      }
    } catch (error) {
 
      return {
        totalXP: 0,
        level: 1,
        levelInfo: this.getLevelInfo(1)
      };
    }
  }

  /**
   * Generate daily missions
   */
  generateDailyMissions(userLevel = 1) {
    const baseMissions = [
      {
        id: 'daily_checkin',
        title: 'Check In Once',
        description: 'Check in on the map to show your hunger!',
        type: this.MISSION_TYPES.DAILY_CHECKIN,
        target: 1,
        reward: 50,
        icon: '📍'
      },
      {
        id: 'visit_new_truck',
        title: 'Try Something New',
        description: 'Express interest in a truck you haven\'t visited',
        type: this.MISSION_TYPES.VISIT_NEW_TRUCKS,
        target: 1,
        reward: 75,
        icon: '🚚'
      }
    ];
    
    // Add level-appropriate missions
    if (userLevel >= 3) {
      baseMissions.push({
        id: 'preorder_mission',
        title: 'Pre-Order Pro',
        description: 'Place a pre-order to skip the line',
        type: this.MISSION_TYPES.PREORDER_STREAK,
        target: 1,
        reward: 100,
        icon: '⚡'
      });
    }
    
    if (userLevel >= 5) {
      baseMissions.push({
        id: 'explore_areas',
        title: 'Area Explorer',
        description: 'Check in at 3 different locations today',
        type: this.MISSION_TYPES.EXPLORE_AREAS,
        target: 3,
        reward: 150,
        icon: '🗺️'
      });
    }
    
    return baseMissions;
  }

  /**
   * Update mission progress when user performs actions
   * @param {string} userId - User ID
   * @param {string} actionType - Type of action ('checkin', 'preorder', 'review', etc.)
   * @param {number} amount - Amount to add to progress
   */
  async updateMissionProgress(userId, actionType, amount = 1) {
    try {
      let completedMissions = [];
      
      // Get active missions for this user
      const activeMissionsQuery = query(
        collection(db, 'activeMissions'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(activeMissionsQuery);
      
      for (const missionDoc of snapshot.docs) {
        const missionData = missionDoc.data();
        const missionId = missionData.missionId;
        
        // Check if this action applies to this mission
        let shouldProgress = false;
        
        if (missionId === 'daily_checkin' && actionType === 'checkin') {
          shouldProgress = true;
        } else if (missionId === 'express_interest' && actionType === 'express_interest') {
          shouldProgress = true;
        } else if (missionId === 'first_order' && actionType === 'place_order') {
          shouldProgress = true;
        } else if (missionId === 'try_3_trucks' && actionType === 'visit_truck') {
          shouldProgress = true;
        }
        
        if (shouldProgress) {
          const currentProgress = missionData.progress?.current || 0;
          const target = missionData.progress?.target || 1;
          const newProgress = Math.min(currentProgress + amount, target);
          
          // Update progress
          await updateDoc(doc(db, 'activeMissions', missionDoc.id), {
            'progress.current': newProgress,
            updatedAt: serverTimestamp()
          });
          
          // Check if mission is complete
          if (newProgress >= target) {
            const completionResult = await this.completeMission(userId, missionDoc.id, missionData);
            if (completionResult.success) {
              completedMissions.push(completionResult);
            }
          }
        }
      }
      
      return {
        success: true,
        missionCompleted: completedMissions.length > 0 ? completedMissions[0] : null,
        allCompletedMissions: completedMissions
      };
    } catch (error) {

      return { success: false, error: error.message };
    }
  }

  /**
   * Complete a mission and award rewards
   * @param {string} userId - User ID
   * @param {string} activeMissionDocId - Active mission document ID
   * @param {Object} missionData - Mission data
   */
  async completeMission(userId, activeMissionDocId, missionData) {
    try {
      // Get mission details from templates
      const allMissions = this.getAllMissionTemplates();
      const missionTemplate = allMissions.find(m => m.id === missionData.missionId);
      
      if (!missionTemplate) {
        console.warn('Mission template not found:', missionData.missionId);
        return { success: false, error: 'Mission template not found' };
      }
      
      // Award points
      await this.awardPoints(userId, missionTemplate.points);
      
      // Track daily challenge for mission completion
      try {
        const { default: DailyChallengesService } = await import('./DailyChallengesService');
        await DailyChallengesService.trackAction(userId, 'complete_mission');
      } catch (error) {

      }
      
      // Move to completed missions
      await addDoc(collection(db, 'completedMissions'), {
        ...missionData,
        completedAt: serverTimestamp(),
        pointsAwarded: missionTemplate.points,
        status: 'completed'
      });
      
      // Remove from active missions
      await deleteDoc(doc(db, 'activeMissions', activeMissionDocId));
      

      
      return {
        success: true,
        missionTitle: missionTemplate.title,
        pointsAwarded: missionTemplate.points
      };
    } catch (error) {
  
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all active missions for a user (for testing/cleanup)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result
   */
  async clearAllActiveMissions(userId) {
    try {
      const activeMissionsQuery = query(
        collection(db, 'activeMissions'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(activeMissionsQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all(deletePromises);
      
      return { success: true, deletedCount: snapshot.docs.length };
    } catch (error) {
 
      return { success: false, error: error.message };
    }
  }
  // Enhanced Gamification Features
  static ACHIEVEMENTS = {
    FIRST_STEPS: {
      id: 'first_steps',
      title: 'First Steps',
      description: 'Complete your first action',
      icon: '👶',
      points: 50,
      condition: (stats) => stats.totalPoints >= 10
    },
    STREAK_MASTER: {
      id: 'streak_master',
      title: 'Streak Master',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      points: 200,
      condition: (stats) => stats.checkInStreak >= 7
    },
    EXPLORER: {
      id: 'explorer',
      title: 'Explorer',
      description: 'Visit 10 different locations',
      icon: '🗺️',
      points: 150,
      condition: (stats) => stats.uniqueLocations >= 10
    },
    SOCIAL_BUTTERFLY: {
      id: 'social_butterfly',
      title: 'Social Butterfly',
      description: 'Express interest 50 times',
      icon: '🦋',
      points: 300,
      condition: (stats) => stats.expressInterestCount >= 50
    },
    POWER_USER: {
      id: 'power_user',
      title: 'Power User',
      description: 'Reach 1000 total points',
      icon: '⚡',
      points: 500,
      condition: (stats) => stats.totalPoints >= 1000
    },
    EARLY_BIRD: {
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Send 5 pings before 9 AM',
      icon: '🌅',
      points: 100,
      condition: (stats) => stats.earlyBirdActions >= 5
    },
  };

  static COMBO_THRESHOLDS = {
    DOUBLE: { minInterval: 0, maxInterval: 10000, multiplier: 2.0 }, // Within 10 seconds
    TRIPLE: { minInterval: 0, maxInterval: 5000, multiplier: 3.0 },  // Within 5 seconds
    REGULAR: { minInterval: 10000, maxInterval: 60000, multiplier: 1.5 }, // 10-60 seconds
  };

  static getDefaultUserStats() {
    return {
      totalPoints: 0,
      checkInStreak: 0,
      lastCheckIn: null,
      uniqueLocations: 0,
      expressInterestCount: 0,
      earlyBirdActions: 0,
      achievementsUnlocked: [],
      lastActivityAt: null,
      currentCombo: 0,
      lastComboAt: null,
    };
  }

  static async awardPoints(userId, points, reason = 'Activity completed', additionalData = {}) {
    try {
      const userStatsRef = doc(db, 'users', userId, 'gamification', 'stats');
      
      // Check for combo multiplier
      const now = Date.now();
      const comboMultiplier = await this.checkComboMultiplier(userId, now);
      const finalPoints = Math.floor(points * comboMultiplier);
      
      const userDoc = await getDoc(userStatsRef);
      let currentData = userDoc.exists() ? userDoc.data() : this.getDefaultUserStats();
      
      // Update points and track activity
      currentData.totalPoints += finalPoints;
      currentData.lastActivityAt = serverTimestamp();
      
      // Track combo information
      if (comboMultiplier > 1) {
        currentData.currentCombo = (currentData.currentCombo || 0) + 1;
        currentData.lastComboAt = now;
      }
      
      await setDoc(userStatsRef, currentData);
      
      // Check for achievements
      const newAchievements = await this.checkAchievements(userId, currentData);
      
      // Update leaderboards and challenges asynchronously
      setTimeout(async () => {
        try {
          // Dynamically import to avoid circular dependencies
          const { default: LeaderboardService } = await import('./LeaderboardService');
          await LeaderboardService.addPointsToLeaderboard(userId, finalPoints, additionalData.displayName);
          
          const { default: DailyChallengesService } = await import('./DailyChallengesService');
          if (additionalData.actionType) {
            await DailyChallengesService.trackAction(userId, additionalData.actionType, additionalData);
          }
        } catch (error) {
   
        }
      }, 0);
      

      
      return {
        pointsAwarded: finalPoints,
        totalPoints: currentData.totalPoints,
        comboMultiplier,
        achievementsUnlocked: currentData.achievementsUnlocked || [],
        newAchievements
      };
    } catch (error) {
  
      return { pointsAwarded: 0, totalPoints: 0, comboMultiplier: 1 };
    }
  }

  static async checkComboMultiplier(userId, currentTime) {
    try {
      const userStatsRef = doc(db, 'users', userId, 'gamification', 'stats');
      const userDoc = await getDoc(userStatsRef);
      
      if (!userDoc.exists()) return 1;
      
      const userData = userDoc.data();
      const lastActivity = userData.lastComboAt;
      
      if (!lastActivity) return 1;
      
      const timeDiff = currentTime - lastActivity;
      
      // Check combo thresholds
      for (const [key, threshold] of Object.entries(this.COMBO_THRESHOLDS)) {
        if (timeDiff >= threshold.minInterval && timeDiff <= threshold.maxInterval) {
          return threshold.multiplier;
        }
      }
      
      return 1; // No combo
    } catch (error) {
 
      return 1;
    }
  }

  static async checkAchievements(userId, userStats) {
    try {
      const newAchievements = [];
      
      for (const achievement of Object.values(this.ACHIEVEMENTS)) {
        const alreadyUnlocked = userStats.achievementsUnlocked?.includes(achievement.id);
        
        if (!alreadyUnlocked && achievement.condition(userStats)) {
          // Unlock achievement
          userStats.achievementsUnlocked = userStats.achievementsUnlocked || [];
          userStats.achievementsUnlocked.push(achievement.id);
          newAchievements.push(achievement);
          
          // Award achievement points
          userStats.totalPoints += achievement.points;
          
   
        }
      }
      
      if (newAchievements.length > 0) {
        // Update user stats with new achievements
        const userStatsRef = doc(db, 'users', userId, 'gamification', 'stats');
        await setDoc(userStatsRef, userStats);
      }
      
      return newAchievements;
    } catch (error) {

      return [];
    }
  }

  static async getUserPoints(userId) {
    try {
      const userStatsRef = doc(db, 'users', userId, 'gamification', 'stats');
      const userDoc = await getDoc(userStatsRef);
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      
      return this.getDefaultUserStats();
    } catch (error) {
  
      return this.getDefaultUserStats();
    }
  }
}

// Export singleton instance
export default new FoodieGameService();