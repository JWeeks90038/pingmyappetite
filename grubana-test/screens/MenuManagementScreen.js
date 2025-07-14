import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '../firebase';

export default function MenuManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [menuPhoto, setMenuPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    ingredients: '',
    price: '',
    category: 'Main'
  });

  const categories = ['Appetizer', 'Main', 'Side', 'Dessert', 'Beverage'];

  useEffect(() => {
    let unsubscribe;
    let authUnsubscribe;
    let timeoutId;
    
    console.log('MenuManagementScreen: Component mounted, setting up auth listener');
    
    authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('MenuManagementScreen: Auth state changed, user:', !!user);
      
      if (user) {
        console.log('MenuManagementScreen: User authenticated, loading data...');
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.log('MenuManagementScreen: Timeout reached, stopping loading');
          setLoading(false);
        }, 10000); // 10 seconds timeout
        
        try {
          unsubscribe = await loadMenuData(user);
        } catch (error) {
          console.error('MenuManagementScreen: Error during initialization:', error);
          setLoading(false);
        }
      } else {
        console.log('MenuManagementScreen: No user authenticated');
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (authUnsubscribe) {
        authUnsubscribe();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const loadMenuData = async (user) => {
    try {
      console.log('MenuManagementScreen: loadMenuData called for user:', user.uid);
      setLoading(true);

      // Test basic Firebase connection first
      console.log('MenuManagementScreen: Testing Firebase connection...');
      try {
        const testQuery = query(collection(db, 'users'));
        console.log('MenuManagementScreen: Firebase query created successfully');
      } catch (testError) {
        console.error('MenuManagementScreen: Firebase connection test failed:', testError);
        setLoading(false);
        return;
      }

      // Load menu photo and basic info
      try {
        console.log('MenuManagementScreen: Loading user document...');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        console.log('MenuManagementScreen: User doc exists:', userDoc.exists());
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('MenuManagementScreen: User data loaded, has menuUrl:', !!userData.menuUrl);
          // Use menuUrl field (same as web app) for consistency
          setMenuPhoto(userData.menuUrl || null);
        } else {
          console.log('MenuManagementScreen: User document does not exist');
        }
      } catch (userDocError) {
        console.error('MenuManagementScreen: Error loading user doc:', userDocError);
      }

      // Load menu items with real-time updates
      console.log('MenuManagementScreen: Setting up menu items listener for ownerId:', user.uid);
      
      try {
        const menuItemsQuery = query(
          collection(db, 'menuItems'),
          where('ownerId', '==', user.uid)
        );
        console.log('MenuManagementScreen: Menu items query created');

        const unsubscribe = onSnapshot(menuItemsQuery, 
          (snapshot) => {
            console.log('MenuManagementScreen: Menu items snapshot received, count:', snapshot.size);
            console.log('MenuManagementScreen: Snapshot empty:', snapshot.empty);
            
            const items = [];
            snapshot.forEach((doc) => {
              console.log('MenuManagementScreen: Processing doc:', doc.id);
              items.push({
                id: doc.id,
                ...doc.data()
              });
            });
            
            console.log('MenuManagementScreen: Total processed items:', items.length);
            
            // Sort by category and name
            items.sort((a, b) => {
              if (a.category !== b.category) {
                return categories.indexOf(a.category) - categories.indexOf(b.category);
              }
              return a.name.localeCompare(b.name);
            });
            
            setMenuItems(items);
            setLoading(false);
            console.log('MenuManagementScreen: Loading completed, final items count:', items.length);
          }, 
          (error) => {
            console.error('MenuManagementScreen: Error in menu items snapshot:', error);
            console.error('MenuManagementScreen: Error code:', error.code);
            console.error('MenuManagementScreen: Error message:', error.message);
            setLoading(false);
          }
        );

        console.log('MenuManagementScreen: Snapshot listener attached');
        return unsubscribe;
      } catch (queryError) {
        console.error('MenuManagementScreen: Error creating menu items query:', queryError);
        setLoading(false);
      }
    } catch (error) {
      console.error('MenuManagementScreen: Error in loadMenuData:', error);
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload menu photos.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable cropping to keep full menu
        quality: 0.8,
        exif: false, // Don't include EXIF data to reduce file size
      });

      if (!result.canceled) {
        setUploadingPhoto(true);
        
        try {
          console.log('MenuManagementScreen: Starting photo upload...');
          
          // Create a unique filename
          const timestamp = Date.now();
          const filename = `menu-photos/${auth.currentUser.uid}-${timestamp}.jpg`;
          console.log('MenuManagementScreen: Upload filename:', filename);
          
          // Convert URI to blob for upload
          console.log('MenuManagementScreen: Converting image to blob...');
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          console.log('MenuManagementScreen: Blob created, size:', blob.size);
          
          // Upload to Firebase Storage
          console.log('MenuManagementScreen: Uploading to Firebase Storage...');
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, blob);
          console.log('MenuManagementScreen: Upload successful');
          
          // Get download URL
          console.log('MenuManagementScreen: Getting download URL...');
          const downloadURL = await getDownloadURL(storageRef);
          console.log('MenuManagementScreen: Download URL obtained:', downloadURL.substring(0, 50) + '...');
          
          // Update user document in Firestore (using same field as web app)
          console.log('MenuManagementScreen: Updating Firestore document...');
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            menuUrl: downloadURL,
            lastUpdated: new Date()
          });
          console.log('MenuManagementScreen: Firestore update successful');
          
          // Update local state
          setMenuPhoto(downloadURL);
          
          Alert.alert('Success', 'Menu photo updated successfully!');
        } catch (uploadError) {
          console.error('MenuManagementScreen: Error uploading menu photo:', uploadError);
          console.error('MenuManagementScreen: Error code:', uploadError.code);
          console.error('MenuManagementScreen: Error message:', uploadError.message);
          Alert.alert('Error', `Failed to upload menu photo: ${uploadError.message}`);
        }
      }
    } catch (error) {
      console.error('MenuManagementScreen: Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addMenuItem = async () => {
    if (!newItem.name.trim() || !newItem.price.trim()) {
      Alert.alert('Error', 'Please fill in item name and price');
      return;
    }

    try {
      await addDoc(collection(db, 'menuItems'), {
        ...newItem,
        price: parseFloat(newItem.price) || 0,
        ownerId: auth.currentUser.uid,
        createdAt: new Date()
      });

      setNewItem({
        name: '',
        description: '',
        ingredients: '',
        price: '',
        category: 'Main'
      });
      setShowAddItemModal(false);
      Alert.alert('Success', 'Menu item added successfully!');
    } catch (error) {
      console.error('Error adding menu item:', error);
      Alert.alert('Error', 'Failed to add menu item');
    }
  };

  const deleteMenuItem = async (itemId) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this menu item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'menuItems', itemId));
              Alert.alert('Success', 'Menu item deleted successfully!');
            } catch (error) {
              console.error('Error deleting menu item:', error);
              Alert.alert('Error', 'Failed to delete menu item');
            }
          }
        }
      ]
    );
  };

  const renderMenuItemsByCategory = (category) => {
    const categoryItems = menuItems.filter(item => item.category === category);
    
    if (categoryItems.length === 0) return null;

    return (
      <View key={category} style={styles.categorySection}>
        <Text style={styles.categoryTitle}>{category}</Text>
        {categoryItems.map((item) => (
          <View key={item.id} style={styles.menuItemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
              <TouchableOpacity 
                onPress={() => deleteMenuItem(item.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash" size={16} color="#dc3545" />
              </TouchableOpacity>
            </View>
            {item.description && (
              <Text style={styles.itemDescription}>{item.description}</Text>
            )}
            {item.ingredients && (
              <Text style={styles.itemIngredients}>
                Ingredients: {item.ingredients}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c6f57" />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Menu Management</Text>
        </View>

        {/* Menu Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu Photo</Text>
          
          {menuPhoto ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: menuPhoto }} style={styles.menuImage} />
              <TouchableOpacity 
                onPress={pickImage} 
                style={styles.changePhotoButton}
                disabled={uploadingPhoto}
              >
                <Ionicons name="camera" size={16} color="#2c6f57" />
                <Text style={styles.changePhotoText}>
                  {uploadingPhoto ? 'Uploading...' : 'Change Menu Photo'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={pickImage} 
              style={styles.placeholderContainer}
              disabled={uploadingPhoto}
            >
              <View style={styles.placeholderImage}>
                <Ionicons name="camera" size={40} color="#666" />
                <Text style={styles.placeholderText}>
                  {uploadingPhoto ? 'Uploading...' : 'Tap to add menu photo'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          
          <Text style={styles.photoHint}>
            Upload a photo of your menu for customers to see. This will sync with your web app.
          </Text>
        </View>

        {/* Menu Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Menu Items</Text>
            <TouchableOpacity 
              onPress={() => setShowAddItemModal(true)}
              style={styles.addButton}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {menuItems.length === 0 ? (
            <Text style={styles.noItemsText}>
              No menu items yet. Add your first item to get started!
            </Text>
          ) : (
            categories.map(category => renderMenuItemsByCategory(category))
          )}
        </View>
      </ScrollView>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddItemModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Menu Item</Text>
            <TouchableOpacity onPress={addMenuItem}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.textInput}
                value={newItem.name}
                onChangeText={(text) => setNewItem({...newItem, name: text})}
                placeholder="e.g., Classic Burger"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryButtons}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setNewItem({...newItem, category})}
                    style={[
                      styles.categoryButton,
                      newItem.category === category && styles.categoryButtonActive
                    ]}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      newItem.category === category && styles.categoryButtonTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Price *</Text>
              <TextInput
                style={styles.textInput}
                value={newItem.price}
                onChangeText={(text) => setNewItem({...newItem, price: text})}
                placeholder="9.99"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newItem.description}
                onChangeText={(text) => setNewItem({...newItem, description: text})}
                placeholder="Brief description of the item"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ingredients</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newItem.ingredients}
                onChangeText={(text) => setNewItem({...newItem, ingredients: text})}
                placeholder="List main ingredients (optional)"
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2c6f57',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c6f57',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  placeholderContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  menuImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    resizeMode: 'contain', // Changed from 'cover' to 'contain' to show full image
    marginBottom: 15,
    backgroundColor: '#f8f9fa', // Light background to see image bounds
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 111, 87, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2c6f57',
    alignSelf: 'center',
  },
  changePhotoText: {
    color: '#2c6f57',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  photoHint: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 15,
    paddingHorizontal: 10,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuItemCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginRight: 10,
  },
  deleteButton: {
    padding: 5,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  itemIngredients: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  noItemsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    paddingVertical: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  saveText: {
    fontSize: 16,
    color: '#2c6f57',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonActive: {
    backgroundColor: '#2c6f57',
    borderColor: '#2c6f57',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
});
