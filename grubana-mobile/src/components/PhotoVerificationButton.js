import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import PhotoVerificationService from '../services/PhotoVerificationService';
import FoodieGameService from '../services/FoodieGameService';
import DailyChallengesService from '../services/DailyChallengesService';

const PhotoVerificationButton = ({ location, onPhotoTaken, style }) => {
  const { user } = useAuth();
  const [takingPhoto, setTakingPhoto] = useState(false);

  const handleTakePhoto = async () => {
    if (!user || !location || takingPhoto) return;


  };

  const takeVerificationPhoto = async () => {
    setTakingPhoto(true);
    
    try {
      // Use current location or default info
      const locationCoords = {
        latitude: location.coords ? location.coords.latitude : location.latitude,
        longitude: location.coords ? location.coords.longitude : location.longitude
      };

      const truckId = `location_${Math.round(locationCoords.latitude * 1000)}_${Math.round(locationCoords.longitude * 1000)}`;
      const truckName = 'Mobile Food Vendor';
      
      const photoResult = await PhotoVerificationService.completePhotoVerification(
        user.uid,
        truckId,
        truckName,
        locationCoords
      );

      if (photoResult.success) {
        // Award points for photo verification
        await FoodieGameService.awardPoints(
          user.uid, 
          25, 
          'Mobile food vendor photo verification', 
          {
            actionType: 'photo_verification',
            displayName: user.displayName,
            truckId: truckId,
            truckName: truckName
          }
        );
        
        // Track daily challenges
        await DailyChallengesService.trackAction(user.uid, 'photo_verification', {
          hasPhoto: true,
          isRapidAction: false
        });
        
        // Update mission progress
        const missionResult = await FoodieGameService.updateMissionProgress(user.uid, 'try_3_trucks', 1);
        
        let message = 'Photo verified! +25 XP earned!';
        if (missionResult.missionCompleted) {
          message += `\n\n🎉 Mission Complete: ${missionResult.missionCompleted.missionTitle}!\n+${missionResult.missionCompleted.pointsAwarded} bonus XP!`;
        }
        
   
        
        if (onPhotoTaken) {
          onPhotoTaken({
            success: true,
            photoURL: photoResult.photoURL,
            missionCompleted: missionResult.missionCompleted,
            totalPoints: 25 + (missionResult.missionCompleted?.pointsAwarded || 0)
          });
        }
        
      } else if (!photoResult.cancelled) {
 
      }
    } catch (error) {

    } finally {
      setTakingPhoto(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.photoButton, style]}
      onPress={handleTakePhoto}
      disabled={takingPhoto}
      activeOpacity={0.8}
    >
      <View style={styles.buttonContent}>
        {takingPhoto ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="camera" size={24} color="#fff" />
        )}
        <Text style={styles.buttonText}>
          {takingPhoto ? 'Processing...' : '📸 Photo Verify'}
        </Text>
        <Text style={styles.buttonSubtext}>
          +25 XP • Mission Progress
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  photoButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginVertical: 8,
    minHeight: 60,
  },
  buttonContent: {
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
  },
});

export default PhotoVerificationButton;