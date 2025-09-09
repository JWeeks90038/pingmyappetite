import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  limit 
} from 'firebase/firestore';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userPings, setUserPings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [userRole, setUserRole] = useState('customer');
  const [userPlan, setUserPlan] = useState('basic');
  const [foodTruckPhoto, setFoodTruckPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Confirmation modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Toast notification function
  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  useEffect(() => {
    setUser(auth.currentUser);
    if (auth.currentUser) {
      setDisplayName(auth.currentUser.displayName || '');
      loadUserData();
    }
  }, []);

  useEffect(() => {
    // Load pings and favorites after role is determined
    if (auth.currentUser && userRole) {
      const unsubscribePings = loadUserPings();
      const unsubscribeFavorites = loadFavorites();
      
      return () => {
        if (unsubscribePings) unsubscribePings();
        if (unsubscribeFavorites) unsubscribeFavorites();
      };
    }
  }, [userRole]);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Use the correct field based on user role
        let name = '';
        if (userData.role === 'owner') {
          // For food truck owners, use username field (same as web app)
          name = userData.username || userData.ownerName || userData.displayName || auth.currentUser.displayName;
        } else {
          // For customers, use displayName field (same as web app)  
          name = userData.displayName || auth.currentUser.displayName;
        }
        
        // Fallback to email prefix if no name found
        if (!name) {
          name = auth.currentUser.email?.split('@')[0] || 'User';
        }
        
        setDisplayName(name);
        setUserRole(userData.role || 'customer');
        setUserPlan(userData.plan || 'basic');
        
        // Load food truck photo for owners (using same field as web app)
        if (userData.role === 'owner') {
          // Use coverUrl as primary field (same as web app)
          const truckPhoto = userData.coverUrl || userData.foodTruckPhoto;
          setFoodTruckPhoto(truckPhoto);
        }
      } else {
        // If no Firestore doc, use what we can from auth
        setDisplayName(auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User');
      }
    } catch (error) {
      
      // Fallback to auth data
      setDisplayName(auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User');
    }
  };

  const loadUserPings = () => {
    if (!auth.currentUser) return;

    try {
      let q;
      
      if (userRole === 'owner') {
        // For food truck owners, load customer requests directed to them
        q = query(
          collection(db, 'pings'),
          where('truckOwnerId', '==', auth.currentUser.uid),
          limit(10)
        );
      } else {
        // For customers, load their own pings
        q = query(
          collection(db, 'pings'),
          where('userId', '==', auth.currentUser.uid),
          limit(10)
        );
      }

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const pings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Enhance ping data with better user information
        const enhancedPings = await Promise.all(pings.map(async (ping) => {
          let enhancedPing = { ...ping };

          // For owner view: enhance customer information
          if (userRole === 'owner' && (!ping.username || ping.username === 'Anonymous')) {
            try {
              if (ping.userId) {
                const userDoc = await getDoc(doc(db, 'users', ping.userId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  enhancedPing.username = userData.displayName || userData.name || ping.username || 'Anonymous';
                  enhancedPing.customerEmail = userData.email; // Add email for owner reference
                }
              }
            } catch (error) {
           
            }
          }

          return enhancedPing;
        }));

        // Sort locally instead of in Firestore query
        enhancedPings.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
          const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
          return bTime - aTime;
        });
        setUserPings(enhancedPings);
      }, (error) => {
 
        setUserPings([]); // Set empty array on error
      });

      return unsubscribe;
    } catch (error) {

      setUserPings([]);
      return null;
    }
  };

  const loadFavorites = () => {
    if (!auth.currentUser) return;

    try {
      const q = query(
        collection(db, 'favorites'),
        where('userId', '==', auth.currentUser.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const favs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFavorites(favs);
      }, (error) => {

        setFavorites([]); // Set empty array on error
      });

      return unsubscribe;
    } catch (error) {

      setFavorites([]);
      return null;
    }
  };

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      showToast('Display name cannot be empty', 'error');
      return;
    }

    setLoading(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim()
      });

      // Prepare update data based on user role
      const updateData = {
        email: auth.currentUser.email,
        lastUpdated: new Date(),
      };

      // Save name in the correct field based on user role
      if (userRole === 'owner') {
        // For food truck owners, save as username (same as web app)
        updateData.username = displayName.trim();
      } else {
        // For customers, save as displayName (same as web app)
        updateData.displayName = displayName.trim();
      }

      // Update Firestore user document
      await setDoc(doc(db, 'users', auth.currentUser.uid), updateData, { merge: true });

      setEditing(false);
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      showToast('Failed to update profile', 'error');
    }
    setLoading(false);
  };

  const handleSignOut = () => {
    setConfirmAction({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      onConfirm: async () => {
        try {
          await signOut(auth);
        } catch (error) {
          showToast('Failed to sign out', 'error');
        }
      }
    });
    setConfirmModalVisible(true);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatFullDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const uploadTruckPhoto = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        showToast('Please allow access to your photo library to upload truck photos', 'error');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Good aspect ratio for truck photos
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingPhoto(true);
        
        try {
          // Create a unique filename
          const timestamp = Date.now();
          const filename = `truck-photos/${auth.currentUser.uid}-${timestamp}.jpg`;
          
          // Convert URI to blob for upload
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          
          // Upload to Firebase Storage
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, blob);
          
          // Get download URL
          const downloadURL = await getDownloadURL(storageRef);
          
          // Update user document in Firestore (using same field as web app)
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            coverUrl: downloadURL,
            lastUpdated: new Date()
          });
          
          // Update local state
          setFoodTruckPhoto(downloadURL);
          
          showToast('Truck photo updated successfully!', 'success');
        } catch (uploadError) {
          showToast('Failed to upload truck photo. Please try again.', 'error');
        }
      }
    } catch (error) {
      showToast('Failed to select image', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        {/* Food Truck Photo Section - For owners */}
        {userRole === 'owner' && (
          <View style={styles.foodTruckSection}>
            {foodTruckPhoto ? (
              <Image 
                source={{ uri: foodTruckPhoto }} 
                style={styles.foodTruckImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderTruckImage}>
                <Ionicons name="camera" size={40} color="#999" />
                <Text style={styles.placeholderText}>No truck photo</Text>
              </View>
            )}
          </View>
        )}
        
        {/* Avatar only for customers */}
        {userRole !== 'owner' && (
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={80} color="#2c6f57" />
          </View>
        )}
        
        {editing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              autoFocus
            />
            
            {/* Upload Photo Button - Only show in edit mode for owners */}
            {userRole === 'owner' && (
              <TouchableOpacity 
                style={styles.uploadPhotoButton}
                onPress={uploadTruckPhoto}
                disabled={uploadingPhoto}
              >
                <Ionicons name="camera" size={16} color="#2c6f57" />
                <Text style={styles.uploadPhotoText}>
                  {uploadingPhoto ? 'Uploading...' : 'Upload Truck or Trailer Photo'}
                </Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setDisplayName(user?.displayName || '');
                  setEditing(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {displayName || user?.displayName || user?.email?.split('@')[0] || 'User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {userRole === 'owner' && (
              <View style={styles.roleContainer}>
                <Ionicons name="storefront" size={16} color="#2c6f57" />
                <Text style={styles.roleText}>Food Truck Owner</Text>
                <Text style={styles.planText}>({userPlan} plan)</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="pencil" size={16} color="#2c6f57" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userPings.length}</Text>
          <Text style={styles.statLabel}>
            {userRole === 'owner' ? 'Customer Requests' : 'Pings Sent'}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{favorites.length}</Text>
          <Text style={styles.statLabel}>
            {userRole === 'owner' ? 'Regular Customers' : 'Favorites'}
          </Text>
        </View>
      </View>

      {/* Role-specific Content */}
      {userRole === 'owner' ? (
        <>
          {/* Food Truck Owner Content */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Customer Requests</Text>
            {userPings.length === 0 ? (
              <Text style={styles.emptyText}>No customer requests yet</Text>
            ) : (
              userPings.map((ping) => (
                <View key={ping.id} style={styles.pingCard}>
                  <View style={styles.pingHeader}>
                    <Text style={styles.pingCuisine}>🍽️ {ping.cuisineType}</Text>
                    <Text style={styles.pingDate}>
                      {formatDate(ping.timestamp)}
                    </Text>
                  </View>
                  <Text style={styles.pingCustomer}>
                    👤 Customer: {ping.username || 'Anonymous'}
                  </Text>
                  {ping.customerEmail && (
                    <Text style={styles.pingEmail}>
                      📧 {ping.customerEmail}
                    </Text>
                  )}
                  {ping.desiredTime && (
                    <Text style={styles.pingTime}>
                      ⏰ Requested time: {ping.desiredTime}
                    </Text>
                  )}
                  <Text style={styles.pingAddress} numberOfLines={2}>
                    📍 {ping.address || 'Location not provided'}
                  </Text>
                  <Text style={styles.pingTimestamp}>
                    🕒 {formatFullDate(ping.timestamp)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Tools</Text>
            <TouchableOpacity 
              style={styles.toolButton}
              onPress={() => navigation.navigate('LocationManagement')}
            >
              <Ionicons name="location" size={20} color="#2c6f57" />
              <Text style={styles.toolText}>
                {userPlan === 'pro' || userPlan === 'all-access' 
                  ? 'Location Settings (Auto-GPS)' 
                  : 'Update Location'
                }
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.toolButton}
              onPress={() => navigation.navigate('MenuManagement')}
            >
              <Ionicons name="restaurant" size={20} color="#2c6f57" />
              <Text style={styles.toolText}>Menu Management</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
            {userPlan !== 'all-access' && (
              <TouchableOpacity style={styles.upgradeButton}>
                <Ionicons name="diamond" size={20} color="#fff" />
                <Text style={styles.upgradeText}>Upgrade to All Access</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <>
          {/* Customer Content */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Food Requests</Text>
            {userPings.length === 0 ? (
              <Text style={styles.emptyText}>No pings sent yet</Text>
            ) : (
              userPings.map((ping) => (
                <View key={ping.id} style={styles.pingCard}>
                  <View style={styles.pingHeader}>
                    <Text style={styles.pingCuisine}>{ping.cuisineType}</Text>
                    <Text style={styles.pingDate}>
                      {formatDate(ping.timestamp)}
                    </Text>
                  </View>
                  {ping.desiredTime && (
                    <Text style={styles.pingTime}>
                      Wanted: {ping.desiredTime}
                    </Text>
                  )}
                  <Text style={styles.pingAddress} numberOfLines={1}>
                    📍 {ping.address}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorite Food Trucks</Text>
            {favorites.length === 0 ? (
              <Text style={styles.emptyText}>No favorite trucks yet</Text>
            ) : (
              favorites.map((fav) => (
                <View key={fav.id} style={styles.favoriteCard}>
                  <Text style={styles.favoriteName}>
                    {fav.truckName || 'Food Truck'}
                  </Text>
                  <Ionicons name="heart" size={16} color="#e74c3c" />
                </View>
              ))
            )}
          </View>
        </>
      )}

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={20} color="#dc3545" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View style={[
          styles.toast,
          toastType === 'success' ? styles.toastSuccess : styles.toastError,
          { opacity: fadeAnim }
        ]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{confirmAction?.title}</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>{confirmAction?.message}</Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  setConfirmModalVisible(false);
                  confirmAction?.onConfirm();
                }}
              >
                <Text style={styles.confirmButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  foodTruckSection: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 10,
  },
  foodTruckImage: {
    width: 140,
    height: 90,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#2c6f57',
  },
  placeholderTruckImage: {
    width: 140,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  uploadPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 111, 87, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    marginVertical: 15,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2c6f57',
  },
  uploadPhotoText: {
    color: '#2c6f57',
    fontSize: 14,
    fontWeight: '600',
  },
  truckPhotoLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  editContainer: {
    width: '100%',
    alignItems: 'center',
  },
  nameInput: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2c6f57',
    paddingVertical: 5,
    marginBottom: 15,
    minWidth: 200,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#2c6f57',
  },
  cancelButtonText: {
    color: '#666',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  editProfileText: {
    color: '#2c6f57',
    fontSize: 14,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 5,
  },
  roleText: {
    color: '#2c6f57',
    fontSize: 14,
    fontWeight: '600',
  },
  planText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    marginTop: 0,
    padding: 20,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  pingCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2c6f57',
  },
  pingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pingCuisine: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
    textTransform: 'capitalize',
  },
  pingDate: {
    fontSize: 12,
    color: '#999',
  },
  pingTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  pingAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  pingCustomer: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    fontWeight: '500',
  },
  pingEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  pingTimestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toolText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c6f57',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    gap: 8,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  favoriteCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  signOutText: {
    color: '#dc3545',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  bottomPadding: {
    height: 20,
  },
  // Toast styles
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: '#4CAF50',
  },
  toastError: {
    backgroundColor: '#f44336',
  },
  toastText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 0,
    margin: 20,
    maxWidth: 350,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    backgroundColor: '#dc3545',
    padding: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#dc3545',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
