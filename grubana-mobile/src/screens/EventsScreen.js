import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  RefreshControl 
} from 'react-native';
import { useAuth } from '../components/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  addDoc, 
  deleteDoc,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const EventsScreen = () => {
  const { user, userData } = useAuth();
  const [events, setEvents] = useState([]);
  const [attendedEvents, setAttendedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('upcoming'); // upcoming, past, attended

  console.log('🎪 EventsScreen: Component rendering');

  // Fetch events from Firebase
  useEffect(() => {
    if (!user) return;

    console.log('🎪 EventsScreen: Setting up events listener');
    
    const now = new Date();
    const todayString = now.toISOString().split('T')[0];

    // Query for events - get all upcoming events
    const eventsQuery = query(
      collection(db, 'events'),
      where('date', '>=', todayString),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('🎪 EventsScreen: Found events:', eventsData.length);
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error('🎪 EventsScreen: Error fetching events:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Fetch user's attended events
  useEffect(() => {
    if (!user) return;

    console.log('🎪 EventsScreen: Setting up attended events listener');
    
    const attendanceQuery = query(
      collection(db, 'eventAttendance'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
      const attendanceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('🎪 EventsScreen: Found attended events:', attendanceData.length);
      setAttendedEvents(attendanceData);
    }, (error) => {
      console.error('🎪 EventsScreen: Error fetching attended events:', error);
    });

    return unsubscribe;
  }, [user]);

  // Mark event as attended
  const markEventAttended = async (event) => {
    try {
      console.log('🎪 EventsScreen: Marking event as attended:', event.id);

      // Check if already marked as attended
      const existingAttendance = attendedEvents.find(a => a.eventId === event.id);
      if (existingAttendance) {
        Alert.alert('Already Marked', 'You have already marked this event as attended.');
        return;
      }

      // Add to eventAttendance collection
      await addDoc(collection(db, 'eventAttendance'), {
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.username || userData?.businessName || 'Unknown User',
        eventId: event.id,
        eventTitle: event.title || event.eventName,
        eventDate: event.date,
        eventLocation: event.location || event.address,
        organizerId: event.organizerId,
        attendedAt: serverTimestamp(),
        attendanceMethod: 'manual', // manual, checkin, automatic
        rating: null, // Can be updated later
        review: null
      });

      Alert.alert('Success', 'Event marked as attended!');
      console.log('🎪 EventsScreen: Event attendance recorded successfully');

    } catch (error) {
      console.error('🎪 EventsScreen: Error marking event as attended:', error);
      Alert.alert('Error', 'Failed to mark event as attended. Please try again.');
    }
  };

  // Remove event attendance
  const removeEventAttendance = async (eventId) => {
    try {
      console.log('🎪 EventsScreen: Removing event attendance:', eventId);

      const attendanceRecord = attendedEvents.find(a => a.eventId === eventId);
      if (!attendanceRecord) {
        Alert.alert('Error', 'Attendance record not found.');
        return;
      }

      await deleteDoc(doc(db, 'eventAttendance', attendanceRecord.id));
      
      Alert.alert('Success', 'Event attendance removed.');
      console.log('🎪 EventsScreen: Event attendance removed successfully');

    } catch (error) {
      console.error('🎪 EventsScreen: Error removing event attendance:', error);
      Alert.alert('Error', 'Failed to remove event attendance. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Check if event is attended
  const isEventAttended = (eventId) => {
    return attendedEvents.some(a => a.eventId === eventId);
  };

  // Filter events based on selected filter
  const getFilteredEvents = () => {
    const now = new Date();
    const todayString = now.toISOString().split('T')[0];

    switch (selectedFilter) {
      case 'upcoming':
        return events.filter(event => event.date >= todayString);
      case 'past':
        return events.filter(event => event.date < todayString);
      case 'attended':
        const attendedEventIds = attendedEvents.map(a => a.eventId);
        return events.filter(event => attendedEventIds.includes(event.id));
      default:
        return events;
    }
  };

  // Refresh events
  const onRefresh = async () => {
    setRefreshing(true);
    // The real-time listeners will automatically update the data
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Render event card
  const renderEventCard = (event) => {
    const attended = isEventAttended(event.id);
    const isPast = new Date(event.date) < new Date();

    return (
      <View key={event.id} style={styles.eventCard}>
        {/* Event Header */}
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{event.title || event.eventName}</Text>
          {attended && (
            <View style={styles.attendedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.attendedText}>Attended</Text>
            </View>
          )}
        </View>

        {/* Event Details */}
        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {formatDate(event.date)}
              {event.time && ` at ${formatTime(event.time)}`}
              {event.endTime && ` - ${formatTime(event.endTime)}`}
            </Text>
          </View>

          {event.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{event.location}</Text>
            </View>
          )}

          {event.description && (
            <View style={styles.detailRow}>
              <Ionicons name="information-circle-outline" size={16} color="#666" />
              <Text style={styles.detailText} numberOfLines={2}>
                {event.description}
              </Text>
            </View>
          )}

          {event.eventType && (
            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {!attended && !isPast && (
            <TouchableOpacity
              style={styles.attendButton}
              onPress={() => markEventAttended(event)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#2c6f57" />
              <Text style={styles.attendButtonText}>Mark as Attended</Text>
            </TouchableOpacity>
          )}

          {attended && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeEventAttendance(event.id)}
            >
              <Ionicons name="remove-circle-outline" size={20} color="#f44336" />
              <Text style={styles.removeButtonText}>Remove Attendance</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Events</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['upcoming', 'past', 'attended'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.activeFilterTab
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedFilter === filter && styles.activeFilterTabText
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Events List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {getFilteredEvents().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {selectedFilter === 'attended' 
                ? 'No attended events yet' 
                : `No ${selectedFilter} events found`}
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'attended'
                ? 'Mark events as attended to track your event history'
                : 'Check back later for new events'}
            </Text>
          </View>
        ) : (
          getFilteredEvents().map(renderEventCard)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c6f57',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#2c6f57',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  attendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  attendedText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  eventDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  attendButtonText: {
    fontSize: 14,
    color: '#2c6f57',
    marginLeft: 6,
    fontWeight: '500',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    color: '#f44336',
    marginLeft: 6,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default EventsScreen;
