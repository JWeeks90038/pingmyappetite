import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { useTheme } from '../theme/ThemeContext';

const ContactFormModal = ({ visible, onClose }) => {
  const { user, userData } = useAuth();
  const theme = useTheme();
  const styles = createThemedStyles(theme);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [toastOpacity] = useState(new Animated.Value(0));
  const [formData, setFormData] = useState({
    name: userData?.username || userData?.ownerName || userData?.contactName || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
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
      setToast({ visible: false, message: '', type: 'success' });
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://formspree.io/f/xovnlpyz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          userType: userData?.role || 'user',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        showToast('Your message has been sent successfully! We\'ll get back to you soon.', 'success');
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({
            name: userData?.username || userData?.ownerName || userData?.contactName || '',
            email: user?.email || '',
            subject: '',
            message: '',
          });
          onClose();
        }, 2000);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      showToast('Failed to send message. Please try again.', 'error');
    }
    setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Contact Us</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Have a question or need assistance? We're here to help!
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              placeholder="What's this about?"
              value={formData.subject}
              onChangeText={(value) => handleInputChange('subject', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us more about your question or issue..."
              value={formData.message}
              onChangeText={(value) => handleInputChange('message', value)}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Send Message</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Other ways to reach us:</Text>
            <Text style={styles.infoText}>📧 flavor@grubana.com</Text>
            <Text style={styles.infoText}>💬 We typically respond within 24 hours</Text>
          </View>
        </ScrollView>

        {/* Toast Notification */}
        {toast.visible && (
          <Animated.View 
            style={[
              styles.toast, 
              toast.type === 'error' ? styles.toastError : styles.toastSuccess,
              { opacity: toastOpacity }
            ]}
          >
            <Ionicons 
              name={toast.type === 'error' ? 'alert-circle' : 'checkmark-circle'} 
              size={20} 
              color="#fff" 
              style={styles.toastIcon} 
            />
            <Text style={styles.toastText}>{toast.message}</Text>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createThemedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.neonBlue,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 78, 201, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent.blue,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: theme.colors.accent.pink,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.neonPink,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.text.secondary,
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: 'rgba(77, 191, 255, 0.1)',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.accent.blue,
    ...theme.shadows.neonBlue,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 5,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: '#4CAF50',
  },
  toastError: {
    backgroundColor: '#F44336',
  },
  toastIcon: {
    marginRight: 12,
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
});

export default ContactFormModal;
