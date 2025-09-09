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

console.log('🧪 Testing Smart Estimated Time Calculator\n');

testCases.forEach((testCase, index) => {
  console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
  
  const result = calculateEstimatedTime(testCase.data);
  const description = getTimeDescription(result.estimatedMinutes);
  const timeOptions = getSuggestedTimeOptions(result.estimatedMinutes);
  
  console.log(`📋 Order items: ${testCase.data.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}`);
  console.log(`🕐 Order time: ${testCase.data.orderTime.toLocaleTimeString()} (${testCase.data.orderTime.toLocaleDateString()})`);
  console.log(`📊 Queue size: ${testCase.data.currentOrders} orders`);
  console.log(`\n⏱️  CALCULATED TIME: ${result.estimatedMinutes} minutes`);
  console.log(`📝 Description: ${description}`);
  
  console.log('\n🔍 Breakdown:');
  console.log(`   Base prep time: ${result.breakdown.baseTime} min`);
  console.log(`   Time of day factor: ${result.breakdown.timeOfDayFactor}x`);
  console.log(`   Queue factor: ${result.breakdown.queueFactor}x`);
  console.log(`   Day factor: ${result.breakdown.dayFactor}x`);
  console.log(`   Item complexity: ${result.breakdown.complexity}`);
  
  console.log('\n⚙️  Override Options:');
  timeOptions.forEach(option => {
    const marker = option.isDefault ? ' ← (Auto-calculated)' : '';
    console.log(`   ${option.label}${marker}`);
  });
  
  console.log('\n' + '='.repeat(60));
});

console.log('\n✅ Testing complete!');
console.log('\n📊 Summary of Features:');
console.log('• Dynamic time calculation based on item complexity');
console.log('• Time-of-day rush hour adjustments');
console.log('• Queue size impact on preparation time');
console.log('• Weekend/weekday variations');
console.log('• Override options for manual adjustment');
console.log('• Smart minimum/maximum bounds (5-60 minutes)');
console.log('• Rounded to 5-minute intervals for better UX');
