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
import { useAuth } from './AuthContext';
import FoodieProfileService from '../services/FoodieProfileService';

const { width } = Dimensions.get('window');

const MarkerCustomizationModal = ({ visible, onClose, onMarkerUpdated }) => {
  const { user } = useAuth();
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [currentMarker, setCurrentMarker] = useState('🍽️');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const markerGroups = FoodieProfileService.getAvailableMarkers();

  useEffect(() => {
    if (visible && user) {
      loadUserProfile();
    }
  }, [visible, user]);

  const loadUserProfile = async () => {
    try {
      const profile = await FoodieProfileService.getFoodieProfile(user.uid);
      setUserProfile(profile);
      setCurrentMarker(profile.markerIcon);
      setSelectedMarker(profile.markerIcon);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleSaveMarker = async () => {
    if (!selectedMarker || !user) return;

    setLoading(true);
    try {
      const result = await FoodieProfileService.updateMarkerIcon(
        user.uid, 
        selectedMarker, 
        user.displayName
      );
      
      if (result.success) {
        setCurrentMarker(selectedMarker);
        Alert.alert(
          'Marker Updated! 🎉',
          'Your personalized map marker has been updated. Other foodies will now see your new icon when you check in!',
          [{ text: 'Awesome!', onPress: onClose }]
        );
        
        if (onMarkerUpdated) {
          onMarkerUpdated(selectedMarker);
        }
      } else {
        Alert.alert('Error', 'Could not update marker. Please try again.');
      }
    } catch (error) {
      console.error('Error updating marker:', error);
      Alert.alert('Error', 'Could not update marker. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderMarkerOption = (iconKey, iconLabel, isSelected) => (
    <TouchableOpacity
      key={iconKey}
      style={[styles.markerOption, isSelected && styles.selectedMarker]}
      onPress={() => setSelectedMarker(iconKey)}
    >
      <Text style={styles.markerIcon}>{FoodieProfileService.DEFAULT_MARKERS[iconKey]}</Text>
      <Text style={styles.markerLabel}>{iconLabel}</Text>
    </TouchableOpacity>
  );

  const renderPreview = () => {
    const previewIcon = selectedMarker ? FoodieProfileService.DEFAULT_MARKERS[selectedMarker] : currentMarker;
    const level = userProfile?.level || 1;
    
    return (
      <View style={styles.previewSection}>
        <Text style={styles.previewTitle}>Preview on Map:</Text>
        <View style={styles.previewContainer}>
          <View style={[styles.previewMarker, { borderColor: getPreviewBorderColor(level) }]}>
            <Text style={styles.previewIcon}>{previewIcon}</Text>
            <Text style={styles.previewLevel}>{level}</Text>
          </View>
          <Text style={styles.previewName}>{user.displayName || 'Your Name'}</Text>
        </View>
      </View>
    );
  };

  const getPreviewBorderColor = (level) => {
    if (level >= 10) return '#FFD700'; // Gold
    if (level >= 7) return '#9C27B0';  // Purple
    if (level >= 5) return '#2196F3';  // Blue
    if (level >= 3) return '#4CAF50';  // Green
    return '#FF9800'; // Orange
  };

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
          <Text style={styles.title}>Customize Your Map Marker</Text>
          <TouchableOpacity 
            onPress={handleSaveMarker} 
            style={[styles.saveButton, loading && styles.disabledButton]}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.descriptionSection}>
            <Text style={styles.description}>
              Choose a personalized icon that will represent you on the map when you check in at locations. 
              Other foodies will see your custom marker and level!
            </Text>
          </View>

          {renderPreview()}

          {Object.entries(markerGroups).map(([groupName, markers]) => (
            <View key={groupName} style={styles.markerGroup}>
              <Text style={styles.groupTitle}>{groupName}</Text>
              <View style={styles.markerGrid}>
                {Object.entries(markers).map(([iconKey, iconLabel]) =>
                  renderMarkerOption(iconKey, iconLabel, selectedMarker === iconKey)
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  descriptionSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  previewSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  previewIcon: {
    fontSize: 24,
  },
  previewLevel: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#4CAF50',
    color: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 12,
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#fff',
  },
  previewName: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  markerGroup: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  markerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  markerOption: {
    width: (width - 80) / 3, // 3 columns with padding
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMarker: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e8',
  },
  markerIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  markerLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
});

export default MarkerCustomizationModal;