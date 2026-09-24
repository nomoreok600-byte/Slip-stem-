import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IMAGES } from "@/src/assets";
import { useSound } from "@/src/audio";
import { DailyChallengeCard } from "@/src/components/daily-challenge";
import { CoinIcon, PlayerBike } from "@/src/components/sprites";
import { NeonButton } from "@/src/components/ui";
import { useBikeSpec, useGame } from "@/src/game/store";
import { makeStyles, useTheme } from "@/src/theme";

const OUTLINE = "#3A2E1E";

export default function Home() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  const spec = useBikeSpec();
  const sound = useSound();

  useEffect(() => {
    sound.startMusic();
  }, [sound]);

  const readyCrates = useMemo(
    () => state.crates.filter((c) => c.readyAt <= Date.now()).length,
    [state.crates],
  );

  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, [bob]);
  const bikeY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  const go = (path: "/run" | "/garage" | "/prestige") => {
    sound.play("click");
    router.push(path);
  };

  return (
    <View style={styles.container}>
      <Image source={IMAGES.home} style={styles.bg} contentFit="cover" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* top bar */}
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <CoinIcon size={22} />
            <Text style={styles.pillText}>{state.coins.toLocaleString()}</Text>
          </View>
          <Pressable testID="home-mute-button" onPress={sound.toggleMuted} style={styles.iconBtn}>
            <Text style={styles.iconText}>{sound.muted ? "🔇" : "🔊"}</Text>
          </Pressable>
          <View style={[styles.pill, { borderColor: colors.neonGold }]}>
            <Text style={[styles.pillText, { color: colors.onSurface }]}>◆ {state.tokens}</Text>
          </View>
        </View>

        {/* title */}
        <View style={styles.titleWrap}>
          <Text style={styles.studio}>MRB STUDIO</Text>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            SLIPSTREAM
          </Text>
          <View style={styles.subtitleWrap}>
            <Text style={styles.subtitle}>MERGE & RIDE</Text>
          </View>
        </View>

        {/* hero bike on the road */}
        <View style={styles.stage}>
          <Animated.View style={{ transform: [{ translateY: bikeY }] }}>
            <PlayerBike size={96} />
          </Animated.View>
        </View>

        {/* stat chips */}
        <View style={styles.statsRow}>
          <StatChip label="BEST" value={state.stats.bestScore.toLocaleString()} />
          <StatChip label="RUNS" value={String(state.stats.totalRuns)} />
          <StatChip label="SPEED" value={String(spec.speed)} />
        </View>

        {/* daily challenge */}
        <DailyChallengeCard />

        {/* actions */}
        <NeonButton testID="home-ride-button" label="🏍  START RIDE" onPress={() => go("/run")} style={{ marginTop: 4 }} />
        <View style={{ height: 12 }} />
        <View style={styles.row}>
          <Pressable testID="home-garage-button" onPress={() => go("/garage")} style={styles.navCard}>
            <Text style={styles.navTitle}>Garage</Text>
            <Text style={styles.navSub}>Merge & build</Text>
            {readyCrates > 0 ? (
              <View style={styles.readyBadge}>
                <Text style={styles.readyBadgeText}>{readyCrates}</Text>
              </View>
            ) : null}
          </Pressable>
          <View style={{ width: 12 }} />
          <Pressable testID="home-prestige-button" onPress={() => go("/prestige")} style={styles.navCard}>
            <Text style={styles.navTitle}>Syndicate</Text>
            <Text style={styles.navSub}>Upgrades</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipValue}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  bg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  content: { paddingHorizontal: 18 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 5,
  },
  pillText: { color: colors.onSurface, fontWeight: "900", fontSize: 15 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 5,
  },
  iconText: { fontSize: 18 },
  titleWrap: { alignItems: "center", marginTop: 10 },
  studio: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 5,
    textShadowColor: OUTLINE,
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: OUTLINE,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 1,
  },
  subtitleWrap: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: OUTLINE,
    paddingHorizontal: 14,
    paddingVertical: 3,
    marginTop: 2,
  },
  subtitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", letterSpacing: 4 },
  stage: { alignItems: "center", height: 130, justifyContent: "center", marginTop: 6 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 4, marginBottom: 12 },
  statChip: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 5,
  },
  statChipValue: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  statChipLabel: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 2 },
  row: { flexDirection: "row" },
  navCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    padding: 16,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 6,
  },
  navTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  navSub: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  readyBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: OUTLINE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  readyBadgeText: { color: colors.onSuccess, fontWeight: "900", fontSize: 12 },
}));
