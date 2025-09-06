import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  Image,
  ActivityIndicator
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
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

const EventsScreen = () => {
  const { user, userData, userRole, userPlan } = useAuth();
  const theme = useTheme();
  const styles = createThemedStyles(theme);
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [attendedEvents, setAttendedEvents] = useState([]);
  const [attendingEvents, setAttendingEvents] = useState([]);
  const [eventAttendanceCounts, setEventAttendanceCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('upcoming'); // upcoming, past, attended, my-events, attending
  
  // Event management modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventType: 'food-festival',
    date: new Date(),
    time: '',
    endTime: '',
    location: '',
    address: '',
    latitude: null,
    longitude: null,
    maxAttendees: null,
    registrationRequired: false,
    organizerLogoUrl: '',
    status: 'upcoming',
    // Recurring event fields
    isRecurring: false,
    recurrenceType: 'weekly', // daily, weekly, monthly, yearly
    recurrenceInterval: 1, // every X days/weeks/months/years
    recurrenceEndDate: null,
    recurrenceCount: null, // number of occurrences
    weeklyRecurrenceDays: [], // for weekly: ['monday', 'wednesday', 'friday']
    monthlyRecurrenceType: 'date', // 'date' or 'day' (e.g., 2nd Tuesday)
  });
  
  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showRecurrenceEndDatePicker, setShowRecurrenceEndDatePicker] = useState(false);

  // Logo upload states
  const [uploadingLogo, setUploadingLogo] = useState(false);

  console.log('🎪 EventsScreen: Component rendering with userRole:', userRole);

  // Simple time picker state
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  const [endSelectedHour, setEndSelectedHour] = useState(10);
  const [endSelectedMinute, setEndSelectedMinute] = useState(0);
  const [endSelectedPeriod, setEndSelectedPeriod] = useState('AM');

  // Simple date picker state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [recurrenceSelectedMonth, setRecurrenceSelectedMonth] = useState(new Date().getMonth());
  const [recurrenceSelectedDay, setRecurrenceSelectedDay] = useState(new Date().getDate());
  const [recurrenceSelectedYear, setRecurrenceSelectedYear] = useState(new Date().getFullYear());

  // Helper function to get month names
  const getMonthNames = () => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper function to get days in a month
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper function to get available years (current year + next 2 years)
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear + 1, currentYear + 2];
  };

  // Helper function to format date from picker values
  const formatDateFromPicker = (month, day, year) => {
    return new Date(year, month, day);
  };

  // Helper function to initialize date picker values
  const initializeDatePicker = (date, isRecurrence = false) => {
    const targetDate = date || new Date();
    if (isRecurrence) {
      setRecurrenceSelectedMonth(targetDate.getMonth());
      setRecurrenceSelectedDay(targetDate.getDate());
      setRecurrenceSelectedYear(targetDate.getFullYear());
    } else {
      setSelectedMonth(targetDate.getMonth());
      setSelectedDay(targetDate.getDate());
      setSelectedYear(targetDate.getFullYear());
    }
  };

  // Debounced geocoding to prevent API rate limiting
  const [geocodingTimeout, setGeocodingTimeout] = useState(null);

  // Geocoding function to convert address to coordinates
  const geocodeAddress = async (address) => {
    console.log('🗺️ EventsScreen: geocodeAddress called with:', address);
    
    if (!address || address.trim().length < 5) {
      console.log('🗺️ EventsScreen: Address too short or empty, skipping geocoding');
      return null;
    }

    try {
      console.log('🗺️ EventsScreen: Starting geocoding for address:', address);
      
      // Add User-Agent header and delay to respect rate limits
      const encodedAddress = encodeURIComponent(address.trim());
      const geocodingUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
      console.log('🗺️ EventsScreen: Geocoding URL:', geocodingUrl);
      
      const response = await fetch(geocodingUrl, {
        headers: {
          'User-Agent': 'FoodTruckFinder/1.0 (events@foodtruckfinder.com)'
        }
      });
      console.log('🗺️ EventsScreen: Geocoding response status:', response.status);
      
      if (!response.ok) {
        console.log('❌ EventsScreen: Geocoding service response not ok:', response.status);
        if (response.status === 429) {
          throw new Error('Rate limit exceeded - please wait before trying again');
        }
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      console.log('🗺️ EventsScreen: Geocoding response data:', data);
      
      if (data && data.length > 0) {
        const result = data[0];
        const coordinates = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        };
        
        console.log('✅ EventsScreen: Geocoding successful!');
        console.log('🗺️ EventsScreen: Raw result:', { lat: result.lat, lon: result.lon });
        console.log('🗺️ EventsScreen: Parsed coordinates:', coordinates);
        console.log('🗺️ EventsScreen: Display name:', result.display_name);
        
        return coordinates;
      } else {
        console.log('❌ EventsScreen: No geocoding results found for address:', address);
        console.log('🗺️ EventsScreen: Empty data array returned from geocoding service');
        return null;
      }
    } catch (error) {
      console.error('❌ EventsScreen: Geocoding error details:', error);
      console.error('❌ EventsScreen: Error message:', error.message);
      console.error('❌ EventsScreen: Error stack:', error.stack);
      return null;
    }
  };

  // Debounced address change handler to prevent excessive API calls
  const handleAddressChange = (text) => {
    console.log('🗺️ EventsScreen: handleAddressChange called with:', text);
    console.log('🗺️ EventsScreen: Text length:', text ? text.length : 0);
    
    // Update form immediately for UI responsiveness
    setEventForm(prev => ({ ...prev, address: text }));
    
    // Clear existing timeout
    if (geocodingTimeout) {
      clearTimeout(geocodingTimeout);
    }
    
    // Only geocode if address is substantial enough - debounced by 1.5 seconds
    if (text && text.trim().length > 10) {
      console.log('🗺️ EventsScreen: Setting up debounced geocoding...');
      
      const newTimeout = setTimeout(async () => {
        console.log('🗺️ EventsScreen: Executing debounced geocoding for:', text);
        const coordinates = await geocodeAddress(text);
        console.log('🗺️ EventsScreen: Geocoding completed, result:', coordinates);
        
        if (coordinates && coordinates.latitude && coordinates.longitude) {
          console.log('✅ EventsScreen: Updating form with new coordinates...');
          setEventForm(prev => ({ 
            ...prev, 
            latitude: coordinates.latitude,
            longitude: coordinates.longitude 
          }));
          console.log('✅ EventsScreen: Form coordinates updated successfully');
        } else {
          console.log('❌ EventsScreen: Invalid or null coordinates from geocoding');
          // Clear coordinates if geocoding failed
          setEventForm(prev => ({ 
            ...prev, 
            latitude: null,
            longitude: null 
          }));
        }
      }, 1500); // 1.5 second delay
      
      setGeocodingTimeout(newTimeout);
    } else {
      console.log('🗺️ EventsScreen: Address too short, clearing coordinates');
      // Clear coordinates if address is too short
      setEventForm(prev => ({ 
        ...prev, 
        latitude: null,
        longitude: null 
      }));
    }
  };

  // Helper function to format time from picker values
  const formatTimeFromPicker = (hour, minute, period) => {
    const displayHour = hour === 0 ? 12 : hour;
    const formattedMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${formattedMinute} ${period}`;
  };

  // Helper function to parse time string and set picker values
  const parseTimeToPickerValues = (timeString) => {
    if (!timeString) return { hour: 9, minute: 0, period: 'AM' };
    
    if (timeString.includes('AM') || timeString.includes('PM')) {
      const [time, period] = timeString.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      
      // Convert 12-hour to picker format (1-12)
      if (hour === 0) hour = 12;
      if (period === 'PM' && hour !== 12) hour = hour;
      if (period === 'AM' && hour === 12) hour = 12;
      
      return { hour, minute: parseInt(minutes), period };
    }
    
    return { hour: 9, minute: 0, period: 'AM' };
  };

  // Initialize picker values when modal opens
  const initializeTimePicker = (timeString, isEndTime = false) => {
    const { hour, minute, period } = parseTimeToPickerValues(timeString);
    if (isEndTime) {
      setEndSelectedHour(hour);
      setEndSelectedMinute(minute);
      setEndSelectedPeriod(period);
    } else {
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedPeriod(period);
    }
  };

  // Logo image upload functions
  const pickEventLogo = async () => {
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
        aspect: [1, 1], // Square aspect ratio for logos
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadEventLogo(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking logo image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadEventLogo = async (imageAsset) => {
    setUploadingLogo(true);
    try {
      const { uri } = imageAsset;
      
      // Create a blob from the image URI
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = uri.split('.').pop() || 'jpg';
      const fileName = `event-logo-${timestamp}.${fileExtension}`;
      
      // Create storage reference for event logos
      const storagePath = `uploads/event-organizers/${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('🔄 Uploading event logo to Firebase Storage...');
      
      // Upload the blob
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log('✅ Event logo uploaded successfully:', downloadURL);
      
      // Update the event form with the new logo URL
      setEventForm(prev => ({ ...prev, organizerLogoUrl: downloadURL }));
      
      Alert.alert('Success', 'Event logo uploaded successfully!');
      
    } catch (error) {
      console.error('Error uploading event logo:', error);
      Alert.alert('Error', 'Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeEventLogo = () => {
    setEventForm(prev => ({ ...prev, organizerLogoUrl: '' }));
  };

  // Fetch events from Firebase
  useEffect(() => {
    if (!user) return;

    console.log('🎪 EventsScreen: Setting up events listener');
    
    const now = new Date();
    const todayString = now.toISOString().split('T')[0];

    // Query for all events
    const eventsQuery = query(
      collection(db, 'events'),
      orderBy('startDate', 'asc')
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

  // Fetch user's created events (for event organizers)
  useEffect(() => {
    if (!user || (userRole !== 'event-organizer' && userRole !== 'owner')) return;

    console.log('🎪 EventsScreen: Setting up my events listener for organizer');
    console.log('🎪 EventsScreen: User ID:', user.uid);
    
    // Temporarily use a simpler query without orderBy to avoid index requirement
    // TODO: Re-enable orderBy once the composite index is fully built
    const myEventsQuery = query(
      collection(db, 'events'),
      where('organizerId', '==', user.uid)
      // orderBy('startDate', 'asc') // Temporarily disabled while index builds
    );

    const unsubscribe = onSnapshot(myEventsQuery, (snapshot) => {
      console.log('🎪 EventsScreen: Raw snapshot received, docs count:', snapshot.docs.length);
      
      let myEventsData = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        console.log('🎪 EventsScreen: Event doc data:', {
          id: data.id,
          title: data.title,
          organizerId: data.organizerId,
          startDate: data.startDate
        });
        return data;
      });
      
      // Sort manually in JavaScript while waiting for Firestore index
      myEventsData.sort((a, b) => {
        const aDate = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate || 0);
        const bDate = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate || 0);
        return aDate.getTime() - bDate.getTime();
      });
      
      console.log('🎪 EventsScreen: Found my events:', myEventsData.length);
      setMyEvents(myEventsData);
    }, (error) => {
      console.error('🎪 EventsScreen: Error fetching my events:', error);
    });

    return unsubscribe;
  }, [user, userRole]);

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

  // Fetch user's attending events (interested/planning to attend)
  useEffect(() => {
    if (!user) return;

    console.log('🎪 EventsScreen: Setting up attending events listener');
    
    const interestQuery = query(
      collection(db, 'eventInterest'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(interestQuery, (snapshot) => {
      const interestData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('🎪 EventsScreen: Found attending events:', interestData.length);
      setAttendingEvents(interestData);
    }, (error) => {
      console.error('🎪 EventsScreen: Error fetching attending events:', error);
    });

    return unsubscribe;
  }, [user]);

  // Fetch event attendance counts for analytics
  useEffect(() => {
    if (!user || userRole !== 'event-organizer') return;

    console.log('🎪 EventsScreen: Setting up attendance counts listener for event organizer');
    
    // Listen to both attended and attending counts
    const attendedQuery = query(collection(db, 'eventAttendance'));
    const attendingQuery = query(collection(db, 'eventInterest'));

    const unsubscribeAttended = onSnapshot(attendedQuery, (snapshot) => {
      const attendedCounts = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const eventId = data.eventId;
        if (!attendedCounts[eventId]) {
          attendedCounts[eventId] = { attended: 0, attending: 0 };
        }
        attendedCounts[eventId].attended++;
      });

      const unsubscribeAttending = onSnapshot(attendingQuery, (snapshot) => {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const eventId = data.eventId;
          if (!attendedCounts[eventId]) {
            attendedCounts[eventId] = { attended: 0, attending: 0 };
          }
          attendedCounts[eventId].attending++;
        });

        console.log('🎪 EventsScreen: Event attendance counts:', attendedCounts);
        setEventAttendanceCounts(attendedCounts);
      });

      return () => {
        unsubscribeAttending();
      };
    });

    return unsubscribeAttended;
  }, [user, userRole]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (geocodingTimeout) {
        clearTimeout(geocodingTimeout);
      }
    };
  }, [geocodingTimeout]);

  // Check if user can manage events
  const canManageEvents = () => {
    // Role-based access: event-organizer or owner
    if (userRole === 'event-organizer' || userRole === 'owner') {
      return true;
    }
    // Plan-based access: All-Access plan gets event management
    if (userPlan === 'all-access') {
      return true;
    }
    return false;
  };

  // Check if user can edit/delete specific event
  const canEditEvent = (event) => {
    return canManageEvents() && event.organizerId === user?.uid;
  };

  // Reset event form
  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      eventType: 'food-festival',
      date: new Date(),
      time: '',
      endTime: '',
      location: '',
      address: '',
      latitude: null,
      longitude: null,
      maxAttendees: null,
      registrationRequired: false,
      organizerLogoUrl: '',
      status: 'upcoming',
      isRecurring: false,
      recurrenceType: 'weekly',
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      recurrenceCount: null,
      weeklyRecurrenceDays: [],
      monthlyRecurrenceType: 'date'
    });
    setEditingEvent(null);
  };

  // Open create event modal
  const openCreateEventModal = () => {
    resetEventForm();
    setShowEventModal(true);
  };

  // Open edit event modal
  const openEditEventModal = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      eventType: event.eventType || 'food-festival',
      date: event.startDate?.toDate ? event.startDate.toDate() : new Date(event.startDate) || new Date(),
      time: event.time || '',
      endTime: event.endTime || '',
      location: event.location || '',
      address: event.address || '',
      latitude: event.latitude || null,
      longitude: event.longitude || null,
      maxAttendees: event.maxAttendees || null,
      registrationRequired: event.registrationRequired || false,
      organizerLogoUrl: event.organizerLogoUrl || '',
      status: event.status || 'upcoming',
      isRecurring: event.isRecurring || false,
      recurrenceType: event.recurrenceType || 'weekly',
      recurrenceInterval: event.recurrenceInterval || 1,
      recurrenceEndDate: event.recurrenceEndDate?.toDate ? event.recurrenceEndDate.toDate() : null,
      recurrenceCount: event.recurrenceCount || null,
      weeklyRecurrenceDays: event.weeklyRecurrenceDays || [],
      monthlyRecurrenceType: event.monthlyRecurrenceType || 'date'
    });
    setShowEventModal(true);
  };

  // Save event (create or update)
  const saveEvent = async () => {
    try {
      console.log('🎪 EventsScreen: Starting save event process...');
      console.log('🎪 EventsScreen: Current eventForm state:', {
        title: eventForm.title,
        address: eventForm.address,
        latitude: eventForm.latitude,
        longitude: eventForm.longitude,
        hasLatitude: !!eventForm.latitude,
        hasLongitude: !!eventForm.longitude
      });

      if (!eventForm.title.trim()) {
        console.log('❌ EventsScreen: Missing title');
        Alert.alert('Error', 'Please enter an event title');
        return;
      }

      if (!eventForm.location.trim()) {
        console.log('❌ EventsScreen: Missing location');
        Alert.alert('Error', 'Please enter an event location');
        return;
      }

      if (!eventForm.address.trim()) {
        console.log('❌ EventsScreen: Missing address');
        Alert.alert('Error', 'Please enter a full address');
        return;
      }

      // Ensure we have coordinates for map display
      if (!eventForm.latitude || !eventForm.longitude) {
        console.log('🗺️ EventsScreen: Missing coordinates, attempting to geocode address:', eventForm.address);
        console.log('🗺️ EventsScreen: Address length:', eventForm.address.length);
        
        const coordinates = await geocodeAddress(eventForm.address);
        console.log('🗺️ EventsScreen: Geocoding result:', coordinates);
        
        if (coordinates && coordinates.latitude && coordinates.longitude) {
          console.log('✅ EventsScreen: Geocoding successful, updating form...');
          setEventForm(prev => ({ 
            ...prev, 
            latitude: coordinates.latitude,
            longitude: coordinates.longitude 
          }));
          // Use the coordinates for this save
          eventForm.latitude = coordinates.latitude;
          eventForm.longitude = coordinates.longitude;
          console.log('✅ EventsScreen: Form updated with coordinates:', {
            latitude: eventForm.latitude,
            longitude: eventForm.longitude
          });
        } else {
          console.log('❌ EventsScreen: Geocoding failed or returned invalid coordinates');
          Alert.alert(
            'Address Error', 
            'Could not find coordinates for the provided address. Please check the address and try again, or ensure you have an internet connection.'
          );
          return;
        }
      } else {
        console.log('✅ EventsScreen: Coordinates already available:', {
          latitude: eventForm.latitude,
          longitude: eventForm.longitude
        });
      }

      console.log('🎪 EventsScreen: Preparing event data for save...');
      
      const eventData = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        eventType: eventForm.eventType,
        startDate: Timestamp.fromDate(eventForm.date),
        endDate: eventForm.endTime ? Timestamp.fromDate(eventForm.date) : null,
        time: eventForm.time,
        endTime: eventForm.endTime,
        location: eventForm.location.trim(),
        address: eventForm.address.trim(),
        latitude: eventForm.latitude,
        longitude: eventForm.longitude,
        maxAttendees: eventForm.maxAttendees ? parseInt(eventForm.maxAttendees) : null,
        registrationRequired: eventForm.registrationRequired,
        organizerLogoUrl: eventForm.organizerLogoUrl.trim(),
        status: eventForm.status,
        organizerId: user.uid,
        organizerName: userData?.businessName || userData?.username || 'Event Organizer',
        organizerEmail: user.email,
        updatedAt: serverTimestamp(),
        // Recurring event fields
        isRecurring: eventForm.isRecurring,
        recurrenceType: eventForm.isRecurring ? eventForm.recurrenceType : null,
        recurrenceInterval: eventForm.isRecurring ? eventForm.recurrenceInterval : null,
        recurrenceEndDate: eventForm.isRecurring && eventForm.recurrenceEndDate ? Timestamp.fromDate(eventForm.recurrenceEndDate) : null,
        recurrenceCount: eventForm.isRecurring ? eventForm.recurrenceCount : null,
        weeklyRecurrenceDays: eventForm.isRecurring && eventForm.recurrenceType === 'weekly' ? eventForm.weeklyRecurrenceDays : null,
        monthlyRecurrenceType: eventForm.isRecurring && eventForm.recurrenceType === 'monthly' ? eventForm.monthlyRecurrenceType : null,
      };

      console.log('🎪 EventsScreen: Final event data prepared:');
      console.log('🎪 EventsScreen: - Title:', eventData.title);
      console.log('🎪 EventsScreen: - Address:', eventData.address);
      console.log('🎪 EventsScreen: - Latitude:', eventData.latitude, '(type:', typeof eventData.latitude, ')');
      console.log('🎪 EventsScreen: - Longitude:', eventData.longitude, '(type:', typeof eventData.longitude, ')');
      console.log('🎪 EventsScreen: - Has valid coordinates:', !!(eventData.latitude && eventData.longitude));

      // Double-check coordinates before saving
      if (!eventData.latitude || !eventData.longitude || 
          isNaN(eventData.latitude) || isNaN(eventData.longitude)) {
        console.log('❌ EventsScreen: Invalid coordinates detected before save!');
        console.log('❌ EventsScreen: Latitude:', eventData.latitude, 'valid:', !isNaN(eventData.latitude));
        console.log('❌ EventsScreen: Longitude:', eventData.longitude, 'valid:', !isNaN(eventData.longitude));
        Alert.alert(
          'Coordinates Error', 
          'Event coordinates are invalid. Please check the address and try again.'
        );
        return;
      }

      console.log('🎪 EventsScreen: Saving event with coordinates:', {
        latitude: eventData.latitude,
        longitude: eventData.longitude,
        address: eventData.address
      });

      if (editingEvent) {
        // Update existing event
        console.log('🎪 EventsScreen: Updating existing event:', editingEvent.id);
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
        console.log('✅ EventsScreen: Event updated successfully!');
        Alert.alert('Success', 'Event updated successfully!');
      } else {
        // Create new event
        console.log('🎪 EventsScreen: Creating new event...');
        console.log('🎪 EventsScreen: Event data being sent to Firebase:', JSON.stringify({
          title: eventData.title,
          address: eventData.address,
          latitude: eventData.latitude,
          longitude: eventData.longitude,
          organizerId: eventData.organizerId
        }, null, 2));
        
        eventData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'events'), eventData);
        
        console.log('✅ EventsScreen: Event created successfully!');
        console.log('✅ EventsScreen: New event ID:', docRef.id);
        console.log('✅ EventsScreen: Event should appear on map with coordinates:', {
          latitude: eventData.latitude,
          longitude: eventData.longitude
        });
        
        Alert.alert('Success', `Event created successfully with ID: ${docRef.id}! It should now appear on the map.`);
      }

      setShowEventModal(false);
      resetEventForm();
    } catch (error) {
      console.error('🎪 EventsScreen: Error saving event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    }
  };

  // Delete event
  const deleteEvent = async (eventId, eventTitle) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🎪 EventsScreen: Deleting event:', eventId);
              await deleteDoc(doc(db, 'events', eventId));
              Alert.alert('Success', 'Event deleted successfully');
            } catch (error) {
              console.error('🎪 EventsScreen: Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            }
          }
        }
      ]
    );
  };
  const markEventAttended = async (event) => {
    try {
      console.log('🎪 EventsScreen: Marking event as attended:', event.id);
      console.log('🎪 EventsScreen: User role:', userRole);
      console.log('🎪 EventsScreen: User data:', {
        uid: user.uid,
        email: user.email,
        role: userRole,
        businessName: userData?.businessName,
        username: userData?.username
      });

      // Check if already marked as attended
      const existingAttendance = attendedEvents.find(a => a.eventId === event.id);
      if (existingAttendance) {
        Alert.alert('Already Marked', 'You have already marked this event as attended.');
        return;
      }

      // Create attendance record with proper user info for mobile kitchen owners
      const userName = userData?.businessName || userData?.truckName || userData?.username || 'Unknown User';
      const attendanceData = {
        userId: user.uid,
        userEmail: user.email,
        userName: userName,
        userRole: userRole, // Add user role for better tracking
        eventId: event.id,
        eventTitle: event.title || event.eventName,
        eventDate: event.date || event.startDate,
        eventLocation: event.location || event.address,
        organizerId: event.organizerId,
        attendedAt: serverTimestamp(),
        attendanceMethod: 'manual', // manual, checkin, automatic
        rating: null, // Can be updated later
        review: null
      };

      console.log('🎪 EventsScreen: Creating attendance record:', attendanceData);

      // Add to eventAttendance collection
      await addDoc(collection(db, 'eventAttendance'), attendanceData);

      Alert.alert('Success', 'Event marked as attended!');
      console.log('🎪 EventsScreen: Event attendance recorded successfully for mobile kitchen owner');

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

  // Mark event as attending (for upcoming events)
  const markEventAttending = async (event) => {
    try {
      console.log('🎪 EventsScreen: Marking event as attending:', event.id);

      // Check if already marked as attending
      const existingAttending = attendingEvents.find(a => a.eventId === event.id);
      if (existingAttending) {
        Alert.alert('Already Marked', 'You have already marked this event as attending.');
        return;
      }

      const userName = userData?.businessName || userData?.truckName || userData?.username || 'Unknown User';
      const attendingData = {
        userId: user.uid,
        userEmail: user.email,
        userName: userName,
        userRole: userRole,
        eventId: event.id,
        eventTitle: event.title || event.eventName,
        eventDate: event.date || event.startDate,
        eventLocation: event.location || event.address,
        organizerId: event.organizerId,
        interestedAt: serverTimestamp(),
        status: 'attending' // attending, maybe, not-attending
      };

      console.log('🎪 EventsScreen: Creating attending record:', attendingData);

      // Add to eventInterest collection
      await addDoc(collection(db, 'eventInterest'), attendingData);

      Alert.alert('Success', 'Marked as attending!');
      console.log('🎪 EventsScreen: Event interest recorded successfully');

    } catch (error) {
      console.error('🎪 EventsScreen: Error marking event as attending:', error);
      Alert.alert('Error', 'Failed to mark as attending. Please try again.');
    }
  };

  // Remove attending status
  const removeEventAttending = async (eventId) => {
    try {
      console.log('🎪 EventsScreen: Removing attending status:', eventId);

      const attendingRecord = attendingEvents.find(a => a.eventId === eventId);
      if (!attendingRecord) {
        Alert.alert('Error', 'Attending record not found.');
        return;
      }

      await deleteDoc(doc(db, 'eventInterest', attendingRecord.id));
      
      Alert.alert('Success', 'Attending status removed.');
      console.log('🎪 EventsScreen: Attending status removed successfully');

    } catch (error) {
      console.error('🎪 EventsScreen: Error removing attending status:', error);
      Alert.alert('Error', 'Failed to remove attending status. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateInput) => {
    let date;
    if (dateInput?.toDate) {
      date = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      return 'Date TBD';
    }
    
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

  // Check if event is in the past
  const isEventPast = (eventDate) => {
    const now = new Date();
    let date;
    
    if (eventDate?.toDate) {
      date = eventDate.toDate();
    } else if (eventDate instanceof Date) {
      date = eventDate;
    } else if (typeof eventDate === 'string') {
      date = new Date(eventDate);
    } else {
      return false;
    }
    
    return date < now;
  };

  // Filter events based on selected filter
  const getFilteredEvents = () => {
    const now = new Date();

    switch (selectedFilter) {
      case 'upcoming':
        return events.filter(event => !isEventPast(event.startDate || event.date));
      case 'past':
        return events.filter(event => isEventPast(event.startDate || event.date));
      case 'attended':
        const attendedEventIds = attendedEvents.map(a => a.eventId);
        return events.filter(event => attendedEventIds.includes(event.id));
      case 'attending':
        const attendingEventIds = attendingEvents.map(a => a.eventId);
        return events.filter(event => attendingEventIds.includes(event.id));
      case 'my-events':
        return myEvents;
      default:
        return events;
    }
  };

  // Get analytics data for event organizer
  const getEventAnalytics = () => {
    if (!canManageEvents()) return null;

    const myEventsList = myEvents;
    const totalEvents = myEventsList.length;
    const upcomingEvents = myEventsList.filter(event => !isEventPast(event.startDate || event.date));
    const pastEvents = myEventsList.filter(event => isEventPast(event.startDate || event.date));

    // Calculate total attendance across all events
    let totalAttendance = 0;
    let totalInterested = 0;
    let totalFoodTrucks = 0;
    const attendanceByEvent = [];

    myEventsList.forEach(event => {
      const eventCounts = eventAttendanceCounts[event.id] || { attended: 0, attending: 0 };
      const isPast = isEventPast(event.startDate || event.date);
      
      if (isPast) {
        totalAttendance += eventCounts.attended;
      } else {
        totalInterested += eventCounts.attending;
      }

      // Count food truck participants (assuming attendance includes food trucks)
      // You can modify this logic based on how food trucks are tracked
      attendanceByEvent.push({
        eventId: event.id,
        eventTitle: event.title || event.eventName,
        date: event.startDate || event.date,
        attended: eventCounts.attended,
        interested: eventCounts.attending,
        isPast: isPast
      });
    });

    // Calculate averages
    const avgAttendancePerEvent = pastEvents.length > 0 ? (totalAttendance / pastEvents.length).toFixed(1) : 0;
    const avgInterestPerEvent = upcomingEvents.length > 0 ? (totalInterested / upcomingEvents.length).toFixed(1) : 0;

    // Most successful event
    const mostSuccessfulEvent = attendanceByEvent.reduce((max, event) => {
      const currentTotal = event.attended + event.interested;
      const maxTotal = max.attended + max.interested;
      return currentTotal > maxTotal ? event : max;
    }, attendanceByEvent[0] || {});

    return {
      totalEvents,
      upcomingEventsCount: upcomingEvents.length,
      pastEventsCount: pastEvents.length,
      totalAttendance,
      totalInterested,
      avgAttendancePerEvent,
      avgInterestPerEvent,
      mostSuccessfulEvent,
      attendanceByEvent
    };
  };

  // Get available filter tabs based on user role
  const getFilterTabs = () => {
    const baseTabs = ['upcoming', 'past', 'attended', 'attending'];
    if (canManageEvents()) {
      baseTabs.push('my-events');
    }
    return baseTabs;
  };

  // Get display name for filter tab
  const getFilterDisplayName = (filter) => {
    switch (filter) {
      case 'my-events':
        return 'My Events';
      case 'attending':
        return 'Attending';
      case 'attended':
        return 'Attended';
      case 'upcoming':
        return 'Upcoming';
      case 'past':
        return 'Past';
      default:
        return filter.charAt(0).toUpperCase() + filter.slice(1);
    }
  };

  // Refresh events
  const onRefresh = async () => {
    setRefreshing(true);
    // The real-time listeners will automatically update the data
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Render event management modal
  const renderEventModal = () => {
    return (
      <Modal
        visible={showEventModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowEventModal(false);
                resetEventForm();
              }}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={saveEvent}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Event Title */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Event Title *</Text>
              <TextInput
                style={styles.formInput}
                value={eventForm.title}
                onChangeText={(text) => setEventForm(prev => ({ ...prev, title: text }))}
                placeholder="Enter event title"
                placeholderTextColor="#999"
              />
            </View>

            {/* Event Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={eventForm.description}
                onChangeText={(text) => setEventForm(prev => ({ ...prev, description: text }))}
                placeholder="Enter event description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Event Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Event Type</Text>
              <View style={styles.eventTypeContainer}>
                {['food-festival', 'farmers-market', 'street-fair', 'popup-event', 'catering', 'private-event'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.eventTypeButton,
                      eventForm.eventType === type && styles.eventTypeButtonActive
                    ]}
                    onPress={() => setEventForm(prev => ({ ...prev, eventType: type }))}
                  >
                    <Text style={[
                      styles.eventTypeText,
                      eventForm.eventType === type && styles.eventTypeTextActive
                    ]}>
                      {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date and Time */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date *</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  initializeDatePicker(eventForm.date, false);
                  setShowDatePicker(true);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.dateTimeText}>
                  {eventForm.date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.formLabel}>Start Time</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => {
                    initializeTimePicker(eventForm.time, false);
                    setShowTimePicker(true);
                  }}
                >
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.dateTimeText}>
                    {eventForm.time || 'Select time'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.formLabel}>End Time</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => {
                    initializeTimePicker(eventForm.endTime, true);
                    setShowEndTimePicker(true);
                  }}
                >
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.dateTimeText}>
                    {eventForm.endTime || 'Select time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Location */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Location *</Text>
              <TextInput
                style={styles.formInput}
                value={eventForm.location}
                onChangeText={(text) => setEventForm(prev => ({ ...prev, location: text }))}
                placeholder="Enter event location"
                placeholderTextColor="#999"
              />
            </View>

            {/* Address */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Address *</Text>
              <TextInput
                style={styles.formInput}
                value={eventForm.address}
                onChangeText={handleAddressChange}
                placeholder="Enter full address (will be geocoded for map display)"
                placeholderTextColor="#999"
                onBlur={() => {
                  // Re-geocode on blur to ensure we have coordinates
                  if (eventForm.address && !eventForm.latitude) {
                    handleAddressChange(eventForm.address);
                  }
                }}
              />
              {eventForm.latitude && eventForm.longitude && (
                <Text style={styles.coordinatesText}>
                  📍 Coordinates: {eventForm.latitude.toFixed(6)}, {eventForm.longitude.toFixed(6)}
                </Text>
              )}
            </View>

            {/* Max Attendees */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Max Attendees</Text>
              <TextInput
                style={styles.formInput}
                value={eventForm.maxAttendees?.toString() || ''}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  setEventForm(prev => ({ ...prev, maxAttendees: num ? parseInt(num) : null }));
                }}
                placeholder="Leave empty for unlimited"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            {/* Event Logo */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Event Logo</Text>
              
              {eventForm.organizerLogoUrl ? (
                <View style={styles.logoContainer}>
                  <Image 
                    source={{ uri: eventForm.organizerLogoUrl }} 
                    style={styles.logoPreview}
                    resizeMode="cover"
                  />
                  <View style={styles.logoActions}>
                    <TouchableOpacity 
                      style={styles.changeLogo} 
                      onPress={pickEventLogo}
                      disabled={uploadingLogo}
                    >
                      <Ionicons name="camera" size={16} color="#007AFF" />
                      <Text style={styles.changeLogoText}>Change Logo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeLogo} 
                      onPress={removeEventLogo}
                      disabled={uploadingLogo}
                    >
                      <Ionicons name="trash" size={16} color="#FF3B30" />
                      <Text style={styles.removeLogoText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.logoUploadButton} 
                  onPress={pickEventLogo}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Ionicons name="camera" size={24} color="#007AFF" />
                  )}
                  <Text style={styles.logoUploadText}>
                    {uploadingLogo ? 'Uploading...' : 'Upload Event Logo'}
                  </Text>
                  <Text style={styles.logoUploadSubtext}>
                    This logo will appear on your event markers
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Event Status */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Status</Text>
              <View style={styles.statusContainer}>
                {['upcoming', 'active', 'completed', 'cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      eventForm.status === status && styles.statusButtonActive
                    ]}
                    onPress={() => setEventForm(prev => ({ ...prev, status }))}
                  >
                    <Text style={[
                      styles.statusText,
                      eventForm.status === status && styles.statusTextActive
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Recurring Event Settings */}
            <View style={styles.formGroup}>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={[styles.checkbox, eventForm.isRecurring && styles.checkboxChecked]}
                  onPress={() => setEventForm(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
                >
                  {eventForm.isRecurring && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Make this a recurring event</Text>
              </View>
            </View>

            {/* Recurring Options - Only show if recurring is enabled */}
            {eventForm.isRecurring && (
              <>
                {/* Recurrence Type */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Repeat</Text>
                  <View style={styles.recurrenceTypeContainer}>
                    {['daily', 'weekly', 'monthly', 'yearly'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.recurrenceTypeButton,
                          eventForm.recurrenceType === type && styles.recurrenceTypeButtonActive
                        ]}
                        onPress={() => setEventForm(prev => ({ ...prev, recurrenceType: type }))}
                      >
                        <Text style={[
                          styles.recurrenceTypeText,
                          eventForm.recurrenceType === type && styles.recurrenceTypeTextActive
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Recurrence Interval */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Repeat every {eventForm.recurrenceInterval} {eventForm.recurrenceType === 'daily' ? 'day(s)' : 
                      eventForm.recurrenceType === 'weekly' ? 'week(s)' : 
                      eventForm.recurrenceType === 'monthly' ? 'month(s)' : 'year(s)'}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={eventForm.recurrenceInterval.toString()}
                    onChangeText={(text) => {
                      const num = text.replace(/[^0-9]/g, '');
                      setEventForm(prev => ({ ...prev, recurrenceInterval: num ? parseInt(num) : 1 }));
                    }}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Weekly Days Selection (only for weekly recurrence) */}
                {eventForm.recurrenceType === 'weekly' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Repeat on</Text>
                    <View style={styles.weeklyDaysContainer}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.weeklyDayButton,
                            eventForm.weeklyRecurrenceDays.includes(index) && styles.weeklyDayButtonActive
                          ]}
                          onPress={() => {
                            const days = [...eventForm.weeklyRecurrenceDays];
                            const dayIndex = days.indexOf(index);
                            if (dayIndex > -1) {
                              days.splice(dayIndex, 1);
                            } else {
                              days.push(index);
                            }
                            setEventForm(prev => ({ ...prev, weeklyRecurrenceDays: days }));
                          }}
                        >
                          <Text style={[
                            styles.weeklyDayText,
                            eventForm.weeklyRecurrenceDays.includes(index) && styles.weeklyDayTextActive
                          ]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Monthly Recurrence Type (only for monthly recurrence) */}
                {eventForm.recurrenceType === 'monthly' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Monthly repeat pattern</Text>
                    <View style={styles.monthlyTypeContainer}>
                      <TouchableOpacity
                        style={[
                          styles.monthlyTypeButton,
                          eventForm.monthlyRecurrenceType === 'date' && styles.monthlyTypeButtonActive
                        ]}
                        onPress={() => setEventForm(prev => ({ ...prev, monthlyRecurrenceType: 'date' }))}
                      >
                        <Text style={[
                          styles.monthlyTypeText,
                          eventForm.monthlyRecurrenceType === 'date' && styles.monthlyTypeTextActive
                        ]}>
                          On date {eventForm.date.getDate()}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.monthlyTypeButton,
                          eventForm.monthlyRecurrenceType === 'day' && styles.monthlyTypeButtonActive
                        ]}
                        onPress={() => setEventForm(prev => ({ ...prev, monthlyRecurrenceType: 'day' }))}
                      >
                        <Text style={[
                          styles.monthlyTypeText,
                          eventForm.monthlyRecurrenceType === 'day' && styles.monthlyTypeTextActive
                        ]}>
                          On {['first', 'second', 'third', 'fourth', 'last'][Math.floor((eventForm.date.getDate() - 1) / 7)]} {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][eventForm.date.getDay()]}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Recurrence End Options */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>End repeat</Text>
                  <View style={styles.recurrenceEndContainer}>
                    <TouchableOpacity
                      style={[
                        styles.recurrenceEndButton,
                        !eventForm.recurrenceEndDate && !eventForm.recurrenceCount && styles.recurrenceEndButtonActive
                      ]}
                      onPress={() => setEventForm(prev => ({ ...prev, recurrenceEndDate: null, recurrenceCount: null }))}
                    >
                      <Text style={[
                        styles.recurrenceEndText,
                        !eventForm.recurrenceEndDate && !eventForm.recurrenceCount && styles.recurrenceEndTextActive
                      ]}>
                        Never
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.recurrenceEndButton,
                        eventForm.recurrenceEndDate && styles.recurrenceEndButtonActive
                      ]}
                      onPress={() => {
                        initializeDatePicker(eventForm.recurrenceEndDate || new Date(), true);
                        setShowRecurrenceEndDatePicker(true);
                      }}
                    >
                      <Text style={[
                        styles.recurrenceEndText,
                        eventForm.recurrenceEndDate && styles.recurrenceEndTextActive
                      ]}>
                        {eventForm.recurrenceEndDate ? `Until ${eventForm.recurrenceEndDate.toLocaleDateString()}` : 'On date'}
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={styles.recurrenceCountContainer}>
                      <TouchableOpacity
                        style={[
                          styles.recurrenceEndButton,
                          eventForm.recurrenceCount && styles.recurrenceEndButtonActive
                        ]}
                        onPress={() => {
                          if (!eventForm.recurrenceCount) {
                            setEventForm(prev => ({ ...prev, recurrenceCount: 5, recurrenceEndDate: null }));
                          }
                        }}
                      >
                        <Text style={[
                          styles.recurrenceEndText,
                          eventForm.recurrenceCount && styles.recurrenceEndTextActive
                        ]}>
                          After
                        </Text>
                      </TouchableOpacity>
                      {eventForm.recurrenceCount && (
                        <>
                          <TextInput
                            style={styles.recurrenceCountInput}
                            value={eventForm.recurrenceCount.toString()}
                            onChangeText={(text) => {
                              const num = text.replace(/[^0-9]/g, '');
                              setEventForm(prev => ({ ...prev, recurrenceCount: num ? parseInt(num) : null }));
                            }}
                            keyboardType="numeric"
                            placeholder="5"
                            placeholderTextColor="#999"
                          />
                          <Text style={styles.recurrenceCountLabel}>occurrences</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Date/Time Pickers */}
          {showDatePicker && (
            <Modal
              transparent={true}
              animationType="fade"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.pickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Select Date</Text>
                    <TouchableOpacity onPress={() => {
                      const selectedDate = formatDateFromPicker(selectedMonth, selectedDay, selectedYear);
                      setEventForm(prev => ({ ...prev, date: selectedDate }));
                      setShowDatePicker(false);
                    }}>
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.customTimePickerContainer}>
                    {/* Month Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Month</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {getMonthNames().map((month, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.timePickerOption,
                              selectedMonth === index && styles.timePickerOptionSelected
                            ]}
                            onPress={() => {
                              setSelectedMonth(index);
                              // Adjust day if it's invalid for the new month
                              const daysInMonth = getDaysInMonth(index, selectedYear);
                              if (selectedDay > daysInMonth) {
                                setSelectedDay(daysInMonth);
                              }
                            }}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              selectedMonth === index && styles.timePickerOptionTextSelected,
                              { fontSize: 14 }
                            ]}>
                              {month}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Day Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Day</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1).map((day) => (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.timePickerOption,
                              selectedDay === day && styles.timePickerOptionSelected
                            ]}
                            onPress={() => setSelectedDay(day)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              selectedDay === day && styles.timePickerOptionTextSelected
                            ]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Year Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Year</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {getAvailableYears().map((year) => (
                          <TouchableOpacity
                            key={year}
                            style={[
                              styles.timePickerOption,
                              selectedYear === year && styles.timePickerOptionSelected
                            ]}
                            onPress={() => setSelectedYear(year)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              selectedYear === year && styles.timePickerOptionTextSelected
                            ]}>
                              {year}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  <View style={styles.timePreviewContainer}>
                    <Text style={styles.timePreviewLabel}>Selected Date:</Text>
                    <Text style={styles.timePreviewText}>
                      {formatDateFromPicker(selectedMonth, selectedDay, selectedYear).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {showTimePicker && (
            <Modal
              transparent={true}
              animationType="fade"
              visible={showTimePicker}
              onRequestClose={() => setShowTimePicker(false)}
            >
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={styles.pickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Select Start Time</Text>
                    <TouchableOpacity onPress={() => {
                      const timeString = formatTimeFromPicker(selectedHour, selectedMinute, selectedPeriod);
                      setEventForm(prev => ({ ...prev, time: timeString }));
                      setShowTimePicker(false);
                    }}>
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.customTimePickerContainer}>
                    {/* Hour Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Hour</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hour) => (
                          <TouchableOpacity
                            key={hour}
                            style={[
                              styles.timePickerOption,
                              selectedHour === hour && styles.timePickerOptionSelected
                            ]}
                            onPress={() => setSelectedHour(hour)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              selectedHour === hour && styles.timePickerOptionTextSelected
                            ]}>
                              {hour}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Minute Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Minute</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {[0, 15, 30, 45].map((minute) => (
                          <TouchableOpacity
                            key={minute}
                            style={[
                              styles.timePickerOption,
                              selectedMinute === minute && styles.timePickerOptionSelected
                            ]}
                            onPress={() => setSelectedMinute(minute)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              selectedMinute === minute && styles.timePickerOptionTextSelected
                            ]}>
                              {minute.toString().padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* AM/PM Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Period</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {['AM', 'PM'].map((period) => (
                          <TouchableOpacity
                            key={period}
                            style={[
                              styles.timePickerOption,
                              selectedPeriod === period && styles.timePickerOptionSelected
                            ]}
                            onPress={() => setSelectedPeriod(period)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              selectedPeriod === period && styles.timePickerOptionTextSelected
                            ]}>
                              {period}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  <View style={styles.timePreviewContainer}>
                    <Text style={styles.timePreviewLabel}>Selected Time:</Text>
                    <Text style={styles.timePreviewText}>
                      {formatTimeFromPicker(selectedHour, selectedMinute, selectedPeriod)}
                    </Text>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {showEndTimePicker && (
            <Modal
              transparent={true}
              animationType="fade"
              visible={showEndTimePicker}
              onRequestClose={() => setShowEndTimePicker(false)}
            >
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                      <Text style={styles.pickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Select End Time</Text>
                    <TouchableOpacity onPress={() => {
                      const timeString = formatTimeFromPicker(endSelectedHour, endSelectedMinute, endSelectedPeriod);
                      setEventForm(prev => ({ ...prev, endTime: timeString }));
                      setShowEndTimePicker(false);
                    }}>
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.customTimePickerContainer}>
                    {/* Hour Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Hour</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hour) => (
                          <TouchableOpacity
                            key={hour}
                            style={[
                              styles.timePickerOption,
                              endSelectedHour === hour && styles.timePickerOptionSelected
                            ]}
                            onPress={() => setEndSelectedHour(hour)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              endSelectedHour === hour && styles.timePickerOptionTextSelected
                            ]}>
                              {hour}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Minute Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Minute</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {[0, 15, 30, 45].map((minute) => (
                          <TouchableOpacity
                            key={minute}
                            style={[
                              styles.timePickerOption,
                              endSelectedMinute === minute && styles.timePickerOptionSelected
                            ]}
                            onPress={() => setEndSelectedMinute(minute)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              endSelectedMinute === minute && styles.timePickerOptionTextSelected
                            ]}>
                              {minute.toString().padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* AM/PM Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Period</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {['AM', 'PM'].map((period) => (
                          <TouchableOpacity
                            key={period}
                            style={[
                              styles.timePickerOption,
                              endSelectedPeriod === period && styles.timePickerOptionSelected
                            ]}
                            onPress={() => setEndSelectedPeriod(period)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              endSelectedPeriod === period && styles.timePickerOptionTextSelected
                            ]}>
                              {period}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  <View style={styles.timePreviewContainer}>
                    <Text style={styles.timePreviewLabel}>Selected Time:</Text>
                    <Text style={styles.timePreviewText}>
                      {formatTimeFromPicker(endSelectedHour, endSelectedMinute, endSelectedPeriod)}
                    </Text>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {showRecurrenceEndDatePicker && (
            <Modal
              transparent={true}
              animationType="fade"
              visible={showRecurrenceEndDatePicker}
              onRequestClose={() => setShowRecurrenceEndDatePicker(false)}
            >
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowRecurrenceEndDatePicker(false)}>
                      <Text style={styles.pickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Select End Date</Text>
                    <TouchableOpacity onPress={() => {
                      const selectedDate = formatDateFromPicker(recurrenceSelectedMonth, recurrenceSelectedDay, recurrenceSelectedYear);
                      setEventForm(prev => ({ ...prev, recurrenceEndDate: selectedDate, recurrenceCount: null }));
                      setShowRecurrenceEndDatePicker(false);
                    }}>
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.customTimePickerContainer}>
                    {/* Month Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Month</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {getMonthNames().map((month, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.timePickerOption,
                              recurrenceSelectedMonth === index && styles.timePickerOptionSelected
                            ]}
                            onPress={() => {
                              setRecurrenceSelectedMonth(index);
                              // Adjust day if it's invalid for the new month
                              const daysInMonth = getDaysInMonth(index, recurrenceSelectedYear);
                              if (recurrenceSelectedDay > daysInMonth) {
                                setRecurrenceSelectedDay(daysInMonth);
                              }
                            }}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              recurrenceSelectedMonth === index && styles.timePickerOptionTextSelected,
                              { fontSize: 14 }
                            ]}>
                              {month}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Day Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Day</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {Array.from({ length: getDaysInMonth(recurrenceSelectedMonth, recurrenceSelectedYear) }, (_, i) => i + 1).map((day) => (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.timePickerOption,
                              recurrenceSelectedDay === day && styles.timePickerOptionSelected
                            ]}
                            onPress={() => setRecurrenceSelectedDay(day)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              recurrenceSelectedDay === day && styles.timePickerOptionTextSelected
                            ]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Year Picker */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Year</Text>
                      <ScrollView style={styles.timePickerScrollView} showsVerticalScrollIndicator={false}>
                        {getAvailableYears().map((year) => (
                          <TouchableOpacity
                            key={year}
                            style={[
                              styles.timePickerOption,
                              recurrenceSelectedYear === year && styles.timePickerOptionSelected
                            ]}
                            onPress={() => setRecurrenceSelectedYear(year)}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              recurrenceSelectedYear === year && styles.timePickerOptionTextSelected
                            ]}>
                              {year}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  <View style={styles.timePreviewContainer}>
                    <Text style={styles.timePreviewLabel}>Selected End Date:</Text>
                    <Text style={styles.timePreviewText}>
                      {formatDateFromPicker(recurrenceSelectedMonth, recurrenceSelectedDay, recurrenceSelectedYear).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </View>
      </Modal>
    );
  };

  // Render event card
  const renderEventCard = (event) => {
    const attended = isEventAttended(event.id);
    const attending = attendingEvents.some(a => a.eventId === event.id);
    const isPast = isEventPast(event.startDate || event.date);
    const canEdit = canEditEvent(event);
    const attendanceCount = eventAttendanceCounts[event.id] || { attended: 0, attending: 0 };

    return (
      <View key={event.id} style={styles.eventCard}>
        {/* Event Header */}
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{event.title || event.eventName}</Text>
          <View style={styles.eventHeaderRight}>
            {attended && (
              <View style={styles.attendedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.attendedText}>Attended</Text>
              </View>
            )}
            {attending && !attended && !isPast && (
              <View style={styles.attendingBadge}>
                <Ionicons name="heart" size={20} color="#8A2BE2" />
                <Text style={styles.attendingText}>Attending</Text>
              </View>
            )}
            {/* Show attendance counts for event organizers */}
            {userRole === 'event-organizer' && event.organizerId === user.uid && (
              <View style={styles.attendanceCountBadge}>
                <Text style={styles.attendanceCountText}>
                  {isPast ? `${attendanceCount.attended} attended` : `${attendanceCount.attending} interested`}
                </Text>
              </View>
            )}
            {canEdit && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => openEditEventModal(event)}
              >
                <Ionicons name="pencil" size={18} color="#2c6f57" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {formatDate(event.startDate || event.date)}
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
                {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1).replace('-', ' ')}
              </Text>
            </View>
          )}

          {event.maxAttendees && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                Max Attendees: {event.maxAttendees}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* For upcoming events - show attending button only if not the event organizer */}
          {!isPast && !attending && !attended && event.organizerId !== user.uid && (
            <TouchableOpacity
              style={styles.attendingButton}
              onPress={() => markEventAttending(event)}
            >
              <Ionicons name="heart-outline" size={20} color="#8A2BE2" />
              <Text style={styles.attendingButtonText}>Mark as Attending</Text>
            </TouchableOpacity>
          )}

          {/* For upcoming events - remove attending status only if not the event organizer */}
          {!isPast && attending && !attended && event.organizerId !== user.uid && (
            <TouchableOpacity
              style={styles.removeAttendingButton}
              onPress={() => removeEventAttending(event.id)}
            >
              <Ionicons name="heart-dislike-outline" size={20} color="#f44336" />
              <Text style={styles.removeAttendingButtonText}>Remove Attending</Text>
            </TouchableOpacity>
          )}

          {/* For past events - show attended button if not marked yet */}
          {isPast && !attended && (
            <TouchableOpacity
              style={styles.attendButton}
              onPress={() => markEventAttended(event)}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.attendButtonText}>Mark as Attended</Text>
            </TouchableOpacity>
          )}

          {/* Remove attended status */}
          {attended && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeEventAttendance(event.id)}
            >
              <Ionicons name="remove-circle-outline" size={20} color="#f44336" />
              <Text style={styles.removeButtonText}>Remove Attendance</Text>
            </TouchableOpacity>
          )}

          {canEdit && (
            <View style={styles.manageButtons}>
              <TouchableOpacity
                style={styles.editEventButton}
                onPress={() => openEditEventModal(event)}
              >
                <Ionicons name="pencil" size={18} color="#2c6f57" />
                <Text style={styles.editEventButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteEventButton}
                onPress={() => deleteEvent(event.id, event.title)}
              >
                <Ionicons name="trash" size={18} color="#f44336" />
                <Text style={styles.deleteEventButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render analytics dashboard
  const renderAnalyticsDashboard = () => {
    const analytics = getEventAnalytics();
    
    if (!analytics || myEvents.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="bar-chart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No Analytics Available</Text>
          <Text style={styles.emptySubtext}>
            Create your first event to start tracking analytics
          </Text>
          <TouchableOpacity
            style={styles.createFirstEventButton}
            onPress={openCreateEventModal}
          >
            <Ionicons name="add-circle" size={20} color="#2c6f57" />
            <Text style={styles.createFirstEventText}>Create Your First Event</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.analyticsContainer}>
        {/* Overview Cards */}
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsCardHeader}>
              <Ionicons name="calendar" size={24} color="#2c6f57" />
              <Text style={styles.analyticsCardTitle}>Total Events</Text>
            </View>
            <Text style={styles.analyticsCardValue}>{analytics.totalEvents}</Text>
            <Text style={styles.analyticsCardSubtext}>
              {analytics.upcomingEventsCount} upcoming, {analytics.pastEventsCount} completed
            </Text>
          </View>

          <View style={styles.analyticsCard}>
            <View style={styles.analyticsCardHeader}>
              <Ionicons name="people" size={24} color="#4CAF50" />
              <Text style={styles.analyticsCardTitle}>Total Attendance</Text>
            </View>
            <Text style={styles.analyticsCardValue}>{analytics.totalAttendance}</Text>
            <Text style={styles.analyticsCardSubtext}>
              Avg {analytics.avgAttendancePerEvent} per event
            </Text>
          </View>

          <View style={styles.analyticsCard}>
            <View style={styles.analyticsCardHeader}>
              <Ionicons name="heart" size={24} color="#8A2BE2" />
              <Text style={styles.analyticsCardTitle}>Total Interest</Text>
            </View>
            <Text style={styles.analyticsCardValue}>{analytics.totalInterested}</Text>
            <Text style={styles.analyticsCardSubtext}>
              Avg {analytics.avgInterestPerEvent} per event
            </Text>
          </View>

          <View style={styles.analyticsCard}>
            <View style={styles.analyticsCardHeader}>
              <Ionicons name="trophy" size={24} color="#FF9800" />
              <Text style={styles.analyticsCardTitle}>Most Popular</Text>
            </View>
            <Text style={styles.analyticsCardValue}>
              {analytics.mostSuccessfulEvent?.attended + analytics.mostSuccessfulEvent?.interested || 0}
            </Text>
            <Text style={styles.analyticsCardSubtext}>
              {analytics.mostSuccessfulEvent?.eventTitle || 'No events yet'}
            </Text>
          </View>
        </View>

        {/* Event Performance List */}
        <View style={styles.analyticsSection}>
          <Text style={styles.analyticsSectionTitle}>Event Performance</Text>
          {analytics.attendanceByEvent.map((event, index) => (
            <View key={event.eventId} style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Text style={styles.performanceTitle} numberOfLines={2}>
                  {event.eventTitle}
                </Text>
                <Text style={styles.performanceDate}>
                  {new Date(event.date?.toDate ? event.date.toDate() : event.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.performanceStats}>
                {event.isPast ? (
                  <View style={styles.performanceStat}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.performanceStatText}>
                      {event.attended} attended
                    </Text>
                  </View>
                ) : (
                  <View style={styles.performanceStat}>
                    <Ionicons name="heart" size={16} color="#8A2BE2" />
                    <Text style={styles.performanceStatText}>
                      {event.interested} interested
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.analyticsSection}>
          <Text style={styles.analyticsSectionTitle}>💡 Tips to Improve</Text>
          <View style={styles.tipsContainer}>
            <Text style={styles.tipText}>
              • Host regular events to build a loyal following
            </Text>
            <Text style={styles.tipText}>
              • Share event details early to increase interest
            </Text>
            <Text style={styles.tipText}>
              • Engage with attendees after events for feedback
            </Text>
            <Text style={styles.tipText}>
              • Coordinate with popular food trucks to boost attendance
            </Text>
          </View>
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
        {canManageEvents() && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={openCreateEventModal}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {getFilterTabs().map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.activeFilterTab
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
              style={[
                styles.filterTabText,
                selectedFilter === filter && styles.activeFilterTabText
              ]}
            >
              {getFilterDisplayName(filter)}
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
                : selectedFilter === 'my-events'
                ? 'No events created yet'
                : `No ${selectedFilter} events found`}
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'attended'
                ? 'Mark events as attended to track your event history'
                : selectedFilter === 'my-events'
                ? 'Create your first event to get started'
                : 'Check back later for new events'}
            </Text>
            {selectedFilter === 'my-events' && canManageEvents() && (
              <TouchableOpacity
                style={styles.createFirstEventButton}
                onPress={openCreateEventModal}
              >
                <Ionicons name="add-circle" size={20} color="#2c6f57" />
                <Text style={styles.createFirstEventText}>Create Your First Event</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          getFilteredEvents().map(renderEventCard)
        )}
      </ScrollView>

      {/* Event Management Modal */}
      {renderEventModal()}
    </View>
  );
};

const createThemedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    backgroundColor: theme.colors.background.secondary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  headerTitle: {
    color: theme.colors.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: theme.colors.accent.pink,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.neonPink,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.secondary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginHorizontal: 3,
    alignItems: 'center',
    minWidth: 0, // Allow text to shrink
  },
  activeFilterTab: {
    backgroundColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  filterTabText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
    numberOfLines: 1,
  },
  activeFilterTabText: {
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.subtle,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    backgroundColor: theme.colors.accent.blue,
    borderRadius: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.neonBlue,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
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
    color: theme.colors.accent.blue,
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
    color: theme.colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  manageButtons: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  editEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent.blue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    ...theme.shadows.neonBlue,
  },
  editEventButtonText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  deleteEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent.pink,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    ...theme.shadows.neonPink,
  },
  deleteEventButtonText: {
    fontSize: 14,
    color: '#f44336',
    marginLeft: 6,
    fontWeight: '500',
  },
  createFirstEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  createFirstEventText: {
    fontSize: 16,
    color: '#2c6f57',
    marginLeft: 8,
    fontWeight: '500',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    backgroundColor: '#2c6f57',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  modalSaveButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventTypeButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  eventTypeButtonActive: {
    backgroundColor: '#2c6f57',
    borderColor: '#2c6f57',
  },
  eventTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  eventTypeTextActive: {
    color: 'white',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusButtonActive: {
    backgroundColor: '#2c6f57',
    borderColor: '#2c6f57',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusTextActive: {
    color: 'white',
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
  attendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0E6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  attendingButtonText: {
    fontSize: 14,
    color: '#8A2BE2',
    marginLeft: 6,
    fontWeight: '500',
  },
  removeAttendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  removeAttendingButtonText: {
    fontSize: 14,
    color: '#f44336',
    marginLeft: 6,
    fontWeight: '500',
  },
  attendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0E6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  attendingText: {
    fontSize: 12,
    color: '#8A2BE2',
    marginLeft: 4,
    fontWeight: '500',
  },
  attendanceCountBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  attendanceCountText: {
    fontSize: 12,
    color: '#666',
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
  
  // Recurring Event Styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#FF6B35',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  recurrenceTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  recurrenceTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  recurrenceTypeButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  recurrenceTypeText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  recurrenceTypeTextActive: {
    color: '#fff',
  },
  weeklyDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  weeklyDayButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  weeklyDayButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  weeklyDayText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  weeklyDayTextActive: {
    color: '#fff',
  },
  monthlyTypeContainer: {
    marginTop: 8,
  },
  monthlyTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  monthlyTypeButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  monthlyTypeText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  monthlyTypeTextActive: {
    color: '#fff',
  },
  recurrenceEndContainer: {
    marginTop: 8,
  },
  recurrenceEndButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  recurrenceEndButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  recurrenceEndText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  recurrenceEndTextActive: {
    color: '#fff',
  },
  recurrenceCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurrenceCountInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
    marginHorizontal: 8,
  },
  recurrenceCountLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  // Picker Modal Styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 0,
    width: width * 0.85,
    maxHeight: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickerCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  pickerDoneText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  // Custom Time Picker Styles
  customTimePickerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  timePickerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  timePickerScrollView: {
    height: 150,
    width: '100%',
  },
  timePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
    minHeight: 40,
    justifyContent: 'center',
  },
  timePickerOptionSelected: {
    backgroundColor: '#FF6B35',
  },
  timePickerOptionText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  timePickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  timePreviewContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
  },
  timePreviewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timePreviewText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF6B35',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
    fontWeight: '500',
  },
  // Logo upload styles
  logoContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  logoActions: {
    flexDirection: 'row',
    gap: 15,
  },
  changeLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  changeLogoText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  removeLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff5f5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  removeLogoText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  logoUploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8fbff',
    marginVertical: 10,
  },
  logoUploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
  },
  logoUploadSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default EventsScreen;
