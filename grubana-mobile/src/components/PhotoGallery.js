import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import PhotoVerificationService from '../services/PhotoVerificationService';

const { width, height } = Dimensions.get('window');

const PhotoGallery = ({ isVisible, onClose }) => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    if (isVisible && user) {
      loadPhotos();
    }
  }, [isVisible, user]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const result = await PhotoVerificationService.getUserPhotoGallery(user.uid);
      if (result.success) {
        setPhotos(result.photos);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openPhotoModal = (photo) => {
    setSelectedPhoto(photo);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhoto(null);
  };

  const renderPhotoItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => openPhotoModal(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.photoURL }}
        style={styles.photoThumbnail}
        resizeMode="cover"
      />
      <View style={styles.photoOverlay}>
        <Text style={styles.truckName} numberOfLines={1}>
          {item.truckName}
        </Text>
        <Text style={styles.photoDate}>
          {formatDate(item.timestamp)}
        </Text>
      </View>
      <View style={styles.verifiedBadge}>
        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {/* Main Gallery Modal */}
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>📸 My Food Truck Adventures</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{photos.length}</Text>
              <Text style={styles.statLabel}>Photos Taken</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {new Set(photos.map(p => p.truckId)).size}
              </Text>
              <Text style={styles.statLabel}>Trucks Visited</Text>
            </View>
          </View>

          {/* Photo Grid */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading your adventures...</Text>
            </View>
          ) : photos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="camera-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Adventures Yet!</Text>
              <Text style={styles.emptySubtitle}>
                Check in at food trucks and take photos to build your collection
              </Text>
            </View>
          ) : (
            <FlatList
              data={photos}
              renderItem={renderPhotoItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.photoGrid}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>

      {/* Photo Detail Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={closePhotoModal}
      >
        <View style={styles.photoModalContainer}>
          <TouchableOpacity
            style={styles.photoModalBackdrop}
            onPress={closePhotoModal}
            activeOpacity={1}
          >
            <View style={styles.photoModalContent}>
              {selectedPhoto && (
                <>
                  <Image
                    source={{ uri: selectedPhoto.photoURL }}
                    style={styles.fullPhoto}
                    resizeMode="contain"
                  />
                  <View style={styles.photoDetails}>
                    <View style={styles.photoDetailRow}>
                      <Ionicons name="restaurant" size={20} color="#4CAF50" />
                      <Text style={styles.photoDetailText}>
                        {selectedPhoto.truckName}
                      </Text>
                    </View>
                    <View style={styles.photoDetailRow}>
                      <Ionicons name="calendar" size={20} color="#666" />
                      <Text style={styles.photoDetailText}>
                        {formatDate(selectedPhoto.timestamp)}
                      </Text>
                    </View>
                    <View style={styles.photoDetailRow}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <Text style={styles.photoDetailText}>Verified Visit</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 34, // Same width as close button for centering
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  photoGrid: {
    padding: 10,
  },
  photoItem: {
    flex: 1,
    margin: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  photoThumbnail: {
    width: '100%',
    height: 150,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  truckName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  photoDate: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
  },
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  photoModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullPhoto: {
    width: '100%',
    height: 300,
  },
  photoDetails: {
    padding: 20,
  },
  photoDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoDetailText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
});

export default PhotoGallery;