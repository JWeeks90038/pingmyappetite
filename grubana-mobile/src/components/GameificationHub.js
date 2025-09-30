import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import DailyChallengesService from '../services/DailyChallengesService';
import LeaderboardService from '../services/LeaderboardService';
import PhotoGallery from './PhotoGallery';
import MarkerCustomizationModal from './MarkerCustomizationModal';

const GameificationHub = () => {
  const { user } = useAuth();
  const [showHub, setShowHub] = useState(false);
  const [activeTab, setActiveTab] = useState('challenges');
  const [dailyChallenges, setDailyChallenges] = useState([]);
  const [leaderboards, setLeaderboards] = useState({});
  const [userRanks, setUserRanks] = useState({});
  const [challengeStats, setChallengeStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState(LeaderboardService.LEADERBOARD_TYPES.ALL_TIME_POINTS);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showMarkerCustomization, setShowMarkerCustomization] = useState(false);

  useEffect(() => {
    if (user && showHub) {
      loadData();
    }
  }, [user, showHub]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadDailyChallenges(),
        loadLeaderboards(),
        loadChallengeStats(),
      ]);
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadDailyChallenges = async () => {
    try {
      const challenges = await DailyChallengesService.getUserDailyChallenges(user.uid);
      setDailyChallenges(challenges);
    } catch (error) {
      console.error('Error loading daily challenges:', error);
    }
  };

  const loadLeaderboards = async () => {
    try {
      const leaderboardTypes = Object.values(LeaderboardService.LEADERBOARD_TYPES);
      const leaderboardData = {};
      const rankData = {};

      for (const type of leaderboardTypes) {
        const [leaderboard, userRank] = await Promise.all([
          LeaderboardService.getLeaderboard(type, 10),
          LeaderboardService.getUserRank(user.uid, type),
        ]);
        
        leaderboardData[type] = leaderboard;
        rankData[type] = userRank;
      }

      setLeaderboards(leaderboardData);
      setUserRanks(rankData);
    } catch (error) {
      console.error('Error loading leaderboards:', error);
    }
  };

  const loadChallengeStats = async () => {
    try {
      const stats = await DailyChallengesService.getChallengeStats(user.uid, 7);
      setChallengeStats(stats);
    } catch (error) {
      console.error('Error loading challenge stats:', error);
    }
  };

  const renderChallengeProgress = (challenge) => {
    const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);
    
    return (
      <View style={[styles.challengeCard, challenge.completed && styles.challengeCompleted]}>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeIcon}>{challenge.icon}</Text>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <Text style={styles.challengeDescription}>{challenge.description}</Text>
          </View>
          <View style={styles.challengeReward}>
            <Text style={styles.rewardText}>+{challenge.pointReward} XP</Text>
            {challenge.completed && <Text style={styles.completedIcon}>✅</Text>}
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {challenge.progress}/{challenge.target}
          </Text>
        </View>
      </View>
    );
  };

  const renderLeaderboardEntry = (entry, index) => {
    const isUser = entry.userId === user.uid;
    
    return (
      <View style={[styles.leaderboardEntry, isUser && styles.userEntry]} key={entry.userId}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, isUser && styles.userRankText]}>
            #{entry.rank}
          </Text>
          {index < 3 && (
            <Text style={styles.medal}>
              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
            </Text>
          )}
        </View>
        
        <Text style={[styles.playerName, isUser && styles.userPlayerName]}>
          {isUser ? 'You' : entry.displayName}
        </Text>
        
        <Text style={[styles.playerScore, isUser && styles.userPlayerScore]}>
          {entry.score.toLocaleString()}
        </Text>
      </View>
    );
  };

  const renderChallengesTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} />
      }
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Challenges</Text>
        <Text style={styles.sectionSubtitle}>Complete to earn bonus XP!</Text>
      </View>

      {dailyChallenges.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No challenges available today!</Text>
          <Text style={styles.emptyStateSubtext}>Check back tomorrow for new challenges</Text>
        </View>
      )}

      {dailyChallenges.map((challenge, index) => (
        <View key={challenge.id || index}>
          {renderChallengeProgress(challenge)}
        </View>
      ))}

      {challengeStats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Your Challenge Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{challengeStats.totalChallengesCompleted}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{challengeStats.streakDays}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{challengeStats.totalPointsEarned}</Text>
              <Text style={styles.statLabel}>Bonus XP</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowMarkerCustomization(true)}
        >
          <Ionicons name="location" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Customize Map Marker</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.photoGalleryButton]}
          onPress={() => setShowPhotoGallery(true)}
        >
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Photo Gallery</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderLeaderboardsTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} />
      }
    >
      <View style={styles.leaderboardSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.values(LeaderboardService.LEADERBOARD_TYPES).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.leaderboardTab,
                selectedLeaderboard === type && styles.activeLeaderboardTab
              ]}
              onPress={() => setSelectedLeaderboard(type)}
            >
              <Text style={styles.leaderboardTabIcon}>
                {LeaderboardService.getLeaderboardIcon(type)}
              </Text>
              <Text style={[
                styles.leaderboardTabText,
                selectedLeaderboard === type && styles.activeLeaderboardTabText
              ]}>
                {LeaderboardService.getLeaderboardTitle(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.leaderboardContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {LeaderboardService.getLeaderboardIcon(selectedLeaderboard)} {' '}
            {LeaderboardService.getLeaderboardTitle(selectedLeaderboard)} Leaderboard
          </Text>
          {userRanks[selectedLeaderboard] && (
            <Text style={styles.userRankBadge}>
              Your Rank: #{userRanks[selectedLeaderboard].rank} of {userRanks[selectedLeaderboard].totalUsers}
            </Text>
          )}
        </View>

        {leaderboards[selectedLeaderboard]?.map((entry, index) => 
          renderLeaderboardEntry(entry, index)
        )}

        {(!leaderboards[selectedLeaderboard] || leaderboards[selectedLeaderboard].length === 0) && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No rankings available yet!</Text>
            <Text style={styles.emptyStateSubtext}>Be the first to earn points</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const completedChallenges = dailyChallenges.filter(c => c.completed).length;
  const totalChallenges = dailyChallenges.length;

  return (
    <>
      <TouchableOpacity 
        style={styles.hubButton}
        onPress={() => setShowHub(true)}
      >
        <Text style={styles.hubButtonIcon}>🎮</Text>
        <View style={styles.hubButtonInfo}>
          <Text style={styles.hubButtonText}>Challenges & Rankings</Text>
          {totalChallenges > 0 && (
            <Text style={styles.hubButtonBadge}>
              {completedChallenges}/{totalChallenges} completed
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.hubButton, styles.photoGalleryButton]}
        onPress={() => setShowPhotoGallery(true)}
      >
        <Text style={styles.hubButtonIcon}>📸</Text>
        <View style={styles.hubButtonInfo}>
          <Text style={styles.hubButtonText}>My Food Truck Adventures</Text>
          <Text style={styles.hubButtonBadge}>Photo verification gallery</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={showHub}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHub(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowHub(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Gamification Hub</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'challenges' && styles.activeTab]}
              onPress={() => setActiveTab('challenges')}
            >
              <Text style={[styles.tabText, activeTab === 'challenges' && styles.activeTabText]}>
                🎯 Challenges
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'leaderboards' && styles.activeTab]}
              onPress={() => setActiveTab('leaderboards')}
            >
              <Text style={[styles.tabText, activeTab === 'leaderboards' && styles.activeTabText]}>
                🏆 Rankings
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'challenges' ? renderChallengesTab() : renderLeaderboardsTab()}
        </View>
      </Modal>

      <PhotoGallery 
        isVisible={showPhotoGallery}
        onClose={() => setShowPhotoGallery(false)}
      />

      <MarkerCustomizationModal
        visible={showMarkerCustomization}
        onClose={() => setShowMarkerCustomization(false)}
        onMarkerUpdated={(newMarker) => {
          // Could refresh user data here if needed
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  hubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hubButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  hubButtonInfo: {
    flex: 1,
  },
  hubButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  hubButtonBadge: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  photoGalleryButton: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  photoGalleryButton: {
    backgroundColor: '#e8f5e8',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  sectionHeader: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  challengeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  challengeCompleted: {
    backgroundColor: '#f8fff8',
    borderLeftColor: '#66BB6A',
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  challengeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  challengeReward: {
    alignItems: 'flex-end',
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  completedIcon: {
    fontSize: 20,
    marginTop: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  leaderboardSelector: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  leaderboardTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  activeLeaderboardTab: {
    backgroundColor: '#4CAF50',
  },
  leaderboardTabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  leaderboardTabText: {
    fontSize: 12,
    color: '#666',
  },
  activeLeaderboardTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  leaderboardContainer: {
    flex: 1,
  },
  userRankBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userEntry: {
    backgroundColor: '#f8fff8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
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
    fontSize: 16,
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
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#999',
  },
  actionButtonsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  photoGalleryButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GameificationHub;