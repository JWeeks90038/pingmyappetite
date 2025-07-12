const getCuisineIcon = (cuisineType) => {
    const icons = {
      american: '�',
      'asian-fusion': '🥢',
      bbq: '🍖',
      burgers: '�',
      chinese: '🥡',
      coffee: '☕',
      desserts: '🍰',
      drinks: '🥤',
      greek: '🥙',
      halal: '🕌',
      healthy: '🥗',
      indian: '�',
      italian: '🍝',
      korean: '🍲',
      latin: '🌯',
      mediterranean: '🫒',
      mexican: '�',
      pizza: '🍕',
      seafood: '🦐',
      southern: '🍗',
      sushi: '🍣',
      thai: '🍜',
      vegan: '🌱',
      wings: '🍗'
    };
    return icons[cuisineType] || '🍽️'; // Default icon if cuisine type is not found
  };

  export { getCuisineIcon };