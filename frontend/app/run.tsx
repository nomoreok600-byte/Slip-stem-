import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { runOnJS } from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";

import { useAds } from "@/src/ads";
import { useToast } from "@/src/components/toast";
import { NeonButton, addAlpha } from "@/src/components/ui";
import { ENVIRONMENTS, RUN } from "@/src/game/constants";
import { useGame, useRunModifiers } from "@/src/game/store";
import { makeStyles, useTheme } from "@/src/theme";

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
  const shotRef = useRef<View>(null);

  const [phase, setPhase] = useState<Phase>("ready");
  const [, setTick] = useState(0);

  // geometry
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
    () => [colors.info, colors.warning, colors.neonPurple, colors.error, colors.brake, colors.aero],
    [colors],
  );

  // mutable game state
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
    g.lastTime = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, laneCenterX, modifiers.turbo]);

  const changeLane = useCallback(
    (dir: number) => {
      if (phase !== "running") return;
      let step = dir;
      // rain slip without ABS: chance to overshoot a lane
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
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [phase, g]);

  const spawnVehicle = useCallback(() => {
    const lane = Math.floor(Math.random() * lanes);
    // avoid stacking too close in same lane
    const tooClose = g.vehicles.some((v: Vehicle) => v.lane === lane && v.y < 140);
    if (tooClose) return;
    // keep at least one lane open near top
    const truck = Math.random() < 0.22;
    const w = laneWidth * (truck ? 0.7 : 0.6);
    const h = truck ? 130 : 74;
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
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setPhase("crashed");
  }, [g]);

  const step = useCallback(
    (time: number) => {
      if (g.lastTime === 0) g.lastTime = time;
      let dt = (time - g.lastTime) / 1000;
      g.lastTime = time;
      if (dt > CAP_DT) dt = CAP_DT;

      g.elapsed += dt;

      // boost timeout
      if (g.boostActive && g.elapsed > g.boostUntil) g.boostActive = false;
      const invincible = g.elapsed < g.invincibleUntil || g.boostActive;

      // world speed
      const ramp = 1 + (Math.min(g.elapsed, RUN.rampSeconds) / RUN.rampSeconds) * (RUN.maxTimeRamp - 1);
      const braking = g.elapsed < g.brakeUntil ? RUN.brakeFactor : 1;
      const boostMul = g.boostActive ? 1.4 : 1;
      const worldSpeed = RUN.baseSpeed * modifiers.speedMult * ramp * braking * boostMul;

      // distance / env
      g.distance += worldSpeed * dt * 0.05;
      g.envIndex = Math.floor(g.distance / RUN.envDistance) % ENVIRONMENTS.length;
      g.rain = ENVIRONMENTS[g.envIndex].rain;

      // combo decay
      if (g.elapsed - g.lastNearMiss > 2.5) g.combo = 0;
      g.multiplier = Math.min(5, 1 + g.combo * 0.1) * (g.boostActive ? 2 : 1);

      // score
      g.score += worldSpeed * dt * 0.12 * g.multiplier * modifiers.scoreMult;

      // player x lerp
      const targetX = laneCenterX(g.playerLane);
      const laneSpeed = 12 * modifiers.handling;
      g.playerX += (targetX - g.playerX) * Math.min(1, dt * laneSpeed);

      // spawn
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

      // move + collide
      const pTop = playerY;
      const pBottom = playerY + playerH;
      const nextVehicles: Vehicle[] = [];
      let crashed = false;
      for (const v of g.vehicles) {
        v.y += worldSpeed * dt;
        const vTop = v.y;
        const vBottom = v.y + v.h;
        const overlap = vTop < pBottom && vBottom > pTop;
        if (overlap && !v.counted) {
          if (v.lane === g.playerLane) {
            if (!invincible) {
              crashed = true;
            }
            v.counted = true;
          } else if (Math.abs(v.lane - g.playerLane) === 1) {
            v.counted = true;
            g.combo += 1;
            g.bestCombo = Math.max(g.bestCombo, g.combo);
            g.lastNearMiss = g.elapsed;
            g.meter = Math.min(RUN.meterMax, g.meter + RUN.meterPerNearMiss);
            g.score += 20 * g.multiplier;
          }
        }
        if (v.y < height + 80) nextVehicles.push(v);
      }
      g.vehicles = nextVehicles;

      // boost trigger
      if (g.meter >= RUN.meterMax && !g.boostActive) {
        g.boostActive = true;
        g.boostUntil = g.elapsed + RUN.boostSeconds;
        g.invincibleUntil = g.elapsed + RUN.boostSeconds;
        g.meter = 0;
      }

      // crates
      const nextCrates: CrateEnt[] = [];
      for (const c of g.crateEnts) {
        c.y += worldSpeed * dt;
        const cTop = c.y;
        const cBottom = c.y + 34;
        const overlap = cTop < pBottom && cBottom > pTop;
        if (overlap && c.lane === g.playerLane) {
          g.cratesCollected += 1;
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
    [
      modifiers.speedMult,
      modifiers.scoreMult,
      modifiers.handling,
      laneCenterX,
      spawnVehicle,
      spawnCrate,
      playerY,
      playerH,
      height,
      onCrash,
      g,
    ],
  );

  const start = useCallback(() => {
    resetGame();
    setPhase("running");
  }, [resetGame]);

  // run loop
  useEffect(() => {
    if (phase !== "running") return;
    g.lastTime = 0;
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, step, g]);

  // ---- gestures ----
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

  // ---- crash / commit flow ----
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
    // clear nearby traffic + grant brief shield
    g.vehicles = g.vehicles.filter((v: Vehicle) => v.y < playerY - 220 || v.y > playerY + 120);
    g.invincibleUntil = g.elapsed + 2.5;
    g.combo = 0;
    setPhase("running");
    toast.show("Second Wind! Ride on", "success");
  }, [ads, toast, g, playerY]);

  const exitTo = useCallback(
    async (dest: "/" | "/garage" | "retry") => {
      await commitRun();
      if (dest === "retry") {
        start();
      } else {
        router.replace(dest);
      }
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

  // ---- env visuals ----
  const env = ENVIRONMENTS[phase === "ready" ? 0 : g.envIndex ?? 0];
  const roadTint =
    env?.key === "desert"
      ? "#141005"
      : env?.key === "rain"
        ? "#05121A"
        : colors.road;
  const invincibleNow =
    phase === "running" && (g.elapsed < g.invincibleUntil || g.boostActive);

  return (
    <View style={[styles.container, { backgroundColor: roadTint }]}>
      <GestureDetector gesture={gesture}>
        <View style={styles.playArea} testID="run-play-area">
          {/* road side glow */}
          <LinearGradient
            colors={[addAlpha(colors.neonMagenta, 0.12), "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: "absolute", left: roadMargin, top: 0, bottom: 0, width: 3, backgroundColor: colors.roadLine }}
          />
          <LinearGradient
            colors={[addAlpha(colors.neonCyan, 0.12), "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: "absolute", right: roadMargin, top: 0, bottom: 0, width: 3, backgroundColor: colors.roadLine }}
          />
          {/* lane dividers */}
          {Array.from({ length: lanes - 1 }).map((_, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: roadMargin + laneWidth * (i + 1) - 1,
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: colors.roadLine,
                opacity: 0.5,
              }}
            />
          ))}

          {/* crates */}
          {phase === "running" &&
            g.crateEnts?.map((c: CrateEnt) => (
              <View
                key={c.id}
                style={{
                  position: "absolute",
                  left: laneCenterX(c.lane) - 17,
                  top: c.y,
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: colors.crate,
                  borderWidth: 2,
                  borderColor: colors.onCrate,
                  shadowColor: colors.crate,
                  shadowOpacity: 1,
                  shadowRadius: 12,
                }}
              />
            ))}

          {/* vehicles */}
          {phase === "running" &&
            g.vehicles?.map((v: Vehicle) => (
              <View
                key={v.id}
                style={{
                  position: "absolute",
                  left: laneCenterX(v.lane) - v.w / 2,
                  top: v.y,
                  width: v.w,
                  height: v.h,
                  borderRadius: 10,
                  backgroundColor: v.color,
                  borderWidth: 1.5,
                  borderColor: addAlpha(v.color, 0.6),
                }}
              >
                <View style={[styles.window, { top: 8 }]} />
                <View style={[styles.window, { bottom: 8 }]} />
              </View>
            ))}

          {/* player bike */}
          {phase !== "crashed" && (
            <View
              testID="run-player"
              style={{
                position: "absolute",
                left: (phase === "running" ? g.playerX : laneCenterX(Math.floor(lanes / 2))) - playerW / 2,
                top: playerY,
                width: playerW,
                height: playerH,
              }}
            >
              <LinearGradient
                colors={
                  invincibleNow
                    ? [colors.neonGold, colors.warning]
                    : [colors.neonCyan, colors.info]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: invincibleNow ? colors.neonGold : colors.neonCyan,
                  shadowColor: invincibleNow ? colors.neonGold : colors.neonCyan,
                  shadowOpacity: 1,
                  shadowRadius: 16,
                  alignItems: "center",
                  paddingTop: 8,
                }}
              >
                <View style={styles.rider} />
              </LinearGradient>
            </View>
          )}
        </View>
      </GestureDetector>

      {/* ---- HUD ---- */}
      {phase === "running" && (
        <RunHUD
          styles={styles}
          colors={colors}
          top={insets.top}
          score={Math.round(g.score)}
          distance={Math.round(g.distance)}
          multiplier={g.multiplier}
          meter={g.meter}
          envName={env?.name ?? ""}
          boost={g.boostActive}
          turboReady={g.turboReady}
          onTurbo={useTurbo}
          onBrake={brakePulse}
          onPause={() => router.replace("/")}
          bottom={insets.bottom}
        />
      )}

      {/* ---- ready overlay ---- */}
      {phase === "ready" && (
        <View style={[styles.overlay, { paddingTop: insets.top }]}>
          <View style={styles.readyCard}>
            <Text style={styles.readyTitle}>GET READY</Text>
            <Text style={styles.readySub}>
              Swipe or tap left / right to change lanes. Swipe down to brake.
            </Text>
            <View style={styles.modRow}>
              <ModChip label="ABS" on={modifiers.hasABS} colors={colors} />
              <ModChip label="TURBO" on={modifiers.turbo} colors={colors} />
              <ModChip
                label={`SPD +${Math.round((modifiers.speedMult - 1) * 100)}%`}
                on={modifiers.speedMult > 1}
                colors={colors}
              />
            </View>
            <View style={{ height: 18 }} />
            <NeonButton testID="run-start-button" label="TAP TO RIDE" onPress={start} />
            <View style={{ height: 10 }} />
            <NeonButton
              testID="run-back-button"
              label="Back to menu"
              variant="ghost"
              onPress={() => router.replace("/")}
            />
          </View>
        </View>
      )}

      {/* ---- crash summary ---- */}
      {phase === "crashed" && (
        <View style={[styles.overlay, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
          <View ref={shotRef} collapsable={false} style={styles.summaryCard} testID="run-summary">
            <LinearGradient
              colors={[colors.neonMagenta, colors.neonPurple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.summaryHeader}
            >
              <Text style={styles.summaryHeaderText}>WIPEOUT</Text>
            </LinearGradient>
            <Text style={styles.bigScore}>{Math.round(g.score).toLocaleString()}</Text>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <View style={styles.summaryStats}>
              <SumStat label="DISTANCE" value={`${Math.round(g.distance)}m`} colors={colors} />
              <SumStat label="TOP COMBO" value={`x${g.bestCombo}`} colors={colors} />
              <SumStat label="CRATES" value={String(g.cratesCollected)} colors={colors} />
            </View>
            <Text style={styles.watermark}>SLIPSTREAM · MRB STUDIO</Text>
          </View>

          <View style={{ height: 16 }} />
          {Math.round(g.score) >= RUN.secondWindScore && !g.secondWindUsed ? (
            <NeonButton
              testID="run-secondwind-button"
              label="◎  SECOND WIND (watch ad)"
              variant="gold"
              onPress={secondWind}
            />
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

function RunHUD({
  styles,
  colors,
  top,
  bottom,
  score,
  distance,
  multiplier,
  meter,
  envName,
  boost,
  turboReady,
  onTurbo,
  onBrake,
  onPause,
}: any) {
  return (
    <>
      <View style={[styles.hudTop, { top: top + 8 }]} pointerEvents="box-none">
        <Pressable testID="run-pause-button" onPress={onPause} style={styles.pauseBtn}>
          <Text style={styles.pauseText}>‖</Text>
        </Pressable>
        <View style={styles.hudCenter}>
          <Text testID="run-score" style={styles.hudScore}>
            {score.toLocaleString()}
          </Text>
          <Text style={styles.hudDistance}>{distance}m · {envName}</Text>
        </View>
        <View style={[styles.multChip, boost && { borderColor: colors.neonGold }]}>
          <Text style={[styles.multText, boost && { color: colors.neonGold }]}>
            x{multiplier.toFixed(1)}
          </Text>
        </View>
      </View>

      {/* slipstream meter */}
      <View style={[styles.meterWrap, { top: top + 62 }]} pointerEvents="none">
        <View style={styles.meterTrack}>
          <LinearGradient
            colors={boost ? [colors.neonGold, colors.warning] : [colors.neonCyan, colors.neonMagenta]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.meterFill, { width: `${boost ? 100 : meter}%` }]}
          />
        </View>
        <Text style={styles.meterLabel}>{boost ? "SLIPSTREAM BOOST!" : "SLIPSTREAM"}</Text>
      </View>

      {/* bottom controls */}
      <View style={[styles.hudBottom, { bottom: bottom + 18 }]} pointerEvents="box-none">
        {turboReady ? (
          <Pressable testID="run-turbo-button" onPress={onTurbo} style={[styles.ctrlBtn, { borderColor: colors.neonMagenta }]}>
            <Text style={[styles.ctrlText, { color: colors.neonMagenta }]}>TURBO</Text>
          </Pressable>
        ) : (
          <View style={{ width: 90 }} />
        )}
        <Pressable testID="run-brake-button" onPress={onBrake} style={[styles.ctrlBtn, { borderColor: colors.brake }]}>
          <Text style={[styles.ctrlText, { color: colors.brake }]}>BRAKE</Text>
        </Pressable>
      </View>
    </>
  );
}

function ModChip({ label, on, colors }: { label: string; on: boolean; colors: any }) {
  return (
    <View
      style={{
        borderRadius: 10,
        borderWidth: 1.5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderColor: on ? colors.neonCyan : colors.border,
        backgroundColor: on ? addAlpha(colors.neonCyan, 0.15) : "transparent",
      }}
    >
      <Text style={{ color: on ? colors.neonCyan : colors.muted, fontWeight: "800", fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}

function SumStat({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: colors.onSurface, fontSize: 20, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1 },
  playArea: { flex: 1 },
  window: {
    position: "absolute",
    alignSelf: "center",
    width: "60%",
    height: 10,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  rider: {
    width: "40%",
    height: "45%",
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  hudTop: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pauseBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: addAlpha(colors.surfaceSecondary, 0.8),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pauseText: { color: colors.onSurface, fontSize: 20, fontWeight: "900" },
  hudCenter: { alignItems: "center" },
  hudScore: {
    color: colors.onSurface,
    fontSize: 30,
    fontWeight: "900",
    textShadowColor: colors.neonCyan,
    textShadowRadius: 12,
  },
  hudDistance: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "700", marginTop: -2 },
  multChip: {
    minWidth: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: addAlpha(colors.surfaceSecondary, 0.8),
  },
  multText: { color: colors.neonCyan, fontWeight: "900", fontSize: 14 },
  meterWrap: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  meterTrack: {
    width: "100%",
    height: 12,
    borderRadius: 8,
    backgroundColor: addAlpha(colors.surfaceSecondary, 0.85),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  meterFill: { height: "100%", borderRadius: 8 },
  meterLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 4,
  },
  hudBottom: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ctrlBtn: {
    width: 96,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: addAlpha(colors.surfaceSecondary, 0.75),
  },
  ctrlText: { fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  overlay: {
    ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const),
    backgroundColor: "rgba(4,4,10,0.88)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  readyCard: { width: "100%", alignItems: "center" },
  readyTitle: {
    color: colors.onSurface,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: colors.neonCyan,
    textShadowRadius: 16,
  },
  readySub: {
    color: colors.onSurfaceTertiary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 20,
  },
  modRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  summaryCard: {
    width: "100%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    paddingBottom: 18,
  },
  summaryHeader: { width: "100%", paddingVertical: 12, alignItems: "center" },
  summaryHeaderText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", letterSpacing: 4 },
  bigScore: {
    color: colors.neonCyan,
    fontSize: 56,
    fontWeight: "900",
    marginTop: 16,
    textShadowColor: colors.neonCyan,
    textShadowRadius: 18,
  },
  scoreLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 3, marginBottom: 18 },
  summaryStats: { flexDirection: "row", justifyContent: "space-around", width: "100%", paddingHorizontal: 10 },
  watermark: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 2, marginTop: 18 },
  summaryButtons: { flexDirection: "row", width: "100%" },
}));
