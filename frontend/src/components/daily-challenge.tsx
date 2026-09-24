import React from "react";
import { Text, View } from "react-native";

import { useSound } from "@/src/audio";
import { useToast } from "@/src/components/toast";
import { CoinIcon } from "@/src/components/sprites";
import { NeonButton } from "@/src/components/ui";
import { dailyLabel, dailyRewards } from "@/src/game/logic";
import { useGame } from "@/src/game/store";
import { makeStyles, useTheme } from "@/src/theme";

const OUTLINE = "#3A2E1E";

export function DailyChallengeCard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { state, claimDaily } = useGame();
  const sound = useSound();
  const toast = useToast();
  const d = state.daily;

  const pct = Math.min(100, (d.progress / d.target) * 100);
  const complete = d.progress >= d.target;
  const nextStreak = d.streak + 1;
  const reward = dailyRewards(complete && !d.claimed ? nextStreak : Math.max(1, d.streak));

  const onClaim = () => {
    claimDaily();
    sound.play("coin");
    toast.show(`Daily done! +${reward.tokens}◆  +${reward.coins} coins`, "success");
  };

  return (
    <View style={styles.card} testID="daily-challenge-card">
      <View style={styles.head}>
        <Text style={styles.title}>DAILY CHALLENGE</Text>
        <View style={styles.streak}>
          <Text style={styles.streakText}>🔥 {d.streak}</Text>
        </View>
      </View>
      <Text style={styles.goal}>{dailyLabel(d)}</Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(4, pct)}%` }]} />
        <Text style={styles.trackText}>
          {Math.min(d.progress, d.target).toLocaleString()} / {d.target.toLocaleString()}
        </Text>
      </View>

      <View style={styles.rewardRow}>
        <View style={styles.rewardItem}>
          <Text style={styles.rewardVal}>◆ {reward.tokens}</Text>
        </View>
        <View style={styles.rewardItem}>
          <CoinIcon size={16} />
          <Text style={styles.rewardVal}>{reward.coins}</Text>
        </View>
        {reward.crate ? (
          <View style={styles.rewardItem}>
            <Text style={styles.rewardVal}>📦 +1</Text>
          </View>
        ) : null}
      </View>

      {d.claimed ? (
        <View style={styles.claimed} testID="daily-claimed">
          <Text style={styles.claimedText}>CLAIMED ✓ — come back tomorrow!</Text>
        </View>
      ) : complete ? (
        <NeonButton testID="daily-claim-button" label="CLAIM REWARD" variant="success" onPress={onClaim} />
      ) : (
        <View style={styles.progressHint}>
          <Text style={styles.progressHintText}>Keep riding to complete it!</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    padding: 14,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 6,
    marginBottom: 12,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.brandSecondary, fontSize: 13, fontWeight: "900", letterSpacing: 1.5 },
  streak: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: OUTLINE,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  streakText: { color: colors.onSurface, fontWeight: "900", fontSize: 13 },
  goal: { color: colors.onSurface, fontSize: 15, fontWeight: "800", marginTop: 8, marginBottom: 10 },
  track: {
    height: 24,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: OUTLINE,
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.success },
  trackText: { textAlign: "center", color: colors.onSurface, fontWeight: "900", fontSize: 12 },
  rewardRow: { flexDirection: "row", gap: 10, marginTop: 10, marginBottom: 10 },
  rewardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: OUTLINE,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rewardVal: { color: colors.onSurface, fontWeight: "900", fontSize: 13 },
  claimed: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  claimedText: { color: colors.onSurfaceTertiary, fontWeight: "800", fontSize: 13 },
  progressHint: {
    backgroundColor: colors.brandTertiary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  progressHintText: { color: colors.onBrandTertiary, fontWeight: "800", fontSize: 13 },
}));
