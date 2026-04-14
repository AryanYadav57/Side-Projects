/**
 * CineMatch Design System — Theme Provider
 * 
 * Centralized theme export and React Native Paper configuration.
 * Uses the burgundy/rose dark-mode palette from the design reference.
 */

export { Colors } from './colors';
export { Typography, FontSizes, FontWeights, FontFamilies } from './typography';
export { Spacing, BorderRadius, Shadows, Layout } from './spacing';

import { MD3DarkTheme } from 'react-native-paper';
import { configureFonts } from 'react-native-paper';
import { Colors } from './colors';

/**
 * React Native Paper custom theme (Material Design 3 — Dark)
 * Mapped to the burgundy/rose/charcoal design system.
 */
export const CineMatchTheme = {
  ...MD3DarkTheme,
  dark: true,
  fonts: configureFonts({
    config: {
      displayLarge: { fontFamily: 'Manrope-ExtraBold', fontWeight: '800' },
      displayMedium: { fontFamily: 'Manrope-Bold', fontWeight: '700' },
      displaySmall: { fontFamily: 'Manrope-Bold', fontWeight: '700' },
      headlineLarge: { fontFamily: 'Manrope-Bold', fontWeight: '700' },
      headlineMedium: { fontFamily: 'Manrope-Bold', fontWeight: '700' },
      headlineSmall: { fontFamily: 'Manrope-SemiBold', fontWeight: '600' },
      titleLarge: { fontFamily: 'Manrope-SemiBold', fontWeight: '600' },
      titleMedium: { fontFamily: 'Manrope-Medium', fontWeight: '500' },
      titleSmall: { fontFamily: 'Manrope-Medium', fontWeight: '500' },
      labelLarge: { fontFamily: 'Manrope-Medium', fontWeight: '500' },
      labelMedium: { fontFamily: 'Manrope-Medium', fontWeight: '500' },
      labelSmall: { fontFamily: 'Manrope-Medium', fontWeight: '500' },
      bodyLarge: { fontFamily: 'Manrope', fontWeight: '400' },
      bodyMedium: { fontFamily: 'Manrope', fontWeight: '400' },
      bodySmall: { fontFamily: 'Manrope', fontWeight: '400' },
      default: { fontFamily: 'Manrope', fontWeight: '400' },
    } as any,
  }) as any,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.primary,
    primaryContainer: Colors.surfaceElevated,
    secondary: Colors.tertiary,
    secondaryContainer: Colors.cinebotDark,
    tertiary: Colors.rosePink,
    surface: Colors.surface,
    surfaceVariant: Colors.surfaceElevated,
    background: Colors.background,
    error: Colors.error,
    onPrimary: Colors.textPrimary,          // White text on burgundy
    onPrimaryContainer: Colors.textPrimary,
    onSecondary: Colors.textPrimary,
    onSurface: Colors.textPrimary,
    onSurfaceVariant: Colors.textSecondary,
    onBackground: Colors.textPrimary,
    onError: Colors.textPrimary,
    outline: Colors.surfaceBorder,
    outlineVariant: Colors.divider,
    elevation: {
      level0: 'transparent',
      level1: Colors.surface,
      level2: Colors.surfaceElevated,
      level3: Colors.surfaceElevated,
      level4: Colors.surfaceElevated,
      level5: Colors.surfaceElevated,
    },
  },
  roundness: 12,
};

export type AppTheme = typeof CineMatchTheme;
