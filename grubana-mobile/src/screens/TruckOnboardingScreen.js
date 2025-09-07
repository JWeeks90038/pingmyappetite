import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../components/AuthContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { colors } from '../theme/colors';

export default function TruckOnboardingScreen({ navigation }) {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [accountDetails, setAccountDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('payment');
  const [menuItems, setMenuItems] = useState([]);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    image: null,
    isNewItem: false
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [newItemIds, setNewItemIds] = useState(new Set());

  // Client-side new items tracking (temporary workaround)
  const getNewItemIds = async () => {
    try {
      const stored = await AsyncStorage.getItem(`newItemIds_${user?.uid}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.error('Error getting new item IDs:', error);
      return new Set();
    }
  };

  const saveNewItemIds = async (ids) => {
    try {
      await AsyncStorage.setItem(`newItemIds_${user?.uid}`, JSON.stringify([...ids]));
      setNewItemIds(ids);
    } catch (error) {
      console.error('Error saving new item IDs:', error);
    }
  };

  const addNewItemId = async (itemId) => {
    const currentIds = await getNewItemIds();
    currentIds.add(itemId);
    await saveNewItemIds(currentIds);
    console.log('✅ Added item to new items list:', itemId);
  };

  const isItemNew = (itemId) => {
    return newItemIds.has(itemId);
  };

  const toggleNewItemStatus = async (itemId) => {
    const currentIds = await getNewItemIds();
    if (currentIds.has(itemId)) {
      currentIds.delete(itemId);
      console.log('🏷️ Removed item from new items list:', itemId);
    } else {
      currentIds.add(itemId);
      console.log('🏷️ Added item to new items list:', itemId);
    }
    await saveNewItemIds(currentIds);
  };

  useEffect(() => {
    if (user) {
      checkAccountStatus();
      loadMenuItems();
      // Load stored new item IDs
      getNewItemIds().then(setNewItemIds);
    }
  }, [user]);

  const checkAccountStatus = async () => {
    try {
      console.log('🔍 Checking account status - user object:', user);
      
      const token = await user.getIdToken();
      console.log('🔍 Token obtained for status check:', token ? 'Token received' : 'No token');
      
      const apiUrl = 'https://pingmyappetite-production.up.railway.app';
      console.log('🌍 Making status API call to:', `${apiUrl}/api/marketplace/trucks/status`);
      
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('📊 Account status response:', data);
      
      // Use real Stripe status from API response
      setAccountStatus(data.status || 'no_account');
      setAccountDetails(data);
    } catch (error) {
      console.error('Error checking account status:', error);
      setAccountStatus('error');
      setAccountDetails(null);
    }
  };

  const syncPaymentData = async () => {
    try {
      console.log('🔄 Syncing payment data to enable pre-orders...');
      setLoading(true);
      
      const token = await user.getIdToken();
      const apiUrl = 'https://pingmyappetite-production.up.railway.app';
      
      console.log('🔄 SYNC DEBUG: Making API call to:', `${apiUrl}/api/marketplace/trucks/sync-payment-data`);
      
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/sync-payment-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔄 SYNC DEBUG: Response status:', response.status);
      console.log('🔄 SYNC DEBUG: Response headers:', response.headers);
      
      // Get response as text first to see what we're actually getting
      const responseText = await response.text();
      console.log('🔄 SYNC DEBUG: Raw response text:', responseText.substring(0, 200) + '...');
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('🔄 SYNC DEBUG: Parsed JSON data:', data);
      } catch (parseError) {
        console.error('🔄 SYNC DEBUG: JSON parse failed:', parseError);
        console.error('🔄 SYNC DEBUG: Full response text:', responseText);
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}...`);
      }
      
      if (response.ok) {
        Alert.alert(
          'Success!', 
          'Payment data synced successfully. Pre-orders should now work properly!',
          [
            {
              text: 'OK',
              onPress: () => checkAccountStatus() // Refresh status
            }
          ]
        );
      } else {
        throw new Error(data.error || 'Failed to sync payment data');
      }
    } catch (error) {
      console.error('Error syncing payment data:', error);
      Alert.alert('Error', `Failed to sync payment data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async () => {
    try {
      const apiUrl = 'https://pingmyappetite-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/${user.uid}/menu`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🍽️ FULL API Response from backend:', JSON.stringify(data, null, 2));
        console.log('🍽️ Loaded menu items:', data.items);
        // Log all fields for each item to check what's missing
        data.items?.forEach((item, index) => {
          const imageUrl = item.image || item.imageUrl;
          console.log(`🔍 FULL Item ${index} (${item.name}):`, JSON.stringify(item, null, 2));
          console.log(`Item ${index}: ${item.name} - Image: ${imageUrl || 'No image'} - isNewItem: ${item.isNewItem}`);
        });
        setMenuItems(data.items || []);
      } else {
        console.error('❌ Failed to load menu items. Status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const createStripeAccount = async () => {
    setLoading(true);
    try {
      const apiUrl = 'https://pingmyappetite-production.up.railway.app';
      const businessName = userData?.truckName || user?.displayName || 'Mobile Kitchen Business';
      
      console.log('🔍 Creating Stripe account with data:', {
        truckId: user.uid,
        email: user.email,
        businessName,
        country: 'US'
      });
      
      const token = await user.getIdToken();
      console.log('🔐 Got auth token:', token ? 'Yes' : 'No');
      
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          truckId: user.uid,
          email: user.email,
          businessName,
          country: 'US'
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      const data = await response.json();
      console.log('📥 Server response:', data);

      if (response.ok) {
        setAccountStatus('created');
        setAccountDetails(data);
        await checkAccountStatus();
      } else {
        console.error('❌ Server error response:', data);
        throw new Error(data.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert('Error', `Failed to create Stripe account. ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const getOnboardingLink = async () => {
    setLoading(true);
    try {
      console.log('🔐 Getting onboarding link - user object:', user);
      
      const token = await user.getIdToken();
      console.log('🔐 Token obtained:', token ? 'Token received' : 'No token');
      
      const apiUrl = 'https://pingmyappetite-production.up.railway.app';
      console.log('🌍 Making API call to:', `${apiUrl}/api/marketplace/trucks/onboarding-link`);
      
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/onboarding-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          truckId: user.uid,
          accountId: accountDetails?.stripeAccountId || accountDetails?.accountId
        })
      });

      const data = await response.json();

      if (response.ok) {
        Linking.openURL(data.onboardingUrl);
      } else {
        throw new Error(data.error || 'Failed to create onboarding link');
      }
    } catch (error) {
      console.error('Error getting onboarding link:', error);
      Alert.alert('Error', 'Failed to get onboarding link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      Alert.alert('Error', 'Please provide at least a name and price for the menu item.');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (imageFile) {
        imageUrl = await uploadImageToFirebase(imageFile);
      }

      const menuItemData = {
        ...newMenuItem,
        price: parseFloat(newMenuItem.price),
        image: imageUrl
      };

      console.log('📤 Sending menu item data:', menuItemData);
      console.log('📤 API URL:', `${apiUrl}/api/marketplace/trucks/${user.uid}/menu`);
      console.log('📤 User UID:', user.uid);

      const apiUrl = 'https://pingmyappetite-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/${user.uid}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(menuItemData)
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Backend add menu item response:', JSON.stringify(responseData, null, 2));
        
        // If this was marked as a new item, track it client-side
        if (newMenuItem.isNewItem && responseData.item && responseData.item.id) {
          await addNewItemId(responseData.item.id);
          console.log('🏷️ Marked item as new (client-side):', responseData.item.id);
        }
        
        // Reset form
        setNewMenuItem({
          name: '',
          price: '',
          description: '',
          category: '',
          image: null,
          isNewItem: false
        });
        setImageFile(null);
        setImagePreview(null);
        
        // Reload menu items to see what was actually saved
        console.log('🔄 Reloading menu items to verify isNewItem was saved...');
        await loadMenuItems();
        Alert.alert('Success', 'Menu item added successfully!');
      } else {
        const errorData = await response.json();
        console.error('❌ Backend error response:', JSON.stringify(errorData, null, 2));
        throw new Error(errorData.error || 'Failed to add menu item');
      }
    } catch (error) {
      console.error('Error adding menu item:', error);
      Alert.alert('Error', 'Failed to add menu item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteMenuItem = async (itemId) => {
    Alert.alert(
      'Delete Menu Item',
      'Are you sure you want to delete this menu item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const apiUrl = 'https://pingmyappetite-production.up.railway.app';
              const response = await fetch(`${apiUrl}/api/marketplace/trucks/${user.uid}/menu/${itemId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${await user.getIdToken()}`
                }
              });

              if (response.ok) {
                await loadMenuItems();
                Alert.alert('Success', 'Menu item deleted successfully!');
              } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete menu item');
              }
            } catch (error) {
              console.error('Error deleting menu item:', error);
              Alert.alert('Error', 'Failed to delete menu item. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleImageSelect = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Denied', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImageFile(asset);
      setImagePreview(asset.uri);
    }
  };

  const uploadImageToFirebase = async (file) => {
    try {
      setUploadingImage(true);
      
      const storage = getStorage();
      const fileName = `menu-items/${user.uid}/${Date.now()}-${file.fileName || 'image.jpg'}`;
      const storageRef = ref(storage, fileName);
      
      // Convert URI to blob for upload
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Upload file
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
    setNewMenuItem(prev => ({ ...prev, image: null }));
  };

  const renderAccountStatus = () => {
    if (!accountStatus) {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color="#2c6f57" />
          <Text style={styles.statusText}>Loading account status...</Text>
        </View>
      );
    }

    switch (accountStatus) {
      case 'no_account':
        return (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>🏪 Set Up Your Stripe Connect Account</Text>
            <Text style={styles.statusDescription}>
              To start accepting orders and payments from customers, you need to set up a Stripe Connect account. 
              This allows you to receive payments directly with our flexible tiered platform fee structure based on your chosen subscription plan.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={createStripeAccount}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Setting up...' : '🔗 Connect with Stripe'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'created':
      case 'pending':
        return (
          <View style={[styles.statusCard, styles.pendingCard]}>
            <Text style={styles.statusTitle}>⏳ Complete Your Stripe Setup</Text>
            <Text style={styles.statusDescription}>
              Your Stripe account has been created! Complete the onboarding process to start receiving payments.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.blueButton]}
              onPress={getOnboardingLink}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Loading...' : '✅ Complete Stripe Onboarding'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'active':
        return (
          <View style={[styles.statusCard, styles.successCard]}>
            <Text style={styles.statusTitle}>✅ Payment Setup Complete!</Text>
            <Text style={styles.statusDescription}>
              Your Stripe account is active and ready to receive payments. Customers can now place pre-orders!
            </Text>
            <View style={styles.accountDetailsCard}>
              <Text style={styles.accountDetailsTitle}>Account Details:</Text>
              <Text style={styles.accountDetailsText}>
                • Account ID: {accountDetails?.stripeAccountId?.slice(0, 12)}...{'\n'}
                • Status: Ready to accept payments{'\n'}
                • Platform fees: Based on your subscription plan (Starter: 5%, Pro: 2.5%, All-Access: 0%)
              </Text>
            </View>
            
            <Text style={[styles.statusDescription, { marginTop: 15, fontSize: 14, fontStyle: 'italic' }]}>
              If customers see "Payment Not Available" errors, click the button below to sync your payment data:
            </Text>
            
            <TouchableOpacity
              style={[styles.button, styles.blueButton, { marginTop: 10 }]}
              onPress={syncPaymentData}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Syncing...' : '🔄 Sync Payment Data'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <View style={[styles.statusCard, styles.errorCard]}>
            <Text style={styles.statusTitle}>❌ Account Setup Issue</Text>
            <Text style={styles.statusDescription}>
              There's an issue with your payment account setup. Please try again or contact support.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={() => checkAccountStatus()}
            >
              <Text style={styles.buttonText}>🔄 Refresh Status</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  const renderMenuManagement = () => {
    return (
      <ScrollView style={styles.tabContent}>
        {/* Add New Menu Item */}
        <View style={styles.addItemCard}>
          <Text style={styles.cardTitle}>🍽️ Add New Menu Item</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Item Name (e.g., Classic Cheeseburger)"
              placeholderTextColor={colors.text.secondary}
              value={newMenuItem.name}
              onChangeText={(text) => setNewMenuItem(prev => ({ ...prev, name: text }))}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Price (e.g., 12.99)"
              placeholderTextColor={colors.text.secondary}
              value={newMenuItem.price}
              onChangeText={(text) => setNewMenuItem(prev => ({ ...prev, price: text }))}
              keyboardType="numeric"
            />
          </View>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.text.secondary}
            value={newMenuItem.description}
            onChangeText={(text) => setNewMenuItem(prev => ({ ...prev, description: text }))}
            multiline={true}
            numberOfLines={3}
          />

          {/* Image Upload Section */}
          <View style={styles.imageSection}>
            <Text style={styles.imageLabel}>📸 Menu Item Photo (optional)</Text>
            
            <View style={styles.imageRow}>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handleImageSelect}
              >
                <Text style={styles.imagePickerText}>Choose Image</Text>
              </TouchableOpacity>

              {imagePreview && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={clearImageSelection}
                  >
                    <Text style={styles.removeImageText}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {uploadingImage && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#0066cc" />
                <Text style={styles.uploadingText}>📤 Uploading image...</Text>
              </View>
            )}
          </View>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={newMenuItem.category}
              onValueChange={(value) => setNewMenuItem(prev => ({ ...prev, category: value }))}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Select Category (optional)" value="" />
              <Picker.Item label="Appetizers" value="appetizers" />
              <Picker.Item label="Main Dishes" value="mains" />
              <Picker.Item label="Sides" value="sides" />
              <Picker.Item label="Desserts" value="desserts" />
              <Picker.Item label="Drinks" value="drinks" />
              <Picker.Item label="Daily Specials" value="specials" />
            </Picker>
          </View>

          {/* New Item Checkbox - Simple */}
          <TouchableOpacity
            style={styles.newItemCheckbox}
            onPress={() => {
              console.log('New Item checkbox pressed - Current value:', newMenuItem.isNewItem);
              const newValue = !newMenuItem.isNewItem;
              setNewMenuItem(prev => ({ ...prev, isNewItem: newValue }));
              console.log('New Item value changed to:', newValue);
            }}
          >
            <View style={styles.checkbox}>
              {newMenuItem.isNewItem && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Mark as New Item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              (!newMenuItem.name || !newMenuItem.price || loading || uploadingImage) && styles.disabledButton
            ]}
            onPress={addMenuItem}
            disabled={!newMenuItem.name || !newMenuItem.price || loading || uploadingImage}
          >
            <Text style={styles.buttonText}>
              {uploadingImage ? '📤 Uploading Image...' : (loading ? 'Adding...' : '➕ Add Item')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Current Menu Items */}
        <View style={styles.menuListCard}>
          <Text style={styles.cardTitle}>📋 Your Current Menu ({menuItems.length} items)</Text>
          
          {menuItems.length === 0 ? (
            <View style={styles.emptyMenuContainer}>
              <Text style={styles.emptyMenuIcon}>🍽️</Text>
              <Text style={styles.emptyMenuTitle}>No menu items yet</Text>
              <Text style={styles.emptyMenuText}>Add your first menu item above to get started!</Text>
            </View>
          ) : (
            <View style={styles.menuGrid}>
              {menuItems.map((item, index) => {
                const imageUrl = item.image || item.imageUrl;
                return (
                <View key={item.id || index} style={styles.menuItem}>
                  {imageUrl && !imageErrors[item.id] ? (
                    <View style={styles.menuItemImageContainer}>
                      <Image 
                        source={{ uri: imageUrl }} 
                        style={styles.menuItemImage}
                        onError={(error) => {
                          console.log(`❌ Image failed to load for ${item.name}:`, error.nativeEvent.error);
                          setImageErrors(prev => ({ ...prev, [item.id]: true }));
                        }}
                        onLoad={() => console.log(`✅ Image loaded successfully for ${item.name}`)}
                      />
                      {(item.isNewItem || isItemNew(item.id)) && (
                        <View style={styles.newItemBadge}>
                          <Text style={styles.newItemBadgeText}>NEW</Text>
                        </View>
                      )}
                      {console.log(`🏷️ Item "${item.name}" - Backend isNewItem: ${item.isNewItem} - Client isNewItem: ${isItemNew(item.id)} - Should show badge: ${!!(item.isNewItem || isItemNew(item.id))}`)}
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteMenuItem(item.id)}
                      >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ) : imageUrl && imageErrors[item.id] ? (
                    <View style={styles.menuItemImageContainer}>
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderText}>🍽️</Text>
                        <Text style={styles.imagePlaceholderSubtext}>Image unavailable</Text>
                        <TouchableOpacity
                          style={styles.retryButton}
                          onPress={() => {
                            setImageErrors(prev => ({ ...prev, [item.id]: false }));
                          }}
                        >
                          <Text style={styles.retryButtonText}>🔄 Retry</Text>
                        </TouchableOpacity>
                      </View>
                      {(item.isNewItem || isItemNew(item.id)) && (
                        <View style={styles.newItemBadge}>
                          <Text style={styles.newItemBadgeText}>NEW</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteMenuItem(item.id)}
                      >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <View style={styles.menuItemContent}>
                    <View style={styles.menuItemHeader}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <View style={styles.headerButtonsContainer}>
                        {(item.isNewItem || isItemNew(item.id)) && !imageUrl && (
                          <View style={styles.newItemTextBadge}>
                            <Text style={styles.newItemTextBadgeText}>NEW</Text>
                          </View>
                        )}
                        {!imageUrl && (
                          <TouchableOpacity
                            style={styles.smallDeleteButton}
                            onPress={() => deleteMenuItem(item.id)}
                          >
                            <Text style={styles.smallDeleteButtonText}>🗑️</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    
                    <Text style={styles.menuItemPrice}>${parseFloat(item.price).toFixed(2)}</Text>
                    
                    {item.description && (
                      <Text style={styles.menuItemDescription}>{item.description}</Text>
                    )}
                    
                    {item.category && (
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mobile Kitchen Business Management</Text>
        <Text style={styles.headerSubtitle}>Set up payments and manage your menu</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payment' && styles.activeTab]}
          onPress={() => setActiveTab('payment')}
        >
          <Text style={[styles.tabText, activeTab === 'payment' && styles.activeTabText]}>
            💳 Payment Setup
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'menu' && styles.activeTab]}
          onPress={() => setActiveTab('menu')}
        >
          <Text style={[styles.tabText, activeTab === 'menu' && styles.activeTabText]}>
            🍽️ Menu Management
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'payment' ? (
        <ScrollView style={styles.tabContent}>
          {renderAccountStatus()}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>💰 How Our Tiered Payment Structure Works</Text>
            
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>📋 Order Process:</Text>
              <Text style={styles.infoText}>
                • Customers browse your menu and place orders before arriving{'\n'}
                • You receive instant notifications when orders come in{'\n'}
                • Payments are processed securely through Stripe Connect{'\n'}
                • You get paid directly to your bank account within 2 business days
              </Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>💳 Subscription Plans & Platform Fees:</Text>
              
              <View style={styles.planCard}>
                <Text style={styles.planTitle}>🆓 Starter Plan</Text>
                <Text style={styles.planDetails}>Free • 5% platform fee per order</Text>
              </View>
              
              <View style={styles.planCard}>
                <Text style={styles.planTitle}>⭐ Pro Plan</Text>
                <Text style={styles.planDetails}>$9/month • 2.5% platform fee per order</Text>
              </View>
              
              <View style={styles.planCard}>
                <Text style={styles.planTitle}>🏆 All-Access Plan</Text>
                <Text style={styles.planDetails}>$19/month • 0% platform fee per order</Text>
              </View>
              
              <Text style={styles.infoNote}>
                💡 Platform fees are automatically deducted from your payout - customers always pay full menu price
              </Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>🔒 Security & Support:</Text>
              <Text style={styles.infoText}>
                • Bank-level security with PCI DSS compliance{'\n'}
                • 24/7 fraud monitoring and chargeback protection{'\n'}
                • Dedicated customer support for order issues{'\n'}
                • Real-time order tracking and analytics dashboard
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        renderMenuManagement()
      )}

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.background.secondary,
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: colors.accent.pink,
    shadowColor: colors.accent.pink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: colors.accent.pink,
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.secondary,
    textAlign: 'center',
  },
  activeTabText: {
    color: colors.text.primary,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  statusContainer: {
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.blue,
  },
  pendingCard: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.accent.blue,
  },
  successCard: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.status.success,
  },
  errorCard: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.status.error,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  accountDetailsCard: {
    backgroundColor: colors.background.secondary,
    padding: 15,
    borderRadius: 6,
    marginTop: 15,
    borderWidth: 2,
    borderColor: colors.border,
    borderTopWidth: 3,
    borderTopColor: colors.accent.blue,
  },
  accountDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
  },
  accountDetailsText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 150,
  },
  primaryButton: {
    backgroundColor: colors.accent.pink,
  },
  blueButton: {
    backgroundColor: colors.accent.blue,
  },
  dangerButton: {
    backgroundColor: colors.status.error,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  addItemCard: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 20,
    marginBottom: 30,
    borderBottomWidth: 4,
    borderBottomColor: colors.accent.blue,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.background.primary,
    color: colors.text.primary,
  },
  halfInput: {
    width: '48%',
  },
  textArea: {
    marginBottom: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imageSection: {
    marginBottom: 15,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  imagePickerButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 15,
    flex: 1,
    alignItems: 'center',
  },
  imagePickerText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2c6f57',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    backgroundColor: '#cce5ff',
    borderRadius: 4,
    gap: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: '#0066cc',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    marginBottom: 15,
    backgroundColor: colors.background.primary,
    height: 50,
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    color: colors.text.primary,
    fontSize: 16,
    marginTop: -6,
    marginBottom: -6,
  },
  pickerItem: {
    height: 50,
    color: colors.text.primary,
    fontSize: 16,
  },
  newItemCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -85,
    paddingVertical: 0,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 3,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: colors.text.primary,
  },
  menuListCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 20,
  },
  emptyMenuContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
  },
  emptyMenuIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  emptyMenuText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  menuGrid: {
    gap: 20,
  },
  menuItem: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemImageContainer: {
    position: 'relative',
    height: 180,
  },
  menuItemImage: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
  },
  newItemBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  newItemBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 32,
    marginBottom: 5,
  },
  imagePlaceholderSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuItemContent: {
    padding: 15,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newItemTextBadge: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newItemTextBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  smallDeleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallDeleteButtonText: {
    fontSize: 12,
  },
  menuItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  menuItemDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
    textAlign: 'center',
  },
  categoryTag: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 20,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent.blue,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  planCard: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  planDetails: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  infoNote: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 10,
  },
  backButton: {
    backgroundColor: colors.background.secondary,
    margin: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
