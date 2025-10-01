import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import FoodieGameService from '../services/FoodieGameService';

const EnhancedPointsDisplay = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [comboAnimation] = useState(new Animated.Value(0));
  const [achievementAnimation] = useState(new Animated.Value(0));
  const [recentCombo, setRecentCombo] = useState(null);
  const [recentAchievement, setRecentAchievement] = useState(null);

  useEffect(() => {
    if (user) {
      loadUserStats();
      // Listen for real-time updates
      const interval = setInterval(loadUserStats, 2000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      const stats = await FoodieGameService.getUserPoints(user.uid);
      setUserStats(stats);
    } catch (error) {
 
    }
  };

  const getCurrentLevel = () => {
    if (!userStats?.totalPoints) return 1;
    return Math.floor(userStats.totalPoints / 100) + 1;
  };

  const getProgressToNextLevel = () => {
    if (!userStats?.totalPoints) return 0;
    const currentLevel = getCurrentLevel();
    const pointsForCurrentLevel = (currentLevel - 1) * 100;
    const pointsForNextLevel = currentLevel * 100;
    const progress = userStats.totalPoints - pointsForCurrentLevel;
    const maxProgress = pointsForNextLevel - pointsForCurrentLevel;
    return (progress / maxProgress) * 100;
  };

  const showComboEffect = (comboMessage) => {
    setRecentCombo(comboMessage);
    Animated.sequence([
      Animated.timing(comboAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(comboAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setRecentCombo(null));
  };

  const showAchievementEffect = (achievement) => {
    setRecentAchievement(achievement);
    Animated.sequence([
      Animated.timing(achievementAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(achievementAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => setRecentAchievement(null));
  };

  if (!userStats) return null;

  const currentLevel = getCurrentLevel();
  const progressPercent = getProgressToNextLevel();

  return (
    <View style={styles.container}>
      {/* Main Points Display */}
      <TouchableOpacity 
        style={styles.pointsContainer}
        onPress={() => setShowAchievements(true)}
      >
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LV {currentLevel}</Text>
        </View>
        
        <View style={styles.pointsInfo}>
          <Text style={styles.pointsText}>{userStats.totalPoints || 0} XP</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Streak indicator */}
        {userStats.checkInStreak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {userStats.checkInStreak}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Combo Effect */}
      {recentCombo && (
        <Animated.View 
          style={[
            styles.comboEffect,
            {
              opacity: comboAnimation,
              transform: [
                {
                  scale: comboAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.2]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={styles.comboText}>⚡ {recentCombo}</Text>
        </Animated.View>
      )}

      {/* Achievement Popup */}
      {recentAchievement && (
        <Animated.View 
          style={[
            styles.achievementPopup,
            {
              opacity: achievementAnimation,
              transform: [
                {
                  translateY: achievementAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={styles.achievementIcon}>{recentAchievement.icon}</Text>
          <Text style={styles.achievementTitle}>Achievement Unlocked!</Text>
          <Text style={styles.achievementName}>{recentAchievement.title}</Text>
          <Text style={styles.achievementPoints}>+{recentAchievement.points} XP</Text>
        </Animated.View>
      )}

      {/* Achievements Modal */}
      <Modal
        visible={showAchievements}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAchievements(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAchievements(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Your Achievements</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.achievementsList}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{userStats.totalPoints || 0}</Text>
                <Text style={styles.statLabel}>Total XP</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{currentLevel}</Text>
                <Text style={styles.statLabel}>Level</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{userStats.checkInStreak || 0}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{userStats.uniqueLocations || 0}</Text>
                <Text style={styles.statLabel}>Locations</Text>
              </View>
            </View>

            <View style={styles.achievementGrid}>
              {Object.values(FoodieGameService.ACHIEVEMENTS).map((achievement) => {
                const unlocked = userStats.achievementsUnlocked?.includes(achievement.id);
                return (
                  <View 
                    key={achievement.id}
                    style={[styles.achievementCard, unlocked && styles.achievementUnlocked]}
                  >
                    <Text style={styles.achievementCardIcon}>
                      {unlocked ? achievement.icon : '🔒'}
                    </Text>
                    <Text style={styles.achievementCardTitle}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementCardPoints}>
                      {achievement.points} XP
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  levelBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pointsInfo: {
    flex: 1,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  streakBadge: {
    marginLeft: 8,
  },
  streakText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  comboEffect: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  comboText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  achievementPopup: {
    position: 'absolute',
    top: -60,
    left: 16,
    right: 16,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  achievementIcon: {
    fontSize: 30,
    marginBottom: 4,
  },
  achievementTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  achievementName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  achievementPoints: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  achievementsList: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#eee',
  },
  achievementUnlocked: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  achievementCardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  achievementCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  achievementCardPoints: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
});

export default EnhancedPointsDisplay;