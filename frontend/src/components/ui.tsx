import React from "react";
import { Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";

import { PartIcon } from "@/src/components/sprites";
import { PART_NAMES } from "@/src/game/constants";
import type { Family } from "@/src/game/types";
import { makeStyles, useTheme } from "@/src/theme";

const OUTLINE = "#3A2E1E";

export function addAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function darken(hex: string, f = 0.72): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.substring(0, 2), 16) * f);
  const g = Math.round(parseInt(h.substring(2, 4), 16) * f);
  const b = Math.round(parseInt(h.substring(4, 6), 16) * f);
  return `rgb(${r},${g},${b})`;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "gold" | "success";

// Chunky cartoon button with a 3D bottom lip that presses down.
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
  const { colors } = useTheme();
  const faces: Record<ButtonVariant, string> = {
    primary: colors.brandPrimary,
    secondary: colors.brandSecondary,
    gold: colors.neonGold,
    success: colors.success,
    ghost: colors.surfaceSecondary,
  };
  const face = faces[variant];
  const lip = variant === "ghost" ? colors.border : darken(face, 0.7);
  const textColor =
    variant === "ghost"
      ? colors.onSurface
      : variant === "gold"
        ? colors.onCrate
        : variant === "success"
          ? colors.onSuccess
          : "#FFFFFF";

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : 1 }, style]}
    >
      {({ pressed }) => (
        <View
          style={{
            backgroundColor: face,
            borderRadius: 18,
            borderWidth: 3,
            borderColor: OUTLINE,
            borderBottomWidth: pressed ? 3 : 7,
            marginTop: pressed ? 4 : 0,
            paddingVertical: 15,
            paddingHorizontal: 20,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 54,
          }}
        >
          <View style={{ position: "absolute", left: 3, right: 3, top: 3, height: "45%", borderTopLeftRadius: 13, borderTopRightRadius: 13, backgroundColor: "rgba(255,255,255,0.22)" }} />
          <Text
            numberOfLines={1}
            style={{ color: textColor, fontSize: 17, fontWeight: "900", letterSpacing: 0.4 }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function GlowCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: string;
}) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const styles = useStyles();
  return <Text style={[styles.section, style]}>{children}</Text>;
}

export function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <View style={[styles.statFill, { width: `${Math.max(4, Math.min(100, value))}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.statValue}>{Math.round(value)}</Text>
    </View>
  );
}

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
  const border = colors[family];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        backgroundColor: "#FFFFFF",
        borderWidth: 3,
        borderColor: OUTLINE,
        borderBottomWidth: 5,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 4,
          left: 4,
          right: 4,
          bottom: 4,
          borderRadius: Math.round(size * 0.2),
          borderWidth: 2,
          borderColor: addAlpha(border, 0.4),
        }}
      />
      <PartIcon family={family} size={size * 0.5} />
      <View
        style={{
          position: "absolute",
          top: 3,
          right: 3,
          backgroundColor: border,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: OUTLINE,
          paddingHorizontal: 5,
          paddingVertical: 0,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: Math.max(9, size * 0.14) }}>
          {level}
        </Text>
      </View>
      {!compact ? (
        <Text
          numberOfLines={1}
          style={{
            position: "absolute",
            bottom: 4,
            color: colors.onSurfaceTertiary,
            fontSize: Math.max(7, size * 0.1),
            fontWeight: "700",
          }}
        >
          {PART_NAMES[family][level]}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    padding: 16,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 6,
  },
  section: {
    color: colors.onSurface,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  statRow: { flexDirection: "row", alignItems: "center", marginVertical: 5 },
  statLabel: { color: colors.onSurfaceTertiary, width: 74, fontSize: 12, fontWeight: "800" },
  statTrack: {
    flex: 1,
    height: 14,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  statFill: { height: "100%" },
  statValue: { color: colors.onSurface, width: 30, textAlign: "right", fontSize: 13, fontWeight: "900" },
}));
