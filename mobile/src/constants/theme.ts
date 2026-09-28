/**
 * RentHub design system — dark first, orange accent.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A2E',
    background: '#F6F7FB',
    backgroundElement: '#ffffff',
    backgroundSelected: '#FFEDE5',
    textSecondary: '#6B7280',
    accent: '#FF6B35',
    border: '#E5E7EB',
  },
  dark: {
    text: '#ffffff',
    background: '#0A0E1A',
    backgroundElement: '#141A2B',
    backgroundSelected: '#1F2740',
    textSecondary: '#9CA3AF',
    accent: '#FF6B35',
    border: 'rgba(255,255,255,0.08)',
  },
} as const;

export const C = Colors.dark;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
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
} as const;

export const MaxContentWidth = 960;

export const BottomTabInset = 64;
