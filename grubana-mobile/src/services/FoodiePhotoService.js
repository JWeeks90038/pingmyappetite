/**
 * Foodie Photo Service
 * Handles uploading and managing foodie's personal food adventure photos
 * These are separate from verification photos and are meant for sharing
 */

import * as ImagePicker from 'expo-image-picker';
import * as Device from 'expo-device';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../firebase';

export class FoodiePhotoService {
  /**
   * Upload a foodie photo for sharing in galleries
   * @param {string} userId - User ID
   * @param {string} description - Photo description
   * @param {Object} location - Optional location data
   * @returns {Promise<Object>} Upload result
   */
  static async uploadFoodiePhoto(userId, description = '', location = null) {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access media library is required');
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, 
        aspect: [1, 1], // Square aspect ratio for better grid display
        quality: 0.8, // Good quality but not huge files
        allowsMultipleSelection: false,
      });

      if (result.canceled) {
        return { success: false, cancelled: true };
      }

      const imageUri = result.assets[0].uri;
      
      // Create unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `foodie_${timestamp}.jpg`;
      const storagePath = `foodie-photos/${userId}/${filename}`;

      // Upload to Firebase Storage
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const storageRef = ref(storage, storagePath);
      
      console.log('Uploading foodie photo to:', storagePath);
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Foodie photo uploaded successfully:', downloadURL);

      // Save to Firestore
      const photoData = {
        userId,
        imageUrl: downloadURL,
        description: description.trim(),
        timestamp: serverTimestamp(),
        likeCount: 0,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || null
        } : null,
        type: 'foodie_photo' // Distinguish from verification photos
      };

      const docRef = await addDoc(collection(db, 'foodiePhotos'), photoData);
      console.log('Foodie photo saved to Firestore:', docRef.id);

      return {
        success: true,
        photoId: docRef.id,
        imageUrl: downloadURL,
        message: 'Photo shared successfully! 📸'
      };

    } catch (error) {
      console.error('Error uploading foodie photo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload a foodie photo using camera
   * @param {string} userId - User ID  
   * @param {string} description - Photo description
   * @param {Object} location - Optional location data
   * @returns {Promise<Object>} Upload result
   */
  static async takeFoodiePhoto(userId, description = '', location = null) {
    try {
      console.log('🎥 Starting camera photo capture for user:', userId);
      
      // Request camera permissions
      console.log('📷 Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('📷 Camera permission status:', status);
      
      if (status !== 'granted') {
        throw new Error('Camera permission is required to share foodie photos');
      }

      // Launch camera
      console.log('📷 Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Compress to reduce upload time
        exif: true, // Include location data if available
      });

      console.log('📷 Camera result:', result);

      if (result.canceled) {
        console.log('📷 Camera was cancelled by user');
        return { success: false, cancelled: true };
      }

      console.log('📷 Photo captured successfully, starting upload...');
      const imageUri = result.assets[0].uri;
      
      // Create unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `foodie_camera_${timestamp}.jpg`;
      const storagePath = `foodie-photos/${userId}/${filename}`;

      // Upload to Firebase Storage
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const storageRef = ref(storage, storagePath);
      
      console.log('Uploading camera foodie photo to:', storagePath);
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Camera foodie photo uploaded successfully:', downloadURL);

      // Save to Firestore
      const photoData = {
        userId,
        imageUrl: downloadURL,
        description: description.trim(),
        timestamp: serverTimestamp(),
        likeCount: 0,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || null
        } : null,
        type: 'foodie_photo'
      };

      const docRef = await addDoc(collection(db, 'foodiePhotos'), photoData);
      console.log('Camera foodie photo saved to Firestore:', docRef.id);

      return {
        success: true,
        photoId: docRef.id,
        imageUrl: downloadURL,
        message: 'Photo captured and shared! 📸'
      };

    } catch (error) {
      console.error('📷 Error taking foodie photo:', error);
      return {
        success: false,
        error: error.message,
        cancelled: false
      };
    }
  }

  /**
   * Get foodie photos for a specific user
   * @param {string} userId - User ID
   * @param {number} limitCount - Number of photos to fetch
   * @returns {Promise<Array>} Array of photos
   */
  static async getUserFoodiePhotos(userId, limitCount = 50) {
    try {
      const photosQuery = query(
        collection(db, 'foodiePhotos'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(photosQuery);
      const photos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
      }));

      return photos;
    } catch (error) {
      console.error('Error fetching user foodie photos:', error);
      return [];
    }
  }
}

export default FoodiePhotoService;