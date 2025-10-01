import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import FoodieGameService from '../services/FoodieGameService';
import { useAuth } from './AuthContext';

const { width, height } = Dimensions.get('window');

const FoodieCallOutButton = ({ location, trucksInArea = [], style }) => {
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [hungerLevel, setHungerLevel] = useState('hungry');
  const [timeFrame, setTimeFrame] = useState('now');
  const [selectedFoodTypes, setSelectedFoodTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentCallOuts, setRecentCallOuts] = useState([]);
  const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    if (showModal && user && location) {
      loadRecentCallOuts();
    }
  }, [showModal, user, location]);

  const loadRecentCallOuts = async () => {
    try {
      const callOuts = await FoodieGameService.getRecentCallOuts(location, 24); // Last 24 hours
      setRecentCallOuts(callOuts);
    } catch (error) {

    }
  };

  const hungerLevels = [
    { key: 'browsing', label: 'Just Looking', icon: '👀', urgency: 1 },
    { key: 'interested', label: 'Getting Hungry', icon: '😋', urgency: 2 },
    { key: 'hungry', label: 'Really Hungry', icon: '🤤', urgency: 3 },
    { key: 'starving', label: 'Starving!', icon: '🚨', urgency: 4 }
  ];

  const timeFrames = [
    { key: 'now', label: 'Right Now', minutes: 0 },
    { key: '15min', label: 'Within 15 min', minutes: 15 },
    { key: '30min', label: 'Within 30 min', minutes: 30 },
    { key: '1hour', label: 'Within 1 hour', minutes: 60 },
    { key: 'lunch', label: 'For Lunch (11-2)', minutes: null },
    { key: 'dinner', label: 'For Dinner (5-8)', minutes: null }
  ];

  const foodTypes = [
    { key: 'any', label: 'Any Food', icon: '🍽️' },
    { key: 'mexican', label: 'Mexican', icon: '🌮' },
    { key: 'asian', label: 'Asian', icon: '🍜' },
    { key: 'american', label: 'American', icon: '🍔' },
    { key: 'italian', label: 'Italian', icon: '🍕' },
    { key: 'bbq', label: 'BBQ', icon: '🍖' },
    { key: 'dessert', label: 'Dessert', icon: '🍰' },
    { key: 'healthy', label: 'Healthy', icon: '🥗' },
    { key: 'comfort', label: 'Comfort Food', icon: '🍲' }
  ];

  const handleFoodTypeToggle = (type) => {
    if (type === 'any') {
      setSelectedFoodTypes(['any']);
    } else {
      setSelectedFoodTypes(prev => {
        const filtered = prev.filter(t => t !== 'any');
        if (filtered.includes(type)) {
          return filtered.filter(t => t !== type);
        } else {
          return [...filtered, type];
        }
      });
    }
  };

  const handleSubmitCallOut = async () => {
    if (!user || !location || loading) return;

    if (selectedFoodTypes.length === 0) {
 
      return;
    }

    setLoading(true);

    try {
      // Format location for service
      const locationCoords = {
        latitude: location.coords ? location.coords.latitude : location.latitude,
        longitude: location.coords ? location.coords.longitude : location.longitude
      };

      const callOutData = {
        location: locationCoords,
        message: message.trim(),
        hungerLevel,
        timeFrame,
        foodTypes: selectedFoodTypes,
        urgency: hungerLevels.find(h => h.key === hungerLevel)?.urgency || 2
      };

      const result = await FoodieGameService.submitCallOut(user.uid, callOutData);

      if (result.success) {
        (
          'Call-Out Sent! 📢',
          `Your food request has been sent to nearby trucks. You earned ${result.pointsEarned} XP!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowModal(false);
                resetForm();
              }
            }
          ]
        );
      }
    } catch (error) {

  
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMessage('');
    setHungerLevel('hungry');
    setTimeFrame('now');
    setSelectedFoodTypes([]);
  };

  const getCurrentHungerLevel = () => {
    return hungerLevels.find(h => h.key === hungerLevel) || hungerLevels[2];
  };

  const formatCallOutTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return time.toLocaleDateString();
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.callOutButton, style]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.callOutIcon}>📢</Text>
        <Text style={styles.callOutText}>Call Out for Food</Text>
        <Text style={styles.callOutSubtext}>Let trucks know you're hungry</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Call Out for Food 📢</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Hunger Level Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How hungry are you?</Text>
              <View style={styles.hungerGrid}>
                {hungerLevels.map((level) => (
                  <TouchableOpacity
                    key={level.key}
                    style={[
                      styles.hungerOption,
                      hungerLevel === level.key && styles.selectedHunger
                    ]}
                    onPress={() => setHungerLevel(level.key)}
                  >
                    <Text style={styles.hungerIcon}>{level.icon}</Text>
                    <Text style={styles.hungerLabel}>{level.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Frame Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>When do you want food?</Text>
              <View style={styles.timeGrid}>
                {timeFrames.map((frame) => (
                  <TouchableOpacity
                    key={frame.key}
                    style={[
                      styles.timeOption,
                      timeFrame === frame.key && styles.selectedTime
                    ]}
                    onPress={() => setTimeFrame(frame.key)}
                  >
                    <Text style={styles.timeLabel}>{frame.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Food Type Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What kind of food? (Select all that apply)</Text>
              <View style={styles.foodGrid}>
                {foodTypes.map((food) => (
                  <TouchableOpacity
                    key={food.key}
                    style={[
                      styles.foodOption,
                      selectedFoodTypes.includes(food.key) && styles.selectedFood
                    ]}
                    onPress={() => handleFoodTypeToggle(food.key)}
                  >
                    <Text style={styles.foodIcon}>{food.icon}</Text>
                    <Text style={styles.foodLabel}>{food.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Message */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add a message (optional)</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="e.g., 'Looking for something spicy!' or 'Group of 5 people'"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={200}
              />
              <Text style={styles.characterCount}>{message.length}/200</Text>
            </View>

            {/* Recent Call-Outs in Area */}
            {recentCallOuts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent call-outs in this area</Text>
                <View style={styles.recentCallOuts}>
                  {recentCallOuts.slice(0, 3).map((callOut, index) => (
                    <View key={index} style={styles.recentCallOut}>
                      <Text style={styles.recentCallOutText}>
                        {callOut.foodTypes.join(', ')} • {formatCallOutTime(callOut.timestamp)}
                      </Text>
                      {callOut.message && (
                        <Text style={styles.recentCallOutMessage}>"{callOut.message}"</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Trucks in Area */}
            {trucksInArea.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  🚚 {trucksInArea.length} truck{trucksInArea.length !== 1 ? 's' : ''} nearby
                </Text>
                <Text style={styles.trucksInfo}>
                  Your call-out will be sent to all nearby food trucks
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedFoodTypes.length || loading) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitCallOut}
              disabled={!selectedFoodTypes.length || loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Sending...' : 'Send Call-Out (+15 XP)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  callOutButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    margin: 8,
  },
  callOutIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  callOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  callOutSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 32,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  hungerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hungerOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
  },
  selectedHunger: {
    borderColor: '#FF6B35',
    backgroundColor: '#fff5f0',
  },
  hungerIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  hungerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  timeGrid: {
    gap: 8,
  },
  timeOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
  },
  selectedTime: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  foodOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
    minWidth: '30%',
  },
  selectedFood: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  foodIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  foodLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  messageInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  recentCallOuts: {
    gap: 8,
  },
  recentCallOut: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  recentCallOutText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  recentCallOutMessage: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  trucksInfo: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FoodieCallOutButton;