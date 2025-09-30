/**
 * PhotoUploadScreen
 * Dedicated screen for photo uploads (camera and gallery)
 * Navigated to from MapScreen to avoid WebView conflicts
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
  const { location } = route.params || {};

  const [uploading, setUploading] = useState(false);

  const showToastMessage = (message, type) => {
    Alert.alert(
      type === 'success' ? '✅ Success' : type === 'error' ? '❌ Error' : 'ℹ️ Info',
      message
    );
  };

  const uploadPhoto = async (imageUri, source) => {
    try {
      console.log(`📸 Starting ${source} photo upload...`);
      
      // Create unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `foodie_${source}_${timestamp}.jpg`;
      const storagePath = `foodie-photos/${user.uid}/${filename}`;

      // Upload to Firebase Storage
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const storageRef = ref(storage, storagePath);
      
      console.log('📸 Uploading to Firebase Storage...');
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('📸 Photo uploaded successfully:', downloadURL);

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
        type: 'foodie_photo'
      };

      const docRef = await addDoc(collection(db, 'foodiePhotos'), photoData);
      console.log('📸 Photo saved to Firestore:', docRef.id);

      showToastMessage('Photo uploaded and shared! 📸', 'success');
      
      // Navigate back to map after success
      setTimeout(() => {
        navigation.goBack();
      }, 1500);

    } catch (error) {
      console.error('📸 Error uploading photo:', error);
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

      console.log('📸 Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: true,
      });

      if (result.canceled) {
        console.log('📸 Camera cancelled');
        return;
      }

      console.log('📸 Camera photo taken successfully');
      await uploadPhoto(result.assets[0].uri, 'camera');
      
    } catch (error) {
      console.error('📸 Camera error:', error);
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

      console.log('📸 Launching photo gallery...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (result.canceled) {
        console.log('📸 Gallery cancelled');
        return;
      }

      console.log('📸 Gallery photo selected successfully');
      await uploadPhoto(result.assets[0].uri, 'gallery');
      
    } catch (error) {
      console.error('📸 Gallery error:', error);
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
});