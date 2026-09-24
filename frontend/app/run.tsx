import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { useAds } from "@/src/ads";
import { ENV_IMAGE } from "@/src/assets";
import { useSound } from "@/src/audio";
import { useToast } from "@/src/components/toast";
import { Car, CoinIcon, CrateIcon, PlayerBike } from "@/src/components/sprites";
import { NeonButton } from "@/src/components/ui";
import { ENVIRONMENTS, RUN, bikeById } from "@/src/game/constants";
import { coinsForRun } from "@/src/game/logic";
import { useGame, useRunModifiers } from "@/src/game/store";
import { makeStyles, useTheme } from "@/src/theme";

const OUTLINE = "#3A2E1E";
type Phase = "ready" | "running" | "crashed";

type Vehicle = {
  id: number;
  lane: number;
  y: number;
  w: number;
  h: number;
  truck: boolean;
  color: string;
  counted: boolean;
};
type CrateEnt = { id: number; lane: number; y: number };

const CAP_DT = 0.05;

export default function RunScreen() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { state, recordRun, clearRunsSinceAd } = useGame();
  const modifiers = useRunModifiers();
  const ads = useAds();
  const toast = useToast();
  const sound = useSound();
  const shotRef = useRef<View>(null);

  const [phase, setPhase] = useState<Phase>("ready");
  const [showSummary, setShowSummary] = useState(false);
  const [, setTick] = useState(0);

  const cos = state.cosmetics;
  const bikeProps = useMemo(
    () => ({
      model: cos.selectedBike,
      bikeColor: cos.bikeColor,
      helmetColor: cos.helmetColor,
      outfitColor: cos.outfitColor,
    }),
    [cos.selectedBike, cos.bikeColor, cos.helmetColor, cos.outfitColor],
  );

  const roadMargin = Math.round(width * 0.05);
  const roadWidth = width - roadMargin * 2;
  const lanes = RUN.lanes;
  const laneWidth = roadWidth / lanes;
  const playerW = laneWidth * RUN.playerWidthRatio;
  const playerH = RUN.playerHeight;
  const playerY = height - insets.bottom - 150;

  const laneCenterX = useCallback(
    (lane: number) => roadMargin + laneWidth * (lane + 0.5),
    [roadMargin, laneWidth],
  );

  const vehicleColors = useMemo(
    () => ["#E8544E", "#4E9BE8", "#8E6BE8", "#63C36B", "#FF9F45", "#E85499"],
    [],
  );

  const g = useRef<any>({}).current;
  const rafRef = useRef<number | null>(null);
  const nextIdRef = useRef(1);

  const resetGame = useCallback(() => {
    g.playerLane = Math.floor(lanes / 2);
    g.playerX = laneCenterX(g.playerLane);
    g.vehicles = [] as Vehicle[];
    g.crateEnts = [] as CrateEnt[];
    g.meter = 0;
    g.score = 0;
    g.distance = 0;
    g.combo = 0;
    g.bestCombo = 0;
    g.multiplier = 1;
    g.cratesCollected = 0;
    g.spawnTimer = 0.6;
    g.crateTimer = 0;
    g.elapsed = 0;
    g.invincibleUntil = 0;
    g.brakeUntil = 0;
    g.boostActive = false;
    g.boostUntil = 0;
    g.envIndex = 0;
    g.rain = false;
    g.lastNearMiss = -999;
    g.secondWindUsed = false;
    g.turboReady = modifiers.turbo;
    g.prevBest = state.stats.bestScore;
    g.lastTime = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, laneCenterX, modifiers.turbo]);

  const changeLane = useCallback(
    (dir: number) => {
      if (phase !== "running") return;
      let step = dir;
      if (g.rain && !modifiers.hasABS) {
        const slip = (1 - modifiers.rainGrip) * 0.8;
        if (Math.random() < slip) step = dir * 2;
      }
      g.playerLane = Math.max(0, Math.min(lanes - 1, g.playerLane + step));
      if (Platform.OS !== "web") Haptics.selectionAsync();
    },
    [phase, lanes, modifiers.hasABS, modifiers.rainGrip, g],
  );

  const brakePulse = useCallback(() => {
    if (phase !== "running") return;
    g.brakeUntil = g.elapsed + RUN.brakeSeconds * (modifiers.hasABS ? 0.7 : 1);
  }, [phase, modifiers.hasABS, g]);

  const useTurbo = useCallback(() => {
    if (phase !== "running" || !g.turboReady) return;
    g.turboReady = false;
    g.boostActive = true;
    g.boostUntil = g.elapsed + 3;
    g.invincibleUntil = g.elapsed + 3;
    sound.play("boost");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [phase, g, sound]);

  const spawnVehicle = useCallback(() => {
    const lane = Math.floor(Math.random() * lanes);
    const tooClose = g.vehicles.some((v: Vehicle) => v.lane === lane && v.y < 150);
    if (tooClose) return;
    const truck = Math.random() < 0.22;
    const w = laneWidth * (truck ? 0.66 : 0.62);
    const h = truck ? w * 1.75 : w * 1.25;
    g.vehicles.push({
      id: nextIdRef.current++,
      lane,
      y: -h - Math.random() * 40,
      w,
      h,
      truck,
      color: vehicleColors[Math.floor(Math.random() * vehicleColors.length)],
      counted: false,
    });
  }, [lanes, laneWidth, vehicleColors, g]);

  const spawnCrate = useCallback(() => {
    const lane = Math.floor(Math.random() * lanes);
    g.crateEnts.push({ id: nextIdRef.current++, lane, y: -40 });
  }, [lanes, g]);

  const onCrash = useCallback(() => {
    g.bestCombo = Math.max(g.bestCombo, g.combo);
    g.crashX = g.playerX;
    sound.stopEngine();
    sound.play("crash");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setShowSummary(false);
    setPhase("crashed");
    setTimeout(() => setShowSummary(true), 950);
  }, [g, sound]);

  const step = useCallback(
    (time: number) => {
      if (g.lastTime === 0) g.lastTime = time;
      let dt = (time - g.lastTime) / 1000;
      g.lastTime = time;
      if (dt > CAP_DT) dt = CAP_DT;

      g.elapsed += dt;
      if (g.boostActive && g.elapsed > g.boostUntil) g.boostActive = false;
      const invincible = g.elapsed < g.invincibleUntil || g.boostActive;

      const ramp = 1 + (Math.min(g.elapsed, RUN.rampSeconds) / RUN.rampSeconds) * (RUN.maxTimeRamp - 1);
      const braking = g.elapsed < g.brakeUntil ? RUN.brakeFactor : 1;
      const boostMul = g.boostActive ? 1.4 : 1;
      const worldSpeed = RUN.baseSpeed * modifiers.speedMult * ramp * braking * boostMul;

      g.distance += worldSpeed * dt * 0.05;
      g.envIndex = Math.floor(g.distance / RUN.envDistance) % ENVIRONMENTS.length;
      g.rain = ENVIRONMENTS[g.envIndex].rain;

      if (g.elapsed - g.lastNearMiss > 2.5) g.combo = 0;
      g.multiplier = Math.min(5, 1 + g.combo * 0.1) * (g.boostActive ? 2 : 1);
      g.score += worldSpeed * dt * 0.12 * g.multiplier * modifiers.scoreMult;

      const targetX = laneCenterX(g.playerLane);
      const laneSpeed = 12 * modifiers.handling;
      g.playerX += (targetX - g.playerX) * Math.min(1, dt * laneSpeed);

      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        spawnVehicle();
        const interval = Math.max(RUN.spawnMin, RUN.spawnBase - g.elapsed * 0.004);
        g.spawnTimer = interval * (0.7 + Math.random() * 0.6);
      }
      if (g.boostActive) {
        g.crateTimer -= dt;
        if (g.crateTimer <= 0) {
          spawnCrate();
          g.crateTimer = RUN.crateSpawnEvery;
        }
      }

      const pTop = playerY;
      const pBottom = playerY + playerH;
      const nextVehicles: Vehicle[] = [];
      let crashed = false;
      for (const v of g.vehicles) {
        v.y += worldSpeed * dt;
        const overlap = v.y < pBottom && v.y + v.h > pTop;
        if (overlap && !v.counted) {
          if (v.lane === g.playerLane) {
            if (!invincible) crashed = true;
            v.counted = true;
          } else if (Math.abs(v.lane - g.playerLane) === 1) {
            v.counted = true;
            g.combo += 1;
            g.bestCombo = Math.max(g.bestCombo, g.combo);
            g.lastNearMiss = g.elapsed;
            g.meter = Math.min(RUN.meterMax, g.meter + RUN.meterPerNearMiss);
            g.score += 20 * g.multiplier;
            sound.play("whoosh");
          }
        }
        if (v.y < height + 80) nextVehicles.push(v);
      }
      g.vehicles = nextVehicles;

      if (g.meter >= RUN.meterMax && !g.boostActive) {
        g.boostActive = true;
        g.boostUntil = g.elapsed + RUN.boostSeconds;
        g.invincibleUntil = g.elapsed + RUN.boostSeconds;
        g.meter = 0;
        sound.play("boost");
      }

      const nextCrates: CrateEnt[] = [];
      for (const c of g.crateEnts) {
        c.y += worldSpeed * dt;
        const overlap = c.y < pBottom && c.y + 40 > pTop;
        if (overlap && c.lane === g.playerLane) {
          g.cratesCollected += 1;
          sound.play("coin");
          continue;
        }
        if (c.y < height + 80) nextCrates.push(c);
      }
      g.crateEnts = nextCrates;

      setTick((t) => (t + 1) % 1000000);

      if (crashed) {
        onCrash();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    },
    [modifiers.speedMult, modifiers.scoreMult, modifiers.handling, laneCenterX, spawnVehicle, spawnCrate, playerY, playerH, height, onCrash, sound, g],
  );

  const start = useCallback(() => {
    resetGame();
    setShowSummary(false);
    sound.play("click");
    sound.startEngine();
    setPhase("running");
  }, [resetGame, sound]);

  useEffect(() => {
    if (phase !== "running") return;
    g.lastTime = 0;
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, step, g]);

  useEffect(() => {
    return () => sound.stopEngine();
  }, [sound]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan().onEnd((e) => {
      "worklet";
      const tx = e.translationX;
      const ty = e.translationY;
      if (Math.abs(tx) > Math.abs(ty) && Math.abs(tx) > 12) {
        runOnJS(changeLane)(tx > 0 ? 1 : -1);
      } else if (ty > 30) {
        runOnJS(brakePulse)();
      }
    });
    const tap = Gesture.Tap()
      .maxDuration(350)
      .onEnd((e) => {
        "worklet";
        runOnJS(handleTap)(e.absoluteX);
      });
    return Gesture.Race(pan, tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeLane, brakePulse]);

  function handleTap(absX: number) {
    if (absX < width / 2) changeLane(-1);
    else changeLane(1);
  }

  const commitRun = useCallback(async () => {
    const result = {
      score: Math.round(g.score),
      distance: Math.round(g.distance),
      bestCombo: g.bestCombo,
      cratesCollected: g.cratesCollected,
    };
    recordRun(result);
    const newRunsSinceAd = state.stats.runsSinceAd + 1;
    if (newRunsSinceAd >= 3) {
      await ads.showInterstitial();
      clearRunsSinceAd();
    }
  }, [g, recordRun, state.stats.runsSinceAd, ads, clearRunsSinceAd]);

  const secondWind = useCallback(async () => {
    const ok = await ads.showRewarded("second-wind");
    if (!ok) {
      toast.show("Ad skipped — no rewind", "info");
      return;
    }
    g.secondWindUsed = true;
    g.vehicles = g.vehicles.filter((v: Vehicle) => v.y < playerY - 220 || v.y > playerY + 120);
    g.invincibleUntil = g.elapsed + 2.5;
    g.combo = 0;
    sound.startEngine();
    setPhase("running");
    toast.show("Second Wind! Ride on", "success");
  }, [ads, toast, g, playerY, sound]);

  const exitTo = useCallback(
    async (dest: "/" | "/garage" | "retry") => {
      await commitRun();
      if (dest === "retry") start();
      else router.replace(dest);
    },
    [commitRun, start, router],
  );

  const shareCard = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        toast.show("Sharing works on the mobile app", "info");
        return;
      }
      const uri = await captureRef(shotRef, { format: "png", quality: 0.95 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(uri);
      else toast.show("Sharing not available", "error");
    } catch {
      toast.show("Could not share run", "error");
    }
  }, [toast]);

  const env = ENVIRONMENTS[phase === "ready" ? 0 : g.envIndex ?? 0];
  const invincibleNow = phase === "running" && (g.elapsed < g.invincibleUntil || g.boostActive);
  const wheelSpin = phase === "running" ? Math.round((g.elapsed * 1100) % 360) : 0;
  const coinsEarned = phase === "crashed" ? coinsForRun(Math.round(g.distance), g.cratesCollected) : 0;
  const isNewBest = phase === "crashed" && Math.round(g.score) > (g.prevBest ?? 0) && Math.round(g.score) > 0;

  return (
    <View style={styles.container}>
      <Image source={ENV_IMAGE[env.key]} style={styles.bg} contentFit="cover" />
      <GestureDetector gesture={gesture}>
        <View style={styles.playArea} testID="run-play-area">
          {/* road band */}
          <View
            style={{
              position: "absolute",
              left: roadMargin - 8,
              right: roadMargin - 8,
              top: 0,
              bottom: 0,
              backgroundColor: colors.road,
              opacity: 0.92,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              borderColor: colors.warning,
            }}
          />
          {Array.from({ length: lanes - 1 }).map((_, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: roadMargin + laneWidth * (i + 1) - 2,
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: colors.roadLine,
                opacity: 0.45,
              }}
            />
          ))}

          {phase === "running" &&
            g.crateEnts?.map((c: CrateEnt) => (
              <View key={c.id} style={{ position: "absolute", left: laneCenterX(c.lane) - 20, top: c.y }}>
                <CrateIcon size={40} />
              </View>
            ))}

          {phase === "running" &&
            g.vehicles?.map((v: Vehicle) => (
              <View key={v.id} style={{ position: "absolute", left: laneCenterX(v.lane) - v.w / 2, top: v.y }}>
                <Car size={v.w} color={v.color} truck={v.truck} spin={wheelSpin} />
              </View>
            ))}

          {phase !== "crashed" && (
            <View
              testID="run-player"
              style={{
                position: "absolute",
                left: (phase === "running" ? g.playerX : laneCenterX(Math.floor(lanes / 2))) - playerW / 2,
                top: playerY + playerH - playerW * 1.5,
              }}
            >
              <PlayerBike size={playerW} boosting={invincibleNow} spin={wheelSpin} {...bikeProps} />
            </View>
          )}

          {phase === "crashed" && (
            <View
              testID="run-player-dead"
              style={{
                position: "absolute",
                left: (g.crashX ?? laneCenterX(Math.floor(lanes / 2))) - (playerW * 1.15) / 2,
                top: playerY + playerH - playerW * 1.6,
              }}
            >
              <PlayerBike size={playerW * 1.15} dead {...bikeProps} />
            </View>
          )}
        </View>
      </GestureDetector>

      {phase === "running" && (
        <RunHUD
          styles={styles}
          colors={colors}
          top={insets.top}
          bottom={insets.bottom}
          score={Math.round(g.score)}
          distance={Math.round(g.distance)}
          multiplier={g.multiplier}
          meter={g.meter}
          envName={env?.name ?? ""}
          boost={g.boostActive}
          turboReady={g.turboReady}
          onTurbo={useTurbo}
          onBrake={brakePulse}
          onPause={() => {
            sound.stopEngine();
            router.replace("/");
          }}
        />
      )}

      {phase === "ready" && (
        <View style={[styles.overlay, { paddingTop: insets.top }]}>
          <View style={styles.readyCard}>
            <Text style={styles.readyTitle}>GET READY!</Text>
            <Text style={styles.readySub}>Tap or swipe left / right to change lanes.{"\n"}Swipe down to brake.</Text>
            <View style={styles.modRow}>
              <ModChip label="ABS" on={modifiers.hasABS} colors={colors} />
              <ModChip label="TURBO" on={modifiers.turbo} colors={colors} />
              <ModChip label={`SPD +${Math.round((modifiers.speedMult - 1) * 100)}%`} on={modifiers.speedMult > 1} colors={colors} />
            </View>
            <View style={{ height: 18 }} />
            <NeonButton testID="run-start-button" label="🏍  TAP TO RIDE" onPress={start} />
            <View style={{ height: 10 }} />
            <NeonButton testID="run-back-button" label="Back to menu" variant="ghost" onPress={() => router.replace("/")} />
          </View>
        </View>
      )}

      {phase === "crashed" && showSummary && (
        <View style={[styles.overlay, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
          <View ref={shotRef} collapsable={false} style={styles.summaryCard} testID="run-summary">
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryHeaderText}>WIPEOUT!</Text>
            </View>
            {isNewBest ? (
              <View style={styles.newBest} testID="run-new-best">
                <Text style={styles.newBestText}>★ NEW BEST! ★</Text>
              </View>
            ) : null}
            <Text style={styles.bigScore}>{Math.round(g.score).toLocaleString()}</Text>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <View style={styles.summaryStats}>
              <SumStat label="DISTANCE" value={`${Math.round(g.distance)}m`} colors={colors} />
              <SumStat label="COMBO" value={`x${g.bestCombo}`} colors={colors} />
              <SumStat label="CRATES" value={String(g.cratesCollected)} colors={colors} />
            </View>
            <View style={styles.coinLine}>
              <CoinIcon size={20} />
              <Text style={styles.coinLineText}>+{coinsEarned} coins earned</Text>
            </View>
            <Text style={styles.watermark}>SLIPSTREAM · MRB STUDIO</Text>
          </View>

          <View style={{ height: 14 }} />
          {Math.round(g.score) >= RUN.secondWindScore && !g.secondWindUsed ? (
            <NeonButton testID="run-secondwind-button" label="◎  SECOND WIND (watch ad)" variant="gold" onPress={secondWind} />
          ) : null}
          <View style={{ height: 10 }} />
          <View style={styles.summaryButtons}>
            <NeonButton testID="run-retry-button" label="Ride Again" onPress={() => exitTo("retry")} style={{ flex: 1 }} />
            <View style={{ width: 10 }} />
            <NeonButton testID="run-share-button" label="Share" variant="secondary" onPress={shareCard} style={{ flex: 1 }} />
          </View>
          <View style={{ height: 10 }} />
          <View style={styles.summaryButtons}>
            <NeonButton testID="run-garage-button" label="Garage" variant="ghost" onPress={() => exitTo("/garage")} style={{ flex: 1 }} />
            <View style={{ width: 10 }} />
            <NeonButton testID="run-home-button" label="Menu" variant="ghost" onPress={() => exitTo("/")} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </View>
  );
}

function RunHUD({ styles, colors, top, bottom, score, distance, multiplier, meter, envName, boost, turboReady, onTurbo, onBrake, onPause }: any) {
  return (
    <>
      <View style={[styles.hudTop, { top: top + 8 }]} pointerEvents="box-none">
        <Pressable testID="run-pause-button" onPress={onPause} style={styles.pauseBtn}>
          <Text style={styles.pauseText}>‖</Text>
        </Pressable>
        <View style={styles.scoreChip}>
          <Text testID="run-score" style={styles.hudScore}>{score.toLocaleString()}</Text>
          <Text style={styles.hudDistance}>{distance}m · {envName}</Text>
        </View>
        <View style={[styles.multChip, boost && { backgroundColor: colors.neonGold }]}>
          <Text style={styles.multText}>x{multiplier.toFixed(1)}</Text>
        </View>
      </View>

      <View style={[styles.meterWrap, { top: top + 64 }]} pointerEvents="none">
        <View style={styles.meterTrack}>
          <View style={[styles.meterFill, { width: `${boost ? 100 : meter}%`, backgroundColor: boost ? colors.neonGold : colors.success }]} />
          <Text style={styles.meterLabel}>{boost ? "SLIPSTREAM BOOST!" : "SLIPSTREAM"}</Text>
        </View>
      </View>

      <View style={[styles.hudBottom, { bottom: bottom + 18 }]} pointerEvents="box-none">
        {turboReady ? (
          <Pressable testID="run-turbo-button" onPress={onTurbo} style={[styles.ctrlBtn, { backgroundColor: colors.brandSecondary }]}>
            <Text style={styles.ctrlText}>TURBO</Text>
          </Pressable>
        ) : (
          <View style={{ width: 96 }} />
        )}
        <Pressable testID="run-brake-button" onPress={onBrake} style={[styles.ctrlBtn, { backgroundColor: colors.brandPrimary }]}>
          <Text style={styles.ctrlText}>BRAKE</Text>
        </Pressable>
      </View>
    </>
  );
}

function ModChip({ label, on, colors }: { label: string; on: boolean; colors: any }) {
  return (
    <View style={{ borderRadius: 12, borderWidth: 3, borderColor: OUTLINE, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: on ? colors.success : colors.surfaceTertiary }}>
      <Text style={{ color: on ? colors.onSuccess : colors.muted, fontWeight: "900", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function SumStat({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: colors.onSurface, fontSize: 20, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  bg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  playArea: { flex: 1 },
  hudTop: { position: "absolute", left: 14, right: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pauseBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: OUTLINE, borderBottomWidth: 5 },
  pauseText: { color: colors.onSurface, fontSize: 20, fontWeight: "900" },
  scoreChip: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 6, borderWidth: 3, borderColor: OUTLINE, borderBottomWidth: 5 },
  hudScore: { color: colors.onSurface, fontSize: 26, fontWeight: "900" },
  hudDistance: { color: colors.muted, fontSize: 11, fontWeight: "800", marginTop: -2 },
  multChip: { minWidth: 46, borderRadius: 14, borderWidth: 3, borderColor: OUTLINE, borderBottomWidth: 5, paddingHorizontal: 8, paddingVertical: 8, alignItems: "center", backgroundColor: colors.brandPrimary },
  multText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  meterWrap: { position: "absolute", left: 14, right: 14 },
  meterTrack: { width: "100%", height: 26, borderRadius: 14, backgroundColor: colors.surfaceSecondary, overflow: "hidden", borderWidth: 3, borderColor: OUTLINE, justifyContent: "center" },
  meterFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  meterLabel: { textAlign: "center", color: colors.onSurface, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  hudBottom: { position: "absolute", left: 20, right: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ctrlBtn: { width: 100, height: 54, borderRadius: 16, borderWidth: 3, borderColor: OUTLINE, borderBottomWidth: 6, alignItems: "center", justifyContent: "center" },
  ctrlText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15, letterSpacing: 1 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(44,36,24,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  readyCard: { width: "100%", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: 22, borderWidth: 3, borderColor: OUTLINE, borderBottomWidth: 7, padding: 22 },
  readyTitle: { color: colors.onSurface, fontSize: 32, fontWeight: "900", letterSpacing: 1 },
  readySub: { color: colors.onSurfaceTertiary, fontSize: 14, textAlign: "center", marginTop: 10, marginBottom: 16, lineHeight: 20, fontWeight: "600" },
  modRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  summaryCard: { width: "100%", backgroundColor: colors.surfaceSecondary, borderRadius: 22, overflow: "hidden", borderWidth: 3, borderColor: OUTLINE, borderBottomWidth: 7, alignItems: "center", paddingBottom: 16 },
  summaryHeader: { width: "100%", paddingVertical: 12, alignItems: "center", backgroundColor: colors.brandSecondary, borderBottomWidth: 3, borderColor: OUTLINE },
  summaryHeaderText: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", letterSpacing: 2 },
  bigScore: { color: colors.brandPrimary, fontSize: 54, fontWeight: "900", marginTop: 14 },
  newBest: { backgroundColor: colors.neonGold, borderRadius: 12, borderWidth: 3, borderColor: OUTLINE, paddingHorizontal: 14, paddingVertical: 4, marginTop: 12 },
  newBestText: { color: colors.onCrate, fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  scoreLabel: { color: colors.muted, fontSize: 12, fontWeight: "900", letterSpacing: 3, marginBottom: 16 },
  summaryStats: { flexDirection: "row", justifyContent: "space-around", width: "100%", paddingHorizontal: 10 },
  coinLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  coinLineText: { color: colors.onSurface, fontWeight: "900", fontSize: 15 },
  watermark: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 2, marginTop: 12 },
  summaryButtons: { flexDirection: "row", width: "100%" },
}));
