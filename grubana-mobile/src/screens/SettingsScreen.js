import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { useAuth } from '../components/AuthContext';
import { auth } from '../services/firebase';

const SettingsScreen = () => {
  const { user, userRole } = useAuth();

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

  const handleSignOut = async () => {
    showModal(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
        
              showToast('Failed to sign out');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account and preferences</Text>
      </View>

      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{user?.displayName || 'Not set'}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Account Type:</Text>
          <Text style={styles.infoValue}>
            {userRole === 'owner' ? 'Food Truck Owner' : 'Customer'}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>✏️ Edit Profile</Text>
        </TouchableOpacity>
        
        {userRole === 'owner' && (
          <>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>🚛 Truck Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📋 Menu Management</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>💳 Subscription</Text>
            </TouchableOpacity>
          </>
        )}
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>🔔 Notifications</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>🔒 Privacy & Security</Text>
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>❓ Help & FAQ</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📧 Contact Support</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📄 Terms of Service</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>🔒 Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Text style={[styles.actionButtonText, styles.signOutText]}>
            🚪 Sign Out
          </Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Grubana Mobile v1.0.0</Text>
        <Text style={styles.footerText}>Made with ❤️ for food truck lovers</Text>
      </View>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2c6f57',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f5e8',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2c6f57',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  signOutButton: {
    borderLeftColor: '#e74c3c',
    backgroundColor: '#fdf2f2',
  },
  signOutText: {
    color: '#e74c3c',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  // Toast styles
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  toastError: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  toastText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a2e',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6f57',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonFirst: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
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
    color: '#2c6f57',
  },
  modalButtonTextDestructive: {
    color: '#e74c3c',
  },
});

export default SettingsScreen;
