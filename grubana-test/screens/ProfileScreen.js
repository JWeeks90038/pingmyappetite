import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        if (userData.role === 'owner' && userData.coverUrl) {
          setFoodTruckPhoto(userData.coverUrl);
        }
      } else {
        // If no Firestore doc, use what we can from auth
        setDisplayName(auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
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

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const pings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort locally instead of in Firestore query
        pings.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
          const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
          return bTime - aTime;
        });
        setUserPings(pings);
      }, (error) => {
        console.log('Error loading user pings:', error);
        setUserPings([]); // Set empty array on error
      });

      return unsubscribe;
    } catch (error) {
      console.log('Error setting up pings listener:', error);
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
        console.log('Error loading favorites:', error);
        setFavorites([]); // Set empty array on error
      });

      return unsubscribe;
    } catch (error) {
      console.log('Error setting up favorites listener:', error);
      setFavorites([]);
      return null;
    }
  };

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
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
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
    setLoading(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
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

  const uploadTruckPhoto = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload truck photos.');
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
          
          Alert.alert('Success', 'Truck photo updated successfully!');
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          Alert.alert('Error', 'Failed to upload truck photo. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
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
          </View>
        )}
        
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#2c6f57" />
        </View>
        
        {editing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              autoFocus
            />
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
                    <Text style={styles.pingCuisine}>{ping.cuisineType}</Text>
                    <Text style={styles.pingDate}>
                      {formatDate(ping.timestamp)}
                    </Text>
                  </View>
                  <Text style={styles.pingCustomer}>
                    Customer: {ping.username || 'Anonymous'}
                  </Text>
                  {ping.desiredTime && (
                    <Text style={styles.pingTime}>
                      Requested time: {ping.desiredTime}
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
            <Text style={styles.sectionTitle}>Business Tools</Text>
            <TouchableOpacity 
              style={styles.toolButton}
              onPress={() => {
                // Switch to Analytics tab
                navigation.getParent()?.navigate('Analytics');
              }}
            >
              <Ionicons name="analytics" size={20} color="#2c6f57" />
              <Text style={styles.toolText}>View Analytics</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 15,
  },
  foodTruckImage: {
    width: 120,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  placeholderTruckImage: {
    width: 120,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    gap: 6,
  },
  uploadPhotoText: {
    color: '#2c6f57',
    fontSize: 12,
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
  },
  pingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
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
    fontSize: 12,
    color: '#666',
  },
  pingCustomer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
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
});
