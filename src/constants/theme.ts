export const Colors = {
  accent: "#6C63FF",
  accentLight: "rgba(108, 99, 255, 0.15)",
  accentBorder: "rgba(108, 99, 255, 0.4)",
  dark: {
    bg: "#0f0f23",
    card: "#1a1a3e",
    border: "#2a2a5a",
    text: "#ffffff",
    textSecondary: "#888888",
    textMuted: "#666666",
  },
  light: {
    bg: "#f5f5f5",
    card: "#ffffff",
    border: "#d0d0d0",
    text: "#1a1a1a",
    textSecondary: "#666666",
    textMuted: "#999999",
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  hero: 32,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

export type ThemeMode = "light" | "dark";

export function getThemeColors(mode: ThemeMode) {
  return mode === "dark" ? Colors.dark : Colors.light;
}
