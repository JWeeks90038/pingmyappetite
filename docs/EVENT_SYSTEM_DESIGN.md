// Event System Design Document
// Implementation plan for Food Truck Festival/Event management in Grubana

OVERVIEW:
==========
Add "Event Organizer" role to create and manage festivals/events where food trucks can participate.
This creates a three-way ecosystem: Customers → Events ← Food Trucks

NEW USER ROLE:
==============
- Role: "event-organizer" 
- Purpose: Create and manage food truck festivals, events, markets
- Access: Event management dashboard, vendor coordination

DATABASE SCHEMA:
================

1. EVENTS COLLECTION (/events/{eventId})
   Fields:
   - eventId: string (auto-generated)
   - organizerId: string (user UID of event organizer)
   - eventName: string
   - description: string
   - eventType: string ("festival", "market", "fair", "private", "corporate")
   - location: object
     - address: string
     - coordinates: { lat: number, lng: number }
     - venue: string
   - dates: object
     - startDate: timestamp
     - endDate: timestamp
     - recurring: boolean
     - schedule: array of { day: string, startTime: string, endTime: string }
   - vendorInfo: object
     - maxVendors: number
     - currentVendors: number
     - vendorTypes: array ["food-truck", "trailer", "booth", "cart"]
     - applicationFee: number (optional)
     - vendorRequirements: string
   - eventDetails: object
     - estimatedAttendance: number
     - entryFee: number (0 for free)
     - ageRestrictions: string
     - parkingInfo: string
     - amenities: array ["restrooms", "seating", "entertainment", "wifi"]
   - status: string ("draft", "published", "active", "completed", "cancelled")
   - socialMedia: object
     - website: string
     - facebook: string
     - instagram: string
   - contactInfo: object
     - phone: string
     - email: string
   - createdAt: timestamp
   - updatedAt: timestamp

2. EVENT_APPLICATIONS COLLECTION (/eventApplications/{applicationId})
   Fields:
   - applicationId: string (auto-generated)
   - eventId: string (reference to event)
   - truckId: string (truck owner UID)
   - organizerId: string (event organizer UID)
   - truckInfo: object
     - truckName: string
     - ownerName: string
     - cuisine: string
     - kitchenType: string
     - description: string
     - menuUrl: string
   - applicationData: object
     - appliedAt: timestamp
     - message: string (optional application message)
     - requirements: object (any specific requirements met)
   - status: string ("pending", "approved", "rejected", "waitlisted")
   - reviewedAt: timestamp
   - reviewedBy: string (organizer UID)
   - notes: string (organizer notes)

3. ENHANCED USERS COLLECTION (add event organizer fields)
   For role: "event-organizer":
   - organizationName: string
   - organizationType: string ("non-profit", "city", "private", "corporate")
   - contactPerson: string
   - phone: string
   - email: string
   - address: string
   - website: string
   - licenseNumber: string (optional)
   - experienceYears: number
   - pastEvents: array of event references

FEATURES TO IMPLEMENT:
=====================

1. EVENT ORGANIZER SIGNUP
   - New signup flow for event organizers
   - Organization verification process
   - Dashboard for event management

2. EVENT CREATION & MANAGEMENT
   - Create new events with all details
   - Edit existing events
   - Vendor application review system
   - Event analytics and reporting

3. FOOD TRUCK INTEGRATION
   - Event discovery for truck owners
   - Application system to join events
   - Event calendar integration in truck dashboard

4. CUSTOMER FEATURES
   - Browse upcoming events
   - Filter events by location, date, cuisine types
   - See which trucks will be at each event
   - Event-specific notifications
   - Navigation to events

5. NOTIFICATIONS SYSTEM
   - Event reminders for customers
   - Application status updates for truck owners
   - Event updates for all participants

USER FLOWS:
===========

EVENT ORGANIZER:
1. Sign up as event organizer
2. Create event with details
3. Publish event for truck applications
4. Review and approve truck applications
5. Manage event day-of logistics
6. View post-event analytics

FOOD TRUCK OWNER:
1. Browse available events
2. Apply to relevant events
3. Receive application status updates
4. Manage accepted events in calendar
5. Check in at events

CUSTOMER:
1. Discover events near them
2. See which trucks will attend
3. Get directions to events
4. Receive event reminders
5. Rate/review events

IMPLEMENTATION PHASES:
=====================

PHASE 1: Database & Authentication
- Add event-organizer role
- Create events and eventApplications collections
- Update Firestore security rules

PHASE 2: Event Organizer Interface
- Event organizer signup component
- Event creation form
- Event management dashboard
- Application review system

PHASE 3: Food Truck Integration  
- Event discovery in truck dashboard
- Application submission system
- Event calendar for truck owners

PHASE 4: Customer Features
- Event browsing interface
- Event details pages
- Navigation integration
- Event-based notifications

PHASE 5: Advanced Features
- Event analytics
- Recurring events
- Payment integration for vendor fees
- Review and rating system

This system creates a powerful three-way marketplace that will significantly enhance Grubana's value proposition and differentiate it from simple food truck tracking apps.
