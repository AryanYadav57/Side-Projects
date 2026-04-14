/**
 * CineMatch Design System — Typography
 * 
 * Uses Manrope for all text (per design reference).
 * Scale follows a modular type system with clear hierarchy.
 */

import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const FontFamilies = {
  heading: 'Manrope',
  body: 'Manrope',
  mono: 'SpaceMono',
} as const;

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
  '4xl': 44,
} as const;

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const LineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
};

export const Typography = StyleSheet.create({
  // ── Display ────────────────────────────────────
  displayLarge: {
    fontSize: FontSizes['4xl'],
    fontFamily: FontFamilies.heading,
    fontWeight: FontWeights.extrabold,
    lineHeight: FontSizes['4xl'] * LineHeights.tight,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },

  // ── Headings ───────────────────────────────────
  h1: {
    fontSize: FontSizes['3xl'],
    fontFamily: FontFamilies.heading,
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['3xl'] * LineHeights.tight,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamilies.heading,
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['2xl'] * LineHeights.tight,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamilies.heading,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.xl * LineHeights.normal,
    color: Colors.textPrimary,
  },
  h4: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamilies.heading,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.lg * LineHeights.normal,
    color: Colors.textPrimary,
  },

  // ── Body ───────────────────────────────────────
  bodyLarge: {
    fontSize: FontSizes.md,
    fontFamily: FontFamilies.body,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.md * LineHeights.relaxed,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: FontSizes.base,
    fontFamily: FontFamilies.body,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.base * LineHeights.relaxed,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamilies.body,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.sm * LineHeights.normal,
    color: Colors.textSecondary,
  },

  // ── Labels & Captions ─────────────────────────
  label: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamilies.body,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.sm * LineHeights.normal,
    color: Colors.textPrimary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  caption: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamilies.body,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.xs * LineHeights.normal,
    color: Colors.textTertiary,
  },

  // ── Special ────────────────────────────────────
  button: {
    fontSize: FontSizes.base,
    fontFamily: FontFamilies.body,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.base * LineHeights.normal,
    letterSpacing: 0.3,
  },
  chip: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamilies.body,
    fontWeight: FontWeights.medium,
    lineHeight: FontSizes.xs * LineHeights.normal,
  },
  rating: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamilies.body,
    fontWeight: FontWeights.bold,
    color: Colors.ratingGold,
  },
  matchScore: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamilies.body,
    fontWeight: FontWeights.extrabold,
    color: Colors.success,
  },
});
