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
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../components/AuthContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function TruckOnboardingScreen({ navigation }) {
  const { user } = useAuth();
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
    image: null
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user) {
      checkAccountStatus();
      loadMenuItems();
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
      setAccountStatus(data.status || 'no_account');
      setAccountDetails(data);
    } catch (error) {
      console.error('Error checking account status:', error);
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
        setMenuItems(data.items || []);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const createStripeAccount = async () => {
    setLoading(true);
    try {
      const apiUrl = 'https://pingmyappetite-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          truckId: user.uid,
          email: user.email,
          country: 'US'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAccountStatus('created');
        setAccountDetails(data);
        await checkAccountStatus();
      } else {
        throw new Error(data.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      Alert.alert('Error', 'Failed to create Stripe account. Please try again.');
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

      const apiUrl = 'https://pingmyappetite-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/marketplace/trucks/${user.uid}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          ...newMenuItem,
          price: parseFloat(newMenuItem.price),
          image: imageUrl
        })
      });

      if (response.ok) {
        // Reset form
        setNewMenuItem({
          name: '',
          price: '',
          description: '',
          category: '',
          image: null
        });
        setImageFile(null);
        setImagePreview(null);
        
        // Reload menu items
        await loadMenuItems();
        Alert.alert('Success', 'Menu item added successfully!');
      } else {
        const errorData = await response.json();
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
                • Platform fees: Based on your subscription plan (Basic: 5%, Pro: 2.5%, All-Access: 0%)
              </Text>
            </View>
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
              value={newMenuItem.name}
              onChangeText={(text) => setNewMenuItem(prev => ({ ...prev, name: text }))}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Price (e.g., 12.99)"
              value={newMenuItem.price}
              onChangeText={(text) => setNewMenuItem(prev => ({ ...prev, price: text }))}
              keyboardType="numeric"
            />
          </View>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
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
              {menuItems.map((item, index) => (
                <View key={item.id || index} style={styles.menuItem}>
                  {item.image && (
                    <View style={styles.menuItemImageContainer}>
                      <Image source={{ uri: item.image }} style={styles.menuItemImage} />
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteMenuItem(item.id)}
                      >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.menuItemContent}>
                    <View style={styles.menuItemHeader}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      {!item.image && (
                        <TouchableOpacity
                          style={styles.smallDeleteButton}
                          onPress={() => deleteMenuItem(item.id)}
                        >
                          <Text style={styles.smallDeleteButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      )}
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
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚚 Food Truck Management</Text>
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
                <Text style={styles.planTitle}>🆓 Basic Plan</Text>
                <Text style={styles.planDetails}>Free • 5% platform fee per order</Text>
              </View>
              
              <View style={styles.planCard}>
                <Text style={styles.planTitle}>⭐ Pro Plan</Text>
                <Text style={styles.planDetails}>$9.99/month • 2.5% platform fee per order</Text>
              </View>
              
              <View style={styles.planCard}>
                <Text style={styles.planTitle}>🏆 All-Access Plan</Text>
                <Text style={styles.planDetails}>$19.99/month • 0% platform fee per order</Text>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2c6f57',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e8f5e8',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#2c6f57',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
  },
  activeTabText: {
    color: '#fff',
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
    color: '#666',
  },
  statusCard: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  pendingCard: {
    backgroundColor: '#cce5ff',
    borderColor: '#99ccff',
  },
  successCard: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  errorCard: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 15,
  },
  statusDescription: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 15,
    lineHeight: 20,
  },
  accountDetailsCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 6,
    marginTop: 15,
  },
  accountDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 10,
  },
  accountDetailsText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2c6f57',
  },
  blueButton: {
    backgroundColor: '#0066cc',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addItemCard: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 20,
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
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
    color: '#2c6f57',
    marginBottom: 8,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  imagePickerButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 15,
    flex: 1,
    alignItems: 'center',
  },
  imagePickerText: {
    fontSize: 14,
    color: '#666',
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
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  menuListCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
  },
  emptyMenuContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  emptyMenuIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  emptyMenuText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  menuGrid: {
    gap: 20,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
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
  menuItemContent: {
    padding: 15,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
    flex: 1,
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
    color: '#2c6f57',
    marginBottom: 8,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  categoryTag: {
    backgroundColor: '#e9f7f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c6f57',
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 20,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 15,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  planCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 5,
  },
  planDetails: {
    fontSize: 12,
    color: '#666',
  },
  infoNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  backButton: {
    backgroundColor: '#6c757d',
    margin: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
