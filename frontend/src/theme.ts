// Design tokens for Slipstream: Merge & Ride.
// Single fixed dark neon-cyberpunk theme (game look must never flip to light),
// so all values live under `light` and the scheme is pinned via defaultScheme.
// makeStyles(colors => ...) for StyleSheets; useTheme().colors for color props.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#07070C", // primary canvas (near-black)
  onSurface: "#EAF6FF",
  surfaceSecondary: "#101020", // cards, panels
  onSurfaceSecondary: "#C9D6E5",
  surfaceTertiary: "#181832", // inputs, chips, deep nesting
  onSurfaceTertiary: "#9AA7C2",
  surfaceInverse: "#EAF6FF",
  onSurfaceInverse: "#07070C",
  muted: "#6B7A99",

  // Brand (cyan / magenta neon)
  brand: "#00E5FF",
  onBrand: "#04121A",
  brandPrimary: "#00E5FF",
  onBrandPrimary: "#04121A",
  brandSecondary: "#FF2E97",
  onBrandSecondary: "#0A0A0F",
  brandTertiary: "#152233",
  onBrandTertiary: "#7FE9FF",

  // Status
  success: "#39FF9E",
  onSuccess: "#04120B",
  warning: "#FFB020",
  onWarning: "#1A1200",
  error: "#FF4D6D",
  onError: "#1A0308",
  info: "#4CC9F0",
  onInfo: "#03121A",

  // Lines
  border: "#232338",
  borderStrong: "#33334D",
  divider: "#1C1C30",

  // --- Game-specific tokens (fixed, never theme-swapped) ---
  neonCyan: "#00E5FF",
  neonMagenta: "#FF2E97",
  neonPurple: "#B15CFF",
  neonGold: "#FFD23F",
  neonGreen: "#39FF9E",

  engine: "#FF7A29", // engine part family
  onEngine: "#1A0A00",
  brake: "#2EE6D6", // braking part family
  onBrake: "#02120F",
  aero: "#C77DFF", // aesthetics part family
  onAero: "#12061F",

  road: "#0B0B14",
  roadLine: "#2A2A45",
  crate: "#FFD23F",
  onCrate: "#1A1200",
  danger: "#FF3B5C",
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
