/**
 * Debug script to test the estimated time calculation
 */

// Import the calculator function
const { calculateEstimatedTime, getSuggestedTimeOptions, getTimeDescription } = require('./grubana-mobile/src/utils/estimatedTimeCalculator');

// Test different order scenarios
const testOrders = [
  {
    name: 'Simple Drink Order',
    items: [
      { name: 'Soda', quantity: 1 },
      { name: 'Water', quantity: 1 }
    ]
  },
  {
    name: 'Lunch Combo',
    items: [
      { name: 'Burger', quantity: 1 },
      { name: 'Fries', quantity: 1 },
      { name: 'Drink', quantity: 1 }
    ]
  },
  {
    name: 'Complex Order',
    items: [
      { name: 'Grilled Chicken Special', quantity: 2 },
      { name: 'BBQ Ribs', quantity: 1 },
      { name: 'Side Salad', quantity: 2 },
      { name: 'Appetizer Platter', quantity: 1 }
    ]
  },
  {
    name: 'Pizza Order',
    items: [
      { name: 'Large Pizza', quantity: 2 },
      { name: 'Garlic Bread', quantity: 1 }
    ]
  },
  {
    name: 'Unknown Items (Default)',
    items: [
      { name: 'Mystery Item A', quantity: 1 },
      { name: 'Unknown Food B', quantity: 2 }
    ]
  }
];



testOrders.forEach((testOrder, index) => {

  
  // Test during lunch rush (12 PM)
  const lunchTime = new Date();
  lunchTime.setHours(12, 0, 0, 0);
  
  const calculation = calculateEstimatedTime({
    items: testOrder.items,
    orderTime: lunchTime,
    truckData: {},
    currentOrders: 3 // Simulate 3 orders in queue
  });
  

  // Show suggested time options
  const options = getSuggestedTimeOptions(calculation.estimatedMinutes);

  options.forEach(option => {
    const marker = option.isDefault ? ' ← Default' : '';

  });
});


