const getCuisineIcon = (cuisineType) => {
    const icons = {
      Italian: '🍝',
      Mexican: '🌮',
      Chinese: '🍜',
      American: '🍔',
      // Add more cuisines as needed
    };
    return icons[cuisineType] || '🍽️'; // Default icon if cuisine type is not found
  };

  export { getCuisineIcon };