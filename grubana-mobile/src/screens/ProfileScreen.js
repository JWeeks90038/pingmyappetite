import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Switch,
  Modal,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Animated
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { signOut, sendPasswordResetEmail, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../components/AuthContext';
import ContactFormModal from '../components/ContactFormModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import TermsOfServiceModal from '../components/TermsOfServiceModal';
import RefundPolicyModal from '../components/RefundPolicyModal';
import { auth, db, storage, functions } from '../firebase';
import { useStripe, CardField, usePaymentSheet } from '@stripe/stripe-react-native';
import { CommonActions } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

export default function ProfileScreen({ navigation }) {
  const { user, userData, userRole } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const theme = useTheme();
  const styles = createThemedStyles(theme);
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
    logoUrl: userData?.logoUrl || '',
    profileUrl: userData?.profileUrl || '',
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
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [modalInput, setModalInput] = useState('');
  
  // Business Hours state
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [businessHours, setBusinessHours] = useState({
    monday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    tuesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    wednesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    thursday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    friday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    saturday: { open: '10:00 AM', close: '6:00 PM', closed: false },
    sunday: { open: '10:00 AM', close: '4:00 PM', closed: false },
  });
  const [selectedDay, setSelectedDay] = useState('monday');
  const [selectedTimeType, setSelectedTimeType] = useState('open');
  const [tempTime, setTempTime] = useState(new Date());
  
  // Payment method states
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [customerStripeId, setCustomerStripeId] = useState(null);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [paymentMethodsAvailable, setPaymentMethodsAvailable] = useState(true); // Feature availability flag

  // Toast notification system for production-safe alerts
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'
  const [showToast, setShowToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Custom modal system for confirmations (replaces Alert.alert)
  const [customModal, setCustomModal] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
  });

  // Input modal system for prompts (replaces Alert.prompt)
  const [inputModal, setInputModal] = useState({
    visible: false,
    title: '',
    message: '',
    placeholder: '',
    value: '',
    onConfirm: null,
    confirmText: 'Save',
    cancelText: 'Cancel',
    keyboardType: 'default',
    secureTextEntry: false,
  });

  // Toast notification function
  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowToast(false);
    });
  };

  // Custom modal function (replaces Alert.alert)
  const showCustomModal = (title, message, onConfirm = null, confirmText = 'OK', cancelText = 'Cancel', showCancel = false) => {
    setCustomModal({
      visible: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
      showCancel,
    });
  };

  const hideCustomModal = () => {
    setCustomModal({
      visible: false,
      title: '',
      message: '',
      onConfirm: null,
      confirmText: 'OK',
      cancelText: 'Cancel',
      showCancel: false,
    });
  };

  // Input modal function (replaces Alert.prompt)
  const showInputModal = (title, message, onConfirm = null, confirmText = 'Save', cancelText = 'Cancel', keyboardType = 'default', secureTextEntry = false, placeholder = '', defaultValue = '') => {
    setInputModal({
      visible: true,
      title,
      message,
      placeholder,
      value: defaultValue,
      onConfirm,
      confirmText,
      cancelText,
      keyboardType,
      secureTextEntry,
    });
  };

  const hideInputModal = () => {
    setInputModal({
      visible: false,
      title: '',
      message: '',
      placeholder: '',
      value: '',
      onConfirm: null,
      confirmText: 'Save',
      cancelText: 'Cancel',
      keyboardType: 'default',
      secureTextEntry: false,
    });
  };

  useEffect(() => {
    if (userData) {

      
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
        logoUrl: userData.logoUrl || '',
        profileUrl: userData.profileUrl || '',
      });
      setSocialLinks({
        instagram: userData.instagram || '',
        facebook: userData.facebook || '',
        tiktok: userData.tiktok || '',
        twitter: userData.twitter || '',
      });
      
      // Load business hours if available and normalize to AM/PM format
      if (userData.businessHours) {
        const normalizedBusinessHours = normalizeBusinessHoursToAMPM(userData.businessHours);
        setBusinessHours(normalizedBusinessHours);
      }
    }
  }, [userData, user]);

  // Function to refresh user data from Firestore
  const refreshUserData = async () => {
    if (!user?.uid) return;
    
    try {

      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      
      if (userSnap.exists()) {
        const freshUserData = userSnap.data();

        
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
          logoUrl: freshUserData.logoUrl || '',
          profileUrl: freshUserData.profileUrl || '',
        });
        
        setSocialLinks({
          instagram: freshUserData.instagram || '',
          facebook: freshUserData.facebook || '',
          tiktok: freshUserData.tiktok || '',
          twitter: freshUserData.twitter || '',
        });
      }
    } catch (error) {

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
    
    showInputModal(
      `Edit ${fieldName}`,
      promptMessage,
      (value) => handleFieldUpdate(field, value),
      'Save',
      'Cancel',
      field === 'phone' ? 'phone-pad' : 'default',
      false,
      '',
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
          showCustomModal(
            'Invalid Phone Number', 
            'Please enter a valid phone number (e.g., +1234567890 or 1234567890)',
            null,
            'OK',
            '',
            false
          );
          return;
        }
        value = cleanPhone; // Store clean version
      }
      
      setLoading(true);
      try {
        // If updating username, also update displayName to keep them in sync
        const updateData = { [field]: value };
        if (field === 'username') {
          updateData.displayName = value;
        }
        
        await updateDoc(doc(db, 'users', user.uid), updateData);
        setUserProfile(prev => ({ 
          ...prev, 
          [field]: value,
          ...(field === 'username' ? { displayName: value } : {})
        }));
        showToastMessage(`${field === 'phone' ? 'Phone number' : 'Information'} updated successfully!`, 'success');
      } catch (error) {
     
        showToastMessage('Failed to update information. Please try again.', 'error');
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

      
      // For now, start with empty state - payment methods will be managed through Stripe
      setPaymentMethods([]);
      setPaymentMethodsAvailable(true); // Enable the feature

      
    } catch (error) {
 
      setPaymentMethods([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const addPaymentMethod = async () => {
    if (!user?.uid) return;
    
    try {
      setLoadingPayments(true);


      // For now, explain that payment methods are handled at checkout
      showCustomModal(
        'Payment Methods',
        'Payment methods are securely managed by Stripe during checkout. When you place an order, you can:\n\n' +
        '• Enter a new card\n' +
        '• Use Apple Pay\n' +
        '• Use Google Pay\n' +
        '• Stripe securely saves your payment details\n\n' +
        'Your payment information is never stored on our servers - everything is handled securely by Stripe.',
        null,
        'Got it!',
        '',
        false
      );

    } catch (error) {

      showToastMessage('Something went wrong. Please try again.', 'error');
    } finally {
      setLoadingPayments(false);
    }
  };

  const removePaymentMethod = async (paymentMethodId) => {
    showCustomModal(
      'Remove Payment Method',
      'Payment methods are managed securely by Stripe during checkout. To remove a saved payment method, you can do so during your next order checkout process.',
      null,
      'Got it!',
      '',
      false
    );
  };

  const handleSaveSocialLinks = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), socialLinks);
      showToastMessage('Social media links updated successfully!', 'success');
    } catch (error) {

      showToastMessage('Failed to update social media links. Please try again.', 'error');
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
        showToastMessage('Permission to access camera roll is required!', 'error');
        return;
      }

      // Configure image picker options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: imageType === 'coverUrl' ? [16, 9] : [1, 1], // Square for logos and menus, 16:9 for covers
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0], imageType);
      }
    } catch (error) {

      showToastMessage('Failed to pick image. Please try again.', 'error');
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
      
      // Create storage reference with specific path for event organizer logos
      const storagePath = imageType === 'logoUrl' ? `uploads/event-organizers/${fileName}` : `uploads/${fileName}`;
      const storageRef = ref(storage, storagePath);
      

      
      // Upload the blob
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      

      
      // Update user profile in Firestore
      await updateDoc(doc(db, 'users', user.uid), { [imageType]: downloadURL });
      setUserProfile(prev => ({ ...prev, [imageType]: downloadURL }));
      
      // Get the appropriate success message
      let successMessage = 'Image uploaded successfully!';
      if (imageType === 'coverUrl') successMessage = 'Cover image uploaded successfully!';
      else if (imageType === 'menuUrl') successMessage = 'Menu image uploaded successfully!';
      else if (imageType === 'logoUrl') successMessage = 'Organization logo uploaded successfully!';
      else if (imageType === 'profileUrl') successMessage = 'Profile picture uploaded successfully!';
      else successMessage = 'Image uploaded successfully!';
      
      showToastMessage(successMessage, 'success');
      
    } catch (error) {

      showToastMessage('Failed to upload image. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageFieldEdit = (field) => {
    let fieldLabel = 'Image';
    if (field === 'coverUrl') fieldLabel = 'Cover Image';
    else if (field === 'menuUrl') fieldLabel = 'Menu Image';
    else if (field === 'logoUrl') fieldLabel = 'Organization Logo';
    
    showCustomModal(
      `Update ${fieldLabel}`,
      `Choose how you want to update your ${fieldLabel.toLowerCase()}:`,
      () => pickImage(field),
      'Upload New Image',
      'Cancel',
      true
    );
  };

  const handleChangeEmail = () => {
    showInputModal(
      'Change Email',
      'Enter your new email address:',
      (email) => {
        if (email) {
          setNewEmail(email);
          showInputModal(
            'Verify Password',
            'Enter your current password to confirm:',
            (password) => processEmailChange(email, password),
            'Change Email',
            'Cancel',
            'default',
            true
          );
        }
      },
      'Next',
      'Cancel',
      'email-address',
      false
    );
  };

  const processEmailChange = async (email, password) => {
    if (!password) return;
    
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await verifyBeforeUpdateEmail(auth.currentUser, email);
      showCustomModal(
        'Email Change Initiated',
        'Verification email sent! Please check your new email and follow the link to confirm the change.',
        null,
        'OK',
        '',
        false
      );
    } catch (error) {
  
      showToastMessage('Error updating email. Please make sure your password is correct and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      // Use custom password reset function with SendGrid
      const sendCustomPasswordReset = httpsCallable(functions, 'sendCustomPasswordReset');
      
      await sendCustomPasswordReset({ 
        email: auth.currentUser.email 
      });
      
      showCustomModal(
        'Password Reset',
        'Password reset email sent from flavor@grubana.com! Please check your inbox and follow the link to reset your password.',
        null,
        'OK',
        '',
        false
      );
    } catch (error) {

      showToastMessage('There was an error sending the password reset email. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    showCustomModal(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.\n\nThis will delete:\n• All events you have created\n• All truck location data\n• All menu items\n• All customer pings\n• All favorites\n• Your user profile',
      () => {
        // Prompt for password re-authentication
        showInputModal(
          'Confirm Password',
          'For security, please enter your password to confirm account deletion:',
          async (password) => {
            if (!password || password.trim() === '') {
              showToastMessage('Password is required to delete your account.', 'error');
              return;
            }
            
            setLoading(true);
            try {
              const currentUser = auth.currentUser;
              
              if (!currentUser || !currentUser.email) {
                showToastMessage('Unable to verify user credentials.', 'error');
                setLoading(false);
                return;
              }
              
              // Re-authenticate the user
              const trimmedPassword = password.trim();
              const credential = EmailAuthProvider.credential(currentUser.email, trimmedPassword);
              await reauthenticateWithCredential(currentUser, credential);
              
              const userId = currentUser.uid;
              const idToken = await currentUser.getIdToken();
              
              // Call Firebase Function to handle complete account deletion
              const response = await fetch('https://us-central1-foodtruckfinder-27eba.cloudfunctions.net/deleteUserAccount', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: userId,
                  idToken: idToken
                }),
              });

              const result = await response.json();
              
              if (!response.ok || result.error) {
                showToastMessage(result.error || 'Failed to delete account. Please try again.', 'error');
                setLoading(false);
                return;
              }
              
              // The Firebase Function deletes the user from Firebase Auth
              // Force sign out to ensure clean state and immediate redirect
              await signOut(auth);
              
              // Set loading to false
              setLoading(false);
              
              // Show success message - the AuthContext will handle navigation to login
              showCustomModal(
                'Account Deleted', 
                'Your account and all associated data have been successfully deleted, including any active subscriptions.',
                () => {
                  // Add a small delay to ensure auth state change is processed
                  setTimeout(() => {
                    // Force a navigation reset as a fallback if AuthContext doesn't handle it
                    if (navigation) {
                      try {
                        navigation.dispatch(
                          CommonActions.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                          })
                        );
                      } catch (navError) {
                
                      }
                    }
                  }, 1000);
                },
                'OK',
                '',
                false
              );
            } catch (error) {
              setLoading(false);
              
              if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showToastMessage('The password you entered is incorrect. Please try again.', 'error');
              } else if (error.code === 'auth/too-many-requests') {
                showToastMessage('Too many failed attempts. Please try again later.', 'error');
              } else if (error.code === 'auth/requires-recent-login') {
                showToastMessage('Your session has expired. Please log out and log back in, then try deleting your account again.', 'error');
              } else if (error.code === 'auth/user-disabled') {
                showToastMessage('This account has been disabled. Please contact support.', 'error');
              } else if (error.code === 'auth/user-not-found') {
                showToastMessage('This account no longer exists.', 'error');
              } else if (error.code === 'auth/network-request-failed') {
                showToastMessage('Please check your internet connection and try again.', 'error');
              } else {
                showToastMessage('There was an error deleting your account. Please try logging out and back in, then try again.\n\nError: ' + (error.message || 'Unknown error'), 'error');
              }
            }
          },
          'Delete Account',
          'Cancel',
          'default',
          true
        );
      },
      'Delete Account',
      'Cancel',
      true
    );
  };

  const saveNotificationPreferences = () => {
    showToastMessage('Notification preferences saved! (This feature will be enhanced in a future update)', 'success');
  };

  const handleLogout = async () => {
    showCustomModal(
      'Logout',
      'Are you sure you want to logout?',
      async () => {
        try {
          await signOut(auth);
        } catch (error) {

        }
      },
      'Logout',
      'Cancel',
      true
    );
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'owner': return 'Mobile Kitchen Business Owner';
      case 'event-organizer': return 'Event Organizer';
      case 'customer': return 'Foodie Fan';
      default: return 'Foodie Fan';
    }
  };

  // Business Hours Helper Functions
  const formatBusinessHours = (hours) => {
    if (!hours) return '';
    
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const openDays = daysOfWeek.filter(day => !hours[day]?.closed);
    if (openDays.length === 0) return 'Closed';
    
    // Group consecutive days with same hours
    const groups = [];
    let currentGroup = null;
    
    openDays.forEach(day => {
      const dayHours = hours[day];
      const timeString = `${dayHours.open}-${dayHours.close}`;
      
      if (!currentGroup || currentGroup.hours !== timeString) {
        currentGroup = { days: [day], hours: timeString };
        groups.push(currentGroup);
      } else {
        currentGroup.days.push(day);
      }
    });
    
    return groups.map(group => {
      const dayNames = group.days.map(day => shortDays[daysOfWeek.indexOf(day)]);
      const dayRange = dayNames.length === 1 ? dayNames[0] : 
                      dayNames.length === 2 ? dayNames.join(', ') :
                      `${dayNames[0]}-${dayNames[dayNames.length - 1]}`;
      return `${dayRange}: ${group.hours}`;
    }).join(', ');
  };

  // Function to normalize business hours to AM/PM format
  const normalizeBusinessHoursToAMPM = (hours) => {
    const normalizedHours = {};
    
    Object.keys(hours).forEach(day => {
      const dayHours = hours[day];
      normalizedHours[day] = {
        ...dayHours,
        open: convertTo12HourFormat(dayHours.open),
        close: convertTo12HourFormat(dayHours.close)
      };
    });
    
    return normalizedHours;
  };

  // Function to convert time string to 12-hour AM/PM format
  const convertTo12HourFormat = (timeStr) => {
    if (!timeStr) return '9:00 AM';
    
    // If already in 12-hour format, return as is
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      return timeStr;
    }
    
    // Convert from 24-hour format to 12-hour format
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) {
 
        return '9:00 AM';
      }
      
      let hour12 = hours;
      let period = 'AM';
      
      if (hours === 0) {
        hour12 = 12;
        period = 'AM';
      } else if (hours === 12) {
        hour12 = 12;
        period = 'PM';
      } else if (hours > 12) {
        hour12 = hours - 12;
        period = 'PM';
      }
      
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const converted = `${hour12}:${formattedMinutes} ${period}`;
      

      return converted;
    } catch (error) {

      return '9:00 AM';
    }
  };

  const openTimePicker = (day, timeType) => {
    setSelectedDay(day);
    setSelectedTimeType(timeType);
    
    const timeStr = businessHours[day][timeType];
    let date = new Date();
    
    // Handle both 12-hour (9:00 AM) and 24-hour (09:00) formats
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      // 12-hour format
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      
      if (period === 'PM' && hours !== 12) {
        hour24 = hours + 12;
      } else if (period === 'AM' && hours === 12) {
        hour24 = 0;
      }
      
      date.setHours(hour24, minutes, 0, 0);
    } else {
      // 24-hour format (legacy support)
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    
    setTempTime(date);
    setShowTimePickerModal(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePickerModal(false);
    }
    
    if (selectedTime) {
      setTempTime(selectedTime);
      if (Platform.OS === 'ios') {
        updateBusinessHours(selectedTime);
      } else {
        updateBusinessHours(selectedTime);
      }
    }
  };

  const updateBusinessHours = (time) => {
    const timeStr = time.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });


    setBusinessHours(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [selectedTimeType]: timeStr
      }
    }));
  };

  const toggleDayClosed = (day) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day].closed
      }
    }));
  };

  const saveBusinessHours = async () => {
    try {
      setLoading(true);
 
      
      await updateDoc(doc(db, 'users', user.uid), {
        businessHours: businessHours,
        lastUpdated: new Date()
      });
      

      showToastMessage('Business hours updated successfully!', 'success');
      setShowBusinessHoursModal(false);
    } catch (error) {
  
      showToastMessage('Failed to save business hours', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image 
          source={require('../../assets/logo.png')} 
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
          <TouchableOpacity style={styles.avatar} onPress={() => pickImage('profileUrl')}>
            {userProfile.profileUrl ? (
              <Image 
                source={{ uri: userProfile.profileUrl }} 
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>
                {(userProfile.username || user?.email || 'U').charAt(0).toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>
          {!userProfile.profileUrl && (
            <TouchableOpacity 
              style={styles.addPhotoButton} 
              onPress={() => pickImage('profileUrl')}
            >
              <Text style={styles.addPhotoText}>📷 Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.displayName}>
          {userProfile.username || user?.displayName || user?.email}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>{getRoleDisplayName(userRole)}</Text>
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
          { key: 'truckName', label: 'Mobile Business Name' },
          { key: 'ownerName', label: 'Owner Name' },
          { key: 'username', label: 'Username' },
          { key: 'phone', label: 'Phone Number' },
          { key: 'location', label: 'Location' },
          { key: 'cuisine', label: 'Cuisine Type' },
          { key: 'hours', label: 'Hours' },
          { key: 'description', label: 'Description' },
          { key: 'menuUrl', label: 'Menu Image', isImage: true },
          { key: 'coverUrl', label: 'Logo Image', isImage: true },
        ] : [
          { key: 'username', label: 'Username' },
          { key: 'phone', label: 'Phone Number' },
        ]).map(({ key, label, isImage }) => (
          <View key={key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{label}</Text>
          
            {key === 'hours' && (
              <Text style={styles.fieldHelpText}>
                Please tap Hide Icon and Show Icon on map to reset Open/Closed when changing hours.
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
              <View style={key === 'hours' ? styles.businessHoursFieldContainer : styles.fieldRow}>
                <Text style={styles.fieldValue}>
                  {key === 'phone' 
                    ? (userProfile[key] ? formatPhoneNumber(userProfile[key]) : 'Not set')
                    : key === 'hours'
                    ? (formatBusinessHours(businessHours) || 'Not set')
                    : (userProfile[key] || 'Not set')
                  }
                </Text>
                <TouchableOpacity 
                  style={key === 'hours' ? styles.manageHoursButton : styles.editButton}
                  onPress={() => {
                    if (key === 'hours') {
                      setShowBusinessHoursModal(true);
                    } else {
                      editField(key);
                    }
                  }}
                  disabled={loading}
                >
                  <Text style={key === 'hours' ? styles.manageHoursButtonText : styles.editButtonText}>
                    {key === 'hours' ? '⏰ Manage Hours' : 'Edit'}
                  </Text>
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

      {/* Subscription Information (Owner Only) */}
      {/* Plan section removed - focusing on food orders only */}

      {/* Event Organizer Logo Section (Event Organizer Only) */}
      {userRole === 'event-organizer' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Organization Logo</Text>
          <Text style={styles.sectionSubtitle}>
            Upload your organization's logo to display in event markers on the map
          </Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Organization Logo</Text>
            
            <View style={styles.imageFieldContainer}>
              {userProfile.logoUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: userProfile.logoUrl }} 
                    style={styles.logoImagePreview}
                    resizeMode="cover"
                  />
                  <Text style={styles.logoPreviewLabel}>
                    This logo will appear in your event markers on the map
                  </Text>
                  <View style={styles.imageActions}>
                    <TouchableOpacity 
                      style={styles.imageActionButton}
                      onPress={() => handleImageFieldEdit('logoUrl')}
                      disabled={loading}
                    >
                      <Text style={styles.imageActionText}>Change Logo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.noImageContainer}>
                  <Text style={styles.noImageText}>No organization logo set</Text>
                  <Text style={styles.noImageSubtext}>
                    Upload a logo to help attendees identify your events on the map
                  </Text>
                  <TouchableOpacity 
                    style={styles.addImageButton}
                    onPress={() => handleImageFieldEdit('logoUrl')}
                    disabled={loading}
                  >
                    <Text style={styles.addImageText}>+ Upload Logo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
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
          style={styles.privacyButton} 
          onPress={() => setShowPrivacyModal(true)}
        >
          <Text style={styles.privacyButtonText}>Privacy Policy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.termsButton} 
          onPress={() => setShowTermsModal(true)}
        >
          <Text style={styles.termsButtonText}>Terms of Service</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.refundButton} 
          onPress={() => setShowRefundModal(true)}
        >
          <Text style={styles.refundButtonText}>Refund Policy</Text>
        </TouchableOpacity>
        
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

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {/* Terms of Service Modal */}
      <TermsOfServiceModal 
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Refund Policy Modal */}
      <RefundPolicyModal 
        visible={showRefundModal}
        onClose={() => setShowRefundModal(false)}
      />

      {/* Business Hours Modal */}
      {userRole === 'owner' && (
        <Modal
          visible={showBusinessHoursModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowBusinessHoursModal(false)}
        >
          <View style={styles.businessHoursModalContainer}>
            <View style={styles.businessHoursModalHeader}>
              <TouchableOpacity onPress={() => setShowBusinessHoursModal(false)}>
                <Text style={styles.businessHoursModalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.businessHoursModalTitle}>Business Hours</Text>
              <TouchableOpacity onPress={saveBusinessHours}>
                <Text style={styles.businessHoursModalSave}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.businessHoursModalContent}>
              {/* Define ordered days to ensure Monday-Sunday sequence */}
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                const hours = businessHours[day];
                return (
                <View key={day} style={styles.dayRow}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayName}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </Text>
                    <Switch
                      value={!hours.closed}
                      onValueChange={() => toggleDayClosed(day)}
                      trackColor={{ false: '#ccc', true: '#2c6f57' }}
                      thumbColor={!hours.closed ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                  
                  {!hours.closed && (
                    <View style={styles.timeRow}>
                      <TouchableOpacity 
                        style={styles.timeButton}
                        onPress={() => openTimePicker(day, 'open')}
                      >
                        <Text style={styles.timeLabel}>Open</Text>
                        <Text style={styles.timeValue}>{hours.open}</Text>
                      </TouchableOpacity>
                      
                      <Text style={styles.timeSeparator}>to</Text>
                      
                      <TouchableOpacity 
                        style={styles.timeButton}
                        onPress={() => openTimePicker(day, 'close')}
                      >
                        <Text style={styles.timeLabel}>Close</Text>
                        <Text style={styles.timeValue}>{hours.close}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Time Picker Modal */}
          {showTimePickerModal && (
            <Modal
              visible={showTimePickerModal}
              transparent={true}
              animationType="slide"
            >
              <View style={styles.timePickerOverlay}>
                <View style={styles.timePickerContainer}>
                  <View style={styles.timePickerHeader}>
                    <TouchableOpacity onPress={() => setShowTimePickerModal(false)}>
                      <Text style={styles.businessHoursModalCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.timePickerTitle}>
                      {selectedTimeType === 'open' ? 'Opening' : 'Closing'} Time
                    </Text>
                    <TouchableOpacity onPress={() => setShowTimePickerModal(false)}>
                      <Text style={styles.businessHoursModalSave}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                    style={styles.timePicker}
                    textColor={theme.colors.text.primary}
                    accentColor={theme.colors.accent.pink}
                    locale="en_US"
                    themeVariant="dark"
                  />
                </View>
              </View>
            </Modal>
          )}
        </Modal>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Animated.View 
          style={[
            styles.toastContainer, 
            { opacity: toastOpacity },
            toastType === 'error' ? styles.toastError : styles.toastSuccess
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Custom Modal (replaces Alert.alert) */}
      <Modal
        visible={customModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideCustomModal}
      >
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalContainer}>
            <Text style={styles.customModalTitle}>{customModal.title}</Text>
            <Text style={styles.customModalMessage}>{customModal.message}</Text>
            
            <View style={styles.customModalButtons}>
              {customModal.showCancel && (
                <TouchableOpacity 
                  style={[styles.customModalButton, styles.customModalCancelButton]}
                  onPress={hideCustomModal}
                >
                  <Text style={styles.customModalCancelText}>{customModal.cancelText}</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.customModalButton, styles.customModalConfirmButton]}
                onPress={() => {
                  if (customModal.onConfirm) {
                    customModal.onConfirm();
                  }
                  hideCustomModal();
                }}
              >
                <Text style={styles.customModalConfirmText}>{customModal.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Input Modal (replaces Alert.prompt) */}
      <Modal
        visible={inputModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideInputModal}
      >
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalContainer}>
            <Text style={styles.customModalTitle}>{inputModal.title}</Text>
            <Text style={styles.customModalMessage}>{inputModal.message}</Text>
            
            <TextInput
              style={styles.inputModalTextInput}
              value={inputModal.value}
              onChangeText={(text) => setInputModal(prev => ({ ...prev, value: text }))}
              placeholder={inputModal.placeholder}
              keyboardType={inputModal.keyboardType}
              secureTextEntry={inputModal.secureTextEntry}
              autoFocus={true}
            />
            
            <View style={styles.customModalButtons}>
              <TouchableOpacity 
                style={[styles.customModalButton, styles.customModalCancelButton]}
                onPress={hideInputModal}
              >
                <Text style={styles.customModalCancelText}>{inputModal.cancelText}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.customModalButton, styles.customModalConfirmButton]}
                onPress={() => {
                  if (inputModal.onConfirm) {
                    inputModal.onConfirm(inputModal.value);
                  }
                  hideInputModal();
                }}
              >
                <Text style={styles.customModalConfirmText}>{inputModal.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const createThemedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    backgroundColor: theme.colors.background.secondary,
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
    borderTopWidth: 5,
    borderTopColor: theme.colors.accent.blue,
    alignItems: 'center',
    ...theme.shadows.neonBlue,
  },
  headerLogo: {
    width: 240,
    height: 168,
    marginTop: -60,
    marginBottom: -40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 11, 26, 0.8)',
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
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderLeftWidth: 5,
    borderLeftColor: theme.colors.accent.blue,
    ...theme.shadows.neonBlue,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  sectionNote: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  refreshButton: {
    backgroundColor: theme.colors.accent.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.neonBlue,
  },
  refreshButtonText: {
    color: theme.colors.text.primary,
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
    backgroundColor: theme.colors.accent.pink,
    borderWidth: 3,
    borderColor: theme.colors.accent.blue,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.neonPink,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  addPhotoButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
  },
  addPhotoText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  displayName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 5,
  },
  role: {
    fontSize: 14,
    color: theme.colors.accent.blue,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 10,
  },
  fieldContainer: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.accent.blue,
    paddingBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    color: theme.colors.accent.blue,
    fontWeight: '600',
    marginBottom: 5,
  },
  fieldHelpText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  fieldValue: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  centeredText: {
    textAlign: 'center',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  businessHoursFieldContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  manageHoursButton: {
    backgroundColor: theme.colors.accent.pink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginTop: 10,
    alignItems: 'center',
    ...theme.shadows.neonPink,
  },
  manageHoursButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.primary,
    marginBottom: 5,
  },
  editButton: {
    backgroundColor: theme.colors.accent.blue,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.neonBlue,
  },
  editButtonText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  changeButton: {
    backgroundColor: theme.colors.accent.pink,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.neonPink,
  },
  changeButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: theme.colors.accent.pink,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderTopWidth: 3,
    borderTopColor: theme.colors.accent.blue,
    ...theme.shadows.neonPink,
  },
  saveButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.accent.blue,
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: theme.colors.text.primary,
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
    borderColor: theme.colors.border,
  },
  menuImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  imageActions: {
    marginTop: 8,
  },
  imageActionButton: {
    backgroundColor: theme.colors.accent.blue,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.neonBlue,
  },
  imageActionText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  noImageContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(77, 191, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
    borderStyle: 'dashed',
  },
  noImageText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    marginBottom: 10,
    opacity: 0.8,
  },
  addImageButton: {
    backgroundColor: theme.colors.accent.pink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.neonPink,
  },
  addImageText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  privacyButton: {
    backgroundColor: theme.colors.accent.blue,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginBottom: 15,
    ...theme.shadows.neonBlue,
  },
  privacyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsButton: {
    backgroundColor: theme.colors.accent.blue,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginBottom: 15,
    ...theme.shadows.neonBlue,
  },
  termsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refundButton: {
    backgroundColor: theme.colors.accent.blue,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginBottom: 15,
    ...theme.shadows.neonBlue,
  },
  refundButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactButton: {
    backgroundColor: theme.colors.accent.pink,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginBottom: 15,
    ...theme.shadows.neonPink,
  },
  contactButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.danger,
  },
  logoutButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerSection: {
    margin: 15,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#d32f2f',
    borderLeftWidth: 5,
    borderLeftColor: '#d32f2f',
    ...theme.shadows.danger,
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
    borderColor: theme.colors.border,
    ...theme.shadows.danger,
  },
  deleteButtonText: {
    color: theme.colors.text.primary,
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
    backgroundColor: 'rgba(77, 191, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
    borderStyle: 'dashed',
    marginBottom: 15,
  },
  noPaymentMethodsText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noPaymentMethodsSubtext: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentMethodsDescription: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  paymentMethodCard: {
    backgroundColor: 'rgba(77, 191, 255, 0.15)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
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
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardExpiry: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  defaultPaymentBadge: {
    color: theme.colors.accent.pink,
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
    borderColor: theme.colors.border,
  },
  removePaymentText: {
    color: theme.colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  addPaymentButton: {
    backgroundColor: theme.colors.accent.pink,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.neonPink,
  },
  addPaymentButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentSecurityNote: {
    color: theme.colors.text.secondary,
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
    color: theme.colors.text.secondary,
    marginBottom: 8,
    paddingLeft: 10,
  },
  // Business Hours Modal styles
  businessHoursModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  businessHoursModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background.secondary,
  },
  businessHoursModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  businessHoursModalContent: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.colors.background.primary,
  },
  businessHoursModalCancel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  businessHoursModalSave: {
    fontSize: 16,
    color: theme.colors.accent.pink,
    fontWeight: '600',
  },
  dayRow: {
    marginBottom: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
  },
  timeButton: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    padding: 15,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  timeSeparator: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginHorizontal: 15,
  },
  timePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  timePickerContainer: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderTopWidth: 2,
    borderTopColor: theme.colors.accent.pink,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  timePicker: {
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
    width: '100%',
    height: Platform.OS === 'ios' ? 200 : 50,
    paddingHorizontal: 20,
  },
  // Logo Section Styles
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  logoImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  logoPreviewLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noImageSubtext: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },

  // Toast notification styles
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  toastSuccess: {
    backgroundColor: '#4CAF50',
  },
  toastError: {
    backgroundColor: '#f44336',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Custom modal styles (replaces Alert.alert and Alert.prompt)
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  customModalContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    maxWidth: '90%',
  },
  customModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  customModalMessage: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  customModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  customModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  customModalCancelButton: {
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  customModalConfirmButton: {
    backgroundColor: theme.colors.primary,
  },
  customModalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  customModalConfirmText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // Input modal specific styles
  inputModalTextInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
    marginBottom: 20,
  },

});
