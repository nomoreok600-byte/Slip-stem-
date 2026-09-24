import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSound } from "@/src/audio";
import { useToast } from "@/src/components/toast";
import { CoinIcon } from "@/src/components/sprites";
import { GlowCard, SectionTitle, addAlpha } from "@/src/components/ui";
import { HIGHER_TIER_MAX, UPGRADE_COST } from "@/src/game/constants";
import { useGame } from "@/src/game/store";
import { makeStyles, useTheme } from "@/src/theme";

const OUTLINE = "#3A2E1E";

export default function Prestige() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, buy } = useGame();
  const toast = useToast();
  const sound = useSound();
  const u = state.upgrades;

  const attempt = useCallback(
    (key: "grid5" | "scoreMult" | "handling" | "higherTier", cost: number, blocked: boolean, blockMsg: string) => {
      if (blocked) {
        toast.show(blockMsg, "info");
        return;
      }
      if (state.tokens < cost) {
        toast.show("Not enough Syndicate Tokens", "error");
        return;
      }
      buy(key);
      sound.play("coin");
      toast.show("Upgrade purchased!", "success");
    },
    [state.tokens, buy, toast, sound],
  );

  const items = [
    {
      key: "grid5" as const,
      title: "Expanded Garage",
      desc: "Grow the merge grid from 4×4 to 5×5 for deeper merge chains.",
      cost: UPGRADE_COST.grid5,
      level: u.grid5 ? "OWNED" : null,
      blocked: u.grid5,
      blockMsg: "Already expanded to 5×5",
      color: colors.neonCyan,
    },
    {
      key: "scoreMult" as const,
      title: "Base Multiplier",
      desc: "+10% permanent score multiplier on every future run.",
      cost: UPGRADE_COST.scoreMult(u.scoreMult),
      level: `LV ${u.scoreMult} · +${u.scoreMult * 10}%`,
      blocked: false,
      blockMsg: "",
      color: colors.neonMagenta,
    },
    {
      key: "handling" as const,
      title: "Base Handling",
      desc: "+5% base handling on all future bikes for tighter swerves.",
      cost: UPGRADE_COST.handling(u.handling),
      level: `LV ${u.handling} · +${u.handling * 5}%`,
      blocked: false,
      blockMsg: "",
      color: colors.aero,
    },
    {
      key: "higherTier" as const,
      title: "Higher Tier Drops",
      desc: "Loot crates have a chance to drop higher-level parts, skipping the grind.",
      cost: UPGRADE_COST.higherTier(u.higherTier),
      level: u.higherTier >= HIGHER_TIER_MAX ? "MAXED" : `LV ${u.higherTier}`,
      blocked: u.higherTier >= HIGHER_TIER_MAX,
      blockMsg: "Higher tier drops already maxed",
      color: colors.neonGold,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable testID="prestige-back-button" onPress={() => router.replace("/")} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>SYNDICATE</Text>
        <View style={styles.pillRow}>
          <View style={styles.coinPill}>
            <CoinIcon size={16} />
            <Text style={styles.coinText}>{state.coins}</Text>
          </View>
          <View style={styles.tokenPill}>
            <Text style={styles.tokenText}>◆ {state.tokens}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }}
        showsVerticalScrollIndicator={false}
      >
        <GlowCard glow={colors.neonGold} style={{ marginTop: 8, marginBottom: 20 }}>
          <Text style={styles.introTitle}>PRESTIGE LOOP</Text>
          <Text style={styles.introText}>
            Build a peak-tier bike with a 155cc FI engine, then Export it in the Garage to earn
            Syndicate Tokens. Spend them here on permanent, account-wide upgrades.
          </Text>
          <View style={styles.introStats}>
            <IntroStat label="EXPORTS" value={String(state.stats.exports)} colors={colors} />
            <IntroStat label="BEST" value={state.stats.bestScore.toLocaleString()} colors={colors} />
            <IntroStat label="RUNS" value={String(state.stats.totalRuns)} colors={colors} />
          </View>
        </GlowCard>

        <SectionTitle>Permanent Upgrades</SectionTitle>
        {items.map((it) => {
          const affordable = !it.blocked && state.tokens >= it.cost;
          return (
            <View key={it.key} style={styles.upgradeCard} testID={`upgrade-${it.key}`}>
              <View style={[styles.upgradeAccent, { backgroundColor: it.color }]} />
              <View style={{ flex: 1 }}>
                <View style={styles.upgradeTitleRow}>
                  <Text style={styles.upgradeTitle}>{it.title}</Text>
                  {it.level ? (
                    <Text style={[styles.upgradeLevel, { color: it.color }]}>{it.level}</Text>
                  ) : null}
                </View>
                <Text style={styles.upgradeDesc}>{it.desc}</Text>
                <Pressable
                  testID={`upgrade-buy-${it.key}`}
                  onPress={() => attempt(it.key, it.cost, it.blocked, it.blockMsg)}
                  style={[
                    styles.buyBtn,
                    {
                      borderColor: it.blocked ? colors.border : it.color,
                      backgroundColor: affordable ? addAlpha(it.color, 0.16) : "transparent",
                      opacity: it.blocked ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buyText,
                      { color: it.blocked ? colors.muted : it.color },
                    ]}
                  >
                    {it.blocked ? "MAXED" : `◆ ${it.cost}`}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function IntroStat({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ color: colors.onSurface, fontSize: 18, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 3,
    borderBottomColor: OUTLINE,
  },
  backBtn: {
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
  backText: { color: colors.onSurface, fontSize: 28, fontWeight: "900", marginTop: -4 },
  headerTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  pillRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 5,
  },
  coinText: { color: colors.onSurface, fontWeight: "900", fontSize: 13 },
  tokenPill: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.neonGold,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 5,
  },
  tokenText: { color: colors.onCrate, fontWeight: "900", fontSize: 14 },
  introTitle: { color: colors.brandSecondary, fontSize: 13, fontWeight: "900", letterSpacing: 3, marginBottom: 10 },
  introText: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 21, fontWeight: "600" },
  introStats: {
    flexDirection: "row",
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
    paddingTop: 14,
  },
  upgradeCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 6,
    overflow: "hidden",
  },
  upgradeAccent: { width: 6, borderRadius: 4, marginRight: 14 },
  upgradeTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  upgradeTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "900", flex: 1 },
  upgradeLevel: { fontSize: 12, fontWeight: "900", marginLeft: 8 },
  upgradeDesc: { color: colors.onSurfaceTertiary, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 14, fontWeight: "600" },
  buyBtn: {
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 5,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  buyText: { fontWeight: "900", fontSize: 15 },
}));
