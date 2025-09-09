/**
 * Smart Estimated Time Calculator
 * Calculates order preparation time based on multiple factors
 */

export const calculateEstimatedTime = (orderData) => {
  const {
    items = [],
    orderTime = new Date(),
    truckData = {},
    currentOrders = 0
  } = orderData;

  // Base preparation times by item complexity (in minutes)
  const basePreparationTimes = {
    // Quick items
    'drink': 1,
    'beverage': 1,
    'soda': 1,
    'water': 0.5,
    'snack': 2,
    'chips': 1,
    'cookie': 1,
    
    // Medium complexity
    'sandwich': 5,
    'burger': 7,
    'wrap': 5,
    'salad': 4,
    'soup': 3,
    'side': 3,
    'fries': 4,
    'appetizer': 5,
    
    // Complex items
    'pizza': 12,
    'pasta': 8,
    'entree': 10,
    'main': 10,
    'grill': 12,
    'bbq': 15,
    'fried': 8,
    'grilled': 10,
    'special': 12,
    
    // Default fallback
    'default': 6
  };

  // Calculate base time from items
  let baseTime = 0;
  let itemComplexity = 0;
  
  items.forEach(item => {
    const itemName = (item.name || '').toLowerCase();
    const quantity = item.quantity || 1;
    
    // Find matching preparation time
    let prepTime = basePreparationTimes.default;
    
    for (const [category, time] of Object.entries(basePreparationTimes)) {
      if (itemName.includes(category)) {
        prepTime = time;
        break;
      }
    }
    
    // Add time for each quantity, with diminishing returns for bulk
    const quantityMultiplier = quantity > 1 ? 1 + (quantity - 1) * 0.7 : 1;
    baseTime += prepTime * quantityMultiplier;
    
    // Track complexity for additional calculations
    itemComplexity += prepTime * quantity;
  });

  // Time of day multipliers
  const hour = orderTime.getHours();
  let timeMultiplier = 1.0;
  
  if (hour >= 11 && hour <= 13) {
    // Lunch rush
    timeMultiplier = 1.4;
  } else if (hour >= 17 && hour <= 19) {
    // Dinner rush
    timeMultiplier = 1.3;
  } else if (hour >= 7 && hour <= 9) {
    // Breakfast rush
    timeMultiplier = 1.2;
  } else if (hour >= 22 || hour <= 6) {
    // Late night/early morning - potentially slower
    timeMultiplier = 1.1;
  }

  // Queue factor based on current orders
  let queueMultiplier = 1.0;
  if (currentOrders > 0) {
    // Add 2-3 minutes per order in queue, with diminishing returns
    queueMultiplier = 1 + (currentOrders * 0.3);
  }

  // Day of week factor
  const dayOfWeek = orderTime.getDay();
  let dayMultiplier = 1.0;
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Weekend - potentially busier
    dayMultiplier = 1.1;
  } else if (dayOfWeek === 1) {
    // Monday - potentially slower start
    dayMultiplier = 0.95;
  }

  // Calculate final estimated time
  let estimatedMinutes = baseTime * timeMultiplier * queueMultiplier * dayMultiplier;
  
  // Apply minimum and maximum bounds
  estimatedMinutes = Math.max(5, Math.min(60, estimatedMinutes));
  
  // Round to nearest 5 minutes for better UX
  estimatedMinutes = Math.round(estimatedMinutes / 5) * 5;

  return {
    estimatedMinutes,
    breakdown: {
      baseTime: Math.round(baseTime),
      timeOfDayFactor: timeMultiplier,
      queueFactor: queueMultiplier,
      dayFactor: dayMultiplier,
      currentOrders,
      complexity: itemComplexity
    }
  };
};

// Get user-friendly time description
export const getTimeDescription = (minutes) => {
  if (minutes <= 10) return `${minutes} min - Quick prep`;
  if (minutes <= 20) return `${minutes} min - Standard`;
  if (minutes <= 35) return `${minutes} min - Complex order`;
  return `${minutes} min - Extended prep`;
};

// Generate suggested time options for override
export const getSuggestedTimeOptions = (calculatedTime) => {
  const base = calculatedTime;
  return [
    { value: Math.max(5, base - 10), label: `${Math.max(5, base - 10)} min (Express)` },
    { value: Math.max(5, base - 5), label: `${Math.max(5, base - 5)} min (Fast)` },
    { value: base, label: `${base} min (Calculated)`, isDefault: true },
    { value: base + 5, label: `${base + 5} min (Conservative)` },
    { value: base + 10, label: `${base + 10} min (Extended)` },
    { value: base + 15, label: `${base + 15} min (Busy period)` }
  ];
};
