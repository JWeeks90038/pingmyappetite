/**
 * Grubana Mobile App - Dark Neon Theme
 * Centralized color system for consistent theming across all components
 */

export const colors = {
  // Base Backgrounds
  background: {
    primary: '#0B0B1A',      // Dark navy, almost black
    secondary: '#1A1036',    // Deep purple tone for contrast areas
    surface: '#1A1036',      // Cards, modals, elevated surfaces
    overlay: 'rgba(11, 11, 26, 0.95)', // Semi-transparent overlay
  },

  // Accent Colors with Neon Glow
  accent: {
    pink: '#FF4EC9',         // Primary neon pink
    blue: '#4DBFFF',         // Secondary neon blue
    blueVariant: '#6FE3FF',  // Soft neon blue variant
  },

  // Status Colors
  status: {
    success: '#00E676',      // Only for order progress/success states
    warning: '#FFB74D',      // Warning states
    error: '#F44336',        // Error states
    info: '#4DBFFF',         // Info states (use accent blue)
  },

  // Text Colors
  text: {
    primary: '#FFFFFF',      // Primary text
    secondary: '#B0B3C2',    // Secondary labels and descriptions
    tertiary: '#7B7D8A',     // Placeholder text, disabled states
    inverse: '#0B0B1A',      // Text on light backgrounds (rare)
  },

  // Special Colors
  rating: '#FFD700',         // Gold stars for ratings
  border: '#2A2A3A',         // Subtle borders
  divider: '#1F1F2E',        // Dividers and separators

  // Button and Interactive States
  button: {
    primary: {
      background: '#FF4EC9',
      text: '#FFFFFF',
      shadow: 'rgba(255, 78, 201, 0.4)',
    },
    secondary: {
      background: '#4DBFFF',
      text: '#FFFFFF',
      shadow: 'rgba(77, 191, 255, 0.4)',
    },
    ghost: {
      background: 'transparent',
      border: '#FF4EC9',
      text: '#FF4EC9',
    },
    disabled: {
      background: '#2A2A3A',
      text: '#7B7D8A',
    },
  },
};

// Shadow and Glow Effects
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  neonPink: {
    shadowColor: '#FF4EC9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  neonBlue: {
    shadowColor: '#4DBFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Typography
export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export default {
  colors,
  shadows,
  typography,
  spacing,
  borderRadius,
};
