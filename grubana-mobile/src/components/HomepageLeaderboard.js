import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { useNavigation } from '@react-navigation/native';
import LeaderboardService from '../services/LeaderboardService';
import * as Location from 'expo-location';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';

const HomepageLeaderboard = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardType, setLeaderboardType] = useState(LeaderboardService.LEADERBOARD_TYPES.TOP_TAGGED_PHOTOS);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (user) {
      initializeUser();
      loadUserLocation();
      
      // Set up real-time listener for TOP_TAGGED_PHOTOS, regular fetch for others
      if (leaderboardType === LeaderboardService.LEADERBOARD_TYPES.TOP_TAGGED_PHOTOS) {
        return setupTopTaggedPhotosListener();
      } else {
        loadLeaderboard();
      }
    }
  }, [user, leaderboardType]);

  const initializeUser = async () => {
    try {
      await LeaderboardService.initializeUserLeaderboard(
        user.uid, 
        user.displayName || 'Anonymous'
      );
    } catch (error) {

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
   
    }
  };

  const loadLeaderboard = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // For photo leaderboard, use the new method directly
      if (leaderboardType === LeaderboardService.LEADERBOARD_TYPES.TOP_TAGGED_PHOTOS) {
        const photos = await LeaderboardService.getTopTaggedPhotos();
        setLeaderboard(photos || []);
        setUserRank(null); // Photos don't have traditional ranking
      } else {
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
        
        // Use the smart mixed leaderboard for points-based rankings
        const result = await LeaderboardService.getHomepageLeaderboard(
          user.uid, 
          leaderboardType, 
          userLocation
        );

        setLeaderboard(result.leaderboard || []);
        setUserRank(result.userRank);
      }
    } catch (error) {

      // Set empty state instead of crashing
      setLeaderboard([]);
      setUserRank(null);
    } finally {
      setLoading(false);
    }
  };

  const setupTopTaggedPhotosListener = () => {
    if (!user) return;

    try {
      setLoading(true);


      // Set up real-time listener for foodiePhotos collection
      const photosQuery = query(
        collection(db, 'foodiePhotos'),
        orderBy('timestamp', 'desc'),
        limit(500) // Get recent photos first
      );

      const unsubscribe = onSnapshot(photosQuery, async (snapshot) => {
        try {
 
          
          // Use the LeaderboardService to process the photos
          const photos = await LeaderboardService.getTopTaggedPhotos();
          setLeaderboard(photos || []);
          setUserRank(null); // Photos don't have traditional ranking
          
        } catch (error) {
   
          setLeaderboard([]);
          setUserRank(null);
        } finally {
          setLoading(false);
        }
      }, (error) => {
  
        setLeaderboard([]);
        setUserRank(null);
        setLoading(false);
      });

      // Return cleanup function
      return () => {
      
        unsubscribe();
      };

    } catch (error) {
    
      setLeaderboard([]);
      setUserRank(null);
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
    
    // For photo leaderboard, render differently
    if (leaderboardType === LeaderboardService.LEADERBOARD_TYPES.TOP_TAGGED_PHOTOS && entry.imageUrl) {
      return (
        <View style={[styles.photoEntry, isUser && styles.userEntry]} key={`photo-${entry.id || index}`}>
          <View style={styles.photoContainer}>
            <Image source={{ uri: entry.imageUrl }} style={styles.photoThumbnail} />
            <View style={styles.photoOverlay}>
              <Text style={styles.photoRank}>#{actualRank}</Text>
              {actualRank <= 3 && (
                <Text style={styles.photoMedal}>
                  {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'}
                </Text>
              )}
            </View>
          </View>
          
          <View style={styles.photoInfo}>
            <Text style={[styles.photoUserName, isUser && styles.userPlayerName]} numberOfLines={1}>
              {entry.username || 'Anonymous Foodie'}
            </Text>
            {entry.taggedTruck && (
              <Text style={styles.truckName} numberOfLines={1}>
                🚚 {entry.taggedTruck}
              </Text>
            )}
            <View style={styles.photoStats}>
              <Text style={styles.photoLikes}>❤️ {entry.likeCount || 0}</Text>
            </View>
          </View>
        </View>
      );
    }
    
    // Standard points-based leaderboard entry
    return (
      <View style={[styles.leaderboardEntry, isUser && styles.userEntry]} key={`user-${entry.userId || index}`}>
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
      case LeaderboardService.LEADERBOARD_TYPES.TOP_TAGGED_PHOTOS:
        return 'Most popular tagged photos';
      case LeaderboardService.LEADERBOARD_TYPES.WEEKLY_POINTS:
        return 'Top foodies this week';
      case LeaderboardService.LEADERBOARD_TYPES.ALL_TIME_POINTS:
        return 'All-time food champions';
      case LeaderboardService.LEADERBOARD_TYPES.CHECK_IN_STREAK:
        return 'Longest check-in streaks';
      default:
        return 'Most popular tagged photos';
    }
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>🏆 Kitchen Leaderboard</Text>
          <Text style={styles.subtitle}>{getLeaderboardDescription()}</Text>
        </View>
      </View>



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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1036',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FF4EC9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FF4EC9',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#4DBFFF',
    marginTop: 2,
  },

  userRankBanner: {
    backgroundColor: '#0B0B1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00E676',
  },
  userRankText: {
    fontSize: 12,
    color: '#00E676',
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
    borderBottomColor: '#FF4EC9',
  },
  userEntry: {
    backgroundColor: '#0B0B1A',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#00E676',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userRankText: {
    color: '#00E676',
  },
  medal: {
    fontSize: 14,
    marginLeft: 4,
  },
  playerName: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  userPlayerName: {
    fontWeight: 'bold',
    color: '#00E676',
  },
  playerScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4DBFFF',
  },
  userPlayerScore: {
    color: '#00E676',
  },
  separator: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  separatorText: {
    fontSize: 12,
    color: '#4DBFFF',
    fontStyle: 'italic',
  },
  loadingContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#4DBFFF',
    marginTop: 8,
  },
  emptyContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#4DBFFF',
    textAlign: 'center',
    marginTop: 4,
  },
  // Photo leaderboard styles
  photoEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FF4EC9',
  },
  photoContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoRank: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoMedal: {
    fontSize: 12,
    marginLeft: 2,
  },
  photoInfo: {
    flex: 1,
    marginLeft: 16,
  },
  photoUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  truckName: {
    fontSize: 14,
    color: '#4DBFFF',
    marginTop: 4,
    fontWeight: '500',
  },
  photoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  photoLikes: {
    fontSize: 13,
    color: '#FF4EC9',
    marginRight: 16,
    fontWeight: '600',
  },
  photoDistance: {
    fontSize: 13,
    color: '#4DBFFF',
  },
});

export default HomepageLeaderboard;