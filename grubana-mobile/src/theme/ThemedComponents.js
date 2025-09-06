import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';

// Themed Container Components
export const ThemedView = ({ style, children, variant = 'primary', ...props }) => {
  const theme = useTheme();
  
  const backgroundColors = {
    primary: theme.colors.background.primary,
    secondary: theme.colors.background.secondary,
    surface: theme.colors.background.surface,
  };

  return (
    <View 
      style={[
        { backgroundColor: backgroundColors[variant] },
        style
      ]} 
      {...props}
    >
      {children}
    </View>
  );
};

// Themed Text Components
export const ThemedText = ({ style, children, variant = 'primary', ...props }) => {
  const theme = useTheme();
  
  const textColors = {
    primary: theme.colors.text.primary,
    secondary: theme.colors.text.secondary,
    tertiary: theme.colors.text.tertiary,
    accent: theme.colors.accent.pink,
    accentBlue: theme.colors.accent.blue,
  };

  return (
    <Text 
      style={[
        { color: textColors[variant] },
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

// Themed Button Components
export const ThemedButton = ({ 
  style, 
  textStyle,
  children, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  onPress,
  ...props 
}) => {
  const theme = useTheme();
  
  const getButtonStyles = () => {
    const baseStyle = {
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    const sizeStyles = {
      small: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 36,
      },
      medium: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        minHeight: 48,
      },
      large: {
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
        minHeight: 56,
      },
    };

    if (disabled) {
      return {
        ...baseStyle,
        ...sizeStyles[size],
        backgroundColor: theme.colors.button.disabled.background,
      };
    }

    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.button.primary.background,
        ...theme.shadows.neonPink,
      },
      secondary: {
        backgroundColor: theme.colors.button.secondary.background,
        ...theme.shadows.neonBlue,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.button.ghost.border,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.accent.blue,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getTextStyles = () => {
    const baseTextStyle = {
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: 'center',
    };

    const sizeTextStyles = {
      small: { fontSize: theme.typography.fontSize.sm },
      medium: { fontSize: theme.typography.fontSize.md },
      large: { fontSize: theme.typography.fontSize.lg },
    };

    if (disabled) {
      return {
        ...baseTextStyle,
        ...sizeTextStyles[size],
        color: theme.colors.button.disabled.text,
      };
    }

    const variantTextStyles = {
      primary: { color: theme.colors.button.primary.text },
      secondary: { color: theme.colors.button.secondary.text },
      ghost: { color: theme.colors.button.ghost.text },
      outline: { color: theme.colors.accent.blue },
    };

    return {
      ...baseTextStyle,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
    };
  };

  return (
    <TouchableOpacity 
      style={[getButtonStyles(), style]} 
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      activeOpacity={0.8}
      {...props}
    >
      <Text style={[getTextStyles(), textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

// Themed Card Component
export const ThemedCard = ({ style, children, variant = 'default', ...props }) => {
  const theme = useTheme();
  
  const getCardStyles = () => {
    const baseStyle = {
      backgroundColor: theme.colors.background.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      ...theme.shadows.medium,
    };

    const variantStyles = {
      default: {},
      elevated: {
        ...theme.shadows.large,
      },
      bordered: {
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      neon: {
        borderWidth: 1,
        borderColor: theme.colors.accent.pink,
        ...theme.shadows.neonPink,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
    };
  };

  return (
    <View style={[getCardStyles(), style]} {...props}>
      {children}
    </View>
  );
};

// Themed Input Component (for TextInput styling)
export const getThemedInputStyle = (theme, variant = 'default') => {
  const baseStyle = {
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  };

  const variantStyles = {
    default: {},
    focused: {
      borderColor: theme.colors.accent.pink,
      ...theme.shadows.neonPink,
    },
    error: {
      borderColor: theme.colors.status.error,
    },
  };

  return {
    ...baseStyle,
    ...variantStyles[variant],
  };
};
