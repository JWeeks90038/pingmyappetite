import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Animated,
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

  // Toast and Modal state
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'
  const [toastVisible, setToastVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Toast notification function
  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const categories = ['Appetizer', 'Main', 'Side', 'Dessert', 'Beverage'];

  useEffect(() => {
    let unsubscribe;
    let authUnsubscribe;
    let timeoutId;
    
    authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      
      if (user) {
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          setLoading(false);
        }, 10000); // 10 seconds timeout
        
        try {
          unsubscribe = await loadMenuData(user);
        } catch (error) {
          setLoading(false);
        }
      } else {
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
      setLoading(true);

      // Test basic Firebase connection first
      try {
        const testQuery = query(collection(db, 'users'));
      } catch (testError) {
        setLoading(false);
        return;
      }

      // Load menu photo and basic info
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Use menuUrl field (same as web app) for consistency
          setMenuPhoto(userData.menuUrl || null);
        } else {
        }
      } catch (userDocError) {
      }

      // Load menu items with real-time updates
      
      try {
        const menuItemsQuery = query(
          collection(db, 'menuItems'),
          where('ownerId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(menuItemsQuery, 
          (snapshot) => {
            
            const items = [];
            snapshot.forEach((doc) => {
              items.push({
                id: doc.id,
                ...doc.data()
              });
            });
            
            // Sort by category and name
            items.sort((a, b) => {
              if (a.category !== b.category) {
                return categories.indexOf(a.category) - categories.indexOf(b.category);
              }
              return a.name.localeCompare(b.name);
            });
            
            setMenuItems(items);
            setLoading(false);
          }, 
          (error) => {
            setLoading(false);
          }
        );

        return unsubscribe;
      } catch (queryError) {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        showToast('Please allow access to your photo library to upload menu photos.');
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
          
          // Create a unique filename
          const timestamp = Date.now();
          const filename = `menu-photos/${auth.currentUser.uid}-${timestamp}.jpg`;
          
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
            menuUrl: downloadURL,
            lastUpdated: new Date()
          });
          
          // Update local state
          setMenuPhoto(downloadURL);
          
          showToast('Menu photo updated successfully!', 'success');
        } catch (uploadError) {
          showToast(`Failed to upload menu photo: ${uploadError.message}`);
        }
      }
    } catch (error) {
      showToast('Failed to select image');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addMenuItem = async () => {
    if (!newItem.name.trim() || !newItem.price.trim()) {
      showToast('Please fill in item name and price');
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
      showToast('Menu item added successfully!', 'success');
    } catch (error) {
      showToast('Failed to add menu item');
    }
  };

  const deleteMenuItem = async (itemId) => {
    setItemToDelete(itemId);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'menuItems', itemToDelete));
      showToast('Menu item deleted successfully!', 'success');
    } catch (error) {
      showToast('Failed to delete menu item');
    } finally {
      setDeleteConfirmVisible(false);
      setItemToDelete(null);
    }
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

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteConfirmVisible}
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Text style={styles.confirmModalTitle}>Delete Menu Item</Text>
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to delete this menu item? This action cannot be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalCancelButton}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalDeleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmModalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toast, 
            { opacity: toastOpacity },
            toastType === 'error' ? styles.toastError : styles.toastSuccess
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
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
  // Toast styles
  toast: {
    position: 'absolute',
    top: 80, // Below the green header
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 1000,
  },
  toastSuccess: {
    backgroundColor: '#28a745',
  },
  toastError: {
    backgroundColor: '#dc3545',
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Confirmation Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalContainer: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    margin: 20,
    alignItems: 'center',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmModalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
    minWidth: 80,
  },
  confirmModalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmModalDeleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#dc3545',
    minWidth: 80,
  },
  confirmModalDeleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
