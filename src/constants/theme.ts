export const Colors = {
  // Ink-amber brand color. Used for filled buttons/FAB/active pills — always
  // paired with onAccent (white) text, so it's tuned for that contrast (~5.5:1)
  // rather than for standing alone as text on a themed surface.
  accent: '#B45309',
  onAccent: '#FFFFFF',
  danger: '#DC2626',
  success: '#15803D',
  warning: '#A16207',
  dark: {
    bg: '#15120D',
    surface: '#1D1911',
    card: '#241F16',
    border: '#332B1D',
    text: '#F5EFE1',
    textSecondary: '#B9AC92',
    textMuted: '#7C715C',
    input: '#2A2418',
    // Brighter amber for text/icons standing alone on dark surfaces —
    // Colors.accent is too dark to read reliably here (~2.7:1).
    accentText: '#F5A524',
    accentLight: 'rgba(245, 165, 36, 0.16)',
    accentBorder: 'rgba(245, 165, 36, 0.34)',
  },
  light: {
    bg: '#FDF9F0',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#EAE2D2',
    text: '#231F16',
    textSecondary: '#5C5344',
    textMuted: '#9C9382',
    input: '#F4EEE0',
    accentText: '#B45309',
    accentLight: 'rgba(180, 83, 9, 0.10)',
    accentBorder: 'rgba(180, 83, 9, 0.26)',
  },
};

// Calistoga (warm display serif) for headlines/wordmark, Inter for everything
// else. Falls back to system fonts until useFonts() resolves — see
// src/hooks/useAppFonts.ts.
export const FontFamily = {
  display: 'Calistoga_400Regular',
  displayFallback: 'serif',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  sansFallback: 'System',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  hero: 32,
  display: 40,
};

// Tightened, flatter radius scale (Flat Design Mobile / touch-first) —
// less "bubbly" than the previous 8/12/16/20/24 progression.
export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 22,
  full: 999,
};

// Flat-leaning: shallow, low-opacity shadows. Cards separate primarily via
// border + surface contrast; shadow is reserved for floating elements (FAB).
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
};
