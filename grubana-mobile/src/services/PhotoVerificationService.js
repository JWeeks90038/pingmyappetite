import { db, storage } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

class PhotoVerificationService {
  
  /**
   * Request camera permissions and take a photo for food truck verification
   */
  static async takeVerificationPhoto() {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission is required to verify your visit');
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Compress to reduce upload time
        exif: true, // Include location data if available
      });

      if (result.canceled) {
        return { success: false, cancelled: true };
      }

      return { 
        success: true, 
        photo: result.assets[0] 
      };

    } catch (error) {
      console.error('Error taking verification photo:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Upload verification photo to Firebase Storage
   */
  static async uploadVerificationPhoto(userId, photo, truckId, truckName) {
    try {
      // Create unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `verification-photos/${userId}/${truckId}/${timestamp}.jpg`;
      
      // Convert photo to blob
      const response = await fetch(photo.uri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const storageRef = ref(storage, filename);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        success: true,
        downloadURL,
        filename
      };

    } catch (error) {
      console.error('Error uploading verification photo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save verification photo metadata to Firestore
   */
  static async savePhotoVerification(userId, photoData) {
    try {
      const verificationData = {
        userId,
        truckId: photoData.truckId,
        truckName: photoData.truckName,
        photoURL: photoData.downloadURL,
        filename: photoData.filename,
        location: photoData.location,
        timestamp: serverTimestamp(),
        verified: true,
        missionType: 'food_truck_explorer',
        // Photo metadata
        width: photoData.photo?.width,
        height: photoData.photo?.height,
        exif: photoData.photo?.exif
      };

      const docRef = await addDoc(collection(db, 'photoVerifications'), verificationData);
      
      // Also save to user's photo gallery
      await addDoc(collection(db, 'users', userId, 'photoGallery'), {
        ...verificationData,
        verificationId: docRef.id,
        albumType: 'food_truck_visits'
      });

      return {
        success: true,
        verificationId: docRef.id,
        photoData: verificationData
      };

    } catch (error) {
      console.error('Error saving photo verification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's photo gallery/virtual book
   */
  static async getUserPhotoGallery(userId, albumType = 'food_truck_visits') {
    try {
      // Use simpler query to avoid index requirements, then filter and sort in memory
      const galleryQuery = query(
        collection(db, 'users', userId, 'photoGallery'),
        where('albumType', '==', albumType)
      );

      const snapshot = await getDocs(galleryQuery);
      const photos = [];

      snapshot.forEach(doc => {
        photos.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by timestamp in descending order (newest first) in memory
      photos.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
        return bTime.getTime() - aTime.getTime();
      });

      return {
        success: true,
        photos,
        totalCount: photos.length
      };

    } catch (error) {
      console.error('Error fetching photo gallery:', error);
      return {
        success: false,
        error: error.message,
        photos: []
      };
    }
  }

  /**
   * Complete photo verification process for missions
   */
  static async completePhotoVerification(userId, truckId, truckName, location) {
    try {
      // Step 1: Take photo
      const photoResult = await this.takeVerificationPhoto();
      if (!photoResult.success) {
        return photoResult;
      }

      // Step 2: Upload photo
      const uploadResult = await this.uploadVerificationPhoto(
        userId, 
        photoResult.photo, 
        truckId, 
        truckName
      );
      if (!uploadResult.success) {
        return uploadResult;
      }

      // Step 3: Save verification data
      const saveResult = await this.savePhotoVerification(userId, {
        truckId,
        truckName,
        downloadURL: uploadResult.downloadURL,
        filename: uploadResult.filename,
        location,
        photo: photoResult.photo
      });

      if (!saveResult.success) {
        return saveResult;
      }

      return {
        success: true,
        message: 'Photo verification completed successfully!',
        verificationId: saveResult.verificationId,
        photoURL: uploadResult.downloadURL
      };

    } catch (error) {
      console.error('Error in complete photo verification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify if user has photo verification for a specific truck
   */
  static async hasPhotoVerification(userId, truckId) {
    try {
      const verificationQuery = query(
        collection(db, 'photoVerifications'),
        where('userId', '==', userId),
        where('truckId', '==', truckId),
        where('verified', '==', true)
      );

      const snapshot = await getDocs(verificationQuery);
      return {
        hasVerification: !snapshot.empty,
        count: snapshot.size
      };

    } catch (error) {
      console.error('Error checking photo verification:', error);
      return {
        hasVerification: false,
        count: 0
      };
    }
  }

  /**
   * Get unique trucks visited with photo verification
   */
  static async getVerifiedTrucksCount(userId) {
    try {
      const verificationQuery = query(
        collection(db, 'photoVerifications'),
        where('userId', '==', userId),
        where('verified', '==', true)
      );

      const snapshot = await getDocs(verificationQuery);
      const uniqueTrucks = new Set();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        uniqueTrucks.add(data.truckId);
      });

      return {
        success: true,
        uniqueTrucksCount: uniqueTrucks.size,
        totalPhotos: snapshot.size
      };

    } catch (error) {
      console.error('Error getting verified trucks count:', error);
      return {
        success: false,
        uniqueTrucksCount: 0,
        totalPhotos: 0
      };
    }
  }
}

export default PhotoVerificationService;