import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  TextInput, 
  Image, 
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../components/AuthContext';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export default function MenuManagementScreen() {
  console.log('🔧 DEBUG: MenuManagementScreen loaded - NEW ITEM feature should be visible!');
  
  // SUPER AGGRESSIVE DEBUG - This should be impossible to miss
  alert('🚨 MENU MANAGEMENT SCREEN LOADED! 🚨\nThe New Item feature should be visible!');
  
  const navigation = useNavigation();
  const { user, userData } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    image: null,
    imageUrl: '',
    isNewItem: false
  });
  const [uploading, setUploading] = useState(false);

  const categories = [
    'Appetizers', 'Entree', 'Sides', 'Desserts', 'Beverages', 'Specials'
  ];

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      console.log('DEBUG: Loading menu items for user:', user.uid);
      const menuItemsRef = collection(db, 'menuItems');
      const menuSnapshot = await getDocs(query(menuItemsRef, where('ownerId', '==', user.uid)));
      
      const items = [];
      menuSnapshot.forEach(doc => {
        const itemData = { id: doc.id, ...doc.data() };
        console.log('DEBUG: Menu item loaded:', itemData.name, 'ImageURL:', itemData.imageUrl, 'IsNew:', itemData.isNewItem);
        items.push(itemData);
      });

      // Sort by category and then by name
      items.sort((a, b) => {
        if (a.category !== b.category) {
          return (a.category || '').localeCompare(b.category || '');
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      console.log('DEBUG: Total menu items loaded:', items.length);
      setMenuItems(items);
    } catch (error) {
      console.error('Error loading menu items:', error);
      Alert.alert('Error', 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image: null,
      imageUrl: '',
      isNewItem: false
    });
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price?.toString() || '',
      category: item.category || '',
      image: null,
      imageUrl: item.imageUrl || '',
      isNewItem: item.isNewItem || false
    });
    setEditingItem(item);
    setShowAddModal(true);
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, image: result.assets[0] }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (imageAsset) => {
    if (!imageAsset) return null;

    try {
      setUploading(true);
      
      // Create a blob from the image
      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();
      
      // Create a reference with timestamp to ensure uniqueness
      const timestamp = Date.now();
      const imageRef = ref(storage, `menuItems/${user.uid}/${timestamp}`);
      
      // Upload the image
      await uploadBytes(imageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
      
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const saveMenuItem = async () => {
    // DEBUG: Log the formData to see if isNewItem is recognized
    console.log('DEBUG - Saving Menu Item with formData:', formData);
    
    if (!formData.name.trim() || !formData.price.trim()) {
      Alert.alert('Missing Information', 'Please fill in the name and price');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
      return;
    }

    try {
      setUploading(true);
      
      let imageUrl = formData.imageUrl;
      
      // Upload new image if selected
      if (formData.image) {
        imageUrl = await uploadImage(formData.image);
      }

      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: price,
        category: formData.category || 'Uncategorized',
        imageUrl: imageUrl || '',
        isNewItem: formData.isNewItem,
        ownerId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingItem) {
        // Update existing item
        await updateDoc(doc(db, 'menuItems', editingItem.id), itemData);
        Alert.alert('Success', 'Menu item updated successfully!');
      } else {
        // Add new item
        itemData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'menuItems'), itemData);
        Alert.alert('Success', 'Menu item added successfully!');
      }

      setShowAddModal(false);
      resetForm();
      await loadMenuItems();
      
    } catch (error) {
      console.error('Error saving menu item:', error);
      Alert.alert('Error', 'Failed to save menu item');
    }
  };

  const deleteMenuItem = (item) => {
    Alert.alert(
      'Delete Menu Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'menuItems', item.id));
              Alert.alert('Success', 'Menu item deleted successfully!');
              await loadMenuItems();
            } catch (error) {
              console.error('Error deleting menu item:', error);
              Alert.alert('Error', 'Failed to delete menu item');
            }
          }
        }
      ]
    );
  };

  const renderMenuItem = (item) => (
    <View key={item.id} style={styles.menuItemCard}>
      <View style={styles.menuItemHeader}>
        <View style={styles.menuItemInfo}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          <Text style={styles.menuItemCategory}>{item.category}</Text>
          <Text style={styles.menuItemPrice}>${item.price?.toFixed(2)}</Text>
        </View>
        <View style={styles.menuItemImageContainer}>
          {item.imageUrl ? (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.menuItemImage}
              onError={(error) => {
                console.log('DEBUG: Image load error for item:', item.name, 'URL:', item.imageUrl, 'Error:', error.nativeEvent.error);
              }}
              onLoad={() => {
                console.log('DEBUG: Image loaded successfully for:', item.name, 'URL:', item.imageUrl);
              }}
            />
          ) : (
            <View style={[styles.menuItemImage, {backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center'}]}>
              <Ionicons name="image-outline" size={32} color="#ccc" />
              <Text style={{fontSize: 10, color: '#999'}}>No Image</Text>
            </View>
          )}
          {item.isNewItem && (
            <View style={styles.newItemBadge}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.newItemBadgeText}>NEW</Text>
            </View>
          )}
        </View>
      </View>
      
      {item.description && (
        <Text style={styles.menuItemDescription}>{item.description}</Text>
      )}
      
      <View style={styles.menuItemActions}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={16} color="#fff" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => deleteMenuItem(item)}
        >
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c6f57" />
        <Text style={styles.loadingText}>Loading menu items...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* DEBUG: Visual indicator that code changes are active */}
      <View style={{backgroundColor: 'red', padding: 10, alignItems: 'center'}}>
        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>
          🔧 CODE UPDATED - NEW ITEM FEATURE ACTIVE 🔧
        </Text>
      </View>
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2c6f57" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Menu Management</Text>
          <Text style={styles.subtitle}>
            {userData?.truckName || 'Your Food Truck'} Menu
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {menuItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>No Menu Items Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start building your menu by adding your first item!
            </Text>
          </View>
        ) : (
          <View style={styles.menuList}>
            <Text style={styles.menuCount}>
              {menuItems.length} menu item{menuItems.length !== 1 ? 's' : ''}
            </Text>
            {menuItems.map(renderMenuItem)}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Menu Item</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowAddModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </Text>
            <TouchableOpacity 
              style={[styles.modalSaveButton, uploading && styles.disabledButton]}
              onPress={saveMenuItem}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSaveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Item Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Item Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="e.g., Classic Cheeseburger"
                maxLength={50}
              />
            </View>

            {/* Price */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={styles.input}
                value={formData.price}
                onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                placeholder="e.g., 12.99"
                keyboardType="decimal-pad"
                maxLength={10}
              />
            </View>

            {/* SIMPLE NEW ITEM TOGGLE - VERY OBVIOUS */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>⭐ MARK AS NEW ITEM ⭐</Text>
              <TouchableOpacity 
                style={{
                  backgroundColor: formData.isNewItem ? '#ff6b35' : '#f0f0f0',
                  padding: 20,
                  borderRadius: 10,
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: formData.isNewItem ? '#ff6b35' : '#ddd',
                  marginVertical: 10
                }}
                onPress={() => {
                  console.log('🔥 NEW ITEM BUTTON PRESSED - Current value:', formData.isNewItem);
                  const newValue = !formData.isNewItem;
                  setFormData(prev => ({ ...prev, isNewItem: newValue }));
                  console.log('🔥 NEW ITEM VALUE CHANGED TO:', newValue);
                }}
              >
                <Text style={{
                  color: formData.isNewItem ? 'white' : '#333',
                  fontSize: 20,
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  {formData.isNewItem ? '⭐ NEW ITEM ACTIVE ⭐\n(Will show badge)' : '❌ NOT NEW ITEM\nTAP TO MARK AS NEW'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Describe your item..."
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            {/* New Item Button - Extra Prominent Design */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Mark as NEW Item?</Text>
              <TouchableOpacity 
                style={[
                  styles.newItemButton,
                  formData.isNewItem ? styles.newItemButtonActive : styles.newItemButtonInactive
                ]}
                onPress={() => {
                  setFormData(prev => ({ ...prev, isNewItem: !prev.isNewItem }));
                  // Show feedback when pressed
                  Alert.alert(
                    formData.isNewItem ? "Item Unmarked" : "Item Marked as NEW", 
                    formData.isNewItem 
                      ? "This item will no longer display a NEW badge" 
                      : "This item will display a NEW badge when saved"
                  );
                }}
              >
                <Ionicons 
                  name={formData.isNewItem ? "star" : "star-outline"} 
                  size={32} 
                  color={formData.isNewItem ? "#fff" : "#f39c12"} 
                />
                <Text style={[
                  styles.newItemButtonText,
                  formData.isNewItem ? styles.newItemButtonTextActive : styles.newItemButtonTextInactive
                ]}>
                  {formData.isNewItem ? "NEW ITEM ★ (Badge Will Display)" : "TAP HERE TO MARK AS NEW ITEM"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Image */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Item Image</Text>
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                {formData.image || formData.imageUrl ? (
                  <Image 
                    source={{ uri: formData.image?.uri || formData.imageUrl }} 
                    style={styles.selectedImage} 
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color="#999" />
                    <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Category - Fixed Placement */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryContainerFixed}>
                <Text style={styles.selectedCategoryLabel}>
                  {formData.category || 'Select a category'}
                </Text>
                <View style={styles.categoriesWrapper}>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        formData.category === category && styles.categoryChipSelected
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, category }))}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        formData.category === category && styles.categoryChipTextSelected
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    color: '#666',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#2c6f57',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#a8d5ba',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  menuList: {
    paddingBottom: 100,
  },
  menuCount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    fontWeight: '500',
  },
  menuItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 15,
  },
  menuItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuItemCategory: {
    fontSize: 14,
    color: '#2c6f57',
    fontWeight: '500',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e67e22',
  },
  menuItemImageContainer: {
    position: 'relative',
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  newItemBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f39c12',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  newItemBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    lineHeight: 18,
  },
  menuItemActions: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  editButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#2c6f57',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#2c6f57',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSaveButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryContainerFixed: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
  },
  selectedCategoryLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    fontWeight: '500',
  },
  categoriesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  categoryChipSelected: {
    backgroundColor: '#2c6f57',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
  newItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  newItemButtonActive: {
    backgroundColor: '#f39c12',
    borderColor: '#e67e22',
  },
  newItemButtonInactive: {
    backgroundColor: '#fff',
    borderColor: '#f39c12',
    borderStyle: 'dashed',
  },
  newItemButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    textTransform: 'uppercase',
  },
  newItemButtonTextActive: {
    color: '#fff',
  },
  newItemButtonTextInactive: {
    color: '#f39c12',
  },
});
