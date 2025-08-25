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
  console.log('🏗️ Initializing Event System Database...\n');

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

    console.log('📋 Creating sample event organizer...');
    await setDoc(doc(db, 'users', sampleOrganizerId), sampleOrganizerData);
    console.log('✅ Sample event organizer created');

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

    console.log('🎪 Creating sample event...');
    await setDoc(doc(db, 'events', sampleEventId), sampleEventData);
    console.log('✅ Sample event created');

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

    console.log('📄 Creating sample event application...');
    await setDoc(doc(db, 'eventApplications', sampleApplicationId), sampleApplicationData);
    console.log('✅ Sample event application created');

    console.log('\n🎉 Event System Database Initialization Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ Event organizer role added to signup form');
    console.log('✅ Firestore security rules updated');
    console.log('✅ Event Dashboard component created');
    console.log('✅ Sample data created for testing');
    console.log('✅ Routing configured for event organizers');
    
    console.log('\n🔗 Collections Created:');
    console.log('- events (for festival/event data)');
    console.log('- eventApplications (for vendor applications)');
    console.log('- users (enhanced with event organizer fields)');

    console.log('\n🧪 Test the system:');
    console.log('1. Sign up as an "Event Organizer"');
    console.log('2. Navigate to /event-dashboard');
    console.log('3. View the sample event and application data');
    console.log('4. Ready for Phase 2: Event Creation Form');

  } catch (error) {
    console.error('❌ Error initializing event system:', error);
  }
}

// Run the initialization
initializeEventSystem();
