import { useRouter } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { useSound } from "@/src/audio";
import { useToast } from "@/src/components/toast";
import { NeonButton } from "@/src/components/ui";
import { WEEKLY_REWARD, bikeById, REWARD_BIKE } from "@/src/game/constants";
import { weeklyLabel } from "@/src/game/logic";
import { useGame } from "@/src/game/store";
import { makeStyles } from "@/src/theme";

const OUTLINE = "#3A2E1E";

export function WeeklyChallengeCard() {
  const styles = useStyles();
  const router = useRouter();
  const { state, claimWeekly } = useGame();
  const sound = useSound();
  const toast = useToast();
  const w = state.weekly;
  if (!w) return null;

  const pct = Math.min(100, (w.progress / w.target) * 100);
  const complete = w.progress >= w.target;
  const owned = state.cosmetics.ownedBikes.includes(REWARD_BIKE);
  const phantom = bikeById(REWARD_BIKE);

  const onClaim = () => {
    claimWeekly();
    sound.play("coin");
    toast.show(`Weekly done! ${phantom.name} unlocked 🏍`, "success");
    setTimeout(() => router.push("/shop"), 400);
  };

  return (
    <View style={styles.card} testID="weekly-challenge-card">
      <View style={styles.head}>
        <Text style={styles.title}>WEEKLY CHALLENGE</Text>
        <View style={styles.prizePill}>
          <Text style={styles.prizeText}>🏆 {phantom.name}</Text>
        </View>
      </View>
      <Text style={styles.goal}>{weeklyLabel(w)}</Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(4, pct)}%` }]} />
        <Text style={styles.trackText}>
          {Math.min(w.progress, w.target).toLocaleString()} / {w.target.toLocaleString()}
        </Text>
      </View>

      <Text style={styles.reward}>
        Reward: {phantom.name} bike + {WEEKLY_REWARD.coins.toLocaleString()} coins + {WEEKLY_REWARD.tokens}◆
      </Text>

      {owned || w.claimed ? (
        <View style={styles.claimed} testID="weekly-claimed">
          <Text style={styles.claimedText}>
            {owned ? "PHANTOM UNLOCKED ✓" : "CLAIMED ✓ — new goal next week!"}
          </Text>
        </View>
      ) : complete ? (
        <NeonButton testID="weekly-claim-button" label="CLAIM PHANTOM BIKE" variant="gold" onPress={onClaim} />
      ) : (
        <View style={styles.progressHint}>
          <Text style={styles.progressHintText}>Ride all week to earn the Phantom!</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surfaceInverse,
    borderRadius: 18,
    padding: 14,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 6,
    marginBottom: 12,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.neonGold, fontSize: 13, fontWeight: "900", letterSpacing: 1.5 },
  prizePill: { backgroundColor: colors.neonGold, borderRadius: 12, borderWidth: 2, borderColor: OUTLINE, paddingHorizontal: 8, paddingVertical: 2 },
  prizeText: { color: colors.onCrate, fontWeight: "900", fontSize: 12 },
  goal: { color: colors.onSurfaceInverse, fontSize: 15, fontWeight: "800", marginTop: 8, marginBottom: 10 },
  track: {
    height: 24,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    borderWidth: 3,
    borderColor: OUTLINE,
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.neonGold },
  trackText: { textAlign: "center", color: colors.onSurfaceInverse, fontWeight: "900", fontSize: 12 },
  reward: { color: "rgba(255,246,224,0.85)", fontSize: 12, fontWeight: "700", marginTop: 10, marginBottom: 10 },
  claimed: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 2, borderColor: OUTLINE },
  claimedText: { color: colors.neonGold, fontWeight: "900", fontSize: 13 },
  progressHint: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 2, borderColor: OUTLINE },
  progressHintText: { color: colors.onSurfaceInverse, fontWeight: "800", fontSize: 13 },
}));
