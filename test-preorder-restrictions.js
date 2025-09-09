// Pre-order restriction test and documentation
// This documents the new pre-order restrictions for closed mobile kitchens



// Simulate business hours for testing
const mockBusinessHours = {
  open: {
    monday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    tuesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    wednesday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    thursday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    friday: { open: '9:00 AM', close: '5:00 PM', closed: false },
    saturday: { open: '10:00 AM', close: '6:00 PM', closed: false },
    sunday: { open: '10:00 AM', close: '4:00 PM', closed: false },
  },
  closed: {
    monday: { open: '9:00 AM', close: '5:00 PM', closed: true },
    tuesday: { open: '9:00 AM', close: '5:00 PM', closed: true },
    wednesday: { open: '9:00 AM', close: '5:00 PM', closed: true },
    thursday: { open: '9:00 AM', close: '5:00 PM', closed: true },
    friday: { open: '9:00 AM', close: '5:00 PM', closed: true },
    saturday: { open: '10:00 AM', close: '6:00 PM', closed: true },
    sunday: { open: '10:00 AM', close: '4:00 PM', closed: true },
  }
};

