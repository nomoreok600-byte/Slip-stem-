import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Polygon } from "react-native-svg";
import { captureRef } from "react-native-view-shot";

import { useAds } from "@/src/ads";
import { useSound } from "@/src/audio";
import { useToast } from "@/src/components/toast";
import { Car, CoinIcon, CrateIcon, PlayerBike } from "@/src/components/sprites";
import { NeonButton, addAlpha } from "@/src/components/ui";
import { ENVIRONMENTS, RUN, bikeById } from "@/src/game/constants";
import { coinsForRun } from "@/src/game/logic";
import { ROAD, laneToNorm, project } from "@/src/game/pseudo3d";
import { useGame, useRunModifiers } from "@/src/game/store";
import { makeStyles, useTheme } from "@/src/theme";

const OUTLINE = "#3A2E1E";
type Phase = "ready" | "running" | "crashed";

type Vehicle = { id: number; lane: number; z: number; truck: boolean; color: string; counted: boolean };
type CrateEnt = { id: number; lane: number; z: number };
type PowerUp = { id: number; lane: number; z: number; kind: "magnet" | "shield" };
type Prop = { id: number; side: number; z: number; kind: string; color: string; h: number };

const CAP_DT = 0.05;

export default function RunScreen() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { state, recordRun, clearRunsSinceAd, addCoins } = useGame();
  const modifiers = useRunModifiers();
  const ads = useAds();
  const toast = useToast();
  const sound = useSound();
  const shotRef = useRef<View>(null);

  const [phase, setPhase] = useState<Phase>("ready");
  const [showSummary, setShowSummary] = useState(false);
  const [coinsDoubled, setCoinsDoubled] = useState(false);
  const [banner, setBanner] = useState<{ text: string; id: number } | null>(null);
  const [, setTick] = useState(0);

  const cos = state.cosmetics;
  const trailColor = useMemo(() => bikeById(cos.selectedBike).trail, [cos.selectedBike]);
  const bikeProps = useMemo(
    () => ({ model: cos.selectedBike, bikeColor: cos.bikeColor, helmetColor: cos.helmetColor, outfitColor: cos.outfitColor }),
    [cos.selectedBike, cos.bikeColor, cos.helmetColor, cos.outfitColor],
  );

  const W = width;
  const H = height;
  const horizonY = H * ROAD.horizonRatio;
  const lanes = RUN.lanes;

  const bannerAnim = useRef(new Animated.Value(0)).current;
  const showBanner = useCallback(
    (text: string) => {
      setBanner({ text, id: Date.now() + Math.random() });
      bannerAnim.setValue(0);
      Animated.sequence([
        Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120 }),
        Animated.delay(650),
        Animated.timing(bannerAnim, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start();
    },
    [bannerAnim],
  );

  const g = useRef<any>({}).current;
  const rafRef = useRef<number | null>(null);
  const nextIdRef = useRef(1);

  const vehicleColors = useMemo(() => ["#E8544E", "#4E9BE8", "#8E6BE8", "#63C36B", "#FF9F45", "#E85499"], []);

  const seedProps = useCallback((env: any) => {
    const arr: Prop[] = [];
    for (let i = 0; i < 12; i++) {
      arr.push({
        id: nextIdRef.current++,
        side: i % 2 === 0 ? -1 : 1,
        z: 20 + i * (ROAD.farZ / 12),
        kind: env.prop,
        color: env.propColors[Math.floor(Math.random() * env.propColors.length)],
        h: 60 + Math.random() * 120,
      });
    }
    return arr;
  }, []);

  const resetGame = useCallback(() => {
    g.playerLane = Math.floor(lanes / 2);
    g.playerNorm = laneToNorm(g.playerLane, lanes);
    g.vehicles = [] as Vehicle[];
    g.crateEnts = [] as CrateEnt[];
    g.powerUps = [] as PowerUp[];
    g.props = seedProps(ENVIRONMENTS[0]);
    g.meter = 0;
    g.score = 0;
    g.distance = 0;
    g.combo = 0;
    g.bestCombo = 0;
    g.multiplier = 1;
    g.cratesCollected = 0;
    g.spawnTimer = 0.7;
    g.crateTimer = 0;
    g.powerTimer = 8;
    g.elapsed = 0;
    g.invincibleUntil = 0;
    g.shieldUntil = 0;
    g.magnetUntil = 0;
    g.brakeUntil = 0;
    g.boostActive = false;
    g.boostUntil = 0;
    g.envIndex = 0;
    g.rain = false;
    g.lastNearMiss = -999;
    g.secondWindUsed = false;
    g.turboReady = modifiers.turbo;
    g.prevBest = state.stats.bestScore;
    g.lean = 0;
    g.lastTime = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, seedProps, modifiers.turbo]);

  const changeLane = useCallback(
    (dir: number) => {
      if (phase !== "running") return;
      let step = dir;
      if (g.rain && !modifiers.hasABS && g.elapsed > g.shieldUntil) {
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
    showBanner("TURBO!");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [phase, g, sound, showBanner]);

  const spawnVehicle = useCallback(() => {
    const lane = Math.floor(Math.random() * lanes);
    const tooClose = g.vehicles.some((v: Vehicle) => v.lane === lane && v.z > ROAD.farZ - 60);
    if (tooClose) return;
    g.vehicles.push({
      id: nextIdRef.current++,
      lane,
      z: ROAD.farZ,
      truck: Math.random() < 0.22,
      color: vehicleColors[Math.floor(Math.random() * vehicleColors.length)],
      counted: false,
    });
  }, [lanes, vehicleColors, g]);

  const onCrash = useCallback(() => {
    g.bestCombo = Math.max(g.bestCombo, g.combo);
    sound.stopEngine();
    sound.play("crash");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setShowSummary(false);
    setPhase("crashed");
    setTimeout(() => setShowSummary(true), 950);
  }, [g, sound]);

  const comboText = (c: number): string | null => {
    if (c === 2) return "NICE!";
    if (c === 4) return "SLICK!";
    if (c === 6) return "CLOSE CALL!";
    if (c === 9) return "UNREAL!";
    if (c >= 12 && c % 3 === 0) return "LEGEND!";
    return null;
  };

  const step = useCallback(
    (time: number) => {
      if (g.lastTime === 0) g.lastTime = time;
      let dt = (time - g.lastTime) / 1000;
      g.lastTime = time;
      if (dt > CAP_DT) dt = CAP_DT;

      g.elapsed += dt;
      if (g.boostActive && g.elapsed > g.boostUntil) g.boostActive = false;
      const shielded = g.elapsed < g.shieldUntil;
      const magnet = g.elapsed < g.magnetUntil;
      const invincible = g.elapsed < g.invincibleUntil || g.boostActive || shielded;

      const ramp = 1 + (Math.min(g.elapsed, RUN.rampSeconds) / RUN.rampSeconds) * (RUN.maxTimeRamp - 1);
      const braking = g.elapsed < g.brakeUntil ? RUN.brakeFactor : 1;
      const boostMul = g.boostActive ? 1.5 : 1;
      const zSpeed = 92 * modifiers.speedMult * ramp * braking * boostMul;

      g.distance += zSpeed * dt * 0.62;
      g.envIndex = Math.floor(g.distance / RUN.envDistance) % ENVIRONMENTS.length;
      g.rain = ENVIRONMENTS[g.envIndex].rain;

      if (g.elapsed - g.lastNearMiss > 2.5) g.combo = 0;
      g.multiplier = Math.min(5, 1 + g.combo * 0.1) * (g.boostActive ? 2 : 1);
      g.score += zSpeed * dt * 0.14 * g.multiplier * modifiers.scoreMult;

      // player lane lerp
      const targetNorm = laneToNorm(g.playerLane, lanes);
      const laneSpeed = 10 * modifiers.handling;
      g.playerNorm += (targetNorm - g.playerNorm) * Math.min(1, dt * laneSpeed);
      g.lean = Math.max(-1, Math.min(1, (targetNorm - g.playerNorm) * 6)) * 16;

      // spawns
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        spawnVehicle();
        const interval = Math.max(RUN.spawnMin, RUN.spawnBase - g.elapsed * 0.004);
        g.spawnTimer = interval * (0.7 + Math.random() * 0.6);
      }
      if (g.boostActive) {
        g.crateTimer -= dt;
        if (g.crateTimer <= 0) {
          g.crateEnts.push({ id: nextIdRef.current++, lane: Math.floor(Math.random() * lanes), z: ROAD.farZ });
          g.crateTimer = RUN.crateSpawnEvery;
        }
      }
      g.powerTimer -= dt;
      if (g.powerTimer <= 0) {
        g.powerUps.push({
          id: nextIdRef.current++,
          lane: Math.floor(Math.random() * lanes),
          z: ROAD.farZ,
          kind: Math.random() < 0.5 ? "magnet" : "shield",
        });
        g.powerTimer = 13 + Math.random() * 6;
      }

      // scenery props
      for (const pr of g.props as Prop[]) {
        pr.z -= zSpeed * dt;
        if (pr.z < -20) {
          pr.z += ROAD.farZ;
          const env = ENVIRONMENTS[g.envIndex];
          pr.kind = env.prop;
          pr.color = env.propColors[Math.floor(Math.random() * env.propColors.length)];
          pr.h = 60 + Math.random() * 120;
          pr.side = -pr.side;
        }
      }

      // vehicles
      let crashed = false;
      const nextVehicles: Vehicle[] = [];
      for (const v of g.vehicles as Vehicle[]) {
        v.z -= zSpeed * dt;
        if (!v.counted && v.z <= ROAD.playerZ) {
          v.counted = true;
          if (v.lane === g.playerLane) {
            if (!invincible) crashed = true;
            else if (shielded && !g.boostActive) {
              g.shieldUntil = 0; // shield absorbs the hit
              showBanner("BLOCKED!");
            }
          } else if (Math.abs(v.lane - g.playerLane) === 1) {
            g.combo += 1;
            g.bestCombo = Math.max(g.bestCombo, g.combo);
            g.lastNearMiss = g.elapsed;
            g.meter = Math.min(RUN.meterMax, g.meter + RUN.meterPerNearMiss);
            g.score += 20 * g.multiplier;
            sound.play("whoosh");
            const bt = comboText(g.combo);
            if (bt) showBanner(bt);
          }
        }
        if (v.z > -25) nextVehicles.push(v);
      }
      g.vehicles = nextVehicles;

      if (g.meter >= RUN.meterMax && !g.boostActive) {
        g.boostActive = true;
        g.boostUntil = g.elapsed + RUN.boostSeconds;
        g.invincibleUntil = g.elapsed + RUN.boostSeconds;
        g.meter = 0;
        sound.play("boost");
        showBanner("SLIPSTREAM!");
      }

      // crates (magnet attracts)
      const nextCrates: CrateEnt[] = [];
      for (const c of g.crateEnts as CrateEnt[]) {
        c.z -= zSpeed * dt;
        if (magnet && c.z < 140) c.lane += (g.playerLane - c.lane) * Math.min(1, dt * 6);
        if (c.z <= ROAD.playerZ) {
          if (Math.abs(c.lane - g.playerLane) < 0.6) {
            g.cratesCollected += 1;
            sound.play("coin");
            continue;
          }
        }
        if (c.z > -25) nextCrates.push(c);
      }
      g.crateEnts = nextCrates;

      // power-ups
      const nextPU: PowerUp[] = [];
      for (const pu of g.powerUps as PowerUp[]) {
        pu.z -= zSpeed * dt;
        if (pu.z <= ROAD.playerZ) {
          if (pu.lane === g.playerLane) {
            if (pu.kind === "shield") {
              g.shieldUntil = g.elapsed + 6;
              showBanner("SHIELDED!");
            } else {
              g.magnetUntil = g.elapsed + 8;
              showBanner("MAGNET!");
            }
            sound.play("boost");
            continue;
          }
        }
        if (pu.z > -25) nextPU.push(pu);
      }
      g.powerUps = nextPU;

      setTick((t) => (t + 1) % 1000000);

      if (crashed) {
        onCrash();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    },
    [modifiers.speedMult, modifiers.scoreMult, modifiers.handling, lanes, spawnVehicle, onCrash, sound, showBanner, g],
  );

  const start = useCallback(() => {
    resetGame();
    setShowSummary(false);
    setCoinsDoubled(false);
    setBanner(null);
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

  useEffect(() => () => sound.stopEngine(), [sound]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan().onEnd((e) => {
      "worklet";
      const tx = e.translationX;
      const ty = e.translationY;
      if (Math.abs(tx) > Math.abs(ty) && Math.abs(tx) > 12) runOnJS(changeLane)(tx > 0 ? 1 : -1);
      else if (ty > 30) runOnJS(brakePulse)();
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
    g.vehicles = (g.vehicles as Vehicle[]).filter((v) => v.z > 60);
    g.invincibleUntil = g.elapsed + 2.5;
    g.combo = 0;
    sound.startEngine();
    setShowSummary(false);
    setPhase("running");
    toast.show("Second Wind! Ride on", "success");
  }, [ads, toast, g, sound]);

  const doublingRef = useRef(false);
  const doubleCoins = useCallback(async () => {
    if (doublingRef.current || coinsDoubled) return;
    const earned = coinsForRun(Math.round(g.distance), g.cratesCollected);
    if (earned <= 0) return;
    doublingRef.current = true;
    try {
      const ok = await ads.showRewarded("coin-double");
      if (!ok) {
        toast.show("Ad skipped — no bonus", "info");
        return;
      }
      addCoins(earned);
      setCoinsDoubled(true);
      sound.play("coin");
      toast.show(`+${earned} bonus coins!`, "success");
    } finally {
      doublingRef.current = false;
    }
  }, [ads, toast, addCoins, g, sound, coinsDoubled]);

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
  const shieldedNow = phase === "running" && g.elapsed < g.shieldUntil;
  const magnetNow = phase === "running" && g.elapsed < g.magnetUntil;
  const invincibleNow = phase === "running" && (g.elapsed < g.invincibleUntil || g.boostActive || shieldedNow);
  const wheelSpin = phase === "running" ? Math.round((g.elapsed * 1100) % 360) : 0;
  const coinsEarned = phase === "crashed" ? coinsForRun(Math.round(g.distance), g.cratesCollected) : 0;
  const isNewBest = phase === "crashed" && Math.round(g.score) > (g.prevBest ?? 0) && Math.round(g.score) > 0;

  // player projection
  const playerProj = project(ROAD.playerZ, phase === "running" ? g.playerNorm ?? 0 : 0, W, H);
  const playerW = W * 0.2;

  // road polygon points
  const bottomHalf = W * ROAD.roadHalfBottom;
  const topHalf = bottomHalf * (1 / (1 + ROAD.farZ / 200)) * 0.12 + 8;
  const roadPoly = `${W / 2 - bottomHalf},${H} ${W / 2 + bottomHalf},${H} ${W / 2 + topHalf},${horizonY} ${W / 2 - topHalf},${horizonY}`;

  // moving dashes on lane dividers
  const dashOffset = ((g.distance ?? 0) * 0.35) % 40;
  const dividers: { norm: number }[] = [];
  for (let i = 0; i < lanes - 1; i++) {
    dividers.push({ norm: (laneToNorm(i, lanes) + laneToNorm(i + 1, lanes)) / 2 });
  }

  return (
    <View style={styles.container}>
      {/* sky */}
      <LinearGradient colors={[env.skyTop, env.skyBot]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: horizonY + 2 }} />
      {/* ground */}
      <View style={{ position: "absolute", left: 0, right: 0, top: horizonY, bottom: 0, backgroundColor: env.ground }} />
      {/* sun/moon */}
      <View style={[styles.sun, { top: horizonY - 46, backgroundColor: env.key === "night" ? "#EAF0FF" : "#FFF3C4" }]} />

      <GestureDetector gesture={gesture}>
        <View style={styles.playArea} testID="run-play-area">
          {/* road */}
          <Svg style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} width={W} height={H}>
            <Polygon points={roadPoly} fill={env.road} stroke={OUTLINE} strokeWidth={3} />
            <Line x1={W / 2 - bottomHalf} y1={H} x2={W / 2 - topHalf} y2={horizonY} stroke={env.line} strokeWidth={4} />
            <Line x1={W / 2 + bottomHalf} y1={H} x2={W / 2 + topHalf} y2={horizonY} stroke={env.line} strokeWidth={4} />
          </Svg>

          {/* moving lane dashes */}
          {phase !== "crashed" &&
            dividers.map((d, di) =>
              Array.from({ length: 7 }).map((_, j) => {
                const z = j * 40 + 6 - dashOffset;
                if (z < 0) return null;
                const pr = project(z, d.norm, W, H);
                const sz = Math.max(1, 10 * pr.p);
                return (
                  <View
                    key={`d-${di}-${j}`}
                    pointerEvents="none"
                    style={{ position: "absolute", left: pr.x - sz / 4, top: pr.y - sz, width: Math.max(2, sz / 2), height: sz * 1.6, borderRadius: 2, backgroundColor: env.line, opacity: 0.7 }}
                  />
                );
              }),
            )}

          {/* scenery props (far first) */}
          {phase !== "crashed" &&
            [...(g.props ?? [])]
              .sort((a: Prop, b: Prop) => b.z - a.z)
              .map((pr: Prop) => {
                const proj = project(pr.z, pr.side * (1.25 + 0.15), W, H);
                if (proj.p < 0.05) return null;
                return <SceneryProp key={pr.id} kind={pr.kind} color={pr.color} x={proj.x} y={proj.y} p={proj.p} h={pr.h} />;
              })}

          {/* entities sorted far -> near */}
          {phase !== "crashed" &&
            ([
              ...(g.vehicles ?? []).map((v: Vehicle) => ({ t: "v" as const, z: v.z, v })),
              ...(g.crateEnts ?? []).map((c: CrateEnt) => ({ t: "c" as const, z: c.z, c })),
              ...(g.powerUps ?? []).map((pu: PowerUp) => ({ t: "p" as const, z: pu.z, pu })),
            ] as any[])
              .sort((a, b) => b.z - a.z)
              .map((it) => {
                if (it.t === "v") {
                  const pr = project(it.v.z, laneToNorm(it.v.lane, lanes), W, H);
                  if (pr.p < 0.04) return null;
                  const size = W * 0.24 * pr.p;
                  return (
                    <View key={`v${it.v.id}`} pointerEvents="none" style={{ position: "absolute", left: pr.x - size / 2, top: pr.y - size * (it.v.truck ? 1.7 : 1.2), opacity: Math.min(1, pr.p * 3) }}>
                      <Car size={size} color={it.v.color} truck={it.v.truck} spin={wheelSpin} />
                    </View>
                  );
                }
                if (it.t === "c") {
                  const pr = project(it.c.z, laneToNorm(it.c.lane, lanes), W, H);
                  if (pr.p < 0.04) return null;
                  const size = W * 0.13 * pr.p;
                  return (
                    <View key={`c${it.c.id}`} pointerEvents="none" style={{ position: "absolute", left: pr.x - size / 2, top: pr.y - size, opacity: Math.min(1, pr.p * 3) }}>
                      <CrateIcon size={size} />
                    </View>
                  );
                }
                const pr = project(it.pu.z, laneToNorm(it.pu.lane, lanes), W, H);
                if (pr.p < 0.04) return null;
                const size = W * 0.14 * pr.p;
                return (
                  <View key={`p${it.pu.id}`} pointerEvents="none" style={{ position: "absolute", left: pr.x - size / 2, top: pr.y - size, opacity: Math.min(1, pr.p * 3) }}>
                    <PowerUpIcon kind={it.pu.kind} size={size} colors={colors} />
                  </View>
                );
              })}

          {/* trail */}
          {phase === "running" && trailColor ? (
            <LinearGradient
              pointerEvents="none"
              colors={[addAlpha(trailColor, 0), addAlpha(trailColor, 0.6)]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ position: "absolute", width: playerW * 0.5, height: 170, left: playerProj.x - playerW * 0.25, top: playerProj.y - playerW * 1.4 - 130, borderRadius: playerW * 0.25 }}
            />
          ) : null}

          {/* shield ring */}
          {shieldedNow ? (
            <View pointerEvents="none" style={{ position: "absolute", left: playerProj.x - playerW * 0.75, top: playerProj.y - playerW * 1.35, width: playerW * 1.5, height: playerW * 1.5, borderRadius: playerW * 0.75, borderWidth: 4, borderColor: addAlpha(colors.brake, 0.9), backgroundColor: addAlpha(colors.brake, 0.14) }} />
          ) : null}

          {/* player */}
          {phase !== "crashed" && (
            <View testID="run-player" pointerEvents="none" style={{ position: "absolute", left: playerProj.x - playerW / 2, top: playerProj.y - playerW * 1.35 }}>
              <PlayerBike size={playerW} boosting={invincibleNow} spin={wheelSpin} lean={phase === "running" ? g.lean ?? 0 : 0} {...bikeProps} />
            </View>
          )}
          {phase === "crashed" && (
            <View testID="run-player-dead" pointerEvents="none" style={{ position: "absolute", left: playerProj.x - (playerW * 1.15) / 2, top: playerProj.y - playerW * 1.45 }}>
              <PlayerBike size={playerW * 1.15} dead {...bikeProps} />
            </View>
          )}
        </View>
      </GestureDetector>

      {/* combo banner */}
      {banner && phase === "running" ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.bannerWrap, { top: H * 0.32, opacity: bannerAnim, transform: [{ scale: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}
        >
          <Text testID="run-combo-banner" style={styles.bannerText}>{banner.text}</Text>
        </Animated.View>
      ) : null}

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
          shield={shieldedNow}
          magnet={magnetNow}
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
            <Text style={styles.readySub}>Tap or swipe left / right to change lanes.{"\n"}Swipe down to brake. Grab ⚡ power-ups!</Text>
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
          {coinsEarned > 0 && !coinsDoubled ? (
            <>
              <NeonButton testID="run-doublecoins-button" label={`◎  DOUBLE COINS (+${coinsEarned})`} variant="gold" onPress={doubleCoins} />
              <View style={{ height: 10 }} />
            </>
          ) : null}
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

function SceneryProp({ kind, color, x, y, p, h }: { kind: string; color: string; x: number; y: number; p: number; h: number }) {
  const height = h * p;
  const width = Math.max(6, height * (kind === "building" || kind === "tower" ? 0.55 : 0.32));
  if (kind === "building" || kind === "tower") {
    return (
      <View pointerEvents="none" style={{ position: "absolute", left: x - width / 2, top: y - height, width, height, backgroundColor: color, borderColor: OUTLINE, borderWidth: Math.max(1, 2 * p), borderRadius: 3 }}>
        <View style={{ position: "absolute", top: 3 * p, left: 3 * p, right: 3 * p, height: height * 0.18, backgroundColor: kind === "tower" ? "#FFD84D" : "rgba(255,255,255,0.35)", borderRadius: 2 }} />
      </View>
    );
  }
  // trees / cactus / palm — trunk + canopy
  const trunkW = Math.max(3, width * 0.35);
  const canopy = width;
  const isSnow = kind === "pinesnow";
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - canopy / 2, top: y - height, width: canopy, height, alignItems: "center", justifyContent: "flex-end" }}>
      <View style={{ width: canopy, height: height * 0.7, backgroundColor: color, borderColor: OUTLINE, borderWidth: Math.max(1, 1.5 * p), borderRadius: kind === "palm" ? canopy / 2 : canopy * 0.28 }} />
      {isSnow ? <View style={{ position: "absolute", top: 0, width: canopy * 0.8, height: height * 0.22, backgroundColor: "#FFFFFF", borderRadius: canopy * 0.3 }} /> : null}
      <View style={{ width: trunkW, height: height * 0.32, backgroundColor: "#7A5A3A", borderColor: OUTLINE, borderWidth: Math.max(1, 1.2 * p) }} />
    </View>
  );
}

function PowerUpIcon({ kind, size, colors }: { kind: "magnet" | "shield"; size: number; colors: any }) {
  const bg = kind === "shield" ? colors.brake : colors.neonMagenta;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: Math.max(2, size * 0.08), borderColor: OUTLINE, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: size * 0.5 }}>{kind === "shield" ? "⛨" : "⚡"}</Text>
    </View>
  );
}

function RunHUD({ styles, colors, top, bottom, score, distance, multiplier, meter, envName, boost, turboReady, shield, magnet, onTurbo, onBrake, onPause }: any) {
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
        <View style={styles.puRow}>
          {shield ? <View style={[styles.puChip, { backgroundColor: colors.brake }]}><Text style={styles.puChipText}>⛨ SHIELD</Text></View> : null}
          {magnet ? <View style={[styles.puChip, { backgroundColor: colors.neonMagenta }]}><Text style={styles.puChipText}>⚡ MAGNET</Text></View> : null}
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
  playArea: { flex: 1 },
  sun: { position: "absolute", alignSelf: "center", width: 84, height: 84, borderRadius: 42, opacity: 0.9 },
  bannerWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  bannerText: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: OUTLINE,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 1,
  },
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
  puRow: { flexDirection: "row", gap: 8, marginTop: 8, justifyContent: "center" },
  puChip: { borderRadius: 10, borderWidth: 2, borderColor: OUTLINE, paddingHorizontal: 10, paddingVertical: 3 },
  puChipText: { color: "#FFFFFF", fontWeight: "900", fontSize: 11 },
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
