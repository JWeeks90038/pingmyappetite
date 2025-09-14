import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../components/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

const HomeScreen = () => {
  const { user, userData, userRole } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();

  const styles = createThemedStyles(theme);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
        />
        
        <Text style={styles.subtitle}>
          {userRole === 'owner' 
            ? 'Manage your food truck, food trailer, food cart or pop-up kitchen and connect with customers'
            : userRole === 'event-organizer'
            ? 'Plan amazing events and connect with food trucks'
            : 'Find amazing food trucks near you'
          }
        </Text>
      </View>

      <View style={styles.content}>
        {user && (
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              Welcome, {userData?.username || userData?.displayName || user?.displayName || user?.email?.split('@')[0] || 'there'}!
            </Text>
          </View>
        )}

        <View style={styles.featureSection}>
          <Text style={styles.sectionTitle}>
            {userRole === 'owner' ? 'Owner Features' : userRole === 'event-organizer' ? 'Event Organizer Features' : 'Customer Features'}
          </Text>
          
          
          {userRole === 'owner' ? (
            <View>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>📍 Live Location Tracking</Text>
                  <Text style={styles.featureDescription}>
                    Go live on the map! Customers and event organizers can track your business location in real-time, follow your route, and place pre-orders with a tap of your truck icon.
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>🍽️ Menu Management</Text>
                  <Text style={styles.featureDescription}>
                    Keep your menu and prices updated in seconds- drive more sales as customers pre-order, skip the line, and keep your service moving fast.
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>📊 Analytics Dashboard</Text>
                  <Text style={styles.featureDescription}>
                    Track customer pings and analyze demand - see order trends, event performance, and insights that help you boost sales.
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>🎯 Food Drops</Text>
                  <Text style={styles.featureDescription}>
                    Create more buzz, boost sales with special offers and limited-time drops that keep customers coming back. 
                  </Text>
                </View>
              </View>
              
              <View style={styles.actionSection}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('TruckOnboarding')}
                >
                  <Text style={styles.buttonText}>Manage Your Mobile Kitchen</Text>
                  <Text style={styles.buttonSubtext}>Payment Setup & Menu Management</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : userRole === 'event-organizer' ? (
            <View>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>🎪 Event Management</Text>
                  <Text style={styles.featureDescription}>
                    Create and manage amazing events with multiple food trucks. Set schedules, locations, and coordinate with vendors.
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>🚚 Food Truck Coordination</Text>
                  <Text style={styles.featureDescription}>
                    Invite and manage food trucks for your events. Track RSVPs, coordinate setup times, and ensure smooth operations.
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>📊 Event Analytics</Text>
                  <Text style={styles.featureDescription}>
                    Monitor event performance, track attendance, and analyze food truck participation to optimize future events.
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>🎯 Event Promotion</Text>
                  <Text style={styles.featureDescription}>
                    Promote your events to the community, allow customers to engage to show interest, and build excitement around your gatherings.
                  </Text>
                </View>
              </View>
              
              <View style={styles.actionSection}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('Events')}
                >
                  <Text style={styles.buttonText}>🎪 Manage Events</Text>
                  <Text style={styles.buttonSubtext}>Create & coordinate amazing food truck events</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>📍 Send Pings</Text>
                  <Text style={styles.featureDescription}>
                    Let food trucks know what you're craving
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>🗺️ Live Map</Text>
                  <Text style={styles.featureDescription}>
                    See active food trucks in real-time
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureTitle}>❤️ Favorites</Text>
                  <Text style={styles.featureDescription}>
                    Save your favorite food trucks
                  </Text>
                </View>
              </View>
              
              <View style={styles.actionSection}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('Map')}
                >
                  <Text style={styles.buttonText}>🗺️ Find Trucks</Text>
                  <Text style={styles.buttonSubtext}>Discover food trucks near you</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About Grubana</Text>
          <Text style={styles.aboutText}>
            <Text style={styles.aboutBold}>Why We Built Grubana{'\n'}</Text>
            The mobile food industry faced fragmented communication, unpredictable customer discovery, and missed opportunities for collaboration. Mobile kitchen owners struggled with inconsistent foot traffic, customers couldn't reliably find their favorite mobile food vendors, and event organizers lacked efficient ways to coordinate with multiple vendors.{'\n\n'}
            
            <Text style={styles.aboutBold}>The Problems We Solve{'\n'}</Text>
            • <Text style={styles.aboutBold}>Customer Discovery:</Text> No more scouring social media and driving around hoping to find mobile food vendors - see real-time locations and menus instantly{'\n'}
            • <Text style={styles.aboutBold}>Vendor Visibility:</Text> Eliminate unpredictable sales by connecting directly with hungry customers through live tracking, pre-orders and catering/event bookings{'\n'}
            • <Text style={styles.aboutBold}>Event Coordination:</Text> Streamline vendor management and customer engagement for seamless mobile food vendor events{'\n'}
            • <Text style={styles.aboutBold}>Community Building:</Text> Foster lasting relationships between customers, vendors, and organizers through favorites, reviews, and event participation{'\n\n'}
            
            <Text style={styles.aboutBold}>Strengthening the Mobile Food Industry{'\n'}</Text>
            Grubana connects food lovers, mobile kitchen owners, and event organizers in one powerful community platform. We're enriching the mobile food industry by providing the technology infrastructure that increases efficiency for all participants. Through real-time location sharing, intelligent event coordination, and community-driven food discovery, we're building a stronger, more connected mobile food ecosystem where everyone thrives together.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const createThemedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    backgroundColor: theme.colors.background.secondary,
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.accent.pink,
    ...theme.shadows.neonPink,
  },
  logo: {
    width: 450,
    height: 240,
    marginBottom: -60,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f5e8',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    padding: 20,
  },
  welcomeSection: {
    backgroundColor: '#00BFFF', // Neon blue background instead of white
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#00BFFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#00FFFF',
    borderTopWidth: 4,
    borderTopColor: '#87CEEB', // Light blue accent top border
  },
  welcomeText: {
    fontSize: 18,
    color: '#FFFFFF', // White text for better contrast on neon blue background
    fontWeight: '600',
    textAlign: 'center',
  },
  featureSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF69B4', // Lighter pink for better readability
    marginBottom: 15,
    textAlign: 'center',
  },
  featuresList: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent.blue,
    ...theme.shadows.neonBlue,
  },
  featureItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999', // Even lighter gray for better readability
    marginBottom: 5,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionSection: {
    marginVertical: 20,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent.pink,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    ...theme.shadows.neonPink,
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: theme.colors.text.primary,
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  aboutSection: {
    backgroundColor: theme.colors.background.secondary,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: theme.colors.accent.blue,
    ...theme.shadows.neonBlue,
  },
  aboutText: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  aboutBold: {
    fontWeight: 'bold',
    color: theme.colors.accent.pink,
  },
});

export default HomeScreen;
