// Shared cuisine type constants to ensure consistency across the application

export const CUISINE_TYPES = [
  { value: 'american', label: 'American' },
  { value: 'asian-fusion', label: 'Asian Fusion' },
  { value: 'bbq', label: 'BBQ' },
  { value: 'burgers', label: 'Burgers' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'coffee', label: 'Coffee & Café' },
  { value: 'desserts', label: 'Desserts & Sweets' },
  { value: 'drinks', label: 'Drinks & Beverages' },
  { value: 'greek', label: 'Greek' },
  { value: 'halal', label: 'Halal' },
  { value: 'healthy', label: 'Healthy & Fresh' },
  { value: 'indian', label: 'Indian' },
  { value: 'italian', label: 'Italian' },
  { value: 'korean', label: 'Korean' },
  { value: 'caribbean', label: 'Caribbean' },
  { value: 'latin', label: 'Latin American' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'pizza', label: 'Pizza' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'southern', label: 'Southern Comfort' },
  { value: 'sushi', label: 'Sushi & Japanese' },
  { value: 'thai', label: 'Thai' },
  { value: 'vegan', label: 'Vegan & Vegetarian' },
  { value: 'wings', label: 'Wings' },
  { value: 'other', label: 'Other' }
];

// Create a mapping object for quick lookups
export const CUISINE_DISPLAY_NAMES = CUISINE_TYPES.reduce((acc, cuisine) => {
  acc[cuisine.value] = cuisine.label;
  return acc;
}, {});

// Helper function to get display name for cuisine
export const getCuisineDisplayName = (cuisineKey) => {
  return CUISINE_DISPLAY_NAMES[cuisineKey] || cuisineKey || 'Unknown';
};

// Function to normalize cuisine values (in case of variations)
export const normalizeCuisineValue = (value) => {
  if (!value) return null;
  
  const normalized = value.toLowerCase().trim();
  
  // Handle common variations and typos
  const variations = {
    'asian': 'asian-fusion',
    'bbque': 'bbq',
    'barbeque': 'bbq',
    'cafe': 'coffee',
    'coffee-shop': 'coffee',
    'dessert': 'desserts',
    'sweets': 'desserts',
    'beverage': 'drinks',
    'beverages': 'drinks',
    'mediterranean': 'mediterranean',
    'med': 'mediterranean',
    'latin-american': 'latin',
    'latino': 'latin',
    'japanese': 'sushi',
    'japan': 'sushi',
    'vegetarian': 'vegan',
    'veggie': 'vegan',
    'southern-comfort': 'southern',
    'comfort-food': 'southern'
  };
  
  return variations[normalized] || normalized;
};
