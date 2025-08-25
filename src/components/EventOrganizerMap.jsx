import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, HeatmapLayer, Marker, InfoWindow } from '@react-google-maps/api';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import './EventOrganizerMap.css';

const LIBRARIES = ['visualization', 'places'];

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '10px',
  border: '2px solid #e0e0e0'
};

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795 // Center of USA
};

const EventOrganizerMap = ({ organizerData }) => {
  const { user } = useAuth();
  const [map, setMap] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [events, setEvents] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState(null);

  // Custom event marker icon - distinctive star burst design
  const eventMarkerIcon = {
    path: "M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2Z", // Star shape
    fillColor: '#FF6B35', // Vibrant orange
    fillOpacity: 0.9,
    strokeColor: '#FF3D00',
    strokeWeight: 3,
    scale: 2.5,
    anchor: { x: 12, y: 12 }
  };

  // Enhanced event marker with pulse effect (we'll add CSS animation)
  const getEventMarkerIcon = (eventStatus) => {
    const colors = {
      'draft': '#9E9E9E',
      'published': '#2196F3',
      'active': '#4CAF50',
      'completed': '#9C27B0',
      'cancelled': '#F44336'
    };

    return {
      path: "M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2Z",
      fillColor: colors[eventStatus] || '#FF6B35',
      fillOpacity: 0.9,
      strokeColor: '#FFFFFF',
      strokeWeight: 4,
      scale: 3,
      anchor: { x: 12, y: 12 }
    };
  };

  // Truck marker icon
  const truckMarkerIcon = {
    path: "M4,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M4,6V18H20V6H4M6,8H18V16H6V8Z",
    fillColor: '#4CAF50',
    fillOpacity: 0.8,
    strokeColor: '#2E7D32',
    strokeWeight: 2,
    scale: 1.2,
    anchor: { x: 12, y: 12 }
  };

  // Fetch real-time truck locations for heatmap
  useEffect(() => {
    const trucksQuery = query(
      collection(db, 'users'),
      where('role', '==', 'owner'),
      where('isOnline', '==', true)
    );

    const unsubscribe = onSnapshot(trucksQuery, (snapshot) => {
      const trucksData = [];
      const heatmapPoints = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.location && data.location.lat && data.location.lng) {
          trucksData.push({
            id: doc.id,
            ...data,
            position: {
              lat: data.location.lat,
              lng: data.location.lng
            }
          });

          // Add to heatmap with weight based on activity
          heatmapPoints.push({
            location: new window.google.maps.LatLng(data.location.lat, data.location.lng),
            weight: data.customerCount || 1 // Weight by customer activity
          });
        }
      });

      setTrucks(trucksData);
      setHeatmapData(heatmapPoints);
    });

    return () => unsubscribe();
  }, []);

  // Fetch organizer's events
  useEffect(() => {
    if (!user) return;

    const eventsQuery = query(
      collection(db, 'events'),
      where('organizerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(event => event.latitude && event.longitude);

      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, [user]);

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  };

  return (
    <div className="event-organizer-map">
      <div style={{ marginBottom: '15px' }}>
        <h3>🗺️ Real-Time Event & Truck Activity Map</h3>
        <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#666', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', background: 'linear-gradient(45deg, #FF6B35, #FF3D00)', borderRadius: '50%' }}></div>
            <span>Your Events</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', background: 'linear-gradient(45deg, #4CAF50, #2E7D32)', borderRadius: '50%' }}></div>
            <span>Active Food Trucks</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', background: 'linear-gradient(45deg, red, orange, yellow)', borderRadius: '50%' }}></div>
            <span>Activity Heatmap</span>
          </div>
        </div>
      </div>

      <div className="event-map-container">
        <div className="event-map-inner">
          <LoadScript
            googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
            libraries={LIBRARIES}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={events.length > 0 ? { lat: events[0].latitude, lng: events[0].longitude } : defaultCenter}
              zoom={events.length > 0 ? 12 : 4}
              options={mapOptions}
              onLoad={setMap}
            >
              {/* Heatmap Layer for truck density */}
              {heatmapData.length > 0 && (
                <HeatmapLayer
                  data={heatmapData}
                  options={{
                    radius: 50,
                    opacity: 0.6,
                    gradient: [
                      'rgba(0, 255, 255, 0)',
                      'rgba(0, 255, 255, 1)',
                      'rgba(0, 191, 255, 1)',
                      'rgba(0, 127, 255, 1)',
                      'rgba(0, 63, 255, 1)',
                      'rgba(0, 0, 255, 1)',
                      'rgba(0, 0, 223, 1)',
                      'rgba(0, 0, 191, 1)',
                      'rgba(0, 0, 159, 1)',
                      'rgba(0, 0, 127, 1)',
                      'rgba(63, 0, 91, 1)',
                      'rgba(127, 0, 63, 1)',
                      'rgba(191, 0, 31, 1)',
                      'rgba(255, 0, 0, 1)'
                    ]
                  }}
                />
              )}

              {/* Event Markers - Distinctive Star Design */}
              {events.map((event) => (
                <Marker
                  key={event.id}
                  position={{ lat: event.latitude, lng: event.longitude }}
                  icon={getEventMarkerIcon(event.status)}
                  onClick={() => setSelectedEvent(event)}
                  animation={event.status === 'active' ? window.google.maps.Animation.BOUNCE : null}
                />
              ))}

              {/* Truck Markers */}
              {trucks.map((truck) => (
                <Marker
                  key={truck.id}
                  position={truck.position}
                  icon={truckMarkerIcon}
                  onClick={() => setSelectedTruck(truck)}
                />
              ))}

              {/* Event Info Window */}
              {selectedEvent && (
                <InfoWindow
                  position={{ lat: selectedEvent.latitude, lng: selectedEvent.longitude }}
                  onCloseClick={() => setSelectedEvent(null)}
                >
                  <div style={{ maxWidth: '300px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#FF6B35' }}>🌟 {selectedEvent.title}</h4>
                    <p><strong>Date:</strong> {selectedEvent.date}</p>
                    <p><strong>Status:</strong> <span style={{ 
                      textTransform: 'capitalize',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: selectedEvent.status === 'active' ? '#4CAF50' : '#2196F3',
                      color: 'white',
                      fontSize: '12px'
                    }}>{selectedEvent.status}</span></p>
                    <p><strong>Location:</strong> {selectedEvent.location}</p>
                    {selectedEvent.description && (
                      <p><strong>Description:</strong> {selectedEvent.description.substring(0, 100)}...</p>
                    )}
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                      📍 This is your event location
                    </div>
                  </div>
                </InfoWindow>
              )}

              {/* Truck Info Window */}
              {selectedTruck && (
                <InfoWindow
                  position={selectedTruck.position}
                  onCloseClick={() => setSelectedTruck(null)}
                >
                  <div style={{ maxWidth: '250px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>🚚 {selectedTruck.businessName || selectedTruck.username}</h4>
                    <p><strong>Cuisine:</strong> {selectedTruck.cuisineType || 'Not specified'}</p>
                    <p><strong>Status:</strong> <span style={{ color: '#4CAF50' }}>● Online</span></p>
                    {selectedTruck.customerCount && (
                      <p><strong>Activity:</strong> {selectedTruck.customerCount} customers nearby</p>
                    )}
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                      🎯 Potential vendor for your events
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        </div>

        {/* Enhanced Heatmap Legend */}
        <div className="heatmap-legend">
          <h4>🔥 Activity Heatmap</h4>
          <div className="heatmap-scale">
            <div className="heatmap-color heatmap-low"></div>
            <span style={{ fontSize: '12px' }}>Low</span>
          </div>
          <div className="heatmap-scale">
            <div className="heatmap-color heatmap-medium"></div>
            <span style={{ fontSize: '12px' }}>Medium</span>
          </div>
          <div className="heatmap-scale">
            <div className="heatmap-color heatmap-high"></div>
            <span style={{ fontSize: '12px' }}>High</span>
          </div>
        </div>
      </div>

      {/* Map Legend and Stats */}
      <div className="map-stats-grid">
        <div className="map-stat-card" style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3D00)' }}>
          <h4 className="map-stat-label">🌟 Your Events</h4>
          <p className="map-stat-number">{events.length}</p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            {events.filter(e => e.status === 'active').length} active
          </p>
        </div>
        <div className="map-stat-card" style={{ background: 'linear-gradient(135deg, #4CAF50, #2E7D32)' }}>
          <h4 className="map-stat-label">🚚 Active Trucks</h4>
          <p className="map-stat-number">{trucks.length}</p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            Real-time locations
          </p>
        </div>
        <div className="map-stat-card" style={{ background: 'linear-gradient(135deg, #2196F3, #1976D2)' }}>
          <h4 className="map-stat-label">🔥 Heat Activity</h4>
          <p className="map-stat-number">{heatmapData.length}</p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            Activity points
          </p>
        </div>
        <div className="map-stat-card" style={{ background: 'linear-gradient(135deg, #9C27B0, #7B1FA2)' }}>
          <h4 className="map-stat-label">📊 Total Reach</h4>
          <p className="map-stat-number">{trucks.reduce((sum, truck) => sum + (truck.customerCount || 0), 0)}</p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            Potential customers
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventOrganizerMap;
