import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

/**
 * Calendar Coming Soon Modal Component
 * Shows a "coming soon" message for users who don't have access to the calendar feature yet
 */
const CalendarComingSoonModal = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = createThemedStyles(theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Google Calendar Integration</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Coming Soon Icon */}
          <View style={styles.iconContainer}>
            <Ionicons 
              name="calendar-outline" 
              size={80} 
              color={theme.colors.accent.blue} 
            />
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonBadgeText}>Soon</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.comingSoonTitle}>
            Coming Soon!
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            Google Calendar integration is coming soon! We'll notify you when it's available for all users.
          </Text>
          
          {/* Features List */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>What to expect:</Text>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent.green} />
              <Text style={styles.featureText}>Connect your Google Calendar</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent.green} />
              <Text style={styles.featureText}>Show your schedule to customers</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent.green} />
              <Text style={styles.featureText}>Automatic availability updates</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent.green} />
              <Text style={styles.featureText}>Event-based location sharing</Text>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeActionButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeActionButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

/**
 * Create themed styles for the component
 */
const createThemedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: theme.colors.accent.pink,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...theme.shadows.neonPink,
  },
  comingSoonBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  featuresContainer: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  featureText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginLeft: 12,
    flex: 1,
  },
  closeActionButton: {
    backgroundColor: theme.colors.accent.blue,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    alignSelf: 'stretch',
    alignItems: 'center',
    ...theme.shadows.neonBlue,
  },
  closeActionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CalendarComingSoonModal;