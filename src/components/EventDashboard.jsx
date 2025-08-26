import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import CreateEventForm from './CreateEventForm';
import EventSubscriptionPlans from './EventSubscriptionPlans';
import EventOrganizerMap from './EventOrganizerMap';
import '../assets/styles.css';
import '../assets/EventDashboard.css';

const EventDashboard = () => {
  console.log('🏁 EventDashboard component is rendering');
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();

  const [organizerData, setOrganizerData] = useState(null);
  const [events, setEvents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [organizerDataLoaded, setOrganizerDataLoaded] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🎯 EventDashboard: Auth state changed', {
      authLoading,
      user: user?.email,
      userRole,
      loading,
      organizerDataLoaded,
      eventsLoaded
    });
    
    // Log to help debug the loading issue
    if (authLoading) {
      console.log('⏳ Still waiting for auth to load...');
    } else if (loading) {
      console.log('⏳ Auth loaded, but component still loading...', {
        organizerDataLoaded,
        eventsLoaded
      });
    } else {
      console.log('✅ Component fully loaded!');
    }
    
    // Add window debug info
    window.eventDashboardDebug = {
      authLoading,
      user: user?.email,
      userRole,
      loading,
      organizerDataLoaded,
      eventsLoaded
    };
  }, [authLoading, user, userRole, loading, organizerDataLoaded, eventsLoaded]);

  // Fetch organizer data
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    if (userRole && userRole !== 'event-organizer') {
      navigate('/customer-dashboard');
      return;
    }

    const fetchOrganizerData = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.role !== 'event-organizer') {
            navigate('/customer-dashboard');
            return;
          }
          setOrganizerData(data);
          console.log('✅ Organizer data loaded successfully:', data);
        } else {
          console.log('❌ No organizer document found, redirecting to signup');
          navigate('/signup');
        }
      } catch (error) {
        console.error('❌ Error fetching organizer data:', error);
      } finally {
        console.log('✅ Setting organizerDataLoaded to true');
        setOrganizerDataLoaded(true);
      }
    };

    fetchOrganizerData();
  }, [user, userRole, authLoading, navigate]);

  // Fetch events
  useEffect(() => {
    if (!user) return;
    
    console.log('🎯 Setting up events query for user:', user.uid);
    let activeUnsubscribe = null;

    const fetchEvents = async () => {
      try {
        // Try the indexed query first
        const eventsQuery = query(
          collection(db, 'events'),
          where('organizerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        activeUnsubscribe = onSnapshot(eventsQuery, (snapshot) => {
          const eventsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log('✅ Events loaded successfully:', eventsData.length);
          setEvents(eventsData);
          setEventsLoaded(true);
        }, (error) => {
          console.error('Error fetching events:', error);
          
          // If index is missing, fall back to simpler query
          if (error.code === 'failed-precondition') {
            console.log('🔄 Index not ready, using fallback query...');
            // Clean up the failed subscription
            if (activeUnsubscribe) {
              activeUnsubscribe();
            }
            // Start fallback subscription
            activeUnsubscribe = fallbackEventsQuery();
          } else {
            setEventsLoaded(true);
          }
        });

      } catch (error) {
        console.error('Error setting up events query:', error);
        activeUnsubscribe = fallbackEventsQuery();
      }
    };

    const fallbackEventsQuery = () => {
      console.log('🔄 Executing fallback events query...');
      // Simple query without orderBy
      const simpleQuery = query(
        collection(db, 'events'),
        where('organizerId', '==', user.uid)
      );

      return onSnapshot(simpleQuery, (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          // Manual sorting by createdAt
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        
        console.log('✅ Events loaded via fallback query:', eventsData.length);
        setEvents(eventsData);
        setEventsLoaded(true);
      }, (error) => {
        console.error('❌ Error with fallback events query:', error);
        // Even if fallback fails, mark as loaded to prevent infinite loading
        setEventsLoaded(true);
      });
    };

    fetchEvents();
    
    return () => {
      if (activeUnsubscribe) {
        activeUnsubscribe();
      }
    };
  }, [user]);

  // Update loading state
  useEffect(() => {
    console.log('🔄 Loading state check:', { organizerDataLoaded, eventsLoaded });
    if (organizerDataLoaded && eventsLoaded) {
      console.log('✅ Both data sources loaded, setting loading to false');
      setLoading(false);
    }
  }, [organizerDataLoaded, eventsLoaded]);

  // Timeout fallback to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!eventsLoaded) {
        console.log('⏰ Timeout: Force setting eventsLoaded to true after 10 seconds');
        setEventsLoaded(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [eventsLoaded]);

  // Fetch applications
  useEffect(() => {
    if (!user) return;

    const fetchApplications = async () => {
      try {
        // Try the indexed query first
        const applicationsQuery = query(
          collection(db, 'eventApplications'),
          where('organizerId', '==', user.uid),
          orderBy('appliedAt', 'desc')
        );

        const unsubscribe = onSnapshot(applicationsQuery, (snapshot) => {
          const applicationsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setApplications(applicationsData);
        }, (error) => {
          console.error('Error fetching applications:', error);
          
          // If index is missing, fall back to simpler query
          if (error.code === 'failed-precondition') {
            console.log('🔄 Applications index not ready, using fallback query...');
            fallbackApplicationsQuery();
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up applications query:', error);
        fallbackApplicationsQuery();
      }
    };

    const fallbackApplicationsQuery = () => {
      console.log('🔄 Executing fallback applications query...');
      // Simple query without orderBy
      const simpleQuery = query(
        collection(db, 'eventApplications'),
        where('organizerId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(simpleQuery, (snapshot) => {
        const applicationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          // Manual sorting by appliedAt
          const aTime = a.appliedAt?.toDate?.() || new Date(0);
          const bTime = b.appliedAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        
        console.log('✅ Applications loaded via fallback query:', applicationsData.length);
        setApplications(applicationsData);
      }, (error) => {
        console.error('❌ Error with fallback applications query:', error);
      });

      return () => unsubscribe();
    };

    fetchApplications();
  }, [user]);

  const getEventStatusColor = (status) => {
    switch (status) {
      case 'draft': return '#6c757d';
      case 'published': return '#007bff';
      case 'active': return '#28a745';
      case 'completed': return '#6f42c1';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getApplicationStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      case 'waitlisted': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="dashboard-wrapper">
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#f8f9fa'
        }}>
          <div className="loading-spinner" style={{ marginBottom: '20px' }}></div>
          <h2>Loading your event dashboard...</h2>
          <p style={{ color: '#666', marginTop: '10px' }}>Please wait while we load your information.</p>
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: '#e3f2fd', 
            border: '1px solid #2196f3', 
            borderRadius: '8px',
            fontSize: '14px',
            maxWidth: '500px'
          }}>
            <p><strong>Debug Info:</strong></p>
            <p>Auth Loading: {authLoading ? 'YES' : 'NO'}</p>
            <p>User: {user?.email || 'None'}</p>
            <p>Role: {userRole || 'None'}</p>
            <p>Organizer Data: {organizerDataLoaded ? 'Loaded' : 'Loading...'}</p>
            <p>Events Data: {eventsLoaded ? 'Loaded' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Debug mode for development
  if (process.env.NODE_ENV === 'development' && !user) {
    return (
      <div className="dashboard-wrapper">
        <div className="event-dashboard-container">
          <div style={{ padding: '20px', background: '#ffebee', border: '1px solid #f44336', borderRadius: '5px', margin: '20px' }}>
            <h2>🚧 Debug Mode - No User Logged In</h2>
            <p>You need to be logged in as an event organizer to access this dashboard.</p>
            <p>Auth State: Loading={authLoading ? 'true' : 'false'}, User={user?.email || 'none'}, Role={userRole || 'none'}</p>
            <a href="/signup?role=event-organizer" style={{ color: '#1976d2' }}>
              → Sign up as Event Organizer
            </a>
            <br />
            <a href="/login" style={{ color: '#1976d2' }}>
              → Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      
      <div className="event-dashboard-container">
        <div className="dashboard-header">
          <h1>Event Organizer Dashboard</h1>
          {organizerData && (
            <div className="organizer-info">
              <h2>Welcome, {organizerData.contactPerson || organizerData.username}!</h2>
              <p>{organizerData.organizationName} - {organizerData.organizationType}</p>
            </div>
          )}
        </div>

        <div className="dashboard-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            My Events ({events.length})
          </button>
          <button 
            className={`tab ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            Applications ({applications.filter(app => app.status === 'pending').length})
          </button>
          <button 
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Event
          </button>
          <button 
            className={`tab ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            💳 Subscription
          </button>
        </div>

        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="overview-section">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Events</h3>
                  <div className="stat-number">{events.length}</div>
                </div>
                <div className="stat-card">
                  <h3>Active Events</h3>
                  <div className="stat-number">
                    {events.filter(event => event.status === 'active').length}
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Pending Applications</h3>
                  <div className="stat-number">
                    {applications.filter(app => app.status === 'pending').length}
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Total Applications</h3>
                  <div className="stat-number">{applications.length}</div>
                </div>
              </div>
              
              {/* Real-time Event & Truck Activity Map */}
              <EventOrganizerMap organizerData={organizerData} />
            </div>
          )}

          {activeTab === 'events' && (
            <div className="events-section">
              <div className="section-header">
                <h2>My Events</h2>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveTab('create')}
                >
                  Create New Event
                </button>
              </div>
              
              {events.length === 0 ? (
                <div className="empty-state">
                  <h3>No Events Yet</h3>
                  <p>Start by creating your first event to bring food trucks to your location!</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setActiveTab('create')}
                  >
                    Create Your First Event
                  </button>
                </div>
              ) : (
                <div className="events-grid">
                  {events.map(event => (
                    <div key={event.id} className="event-card">
                      <div className="event-header">
                        <h3>{event.title}</h3>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getEventStatusColor(event.status) }}
                        >
                          {event.status}
                        </span>
                      </div>
                      <div className="event-details">
                        <p><strong>Date:</strong> {event.date}</p>
                        <p><strong>Location:</strong> {event.location}</p>
                        <p><strong>Vendors:</strong> {event.vendors || 0} applied</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="applications-section">
              <h2>Vendor Applications</h2>
              
              {applications.length === 0 ? (
                <div className="empty-state">
                  <h3>No Applications Yet</h3>
                  <p>Once you create events, food truck vendors will be able to apply to participate.</p>
                </div>
              ) : (
                <div className="applications-list">
                  {applications.map(application => (
                    <div key={application.id} className="application-card">
                      <div className="application-header">
                        <h3>{application.vendorName}</h3>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getApplicationStatusColor(application.status) }}
                        >
                          {application.status}
                        </span>
                      </div>
                      <div className="application-details">
                        <p><strong>Event:</strong> {application.eventTitle}</p>
                        <p><strong>Applied:</strong> {new Date(application.appliedAt.toDate()).toLocaleDateString()}</p>
                        <p><strong>Cuisine:</strong> {application.cuisineType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="create-section">
              <h2>Create New Event</h2>
              <CreateEventForm 
                onEventCreated={() => console.log('Event created')}
                organizerData={organizerData}
              />
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="subscription-section">
              <h2>Subscription Management</h2>
              <EventSubscriptionPlans 
                currentPlan={organizerData?.plan}
                userRole={userRole}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default EventDashboard;
