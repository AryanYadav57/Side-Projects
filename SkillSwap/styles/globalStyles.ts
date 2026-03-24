import {StyleSheet} from 'react-native';

export const COLORS = {
  // Shared
  primary: '#FF3B3B',
  primaryDark: '#E02D2D',
  success: '#10B981',
  warning: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',

  // Glass design tokens
  glass: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.12)',
    card: 'rgba(255, 255, 255, 0.08)',
    cardStrong: 'rgba(255, 255, 255, 0.13)',
    tabBar: 'rgba(18, 20, 28, 0.95)',
  },

  // Light Mode (kept for compatibility)
  light: {
    background: '#F9FAFB',
    card: '#FFFFFF',
    text: '#11131A',
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    border: '#E5E7EB',
    primaryLight: '#FFEAEA',
  },

  // Dark Mode — true glass-black
  dark: {
    background: '#0D0F14',
    card: '#1A1C23',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
    textLight: 'rgba(255,255,255,0.35)',
    border: '#272A35',
    primaryLight: 'rgba(255,59,59,0.15)',
  },
} as const;

export type ThemeColors = typeof COLORS.light | typeof COLORS.dark;

// These are base styles that don't depend on theme
export const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenPadding: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Glass card utility
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
  },
});
