/**
 * PhotoUploadScreen
 * Dedicated screen for photo uploads (camera and gallery)
 * Navigated to from MapScreen to avoid WebView conflicts
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../components/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../firebase';


export default function PhotoUploadScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { location, onPhotoUploaded } = route.params || {};

  const [uploading, setUploading] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const showToastMessage = (message, type) => {
  
  };



  const uploadPhoto = async (imageUri, source) => {
    try {

      
      // Create unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `foodie_${source}_${timestamp}.jpg`;
      const storagePath = `foodie-photos/${user.uid}/${filename}`;

      // Upload to Firebase Storage
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const storageRef = ref(storage, storagePath);
      

      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);


      // Save to Firestore
      const photoData = {
        userId: user.uid,
        imageUrl: downloadURL,
        description: '',
        timestamp: serverTimestamp(),
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        } : null,
        type: 'foodie_photo',
        // Add truck tagging data
        taggedTruck: selectedTruck ? {
          truckName: selectedTruck.truckName
        } : null
      };

      const docRef = await addDoc(collection(db, 'foodiePhotos'), photoData);
    

      const message = selectedTruck ? 
        `Photo uploaded and tagged with ${selectedTruck.truckName}! 📸🏷️` : 
        'Photo uploaded and shared! 📸';
      showToastMessage(message, 'success');
      
      // Call callback to refresh leaderboard if provided
      if (onPhotoUploaded && typeof onPhotoUploaded === 'function') {
        try {
          await onPhotoUploaded();
        } catch (error) {
   
        }
      }
      
      // Navigate back to map after success
      setTimeout(() => {
        navigation.goBack();
      }, 1500);

    } catch (error) {
 
      showToastMessage('Failed to upload photo: ' + error.message, 'error');
    }
  };

  const takeCameraPhoto = async () => {
    try {
      setUploading(true);
      
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToastMessage('Camera permission is required', 'error');
        return;
      }


      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: true,
      });

      if (result.canceled) {
 
        return;
      }

  
      await uploadPhoto(result.assets[0].uri, 'camera');
      
    } catch (error) {
  
      showToastMessage('Camera failed: ' + error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const selectGalleryPhoto = async () => {
    try {
      setUploading(true);
      
      // Request gallery permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToastMessage('Photo library permission is required', 'error');
        return;
      }

  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (result.canceled) {
      
        return;
      }

   
      await uploadPhoto(result.assets[0].uri, 'gallery');
      
    } catch (error) {
     
      showToastMessage('Gallery failed: ' + error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={uploading}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Share a Foodie Photo
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          Share your food adventures with other foodies!
        </Text>

        {/* Truck Tagging Section */}
        <View style={styles.taggingSection}>
          <Text style={[styles.taggingTitle, { color: theme.colors.text.primary }]}>
            🏷️ Tag a Food Truck (Optional)
          </Text>
          
          <View style={[styles.truckInputContainer, { 
            backgroundColor: theme.colors.background.secondary,
            borderColor: selectedTruck ? theme.colors.primary : theme.colors.border.primary 
          }]}>
            <Ionicons 
              name="restaurant" 
              size={20} 
              color={selectedTruck ? theme.colors.primary : theme.colors.text.secondary} 
            />
            <TextInput
              style={[styles.truckNameInput, { color: theme.colors.text.primary }]}
              placeholder="Enter food truck name..."
              placeholderTextColor={theme.colors.text.secondary}
              value={searchTerm}
              onChangeText={(text) => {
                setSearchTerm(text);
                if (text.trim()) {
                  setSelectedTruck({ truckName: text.trim() });
                } else {
                  setSelectedTruck(null);
                }
              }}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (searchTerm.trim()) {
                  setSelectedTruck({ truckName: searchTerm.trim() });
                }
              }}
            />
            {searchTerm && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => {
                  setSearchTerm('');
                  setSelectedTruck(null);
                }}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {selectedTruck && (
            <View style={styles.selectedTruckInfo}>
              <Text style={[styles.selectedTruckName, { color: theme.colors.primary }]}>
                🏷️ Tagged: {selectedTruck.truckName}
              </Text>
              <Text style={[styles.selectedTruckHint, { color: theme.colors.text.secondary }]}>
                This truck name will appear on your photo
              </Text>
            </View>
          )}
        </View>

        {/* Photo Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, { 
              backgroundColor: theme.colors.primary,
              opacity: uploading ? 0.6 : 1
            }]}
            onPress={takeCameraPhoto}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={32} color="#FFFFFF" />
            <Text style={styles.optionText}>Take Photo</Text>
            <Text style={styles.optionSubtext}>Use your camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, { 
              backgroundColor: theme.colors.primary,
              opacity: uploading ? 0.6 : 1
            }]}
            onPress={selectGalleryPhoto}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <Ionicons name="images" size={32} color="#FFFFFF" />
            <Text style={styles.optionText}>Choose from Gallery</Text>
            <Text style={styles.optionSubtext}>Select existing photo</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {uploading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
              Uploading photo...
            </Text>
          </View>
        )}
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 20,
  },
  optionButton: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  optionSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  
  // Truck Tagging Styles
  taggingSection: {
    marginBottom: 20,
    width: '100%',
  },
  taggingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  truckInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  truckNameInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    paddingVertical: 2,
  },
  clearButton: {
    marginLeft: 10,
  },
  selectedTruckInfo: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'rgba(255, 78, 201, 0.1)',
    borderRadius: 8,
  },
  selectedTruckName: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedTruckHint: {
    fontSize: 13,
    marginTop: 2,
    fontStyle: 'italic',
  },

});