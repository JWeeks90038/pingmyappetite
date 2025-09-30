import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, serverTimestamp } from 'firebase/firestore';

class LeaderboardService {
  static LEADERBOARD_TYPES = {
    WEEKLY_POINTS: 'weekly_points',
    MONTHLY_POINTS: 'monthly_points',
    ALL_TIME_POINTS: 'all_time_points',
    CHECK_IN_STREAK: 'check_in_streak',
    MISSIONS_COMPLETED: 'missions_completed',
    LOCATIONS_EXPLORED: 'locations_explored',
  };

  static async updateUserLeaderboardStats(userId, statType, value, displayName = null) {
    try {
      const userLeaderboardRef = doc(db, 'leaderboards', 'users', 'stats', userId);
      
      const userDoc = await getDoc(userLeaderboardRef);
      const currentTime = new Date();
      const weekStart = this.getWeekStart(currentTime);
      const monthStart = this.getMonthStart(currentTime);

      let userData = {
        userId,
        displayName: displayName || 'Anonymous',
        lastUpdated: serverTimestamp(),
      };

      if (userDoc.exists()) {
        userData = { ...userDoc.data(), ...userData };
      }

      // Update the specific stat
      switch (statType) {
        case this.LEADERBOARD_TYPES.ALL_TIME_POINTS:
          userData.allTimePoints = value;
          break;
        case this.LEADERBOARD_TYPES.CHECK_IN_STREAK:
          userData.checkInStreak = value;
          break;
        case this.LEADERBOARD_TYPES.MISSIONS_COMPLETED:
          userData.missionsCompleted = value;
          break;
        case this.LEADERBOARD_TYPES.LOCATIONS_EXPLORED:
          userData.locationsExplored = value;
          break;
      }

      // Update weekly points if this is a points update
      if (statType === this.LEADERBOARD_TYPES.ALL_TIME_POINTS) {
        if (!userData.weeklyStats || userData.weeklyStats.weekStart !== weekStart.toISOString()) {
          userData.weeklyStats = {
            weekStart: weekStart.toISOString(),
            points: 0,
          };
        }
        
        if (!userData.monthlyStats || userData.monthlyStats.monthStart !== monthStart.toISOString()) {
          userData.monthlyStats = {
            monthStart: monthStart.toISOString(),
            points: 0,
          };
        }
      }

      await setDoc(userLeaderboardRef, userData);
      
      // Update global leaderboards
      await this.updateGlobalLeaderboards();
      
    } catch (error) {
      console.error('Error updating leaderboard stats:', error);
    }
  }

  static async addPointsToLeaderboard(userId, points, displayName = null) {
    try {
      // First ensure user is initialized
      await this.initializeUserLeaderboard(userId, displayName);
      
      const userLeaderboardRef = doc(db, 'leaderboards', 'users', 'stats', userId);
      const userDoc = await getDoc(userLeaderboardRef);
      
      const currentTime = new Date();
      const weekStart = this.getWeekStart(currentTime);
      const monthStart = this.getMonthStart(currentTime);

      let userData = {
        userId,
        displayName: displayName || 'Anonymous',
        lastUpdated: serverTimestamp(),
        allTimePoints: points,
      };

      if (userDoc.exists()) {
        const existingData = userDoc.data();
        userData = {
          ...existingData,
          displayName: displayName || existingData.displayName || 'Anonymous',
          allTimePoints: (existingData.allTimePoints || 0) + points,
          lastUpdated: serverTimestamp(),
        };

        // Update weekly stats
        if (!existingData.weeklyStats || existingData.weeklyStats.weekStart !== weekStart.toISOString()) {
          userData.weeklyStats = {
            weekStart: weekStart.toISOString(),
            points: points,
          };
        } else {
          userData.weeklyStats = {
            ...existingData.weeklyStats,
            points: (existingData.weeklyStats.points || 0) + points,
          };
        }

        // Update monthly stats
        if (!existingData.monthlyStats || existingData.monthlyStats.monthStart !== monthStart.toISOString()) {
          userData.monthlyStats = {
            monthStart: monthStart.toISOString(),
            points: points,
          };
        } else {
          userData.monthlyStats = {
            ...existingData.monthlyStats,
            points: (existingData.monthlyStats.points || 0) + points,
          };
        }
      } else {
        userData.weeklyStats = {
          weekStart: weekStart.toISOString(),
          points: points,
        };
        userData.monthlyStats = {
          monthStart: monthStart.toISOString(),
          points: points,
        };
      }

      await setDoc(userLeaderboardRef, userData);
      console.log(`Added ${points} points to leaderboard for user ${userId}`);
      
    } catch (error) {
      console.error('Error adding points to leaderboard:', error);
    }
  }

  static async getLeaderboard(type = this.LEADERBOARD_TYPES.ALL_TIME_POINTS, limitCount = 50) {
    try {
      console.log('Fetching leaderboard for type:', type, 'limit:', limitCount);
      const statsRef = collection(db, 'leaderboards', 'users', 'stats');
      let queryConstraints = [];

      switch (type) {
        case this.LEADERBOARD_TYPES.WEEKLY_POINTS:
          // Simplified approach: get all docs and filter in memory to avoid complex indexing
          queryConstraints = [
            limit(100) // Get more docs to filter
          ];
          break;
        
        case this.LEADERBOARD_TYPES.MONTHLY_POINTS:
          // Simplified approach: get all docs and filter in memory
          queryConstraints = [
            limit(100)
          ];
          break;

        case this.LEADERBOARD_TYPES.ALL_TIME_POINTS:
          queryConstraints = [
            orderBy('allTimePoints', 'desc'),
            limit(limitCount)
          ];
          break;

        case this.LEADERBOARD_TYPES.CHECK_IN_STREAK:
          queryConstraints = [
            limit(100) // Get all and sort in memory
          ];
          break;

        case this.LEADERBOARD_TYPES.MISSIONS_COMPLETED:
          queryConstraints = [
            limit(100)
          ];
          break;

        case this.LEADERBOARD_TYPES.LOCATIONS_EXPLORED:
          queryConstraints = [
            limit(100)
          ];
          break;
      }

      const q = query(statsRef, ...queryConstraints);
      console.log('Executing query with constraints:', queryConstraints.length);
      const querySnapshot = await getDocs(q);
      console.log('Query returned docs:', querySnapshot.size);
      
      const allEntries = [];
      const currentTime = new Date();
      const weekStart = this.getWeekStart(currentTime).toISOString();
      const monthStart = this.getMonthStart(currentTime).toISOString();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let score = 0;
        let shouldInclude = true;
        
        switch (type) {
          case this.LEADERBOARD_TYPES.WEEKLY_POINTS:
            // Filter by current week and get points
            if (data.weeklyStats?.weekStart === weekStart) {
              score = data.weeklyStats.points || 0;
            } else {
              shouldInclude = false;
            }
            break;
          case this.LEADERBOARD_TYPES.MONTHLY_POINTS:
            // Filter by current month and get points
            if (data.monthlyStats?.monthStart === monthStart) {
              score = data.monthlyStats.points || 0;
            } else {
              shouldInclude = false;
            }
            break;
          case this.LEADERBOARD_TYPES.ALL_TIME_POINTS:
            score = data.allTimePoints || 0;
            break;
          case this.LEADERBOARD_TYPES.CHECK_IN_STREAK:
            score = data.checkInStreak || 0;
            break;
          case this.LEADERBOARD_TYPES.MISSIONS_COMPLETED:
            score = data.missionsCompleted || 0;
            break;
          case this.LEADERBOARD_TYPES.LOCATIONS_EXPLORED:
            score = data.locationsExplored || 0;
            break;
        }

        if (shouldInclude && score > 0) {
          allEntries.push({
            userId: data.userId,
            displayName: data.displayName || 'Anonymous',
            score,
          });
        }
      });

      // Sort by score descending and add ranks
      const sortedEntries = allEntries
        .sort((a, b) => b.score - a.score)
        .slice(0, limitCount)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      console.log('Leaderboard built with', sortedEntries.length, 'entries');
      return sortedEntries;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  static async getUserRank(userId, type = this.LEADERBOARD_TYPES.ALL_TIME_POINTS) {
    try {
      const leaderboard = await this.getLeaderboard(type, 1000);
      const userIndex = leaderboard.findIndex(entry => entry.userId === userId);
      
      return userIndex >= 0 ? {
        rank: userIndex + 1,
        score: leaderboard[userIndex].score,
        totalUsers: leaderboard.length,
      } : null;
    } catch (error) {
      console.error('Error getting user rank:', error);
      return null;
    }
  }

  static async getUserNearbyRanks(userId, type = this.LEADERBOARD_TYPES.ALL_TIME_POINTS, range = 5) {
    try {
      const leaderboard = await this.getLeaderboard(type, 1000);
      const userIndex = leaderboard.findIndex(entry => entry.userId === userId);
      
      if (userIndex < 0) return { user: null, nearby: [] };

      const start = Math.max(0, userIndex - range);
      const end = Math.min(leaderboard.length, userIndex + range + 1);
      
      return {
        user: leaderboard[userIndex],
        nearby: leaderboard.slice(start, end),
        totalUsers: leaderboard.length,
      };
    } catch (error) {
      console.error('Error getting nearby ranks:', error);
      return { user: null, nearby: [] };
    }
  }

  static getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  static getMonthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  static async updateGlobalLeaderboards() {
    try {
      // Update global stats for the app
      const globalStatsRef = doc(db, 'leaderboards', 'global');
      
      const allTimeLeaderboard = await this.getLeaderboard(this.LEADERBOARD_TYPES.ALL_TIME_POINTS, 100);
      const weeklyLeaderboard = await this.getLeaderboard(this.LEADERBOARD_TYPES.WEEKLY_POINTS, 100);
      const monthlyLeaderboard = await this.getLeaderboard(this.LEADERBOARD_TYPES.MONTHLY_POINTS, 100);

      await setDoc(globalStatsRef, {
        totalUsers: allTimeLeaderboard.length,
        topWeeklyScore: weeklyLeaderboard[0]?.score || 0,
        topMonthlyScore: monthlyLeaderboard[0]?.score || 0,
        topAllTimeScore: allTimeLeaderboard[0]?.score || 0,
        lastUpdated: serverTimestamp(),
      });

    } catch (error) {
      console.error('Error updating global leaderboards:', error);
    }
  }

  static getLeaderboardTitle(type) {
    const titles = {
      [this.LEADERBOARD_TYPES.WEEKLY_POINTS]: 'This Week',
      [this.LEADERBOARD_TYPES.MONTHLY_POINTS]: 'This Month',
      [this.LEADERBOARD_TYPES.ALL_TIME_POINTS]: 'All Time',
      [this.LEADERBOARD_TYPES.CHECK_IN_STREAK]: 'Longest Streaks',
      [this.LEADERBOARD_TYPES.MISSIONS_COMPLETED]: 'Mission Masters',
      [this.LEADERBOARD_TYPES.LOCATIONS_EXPLORED]: 'Explorers',
    };
    return titles[type] || 'Leaderboard';
  }

  static getLeaderboardIcon(type) {
    const icons = {
      [this.LEADERBOARD_TYPES.WEEKLY_POINTS]: '📅',
      [this.LEADERBOARD_TYPES.MONTHLY_POINTS]: '🗓️',
      [this.LEADERBOARD_TYPES.ALL_TIME_POINTS]: '👑',
      [this.LEADERBOARD_TYPES.CHECK_IN_STREAK]: '🔥',
      [this.LEADERBOARD_TYPES.MISSIONS_COMPLETED]: '🎯',
      [this.LEADERBOARD_TYPES.LOCATIONS_EXPLORED]: '🗺️',
    };
    return icons[type] || '🏆';
  }

  /**
   * Get a smart mixed leaderboard optimized for homepage display
   * Shows top performers + user's nearby competition
   */
  static async getHomepageLeaderboard(userId, type = this.LEADERBOARD_TYPES.WEEKLY_POINTS, userLocation = null) {
    try {
      // Get top 10 global leaders
      const topLeaders = await this.getLeaderboard(type, 10);
      
      // Get user's rank
      const userRank = await this.getUserRank(userId, type);
      
      // If user is in top 10, just return the top leaders
      if (!userRank || userRank.rank <= 10) {
        return {
          leaderboard: topLeaders,
          userRank,
          mixed: false
        };
      }
      
      // User is not in top 10, create mixed leaderboard
      let mixedLeaderboard = topLeaders.slice(0, 8); // Top 8
      
      // Add separator
      mixedLeaderboard.push({
        separator: true,
        text: `... ${userRank.rank - 8 - 1} more players ...`
      });
      
      // Get players around user's rank
      const nearbyRanks = await this.getUserNearbyRanks(userId, type, 3);
      if (nearbyRanks.nearby && nearbyRanks.nearby.length > 0) {
        // Add nearby players, ensuring user is included
        const nearbyPlayers = nearbyRanks.nearby.slice(0, 6); // Limit to 6 nearby
        mixedLeaderboard = mixedLeaderboard.concat(nearbyPlayers);
      }
      
      return {
        leaderboard: mixedLeaderboard,
        userRank,
        mixed: true
      };
      
    } catch (error) {
      console.error('Error getting homepage leaderboard:', error);
      return {
        leaderboard: [],
        userRank: null,
        mixed: false
      };
    }
  }

  /**
   * Update user's location in leaderboard data for potential location-based features
   */
  static async updateUserLocation(userId, location, displayName = null) {
    try {
      const userLeaderboardRef = doc(db, 'leaderboards', 'users', 'stats', userId);
      
      await setDoc(userLeaderboardRef, {
        lastKnownLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: serverTimestamp(),
        },
        displayName: displayName || 'Anonymous',
        lastUpdated: serverTimestamp(),
      }, { merge: true });
      
    } catch (error) {
      console.error('Error updating user location:', error);
    }
  }

  /**
   * Initialize user's leaderboard entry if it doesn't exist
   */
  static async initializeUserLeaderboard(userId, displayName = 'Anonymous') {
    try {
      console.log('Initializing leaderboard for user:', userId);
      
      // Try the main approach first
      const userLeaderboardRef = doc(db, 'leaderboards', 'users', 'stats', userId);
      
      const currentTime = new Date();
      const weekStart = this.getWeekStart(currentTime);
      const monthStart = this.getMonthStart(currentTime);

      const userData = {
        userId,
        displayName,
        allTimePoints: 0,
        checkInStreak: 0,
        missionsCompleted: 0,
        locationsExplored: 0,
        weeklyStats: {
          weekStart: weekStart.toISOString(),
          points: 0,
        },
        monthlyStats: {
          monthStart: monthStart.toISOString(),
          points: 0,
        },
        lastUpdated: serverTimestamp(),
      };

      try {
        await setDoc(userLeaderboardRef, userData, { merge: true });
        console.log('Successfully initialized leaderboard for user:', userId);
        return true;
      } catch (primaryError) {
        console.error('Primary path failed:', primaryError);
        
        // Try fallback in userStats collection
        try {
          const fallbackRef = doc(db, 'userStats', userId);
          await setDoc(fallbackRef, {
            ...userData,
            leaderboardData: userData,
          }, { merge: true });
          console.log('Fallback initialization successful for user:', userId);
          return true;
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          throw fallbackError;
        }
      }
    } catch (error) {
      console.error('Error initializing user leaderboard:', error);
      throw error;
    }
  }
}

export default LeaderboardService;