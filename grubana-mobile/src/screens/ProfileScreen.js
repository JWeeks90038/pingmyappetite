import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  Switch,
  Modal,
  ActivityIndicator,
  Image
} from 'react-native';
import { signOut, sendPasswordResetEmail, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../components/AuthContext';
import ContactFormModal from '../components/ContactFormModal';
import { auth, db, storage } from '../firebase';
import { useStripe, CardField, usePaymentSheet } from '@stripe/stripe-react-native';

export default function ProfileScreen() {
  const { user, userData, userRole, userPlan } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [userProfile, setUserProfile] = useState({
    username: userData?.username || '',
    truckName: userData?.truckName || '',
    ownerName: userData?.ownerName || '',
    phone: userData?.phone || '',
    location: userData?.location || '',
    cuisine: userData?.cuisine || '',
    hours: userData?.hours || '',
    description: userData?.description || '',
    menuUrl: userData?.menuUrl || '',
    coverUrl: userData?.coverUrl || '',
  });
  const [socialLinks, setSocialLinks] = useState({
    instagram: userData?.instagram || '',
    facebook: userData?.facebook || '',
    tiktok: userData?.tiktok || '',
    twitter: userData?.twitter || '',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
  });
  const [newEmail, setNewEmail] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [modalInput, setModalInput] = useState('');
  
  // Payment method states
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [customerStripeId, setCustomerStripeId] = useState(null);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [paymentMethodsAvailable, setPaymentMethodsAvailable] = useState(true); // Feature availability flag

  useEffect(() => {
    if (userData) {
      console.log('🔍 ProfileScreen: Full userData object:', userData);
      console.log('🔍 ProfileScreen: Available userData fields:', Object.keys(userData));
      console.log('🔍 ProfileScreen: userData.username:', userData.username);
      console.log('🔍 ProfileScreen: user.displayName:', user?.displayName);
      console.log('🔍 ProfileScreen: user.email:', user?.email);
      
      setUserProfile({
        username: userData.username || userData.displayName || user?.displayName || user?.email?.split('@')[0] || '',
        truckName: userData.truckName || '',
        ownerName: userData.ownerName || '',
        phone: userData.phone || '',
        location: userData.location || '',
        cuisine: userData.cuisine || '',
        hours: userData.hours || '',
        description: userData.description || '',
        menuUrl: userData.menuUrl || '',
        coverUrl: userData.coverUrl || '',
      });
      setSocialLinks({
        instagram: userData.instagram || '',
        facebook: userData.facebook || '',
        tiktok: userData.tiktok || '',
        twitter: userData.twitter || '',
      });
    }
  }, [userData, user]);

  // Function to refresh user data from Firestore
  const refreshUserData = async () => {
    if (!user?.uid) return;
    
    try {
      console.log('🔄 Refreshing user data from Firestore...');
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      
      if (userSnap.exists()) {
        const freshUserData = userSnap.data();
        console.log('🔍 Fresh userData from Firestore:', freshUserData);
        console.log('🔍 Fresh userData fields:', Object.keys(freshUserData));
        
        setUserProfile({
          username: freshUserData.username || freshUserData.displayName || user?.displayName || user?.email?.split('@')[0] || '',
          truckName: freshUserData.truckName || '',
          ownerName: freshUserData.ownerName || '',
          phone: freshUserData.phone || '',
          location: freshUserData.location || '',
          cuisine: freshUserData.cuisine || '',
          hours: freshUserData.hours || '',
          description: freshUserData.description || '',
          menuUrl: freshUserData.menuUrl || '',
          coverUrl: freshUserData.coverUrl || '',
        });
        
        setSocialLinks({
          instagram: freshUserData.instagram || '',
          facebook: freshUserData.facebook || '',
          tiktok: freshUserData.tiktok || '',
          twitter: freshUserData.twitter || '',
        });
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Refresh data when component mounts
  useEffect(() => {
    refreshUserData();
  }, [user?.uid]);

  // Function to format phone number for display
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length === 10) {
      // US format: (123) 456-7890
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      // US format with country code: +1 (123) 456-7890
      return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
    } else if (cleaned.length > 10) {
      // International format: +XX XXX XXX XXXX
      return `+${cleaned}`;
    }
    
    return phone; // Return original if no formatting applies
  };

  const editField = (field) => {
    setEditingField(field);
    setModalInput(userProfile[field] || '');
    
    const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
    const promptMessage = field === 'phone' 
      ? 'Enter your phone number (with or without country code):'
      : `Enter new ${field.toLowerCase()}:`;
    
    Alert.prompt(
      `Edit ${fieldName}`,
      promptMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: (value) => handleFieldUpdate(field, value)
        }
      ],
      field === 'phone' ? 'phone-pad' : 'plain-text',
      userProfile[field]
    );
  };

  const handleFieldUpdate = async (field, value) => {
    if (value && value.trim()) {
      // Validate phone number format if field is phone
      if (field === 'phone') {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/; // Basic international phone format
        const cleanPhone = value.replace(/[\s\-\(\)\.]/g, ''); // Remove common separators
        
        if (!phoneRegex.test(cleanPhone)) {
          Alert.alert(
            'Invalid Phone Number', 
            'Please enter a valid phone number (e.g., +1234567890 or 1234567890)'
          );
          return;
        }
        value = cleanPhone; // Store clean version
      }
      
      setLoading(true);
      try {
        await updateDoc(doc(db, 'users', user.uid), { [field]: value });
        setUserProfile(prev => ({ ...prev, [field]: value }));
        Alert.alert('Success', `${field === 'phone' ? 'Phone number' : 'Information'} updated successfully!`);
      } catch (error) {
        console.error('Error updating field:', error);
        Alert.alert('Error', 'Failed to update information. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    setEditingField(null);
  };

  // Load customer's payment methods
  useEffect(() => {
    if (user?.uid && userRole === 'customer') {
      loadPaymentMethods();
    }
  }, [user, userRole]);

  const loadPaymentMethods = async () => {
    if (!user?.uid) return;
    
    setLoadingPayments(true);
    try {
      console.log('🔄 Loading payment methods for customer:', user.uid);
      
      // Use Stripe-hosted payment methods approach
      // No server calls needed - we'll handle everything with Stripe directly
      console.log('💳 Using Stripe-hosted payment methods (no server required)');
      
      // For now, start with empty state - payment methods will be managed through Stripe
      setPaymentMethods([]);
      setPaymentMethodsAvailable(true); // Enable the feature
      console.log('✅ Stripe payment methods ready');
      
    } catch (error) {
      console.error('❌ Error setting up payment methods:', error);
      setPaymentMethods([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const addPaymentMethod = async () => {
    if (!user?.uid) return;
    
    try {
      setLoadingPayments(true);
      console.log('💳 Setting up payment method...');

      // For now, explain that payment methods are handled at checkout
      Alert.alert(
        'Payment Methods',
        'Payment methods are securely managed by Stripe during checkout. When you place an order, you can:\n\n' +
        '• Enter a new card\n' +
        '• Use Apple Pay\n' +
        '• Use Google Pay\n' +
        '• Stripe securely saves your payment details\n\n' +
        'Your payment information is never stored on our servers - everything is handled securely by Stripe.',
        [
          { text: 'Got it!', style: 'default' }
        ]
      );

    } catch (error) {
      console.error('❌ Add payment method error:', error);
      Alert.alert(
        'Error', 
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoadingPayments(false);
    }
  };

  const removePaymentMethod = async (paymentMethodId) => {
    Alert.alert(
      'Remove Payment Method',
      'Payment methods are managed securely by Stripe during checkout. To remove a saved payment method, you can do so during your next order checkout process.',
      [
        { text: 'Got it!', style: 'default' }
      ]
    );
  };

  const handleSaveSocialLinks = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), socialLinks);
      Alert.alert('Success', 'Social media links updated successfully!');
    } catch (error) {
      console.error('Error updating social links:', error);
      Alert.alert('Error', 'Failed to update social media links. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Image upload functionality
  const pickImage = async (imageType) => {
    try {
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Configure image picker options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: imageType === 'coverUrl' ? [16, 9] : [1, 1], // Different aspect ratios
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0], imageType);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (imageAsset, imageType) => {
    setLoading(true);
    try {
      const { uri } = imageAsset;
      
      // Create a blob from the image URI
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = uri.split('.').pop() || 'jpg';
      const fileName = `${imageType}-${timestamp}.${fileExtension}`;
      
      // Create storage reference
      const storageRef = ref(storage, `uploads/${fileName}`);
      
      console.log('🔄 Uploading image to Firebase Storage...');
      
      // Upload the blob
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log('✅ Image uploaded successfully:', downloadURL);
      
      // Update user profile in Firestore
      await updateDoc(doc(db, 'users', user.uid), { [imageType]: downloadURL });
      setUserProfile(prev => ({ ...prev, [imageType]: downloadURL }));
      
      Alert.alert(
        'Success', 
        `${imageType === 'coverUrl' ? 'Cover image' : 'Menu image'} uploaded successfully!`
      );
      
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageFieldEdit = (field) => {
    const fieldLabel = field === 'coverUrl' ? 'Cover Image' : 'Menu Image';
    
    Alert.alert(
      `Update ${fieldLabel}`,
      `Choose how you want to update your ${fieldLabel.toLowerCase()}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Upload New Image', 
          onPress: () => pickImage(field)
        },
        { 
          text: 'Enter URL', 
          onPress: () => editField(field)
        }
      ]
    );
  };

  const handleChangeEmail = () => {
    Alert.prompt(
      'Change Email',
      'Enter your new email address:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Next', 
          onPress: (email) => {
            if (email) {
              setNewEmail(email);
              Alert.prompt(
                'Verify Password',
                'Enter your current password to confirm:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Change Email', 
                    onPress: (password) => processEmailChange(email, password)
                  }
                ],
                'secure-text'
              );
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const processEmailChange = async (email, password) => {
    if (!password) return;
    
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await verifyBeforeUpdateEmail(auth.currentUser, email);
      Alert.alert(
        'Email Change Initiated',
        'Verification email sent! Please check your new email and follow the link to confirm the change.'
      );
    } catch (error) {
      console.error('Error updating email:', error);
      Alert.alert(
        'Email Change Failed',
        'Error updating email. Please make sure your password is correct and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      Alert.alert(
        'Password Reset',
        'Password reset email sent! Please check your inbox.'
      );
    } catch (error) {
      console.error('Error sending reset email:', error);
      Alert.alert(
        'Password Reset Failed',
        'There was an error sending the password reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await auth.currentUser.delete();
              Alert.alert('Account Deleted', 'Account deleted successfully.');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert(
                'Account Deletion Failed',
                'You may need to re-login before deleting your account.'
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const saveNotificationPreferences = () => {
    Alert.alert(
      'Preferences Saved',
      'Notification preferences saved! (This feature will be enhanced in a future update)'
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Error signing out:', error);
            }
          }
        }
      ]
    );
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'owner': return 'Food Truck Owner';
      case 'eventOrganizer': return 'Event Organizer';
      default: return 'Foodie Fan';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image 
          source={require('../../assets/grubana-logo-tshirt.png')} 
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Profile Settings</Text>
        <Text style={styles.subtitle}>Manage your account and preferences</Text>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2c6f57" />
          <Text style={styles.loadingText}>Updating...</Text>
        </View>
      )}

      {/* Profile Section */}
      <View style={styles.section}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(userProfile.username || user?.email || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.displayName}>
          {userProfile.username || user?.displayName || user?.email}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>{getRoleDisplayName(userRole)}</Text>
        {userPlan && (
          <Text style={styles.planBadge}>
            {userPlan === 'all-access' ? 'All-Access Plan' : 
             userPlan === 'pro' ? 'Pro Plan' : 'Basic Plan'}
          </Text>
        )}
      </View>

      {/* Account Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={refreshUserData}
            disabled={loading}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
        
        {(userRole === 'owner' ? [
          { key: 'truckName', label: 'Truck Name' },
          { key: 'ownerName', label: 'Owner Name' },
          { key: 'username', label: 'Username' },
          { key: 'phone', label: 'Phone Number' },
          { key: 'location', label: 'Location' },
          { key: 'cuisine', label: 'Cuisine Type' },
          { key: 'hours', label: 'Hours' },
          { key: 'description', label: 'Description' },
          { key: 'menuUrl', label: 'Menu Image', isImage: true },
          { key: 'coverUrl', label: 'Cover Image', isImage: true },
        ] : [
          { key: 'username', label: 'Username' },
          { key: 'phone', label: 'Phone Number' },
        ]).map(({ key, label, isImage }) => (
          <View key={key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {key === 'phone' && (
              <Text style={styles.fieldHelpText}>
                Format: (123) 456-7890 or +1 (123) 456-7890
              </Text>
            )}
            
            {isImage ? (
              // Image field with preview
              <View style={styles.imageFieldContainer}>
                {userProfile[key] ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image 
                      source={{ uri: userProfile[key] }} 
                      style={key === 'coverUrl' ? styles.coverImagePreview : styles.menuImagePreview}
                      resizeMode="cover"
                    />
                    <View style={styles.imageActions}>
                      <TouchableOpacity 
                        style={styles.imageActionButton}
                        onPress={() => handleImageFieldEdit(key)}
                        disabled={loading}
                      >
                        <Text style={styles.imageActionText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noImageContainer}>
                    <Text style={styles.noImageText}>No {label.toLowerCase()} set</Text>
                    <TouchableOpacity 
                      style={styles.addImageButton}
                      onPress={() => handleImageFieldEdit(key)}
                      disabled={loading}
                    >
                      <Text style={styles.addImageText}>+ Add {label}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              // Regular text field
              <View style={styles.fieldRow}>
                <Text style={styles.fieldValue}>
                  {key === 'phone' 
                    ? (userProfile[key] ? formatPhoneNumber(userProfile[key]) : 'Not set')
                    : (userProfile[key] || 'Not set')
                  }
                </Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => editField(key)}
                  disabled={loading}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Email Change Section */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Email Address</Text>
          <Text style={styles.fieldValue}>{user?.email}</Text>
          <TouchableOpacity 
            style={styles.changeButton}
            onPress={handleChangeEmail}
            disabled={loading}
          >
            <Text style={styles.changeButtonText}>Change Email</Text>
          </TouchableOpacity>
        </View>

        {/* Password Reset Section */}
        <TouchableOpacity 
          style={styles.changeButton}
          onPress={handleChangePassword}
          disabled={loading}
        >
          <Text style={styles.changeButtonText}>Send Password Reset Email</Text>
        </TouchableOpacity>
      </View>

      {/* Payment Methods Section (Customer Only) */}
      {userRole === 'customer' && paymentMethodsAvailable && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payment Methods</Text>
          
          <View style={styles.noPaymentMethodsContainer}>
            <Text style={styles.noPaymentMethodsText}>
              Secure Payment with Stripe
            </Text>
            <Text style={styles.noPaymentMethodsSubtext}>
              Your payment methods are securely managed by Stripe during checkout. When you place an order, you can use:
            </Text>
            
            <View style={styles.paymentMethodsList}>
              <Text style={styles.paymentMethodItem}>💳 Credit/Debit Cards</Text>
              <Text style={styles.paymentMethodItem}>🍎 Apple Pay</Text>
              <Text style={styles.paymentMethodItem}>📱 Google Pay</Text>
              <Text style={styles.paymentMethodItem}>🔒 Securely saved for future orders</Text>
            </View>
            
            <Text style={styles.paymentSecurityNote}>
              Your payment information is never stored on our servers. All transactions are processed securely by Stripe with industry-leading encryption.
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addPaymentButton}
            onPress={addPaymentMethod}
            disabled={loadingPayments}
          >
            <Text style={styles.addPaymentButtonText}>
              Learn More About Payment Security
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Social Media Links (Owner Only) */}
      {userRole === 'owner' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Media Links</Text>
          
          {[
            { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourprofile' },
            { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourprofile' },
            { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourprofile' },
            { key: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/yourprofile' },
          ].map(({ key, label, placeholder }) => (
            <View key={key} style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.textInput}
                value={socialLinks[key]}
                onChangeText={(text) => setSocialLinks(prev => ({ ...prev, [key]: text }))}
                placeholder={placeholder}
                editable={!loading}
              />
            </View>
          ))}
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveSocialLinks}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>Save Social Media Links</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Subscription Management (Owner Only) */}
      {userRole === 'owner' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription Management</Text>
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Current Plan</Text>
            <Text style={styles.fieldValue}>
              {userPlan === 'all-access' ? 'All-Access (Paid)' : 
               userPlan === 'pro' ? 'Pro (Paid)' : 'Basic (Free)'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={() => Alert.alert('Coming Soon', 'Subscription management will be available soon!')}
          >
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Email Notifications</Text>
          <Switch
            value={notifications.email}
            onValueChange={(value) => setNotifications(prev => ({ ...prev, email: value }))}
            trackColor={{ false: '#ddd', true: '#2c6f57' }}
            thumbColor={notifications.email ? '#fff' : '#fff'}
          />
        </View>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>SMS Notifications</Text>
          <Switch
            value={notifications.sms}
            onValueChange={(value) => setNotifications(prev => ({ ...prev, sms: value }))}
            trackColor={{ false: '#ddd', true: '#2c6f57' }}
            thumbColor={notifications.sms ? '#fff' : '#fff'}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveNotificationPreferences}
        >
          <Text style={styles.saveButtonText}>Save Notification Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.contactButton} 
          onPress={() => setShowContactModal(true)}
        >
          <Text style={styles.contactButtonText}>Contact Support</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Form Modal */}
      <ContactFormModal 
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    backgroundColor: '#2c6f57',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    borderTopWidth: 5,
    borderTopColor: '#4682b4',
    alignItems: 'center',
  },
  headerLogo: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
    marginTop: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  section: {
    margin: 15,
    backgroundColor: '#2e3440',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#000',
    borderLeftWidth: 5,
    borderLeftColor: '#4682b4',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  refreshButton: {
    backgroundColor: '#4682b4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2c6f57',
    borderWidth: 3,
    borderColor: '#4682b4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  displayName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
    marginBottom: 5,
  },
  role: {
    fontSize: 14,
    color: '#4682b4',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 10,
  },
  planBadge: {
    fontSize: 14,
    color: '#2c6f57',
    textAlign: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'center',
    fontWeight: 'bold',
  },
  fieldContainer: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#4682b4',
    paddingBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#4682b4',
    fontWeight: '600',
    marginBottom: 5,
  },
  fieldHelpText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#4682b4',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#1a1a2e',
    marginBottom: 5,
  },
  editButton: {
    backgroundColor: '#4682b4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  changeButton: {
    backgroundColor: '#2c6f57',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2c6f57',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#000',
    borderTopWidth: 3,
    borderTopColor: '#4682b4',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manageButton: {
    backgroundColor: '#4682b4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4682b4',
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  // Image field styles
  imageFieldContainer: {
    marginTop: 8,
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  coverImagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  menuImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  imageActions: {
    marginTop: 8,
  },
  imageActionButton: {
    backgroundColor: '#4682b4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  imageActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noImageContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(70, 130, 180, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4682b4',
    borderStyle: 'dashed',
  },
  noImageText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
    opacity: 0.8,
  },
  addImageButton: {
    backgroundColor: '#2c6f57',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  addImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: '#2c6f57',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 15,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerSection: {
    margin: 15,
    backgroundColor: '#3e2723',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#d32f2f',
    borderLeftWidth: 5,
    borderLeftColor: '#d32f2f',
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 15,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Payment Methods Styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noPaymentMethodsContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(70, 130, 180, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4682b4',
    borderStyle: 'dashed',
    marginBottom: 15,
  },
  noPaymentMethodsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noPaymentMethodsSubtext: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentMethodsDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  paymentMethodCard: {
    backgroundColor: 'rgba(70, 130, 180, 0.15)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4682b4',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconContainer: {
    marginRight: 12,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardDetails: {
    flex: 1,
  },
  cardBrand: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardExpiry: {
    color: '#ccc',
    fontSize: 14,
  },
  defaultPaymentBadge: {
    color: '#2c6f57',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  removePaymentButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  removePaymentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addPaymentButton: {
    backgroundColor: '#2c6f57',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#000',
  },
  addPaymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentSecurityNote: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
    marginTop: 10,
  },
  paymentMethodsList: {
    marginVertical: 15,
  },
  paymentMethodItem: {
    fontSize: 14,
    color: '#ddd',
    marginBottom: 8,
    paddingLeft: 10,
  },
});
