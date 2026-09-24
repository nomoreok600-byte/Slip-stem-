import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlowCard, NeonButton, addAlpha } from "@/src/components/ui";
import { useBikeSpec, useGame } from "@/src/game/store";
import { makeStyles, useTheme } from "@/src/theme";

function Streaks() {
  const { colors } = useTheme();
  const anims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.timing(a, {
          toValue: 1,
          duration: 1400 + i * 260,
          delay: i * 180,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);
  return (
    <View pointerEvents="none" style={{ ...StyleSheetAbsolute }}>
      {anims.map((a, i) => {
        const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [-80, 900] });
        const left = 20 + ((i * 61) % 320);
        const color = i % 2 === 0 ? colors.neonCyan : colors.neonMagenta;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left,
              width: 2.5,
              height: 90,
              borderRadius: 4,
              backgroundColor: color,
              opacity: 0.4,
              transform: [{ translateY }],
            }}
          />
        );
      })}
    </View>
  );
}

const StyleSheetAbsolute = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

export default function Home() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  const spec = useBikeSpec();

  const readyCrates = useMemo(
    () => state.crates.filter((c) => c.readyAt <= Date.now()).length,
    [state.crates],
  );
  const pendingCrates = state.crates.length;

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.surface, "#0E0A22", "#160726"]}
        style={StyleSheetAbsolute}
      />
      <Streaks />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.studio}>MRB STUDIO</Text>
        <Animated.View style={{ transform: [{ scale: glowScale }] }}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            SLIPSTREAM
          </Text>
        </Animated.View>
        <Text style={styles.subtitle}>MERGE & RIDE</Text>

        <View style={styles.statsRow}>
          <StatChip label="BEST" value={state.stats.bestScore.toLocaleString()} color={colors.neonCyan} />
          <StatChip label="TOKENS" value={String(state.tokens)} color={colors.neonGold} />
          <StatChip label="RUNS" value={String(state.stats.totalRuns)} color={colors.neonMagenta} />
        </View>

        <View style={{ height: 22 }} />

        <NeonButton
          testID="home-ride-button"
          label="▲  START RIDE"
          onPress={() => router.push("/run")}
          variant="primary"
        />
        <View style={{ height: 12 }} />
        <Pressable
          testID="home-garage-button"
          onPress={() => router.push("/garage")}
          style={({ pressed }) => [styles.navCard, pressed && styles.pressed]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.navTitle}>Garage</Text>
            <Text style={styles.navSub}>Merge parts · build your bike</Text>
          </View>
          {readyCrates > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.success }]}>
              <Text style={styles.badgeText}>{readyCrates} ready</Text>
            </View>
          ) : pendingCrates > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: colors.onSurfaceTertiary }]}>{pendingCrates} crates</Text>
            </View>
          ) : null}
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable
          testID="home-prestige-button"
          onPress={() => router.push("/prestige")}
          style={({ pressed }) => [styles.navCard, pressed && styles.pressed]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.navTitle}>Syndicate</Text>
            <Text style={styles.navSub}>Prestige · permanent upgrades</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: addAlpha(colors.neonGold, 0.18), borderColor: colors.neonGold, borderWidth: 1 }]}>
            <Text style={[styles.badgeText, { color: colors.neonGold }]}>◆ {state.tokens}</Text>
          </View>
        </Pressable>

        <View style={{ height: 22 }} />
        <GlowCard glow={colors.neonCyan}>
          <Text style={styles.cardHeading}>CURRENT BIKE</Text>
          <View style={styles.specRow}>
            <SpecMini label="SPEED" value={spec.speed} color={colors.engine} />
            <SpecMini label="HANDLING" value={spec.handling} color={colors.aero} />
            <SpecMini label="BRAKING" value={spec.braking} color={colors.brake} />
          </View>
          <View style={styles.tagRow}>
            <Tag on={spec.hasABS} label="ABS" color={colors.brake} />
            <Tag on={spec.turbo} label="TURBO" color={colors.neonMagenta} />
            <Tag on={spec.maxEngine >= 6} label="155cc FI" color={colors.engine} />
          </View>
        </GlowCard>
      </ScrollView>
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statChipValue, { color }]}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

function SpecMini({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.specMini}>
      <Text style={[styles.specValue, { color }]}>{value}</Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

function Tag({ on, label, color }: { on: boolean; label: string; color: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.tag,
        {
          borderColor: on ? color : colors.border,
          backgroundColor: on ? addAlpha(color, 0.16) : "transparent",
        },
      ]}
    >
      <Text style={[styles.tagText, { color: on ? color : colors.muted }]}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 20 },
  studio: {
    color: colors.neonCyan,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 6,
  },
  title: {
    color: colors.onSurface,
    fontSize: 46,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    textShadowColor: colors.neonCyan,
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: {
    color: colors.neonMagenta,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 8,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 24,
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statChip: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statChipValue: { fontSize: 18, fontWeight: "900" },
  statChipLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginTop: 3 },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  navTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "900" },
  navSub: { color: colors.muted, fontSize: 13, marginTop: 3 },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: colors.onSuccess, fontWeight: "900", fontSize: 12 },
  cardHeading: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 2, marginBottom: 14 },
  specRow: { flexDirection: "row", justifyContent: "space-around" },
  specMini: { alignItems: "center" },
  specValue: { fontSize: 26, fontWeight: "900" },
  specLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  tagRow: { flexDirection: "row", gap: 8, marginTop: 16, justifyContent: "center" },
  tag: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontSize: 12, fontWeight: "900", letterSpacing: 1 },
}));
