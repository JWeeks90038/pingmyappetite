import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import FoodieGameService from '../services/FoodieGameService';
import { useAuth } from './AuthContext';

const { width } = Dimensions.get('window');

const FoodiePointsDisplay = ({ style }) => {
  const [userData, setUserData] = useState(null);
  const [badges, setBadges] = useState([]);
  const [showBadges, setShowBadges] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const [points, userBadges] = await Promise.all([
        FoodieGameService.getUserPoints(user.uid),
        FoodieGameService.getUserBadges(user.uid)
      ]);
      
      setUserData(points);
      setBadges(userBadges);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const animatePointsIncrease = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Listen for points updates
  useEffect(() => {
    if (userData?.totalPoints) {
      animatePointsIncrease();
    }
  }, [userData?.totalPoints]);

  const getLevelInfo = (points) => {
    const levels = [
      { min: 0, max: 99, name: 'Foodie Newbie', color: '#4CAF50', icon: '🥗' },
      { min: 100, max: 299, name: 'Taste Explorer', color: '#FF9800', icon: '🍕' },
      { min: 300, max: 599, name: 'Flavor Hunter', color: '#9C27B0', icon: '🍔' },
      { min: 600, max: 999, name: 'Culinary Adventurer', color: '#F44336', icon: '🌮' },
      { min: 1000, max: 1999, name: 'Food Truck Master', color: '#E91E63', icon: '🚚' },
      { min: 2000, max: Infinity, name: 'Legendary Foodie', color: '#FF5722', icon: '👑' }
    ];

    return levels.find(level => points >= level.min && points <= level.max) || levels[0];
  };

  const getProgressToNextLevel = (points) => {
    const currentLevel = getLevelInfo(points);
    if (currentLevel.max === Infinity) return 100;
    
    const progress = ((points - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;
    return Math.min(progress, 100);
  };

  if (!userData) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const currentLevel = getLevelInfo(userData.totalPoints);
  const progress = getProgressToNextLevel(userData.totalPoints);

  return (
    <View style={[styles.container, style]}>
      {/* Main Points Display */}
      <TouchableOpacity
        style={[styles.pointsCard, { backgroundColor: currentLevel.color }]}
        onPress={() => setShowBadges(!showBadges)}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[styles.pointsContent, { transform: [{ scale: pulseAnim }] }]}
        >
          <Text style={styles.levelIcon}>{currentLevel.icon}</Text>
          <View style={styles.pointsInfo}>
            <Text style={styles.pointsValue}>{userData.totalPoints}</Text>
            <Text style={styles.pointsLabel}>Foodie XP</Text>
          </View>
          <Ionicons 
            name={showBadges ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#fff" 
          />
        </Animated.View>
        
        {/* Level Info */}
        <View style={styles.levelInfo}>
          <Text style={styles.levelName}>{currentLevel.name}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>
          {currentLevel.max !== Infinity && (
            <Text style={styles.progressText}>
              {userData.totalPoints}/{currentLevel.max + 1} to next level
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded Badges View */}
      {showBadges && (
        <View style={styles.badgesContainer}>
          <Text style={styles.badgesTitle}>Your Achievements</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.badgesScroll}
          >
            {badges.map((badge, index) => (
              <View key={index} style={styles.badgeCard}>
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
                <Text style={styles.badgeDate}>
                  {new Date(badge.earnedAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
            
            {badges.length === 0 && (
              <View style={styles.noBadges}>
                <Text style={styles.noBadgesText}>
                  Check in to locations to earn your first badge!
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.weeklyPoints || 0}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.checkInStreak || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.uniqueLocations || 0}</Text>
              <Text style={styles.statLabel}>Places Visited</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  pointsCard: {
    borderRadius: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  pointsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelIcon: {
    fontSize: 32,
  },
  pointsInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pointsValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  pointsLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  levelInfo: {
    marginTop: 12,
  },
  levelName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  badgesContainer: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  badgesScroll: {
    marginBottom: 16,
  },
  badgeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
    maxWidth: 120,
  },
  badgeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeDescription: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDate: {
    fontSize: 10,
    color: '#999',
  },
  noBadges: {
    padding: 20,
    alignItems: 'center',
  },
  noBadgesText: {
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default FoodiePointsDisplay;