// Test script to verify vendor application emails are working
const { sendVendorApplicationNotification, sendVendorApplicationConfirmation } = require('./shared/functions/vendorApplicationEmailService.js');

// Test data
const testApplicationData = {
  businessName: 'Test Food Truck',
  contactName: 'Test Owner',
  contactEmail: 'grubana.co@gmail.com',
  contactPhone: '760-271-1244',
  equipmentType: 'food-truck',
  cuisineType: 'Mexican',
  menuDescription: 'Authentic Mexican street food',
  eventTitle: 'Test Event',
  eventDate: '2025-09-15',
  eventTime: '12:00 PM',
  eventLocation: 'Test Location'
};

const testOrganizerData = {
  email: 'grubana.co@gmail.com',
  displayName: 'Test Organizer'
};

async function testEmails() {

  
  try {

    await sendVendorApplicationNotification(testApplicationData, testOrganizerData);

    

    await sendVendorApplicationConfirmation(testApplicationData);

  
  } catch (error) {
  
  }
}

testEmails();
