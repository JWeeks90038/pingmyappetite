/**
 * Test script for the Smart Estimated Time Calculator
 * Run this to verify the calculation logic works correctly
 */

import { calculateEstimatedTime, getTimeDescription, getSuggestedTimeOptions } from './estimatedTimeCalculator.js';

// Test cases
const testCases = [
  {
    name: "Simple order - 2 burgers",
    data: {
      items: [
        { name: "Classic Burger", quantity: 2 }
      ],
      orderTime: new Date('2025-09-08T12:30:00'), // Lunch rush
      currentOrders: 0
    }
  },
  {
    name: "Complex order - Pizza and multiple items",
    data: {
      items: [
        { name: "Large Pizza", quantity: 1 },
        { name: "Grilled Chicken", quantity: 2 },
        { name: "Fries", quantity: 3 },
        { name: "Soda", quantity: 4 }
      ],
      orderTime: new Date('2025-09-08T18:00:00'), // Dinner rush
      currentOrders: 3
    }
  },
  {
    name: "Quick snack order",
    data: {
      items: [
        { name: "Chips", quantity: 2 },
        { name: "Water", quantity: 1 }
      ],
      orderTime: new Date('2025-09-08T15:00:00'), // Off-peak
      currentOrders: 0
    }
  },
  {
    name: "Large catering order",
    data: {
      items: [
        { name: "BBQ Platter", quantity: 5 },
        { name: "Grilled Special", quantity: 3 },
        { name: "Sandwich", quantity: 8 },
        { name: "Salad", quantity: 4 }
      ],
      orderTime: new Date('2025-09-08T11:45:00'), // Pre-lunch rush
      currentOrders: 2
    }
  },
  {
    name: "Late night order",
    data: {
      items: [
        { name: "Burger", quantity: 1 },
        { name: "Fried Chicken", quantity: 1 }
      ],
      orderTime: new Date('2025-09-08T23:30:00'), // Late night
      currentOrders: 1
    }
  }
];



testCases.forEach((testCase, index) => {

  
  const result = calculateEstimatedTime(testCase.data);
  const description = getTimeDescription(result.estimatedMinutes);
  const timeOptions = getSuggestedTimeOptions(result.estimatedMinutes);
  

  timeOptions.forEach(option => {
    const marker = option.isDefault ? ' ← (Auto-calculated)' : '';

  });

});
