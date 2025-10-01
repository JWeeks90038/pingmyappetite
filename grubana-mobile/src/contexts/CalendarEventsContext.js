import React, { createContext, useContext, useReducer, useEffect } from 'react';
import GoogleCalendarService from '../services/GoogleCalendarService';

/**
 * Calendar Events Context
 * Global state management for calendar events and sync status
 */

// Initial state
const initialState = {
  events: [],
  isConnected: false,
  userEmail: null,
  lastSync: null,
  loading: false,
  error: null,
  syncInterval: null,
};

// Action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_EVENTS: 'SET_EVENTS',
  SET_ERROR: 'SET_ERROR',
  SET_USER_EMAIL: 'SET_USER_EMAIL',
  SET_LAST_SYNC: 'SET_LAST_SYNC',
  SET_SYNC_INTERVAL: 'SET_SYNC_INTERVAL',
  CLEAR_DATA: 'CLEAR_DATA',
};

// Reducer function
const calendarEventsReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case actionTypes.SET_CONNECTED:
      return { ...state, isConnected: action.payload };
    
    case actionTypes.SET_EVENTS:
      return { 
        ...state, 
        events: action.payload,
        error: null,
      };
    
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case actionTypes.SET_USER_EMAIL:
      return { ...state, userEmail: action.payload };
    
    case actionTypes.SET_LAST_SYNC:
      return { ...state, lastSync: action.payload };
    
    case actionTypes.SET_SYNC_INTERVAL:
      return { ...state, syncInterval: action.payload };
    
    case actionTypes.CLEAR_DATA:
      return {
        ...initialState,
        syncInterval: state.syncInterval, // Keep interval running
      };
    
    default:
      return state;
  }
};

// Create context
const CalendarEventsContext = createContext();

/**
 * Calendar Events Provider Component
 */
export const CalendarEventsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(calendarEventsReducer, initialState);

  /**
   * Initialize calendar status and start sync interval
   */
  useEffect(() => {
    initializeCalendar();
    startSyncInterval();
    
    return () => {
      if (state.syncInterval) {
        clearInterval(state.syncInterval);
      }
    };
  }, []);

  /**
   * Initialize calendar connection status
   */
  const initializeCalendar = async () => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      
      const isConnected = await GoogleCalendarService.isAuthenticated();
      dispatch({ type: actionTypes.SET_CONNECTED, payload: isConnected });
      
      if (isConnected) {
        const userEmail = await GoogleCalendarService.getUserEmail();
        dispatch({ type: actionTypes.SET_USER_EMAIL, payload: userEmail });
        
        // Load initial events
        await syncEvents();
      }
    } catch (error) {

      dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  /**
   * Sync calendar events from Google
   */
  const syncEvents = async () => {
    try {
      if (!state.isConnected) {
        const isConnected = await GoogleCalendarService.isAuthenticated();
        if (!isConnected) {
          dispatch({ type: actionTypes.SET_CONNECTED, payload: false });
          return;
        }
        dispatch({ type: actionTypes.SET_CONNECTED, payload: true });
      }

      const events = await GoogleCalendarService.getUpcomingEvents(50);
      dispatch({ type: actionTypes.SET_EVENTS, payload: events });
      dispatch({ type: actionTypes.SET_LAST_SYNC, payload: new Date() });
      

    } catch (error) {

      dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
      
      // If auth error, mark as disconnected
      if (error.message.includes('access token') || error.message.includes('authentication')) {
        dispatch({ type: actionTypes.SET_CONNECTED, payload: false });
        dispatch({ type: actionTypes.CLEAR_DATA });
      }
    }
  };

  /**
   * Start automatic sync interval (every 15 minutes)
   */
  const startSyncInterval = () => {
    // Clear existing interval if any
    if (state.syncInterval) {
      clearInterval(state.syncInterval);
    }
    
    // Set up new interval for 15 minutes (900000 ms)
    const interval = setInterval(async () => {
      if (state.isConnected) {

        await syncEvents();
      }
    }, 15 * 60 * 1000); // 15 minutes
    
    dispatch({ type: actionTypes.SET_SYNC_INTERVAL, payload: interval });
  };

  /**
   * Connect Google Calendar
   */
  const connectCalendar = async () => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      
      const result = await GoogleCalendarService.authenticate();
      
      if (result.success) {
        dispatch({ type: actionTypes.SET_CONNECTED, payload: true });
        dispatch({ type: actionTypes.SET_USER_EMAIL, payload: result.email });
        
        // Sync events after successful connection
        await syncEvents();
        
        return { success: true, message: 'Calendar connected successfully' };
      } else {
        dispatch({ type: actionTypes.SET_ERROR, payload: result.message });
        return { success: false, message: result.message };
      }
    } catch (error) {
  
      dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
      return { success: false, message: error.message };
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  /**
   * Disconnect Google Calendar
   */
  const disconnectCalendar = async () => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      
      const result = await GoogleCalendarService.disconnect();
      
      if (result.success) {
        dispatch({ type: actionTypes.CLEAR_DATA });
        return { success: true, message: 'Calendar disconnected successfully' };
      } else {
        dispatch({ type: actionTypes.SET_ERROR, payload: result.message });
        return { success: false, message: result.message };
      }
    } catch (error) {

      dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
      return { success: false, message: error.message };
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  /**
   * Manual refresh of calendar events
   */
  const refreshEvents = async () => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      await syncEvents();
      return { success: true, message: 'Events refreshed successfully' };
    } catch (error) {

      dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
      return { success: false, message: error.message };
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  /**
   * Get events for a specific date range
   */
  const getEventsForDateRange = (startDate, endDate) => {
    return state.events.filter(event => {
      if (!event.startTime) return false;
      
      const eventStart = new Date(event.startTime);
      return eventStart >= startDate && eventStart <= endDate;
    });
  };

  /**
   * Get events happening now
   */
  const getCurrentEvents = () => {
    const now = new Date();
    
    return state.events.filter(event => {
      if (!event.startTime || !event.endTime) return false;
      
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      
      return now >= eventStart && now <= eventEnd;
    });
  };

  /**
   * Get upcoming events (next 24 hours)
   */
  const getUpcomingEvents = (hours = 24) => {
    const now = new Date();
    const futureTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));
    
    return state.events.filter(event => {
      if (!event.startTime) return false;
      
      const eventStart = new Date(event.startTime);
      return eventStart >= now && eventStart <= futureTime;
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    dispatch({ type: actionTypes.SET_ERROR, payload: null });
  };

  // Context value
  const value = {
    // State
    events: state.events,
    isConnected: state.isConnected,
    userEmail: state.userEmail,
    lastSync: state.lastSync,
    loading: state.loading,
    error: state.error,
    
    // Actions
    connectCalendar,
    disconnectCalendar,
    refreshEvents,
    syncEvents,
    clearError,
    
    // Helpers
    getEventsForDateRange,
    getCurrentEvents,
    getUpcomingEvents,
  };

  return (
    <CalendarEventsContext.Provider value={value}>
      {children}
    </CalendarEventsContext.Provider>
  );
};

/**
 * Hook to use calendar events context
 */
export const useCalendarEvents = () => {
  const context = useContext(CalendarEventsContext);
  
  if (!context) {
    throw new Error('useCalendarEvents must be used within a CalendarEventsProvider');
  }
  
  return context;
};

export default CalendarEventsContext;