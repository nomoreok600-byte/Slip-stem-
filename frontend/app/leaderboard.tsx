import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CoinIcon } from "@/src/components/sprites";
import { NeonButton } from "@/src/components/ui";
import { useGame } from "@/src/game/store";
import type { LeaderboardEntry } from "@/src/game/types";
import { makeStyles, useTheme } from "@/src/theme";

const OUTLINE = "#3A2E1E";

export default function Leaderboard() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  const board = state.leaderboard ?? [];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable testID="leaderboard-back-button" onPress={() => router.replace("/")} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>TOP RIDERS</Text>
        <View style={styles.coinPill}>
          <CoinIcon size={16} />
          <Text style={styles.coinText}>{state.coins.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bestCard} testID="leaderboard-best">
          <Text style={styles.bestLabel}>PERSONAL BEST</Text>
          <Text style={styles.bestScore}>{state.stats.bestScore.toLocaleString()}</Text>
          <Text style={styles.bestSub}>
            {state.stats.totalRuns} runs · best combo x{state.stats.bestCombo}
          </Text>
        </View>

        {board.length === 0 ? (
          <View style={styles.empty} testID="leaderboard-empty">
            <Text style={styles.emptyText}>No runs yet. Hit the road to set your first score!</Text>
            <View style={{ height: 14 }} />
            <NeonButton testID="leaderboard-ride-button" label="🏍  RIDE NOW" onPress={() => router.replace("/run")} />
          </View>
        ) : (
          <>
            <Text style={styles.section}>Your Top {board.length}</Text>
            {board.map((e, i) => (
              <Row key={e.id} rank={i + 1} entry={e} colors={colors} styles={styles} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ rank, entry, colors, styles }: { rank: number; entry: LeaderboardEntry; colors: any; styles: any }) {
  const medal = rank === 1 ? "#FFC02E" : rank === 2 ? "#C9CDD3" : rank === 3 ? "#E0A85A" : colors.surfaceTertiary;
  const d = new Date(entry.date);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
  return (
    <View style={styles.row} testID={`leaderboard-row-${rank}`}>
      <View style={[styles.rankBadge, { backgroundColor: medal }]}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowScore}>{entry.score.toLocaleString()}</Text>
        <Text style={styles.rowSub}>
          {entry.distance}m · x{entry.combo} · {dateStr}
        </Text>
      </View>
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
    backgroundColor: colors.surface,
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
  headerTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "900", letterSpacing: 1.5 },
  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 5,
  },
  coinText: { color: colors.onSurface, fontWeight: "900", fontSize: 14 },
  bestCard: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 7,
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 20,
  },
  bestLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "900", letterSpacing: 3 },
  bestScore: { color: "#FFFFFF", fontSize: 48, fontWeight: "900", marginVertical: 2 },
  bestSub: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "700" },
  section: { color: colors.onSurface, fontSize: 17, fontWeight: "900", marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 5,
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: OUTLINE,
  },
  rankText: { color: colors.onSurface, fontWeight: "900", fontSize: 16 },
  rowScore: { color: colors.onSurface, fontSize: 20, fontWeight: "900" },
  rowSub: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 1 },
  empty: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 6,
    padding: 20,
  },
  emptyText: { color: colors.onSurfaceTertiary, fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 20 },
}));
