import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

const useResponsiveDesign = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  // Device type detection
  const isTablet = dimensions.width >= 768;
  const isPhone = dimensions.width < 768;
  const isSmallPhone = dimensions.width < 375;
  const isLargePhone = dimensions.width >= 414;

  // Orientation detection
  const isLandscape = dimensions.width > dimensions.height;
  const isPortrait = dimensions.height > dimensions.width;

  // Platform-specific checks
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  // Responsive dimensions
  const responsiveWidth = (percentage) => (dimensions.width * percentage) / 100;
  const responsiveHeight = (percentage) => (dimensions.height * percentage) / 100;

  // Safe area calculations (approximate)
  const safeAreaTop = isIOS ? (isLandscape ? 0 : 44) : 24;
  const safeAreaBottom = isIOS ? (isLandscape ? 21 : 34) : 0;

  return {
    // Screen dimensions
    width: dimensions.width,
    height: dimensions.height,
    
    // Device types
    isTablet,
    isPhone,
    isSmallPhone,
    isLargePhone,
    
    // Orientation
    isLandscape,
    isPortrait,
    
    // Platform
    isIOS,
    isAndroid,
    
    // Utility functions
    responsiveWidth,
    responsiveHeight,
    
    // Safe areas
    safeAreaTop,
    safeAreaBottom,
    
    // Responsive breakpoints
    breakpoints: {
      sm: dimensions.width >= 375,  // Small phones and up
      md: dimensions.width >= 414,  // Large phones and up
      lg: dimensions.width >= 768,  // Tablets and up
      xl: dimensions.width >= 1024, // Large tablets and up
    }
  };
};

export default useResponsiveDesign;
