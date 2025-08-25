import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
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
import Navbar from './navbar';
import Footer from './footer';
import CreateEventForm from './CreateEventForm';
import '../assets/styles.css';
import '../assets/EventDashboard.css';

const EventDashboard = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  const [organizerData, setOrganizerData] = useState(null);
  const [events, setEvents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch organizer data
  useEffect(() => {
    if (!user) {
      navigate('/login');
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
        } else {
          navigate('/signup');
        }
      } catch (error) {
        console.error('Error fetching organizer data:', error);
      }
    };

    fetchOrganizerData();
  }, [user, navigate]);

  // Fetch events
  useEffect(() => {
    if (!user) return;

    const eventsQuery = query(
      collection(db, 'events'),
      where('organizerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch applications for organizer's events
  useEffect(() => {
    if (!user) return;

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
    });

    return () => unsubscribe();
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your event dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <Navbar />
      
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
                    {events.filter(event => event.status === 'active' || event.status === 'published').length}
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Pending Applications</h3>
                  <div className="stat-number">
                    {applications.filter(app => app.status === 'pending').length}
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Total Vendors</h3>
                  <div className="stat-number">
                    {applications.filter(app => app.status === 'approved').length}
                  </div>
                </div>
              </div>

              <div className="recent-activity">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {applications.slice(0, 5).map(application => (
                    <div key={application.id} className="activity-item">
                      <div className="activity-content">
                        <p>
                          <strong>{application.truckInfo?.truckName}</strong> applied to your event
                        </p>
                        <span className="activity-date">
                          {application.appliedAt?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getApplicationStatusColor(application.status) }}
                      >
                        {application.status}
                      </span>
                    </div>
                  ))}
                  {applications.length === 0 && (
                    <p className="no-activity">No recent applications</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="events-section">
              <div className="section-header">
                <h3>Your Events</h3>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveTab('create')}
                >
                  Create New Event
                </button>
              </div>
              
              <div className="events-grid">
                {events.map(event => (
                  <div key={event.id} className="event-card">
                    <div className="event-header">
                      <h4>{event.eventName}</h4>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getEventStatusColor(event.status) }}
                      >
                        {event.status}
                      </span>
                    </div>
                    <p className="event-description">{event.description}</p>
                    <div className="event-details">
                      <p><strong>Type:</strong> {event.eventType}</p>
                      <p><strong>Location:</strong> {event.location?.address}</p>
                      <p><strong>Date:</strong> {event.dates?.startDate?.toDate().toLocaleDateString()}</p>
                      <p><strong>Vendors:</strong> {event.vendorInfo?.currentVendors || 0}/{event.vendorInfo?.maxVendors || 'Unlimited'}</p>
                    </div>
                    <div className="event-actions">
                      <button className="btn btn-secondary">Edit</button>
                      <button className="btn btn-primary">View Details</button>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="no-events">
                    <h4>No Events Yet</h4>
                    <p>Create your first event to start connecting with food truck vendors!</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setActiveTab('create')}
                    >
                      Create Your First Event
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="applications-section">
              <h3>Vendor Applications</h3>
              
              <div className="applications-list">
                {applications.map(application => (
                  <div key={application.id} className="application-card">
                    <div className="application-header">
                      <div className="truck-info">
                        <h4>{application.truckInfo?.truckName}</h4>
                        <p>{application.truckInfo?.cuisine} - {application.truckInfo?.kitchenType}</p>
                      </div>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getApplicationStatusColor(application.status) }}
                      >
                        {application.status}
                      </span>
                    </div>
                    
                    <div className="application-details">
                      <p><strong>Event:</strong> {events.find(e => e.id === application.eventId)?.eventName}</p>
                      <p><strong>Applied:</strong> {application.appliedAt?.toDate().toLocaleDateString()}</p>
                      <p><strong>Owner:</strong> {application.truckInfo?.ownerName}</p>
                      {application.message && (
                        <p><strong>Message:</strong> {application.message}</p>
                      )}
                    </div>
                    
                    {application.status === 'pending' && (
                      <div className="application-actions">
                        <button className="btn btn-success">Approve</button>
                        <button className="btn btn-warning">Waitlist</button>
                        <button className="btn btn-danger">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
                {applications.length === 0 && (
                  <div className="no-applications">
                    <h4>No Applications Yet</h4>
                    <p>Publish an event to start receiving vendor applications!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="create-event-section">
              <h3>Create New Event</h3>
              <CreateEventForm organizerId={user?.uid} onEventCreated={fetchEvents} />
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default EventDashboard;
