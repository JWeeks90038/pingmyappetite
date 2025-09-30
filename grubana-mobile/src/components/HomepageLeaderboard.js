import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { useNavigation } from '@react-navigation/native';
import LeaderboardService from '../services/LeaderboardService';
import * as Location from 'expo-location';

const HomepageLeaderboard = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardType, setLeaderboardType] = useState(LeaderboardService.LEADERBOARD_TYPES.WEEKLY_POINTS);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (user) {
      initializeUser();
      loadUserLocation();
      loadLeaderboard();
    }
  }, [user, leaderboardType]);

  const initializeUser = async () => {
    try {
      await LeaderboardService.initializeUserLeaderboard(
        user.uid, 
        user.displayName || 'Anonymous'
      );
    } catch (error) {
      console.error('Failed to initialize user leaderboard:', error);
    }
  };

  const loadUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadLeaderboard = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Update user location in leaderboard if available
      if (userLocation && user) {
        try {
          await LeaderboardService.updateUserLocation(
            user.uid, 
            userLocation, 
            user.displayName || 'Anonymous'
          );
        } catch (locationError) {
          console.warn('Failed to update user location:', locationError);
        }
      }
      
      // Use the smart mixed leaderboard
      const result = await LeaderboardService.getHomepageLeaderboard(
        user.uid, 
        leaderboardType, 
        userLocation
      );

      setLeaderboard(result.leaderboard || []);
      setUserRank(result.userRank);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      // Set empty state instead of crashing
      setLeaderboard([]);
      setUserRank(null);
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderboardEntry = (entry, index) => {
    if (entry.separator) {
      return (
        <View key={`separator-${index}`} style={styles.separator}>
          <Text style={styles.separatorText}>{entry.text}</Text>
        </View>
      );
    }

    const isUser = entry.userId === user?.uid;
    const actualRank = entry.rank || index + 1;
    
    return (
      <View style={[styles.leaderboardEntry, isUser && styles.userEntry]} key={entry.userId || index}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, isUser && styles.userRankText]}>
            #{actualRank}
          </Text>
          {actualRank <= 3 && (
            <Text style={styles.medal}>
              {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'}
            </Text>
          )}
        </View>
        
        <Text style={[styles.playerName, isUser && styles.userPlayerName]} numberOfLines={1}>
          {isUser ? 'You' : (entry.displayName || 'Anonymous')}
        </Text>
        
        <Text style={[styles.playerScore, isUser && styles.userPlayerScore]}>
          {entry.score?.toLocaleString() || '0'}
        </Text>
      </View>
    );
  };

  const getLeaderboardDescription = () => {
    switch (leaderboardType) {
      case LeaderboardService.LEADERBOARD_TYPES.WEEKLY_POINTS:
        return 'Top foodies this week';
      case LeaderboardService.LEADERBOARD_TYPES.ALL_TIME_POINTS:
        return 'All-time food champions';
      case LeaderboardService.LEADERBOARD_TYPES.CHECK_IN_STREAK:
        return 'Longest check-in streaks';
      default:
        return 'Top foodies';
    }
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>🏆 Foodie Leaderboard</Text>
          <Text style={styles.subtitle}>{getLeaderboardDescription()}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('CustomerPing')} // Will open full gamification hub
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Quick Type Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.typeSelector}
        contentContainerStyle={styles.typeSelectorContent}
      >
        {[
          { type: LeaderboardService.LEADERBOARD_TYPES.WEEKLY_POINTS, label: '📅 This Week', icon: '📅' },
          { type: LeaderboardService.LEADERBOARD_TYPES.ALL_TIME_POINTS, label: '👑 All Time', icon: '👑' },
          { type: LeaderboardService.LEADERBOARD_TYPES.CHECK_IN_STREAK, label: '🔥 Streaks', icon: '🔥' },
        ].map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.typeButton,
              leaderboardType === option.type && styles.activeTypeButton
            ]}
            onPress={() => setLeaderboardType(option.type)}
          >
            <Text style={[
              styles.typeButtonText,
              leaderboardType === option.type && styles.activeTypeButtonText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* User's Rank Display */}
      {userRank && userRank.rank > 3 && (
        <View style={styles.userRankBanner}>
          <Text style={styles.userRankText}>
            Your Rank: #{userRank.rank} ({userRank.score.toLocaleString()} points)
          </Text>
        </View>
      )}

      {/* Leaderboard List */}
      <View style={styles.leaderboardContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading leaderboard...</Text>
          </View>
        ) : leaderboard.length > 0 ? (
          leaderboard.map((entry, index) => renderLeaderboardEntry(entry, index))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>🎮 Be the first to earn points!</Text>
            <Text style={styles.emptySubtext}>Send pings and complete missions to join the leaderboard</Text>
          </View>
        )}
      </View>

      {/* Call to Action */}
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => navigation.navigate('CustomerPing')}
      >
        <Text style={styles.actionButtonText}>🚀 Start Earning Points</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginRight: 4,
  },
  typeSelector: {
    paddingHorizontal: 16,
  },
  typeSelectorContent: {
    paddingVertical: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  activeTypeButton: {
    backgroundColor: '#4CAF50',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTypeButtonText: {
    color: '#fff',
  },
  userRankBanner: {
    backgroundColor: '#f8fff8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  userRankText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  leaderboardContainer: {
    paddingHorizontal: 16,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  userEntry: {
    backgroundColor: '#f8fff8',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  userRankText: {
    color: '#4CAF50',
  },
  medal: {
    fontSize: 14,
    marginLeft: 4,
  },
  playerName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  userPlayerName: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  playerScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  userPlayerScore: {
    color: '#4CAF50',
  },
  separator: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  separatorText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  loadingContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  emptyContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomepageLeaderboard;