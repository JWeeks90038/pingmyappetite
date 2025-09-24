import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

/**
 * Calendar Events Display Component
 * Shows calendar events in a compact format for map markers
 */
const CalendarEventsDisplay = ({ events, maxEvents = 3, compact = false, onViewAll }) => {
  const theme = useTheme();
  const styles = createThemedStyles(theme);

  // Filter to show only upcoming events (next 24 hours for compact view)
  const getDisplayEvents = () => {
    if (!events || events.length === 0) return [];
    
    const now = new Date();
    const next24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    
    let filteredEvents = events.filter(event => {
      if (!event.startTime) return false;
      return event.startTime >= now && event.startTime <= next24Hours;
    });
    
    // If no events in next 24 hours, show next few upcoming events
    if (filteredEvents.length === 0) {
      filteredEvents = events.filter(event => {
        if (!event.startTime) return false;
        return event.startTime >= now;
      }).slice(0, maxEvents);
    }
    
    return filteredEvents.slice(0, maxEvents);
  };

  /**
   * Format time for display
   */
  const formatEventTime = (startTime, endTime, isAllDay) => {
    if (isAllDay) {
      return 'All Day';
    }
    
    if (!startTime) return '';
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
    
    const isToday = eventDate.getTime() === today.getTime();
    const isTomorrow = eventDate.getTime() === today.getTime() + (24 * 60 * 60 * 1000);
    
    const timeString = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    
    if (isToday) {
      return `Today ${timeString}`;
    } else if (isTomorrow) {
      return `Tomorrow ${timeString}`;
    } else {
      const dateString = startTime.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return `${dateString} ${timeString}`;
    }
  };

  /**
   * Get time status for styling
   */
  const getTimeStatus = (startTime, endTime) => {
    if (!startTime) return 'upcoming';
    
    const now = new Date();
    const eventStart = new Date(startTime);
    const eventEnd = endTime ? new Date(endTime) : null;
    
    if (eventEnd && now >= eventStart && now <= eventEnd) {
      return 'active'; // Event is happening now
    } else if (now < eventStart) {
      const diffHours = (eventStart - now) / (1000 * 60 * 60);
      if (diffHours <= 2) {
        return 'soon'; // Event starts within 2 hours
      }
      return 'upcoming';
    }
    
    return 'past';
  };

  const displayEvents = getDisplayEvents();

  if (displayEvents.length === 0) {
    return compact ? null : (
      <View style={styles.noEventsContainer}>
        <Ionicons name="calendar-outline" size={24} color={theme.colors.text.secondary} />
        <Text style={styles.noEventsText}>No upcoming events</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {!compact && (
        <View style={styles.header}>
          <Ionicons name="calendar" size={16} color={theme.colors.primary} />
          <Text style={styles.headerText}>Schedule</Text>
        </View>
      )}
      
      <View style={styles.eventsList}>
        {displayEvents.map((event, index) => {
          const timeStatus = getTimeStatus(event.startTime, event.endTime);
          
          return (
            <View key={event.id || index} style={[
              styles.eventItem,
              compact && styles.compactEventItem,
              timeStatus === 'active' && styles.activeEvent,
              timeStatus === 'soon' && styles.soonEvent,
            ]}>
              <View style={styles.eventHeader}>
                <Text style={[
                  styles.eventTitle,
                  compact && styles.compactEventTitle,
                ]} numberOfLines={compact ? 1 : 2}>
                  {event.title}
                </Text>
                
                <View style={[
                  styles.timeStatus,
                  timeStatus === 'active' && styles.activeStatus,
                  timeStatus === 'soon' && styles.soonStatus,
                ]}>
                  {timeStatus === 'active' && (
                    <View style={styles.liveIndicator} />
                  )}
                  <Text style={[
                    styles.eventTime,
                    compact && styles.compactEventTime,
                    timeStatus === 'active' && styles.activeTimeText,
                  ]}>
                    {timeStatus === 'active' ? 'LIVE' : formatEventTime(event.startTime, event.endTime, event.isAllDay)}
                  </Text>
                </View>
              </View>
              
              {!compact && event.location && (
                <View style={styles.eventLocation}>
                  <Ionicons name="location-outline" size={12} color={theme.colors.text.secondary} />
                  <Text style={styles.eventLocationText} numberOfLines={1}>
                    {event.location}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      
      {events.length > maxEvents && onViewAll && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>
            View all {events.length} events
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Create themed styles
 */
const createThemedStyles = (theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  compactContainer: {
    padding: 8,
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: 6,
  },
  eventsList: {
    gap: 8,
  },
  eventItem: {
    backgroundColor: theme.colors.background.primary,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.border,
  },
  compactEventItem: {
    padding: 6,
    borderLeftWidth: 2,
  },
  activeEvent: {
    borderLeftColor: theme.colors.success || '#4CAF50',
    backgroundColor: `${theme.colors.success || '#4CAF50'}10`,
  },
  soonEvent: {
    borderLeftColor: theme.colors.warning || '#FF9800',
    backgroundColor: `${theme.colors.warning || '#FF9800'}10`,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  compactEventTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeStatus: {
    backgroundColor: theme.colors.success || '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  soonStatus: {
    backgroundColor: theme.colors.warning || '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  eventTime: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  compactEventTime: {
    fontSize: 10,
  },
  activeTimeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventLocationText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 4,
    flex: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 6,
  },
  viewAllText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noEventsText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 8,
  },
});

export default CalendarEventsDisplay;