// Design tokens for Slipstream: Merge & Ride.
// Bright, warm CARTOON theme (playful hyper-casual look, chunky UI).
// Single fixed theme so the look never flips with device dark mode.
// makeStyles(colors => ...) for StyleSheets; useTheme().colors for color props.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces (warm cream / white cards)
  surface: "#FFF3D6",
  onSurface: "#2C2418",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#4A3F2C",
  surfaceTertiary: "#FBE7B8",
  onSurfaceTertiary: "#7A6A48",
  surfaceInverse: "#2C2418",
  onSurfaceInverse: "#FFF6E0",
  muted: "#A6926A",

  // Brand
  brand: "#2F9BE0",
  onBrand: "#FFFFFF",
  brandPrimary: "#2F9BE0",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#FF8A3D",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#DCF1FF",
  onBrandTertiary: "#0E5A82",

  // Status
  success: "#7ED957",
  onSuccess: "#123A00",
  warning: "#FFC02E",
  onWarning: "#4A3200",
  error: "#FF5A5F",
  onError: "#FFFFFF",
  info: "#2F9BE0",
  onInfo: "#FFFFFF",

  // Lines
  border: "#E9D3A0",
  borderStrong: "#C9A24B",
  divider: "#F1E2B8",

  // --- Cartoon accent tokens (mapped onto former neon keys for compatibility) ---
  neonCyan: "#2F9BE0",
  neonMagenta: "#FF8A3D",
  neonPurple: "#B06BFF",
  neonGold: "#FFC02E",
  neonGreen: "#7ED957",

  // Part families
  engine: "#FF7A3D",
  onEngine: "#3A1400",
  brake: "#2F9BE0",
  onBrake: "#03293E",
  aero: "#B06BFF",
  onAero: "#230A40",

  // Gameplay
  road: "#7C6B54",
  roadLine: "#FFF3D6",
  crate: "#FFC02E",
  onCrate: "#4A3200",
  coin: "#FFC02E",
  onCoin: "#4A3200",
  danger: "#FF5A5F",

  // Outline used across cartoon art (chunky dark outline)
  outline: "#3A2E1E",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
