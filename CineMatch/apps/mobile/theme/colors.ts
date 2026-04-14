/**
 * CineMatch Design System — Color Palette
 * 
 * Based on the provided design reference:
 *   Primary:   #632E2E  (deep burgundy/maroon)
 *   Secondary: #2C2C2C  (dark charcoal)
 *   Tertiary:  #8C5E58  (muted rose/terracotta)
 *   Neutral:   #F5F5F5  (off-white)
 * 
 * Dark-mode-first with warm rose/burgundy accents.
 */

export const Colors = {
  // ── Primary Brand (Burgundy) ──────────────────
  primary: '#632E2E',          // Deep burgundy — CTAs, active states
  primaryDark: '#4A2020',      // Darker burgundy — pressed state
  primaryLight: '#8C5E58',     // Rose terracotta — lighter accent
  primaryMuted: 'rgba(99, 46, 46, 0.25)', // Burgundy tint for backgrounds

  // ── Tertiary / Accent (Rose) ──────────────────
  tertiary: '#8C5E58',         // Muted rose/terracotta
  tertiaryLight: '#B98E88',    // Light rose
  tertiaryFaded: 'rgba(140, 94, 88, 0.25)',

  // ── Rose Tints (from palette swatches) ────────
  rosePink: '#D4A5A5',         // Soft pink (buttons, labels)
  roseLight: '#E8C5C5',        // Very light rose tint
  rosePale: '#F0D5D5',         // Pale rose for highlighted text

  // ── Background & Surface ──────────────────────
  background: '#1A1A1A',       // Main dark background
  surface: '#2C2C2C',          // Card surfaces (Secondary)
  surfaceElevated: '#333333',  // Elevated cards, modals
  surfaceBorder: '#3A3A3A',    // Subtle card borders
  surfaceDim: '#222222',       // Slightly darker surface

  // ── CineBot Accent ────────────────────────────
  cinebot: '#8C5E58',          // Rose terracotta — CineBot brand
  cinebotDark: '#6B4440',
  cinebotLight: '#B98E88',
  cinebotGradientStart: '#8C5E58',
  cinebotGradientEnd: '#B98E88',

  // ── Text ──────────────────────────────────────
  textPrimary: '#F5F5F5',      // Neutral — main text
  textSecondary: '#B8B8B8',    // Muted gray with stronger contrast
  textTertiary: '#8C8C8C',     // Hint text with better readability
  textInverse: '#1A1A1A',      // Dark text on light backgrounds
  textRose: '#D4A5A5',         // Rose-tinted text for accents

  // ── Status & Feedback ─────────────────────────
  success: '#4CAF7D',          // Muted emerald
  warning: '#D4A55A',          // Warm amber
  error: '#C0392B',            // Deep red
  info: '#5B8DB8',             // Muted blue

  // ── Rating ────────────────────────────────────
  ratingGold: '#D4A55A',       // Warm gold (matches palette warmth)
  ratingEmpty: '#3A3A3A',      // Empty star

  // ── Match Score Ring ──────────────────────────
  matchHigh: '#4CAF7D',        // 80-100%
  matchMedium: '#D4A55A',      // 50-79%
  matchLow: '#C0392B',         // 0-49%

  // ── Mood Gradients ────────────────────────────
  moods: {
    laugh: { start: '#D4A55A', end: '#B8934E' },     // Warm gold
    cry: { start: '#5B8DB8', end: '#4A7BA3' },        // Soft blue
    thrill: { start: '#C0392B', end: '#943023' },     // Deep red
    relax: { start: '#4CAF7D', end: '#3D9068' },      // Calm green
    think: { start: '#8C5E58', end: '#6B4440' },      // Rose terracotta
  },

  // ── Genre Tag Colors ──────────────────────────
  genreTags: {
    action: '#C0392B',
    comedy: '#D4A55A',
    drama: '#8C5E58',
    horror: '#2C2C2C',
    scifi: '#5B8DB8',
    romance: '#D4A5A5',
    thriller: '#A0522D',
    animation: '#4CAF7D',
    documentary: '#6B6B6B',
    mystery: '#555555',
    fantasy: '#B98E88',
    crime: '#6B4440',
  },

  // ── Platform Brand Colors ─────────────────────
  platforms: {
    netflix: '#E50914',
    prime: '#00A8E1',
    hotstar: '#1F2F98',
    zee5: '#8230C5',
    sonyliv: '#070707',
    jiocinema: '#E8107C',
  },

  // ── Misc ──────────────────────────────────────
  overlay: 'rgba(0, 0, 0, 0.65)',
  shimmer: '#333333',
  divider: '#333333',
  tabBarBackground: '#1A1A1A',
  tabBarBorder: '#2C2C2C',
} as const;

export type ColorToken = keyof typeof Colors;
