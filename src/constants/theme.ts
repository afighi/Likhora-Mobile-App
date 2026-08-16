import { Platform } from 'react-native';

export const LikhoraColors = {
  // Aubergine #4A154B - Main brand color (journey card, selected tab state, key headings, primary navigation)
  primary: '#4A154B',
  primaryDark: '#350D36',
  primaryLight: '#611B62',
  primarySoft: '#F6EDF7',
  secondaryLavender: '#F2E5F3',
  softPurple: '#E4CFE5',

  // Blue #64C3EB - Informational guidance, supplier/location features, map pins, AI assistance
  aiBlue: '#64C3EB',
  aiBlueSoft: '#EBF7FD',
  infoBlue: '#64C3EB',

  // Green #5BB381 - Completed steps, healthy margins, positive progress, business milestones
  successGreen: '#5BB381',
  successGreenSoft: '#EEF8F2',

  // Yellow #E3B34C - Active work, pricing actions, in-progress states, high-attention CTAs
  highlightYellow: '#E3B34C',
  highlightYellowSoft: '#FCF7E9',

  // Pink/Red #CE375C - Warnings, margin alerts, retail/resale accents, secondary emphasis
  errorRed: '#CE375C',
  errorRedSoft: '#FAF0F3',

  // Charcoal ink #2A2130 - Primary text color (used instead of pure black for all typography)
  textPrimary: '#2A2130',
  textSecondary: '#7A6F80',
  textPlaceholder: '#A095A6',

  // Surface Containers & Backgrounds (Warm Parchment iOS Aesthetic)
  backgroundScreen: '#FAF8F5', // Warm parchment background instead of plain white
  parchmentBackground: '#FAF8F5',
  parchmentTrack: '#F2EEE7',
  cardBackground: '#FFFFFF', // Large rounded white cards
  cardBorder: 'rgba(42, 33, 48, 0.07)',
  inputBackground: '#F4F1EA',
  inputBorder: '#E8E3D8',
  inputFocusBorder: '#4A154B',
  border: '#E8E3D8',
} as const;

export const LikhoraFont = {
  fontFamily: Platform.select({
    ios: 'Montserrat, system-ui, sans-serif',
    android: 'Montserrat, sans-serif',
    web: 'Montserrat, "Montserrat Alternate", system-ui, -apple-system, sans-serif',
  }),
};

export const Colors = {
  light: {
    text: LikhoraColors.textPrimary,
    background: LikhoraColors.backgroundScreen,
    backgroundElement: LikhoraColors.cardBackground,
    backgroundSelected: LikhoraColors.secondaryLavender,
    textSecondary: LikhoraColors.textSecondary,
    primary: LikhoraColors.primary,
  },
  dark: {
    text: '#FFFFFF',
    background: '#1A121D',
    backgroundElement: '#261C2B',
    backgroundSelected: '#4A154B',
    textSecondary: '#B3A6B8',
    primary: '#64C3EB',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'Montserrat, sans-serif',
    serif: 'serif',
    rounded: 'Montserrat, sans-serif',
    mono: 'monospace',
  },
  default: {
    sans: 'Montserrat, sans-serif',
    serif: 'serif',
    rounded: 'Montserrat, sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: 'Montserrat, "Montserrat Alternate", system-ui, -apple-system, sans-serif',
    serif: 'var(--font-serif)',
    rounded: 'Montserrat, sans-serif',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 24, // 24px rounded corners for main white cards as specified
  pill: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
