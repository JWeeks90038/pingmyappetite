// Database initialization script for Event System (Phase 1)
// Run this to create the initial Firestore collections and test data

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

// Firebase config (using environment variables)
const firebaseConfig = {
  // Your firebase config will be loaded from environment
};

// Initialize Firebase (this will use your existing config)
import { db } from './src/firebase.js';

async function initializeEventSystem() {


  try {
    // Create sample event organizer (for testing)
    const sampleOrganizerId = 'sample-event-organizer-001';
    const sampleOrganizerData = {
      uid: sampleOrganizerId,
      role: 'event-organizer',
      username: 'SampleEventOrg',
      email: 'events@sample.org',
      organizationName: 'Sample Events Co.',
      organizationType: 'private',
      contactPerson: 'Event Manager',
      phone: '+1-555-0123',
      address: '123 Event Street, Event City, CA 90210',
      website: 'https://sampleevents.com',
      experienceYears: '5',
      eventDescription: 'We organize food truck festivals and community events.',
      plan: 'basic',
      subscriptionStatus: 'active',
      createdAt: serverTimestamp(),
    };


    await setDoc(doc(db, 'users', sampleOrganizerId), sampleOrganizerData);


    // Create sample event
    const sampleEventId = 'sample-event-001';
    const sampleEventData = {
      eventId: sampleEventId,
      organizerId: sampleOrganizerId,
      eventName: 'Downtown Food Truck Festival',
      description: 'Join us for the biggest food truck festival in the city! Over 20 food trucks, live music, and family-friendly activities.',
      eventType: 'festival',
      location: {
        address: '456 Festival Ave, Downtown, CA 90210',
        coordinates: { lat: 34.0522, lng: -118.2437 },
        venue: 'Central Park'
      },
      dates: {
        startDate: Timestamp.fromDate(new Date('2025-09-15T10:00:00')),
        endDate: Timestamp.fromDate(new Date('2025-09-15T22:00:00')),
        recurring: false,
        schedule: [
          { day: 'Saturday', startTime: '10:00 AM', endTime: '10:00 PM' }
        ]
      },
      vendorInfo: {
        maxVendors: 25,
        currentVendors: 0,
        vendorTypes: ['food-truck', 'trailer'],
        applicationFee: 0,
        vendorRequirements: 'Valid business license, food safety certification, and comprehensive insurance required.'
      },
      eventDetails: {
        estimatedAttendance: 5000,
        entryFee: 0,
        ageRestrictions: 'All ages welcome',
        parkingInfo: 'Free parking available in the adjacent lot. Additional street parking nearby.',
        amenities: ['restrooms', 'seating', 'entertainment', 'wifi']
      },
      status: 'published',
      socialMedia: {
        website: 'https://downtownfoodfest.com',
        facebook: 'https://facebook.com/downtownfoodfest',
        instagram: '@downtownfoodfest'
      },
      contactInfo: {
        phone: '+1-555-0123',
        email: 'info@downtownfoodfest.com'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };


    await setDoc(doc(db, 'events', sampleEventId), sampleEventData);


    // Create sample event application
    const sampleApplicationId = 'sample-application-001';
    const sampleApplicationData = {
      applicationId: sampleApplicationId,
      eventId: sampleEventId,
      truckId: 'sample-truck-owner-001', // This should match an existing truck owner
      organizerId: sampleOrganizerId,
      truckInfo: {
        truckName: 'Gourmet Street Eats',
        ownerName: 'Chef Rodriguez',
        cuisine: 'Mexican Fusion',
        kitchenType: 'truck',
        description: 'Authentic Mexican flavors with a modern twist. Farm-to-table ingredients and creative presentations.',
        menuUrl: 'https://gourmetstreeteats.com/menu'
      },
      applicationData: {
        appliedAt: serverTimestamp(),
        message: 'We would love to participate in your festival! Our truck specializes in Mexican fusion cuisine and we have 5 years of festival experience.',
        requirements: {
          hasBusinessLicense: true,
          hasFoodSafetyCert: true,
          hasInsurance: true
        }
      },
      status: 'pending',
      reviewedAt: null,
      reviewedBy: null,
      notes: ''
    };


  } catch (error) {

  }
}

// Run the initialization
initializeEventSystem();
