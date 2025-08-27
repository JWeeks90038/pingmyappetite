import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { GoogleMap, HeatmapLayer, Marker, InfoWindow } from '@react-google-maps/api';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { useGoogleMaps } from './MobileGoogleMapsWrapper';
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
  const { isLoaded: mapsLoaded, loadError: mapsError } = useGoogleMaps();
  const [map, setMap] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [events, setEvents] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const selectedEventRef = useRef(null);
  const infoWindowRef = useRef(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [pingData, setPingData] = useState([]);
  const [truckNames, setTruckNames] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(4);
  const [isPlacingEvent, setIsPlacingEvent] = useState(false);
  const [tempEventMarker, setTempEventMarker] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [organizerLogo, setOrganizerLogo] = useState(null);
  const [newEventData, setNewEventData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    isRecurring: false,
    recurringPattern: 'weekly', // weekly, monthly, daily
    recurringEndDate: ''
  });
  const [lastStatusUpdate, setLastStatusUpdate] = useState(0);
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const heatmapRef = useRef(null);

  // Utility functions for recurring events
  const calculateCurrentOccurrence = (event) => {
    if (!event.isRecurring) return event;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const originalDate = new Date(event.originalDate || event.date);
    originalDate.setHours(0, 0, 0, 0);
    
    // If event hasn't started yet, return original date
    if (today < originalDate) {
      return { ...event, date: event.originalDate || event.date };
    }
    
    // Calculate the current or next occurrence
    let currentOccurrence = new Date(originalDate);
    const endDate = event.recurringEndDate ? new Date(event.recurringEndDate) : null;
    
    // Find the current or next occurrence
    while (currentOccurrence < today) {
      switch (event.recurringPattern) {
        case 'daily':
          currentOccurrence.setDate(currentOccurrence.getDate() + 1);
          break;
        case 'weekly':
          currentOccurrence.setDate(currentOccurrence.getDate() + 7);
          break;
        case 'monthly':
          currentOccurrence.setMonth(currentOccurrence.getMonth() + 1);
          break;
        default:
          return event; // Unknown pattern, return as-is
      }
      
      // Check if we've exceeded the end date
      if (endDate && currentOccurrence > endDate) {
        return null; // Event series has ended
      }
    }
    
    return {
      ...event,
      date: currentOccurrence.toISOString().split('T')[0],
      isCurrentOccurrence: true
    };
  };

  const getRecurringEventStatus = (event) => {
    if (!event.isRecurring) return event.status;
    
    const currentOccurrence = calculateCurrentOccurrence(event);
    if (!currentOccurrence) return 'completed'; // Series has ended
    
    const currentDate = currentOccurrence.date;
    const currentTime = event.time;
    const currentEndTime = event.endTime;
    
    return getInitialStatus(currentDate, currentTime, currentEndTime);
  };

  // Determine initial status based on event date/time
  const getInitialStatus = (eventDate, eventTime, eventEndTime) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (eventDate === today) {
      if (eventTime && eventEndTime) {
        if (currentTime >= eventTime && currentTime < eventEndTime) {
          return 'active';
        } else if (currentTime >= eventEndTime) {
          return 'completed';
        } else {
          return 'upcoming';
        }
      } else {
        return 'upcoming'; // Default for events without time
      }
    } else if (eventDate < today) {
      return 'completed';
    } else {
      return 'upcoming';
    }
  };

  // Filter events for display - new simplified approach for recurring events
  const visibleEvents = useMemo(() => {
    return events.map(event => {
      if (event.isRecurring) {
        // For recurring events, calculate the current occurrence and status
        const currentOccurrence = calculateCurrentOccurrence(event);
        if (!currentOccurrence) return null; // Event series has ended
        
        const currentStatus = getRecurringEventStatus(event);
        
        return {
          ...currentOccurrence,
          status: currentStatus,
          originalEvent: event // Keep reference to original event for editing/deleting
        };
      } else {
        // For non-recurring events, only show if not completed or still active today
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Hide completed events from previous days (but keep today's completed events visible)
        if (event.status === 'completed' && eventDate < today) {
          return null;
        }
        
        return event;
      }
    }).filter(Boolean); // Remove null entries
  }, [events]); // Only recalculate when events array changes

  console.log('🗺️ EventOrganizerMap: Rendering with:', { 
    user: user?.uid, 
    eventsCount: events.length, 
    trucksCount: trucks.length,
    isMapLoaded,
    mapsLoaded,
    userLocation: userLocation ? 'DETECTED' : 'NOT_DETECTED',
    mapCenter,
    mapZoom,
    mapsError: mapsError?.message,
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'SET' : 'NOT SET',
    googleMapsAvailable: !!window.google?.maps,
    visibleEventsCount: visibleEvents.length,
    // Reduced logging for performance
    totalRecurringGroups: visibleEvents.filter(e => e.isRecurringRepresentative).length
  });

  // Minimal logging to prevent excessive re-renders
  // Debug logging has been temporarily disabled to prevent InfoWindow issues

  // Geolocation functionality to center map on user's location
  useEffect(() => {
    console.log('🌍 EventOrganizerMap: Attempting to get user location...');
    
    if (!navigator.geolocation) {
      console.log('⚠️ Geolocation not supported by this browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes cache
    };

    const successCallback = (position) => {
      const { latitude, longitude } = position.coords;
      console.log('✅ User location detected:', { latitude, longitude });
      
      const newLocation = { lat: latitude, lng: longitude };
      setUserLocation(newLocation);
      setMapCenter(newLocation);
      setMapZoom(12); // Zoom in when we have user location
      
      // If map is already loaded, update its center
      if (mapRef.current) {
        console.log('🗺️ Updating map center to user location');
        mapRef.current.panTo(newLocation);
        mapRef.current.setZoom(12);
      }
    };

    const errorCallback = (error) => {
      console.log('❌ Geolocation error:', error.message);
      // Use organizer's address if available as fallback
      if (organizerData?.latitude && organizerData?.longitude) {
        console.log('🏢 Using organizer address as fallback location');
        const organizerLocation = { 
          lat: organizerData.latitude, 
          lng: organizerData.longitude 
        };
        setMapCenter(organizerLocation);
        setMapZoom(12);
        
        if (mapRef.current) {
          mapRef.current.panTo(organizerLocation);
          mapRef.current.setZoom(12);
        }
      }
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  }, [organizerData]);

  // Update map center when events are loaded
  useEffect(() => {
    if (events.length > 0 && !userLocation) {
      console.log('🎯 Using first event location as map center');
      const firstEvent = events[0];
      const eventLocation = { lat: firstEvent.latitude, lng: firstEvent.longitude };
      setMapCenter(eventLocation);
      setMapZoom(12);
      
      if (mapRef.current) {
        mapRef.current.panTo(eventLocation);
        mapRef.current.setZoom(12);
      }
    }
  }, [events, userLocation]);

  // Advanced truck icon function (from HeatMap)
  const getTruckIcon = (kitchenType, coverUrl = null) => {
    if (window.google) {
      const type = (kitchenType || 'truck').toLowerCase();
      let url = "/truck-icon.png";
      
      // Use cover photo if available, otherwise use default icons
      if (coverUrl) {
        // For cover photos, we'll create a custom HTML marker
        return { 
          type: 'custom',
          coverUrl: coverUrl,
          size: 40
        };
      } else {
        if (type === "trailer") url = "/trailer-icon.png";
        if (type === "cart") url = "/cart-icon.png";
      }
      
      return {
        url,
        scaledSize: new window.google.maps.Size(40, 40),
      };
    }
    return null;
  };

  // Event marker with 3-color system and organizer logo: Gray for draft, Yellow for active, Green for completed
  const getEventMarkerIcon = useCallback((eventStatus, logoUrl = null) => {
    if (!window.google) return null;
    
    // Log marker creation for debugging
    console.log('🌟 Creating event marker with status:', eventStatus, 'and logo:', logoUrl ? 'PROVIDED' : 'NONE');
    
    // Status-based border colors
    let borderColor = '#9E9E9E'; // Default gray for draft
    if (eventStatus === 'active' || eventStatus === 'live') {
      borderColor = '#FF6B35'; // Orange for currently active/live
    } else if (eventStatus === 'completed') {
      borderColor = '#4CAF50'; // Green for completed
    } else if (eventStatus === 'upcoming') {
      borderColor = '#2196F3'; // Blue for upcoming
    }
    
    // If we have a logo URL, return custom marker config
    if (logoUrl) {
      console.log('🎯 Returning custom marker config with logo');
      return {
        type: 'custom',
        logoUrl: logoUrl,
        borderColor: borderColor,
        size: 40 // Smaller size for just logo
      };
    }
    
    // Fallback to simple star without logo
    const starIcon = {
      path: "M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2Z", // Star shape
      fillColor: fillColor,
      fillOpacity: 0.9,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 3, // Made bigger for visibility
      anchor: { x: 12, y: 12 }
    };
    
    console.log('🎯 Returning star icon without logo');
    return starIcon;
  }, []);

  const [isClickThrottled, setIsClickThrottled] = useState(false);
  const infoWindowInstanceRef = useRef(null);

  // Cancel/Remove an existing event or recurring series
  const cancelEvent = async (eventId, eventTitle, isRecurring, recurringId) => {
    if (!eventId) {
      alert('Unable to cancel event - missing event information');
      return;
    }

    let confirmMessage;
    if (isRecurring) {
      confirmMessage = `Are you sure you want to permanently delete the recurring event "${eventTitle}"?\n\nThis will delete the entire recurring series.\n\nThis action cannot be undone.`;
    } else {
      confirmMessage = `Are you sure you want to permanently delete "${eventTitle}"?\n\nThis action cannot be undone.`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('🗑️ Cancelling event:', eventId);
      
      // Delete the event from Firestore (works for both single and recurring events now)
      await deleteDoc(doc(db, 'events', eventId));
      
      console.log('✅ Event cancelled successfully');
      alert('Event has been successfully deleted.');
      
      // Close the info window
      setSelectedEvent(null);
      
    } catch (error) {
      console.error('❌ Error cancelling event:', error);
      alert('Error cancelling event. Please try again.');
    }
  };

  // Update event status
  const updateEventStatus = async (eventId, newStatus, eventTitle) => {
    if (!eventId) {
      alert('Unable to update event - missing event ID');
      return;
    }

    try {
      console.log('🔄 Updating event status:', eventId, 'to', newStatus);
      
      // Update the event status in Firestore
      await updateDoc(doc(db, 'events', eventId), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      console.log('✅ Event status updated successfully');
      
      // Update the selected event state to reflect the change immediately
      setSelectedEvent(prev => prev ? { ...prev, status: newStatus } : null);
      
    } catch (error) {
      console.error('❌ Error updating event status:', error);
      alert('Error updating event status. Please try again.');
    }
  };

  // Create and manage native Google Maps InfoWindow
  const createNativeInfoWindow = useCallback((event) => {
    if (!window.google || !mapRef.current) return;
    
    // Close existing InfoWindow
    if (infoWindowInstanceRef.current) {
      infoWindowInstanceRef.current.close();
    }
    
    const infoWindow = new window.google.maps.InfoWindow({
      position: { lat: event.latitude, lng: event.longitude },
      zIndex: 3000, // Higher z-index to override Google Places InfoWindows
      content: `
        <div style="max-width: 320px; padding: 10px; z-index: 3000; position: relative;">
          <h4 style="margin: 0 0 10px 0; color: #FF6B35;">
            🌟 ${event.title}
            ${(event.isRecurring || event.originalEvent?.isRecurring) ? 
              `<span style="fontSize: 12px; color: #666; fontWeight: normal;">
                (Recurring ${(event.originalEvent || event).recurringPattern})
              </span>` : ''
            }
          </h4>
          
          <div style="margin-bottom: 8px;">
            <strong>📅 Date:</strong> ${new Date(event.date).toLocaleDateString()}
            ${(event.isRecurring || event.originalEvent?.isRecurring) ? 
              `<span style="fontSize: 11px; color: #888; display: block;">
                🔄 Repeats ${(event.originalEvent || event).recurringPattern}
                ${(event.originalEvent || event).recurringEndDate ? 
                  ` until ${new Date((event.originalEvent || event).recurringEndDate).toLocaleDateString()}` : 
                  ` (ongoing)`
                }
              </span>` : ''
            }
          </div>
          
          ${event.time ? `
            <div style="margin-bottom: 8px;">
              <strong>🕐 Time:</strong> ${event.time}${event.endTime ? ` - ${event.endTime}` : ''}
            </div>
          ` : ''}
          
          <div style="margin-bottom: 8px;">
            <strong>📍 Location:</strong> ${event.location}
          </div>
          
          ${event.description ? `
            <div style="margin-bottom: 12px;">
              <strong>📝 Description:</strong> ${event.description}
            </div>
          ` : ''}
          
          <div style="margin-bottom: 12px;">
            <strong>🏷️ Status:</strong> 
            <select id="event-status-${event.id}" style="margin-left: 8px; padding: 4px;">
              <option value="draft" ${event.status === 'draft' ? 'selected' : ''}>📝 Draft</option>
              <option value="upcoming" ${event.status === 'upcoming' ? 'selected' : ''}>🔵 Upcoming</option>
              <option value="active" ${event.status === 'active' ? 'selected' : ''}>🟠 Active</option>
              <option value="completed" ${event.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
            </select>
          </div>
          
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button id="delete-event-${event.id}" style="
              background: #f44336; 
              color: white; 
              border: none; 
              padding: 6px 12px; 
              border-radius: 4px; 
              cursor: pointer;
              font-size: 12px;
            ">
              🗑️ Delete Event
            </button>
            <button id="close-info-${event.id}" style="
              background: #666; 
              color: white; 
              border: none; 
              padding: 6px 12px; 
              border-radius: 4px; 
              cursor: pointer;
              font-size: 12px;
            ">
              ✖️ Close
            </button>
          </div>
        </div>
      `
    });
    
    // Add event listeners after InfoWindow opens
    infoWindow.addListener('domready', () => {
      // Status change handler
      const statusSelect = document.getElementById(`event-status-${event.id}`);
      if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
          updateEventStatus(event.id, e.target.value);
        });
      }
      
      // Delete button handler
      const deleteButton = document.getElementById(`delete-event-${event.id}`);
      if (deleteButton) {
        deleteButton.addEventListener('click', () => {
          // For recurring events, check if this is the original event or calculated occurrence
          const eventToDelete = event.originalEvent || event;
          cancelEvent(
            eventToDelete.id, 
            eventToDelete.title, 
            eventToDelete.isRecurring || false
          );
          // Clean up InfoWindow
          selectedEventRef.current = null;
          setSelectedEvent(null);
          if (infoWindowInstanceRef.current) {
            infoWindowInstanceRef.current.close();
            infoWindowInstanceRef.current = null;
          }
        });
      }
      
      // Close button handler
      const closeButton = document.getElementById(`close-info-${event.id}`);
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          // Clean up InfoWindow
          selectedEventRef.current = null;
          setSelectedEvent(null);
          if (infoWindowInstanceRef.current) {
            infoWindowInstanceRef.current.close();
            infoWindowInstanceRef.current = null;
          }
        });
      }
    });
    
    // Handle InfoWindow close (when user clicks X on InfoWindow itself)
    infoWindow.addListener('closeclick', () => {
      selectedEventRef.current = null;
      setSelectedEvent(null);
      if (infoWindowInstanceRef.current) {
        infoWindowInstanceRef.current.close();
        infoWindowInstanceRef.current = null;
      }
    });
    
    infoWindow.open(mapRef.current);
    infoWindowInstanceRef.current = infoWindow;
    
    console.log('📍 Native InfoWindow created and opened for event:', event.id);
  }, [updateEventStatus, cancelEvent]);

  // Debounced event selection to prevent rapid successive clicks
  const handleEventSelection = useCallback((event) => {
    // Throttle rapid clicks
    if (isClickThrottled) {
      console.log('🔄 Click throttled, ignoring rapid click');
      return;
    }
    
    console.log('🎭 EventOrganizerMap: Event marker clicked:', event.id);
    
    // Prevent rapid successive clicks on the same event
    if (selectedEventRef.current?.id === event.id) {
      console.log('🔄 Same event already selected, ignoring rapid click');
      return;
    }
    
    // Set throttle
    setIsClickThrottled(true);
    setTimeout(() => setIsClickThrottled(false), 300); // 300ms throttle
    
    // Use ref to prevent rapid state changes
    selectedEventRef.current = event;
    setSelectedEvent(event);
    
    // Create native InfoWindow
    createNativeInfoWindow(event);
  }, [isClickThrottled, createNativeInfoWindow]);

  // Cleanup InfoWindow on unmount
  useEffect(() => {
    return () => {
      if (infoWindowInstanceRef.current) {
        infoWindowInstanceRef.current.close();
        infoWindowInstanceRef.current = null;
      }
    };
  }, []);

  // Stable InfoWindow close handler
  const handleInfoWindowClose = useCallback(() => {
    selectedEventRef.current = null;
    setSelectedEvent(null);
    if (infoWindowInstanceRef.current) {
      infoWindowInstanceRef.current.close();
      infoWindowInstanceRef.current = null;
    }
  }, []);

  // Memoized InfoWindow content to prevent re-renders
  const InfoWindowContent = memo(({ event, onClose, onUpdateStatus, onCancelEvent }) => (
    <div style={{ maxWidth: '320px' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#FF6B35' }}>
        🌟 {event.title}
        {event.isRecurringRepresentative && (
          <span style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
            {' '}(Recurring - {event.recurringCount} events)
          </span>
        )}
      </h4>
      
      {event.isRecurringRepresentative ? (
        <>
          <p><strong>Event Series:</strong> {event.recurringPattern} recurring</p>
          <p><strong>Next/Current Date:</strong> {event.activeDate || event.date}</p>
          {event.activeTime && (
            <p><strong>Time:</strong> {event.activeTime} - {event.activeEndTime}</p>
          )}
        </>
      ) : (
        <>
          <p><strong>Date:</strong> {event.date}</p>
          {event.time && event.endTime && (
            <p><strong>Time:</strong> {event.time} - {event.endTime}</p>
          )}
          {event.time && !event.endTime && (
            <p><strong>Time:</strong> {event.time}</p>
          )}
        </>
      )}

      {/* Status with dropdown for updates */}
      <div style={{ marginBottom: '10px' }}>
        <strong>Status: </strong>
        {event.isRecurringRepresentative ? (
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: event.status === 'active' ? '#4CAF50' : '#9E9E9E',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {event.status === 'active' ? 'Active Now' : 'Scheduled'}
          </span>
        ) : (
          <select
            value={event.status}
            onChange={(e) => onUpdateStatus(event.id, e.target.value, event.title)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: event.status === 'active' ? '#4CAF50' : 
                             event.status === 'published' ? '#2196F3' :
                             event.status === 'completed' ? '#9C27B0' :
                             event.status === 'cancelled' ? '#F44336' : '#9E9E9E',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <option value="draft" style={{color: '#000'}}>Draft</option>
            <option value="published" style={{color: '#000'}}>Published</option>
            <option value="active" style={{color: '#000'}}>Active</option>
            <option value="completed" style={{color: '#000'}}>Completed</option>
          </select>
        )}
      </div>
      
      <p><strong>Location:</strong> {event.location}</p>
      
      {event.description && (
        <p><strong>Description:</strong> {event.description.substring(0, 100)}...</p>
      )}
      
      <div style={{ 
        marginTop: '15px', 
        paddingTop: '10px', 
        borderTop: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '12px', color: '#666' }}>
          � Your event - click status to update
        </div>
        <button
          onClick={() => onCancelEvent(
            event.id, 
            event.title, 
            event.isRecurringRepresentative,
            event.recurringId
          )}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
        >
          🗑️ {event.isRecurringRepresentative ? 'Delete Series' : 'Delete Event'}
        </button>
      </div>
    </div>
  ));

  // Truck marker icon
  const truckMarkerIcon = {
    url: "/truck-icon.png",
    scaledSize: window.google ? new window.google.maps.Size(40, 40) : null,
  };

  // Create custom HTML marker (from HeatMap)
  const createCustomMarker = (position, content, map) => {
    const marker = {
      position,
      map,
      content,
      visible: true
    };

    // Create custom overlay
    class CustomMarker extends window.google.maps.OverlayView {
      constructor(position, content, map) {
        super();
        this.position = position;
        this.content = content;
        this.div = null;
        this.clickCallbacks = []; // Store click callbacks until div is ready
        this.setMap(map);
      }

      onAdd() {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.cursor = 'pointer';
        div.style.zIndex = '2000'; // Higher z-index to override Google Places
        div.innerHTML = this.content;
        this.div = div;
        
        // Add any stored click callbacks with proper event handling
        this.clickCallbacks.forEach(callback => {
          div.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent Google Maps from handling the click
            e.preventDefault(); // Prevent default behavior
            callback(e);
          }, { capture: true }); // Use capture phase to intercept before Google Maps
        });
        this.clickCallbacks = []; // Clear the stored callbacks
        
        const panes = this.getPanes();
        panes.overlayMouseTarget.appendChild(div);
        console.log('🎨 Custom marker div added to DOM:', div);
      }

      draw() {
        if (!this.getProjection() || !this.div) return; // Don't draw if projection isn't ready or div doesn't exist
        
        const overlayProjection = this.getProjection();
        const sw = overlayProjection.fromLatLngToDivPixel(this.position);
        const div = this.div;
        // Center the 40px marker (plus star overlay) by offsetting by half the size
        const leftPos = sw.x - 20;
        const topPos = sw.y - 20;
        
        // Only update position if it has actually changed to prevent excessive re-renders
        const currentLeft = div.style.left;
        const currentTop = div.style.top;
        const newLeft = leftPos + 'px';
        const newTop = topPos + 'px';
        
        if (currentLeft !== newLeft || currentTop !== newTop) {
          div.style.left = newLeft;
          div.style.top = newTop;
          // Reduced logging to prevent excessive console output
        }
      }

      onRemove() {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      }

      hide() {
        if (this.div) {
          this.div.style.visibility = 'hidden';
        }
      }

      show() {
        if (this.div) {
          this.div.style.visibility = 'visible';
        }
      }

      toggle() {
        if (this.div) {
          this.div.style.visibility = this.div.style.visibility === 'hidden' ? 'visible' : 'hidden';
        }
      }

      toggleDOM() {
        if (this.getMap()) {
          this.setMap(null);
        } else {
          this.setMap(this.map);
        }
      }

      setPosition(position) {
        this.position = position;
        this.draw();
      }

      addClickListener(callback) {
        // Prevent duplicate listeners by checking if this exact callback already exists
        if (this.div) {
          // Div exists, add listener immediately with proper event handling
          this.div.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent Google Maps from handling the click
            e.preventDefault(); // Prevent default behavior
            callback(e);
          }, { capture: true }); // Use capture phase to intercept before Google Maps
        } else {
          // Div doesn't exist yet, store callback for later (but avoid duplicates)
          if (!this.clickCallbacks.includes(callback)) {
            this.clickCallbacks.push(callback);
          }
        }
        console.log('🖱️ Click listener added to custom marker');
      }
    }

    return new CustomMarker(position, content, map);
  };

  // Handle map click for placing event markers
  const handleMapClick = (event) => {
    if (!isPlacingEvent) return;
    
    const clickedLocation = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    
    console.log('🎯 EventOrganizerMap: Placing event marker at:', clickedLocation);
    setTempEventMarker(clickedLocation);
    setShowEventForm(true);
    
    // Get address from coordinates (reverse geocoding)
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { location: clickedLocation },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            setNewEventData(prev => ({
              ...prev,
              location: results[0].formatted_address
            }));
          }
        }
      );
    }
  };

  // Start event placement mode
  const startEventPlacement = () => {
    console.log('🎯 Starting event placement mode');
    setIsPlacingEvent(true);
    setTempEventMarker(null);
    setShowEventForm(false);
  };

  // Cancel event placement
  const cancelEventPlacement = () => {
    console.log('❌ Cancelling event placement');
    setIsPlacingEvent(false);
    setTempEventMarker(null);
    setShowEventForm(false);
    setNewEventData({
      title: '',
      description: '',
      date: '',
      time: '',
      endTime: '',
      location: '',
      isRecurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: ''
    });
  };

  // Save new event (with recurring support)
  const saveNewEvent = async () => {
    if (!tempEventMarker || !newEventData.title) {
      alert('Please fill in the event title');
      return;
    }

    if (!newEventData.date || !newEventData.time || !newEventData.endTime) {
      alert('Please fill in all required fields: Date, Start Time, and End Time');
      return;
    }

    // Validate that end time is after start time
    if (newEventData.time >= newEventData.endTime) {
      alert('End time must be after start time');
      return;
    }

    try {
      console.log('💾 Saving new event:', newEventData, tempEventMarker);
      
      
      const initialStatus = getInitialStatus(newEventData.date, newEventData.time, newEventData.endTime);
      
      const baseEventDoc = {
        title: newEventData.title,
        description: newEventData.description,
        date: newEventData.date,
        time: newEventData.time,
        endTime: newEventData.endTime,
        location: newEventData.location,
        latitude: tempEventMarker.lat,
        longitude: tempEventMarker.lng,
        organizerId: user.uid,
        organizerLogoUrl: organizerLogo, // Include organizer's logo URL for universal access
        status: initialStatus, // Set correct initial status
        eventType: 'display-only', // Mark as display-only event (no applications)
        acceptingApplications: false, // No vendor applications for map markers
        createdAt: new Date(),
        updatedAt: new Date(),
        isRecurring: newEventData.isRecurring,
        recurringPattern: newEventData.recurringPattern
      };

      if (newEventData.isRecurring && newEventData.recurringEndDate) {
        console.log('🔄 Creating single recurring event...');
        
        // For recurring events, store only ONE event with recurring metadata
        const recurringEventDoc = {
          ...baseEventDoc,
          isRecurring: true,
          recurringPattern: newEventData.recurringPattern,
          recurringEndDate: newEventData.recurringEndDate,
          originalDate: newEventData.date, // Store the original start date
          status: 'upcoming' // Recurring events start as upcoming
        };
        
        await addDoc(collection(db, 'events'), recurringEventDoc);
        console.log('✅ Single recurring event saved successfully');
        alert('Successfully created recurring event!');
        
      } else {
        // Create single event
        await addDoc(collection(db, 'events'), baseEventDoc);
        console.log('✅ Single event saved successfully');
      }
      
      cancelEventPlacement();
      
    } catch (error) {
      console.error('❌ Error saving event:', error);
      alert('Error saving event. Please try again.');
    }
  };

  // Fetch truck names for better UX (from HeatMap)
  useEffect(() => {
    const fetchTruckNames = async () => {
      const truckNamesData = {};
      
      // Fetch user documents to get business names
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'owner')
      );
      
      const snapshot = await getDocs(usersQuery);
      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        truckNamesData[doc.id] = {
          businessName: userData.businessName || userData.username || 'Unknown Truck',
          kitchenType: userData.kitchenType || 'truck',
          coverUrl: userData.coverPhotoUrl || null
        };
      });
      
      console.log('🚛 EventOrganizerMap: Using truck names from location data:', truckNamesData);
      setTruckNames(truckNamesData);
    };

    fetchTruckNames();
  }, []);

  // Fetch ping data for heatmap (optional - gracefully fails if no permissions)
  useEffect(() => {
    if (!user) return;

    console.log('📍 EventOrganizerMap: Setting up ping data listener...');
    
    try {
      const unsubscribeRef = { current: null };
      
      const unsubscribe = onSnapshot(collection(db, 'pings'), 
        (snapshot) => {
          const pings = [];
          snapshot.docs.forEach(doc => {
            const ping = doc.data();
            if (ping.location && ping.location.lat && ping.location.lng) {
              pings.push({
                id: doc.id,
                ...ping,
                position: {
                  lat: ping.location.lat,
                  lng: ping.location.lng
                }
              });
            }
          });
          
          console.log('📍 EventOrganizerMap: Loaded ping data:', pings.length);
          setPingData(pings);
        },
        (error) => {
          console.log('📋 EventOrganizerMap: Ping data not accessible, continuing without heatmap data');
          setPingData([]);
        }
      );
      
      unsubscribeRef.current = unsubscribe;
      
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
      };
    } catch (error) {
      console.log('📋 EventOrganizerMap: Ping collection not available, continuing without heatmap data');
      setPingData([]);
    }
  }, [user]);

  // Enhanced truck locations with real-time updates  
  useEffect(() => {
    console.log('🚚 EventOrganizerMap: Setting up enhanced truck location query...');
    const trucksQuery = query(
      collection(db, 'users'),
      where('role', '==', 'owner')
    );

    const unsubscribe = onSnapshot(trucksQuery, 
      (snapshot) => {
        const trucksData = [];
        const heatmapPoints = [];

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.location && data.location.lat && data.location.lng) {
            // Check if truck is active (recent activity)
            const lastActivity = data.lastActivity?.toDate?.() || new Date(0);
            const isRecent = (Date.now() - lastActivity) < 24 * 60 * 60 * 1000; // 24 hours

            trucksData.push({
              id: doc.id,
              ...data,
              position: {
                lat: data.location.lat,
                lng: data.location.lng
              },
              isActive: data.isOnline || isRecent,
              lastActivity: lastActivity
            });

            // Add to heatmap with weight based on activity and pings
            if (window.google && window.google.maps && window.google.maps.LatLng) {
              const weight = (data.customerCount || 0) + (data.isOnline ? 2 : 0) + (isRecent ? 1 : 0);
              heatmapPoints.push({
                location: new window.google.maps.LatLng(data.location.lat, data.location.lng),
                weight: Math.max(1, weight) // Ensure minimum weight of 1
              });
            }
          }
        });

        console.log('🚚 EventOrganizerMap: Found trucks:', trucksData.length, 'heatmap points:', heatmapPoints.length);
        setTrucks(trucksData);
        setHeatmapData(heatmapPoints);
      },
      (error) => {
        console.error('❌ EventOrganizerMap: Trucks listener error:', error);
        if (error.code === 'permission-denied') {
          console.log('📋 User may not have permission to read users collection');
          setTrucks([]);
          setHeatmapData([]);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Advanced truck marker creation (from HeatMap)
  const updateTruckMarkers = useCallback(async () => {
    if (!mapRef.current || !window.google) return;

    console.log('🗺️ EventOrganizerMap: Updating truck markers, found trucks:', trucks.length);
    const currentTruckIds = new Set();

    for (const truck of trucks) {
      const truckName = truckNames[truck.id]?.businessName || truck.businessName || truck.username || 'Unknown Truck';
      const position = truck.position;
      
      console.log('🗺️ EventOrganizerMap: Processing truck:', truck.id, truck);

      // Get owner cover photo if available
      let ownerCoverUrl = null;
      try {
        if (truck.id && truckNames[truck.id]?.coverUrl) {
          ownerCoverUrl = truckNames[truck.id].coverUrl;
        }
      } catch (error) {
        console.error('🗺️ EventOrganizerMap: Error fetching owner data for cover photo:', error);
      }

      const truckMarkerId = `truck_${truck.id}`;
      currentTruckIds.add(truckMarkerId);

      // Check if truck should be visible (active within 24 hours)
      const shouldShow = truck.isActive;
      const lastActivity = truck.lastActivity;
      const isStale = lastActivity && (Date.now() - lastActivity) > 24 * 60 * 60 * 1000;

      console.log('🗺️ EventOrganizerMap: Visibility check for truck', truck.id, { shouldShow, isStale });

      if (!shouldShow || isStale) {
        console.log('🗺️ EventOrganizerMap: Hiding truck', truck.id, 'shouldShow:', shouldShow, 'isStale:', isStale);
        if (markerRefs.current[truckMarkerId]) {
          markerRefs.current[truckMarkerId].setMap(null);
          delete markerRefs.current[truckMarkerId];
        }
        continue;
      }

      if (!markerRefs.current[truckMarkerId]) {
        console.log('🗺️ EventOrganizerMap: Creating new marker for truck', truck.id);
        const icon = getTruckIcon(truck.kitchenType || truckNames[truck.id]?.kitchenType, ownerCoverUrl);
        let marker;
        
        // Check if we need to create a custom HTML marker for cover photos
        if (icon && icon.type === 'custom') {
          const customMarkerContent = `
            <div style="
              width: 40px; 
              height: 40px; 
              border-radius: 50%; 
              border: 2px solid #4CAF50; 
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              background: white;
            ">
              <img src="${icon.coverUrl}" style="
                width: 100%; 
                height: 100%; 
                object-fit: cover;
              " />
            </div>
          `;
          
          marker = createCustomMarker(position, customMarkerContent, mapRef.current);
        } else {
          // Create standard Google Maps marker
          const markerOptions = {
            position,
            map: mapRef.current,
            title: truckName,
          };
          
          // Only add icon if it's a valid Google Maps icon (not custom)
          if (icon && icon.type !== 'custom') {
            markerOptions.icon = icon;
          }
          
          marker = new window.google.maps.Marker(markerOptions);
        }
        
        // Handle click events (unified for both marker types)
        if (marker.addClickListener) {
          // Custom marker
          marker.addClickListener(() => {
            console.log('🗺️ EventOrganizerMap: Truck marker clicked:', truck.id);
            setSelectedTruck(truck);
          });
        } else {
          // Standard marker
          marker.addListener('click', () => {
            console.log('🗺️ EventOrganizerMap: Truck marker clicked:', truck.id);
            setSelectedTruck(truck);
          });
        }
        
        markerRefs.current[truckMarkerId] = marker;
      } else {
        console.log('🗺️ EventOrganizerMap: Updating existing marker for truck', truck.id);
        const marker = markerRefs.current[truckMarkerId];
        
        // Update position for both marker types
        if (marker.setPosition) {
          console.log('🗺️ EventOrganizerMap: Updating standard marker position');
          marker.setPosition(position);
        } else if (marker.setPosition) {
          console.log('🗺️ EventOrganizerMap: Updating custom marker position');
          marker.setPosition(position);
        }
      }
    }

    // Clean up markers for trucks that are no longer visible
    Object.keys(markerRefs.current).forEach(id => {
      if (id.startsWith('truck_') && !currentTruckIds.has(id)) {
        console.log('🗺️ EventOrganizerMap: Cleaning up truck marker for:', id);
        if (markerRefs.current[id]) {
          markerRefs.current[id].setMap(null);
          delete markerRefs.current[id];
        }
      }
    });
  }, [trucks, truckNames]);

  // Update markers when data changes
  useEffect(() => {
    if ((mapsLoaded || window.google?.maps) && mapRef.current) {
      updateTruckMarkers();
    }
  }, [mapsLoaded, updateTruckMarkers]);

  // Load events for the current user and fetch organizer's logo
  useEffect(() => {
    if (!user) return;

    console.log('🎭 EventOrganizerMap: Setting up events query for user:', user.uid);

    // Fetch organizer's logo
    const fetchOrganizerLogo = async () => {
      try {
        console.log('🎭 Fetching organizer logo for user:', user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('👤 User data:', userData);
          console.log('🖼️ Logo URL found:', userData.logoUrl);
          setOrganizerLogo(userData.logoUrl || null);
        } else {
          console.log('❌ User document does not exist');
        }
      } catch (error) {
        console.error('Error fetching organizer logo:', error);
      }
    };

    fetchOrganizerLogo();

    // Set up a listener for user document changes to update logo in real-time
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        console.log('🔄 User document updated, new logo URL:', userData.logoUrl);
        setOrganizerLogo(userData.logoUrl || null);
      }
    });

    const eventsQuery = query(
      collection(db, 'events'),
      where('organizerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(event => event.latitude && event.longitude);

      console.log('🎪 EventOrganizerMap: Found events:', eventsData.length);
      setEvents(eventsData);
    });

    return () => {
      unsubscribe();
      unsubscribeUser();
    };
  }, [user]);

  // Update markers when data changes
  useEffect(() => {
    if ((mapsLoaded || window.google?.maps) && mapRef.current) {
      updateTruckMarkers();
    }
  }, [mapsLoaded, updateTruckMarkers]);

  // Handle event markers with custom HTML for logos
  useEffect(() => {
    if (!mapRef.current || !window.google || !isMapLoaded) return;
    
    console.log('🎭 EventOrganizerMap: Updating event markers, found events:', visibleEvents.length);
    const currentEventIds = new Set();

    // Check if we have new events that need markers
    const newEventIds = visibleEvents.map(event => `event_${event.id}`);
    const existingEventIds = Object.keys(markerRefs.current).filter(id => id.startsWith('event_'));
    const hasNewEvents = newEventIds.some(id => !existingEventIds.includes(id));
    const hasRemovedEvents = existingEventIds.some(id => !newEventIds.includes(id));
    
    // Only skip marker recreation if InfoWindow is open AND no new/removed events
    if (infoWindowInstanceRef.current && !hasNewEvents && !hasRemovedEvents) {
      console.log('🔒 InfoWindow is open and no event changes detected, skipping marker recreation');
      return;
    }
    
    if (infoWindowInstanceRef.current && (hasNewEvents || hasRemovedEvents)) {
      console.log('🆕 InfoWindow is open but new/removed events detected, updating markers carefully');
    }

    for (const event of visibleEvents) {
      const eventMarkerId = `event_${event.id}`;
      currentEventIds.add(eventMarkerId);
      
      const position = { lat: event.latitude, lng: event.longitude };
      const icon = getEventMarkerIcon(event.status, organizerLogo);
      
      console.log('🎯 Processing event marker:', {
        id: event.id,
        status: event.status,
        hasLogo: !!organizerLogo,
        iconType: icon?.type || 'standard'
      });

      if (!markerRefs.current[eventMarkerId]) {
        console.log('🌟 Creating new event marker for:', event.id);
        let marker;
        
        // Check if we need to create a custom HTML marker for logos
        if (icon && icon.type === 'custom' && icon.logoUrl) {
          console.log('🎨 Creating custom HTML marker with logo:', icon.logoUrl);
          const logoContent = `
            <div style="
              width: ${icon.size}px; 
              height: ${icon.size}px; 
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <!-- Logo image with status-colored border -->
              <div style="
                width: ${icon.size}px; 
                height: ${icon.size}px; 
                border-radius: 50%; 
                overflow: hidden;
                background: white;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                border: 3px solid ${icon.borderColor};
                position: relative;
              ">
                <img src="${icon.logoUrl}" style="
                  width: calc(100% - 6px); 
                  height: calc(100% - 6px); 
                  object-fit: cover;
                  display: block;
                  border-radius: 50%;
                " onerror="console.error('❌ Failed to load logo image:', this.src); this.style.display='none';" 
                   onload="console.log('✅ Logo image loaded successfully:', this.src); this.style.opacity='1';" 
                   alt="Organization Logo" />
              </div>
              <!-- Small star overlay to distinguish from food truck markers -->
              <div style="
                position: absolute;
                bottom: -2px;
                right: -2px;
                width: 16px;
                height: 16px;
                background: #FFD700;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                border: 2px solid white;
                font-size: 10px;
                z-index: 3;
              ">
                ⭐
              </div>
            </div>
          `;
          
          console.log('🎨 Custom marker HTML content:', logoContent);
          marker = createCustomMarker(position, logoContent, mapRef.current);
          console.log('🎨 Custom marker created:', marker);
          
          // Add click listener for custom marker with debouncing
          const debouncedClickHandler = () => {
            setTimeout(() => handleEventSelection(event), 0);
          };
          marker.addClickListener(debouncedClickHandler);
          
        } else {
          // Create standard Google Maps marker
          const markerOptions = {
            position,
            map: mapRef.current,
            title: event.title,
          };
          
          // Only add icon if it's a valid Google Maps icon (not custom)
          if (icon && icon.type !== 'custom') {
            markerOptions.icon = icon;
          }
          
          marker = new window.google.maps.Marker(markerOptions);
          
          // Add click listener for standard marker with debouncing  
          const debouncedClickHandler = () => {
            setTimeout(() => handleEventSelection(event), 0);
          };
          marker.addListener('click', debouncedClickHandler);
        }
        
        markerRefs.current[eventMarkerId] = marker;
      } else {
        console.log('🔄 Event marker already exists for:', event.id);
        // Optionally update existing marker if needed
      }
    }

    // Clean up markers for events that are no longer visible
    Object.keys(markerRefs.current).forEach(id => {
      if (id.startsWith('event_') && !currentEventIds.has(id)) {
        console.log('🗑️ Cleaning up event marker for:', id);
        if (markerRefs.current[id]) {
          markerRefs.current[id].setMap(null);
          delete markerRefs.current[id];
        }
      }
    });
  }, [isMapLoaded, visibleEvents, organizerLogo]);

  // Automatic event status updating based on start and end times
  useEffect(() => {
    if (!events.length) return;

    const updateEventStatuses = async () => {
      // Debounce rapid updates (prevent updates more than once per 30 seconds)
      const now = Date.now();
      if (now - lastStatusUpdate < 30000) {
        console.log('🕐 Skipping status update - too soon since last update');
        return;
      }
      setLastStatusUpdate(now);

      const currentDate = new Date();
      const today = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentTime = currentDate.toTimeString().slice(0, 5); // HH:MM format
      
      console.log('🕐 Auto-checking event statuses at:', currentTime, 'on', today);

      let updatesNeeded = 0;

      for (const event of events) {
        // Skip automatic status updates for recurring events - they're handled dynamically
        if (event.isRecurring) continue;
        
        if (!event.date || !event.time || !event.endTime) continue;

        const eventDate = event.date;
        const eventStartTime = event.time;
        const eventEndTime = event.endTime;
        let newStatus = event.status;

        // Check if event is today
        if (eventDate === today) {
          // Event is active if current time is between start and end time
          if (currentTime >= eventStartTime && currentTime < eventEndTime) {
            newStatus = 'active';
          }
          // Event is completed if current time is past end time
          else if (currentTime >= eventEndTime) {
            newStatus = 'completed';
          }
          // Event is upcoming if it hasn't started yet today
          else if (currentTime < eventStartTime) {
            newStatus = 'upcoming';
          }
        }
        // Event is completed if the date has passed
        else if (eventDate < today) {
          newStatus = 'completed';
        }
        // Event is upcoming if it's in the future
        else if (eventDate > today) {
          newStatus = 'upcoming';
        }

        // Update status if it has changed
        if (newStatus !== event.status) {
          updatesNeeded++;
          try {
            console.log(`🔄 Auto-updating event "${event.title}" status from ${event.status} to ${newStatus}`);
            await updateDoc(doc(db, 'events', event.id), {
              status: newStatus,
              updatedAt: new Date()
            });
          } catch (error) {
            console.error('❌ Error auto-updating event status:', error);
          }
        }
      }

      if (updatesNeeded === 0) {
        console.log('✅ All event statuses are current');
      }
    };

    // Run status update immediately only if enough time has passed
    updateEventStatuses();

    // Set up interval to check every 5 minutes instead of every minute to reduce conflicts
    const statusInterval = setInterval(updateEventStatuses, 1 * 60 * 1000); // Check every 1 minute for real-time updates

    return () => clearInterval(statusInterval);
  }, [events, lastStatusUpdate]);

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    clickableIcons: false, // Disable clicks on POI icons to prevent Google InfoWindows
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
          {userLocation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '15px', height: '15px', background: '#4285F4', borderRadius: '50%', border: '2px solid white' }}></div>
              <span>Your Location</span>
            </div>
          )}
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
      
      {/* Event Placement Controls */}
      <div style={{ 
        marginBottom: '15px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e0e0e0' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0, color: '#333' }}>📍 Event Marker Tools</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: '#666',
              backgroundColor: '#f8f9fa',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #e0e0e0'
            }}>
              📍 <strong>Place Event Marker:</strong> Add basic event information to the map for display purposes only.
              <br/>
              🎪 <strong>Create Event (Dashboard):</strong> Post full events where vendors can apply to participate.
            </p>
          </div>
          {!isPlacingEvent ? (
            <button
              onClick={startEventPlacement}
              style={{
                backgroundColor: '#FF6B35',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📍 Place Event Marker
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ 
                color: '#FF6B35', 
                fontWeight: 'bold',
                backgroundColor: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '2px solid #FF6B35'
              }}>
                📍 Click on the map to place your event marker
              </span>
              <button
                onClick={cancelEventPlacement}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="event-map-container">
        <div className="event-map-inner">
          {mapsError ? (
            <div style={{
              height: '500px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div>
                <h3>🗺️ Map Error</h3>
                <p>Failed to load Google Maps: {mapsError.message}</p>
                <p><small>Please check your internet connection and try again.</small></p>
              </div>
            </div>
          ) : !window.google?.maps ? (
            <div style={{
              height: '500px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{
                  width: '50px',
                  height: '50px',
                  border: '4px solid #e0e0e0',
                  borderTop: '4px solid #FF6B35',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px'
                }}></div>
                <h3>🗺️ Loading Map...</h3>
                <p>Initializing Google Maps API</p>
                <p><small>Debug: mapsLoaded={String(mapsLoaded)}, googleMaps={String(!!window.google?.maps)}</small></p>
              </div>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={mapZoom}
              options={mapOptions}
              onClick={handleMapClick}
              onLoad={(mapInstance) => {
                console.log('🗺️ EventOrganizerMap: GoogleMap onLoad called');
                setMap(mapInstance);
                setIsMapLoaded(true);
                mapRef.current = mapInstance;
                
                // If we have user location, center on it
                if (userLocation) {
                  console.log('🗺️ Centering map on user location');
                  mapInstance.panTo(userLocation);
                  mapInstance.setZoom(12);
                }
              }}
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

              {/* User Location Marker */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={{
                    path: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 3,
                    scale: 1.5,
                    anchor: { x: 12, y: 12 }
                  }}
                  title="Your Location"
                />
              )}

              {/* Temporary Event Marker (for placement) */}
              {tempEventMarker && (
                <Marker
                  position={tempEventMarker}
                  icon={{
                    path: "M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2Z",
                    fillColor: '#FF6B35',
                    fillOpacity: 0.9,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 4,
                    scale: 3,
                    anchor: { x: 12, y: 12 }
                  }}
                  animation={window.google?.maps?.Animation?.BOUNCE}
                  title="New Event Location"
                />
              )}

              {/* Event Markers - Distinctive Star Design with Smart Filtering */}
              {isMapLoaded && visibleEvents.map((event, index) => {
                const icon = getEventMarkerIcon(event.status, organizerLogo);
                
                // If it's a custom marker with logo, we need to handle it differently
                if (icon?.type === 'custom') {
                  // Custom HTML marker will be handled in useEffect
                  return null;
                } else {
                  return (
                    <Marker
                      key={`event-${event.id}`}
                      position={{ lat: event.latitude, lng: event.longitude }}
                      icon={icon}
                      onClick={() => setSelectedEvent(event)}
                      animation={event.status === 'active' ? window.google.maps.Animation.BOUNCE : null}
                    />
                  );
                }
              })}

              {/* Truck Markers */}
              {trucks.map((truck) => (
                <Marker
                  key={truck.id}
                  position={truck.position}
                  icon={truckMarkerIcon}
                  onClick={() => setSelectedTruck(truck)}
                />
              ))}

              {/* Event Info Window - Now handled by native Google Maps InfoWindow */}
              {/* Native InfoWindow is created and managed in handleEventSelection */}

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
          )}
        </div>

        {/* Event Status Legend - moved below map */}
        {isMapLoaded && events.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            marginTop: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <h4 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '14px', 
              color: '#333',
              borderBottom: '1px solid #eee',
              paddingBottom: '8px'
            }}>
              ⭐ Event Status
            </h4>
            
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  backgroundColor: '#FFD700',
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
                }} />
                <span style={{ fontSize: '12px' }}>
                  <strong>Happening Now</strong> - Event is currently active
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  backgroundColor: '#9E9E9E',
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
                }} />
                <span style={{ fontSize: '12px' }}>
                  <strong>Not Active</strong> - Upcoming, completed recurring, or cancelled
                </span>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '10px', 
              fontSize: '11px', 
              color: '#666',
              fontStyle: 'italic',
              paddingTop: '8px',
              borderTop: '1px solid #f0f0f0'
            }}>
              💡 <strong>Smart Display:</strong> Completed single events disappear automatically • Recurring events stay visible when completed
            </div>
          </div>
        )}

        {/* Enhanced Heatmap Legend - moved below event status */}
        {isMapLoaded && heatmapData.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            marginTop: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <h4 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '14px', 
              color: '#333',
              borderBottom: '1px solid #eee',
              paddingBottom: '8px'
            }}>
              🔥 Activity Heatmap
            </h4>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '12px', background: 'linear-gradient(to right, rgba(0,255,255,0.6), rgba(0,255,0,0.6))', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px' }}>Low</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '12px', background: 'linear-gradient(to right, rgba(0,255,0,0.6), rgba(255,255,0,0.8))', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px' }}>Medium</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '12px', background: 'linear-gradient(to right, rgba(255,255,0,0.8), rgba(255,0,0,1))', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px' }}>High</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend and Stats */}
      <div className="map-stats-grid">
        <div className="map-stat-card" style={{ background: 'linear-gradient(135deg, #FF6B35, #FF3D00)' }}>
          <h4 className="map-stat-label">🌟 Your Events</h4>
          <p className="map-stat-number">{visibleEvents.length}</p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            {events.filter(e => e.status === 'active').length} active • {events.filter(e => e.status === 'completed' && (e.recurringPattern || e.recurringId)).length} recurring
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
      
      {/* Event Creation Form Modal */}
      {showEventForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0, color: '#FF6B35' }}>📍 Place Event Marker</h3>
            <p style={{ 
              margin: '0 0 15px 0', 
              fontSize: '14px', 
              color: '#666',
              backgroundColor: '#e8f4fd',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #bee5eb'
            }}>
              ℹ️ This creates a simple event marker for map display. For events where vendors can apply, use "Create Event" in the Dashboard.
            </p>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Event will be placed at: {tempEventMarker ? `${tempEventMarker.lat.toFixed(6)}, ${tempEventMarker.lng.toFixed(6)}` : ''}
            </p>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Event Title *
              </label>
              <input
                type="text"
                value={newEventData.title}
                onChange={(e) => setNewEventData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Description
              </label>
              <textarea
                value={newEventData.description}
                onChange={(e) => setNewEventData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your event..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Date *
                </label>
                <input
                  type="date"
                  value={newEventData.date}
                  onChange={(e) => setNewEventData(prev => ({ ...prev, date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Start Time *
                </label>
                <input
                  type="time"
                  value={newEventData.time}
                  onChange={(e) => setNewEventData(prev => ({ ...prev, time: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  End Time *
                </label>
                <input
                  type="time"
                  value={newEventData.endTime}
                  onChange={(e) => setNewEventData(prev => ({ ...prev, endTime: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Location Address
              </label>
              <input
                type="text"
                value={newEventData.location}
                onChange={(e) => setNewEventData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Event address (auto-filled from map)"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            {/* Recurring Event Settings */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newEventData.isRecurring}
                    onChange={(e) => setNewEventData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                    style={{ marginRight: '8px' }}
                  />
                  🔄 Make this a recurring event
                </label>
              </div>
              
              {newEventData.isRecurring && (
                <>
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Repeat Pattern
                      </label>
                      <select
                        value={newEventData.recurringPattern}
                        onChange={(e) => setNewEventData(prev => ({ ...prev, recurringPattern: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        End Date
                      </label>
                      <input
                        type="date"
                        value={newEventData.recurringEndDate}
                        onChange={(e) => setNewEventData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                    💡 This will create multiple events based on your pattern until the end date
                  </p>
                </>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelEventPlacement}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveNewEvent}
                style={{
                  backgroundColor: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Place Event Marker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventOrganizerMap;
