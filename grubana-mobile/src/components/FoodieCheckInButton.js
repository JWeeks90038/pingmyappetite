import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import FoodieGameService from '../services/FoodieGameService';
import DailyChallengesService from '../services/DailyChallengesService';
import PhotoVerificationService from '../services/PhotoVerificationService';
import { useAuth } from './AuthContext';

const { width } = Dimensions.get('window');

const FoodieCheckInButton = ({ location, onCheckIn, style }) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [hungerLevel, setHungerLevel] = useState('interested');
  const [loading, setLoading] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const { user } = useAuth();
  const theme = useTheme();

  const hungerLevels = [
    { key: 'interested', label: 'Browsing', icon: '👀', color: '#4CAF50' },
    { key: 'hungry', label: 'Hungry', icon: '😋', color: '#FF9800' },
    { key: 'starving', label: 'Starving!', icon: '🤤', color: '#F44336' }
  ];

  useEffect(() => {
    // Start pulse animation
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    if (!isCheckedIn) {
      pulse();
    }
  }, [isCheckedIn]);

  const handleCheckIn = async () => {
    if (!user || !location || loading) return;

    setLoading(true);
    
    try {
      // Format location for service
      const locationCoords = {
        latitude: location.coords ? location.coords.latitude : location.latitude,
        longitude: location.coords ? location.coords.longitude : location.longitude
      };
      
      // First, do the regular check-in
      const result = await FoodieGameService.checkInFoodie(
        user.uid,
        locationCoords,
        hungerLevel
      );

      if (result.success) {
        setIsCheckedIn(true);
        
        // Track daily challenges for check-in
        try {
          await DailyChallengesService.trackAction(user.uid, 'maintain_streak', {
            isNewLocation: result.isNewLocation
          });
        } catch (error) {
  
        }
        
        // If this is a new location visit, prompt for photo verification
        if (result.isNewLocation) {
          setTimeout(async () => {
            await handlePhotoVerification(result);
          }, 1000); // Small delay to let check-in complete
        }
        
        onCheckIn && onCheckIn(result);
        
        // Auto-expire check-in after 45 minutes
        setTimeout(() => {
          setIsCheckedIn(false);
        }, 45 * 60 * 1000);
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handlePhotoVerification = async (checkInResult) => {
    if (takingPhoto) return;
    
    setTakingPhoto(true);
    
    try {
      // Try to find nearby food truck info
      const truckId = 'general_location'; // Default ID for general locations
      const truckName = checkInResult.locationName || 'Food Truck Location';
      
      const photoResult = await PhotoVerificationService.completePhotoVerification(
        user.uid,
        truckId,
        truckName,
        checkInResult.location
      );

      if (photoResult.success) {
        // Update the check-in result to include photo verification
        const enhancedResult = {
          ...checkInResult,
          photoVerified: true,
          photoURL: photoResult.photoURL,
          bonusPoints: 10, // Bonus points for photo verification
          message: checkInResult.message + ' Photo verified! +10 bonus XP!'
        };
        
        // Award bonus points for photo verification
        await FoodieGameService.awardPoints(
          user.uid, 
          10, 
          'Photo verification bonus', 
          {
            actionType: 'photo_verification',
            displayName: user.displayName,
            truckId: truckId,
            truckName: truckName
          }
        );
        
        onCheckIn && onCheckIn(enhancedResult);
      } else if (!photoResult.cancelled) {
        // Only show error if user didn't cancel

      }
    } catch (error) {

    } finally {
      setTakingPhoto(false);
    }
  };

  const currentLevel = hungerLevels.find(level => level.key === hungerLevel);

  if (isCheckedIn) {
    return (
      <View style={[styles.checkedInContainer, style]}>
        <View style={[styles.checkedInBadge, { backgroundColor: currentLevel.color }]}>
          <Text style={styles.hungerIcon}>{currentLevel.icon}</Text>
          <Text style={styles.checkedInText}>You're on the map!</Text>
          <Text style={styles.levelText}>{currentLevel.label}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Hunger Level Selector */}
      <View style={styles.hungerSelector}>
        {hungerLevels.map((level) => (
          <TouchableOpacity
            key={level.key}
            style={[
              styles.hungerOption,
              hungerLevel === level.key && styles.selectedHunger,
              { borderColor: level.color }
            ]}
            onPress={() => setHungerLevel(level.key)}
          >
            <Text style={styles.hungerIcon}>{level.icon}</Text>
            <Text style={[styles.hungerLabel, { color: level.color }]}>
              {level.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Check-in Button */}
      <Animated.View
        style={[
          styles.checkInButton,
          { transform: [{ scale: pulseAnim }] },
          { backgroundColor: currentLevel.color }
        ]}
      >
        <TouchableOpacity
          onPress={handleCheckIn}
          disabled={loading}
          style={styles.buttonTouchable}
          activeOpacity={0.8}
        >
          <Text style={styles.checkInIcon}>{currentLevel.icon}</Text>
          <Text style={styles.checkInText}>
            {takingPhoto ? 'Taking Photo...' : loading ? 'Checking In...' : 'Check In Here'}
          </Text>
          <Text style={styles.checkInSubtext}>
            {takingPhoto ? 'Verifying with photo 📸' : 'Complete missions • Show demand • +10 XP'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
    width: '100%',
  },
  hungerSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  hungerOption: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    minWidth: 80,
  },
  selectedHunger: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hungerIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  hungerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkInButton: {
    borderRadius: 25,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: width * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
    marginVertical: 8,
  },
  buttonTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  checkInIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  checkInText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  checkInSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    textAlign: 'center',
  },
  checkedInContainer: {
    alignItems: 'center',
    padding: 16,
  },
  checkedInBadge: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  checkedInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  levelText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
  },
});

export default FoodieCheckInButton;