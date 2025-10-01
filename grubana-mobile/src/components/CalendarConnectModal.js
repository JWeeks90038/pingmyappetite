import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import GoogleCalendarService from '../services/GoogleCalendarService';

/**
 * Calendar Connect Modal Component
 * Handles Google Calendar authentication and displays connection status
 */
const CalendarConnectModal = ({ visible, onClose, kitchenId, onCalendarConnected }) => {
  const theme = useTheme();
  const styles = createThemedStyles(theme);
  
  // Component state
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [events, setEvents] = useState([]);
  const [lastSync, setLastSync] = useState(null);

  /**
   * Check authentication status when modal opens
   */
  useEffect(() => {
    if (visible) {
      checkAuthStatus();
    }
  }, [visible]);

  /**
   * Check if user is already authenticated
   */
  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const authenticated = await GoogleCalendarService.isAuthenticated();
      setIsConnected(authenticated);
      
      if (authenticated) {
        const email = await GoogleCalendarService.getUserEmail();
        setUserEmail(email);
        await loadCalendarEvents();
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Google Calendar connection
   */
  const handleConnectCalendar = async () => {
    try {
      setLoading(true);
      
      const result = await GoogleCalendarService.authenticate();
      
      if (result.success) {
        setIsConnected(true);
        setUserEmail(result.email);
        
        // Load initial events
        await loadCalendarEvents();
        
        // Notify parent component
        if (onCalendarConnected) {
          onCalendarConnected(kitchenId, true);
        }
        
     
      } else {
  
      }
    } catch (error) {

   
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load calendar events from Google
   */
  const loadCalendarEvents = async () => {
    try {
      const calendarEvents = await GoogleCalendarService.getUpcomingEvents(20);
      setEvents(calendarEvents);
      setLastSync(new Date());
    } catch (error) {

   
    }
  };

  /**
   * Handle calendar disconnection
   */
  const handleDisconnectCalendar = async () => {
    (
      'Disconnect Calendar',
      'Are you sure you want to disconnect your Google Calendar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await GoogleCalendarService.disconnect();
              
              if (result.success) {
                setIsConnected(false);
                setUserEmail(null);
                setEvents([]);
                setLastSync(null);
                
                // Notify parent component
                if (onCalendarConnected) {
                  onCalendarConnected(kitchenId, false);
                }
                
   
              }
            } catch (error) {

        
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Refresh calendar events
   */
  const handleRefreshEvents = async () => {
    if (!isConnected) return;
    
    try {
      setLoading(true);
      await loadCalendarEvents();
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  /**
   * Format date for display
   */
  const formatEventTime = (startTime, endTime, isAllDay) => {
    if (isAllDay) {
      return 'All Day';
    }
    
    if (!startTime) return 'No time specified';
    
    const formatTime = (date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    };
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    };
    
    const startDateStr = formatDate(startTime);
    const startTimeStr = formatTime(startTime);
    
    if (endTime && endTime.getTime() !== startTime.getTime()) {
      const endTimeStr = formatTime(endTime);
      return `${startDateStr} ${startTimeStr} - ${endTimeStr}`;
    }
    
    return `${startDateStr} ${startTimeStr}`;
  };

  /**
   * Render event item
   */
  const renderEventItem = (event, index) => (
    <View key={event.id || index} style={styles.eventItem}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.eventTime}>
          {formatEventTime(event.startTime, event.endTime, event.isAllDay)}
        </Text>
      </View>
      
      {event.location ? (
        <View style={styles.eventLocation}>
          <Ionicons name="location-outline" size={14} color={theme.colors.text.secondary} />
          <Text style={styles.eventLocationText} numberOfLines={1}>
            {event.location}
          </Text>
        </View>
      ) : null}
      
      {event.description ? (
        <Text style={styles.eventDescription} numberOfLines={2}>
          {event.description}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Google Calendar</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Connection Status Section */}
          <View style={styles.section}>
            <View style={styles.connectionStatus}>
              <View style={styles.statusIndicator}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? theme.colors.success : theme.colors.text.secondary }
                ]} />
                <Text style={styles.statusText}>
                  {isConnected ? 'Connected' : 'Not Connected'}
                </Text>
              </View>
              
              {userEmail && (
                <Text style={styles.userEmail}>{userEmail}</Text>
              )}
            </View>

            {/* Connect/Disconnect Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isConnected && styles.disconnectButton,
                loading && styles.disabledButton
              ]}
              onPress={isConnected ? handleDisconnectCalendar : handleConnectCalendar}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={isConnected ? "unlink-outline" : "calendar-outline"}
                    size={20}
                    color="#FFFFFF"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>
                    {isConnected ? 'Disconnect Calendar' : 'Connect Google Calendar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Calendar Events Section */}
          {isConnected && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                <TouchableOpacity
                  onPress={handleRefreshEvents}
                  disabled={loading}
                  style={styles.refreshButton}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {lastSync && (
                <Text style={styles.lastSyncText}>
                  Last synced: {lastSync.toLocaleString()}
                </Text>
              )}

              {events.length > 0 ? (
                <View style={styles.eventsList}>
                  {events.slice(0, 10).map(renderEventItem)}
                </View>
              ) : (
                <View style={styles.noEventsContainer}>
                  <Ionicons name="calendar-outline" size={48} color={theme.colors.text.secondary} />
                  <Text style={styles.noEventsText}>No upcoming events found</Text>
                  <Text style={styles.noEventsSubtext}>
                    Events from your Google Calendar will appear here
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Info Section */}
          <View style={styles.section}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              • Connect your Google Calendar to display your schedule on the map{'\n'}
              • Your events will be visible to customers looking for food trucks{'\n'}
              • Calendar data syncs automatically every 15 minutes{'\n'}
              • Only event titles, times, and locations are shared{'\n'}
              • You can disconnect anytime
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

/**
 * Create themed styles
 */
const createThemedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background.secondary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  connectionStatus: {
    marginBottom: 20,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginLeft: 22,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  disconnectButton: {
    backgroundColor: theme.colors.error || '#FF6B6B',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  refreshButton: {
    padding: 8,
  },
  lastSyncText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 15,
  },
  eventsList: {
    gap: 12,
  },
  eventItem: {
    backgroundColor: theme.colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 10,
  },
  eventTime: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventLocationText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginLeft: 6,
    flex: 1,
  },
  eventDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  noEventsSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
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
    lineHeight: 20,
  },
});

export default CalendarConnectModal;