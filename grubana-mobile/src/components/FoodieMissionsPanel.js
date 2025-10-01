import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import FoodieGameService from '../services/FoodieGameService';
import DailyChallengesService from '../services/DailyChallengesService';
import { useAuth } from './AuthContext';

const { width, height } = Dimensions.get('window');

const FoodieMissionsPanel = ({ visible, onClose, style }) => {
  const [missions, setMissions] = useState([]);
  const [activeMissions, setActiveMissions] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [dailyChallenges, setDailyChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    if (visible && user) {
      loadMissions();
    }
  }, [visible, user]);

  const loadMissions = async () => {
    setLoading(true);
    try {
      const [available, active, completed, challenges] = await Promise.all([
        FoodieGameService.getAvailableMissions(user.uid),
        FoodieGameService.getActiveMissions(user.uid),
        FoodieGameService.getCompletedMissionsToday(user.uid),
        DailyChallengesService.getUserDailyChallenges(user.uid)
      ]);

      
      // Resolve active mission details by matching with available missions
      const resolvedActiveMissions = active.map(activeMission => {
        const missionDetails = available.find(avail => avail.id === activeMission.missionId);
        if (missionDetails) {
          return {
            ...activeMission,
            title: missionDetails.title,
            description: missionDetails.description,
            type: missionDetails.type,
            difficulty: missionDetails.difficulty,
            points: missionDetails.points,
            requirements: missionDetails.requirements
          };
        }
        return activeMission;
      });


      
      setMissions(available);
      setActiveMissions(resolvedActiveMissions);
      setCompletedToday(completed);
      setDailyChallenges(challenges);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleStartMission = async (mission) => {
    try {
      const result = await FoodieGameService.startMission(user.uid, mission.id);
      if (result.success) {
        loadMissions(); // Refresh missions
  
      } else {
 
      }
    } catch (error) {
   
  
    }
  };

  const clearAllMissions = async () => {
    (
      'Clear All Missions',
      'This will remove all active missions. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await FoodieGameService.clearAllActiveMissions(user.uid);
              if (result.success) {
             
                loadMissions(); // Refresh the list
              } else {
             
              }
            } catch (error) {
           
            }
          }
        }
      ]
    );
  };

  const getMissionIcon = (type) => {
    const icons = {
      'location': '📍',
      'social': '👥',
      'variety': '🍽️',
      'timing': '⏰',
      'loyalty': '💖',
      'explorer': '🗺️',
      'streak': '🔥',
      'review': '⭐',
      'referral': '🎁',
      'event': '🎉',
      'daily': '🌅',
      'weekly': '📅',
      'checkin': '✅'
    };
    return icons[type] || '🎯';
  };

  const getMissionDifficulty = (difficulty) => {
    const colors = {
      'easy': '#4CAF50',
      'medium': '#FF9800',
      'hard': '#F44336',
      'expert': '#9C27B0'
    };
    return colors[difficulty] || '#666';
  };

  const formatTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const handleChallengePress = (challenge) => {
    const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);
    const timeLeft = new Date();
    timeLeft.setHours(23, 59, 59, 999); // End of day
    const hoursLeft = Math.ceil((timeLeft - new Date()) / (1000 * 60 * 60));
    
    let actionTips = '';
    switch (challenge.type) {
      case 'maintain_streak':
        actionTips = 'Check in at 2 different locations on the map using the check-in button.';
        break;
      case 'unique_locations':
        actionTips = 'Send pings to 5 different locations around your area. Each ping must be to a new location.';
        break;
      case 'send_pings':
        actionTips = 'Send 8 pings from the main screen to different locations. Each ping helps food trucks know where demand is!';
        break;
      case 'early_ping':
        actionTips = 'Send a ping before 9:00 AM to complete this challenge.';
        break;
      case 'complete_missions':
        actionTips = 'Complete 3 different missions today. Check the missions panel for available tasks.';
        break;
      case 'photo_checkins':
        actionTips = 'Check in at 3 different locations and take verification photos to prove you were there!';
        break;
      case 'rapid_actions':
        actionTips = 'Perform 8 quick actions (pings, check-ins, favorites) within 30 seconds for combo bonuses.';
        break;
      default:
        actionTips = 'Use the app normally and this challenge will progress automatically!';
    }

  
  };

  const renderChallengeCard = (challenge, index) => {
    const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);
    
    return (
      <TouchableOpacity 
        key={challenge.id || index} 
        style={[styles.challengeCard, challenge.completed && styles.challengeCompleted]}
        onPress={() => handleChallengePress(challenge)}
        activeOpacity={0.7}
      >
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeIcon}>{challenge.icon}</Text>
          <View style={styles.challengeInfo}>
            <Text style={[styles.challengeTitle, challenge.completed && styles.completedText]}>
              {challenge.title}
            </Text>
            <Text style={[styles.challengeDescription, challenge.completed && styles.completedText]}>
              {challenge.description}
            </Text>
          </View>
          <View style={styles.challengeReward}>
            <Text style={styles.rewardPoints}>+{challenge.pointReward}</Text>
            <Text style={styles.rewardLabel}>XP</Text>
            {challenge.completed && <Text style={styles.completedBadgeText}>✅</Text>}
          </View>
        </View>
        
        <View style={styles.challengeProgressContainer}>
          <View style={styles.challengeProgressBar}>
            <View style={[styles.challengeProgressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.challengeProgressText}>
            {challenge.progress}/{challenge.target}
          </Text>
          <Ionicons name="information-circle-outline" size={16} color="#666" style={styles.infoIcon} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderMissionCard = (mission, isActive = false, isCompleted = false) => (
    <TouchableOpacity
      key={mission.id}
      style={[
        styles.missionCard,
        isActive && styles.activeMissionCard,
        isCompleted && styles.completedMissionCard
      ]}
      onPress={() => setSelectedMission(mission)}
      disabled={isCompleted}
    >
      <View style={styles.missionHeader}>
        <Text style={styles.missionIcon}>{getMissionIcon(mission.type)}</Text>
        <View style={styles.missionInfo}>
          <Text style={[
            styles.missionTitle,
            isCompleted && styles.completedText
          ]}>
            {mission.title}
          </Text>
          <Text style={[
            styles.missionDescription,
            isCompleted && styles.completedText
          ]}>
            {mission.description}
          </Text>
        </View>
        <View style={styles.missionReward}>
          <Text style={styles.rewardPoints}>+{mission.points}</Text>
          <Text style={styles.rewardLabel}>XP</Text>
        </View>
      </View>

      <View style={styles.missionFooter}>
        <View style={[
          styles.difficultyBadge,
          { backgroundColor: getMissionDifficulty(mission.difficulty) }
        ]}>
          <Text style={styles.difficultyText}>{mission.difficulty}</Text>
        </View>

        {isActive && mission.endTime && (
          <Text style={styles.timeRemaining}>
            {formatTimeRemaining(mission.endTime)}
          </Text>
        )}

        {mission.progress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${(mission.progress.current / mission.progress.target) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {mission.progress.current}/{mission.progress.target}
            </Text>
          </View>
        )}

        {!isActive && !isCompleted && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleStartMission(mission)}
          >
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.completedBadgeText}>Complete</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Foodie Missions</Text>
          <TouchableOpacity onPress={clearAllMissions} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.instructionsSection}>
          <TouchableOpacity 
            style={styles.instructionsToggle}
            onPress={() => setShowInstructions(!showInstructions)}
          >
            <Text style={styles.instructionsTitle}>🎮 How to Earn XP</Text>
            <Ionicons 
              name={showInstructions ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
          
          {showInstructions && (
            <View style={styles.instructionsContent}>
              <Text style={styles.instructionsText}>• Check in on the map to complete location missions</Text>
              <Text style={styles.instructionsText}>• Express interest in food trucks</Text>
              <Text style={styles.instructionsText}>• Place pre-orders to complete social missions</Text>
              <Text style={styles.instructionsText}>• Complete missions to level up and earn badges!</Text>
            </View>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Daily Challenges */}
          {dailyChallenges.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚡ Today's Daily Challenges</Text>
              <Text style={styles.sectionSubtitle}>Complete these for bonus XP!</Text>
              {dailyChallenges.map((challenge, index) => renderChallengeCard(challenge, index))}
            </View>
          )}

          {/* Active Missions */}
          {activeMissions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔥 Active Missions</Text>
              {activeMissions.map(mission => renderMissionCard(mission, true))}
            </View>
          )}

          {/* Completed Today */}
          {completedToday.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ Completed Today</Text>
              {completedToday.map(mission => renderMissionCard(mission, false, true))}
            </View>
          )}

          {/* Available Missions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Available Missions</Text>
            {missions.length > 0 ? (
              missions.map(mission => renderMissionCard(mission))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {loading ? 'Loading missions...' : 'No missions available right now. Check back later!'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Mission Detail Modal */}
        {selectedMission && (
          <Modal
            visible={!!selectedMission}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setSelectedMission(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.detailModal}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailIcon}>
                    {getMissionIcon(selectedMission.type)}
                  </Text>
                  <Text style={styles.detailTitle}>{selectedMission.title}</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedMission(null)}
                    style={styles.detailCloseButton}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.detailDescription}>
                  {selectedMission.description}
                </Text>

                {selectedMission.requirements && (
                  <View style={styles.requirementsSection}>
                    <Text style={styles.requirementsTitle}>Requirements:</Text>
                    {selectedMission.requirements.map((req, index) => (
                      <Text key={index} style={styles.requirementItem}>
                        • {req}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.detailFooter}>
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardValue}>+{selectedMission.points} XP</Text>
                    {selectedMission.badge && (
                      <Text style={styles.badgeReward}>
                        + "{selectedMission.badge}" badge
                      </Text>
                    )}
                  </View>

                  {/* Show progress for active missions */}
                  {selectedMission.status === 'active' && selectedMission.progress && (
                    <View style={styles.modalProgressSection}>
                      <Text style={styles.modalProgressTitle}>Progress:</Text>
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View 
                            style={[
                              styles.progressFill,
                              { width: `${(selectedMission.progress.current / selectedMission.progress.target) * 100}%` }
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {selectedMission.progress.current}/{selectedMission.progress.target}
                        </Text>
                      </View>
                      {selectedMission.progress.current >= selectedMission.progress.target && (
                        <Text style={styles.completionNote}>Mission ready to complete!</Text>
                      )}
                    </View>
                  )}

                  {/* Only show start button for non-active missions */}
                  {selectedMission.status !== 'active' && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: getMissionDifficulty(selectedMission.difficulty) }
                      ]}
                      onPress={() => {
                        handleStartMission(selectedMission);
                        setSelectedMission(null);
                      }}
                    >
                      <Text style={styles.actionButtonText}>Start Mission</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionsSection: {
    backgroundColor: '#f8f9ff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e7ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  instructionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  instructionsContent: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  modalProgressSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  modalProgressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  completionNote: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  missionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeMissionCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    backgroundColor: '#fff8e1',
  },
  completedMissionCard: {
    backgroundColor: '#f1f8e9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  missionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  missionInfo: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  missionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  completedText: {
    color: '#999',
  },
  missionReward: {
    alignItems: 'center',
    marginLeft: 12,
  },
  rewardPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  rewardLabel: {
    fontSize: 12,
    color: '#666',
  },
  missionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeRemaining: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  progressContainer: {
    flex: 1,
    marginLeft: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxWidth: width * 0.9,
    maxHeight: height * 0.7,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  detailTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  detailCloseButton: {
    padding: 4,
  },
  detailDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  requirementsSection: {
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  detailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  badgeReward: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Challenge Card Styles
  challengeCard: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e3e7ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  challengeCompleted: {
    backgroundColor: '#f0f8f0',
    borderColor: '#c8e6c9',
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  challengeIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  challengeReward: {
    alignItems: 'flex-end',
  },
  challengeProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginRight: 12,
  },
  challengeProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  challengeProgressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginRight: 8,
  },
  infoIcon: {
    marginLeft: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
});

export default FoodieMissionsPanel;