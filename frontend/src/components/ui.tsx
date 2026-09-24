import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";

import { FAMILY_GLYPH, PART_NAMES } from "@/src/game/constants";
import type { Family } from "@/src/game/types";
import { makeStyles, useTheme } from "@/src/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "gold";

export function NeonButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  testID,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const gradients: Record<ButtonVariant, string[]> = {
    primary: [colors.neonCyan, colors.info],
    secondary: [colors.neonMagenta, colors.neonPurple],
    gold: [colors.neonGold, colors.warning],
    ghost: ["transparent", "transparent"],
  };
  const textColor =
    variant === "ghost" ? colors.onSurface : variant === "gold" ? colors.onCrate : colors.onBrand;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btnWrap,
        variant === "ghost" && styles.ghostWrap,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <LinearGradient
        colors={gradients[variant] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btnInner}
      >
        <Text style={[styles.btnText, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export function GlowCard({
  children,
  style,
  glow,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: string;
}) {
  const styles = useStyles();
  return <View style={[styles.card, glow ? { shadowColor: glow } : null, style]}>{children}</View>;
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useStyles();
  return <Text style={[styles.section, style]}>{children}</Text>;
}

export function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number; // 0..100
  color: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <View style={[styles.statFill, { width: `${Math.max(3, Math.min(100, value))}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.statValue}>{Math.round(value)}</Text>
    </View>
  );
}

const FAMILY_COLOR_KEY: Record<Family, "engine" | "brake" | "aero"> = {
  engine: "engine",
  brake: "brake",
  aero: "aero",
};

export function PartTile({
  family,
  level,
  size,
  compact,
}: {
  family: Family;
  level: number;
  size: number;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const bg = colors[FAMILY_COLOR_KEY[family]];
  const onBg =
    family === "engine" ? colors.onEngine : family === "brake" ? colors.onBrake : colors.onAero;
  return (
    <LinearGradient
      colors={[bg, addAlpha(bg, 0.55)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: addAlpha(bg, 0.9),
        shadowColor: bg,
        shadowOpacity: 0.9,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <Text style={{ color: onBg, fontWeight: "900", fontSize: Math.max(10, size * 0.19) }}>
        {FAMILY_GLYPH[family]}
      </Text>
      <View
        style={{
          marginTop: 3,
          backgroundColor: onBg,
          borderRadius: 8,
          paddingHorizontal: 7,
          paddingVertical: 1,
        }}
      >
        <Text style={{ color: bg, fontWeight: "900", fontSize: Math.max(9, size * 0.16) }}>
          L{level}
        </Text>
      </View>
      {!compact ? (
        <Text
          numberOfLines={1}
          style={{ color: onBg, fontSize: Math.max(7, size * 0.11), marginTop: 2, opacity: 0.85 }}
        >
          {PART_NAMES[family][level]}
        </Text>
      ) : null}
    </LinearGradient>
  );
}

// naive hex -> rgba helper for glow variants
export function addAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const useStyles = makeStyles((colors) => ({
  btnWrap: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.neonCyan,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  ghostWrap: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    shadowOpacity: 0,
  },
  btnInner: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  section: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statRow: { flexDirection: "row", alignItems: "center", marginVertical: 5 },
  statLabel: { color: colors.onSurfaceTertiary, width: 74, fontSize: 12, fontWeight: "700" },
  statTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 6,
    overflow: "hidden",
    marginHorizontal: 10,
  },
  statFill: { height: "100%", borderRadius: 6 },
  statValue: { color: colors.onSurface, width: 30, textAlign: "right", fontSize: 12, fontWeight: "800" },
}));
