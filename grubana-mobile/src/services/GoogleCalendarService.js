import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure WebBrowser for authentication
WebBrowser.maybeCompleteAuthSession();

/**
 * Google Calendar Service
 * Handles OAuth authentication and calendar API calls
 */
class GoogleCalendarService {
  constructor() {
    // Google OAuth 2.0 configuration
    this.clientId = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your actual client ID
    this.redirectUri = AuthSession.makeRedirectUri({
      scheme: 'grubana',
      path: 'auth/google',
    });
    
    // Google Calendar API endpoints
    this.authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenUrl = 'https://oauth2.googleapis.com/token';
    this.calendarApiUrl = 'https://www.googleapis.com/calendar/v3';
    
    // Required scopes for calendar access
    this.scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
    
    // Storage keys for tokens
    this.STORAGE_KEYS = {
      ACCESS_TOKEN: 'google_access_token',
      REFRESH_TOKEN: 'google_refresh_token',
      TOKEN_EXPIRY: 'google_token_expiry',
      USER_EMAIL: 'google_user_email'
    };
  }

  /**
   * Initiate Google OAuth 2.0 authentication flow
   */
  async authenticate() {
    try {
      // Create authentication request
      const request = new AuthSession.AuthRequest({
        clientId: this.clientId,
        scopes: this.scopes,
        redirectUri: this.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        prompt: AuthSession.Prompt.SelectAccount,
        extraParams: {
          access_type: 'offline', // Required for refresh token
        },
      });

      // Perform authentication
      const result = await request.promptAsync({
        authorizationEndpoint: this.authUrl,
        showInRecents: true,
      });

      if (result.type === 'success') {
        // Exchange authorization code for access token
        const tokenResponse = await this.exchangeCodeForToken(result.params.code);
        
        if (tokenResponse) {
          // Store tokens securely
          await this.storeTokens(tokenResponse);
          
          // Get user info for verification
          const userInfo = await this.getUserInfo(tokenResponse.access_token);
          if (userInfo) {
            await AsyncStorage.setItem(this.STORAGE_KEYS.USER_EMAIL, userInfo.email);
          }
          
          return {
            success: true,
            email: userInfo?.email,
            message: 'Successfully connected to Google Calendar'
          };
        }
      }
      
      return {
        success: false,
        message: 'Authentication failed or was cancelled'
      };
    } catch (error) {

      return {
        success: false,
        message: 'Authentication error: ' + error.message
      };
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForToken(code) {
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
        }).toString(),
      });

      if (response.ok) {
        const tokenData = await response.json();
        return {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type,
        };
      }
      
      throw new Error('Failed to exchange code for token');
    } catch (error) {
 
      return null;
    }
  }

  /**
   * Get user information from Google
   */
  async getUserInfo(accessToken) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      
      return null;
    } catch (error) {
 
      return null;
    }
  }

  /**
   * Store authentication tokens securely
   */
  async storeTokens(tokenData) {
    try {
      const expiryTime = Date.now() + (tokenData.expires_in * 1000);
      
      await AsyncStorage.multiSet([
        [this.STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token],
        [this.STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token || ''],
        [this.STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString()],
      ]);
    } catch (error) {

    }
  }

  /**
   * Get stored access token, refresh if necessary
   */
  async getValidAccessToken() {
    try {
      const [accessToken, refreshToken, expiryTime] = await AsyncStorage.multiGet([
        this.STORAGE_KEYS.ACCESS_TOKEN,
        this.STORAGE_KEYS.REFRESH_TOKEN,
        this.STORAGE_KEYS.TOKEN_EXPIRY,
      ]);

      const token = accessToken[1];
      const refresh = refreshToken[1];
      const expiry = parseInt(expiryTime[1] || '0');

      // Check if token is still valid (with 5-minute buffer)
      if (token && expiry > Date.now() + 300000) {
        return token;
      }

      // Try to refresh token if available
      if (refresh) {
        const newToken = await this.refreshAccessToken(refresh);
        if (newToken) {
          return newToken;
        }
      }

      // If refresh fails, user needs to re-authenticate
      return null;
    } catch (error) {
   
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (response.ok) {
        const tokenData = await response.json();
        
        // Store new token
        const expiryTime = Date.now() + (tokenData.expires_in * 1000);
        await AsyncStorage.multiSet([
          [this.STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token],
          [this.STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString()],
        ]);

        return tokenData.access_token;
      }
      
      throw new Error('Failed to refresh token');
    } catch (error) {
    
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const token = await this.getValidAccessToken();
    return !!token;
  }

  /**
   * Get user's email from stored data
   */
  async getUserEmail() {
    try {
      return await AsyncStorage.getItem(this.STORAGE_KEYS.USER_EMAIL);
    } catch (error) {
    
      return null;
    }
  }

  /**
   * Fetch upcoming calendar events
   */
  async getUpcomingEvents(maxResults = 10) {
    try {
      const accessToken = await this.getValidAccessToken();
      
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      // Get events from now until 30 days from now
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const params = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: futureDate.toISOString(),
        maxResults: maxResults.toString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      });

      const response = await fetch(
        `${this.calendarApiUrl}/calendars/primary/events?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Process and format events
        return this.formatCalendarEvents(data.items || []);
      }
      
      throw new Error('Failed to fetch calendar events');
    } catch (error) {
   
      throw error;
    }
  }

  /**
   * Format calendar events for app consumption
   */
  formatCalendarEvents(events) {
    return events.map(event => {
      // Handle all-day events and timed events
      const start = event.start?.dateTime || event.start?.date;
      const end = event.end?.dateTime || event.end?.date;
      
      return {
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        location: event.location || '',
        startTime: start ? new Date(start) : null,
        endTime: end ? new Date(end) : null,
        isAllDay: !event.start?.dateTime, // All-day if no specific time
        status: event.status,
        organizer: event.organizer,
        attendees: event.attendees || [],
        created: event.created ? new Date(event.created) : null,
        updated: event.updated ? new Date(event.updated) : null,
      };
    });
  }

  /**
   * Disconnect Google Calendar (clear stored tokens)
   */
  async disconnect() {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.ACCESS_TOKEN,
        this.STORAGE_KEYS.REFRESH_TOKEN,
        this.STORAGE_KEYS.TOKEN_EXPIRY,
        this.STORAGE_KEYS.USER_EMAIL,
      ]);
      
      return { success: true, message: 'Successfully disconnected from Google Calendar' };
    } catch (error) {
 
      return { success: false, message: 'Error disconnecting: ' + error.message };
    }
  }
}

// Export singleton instance
export default new GoogleCalendarService();