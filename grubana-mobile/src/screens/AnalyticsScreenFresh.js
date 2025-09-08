import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/AuthContext';
import {
  collection, query, where, onSnapshot, Timestamp, doc, getDoc, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { differenceInMinutes } from 'date-fns';
import { getCuisineDisplayName, normalizeCuisineValue } from '../constants/cuisineTypes';

const { width } = Dimensions.get('window');

// Utility Functions
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export default function AnalyticsScreen() {
  console.log('🚀🚀🚀 BRAND NEW ANALYTICS SCREEN - COMPLETELY REWRITTEN 🚀🚀🚀');
  
  const { user, userData, userRole } = useAuth();
  
  console.log('🔍 Auth Status:', { 
    hasUser: !!user, 
    hasUserData: !!userData, 
    userRole,
    userId: userData?.uid 
  });
  
  // State for analytics data
  const [pingStats, setPingStats] = useState({
    last7Days: 0,
    last30Days: 0,
    cuisineMatchCount: 0,
  });
  
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    last30DaysOrders: 0,
    last30DaysRevenue: 0,
    last7DaysOrders: 0,
    last7DaysRevenue: 0,
    completedOrders: 0,
    planRequired: false,
    indexBuilding: false
  });

  const [eventStats, setEventStats] = useState({
    totalAttended: 0,
    last30Days: 0,
    last7Days: 0,
  });

  const [favoritesCount, setFavoritesCount] = useState(0);

  // Event organizer analytics state
  const [eventOrganizerStats, setEventOrganizerStats] = useState({
    totalEvents: 0,
    upcomingEventsCount: 0,
    pastEventsCount: 0,
    totalAttendance: 0,
    totalInterested: 0,
    avgAttendancePerEvent: 0,
    avgInterestPerEvent: 0,
    mostSuccessfulEvent: null,
    attendanceByEvent: [],
    // Food truck signup analytics
    totalTruckApplications: 0,
    approvedTruckSignups: 0,
    pendingApplications: 0,
    rejectedApplications: 0,
    approvalRate: 0,
    applicationsByEvent: []
  });

  const [myEvents, setMyEvents] = useState([]);
  const [eventAttendanceCounts, setEventAttendanceCounts] = useState({});
  const [eventApplicationCounts, setEventApplicationCounts] = useState({});

  // Real ping analytics
  useEffect(() => {
    if (!userData?.uid || userRole !== 'owner') {
      console.log('🚫 Skipping ping analytics - not owner');
      return;
    }

    console.log('🎯 Setting up REAL ping analytics for:', userData.uid);

    let unsubscribeUser = null;
    let unsubscribePings = null;

    const userDocRef = doc(db, 'users', userData.uid);

    unsubscribeUser = onSnapshot(userDocRef, async (ownerDoc) => {
      if (!ownerDoc.exists()) {
        console.log('❌ User document does not exist');
        return;
      }
      
      const userPlan = ownerDoc.data().plan || 'basic';
      console.log('📋 User plan:', userPlan);
      
      if (userPlan !== 'all-access') {
        console.log('🚫 User does not have all-access plan');
        return;
      }

      // Get truck location
      const truckDoc = await getDoc(doc(db, 'truckLocations', userData.uid));
      if (!truckDoc.exists()) {
        console.log('❌ Truck location not found');
        return;
      }

      const truckData = truckDoc.data();
      console.log('🚛 Truck location:', { lat: truckData.lat, lng: truckData.lng });
      
      if (!truckData.lat || !truckData.lng) {
        console.log('❌ Truck coordinates missing');
        return;
      }

      // Get time ranges
      const nowMs = Date.now();
      const sevenDaysAgo = Timestamp.fromDate(new Date(nowMs - 7 * 24 * 60 * 60 * 1000));
      const thirtyDaysAgo = Timestamp.fromDate(new Date(nowMs - 30 * 24 * 60 * 60 * 1000));

      // Query pings
      const q = query(collection(db, 'pings'), where('timestamp', '>=', thirtyDaysAgo));
      
      unsubscribePings = onSnapshot(q, (snapshot) => {
        console.log('📊 Received ping snapshot, total pings:', snapshot.docs.length);
        
        const pings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const last7 = pings.filter(p => p.timestamp.seconds >= sevenDaysAgo.seconds);
        console.log('📅 Pings in last 7 days:', last7.length);

        // Distance filtering
        const getLoc = (p) => p.location || (p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null);

        const nearbyPings7 = last7.filter(p => {
          const loc = getLoc(p);
          if (!loc) return false;
          const distance = getDistanceFromLatLonInKm(truckData.lat, truckData.lng, loc.lat, loc.lng);
          return distance <= 5;
        });

        const nearbyPings30 = pings.filter(p => {
          const loc = getLoc(p);
          if (!loc) return false;
          const distance = getDistanceFromLatLonInKm(truckData.lat, truckData.lng, loc.lat, loc.lng);
          return distance <= 80;
        });

        console.log('📍 Nearby pings (≤5km) in last 7 days:', nearbyPings7.length);
        console.log('📍 Nearby pings (≤80km) in last 30 days:', nearbyPings30.length);

        setPingStats({
          last7Days: nearbyPings7.length,
          last30Days: nearbyPings30.length,
          cuisineMatchCount: 0,
        });
      });
    });

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribePings) unsubscribePings();
    };
  }, [userData?.uid, userRole]);

  // Events analytics
  useEffect(() => {
    if (!userData?.uid) {
      console.log('🚫 Skipping events analytics - no user data');
      return;
    }

    console.log('🎪 Setting up events analytics for:', userData.uid);

    const eventsQuery = query(
      collection(db, 'eventAttendance'),
      where('userId', '==', userData.uid)
    );

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const attendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('🎭 Found event attendance records:', attendance.length);

      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const last7DaysAttendance = attendance.filter(record => {
        const eventDate = record.eventDate?.toDate?.() || new Date(record.eventDate?.seconds * 1000);
        return eventDate >= last7Days;
      });

      const last30DaysAttendance = attendance.filter(record => {
        const eventDate = record.eventDate?.toDate?.() || new Date(record.eventDate?.seconds * 1000);
        return eventDate >= last30Days;
      });

      setEventStats({
        totalAttended: attendance.length,
        last30Days: last30DaysAttendance.length,
        last7Days: last7DaysAttendance.length,
      });
    });

    return unsubscribeEvents;
  }, [userData?.uid]);

  // Favorites count
  useEffect(() => {
    if (!userData?.uid) return;

    console.log('⭐ Setting up favorites count for:', userData.uid);

    const favoritesQuery = query(
      collection(db, 'favorites'),
      where('truckId', '==', userData.uid)
    );

    const unsubscribeFavorites = onSnapshot(favoritesQuery, (snapshot) => {
      console.log('⭐ Found favorites:', snapshot.size);
      setFavoritesCount(snapshot.size);
    });

    return unsubscribeFavorites;
  }, [userData?.uid]);

  // Orders analytics - All-Access Plan Required
  useEffect(() => {
    if (!userData?.uid || userRole !== 'owner') {
      console.log('🚫 Skipping orders analytics - not owner');
      return;
    }

    console.log('💰 Setting up orders analytics for truck:', userData.uid);
    console.log('📋 User plan:', userData.plan);
    console.log('🔒 Plan restriction check:', {
      currentPlan: userData.plan,
      requiredPlan: 'all-access',
      hasAccess: userData.plan === 'all-access'
    });

    // Check if user has All-Access plan
    if (userData.plan !== 'all-access') {
      console.log('🚫 Orders analytics requires All-Access plan, current plan:', userData.plan);
      console.log('🔒 Setting planRequired = true for orders analytics');
      setOrderStats({
        totalOrders: 0,
        totalRevenue: 0,
        last30DaysOrders: 0,
        last30DaysRevenue: 0,
        last7DaysOrders: 0,
        last7DaysRevenue: 0,
        completedOrders: 0,
        planRequired: true,
        indexBuilding: false
      });
      return;
    }

    console.log('✅ User has All-Access plan, enabling orders analytics');

    // Query orders for this truck (using simple query first, then filter by time)
    const ordersQuery = query(
      collection(db, 'orders'),
      where('truckId', '==', userData.uid)
    );

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      console.log('📊 Orders analytics: Found', snapshot.size, 'orders');
      
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('📊 Sample order data:', orders[0] || 'No orders');

      // Calculate time ranges
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Filter orders by time periods
      const last7DaysOrders = orders.filter(order => {
        const orderDate = getOrderDate(order);
        return orderDate >= sevenDaysAgo;
      });

      const last30DaysOrders = orders.filter(order => {
        const orderDate = getOrderDate(order);
        return orderDate >= thirtyDaysAgo;
      });

      // Count completed orders
      const completedOrders = orders.filter(order => 
        order.status === 'completed' || order.status === 'picked_up'
      );

      // Calculate revenues
      const totalRevenue = calculateRevenue(orders);
      const last7DaysRevenue = calculateRevenue(last7DaysOrders);
      const last30DaysRevenue = calculateRevenue(last30DaysOrders);

      console.log('📊 Orders Analytics Results:', {
        totalOrders: orders.length,
        totalRevenue: totalRevenue.toFixed(2),
        last7DaysOrders: last7DaysOrders.length,
        last7DaysRevenue: last7DaysRevenue.toFixed(2),
        last30DaysOrders: last30DaysOrders.length,
        last30DaysRevenue: last30DaysRevenue.toFixed(2),
        completedOrders: completedOrders.length
      });

      setOrderStats({
        totalOrders: orders.length,
        totalRevenue: totalRevenue,
        last30DaysOrders: last30DaysOrders.length,
        last30DaysRevenue: last30DaysRevenue,
        last7DaysOrders: last7DaysOrders.length,
        last7DaysRevenue: last7DaysRevenue,
        completedOrders: completedOrders.length,
        planRequired: false,
        indexBuilding: false
      });
    }, (error) => {
      console.error('❌ Error fetching orders:', error);
      if (error.code === 'failed-precondition') {
        console.log('📊 Orders index is building, will try again...');
        setOrderStats({
          totalOrders: 0,
          totalRevenue: 0,
          last30DaysOrders: 0,
          last30DaysRevenue: 0,
          last7DaysOrders: 0,
          last7DaysRevenue: 0,
          completedOrders: 0,
          planRequired: false,
          indexBuilding: true
        });
      }
    });

    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [userData?.uid, userData?.plan, userRole]);

  // Helper function to extract order date
  const getOrderDate = (order) => {
    // Try different date fields in order of preference
    if (order.timestamp?.toDate) {
      return order.timestamp.toDate();
    } else if (order.timestamp?.seconds) {
      return new Date(order.timestamp.seconds * 1000);
    } else if (typeof order.timestamp === 'string') {
      return new Date(order.timestamp);
    } else if (order.createdAt?.toDate) {
      return order.createdAt.toDate();
    } else if (order.createdAt?.seconds) {
      return new Date(order.createdAt.seconds * 1000);
    } else if (typeof order.createdAt === 'string') {
      return new Date(order.createdAt);
    } else if (order.orderDate) {
      return new Date(order.orderDate);
    } else {
      console.warn('No valid date field found for order:', order.id, {
        timestamp: order.timestamp,
        createdAt: order.createdAt,
        orderDate: order.orderDate
      });
      return new Date();
    }
  };

  // Helper function to calculate revenue
  const calculateRevenue = (orderList) => {
    return orderList.reduce((sum, order) => {
      let amount = 0;
      
      // Try different amount fields in order of preference
      if (typeof order.totalAmount === 'number') {
        amount = order.totalAmount;
      } else if (typeof order.totalAmount === 'string') {
        amount = parseFloat(order.totalAmount) || 0;
      } else if (typeof order.vendorReceives === 'number') {
        amount = order.vendorReceives;
      } else if (typeof order.subtotal === 'number') {
        amount = order.subtotal;
      } else if (order.total) {
        amount = typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0;
      }
      
      // Handle case where amounts might be in cents (if > 1000, likely in cents)
      if (amount > 1000 && order.totalAmount) {
        amount = amount / 100;
      }
      
      console.log('📊 Order revenue calculation:', {
        orderId: order.id?.substring(0, 8) || 'unknown',
        totalAmount: order.totalAmount,
        vendorReceives: order.vendorReceives,
        subtotal: order.subtotal,
        calculatedAmount: amount
      });
      
      return sum + amount;
    }, 0);
  };

  // Event organizer analytics
  useEffect(() => {
    if (!userData?.uid || userRole !== 'event-organizer') {
      console.log('🚫 Skipping event organizer analytics - not event organizer');
      return;
    }

    console.log('🎪 Setting up event organizer analytics for:', userData.uid);

    // Fetch events created by this organizer
    const eventsQuery = query(
      collection(db, 'events'),
      where('organizerId', '==', userData.uid)
    );

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('🎪 Found events created by organizer:', events.length);
      setMyEvents(events);
    });

    return unsubscribeEvents;
  }, [userData?.uid, userRole]);

  // Event attendance analytics for event organizers
  useEffect(() => {
    if (!userData?.uid || userRole !== 'event-organizer' || myEvents.length === 0) {
      return;
    }

    console.log('🎪 Setting up attendance analytics for', myEvents.length, 'events');
    console.log('🎪 My event IDs:', myEvents.map(e => e.id));

    const myEventIds = myEvents.map(event => event.id);
    
    // Query both attended and interested data (using same approach as EventsScreen)
    const attendedQuery = query(collection(db, 'eventAttendance'));
    const attendingQuery = query(collection(db, 'eventInterest'));

    const unsubscribeAttended = onSnapshot(attendedQuery, (attendedSnapshot) => {
      console.log('📊 Total eventAttendance records found:', attendedSnapshot.size);
      
      const attendedCounts = {};
      attendedSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const eventId = data.eventId;
        if (myEventIds.includes(eventId)) {
          console.log('📊 Found attended record for my event:', eventId, data);
          if (!attendedCounts[eventId]) {
            attendedCounts[eventId] = { attended: 0, attending: 0 };
          }
          attendedCounts[eventId].attended++;
        }
      });

      const unsubscribeAttending = onSnapshot(attendingQuery, (attendingSnapshot) => {
        console.log('📊 Total eventInterest records found:', attendingSnapshot.size);
        
        attendingSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const eventId = data.eventId;
          if (myEventIds.includes(eventId)) {
            console.log('📊 Found interested record for my event:', eventId, data);
            if (!attendedCounts[eventId]) {
              attendedCounts[eventId] = { attended: 0, attending: 0 };
            }
            attendedCounts[eventId].attending++;
          }
        });

        // Initialize counts for events with no attendance records
        myEventIds.forEach(eventId => {
          if (!attendedCounts[eventId]) {
            attendedCounts[eventId] = { attended: 0, attending: 0 };
          }
        });

        console.log('📊 Final attendance counts from both collections:', attendedCounts);
        setEventAttendanceCounts(attendedCounts);

        // Calculate overall statistics
        calculateEventOrganizerStats(myEvents, attendedCounts, eventApplicationCounts);
      });

      return () => {
        unsubscribeAttending();
      };
    });

    return () => {
      unsubscribeAttended();
    };
  }, [userData?.uid, userRole, myEvents]);

  // Food truck applications analytics for event organizers
  useEffect(() => {
    if (!userData?.uid || userRole !== 'event-organizer' || myEvents.length === 0) {
      return;
    }

    console.log('🚛 Setting up food truck applications analytics for', myEvents.length, 'events');
    console.log('🚛 My event IDs for applications:', myEvents.map(e => e.id));

    const myEventIds = myEvents.map(event => event.id);
    
    // Query food truck applications for events organized by this user
    const applicationsQuery = query(
      collection(db, 'eventApplications'),
      where('organizerId', '==', userData.uid)
    );

    const unsubscribeApplications = onSnapshot(applicationsQuery, (snapshot) => {
      console.log('🚛 Total eventApplications records found:', snapshot.size);
      
      // All applications should be for our events since we filtered by organizerId
      const myEventApplications = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('🚛 Found application for my event:', data.eventId, data);
        myEventApplications.push({ id: doc.id, ...data });
      });

      console.log('🚛 Found applications for my events:', myEventApplications.length);

      // Calculate application counts per event
      const applicationCounts = {};
      myEventIds.forEach(eventId => {
        const eventApplications = myEventApplications.filter(app => app.eventId === eventId);
        console.log(`🚛 Event ${eventId} application records:`, eventApplications.length);
        
        const totalApps = eventApplications.length;
        const approvedApps = eventApplications.filter(app => app.status === 'approved').length;
        const pendingApps = eventApplications.filter(app => app.status === 'pending').length;
        const rejectedApps = eventApplications.filter(app => app.status === 'rejected').length;
        
        console.log(`🚛 Event ${eventId} application stats: ${totalApps} total, ${approvedApps} approved, ${pendingApps} pending, ${rejectedApps} rejected`);
        
        applicationCounts[eventId] = {
          total: totalApps,
          approved: approvedApps,
          pending: pendingApps,
          rejected: rejectedApps,
          applications: eventApplications
        };
      });

      console.log('🚛 Final application counts:', applicationCounts);
      setEventApplicationCounts(applicationCounts);

      // Recalculate overall statistics with truck applications
      calculateEventOrganizerStats(myEvents, eventAttendanceCounts, applicationCounts);
    });

    return unsubscribeApplications;
  }, [userData?.uid, userRole, myEvents, eventAttendanceCounts]);

  // Helper function to check if event is past
  const isEventPast = (eventDate) => {
    const now = new Date();
    const date = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);
    return date < now;
  };

  // Calculate event organizer statistics
  const calculateEventOrganizerStats = (events, attendanceCounts, applicationCounts = {}) => {
    console.log('📊 calculateEventOrganizerStats called with:', events.length, 'events');
    console.log('📊 Attendance counts:', attendanceCounts);
    console.log('🚛 Application counts:', applicationCounts);
    
    const totalEvents = events.length;
    const upcomingEvents = events.filter(event => !isEventPast(event.startDate || event.date));
    const pastEvents = events.filter(event => isEventPast(event.startDate || event.date));

    let totalAttendance = 0;
    let totalInterested = 0;
    let totalTruckApplications = 0;
    let approvedTruckSignups = 0;
    let pendingApplications = 0;
    let rejectedApplications = 0;
    
    const attendanceByEvent = [];
    const applicationsByEvent = [];

    events.forEach(event => {
      const eventCounts = attendanceCounts[event.id] || { attended: 0, attending: 0 };
      const appCounts = applicationCounts[event.id] || { total: 0, approved: 0, pending: 0, rejected: 0, applications: [] };
      const isPast = isEventPast(event.startDate || event.date);
      
      console.log(`📊 Processing event ${event.id} (${event.title}): isPast=${isPast}, counts=`, eventCounts, 'apps=', appCounts);
      
      if (isPast) {
        totalAttendance += eventCounts.attended;
      } else {
        totalInterested += eventCounts.attending;
      }

      // Add truck application totals
      totalTruckApplications += appCounts.total;
      approvedTruckSignups += appCounts.approved;
      pendingApplications += appCounts.pending;
      rejectedApplications += appCounts.rejected;

      attendanceByEvent.push({
        eventId: event.id,
        eventTitle: event.title || event.eventName,
        date: event.startDate || event.date,
        attended: eventCounts.attended,
        interested: eventCounts.attending,
        isPast: isPast
      });

      applicationsByEvent.push({
        eventId: event.id,
        eventTitle: event.title || event.eventName,
        date: event.startDate || event.date,
        totalApplications: appCounts.total,
        approvedTrucks: appCounts.approved,
        pendingTrucks: appCounts.pending,
        rejectedTrucks: appCounts.rejected,
        applications: appCounts.applications,
        isPast: isPast
      });
    });

    const avgAttendancePerEvent = pastEvents.length > 0 ? (totalAttendance / pastEvents.length).toFixed(1) : 0;
    const avgInterestPerEvent = upcomingEvents.length > 0 ? (totalInterested / upcomingEvents.length).toFixed(1) : totalInterested.toFixed(1);
    const approvalRate = totalTruckApplications > 0 ? ((approvedTruckSignups / totalTruckApplications) * 100).toFixed(1) : 0;

    const mostSuccessfulEvent = attendanceByEvent.reduce((max, event) => {
      const currentTotal = event.attended + event.interested;
      const maxTotal = (max?.attended || 0) + (max?.interested || 0);
      return currentTotal > maxTotal ? event : max;
    }, attendanceByEvent[0] || null);

    const stats = {
      totalEvents,
      upcomingEventsCount: upcomingEvents.length,
      pastEventsCount: pastEvents.length,
      totalAttendance,
      totalInterested,
      avgAttendancePerEvent,
      avgInterestPerEvent,
      mostSuccessfulEvent,
      attendanceByEvent,
      // Food truck signup analytics
      totalTruckApplications,
      approvedTruckSignups,
      pendingApplications,
      rejectedApplications,
      approvalRate,
      applicationsByEvent
    };

    console.log('📊 Final calculated stats with truck applications:', stats);
    setEventOrganizerStats(stats);
  };

  // Check auth
  if (!user || !userData || (userRole !== 'owner' && userRole !== 'event-organizer')) {
    console.log('🚫 Not showing analytics - user not owner or event organizer, userRole:', userRole);
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Analytics Unavailable</Text>
          <Text style={styles.subtitle}>
            This feature is only available for food truck owners and event organizers.
          </Text>
        </ScrollView>
      </View>
    );
  }

  console.log('✅ Showing analytics for:', userRole, userData.uid);

  // Render Event Organizer Analytics
  if (userRole === 'event-organizer') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>📊 Event Analytics Dashboard</Text>
          
          {eventOrganizerStats.totalEvents === 0 ? (
            <View style={styles.section}>
              <View style={styles.placeholderContainer}>
                <Ionicons name="bar-chart-outline" size={64} color="#ccc" />
                <Text style={styles.placeholderText}>
                  📊 No events created yet! Your event analytics will appear here once you create your first event.
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Overview Cards */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📈 Overview</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="calendar" size={24} color="#2c6f57" style={styles.statIcon} />
                    <Text style={styles.statNumber}>{eventOrganizerStats.totalEvents}</Text>
                    <Text style={styles.statLabel}>Total Events</Text>
                    <Text style={styles.statSubtext}>
                      {eventOrganizerStats.upcomingEventsCount} upcoming
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ionicons name="people" size={24} color="#4CAF50" style={styles.statIcon} />
                    <Text style={styles.statNumber}>{eventOrganizerStats.totalAttendance}</Text>
                    <Text style={styles.statLabel}>Total Attendance</Text>
                    <Text style={styles.statSubtext}>
                      Avg {eventOrganizerStats.avgAttendancePerEvent} per event
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ionicons name="heart" size={24} color="#8A2BE2" style={styles.statIcon} />
                    <Text style={styles.statNumber}>{eventOrganizerStats.totalInterested}</Text>
                    <Text style={styles.statLabel}>Total Interest</Text>
                    <Text style={styles.statSubtext}>
                      Avg {eventOrganizerStats.avgInterestPerEvent} per event
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ionicons name="trophy" size={24} color="#FF9800" style={styles.statIcon} />
                    <Text style={styles.statNumber}>
                      {(eventOrganizerStats.mostSuccessfulEvent?.attended || 0) + 
                       (eventOrganizerStats.mostSuccessfulEvent?.interested || 0)}
                    </Text>
                    <Text style={styles.statLabel}>Most Popular</Text>
                    <Text style={styles.statSubtext}>
                      {eventOrganizerStats.mostSuccessfulEvent?.eventTitle?.substring(0, 15) + '...' || 'No events yet'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Food Truck Analytics */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🚛 Food Truck Signups</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="restaurant" size={24} color="#2c6f57" style={styles.statIcon} />
                    <Text style={styles.statNumber}>{eventOrganizerStats.totalTruckApplications}</Text>
                    <Text style={styles.statLabel}>Total Applications</Text>
                    <Text style={styles.statSubtext}>
                      From food trucks
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" style={styles.statIcon} />
                    <Text style={styles.statNumber}>{eventOrganizerStats.approvedTruckSignups}</Text>
                    <Text style={styles.statLabel}>Approved Trucks</Text>
                    <Text style={styles.statSubtext}>
                      Confirmed vendors
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ionicons name="time" size={24} color="#FF9800" style={styles.statIcon} />
                    <Text style={styles.statNumber}>{eventOrganizerStats.pendingApplications}</Text>
                    <Text style={styles.statLabel}>Pending Review</Text>
                    <Text style={styles.statSubtext}>
                      Awaiting approval
                    </Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ionicons name="stats-chart" size={24} color="#2196F3" style={styles.statIcon} />
                    <Text style={styles.statNumber}>{eventOrganizerStats.approvalRate}%</Text>
                    <Text style={styles.statLabel}>Approval Rate</Text>
                    <Text style={styles.statSubtext}>
                      Application success
                    </Text>
                  </View>
                </View>
              </View>

              {/* Event Performance List */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎪 Event Performance</Text>
                {eventOrganizerStats.attendanceByEvent.map((event, index) => (
                  <View key={event.eventId} style={styles.performanceCard}>
                    <View style={styles.performanceHeader}>
                      <Text style={styles.performanceTitle} numberOfLines={2}>
                        {event.eventTitle}
                      </Text>
                      <Text style={styles.performanceDate}>
                        {new Date(event.date?.toDate ? event.date.toDate() : event.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.performanceStatsContainer}>
                      {/* Attendance Row */}
                      <View style={styles.performanceStatsRow}>
                        {event.isPast ? (
                          <>
                            <View style={styles.performanceStatCompact}>
                              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                              <Text style={styles.performanceStatNumber}>{event.attended}</Text>
                              <Text style={styles.performanceStatLabel}>attended</Text>
                            </View>
                            <View style={styles.performanceStatCompact}>
                              <Ionicons name="heart" size={14} color="#8A2BE2" />
                              <Text style={styles.performanceStatNumber}>{event.interested}</Text>
                              <Text style={styles.performanceStatLabel}>interested</Text>
                            </View>
                          </>
                        ) : (
                          <View style={styles.performanceStatCompact}>
                            <Ionicons name="heart" size={14} color="#8A2BE2" />
                            <Text style={styles.performanceStatNumber}>{event.interested}</Text>
                            <Text style={styles.performanceStatLabel}>interested</Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Food Truck Applications Row */}
                      <View style={styles.performanceStatsRow}>
                        <View style={styles.performanceStatCompact}>
                          <Ionicons name="restaurant" size={14} color="#2c6f57" />
                          <Text style={styles.performanceStatNumber}>
                            {eventOrganizerStats.applicationsByEvent[event.eventId]?.total || 0}
                          </Text>
                          <Text style={styles.performanceStatLabel}>truck apps</Text>
                        </View>
                        
                        <View style={styles.performanceStatCompact}>
                          <Ionicons name="checkmark-done" size={14} color="#4CAF50" />
                          <Text style={styles.performanceStatNumber}>
                            {eventOrganizerStats.applicationsByEvent[event.eventId]?.approved || 0}
                          </Text>
                          <Text style={styles.performanceStatLabel}>approved</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Tips Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💡 Tips to Improve</Text>
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
                  <Text style={styles.tipText}>
                    • Review food truck applications promptly to secure top vendors
                  </Text>
                  <Text style={styles.tipText}>
                    • Maintain good relationships with approved trucks for future events
                  </Text>
                  <Text style={styles.tipText}>
                    • Consider vendor diversity to appeal to different tastes
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>📊 Analytics Dashboard</Text>
        
        {/* Ping Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Ping Analytics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pingStats.last7Days}</Text>
              <Text style={styles.statLabel}>Pings (7 days)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pingStats.last30Days}</Text>
              <Text style={styles.statLabel}>Pings (30 days)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{favoritesCount}</Text>
              <Text style={styles.statLabel}>Customer Favorites</Text>
            </View>
          </View>
        </View>

        {/* Events Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎪 Events Analytics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{eventStats.totalAttended}</Text>
              <Text style={styles.statLabel}>Total Events</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{eventStats.last30Days}</Text>
              <Text style={styles.statLabel}>Events (30 days)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{eventStats.last7Days}</Text>
              <Text style={styles.statLabel}>Events (7 days)</Text>
            </View>
          </View>
        </View>

        {/* Orders Analytics - All-Access Feature */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Orders & Revenue Analytics</Text>
          
          {orderStats.planRequired ? (
            <View style={styles.upgradePrompt}>
              <Ionicons name="lock-closed" size={48} color="#ff6b6b" style={styles.lockIcon} />
              <Text style={styles.upgradeTitle}>🚀 All-Access Feature</Text>
              <Text style={styles.upgradeText}>
                Orders & Revenue Analytics is available exclusively for All-Access subscribers.
              </Text>
              <Text style={styles.currentPlanText}>
                Current Plan: {userData?.plan?.charAt(0).toUpperCase() + userData?.plan?.slice(1) || 'Basic'}
              </Text>
              <Text style={styles.upgradeFeatures}>
                Upgrade to All-Access to unlock:{'\n'}
                • Real-time order tracking{'\n'}
                • Revenue analytics with time periods{'\n'}
                • Average order value calculations{'\n'}
                • Order completion rates{'\n'}
                • Historical performance trends{'\n'}
                • Advanced customer insights
              </Text>
              <TouchableOpacity style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonText}>Upgrade to All-Access</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : orderStats.indexBuilding ? (
            <View style={styles.upgradePrompt}>
              <Ionicons name="hourglass" size={48} color="#ff9800" style={styles.lockIcon} />
              <Text style={styles.upgradeTitle}>⏳ Setting Up Analytics</Text>
              <Text style={styles.upgradeText}>
                We're building the database indexes needed for your order analytics. This process usually takes 5-10 minutes.
              </Text>
              <Text style={styles.upgradeFeatures}>
                Your analytics will automatically appear once indexing is complete.{'\n'}
                • Real-time order tracking{'\n'}
                • Revenue analytics{'\n'}
                • Performance metrics
              </Text>
            </View>
          ) : orderStats.totalOrders > 0 ? (
            <>
              {/* Overall Stats */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="receipt" size={24} color="#2c6f57" style={styles.statIcon} />
                  <Text style={styles.statNumber}>{orderStats.totalOrders}</Text>
                  <Text style={styles.statLabel}>Total Orders</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="card" size={24} color="#4CAF50" style={styles.statIcon} />
                  <Text style={styles.statNumber}>${orderStats.totalRevenue.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Total Revenue</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="checkmark-circle" size={24} color="#2c6f57" style={styles.statIcon} />
                  <Text style={styles.statNumber}>{orderStats.completedOrders || 0}</Text>
                  <Text style={styles.statLabel}>Completed Orders</Text>
                </View>
              </View>

              {/* Time Period Stats */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="calendar" size={20} color="#FF9800" style={styles.statIcon} />
                  <Text style={styles.statNumber}>{orderStats.last30DaysOrders}</Text>
                  <Text style={styles.statLabel}>Orders (30 days)</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="trending-up" size={20} color="#2196F3" style={styles.statIcon} />
                  <Text style={styles.statNumber}>${orderStats.last30DaysRevenue.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Revenue (30 days)</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="time" size={20} color="#8A2BE2" style={styles.statIcon} />
                  <Text style={styles.statNumber}>{orderStats.last7DaysOrders}</Text>
                  <Text style={styles.statLabel}>Orders (7 days)</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="cash" size={20} color="#E91E63" style={styles.statIcon} />
                  <Text style={styles.statNumber}>${orderStats.last7DaysRevenue.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Revenue (7 days)</Text>
                </View>
              </View>

              {/* Performance Metrics */}
              {orderStats.totalOrders > 0 && (
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="calculator" size={20} color="#795548" style={styles.statIcon} />
                    <Text style={styles.statNumber}>${(orderStats.totalRevenue / orderStats.totalOrders).toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Avg Order Value</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="trophy" size={20} color="#607D8B" style={styles.statIcon} />
                    <Text style={styles.statNumber}>
                      {orderStats.totalOrders > 0 ? ((orderStats.completedOrders || 0) / orderStats.totalOrders * 100).toFixed(1) : '0.0'}%
                    </Text>
                    <Text style={styles.statLabel}>Completion Rate</Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="receipt-outline" size={64} color="#ccc" />
              <Text style={styles.placeholderText}>
                📊 No orders yet! Your order analytics will appear here once customers start placing orders.
              </Text>
              <Text style={styles.placeholderSubtext}>
                Make sure your menu is set up and customers can find your truck to start receiving orders.
              </Text>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 10,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  placeholderContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },
  statIcon: {
    marginBottom: 8,
  },
  statSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  performanceCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
    flex: 1,
    marginRight: 10,
  },
  performanceDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  performanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceStatsContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  performanceStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  performanceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  performanceStatCompact: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  performanceStatText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  performanceStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6f57',
    marginTop: 2,
  },
  performanceStatLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 1,
  },
  tipsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  upgradePrompt: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  lockIcon: {
    marginBottom: 15,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  upgradeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  currentPlanText: {
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    backgroundColor: '#fff5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  upgradeFeatures: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#2c6f57',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  placeholderContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10,
    lineHeight: 22,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
