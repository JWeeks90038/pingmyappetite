import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import FoodieGameService from './FoodieGameService';

class DailyChallengesService {
  static DAILY_CHALLENGES = {
    PING_EXPLORER: {
      id: 'ping_explorer',
      title: 'Ping Explorer',
      description: 'Send pings to 5 different locations',
      icon: '🗺️',
      target: 5,
      pointReward: 80,
      type: 'unique_locations',
    },
    SOCIAL_BUTTERFLY: {
      id: 'social_butterfly',
      title: 'Social Butterfly',
      description: 'Send 8 pings to different locations',
      icon: '🦋',
      target: 8,
      pointReward: 120,
      type: 'send_pings',
    },
    EARLY_BIRD: {
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Send a ping before 9 AM',
      icon: '🌅',
      target: 1,
      pointReward: 60,
      type: 'early_ping',
    },
    FOODIE_STREAK: {
      id: 'foodie_streak',
      title: 'Foodie Streak',
      description: 'Check in at 2 different locations',
      icon: '🔥',
      target: 2,
      pointReward: 40,
      type: 'maintain_streak',
    },
    MISSION_MASTER: {
      id: 'mission_master',
      title: 'Mission Master',
      description: 'Complete 3 missions today',
      icon: '🎯',
      target: 3,
      pointReward: 180,
      type: 'complete_missions',
    },
    GENUINE_FOODIE: {
      id: 'genuine_foodie',
      title: 'Genuine Foodie',
      description: 'Check in at 3 locations and take verification photos',
      icon: '📸',
      target: 3,
      pointReward: 150,
      type: 'photo_checkins',
    },
    SPEED_DEMON: {
      id: 'speed_demon',
      title: 'Speed Demon',
      description: 'Complete 8 actions within 30 seconds',
      icon: '⚡',
      target: 8,
      pointReward: 250,
      type: 'rapid_actions',
    },
  };

  static async generateDailyChallenges(userId) {
    const today = new Date().toISOString().split('T')[0];
    const userChallengesRef = doc(db, 'users', userId, 'dailyChallenges', today);

    try {
      const existingChallenges = await getDoc(userChallengesRef);
      
      if (existingChallenges.exists()) {
        return existingChallenges.data().challenges;
      }

      // Generate 3 random challenges for today
      const allChallenges = Object.values(this.DAILY_CHALLENGES);
      const selectedChallenges = [];
      
      // Always include one easy challenge (maintain_streak)
      selectedChallenges.push({
        ...this.DAILY_CHALLENGES.FOODIE_STREAK,
        progress: 0,
        completed: false,
        completedAt: null,
      });

      // Add 2 more random challenges
      const remainingChallenges = allChallenges.filter(c => c.id !== 'foodie_streak');
      const shuffled = remainingChallenges.sort(() => 0.5 - Math.random());
      
      selectedChallenges.push(
        {
          ...shuffled[0],
          progress: 0,
          completed: false,
          completedAt: null,
        },
        {
          ...shuffled[1],
          progress: 0,
          completed: false,
          completedAt: null,
        }
      );

      // Save to Firestore
      await setDoc(userChallengesRef, {
        date: today,
        challenges: selectedChallenges,
        createdAt: serverTimestamp(),
      });

      return selectedChallenges;
    } catch (error) {
    
      return [];
    }
  }

  static async getUserDailyChallenges(userId) {
    const today = new Date().toISOString().split('T')[0];
    const userChallengesRef = doc(db, 'users', userId, 'dailyChallenges', today);

    try {
      const doc = await getDoc(userChallengesRef);
      if (doc.exists()) {
        return doc.data().challenges;
      }
      
      // Generate new challenges if none exist
      return await this.generateDailyChallenges(userId);
    } catch (error) {

      return [];
    }
  }

  static async updateChallengeProgress(userId, challengeType, incrementBy = 1, additionalData = {}) {
    const today = new Date().toISOString().split('T')[0];
    const userChallengesRef = doc(db, 'users', userId, 'dailyChallenges', today);

    try {
      const challengesDoc = await getDoc(userChallengesRef);
      if (!challengesDoc.exists()) {
        await this.generateDailyChallenges(userId);
        return;
      }

      const challengesData = challengesDoc.data();
      const challenges = challengesData.challenges;
      let updated = false;
      let completedChallenges = [];

      for (let i = 0; i < challenges.length; i++) {
        const challenge = challenges[i];
        
        if (challenge.type === challengeType && !challenge.completed) {
          // Special handling for different challenge types
          let shouldIncrement = true;
          
          if (challengeType === 'early_ping') {
            const now = new Date();
            shouldIncrement = now.getHours() < 9;
          } else if (challengeType === 'unique_locations') {
            // Only increment if this is a new location
            shouldIncrement = additionalData.isNewLocation;
          } else if (challengeType === 'send_pings') {
            // Any ping counts for social butterfly
            shouldIncrement = true;
          } else if (challengeType === 'photo_checkins') {
            // Only count photo verifications
            shouldIncrement = additionalData.hasPhoto || false;
          } else if (challengeType === 'rapid_actions') {
            // Check if actions are within 30 seconds
            shouldIncrement = additionalData.isRapidAction;
          }

          if (shouldIncrement) {
            challenges[i].progress += incrementBy;
            
            // Check if challenge is completed
            if (challenges[i].progress >= challenge.target) {
              challenges[i].completed = true;
              challenges[i].completedAt = serverTimestamp();
              completedChallenges.push(challenge);
              
              // Award points
              await FoodieGameService.awardPoints(
                userId,
                challenge.pointReward,
                `Daily Challenge: ${challenge.title}`
              );
            }
            
            updated = true;
          }
        }
      }

      if (updated) {
        await updateDoc(userChallengesRef, { challenges });
        
        // Return completed challenges for UI feedback
        if (completedChallenges.length > 0) {
          return { completedChallenges };
        }
      }

      return { updated };
    } catch (error) {

      return { error };
    }
  }

  static async getChallengeStats(userId, days = 7) {
    const stats = {
      totalChallengesCompleted: 0,
      streakDays: 0,
      totalPointsEarned: 0,
      favoriteChallenge: null,
    };

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const challengeCompletions = {};
      let consecutiveStreak = 0;
      let currentDate = new Date(endDate);

      // Check each day for completed challenges
      for (let i = 0; i < days; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const userChallengesRef = doc(db, 'users', userId, 'dailyChallenges', dateStr);
        
        try {
          const challengesDoc = await getDoc(userChallengesRef);
          if (challengesDoc.exists()) {
            const challenges = challengesDoc.data().challenges;
            const completedToday = challenges.filter(c => c.completed);
            
            if (completedToday.length > 0) {
              stats.totalChallengesCompleted += completedToday.length;
              
              // Calculate points earned
              completedToday.forEach(challenge => {
                stats.totalPointsEarned += challenge.pointReward;
                challengeCompletions[challenge.id] = (challengeCompletions[challenge.id] || 0) + 1;
              });
              
              // Update streak if this is consecutive
              if (i === consecutiveStreak) {
                consecutiveStreak++;
              }
            }
          }
        } catch (error) {
    
        }

        currentDate.setDate(currentDate.getDate() - 1);
      }

      stats.streakDays = consecutiveStreak;

      // Find favorite challenge
      if (Object.keys(challengeCompletions).length > 0) {
        const mostCompleted = Object.entries(challengeCompletions)
          .reduce((a, b) => challengeCompletions[a[0]] > challengeCompletions[b[0]] ? a : b);
        stats.favoriteChallenge = {
          id: mostCompleted[0],
          completions: mostCompleted[1],
          title: this.DAILY_CHALLENGES[mostCompleted[0]]?.title || 'Unknown Challenge'
        };
      }

      return stats;
    } catch (error) {
  
      return stats;
    }
  }

  // Helper method to track challenge-relevant actions
  static async trackAction(userId, actionType, metadata = {}) {
    const actionMappings = {
      'send_ping': ['unique_locations', 'send_pings', 'early_ping', 'rapid_actions'],
      'express_interest': ['rapid_actions'],
      'photo_verification': ['photo_checkins', 'rapid_actions'],
      'complete_mission': ['mission_master'],
      'maintain_streak': ['maintain_streak'],
    };

    const relevantChallenges = actionMappings[actionType] || [];
    
    for (const challengeType of relevantChallenges) {
      await this.updateChallengeProgress(userId, challengeType, 1, metadata);
    }
  }
}

export default DailyChallengesService;