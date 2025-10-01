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
    TOP_TAGGED_PHOTOS: 'top_tagged_photos',
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

      
    } catch (error) {

    }
  }

  static async getLeaderboard(type = this.LEADERBOARD_TYPES.ALL_TIME_POINTS, limitCount = 50) {
    try {
  
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
   
      const querySnapshot = await getDocs(q);
  
      
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

    
      return sortedEntries;
    } catch (error) {
 
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

    }
  }

  /**
   * Initialize user's leaderboard entry if it doesn't exist
   */
  static async initializeUserLeaderboard(userId, displayName = 'Anonymous') {
    try {

      
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
     
        return true;
      } catch (primaryError) {
    
        
        // Try fallback in userStats collection
        try {
          const fallbackRef = doc(db, 'userStats', userId);
          await setDoc(fallbackRef, {
            ...userData,
            leaderboardData: userData,
          }, { merge: true });
    
          return true;
        } catch (fallbackError) {

          throw fallbackError;
        }
      }
    } catch (error) {
 
      throw error;
    }
  }

  /**
   * Get top tagged photos from foodies within radius
   * @param {Object} userLocation - User's location {latitude, longitude}
   * @param {number} radiusMiles - Search radius in miles (default 50)
   * @param {number} limitCount - Number of photos to return (default 10)
   * @returns {Promise<Array>} Top tagged photos with user info
   */
  static async getTopTaggedPhotos(userLocation = null, radiusMiles = 50, limitCount = 10) {
    try {

      
      // Get all photos, then filter for those with truck tags
      const photosQuery = query(
        collection(db, 'foodiePhotos'),
        orderBy('timestamp', 'desc'),
        limit(500) // Get recent photos first, then we'll sort by likes
      );

      const photosSnapshot = await getDocs(photosQuery);
      let allTaggedPhotos = photosSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.seconds ? doc.data().timestamp.seconds * 1000 : Date.now()
        }))
        .filter(photo => {
          // Filter for tagged photos - handle different data types
          if (!photo.taggedTruck) return false;
          
          // Debug log to see the actual data structure

          
          if (typeof photo.taggedTruck === 'string') {
            return photo.taggedTruck.trim() !== '';
          }
          if (typeof photo.taggedTruck === 'object' && photo.taggedTruck.name) {
            return photo.taggedTruck.name.trim() !== '';
          }
          return true; // Include if it exists but is not a string or object with name
        });

 

      // Get likes for each photo
      const photosWithLikes = await Promise.all(
        allTaggedPhotos.map(async (photo) => {
          try {
            const likesQuery = query(
              collection(db, 'photoLikes'),
              where('photoId', '==', photo.id)
            );
            const likesSnapshot = await getDocs(likesQuery);
            const likeCount = likesSnapshot.size;
            
            return {
              ...photo,
              likeCount: likeCount || 0
            };
          } catch (error) {
      
            return {
              ...photo,
              likeCount: 0
            };
          }
        })
      );

      // Filter by location if provided
      let filteredPhotos = photosWithLikes;
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        filteredPhotos = photosWithLikes.filter(photo => {
          if (!photo.location || !photo.location.latitude || !photo.location.longitude) {
            return false;
          }

          const distance = this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            photo.location.latitude,
            photo.location.longitude
          );

          return distance <= radiusMiles;
        });
        
   
      }

      // Sort by likes (descending) and recency as tiebreaker
      const sortedPhotos = filteredPhotos.sort((a, b) => {
        if (b.likeCount !== a.likeCount) {
          return b.likeCount - a.likeCount; // More likes first
        }
        return b.timestamp - a.timestamp; // More recent first as tiebreaker
      });

      // Get user info for each photo
      const topPhotos = await Promise.all(
        sortedPhotos.slice(0, limitCount).map(async (photo, index) => {
          try {
            // Get user info from users collection
            const userQuery = query(
              collection(db, 'users'),
              where('__name__', '==', photo.userId)
            );
            const userSnapshot = await getDocs(userQuery);
            
            let userInfo = {
              username: 'Anonymous Foodie',
              profileImageUrl: null
            };

            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              userInfo = {
                username: userData.username || userData.displayName || 'Anonymous Foodie',
                profileImageUrl: userData.profileImageUrl || userData.profilePhotoURL || userData.photoURL || null
              };
            }

            return {
              id: photo.id,
              imageUrl: photo.imageUrl,
              taggedTruck: this.extractTruckName(photo.taggedTruck),
              likeCount: photo.likeCount,
              timestamp: photo.timestamp,
              location: photo.location,
              rank: index + 1,
              userId: photo.userId,
              ...userInfo
            };
          } catch (error) {
      
            return {
              id: photo.id,
              imageUrl: photo.imageUrl,
              taggedTruck: this.extractTruckName(photo.taggedTruck),
              likeCount: photo.likeCount,
              timestamp: photo.timestamp,
              location: photo.location,
              rank: index + 1,
              userId: photo.userId,
              username: 'Anonymous Foodie',
              profileImageUrl: null
            };
          }
        })
      );

 
      return topPhotos;

    } catch (error) {
 
      return [];
    }
  }

  /**
   * Extract truck name from various data formats
   * @param {string|object} taggedTruck - Tagged truck data
   * @returns {string} Truck name
   */
  static extractTruckName(taggedTruck) {
    if (!taggedTruck) return 'Unknown Truck';
    
    if (typeof taggedTruck === 'string') {
      return taggedTruck.trim() || 'Unknown Truck';
    }
    
    if (typeof taggedTruck === 'object') {
      // Try various possible property names
      const possibleNames = [
        taggedTruck.name,
        taggedTruck.truckName,
        taggedTruck.businessName,
        taggedTruck.title,
        taggedTruck.displayName
      ];
      
      for (const name of possibleNames) {
        if (name && typeof name === 'string' && name.trim()) {
          return name.trim();
        }
      }
      
      // If it's an object but no recognizable name property, try to stringify it
      try {
        const stringified = JSON.stringify(taggedTruck);
        if (stringified && stringified !== '{}' && stringified !== 'null') {
          return stringified.length > 50 ? 'Tagged Truck' : stringified;
        }
      } catch (e) {
        // Ignore JSON stringify errors
      }
    }
    
    return 'Unknown Truck';
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in miles
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in miles
    return Math.round(d * 10) / 10; // Round to 1 decimal place
  }
}

export default LeaderboardService;