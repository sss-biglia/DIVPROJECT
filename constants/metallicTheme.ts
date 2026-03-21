import { TextStyle, ViewStyle } from 'react-native';

// Main brand color
export const accentColor = '#98A869';
export const accentColorLight = '#b8c87a';

// Base dark theme colors
export const darkColors = {
  background: '#121212',
  card: '#1E1E1E',
  cardSecondary: '#2a2a2a',
  textPrimary: '#F5F5F0',
  textSecondary: '#A8B89C',
  textTertiary: '#6b6b6b',
  border: '#363636',
  borderTop: '#484848',
  borderDefault: 'rgba(255,255,255,0.06)',
};

// Gradients
export const metallicGradient = ['#2a2a2a', '#1a1a1a'];
export const accentGradient = ['#b0c27e', '#7a8a54'];

// Reusable Style Objects
type NamedStyles = {
  [key: string]: ViewStyle | TextStyle;
};

export const metallicStyles: NamedStyles = {
  container: {
    backgroundColor: darkColors.background,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkColors.border,
    borderTopColor: darkColors.borderTop,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  accentCard: {
    borderColor: accentColor,
    borderTopColor: accentColorLight,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  subtleAccent: {
    borderColor: 'rgba(152, 168, 105, 0.4)',
    backgroundColor: 'rgba(152, 168, 105, 0.1)',
  },
  title1: {
    color: darkColors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  title2: {
    color: darkColors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  headline: {
    color: darkColors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    color: darkColors.textPrimary,
    fontSize: 17,
  },
  callout: {
    color: darkColors.textPrimary,
    fontSize: 16,
  },
  subhead: {
    color: darkColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  footnote: {
    color: darkColors.textSecondary,
    fontSize: 13,
  },
  caption: {
    color: darkColors.textTertiary,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
};
