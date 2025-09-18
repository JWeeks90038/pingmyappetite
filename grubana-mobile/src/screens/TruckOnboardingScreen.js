import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  Modal,
  Linking,
  AppState,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../components/AuthContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import { colors } from '../theme/colors';
import { API_ENDPOINTS } from '../utils/apiConfig';

export default function TruckOnboardingScreen({ navigation }) {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
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

  // Stripe Connect state
  const [stripeConnectStatus, setStripeConnectStatus] = useState(null);
  const [isSettingUpPayments, setIsSettingUpPayments] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState([]);

  // Toast functions
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

  // Modal functions
  const showModal = (title, message, buttons = [{ text: 'OK', onPress: () => setModalVisible(false) }]) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalButtons(buttons);
    setModalVisible(true);
  };

  // Stripe Connect Functions
  const checkStripeConnectStatus = async () => {
    try {
      setIsCheckingStatus(true);
      const getStripeConnectStatus = httpsCallable(functions, 'getStripeConnectStatus');
      const result = await getStripeConnectStatus();
      
      if (result.data.success) {
        const newStatus = result.data.status;
        
        // Show success message if status changed to completed
        if (newStatus === 'completed' && stripeConnectStatus !== 'completed') {
          showToast('Payment setup completed successfully! You can now accept pre-orders.', 'success');
        }
        
        setStripeConnectStatus(newStatus);
        return newStatus;
      }
    } catch (error) {

    } finally {
      setIsCheckingStatus(false);
    }
    return null;
  };

  const handleStripeConnectOnboarding = async () => {
    if (!user?.uid || !userData?.truckName) {
      showToast('Please complete your truck profile first', 'error');
      return;
    }

    setIsSettingUpPayments(true);

    try {
      // Call Firebase Function to create Stripe Connect onboarding link
      const createOnboardingLink = httpsCallable(functions, 'createStripeConnectOnboardingLink');
      
      const result = await createOnboardingLink({
        userId: user.uid,
        email: user.email,
        businessName: userData.truckName,
        businessType: 'company',
        returnUrl: 'https://grubana.com/stripe-return',
        refreshUrl: 'https://grubana.com/stripe-refresh',
      });

      if (result.data?.onboardingUrl) {
        // Open the Stripe onboarding URL
        const supported = await Linking.canOpenURL(result.data.onboardingUrl);
        if (supported) {
          await Linking.openURL(result.data.onboardingUrl);
          showToast('Complete your Stripe setup in the browser, then return to the app', 'success');
        } else {
          showToast('Unable to open Stripe onboarding. Please try again.', 'error');
        }
      } else {
        showToast('Failed to create onboarding link. Please try again.', 'error');
      }
    } catch (error) {

      showToast('Error setting up payments. Please try again.', 'error');
    } finally {
      setIsSettingUpPayments(false);
    }
  };

  // Category selection function
  const handleCategorySelect = () => {
    const categories = [
      { label: 'None (Remove Category)', value: '' },
      { label: 'Appetizers', value: 'appetizers' },
      { label: 'Main Dishes', value: 'mains' },
      { label: 'Sides', value: 'sides' },
      { label: 'Desserts', value: 'desserts' },
      { label: 'Drinks', value: 'drinks' },
      { label: 'Daily Specials', value: 'specials' },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...categories.map(cat => cat.label)],
          cancelButtonIndex: 0,
          title: 'Select Category',
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedCategory = categories[buttonIndex - 1];
            setNewMenuItem(prev => ({ ...prev, category: selectedCategory.value }));
          }
        }
      );
    } else {
      // For Android, show an Alert with options
   
    }
  };

  // Client-side new items tracking
  const getNewItemIds = async () => {
    try {
      const stored = await AsyncStorage.getItem(`newItemIds_${user?.uid}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      return new Set();
    }
  };

  const saveNewItemIds = async (ids) => {
    try {
      await AsyncStorage.setItem(`newItemIds_${user?.uid}`, JSON.stringify([...ids]));
      setNewItemIds(ids);
    } catch (error) {

    }
  };

  const addNewItemId = async (itemId) => {
    const currentIds = await getNewItemIds();
    currentIds.add(itemId);
    await saveNewItemIds(currentIds);
  };

  const isItemNew = (itemId) => {
    return newItemIds.has(itemId);
  };

  useEffect(() => {
    if (user) {
      loadMenuItems();
      getNewItemIds().then(setNewItemIds);
      checkStripeConnectStatus();
    }
  }, [user]);

  // Check Stripe Connect status periodically when app regains focus
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && user) {
        // User returned to the app, check Stripe status
        checkStripeConnectStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [user]);

  const loadMenuItems = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.MENU_ITEMS}/${user.uid}/menu`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.items || []);
      } else {

      }
    } catch (error) {

    }
  };

  const uploadImageToFirebase = async (file) => {
    try {
      setUploadingImage(true);
      const storage = getStorage();
      const fileName = `menu-items/${user.uid}/${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const storageRef = ref(storage, fileName);
      
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
   
      showToast('Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageSelect = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Sorry, we need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 600,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageFile(asset);
        setImagePreview(asset.uri);
        setNewMenuItem(prev => ({ ...prev, image: asset.uri }));
      }
    } catch (error) {
 
      showToast('Failed to select image. Please try again.');
    }
  };

  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
    setNewMenuItem(prev => ({ ...prev, image: null }));
  };

  const addMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      showToast('Please provide at least a name and price for the menu item.');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;

      if (imageFile) {
        imageUrl = await uploadImageToFirebase(imageFile);
      }

      const menuItemData = {
        ...newMenuItem,
        price: parseFloat(newMenuItem.price),
        image: imageUrl
      };

      const response = await fetch(`${API_ENDPOINTS.MENU_ITEMS}/${user.uid}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(menuItemData)
      });

      if (response.ok) {
        const responseData = await response.json();
        
        if (newMenuItem.isNewItem && responseData.item && responseData.item.id) {
          await addNewItemId(responseData.item.id);
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
        
        await loadMenuItems();
        showToast('Menu item added successfully!', 'success');
      } else {
        showToast('Failed to add menu item. Please try again.');
      }
    } catch (error) {
    
      showToast('Failed to add menu item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteMenuItem = async (itemId) => {
    showModal(
      'Delete Menu Item',
      'Are you sure you want to delete this menu item? This action cannot be undone.',
      [
        { text: 'Cancel', onPress: () => setModalVisible(false) },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_ENDPOINTS.MENU_ITEMS}/${user.uid}/menu/${itemId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${await user.getIdToken()}`
                }
              });

              if (response.ok) {
                await loadMenuItems();
                showToast('Menu item deleted successfully!', 'success');
              } else {
                showToast('Failed to delete menu item. Please try again.');
              }
            } catch (error) {
 
              showToast('Failed to delete menu item. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderPaymentInfo = () => {
    const getStatusDisplay = () => {
      switch (stripeConnectStatus) {
        case 'completed':
          return {
            icon: '✅',
            title: 'Payment Setup Complete',
            text: 'Your payment processing is active and ready to accept pre-orders! You\'ll receive 95% of each order (we take only 5% commission).',
            buttonText: isCheckingStatus ? 'Checking...' : 'Refresh Status',
            buttonAction: checkStripeConnectStatus,
            buttonStyle: styles.secondaryButton,
            showSecondButton: false
          };
        case 'pending':
          return {
            icon: '⏳',
            title: 'Payment Setup In Progress',
            text: 'Your Stripe account is being reviewed. This usually takes a few minutes but can take up to 24 hours.',
            buttonText: isCheckingStatus ? 'Checking...' : 'Check Status',
            buttonAction: checkStripeConnectStatus,
            buttonStyle: styles.secondaryButton,
            showSecondButton: true,
            secondButtonText: 'Complete Setup',
            secondButtonAction: handleStripeConnectOnboarding
          };
        case 'restricted':
          return {
            icon: '⚠️',
            title: 'Payment Setup Needs Attention',
            text: 'Your Stripe account needs additional information. Please complete the setup to start accepting payments.',
            buttonText: isSettingUpPayments ? 'Opening Stripe...' : 'Complete Setup',
            buttonAction: handleStripeConnectOnboarding,
            buttonStyle: styles.warningButton,
            showSecondButton: true,
            secondButtonText: isCheckingStatus ? 'Checking...' : 'Check Status',
            secondButtonAction: checkStripeConnectStatus
          };
        default:
          return {
            icon: '',
            title: 'Stripe Payment Setup Required',
            text: 'Connect your Stripe account to start accepting pre-orders from customers. Quick setup with Stripe Connect. Grubana takes only 5% commission on each food order.',
            buttonText: isSettingUpPayments ? 'Opening Stripe...' : 'Setup Payments',
            buttonAction: handleStripeConnectOnboarding,
            buttonStyle: styles.primaryButton,
            showSecondButton: stripeConnectStatus !== null,
            secondButtonText: isCheckingStatus ? 'Checking...' : 'Check Status',
            secondButtonAction: checkStripeConnectStatus
          };
      }
    };

    const statusInfo = getStatusDisplay();

    return (
      <View style={styles.paymentInfoCard}>
        <View style={styles.paymentHeader}>
          <Text style={styles.paymentIcon}>{statusInfo.icon}</Text>
          <Text style={styles.cardTitle}>{statusInfo.title}</Text>
        </View>
        <Text style={styles.paymentInfoText}>
          {statusInfo.text}
        </Text>
        <TouchableOpacity
          style={[styles.button, statusInfo.buttonStyle]}
          onPress={statusInfo.buttonAction}
          disabled={isSettingUpPayments || isCheckingStatus}
        >
          <Text style={styles.buttonText}>
            {statusInfo.buttonText}
          </Text>
        </TouchableOpacity>
        
        {statusInfo.showSecondButton && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { marginTop: 10 }]}
            onPress={statusInfo.secondButtonAction}
            disabled={isSettingUpPayments || isCheckingStatus}
          >
            <Text style={styles.buttonText}>
              {statusInfo.secondButtonText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mobile Kitchen Management</Text>
        <Text style={styles.headerSubtitle}>Manage your menu and settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Payment Info */}
        {renderPaymentInfo()}

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

          {/* Category Picker with spacing */}
          <TouchableOpacity 
            style={[styles.pickerContainer, { marginTop: 40, marginBottom: 40 }]}
            onPress={handleCategorySelect}
          >
            <View style={styles.pickerContent}>
              <Text style={[styles.pickerText, !newMenuItem.category && styles.placeholderText]}>
                {newMenuItem.category ? 
                  (() => {
                    const categoryLabels = {
                      'appetizers': 'Appetizers',
                      'mains': 'Main Dishes',
                      'sides': 'Sides',
                      'desserts': 'Desserts', 
                      'drinks': 'Drinks',
                      'specials': 'Daily Specials'
                    };
                    return categoryLabels[newMenuItem.category];
                  })()
                  : 'Select Category'
                }
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </View>
          </TouchableOpacity>

          {/* New Item Checkbox with spacing */}
          <TouchableOpacity
            style={[styles.newItemCheckbox, { marginTop: 10, marginBottom: 20 }]}
            onPress={() => {
              const newValue = !newMenuItem.isNewItem;
              setNewMenuItem(prev => ({ ...prev, isNewItem: newValue }));
            }}
          >
            <View style={styles.checkbox}>
              {newMenuItem.isNewItem && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Mark as New Item</Text>
          </TouchableOpacity>

          {/* Add Item Button with extra spacing */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              { marginTop: 15, marginBottom: 10 },
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
                            setImageErrors(prev => ({ ...prev, [item.id]: true }));
                          }}
                        />
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

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toast, 
            toastType === 'success' ? styles.toastSuccess : styles.toastError,
            { opacity: toastOpacity }
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Custom Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>{modalMessage}</Text>
            </View>
            <View style={styles.modalFooter}>
              {modalButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalButton,
                    button.style === 'destructive' ? styles.modalButtonDestructive : styles.modalButtonDefault,
                    modalButtons.length > 1 && index === 0 ? styles.modalButtonFirst : null
                  ]}
                  onPress={() => {
                    setModalVisible(false);
                    if (button.onPress) button.onPress();
                  }}
                >
                  <Text style={[
                    styles.modalButtonText,
                    button.style === 'destructive' ? styles.modalButtonTextDestructive : styles.modalButtonTextDefault
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1,
    padding: 20,
  },
  paymentInfoCard: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.accent.blue,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.blue,
  },
  paymentInfoText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  addItemCard: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
  },
  halfInput: {
    flex: 0.48,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerButton: {
    backgroundColor: colors.accent.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 15,
  },
  imagePickerText: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.status.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  uploadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.text.secondary,
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: colors.background.primary,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  pickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
  },
  selectedCategoryText: {
    color: colors.accent.blue,
    fontWeight: '600',
  },
  placeholderText: {
    color: colors.text.secondary,
  },
  pickerArrow: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 10,
  },
  pickerItem: {
    fontSize: 16,
    color: colors.text.primary,
  },
  newItemCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  checkmark: {
    color: colors.accent.pink,
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkboxLabel: {
    fontSize: 16,
    color: colors.text.primary,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  primaryButton: {
    backgroundColor: colors.accent.pink,
  },
  secondaryButton: {
    backgroundColor: colors.accent.blue,
  },
  warningButton: {
    backgroundColor: colors.accent.yellow,
  },
  disabledButton: {
    backgroundColor: colors.text.secondary,
    opacity: 0.6,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  buttonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuListCard: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  emptyMenuContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyMenuIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
  },
  emptyMenuText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
  },
  menuItemImageContainer: {
    position: 'relative',
  },
  menuItemImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 24,
    marginBottom: 5,
  },
  imagePlaceholderSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: colors.accent.blue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryButtonText: {
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  newItemBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.accent.pink,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newItemBadgeText: {
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.status.error,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  menuItemContent: {
    padding: 12,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newItemTextBadge: {
    backgroundColor: colors.accent.pink,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  newItemTextBadgeText: {
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  smallDeleteButton: {
    backgroundColor: colors.status.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallDeleteButtonText: {
    fontSize: 12,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  menuItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent.pink,
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  categoryTag: {
    backgroundColor: colors.accent.blue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  backButton: {
    backgroundColor: colors.accent.blue,
    margin: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  toastSuccess: {
    backgroundColor: colors.status.success,
  },
  toastError: {
    backgroundColor: colors.status.error,
  },
  toastText: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 0,
    margin: 20,
    maxWidth: 400,
    width: '90%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonFirst: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  modalButtonDefault: {
    backgroundColor: 'transparent',
  },
  modalButtonDestructive: {
    backgroundColor: 'transparent',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextDefault: {
    color: colors.accent.blue,
  },
  modalButtonTextDestructive: {
    color: '#dc3545',
  },
});