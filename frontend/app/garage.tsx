import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAds } from "@/src/ads";
import { useToast } from "@/src/components/toast";
import { GlowCard, NeonButton, PartTile, SectionTitle, StatBar, addAlpha } from "@/src/components/ui";
import { emptyCount } from "@/src/game/logic";
import {
  canExport,
  exportTokens,
  isStuck,
  useBikeSpec,
  useGame,
} from "@/src/game/store";
import type { Cell } from "@/src/game/types";
import { makeStyles, useTheme } from "@/src/theme";

export default function Garage() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state, drop, openCrate, rushCrate, refreshGrid, exportBike } = useGame();
  const spec = useBikeSpec();
  const ads = useAds();
  const toast = useToast();

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const gridSize = state.gridSize;
  const gap = 10;
  const gridPadding = 16;
  const containerWidth = width - 40; // screen padding 20 each side
  const cellSize = Math.floor((containerWidth - gridPadding * 2 - gap * (gridSize - 1)) / gridSize);
  const gridInner = cellSize * gridSize + gap * (gridSize - 1);

  const stuck = useMemo(() => isStuck(state.grid), [state.grid]);
  const empties = emptyCount(state.grid);
  const exportable = canExport(state);
  const tokensOnExport = exportTokens(state);

  const handleDrop = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const a = state.grid[from];
      const b = state.grid[to];
      drop(from, to);
      if (a && b && a.family === b.family && a.level === b.level) {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [state.grid, drop],
  );

  const handleOpen = useCallback(
    (crateId: string) => {
      if (empties <= 0) {
        toast.show("Grid is full — merge or refresh first", "error");
        return;
      }
      openCrate(crateId);
      toast.show("Crate opened — parts dropped!", "success");
    },
    [empties, openCrate, toast],
  );

  const handleRush = useCallback(
    async (crateId: string) => {
      const ok = await ads.showRewarded("crate-rush");
      if (!ok) {
        toast.show("Ad skipped", "info");
        return;
      }
      if (empties <= 0) {
        rushCrate(crateId);
        toast.show("Crate unlocked — free grid space to open", "info");
        return;
      }
      openCrate(crateId);
      toast.show("Crate rushed & opened!", "success");
    },
    [ads, empties, openCrate, rushCrate, toast],
  );

  const handleRefresh = useCallback(async () => {
    const ok = await ads.showRewarded("grid-refresh");
    if (!ok) {
      toast.show("Ad skipped", "info");
      return;
    }
    refreshGrid();
    toast.show("Grid refreshed!", "success");
  }, [ads, refreshGrid, toast]);

  const handleExport = useCallback(() => {
    if (!exportable) return;
    exportBike();
    toast.show(`Bike exported! +${tokensOnExport} Syndicate Tokens`, "success");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [exportable, exportBike, tokensOnExport, toast]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable testID="garage-back-button" onPress={() => router.replace("/")} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>GARAGE</Text>
        <View style={styles.tokenPill}>
          <Text style={styles.tokenText}>◆ {state.tokens}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* bike spec */}
        <GlowCard glow={colors.neonCyan} style={{ marginBottom: 16 }}>
          <View style={styles.specHead}>
            <Text style={styles.cardHeading}>BIKE SPEC</Text>
            <View style={styles.tags}>
              <MiniTag on={spec.hasABS} label="ABS" color={colors.brake} />
              <MiniTag on={spec.turbo} label="TURBO" color={colors.neonMagenta} />
            </View>
          </View>
          <StatBar label="Speed" value={spec.speed} color={colors.engine} />
          <StatBar label="Handling" value={spec.handling} color={colors.aero} />
          <StatBar label="Braking" value={spec.braking} color={colors.brake} />
        </GlowCard>

        {/* crates */}
        <SectionTitle>Loot Crates</SectionTitle>
        {state.crates.length === 0 ? (
          <GlowCard style={{ marginBottom: 16 }}>
            <Text style={styles.emptyText}>
              No crates yet. Fill your Slipstream meter on a ride to drop crates onto the highway!
            </Text>
          </GlowCard>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingBottom: 4, paddingRight: 4 }}
            style={{ marginBottom: 16 }}
          >
            {state.crates.map((c) => {
              const ready = c.readyAt <= now;
              const remain = Math.max(0, Math.ceil((c.readyAt - now) / 1000));
              return (
                <View key={c.id} style={styles.crateCard} testID={`crate-${c.id}`}>
                  <LinearGradient
                    colors={[colors.crate, colors.warning]}
                    style={styles.crateIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.crateTier}>T{c.tier}</Text>
                  </LinearGradient>
                  {ready ? (
                    <Pressable
                      testID={`crate-open-${c.id}`}
                      onPress={() => handleOpen(c.id)}
                      style={[styles.crateBtn, { backgroundColor: colors.success }]}
                    >
                      <Text style={[styles.crateBtnText, { color: colors.onSuccess }]}>OPEN</Text>
                    </Pressable>
                  ) : (
                    <>
                      <Text style={styles.crateTimer}>{formatTime(remain)}</Text>
                      <Pressable
                        testID={`crate-rush-${c.id}`}
                        onPress={() => handleRush(c.id)}
                        style={[styles.crateBtn, { backgroundColor: colors.neonMagenta }]}
                      >
                        <Text style={[styles.crateBtnText, { color: colors.onBrandSecondary }]}>
                          ◎ RUSH
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* merge grid */}
        <View style={styles.gridHead}>
          <SectionTitle style={{ marginBottom: 0 }}>Merge Grid</SectionTitle>
          <Text style={styles.gridInfo}>
            {gridSize}×{gridSize} · {empties} free
          </Text>
        </View>
        <View style={[styles.gridCard, { padding: gridPadding }]}>
          <MergeGrid
            grid={state.grid}
            gridSize={gridSize}
            cellSize={cellSize}
            gap={gap}
            innerSize={gridInner}
            onDrop={handleDrop}
          />
        </View>
        <Text style={styles.hint}>Drag identical parts together to merge them up a level.</Text>

        {/* actions */}
        <View style={{ height: 8 }} />
        {stuck ? (
          <>
            <NeonButton
              testID="garage-refresh-button"
              label="◎  GRID REFRESH (watch ad)"
              variant="gold"
              onPress={handleRefresh}
            />
            <View style={{ height: 10 }} />
          </>
        ) : null}

        <NeonButton
          testID="garage-export-button"
          label={exportable ? `EXPORT BIKE  →  +${tokensOnExport} ◆` : "EXPORT (needs 155cc FI engine)"}
          variant={exportable ? "secondary" : "ghost"}
          disabled={!exportable}
          onPress={handleExport}
        />
        <View style={{ height: 10 }} />
        <NeonButton testID="garage-ride-button" label="▲  RIDE" onPress={() => router.replace("/run")} />
      </ScrollView>
    </View>
  );
}

// ---------- Merge grid with drag & drop ----------
function MergeGrid({
  grid,
  gridSize,
  cellSize,
  gap,
  innerSize,
  onDrop,
}: {
  grid: Cell[];
  gridSize: number;
  cellSize: number;
  gap: number;
  innerSize: number;
  onDrop: (from: number, to: number) => void;
}) {
  const styles = useStyles();
  const cellFull = cellSize + gap;
  return (
    <View style={{ width: innerSize, height: innerSize, alignSelf: "center" }}>
      {/* base slots */}
      {grid.map((_, i) => {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        return (
          <View
            key={`slot-${i}`}
            style={[
              styles.slot,
              {
                width: cellSize,
                height: cellSize,
                left: col * cellFull,
                top: row * cellFull,
              },
            ]}
          />
        );
      })}
      {/* draggable tiles */}
      {grid.map((cell, i) =>
        cell ? (
          <DraggableTile
            key={`tile-${i}-${cell.family}-${cell.level}`}
            index={i}
            cell={cell}
            gridSize={gridSize}
            cellSize={cellSize}
            cellFull={cellFull}
            onDrop={onDrop}
          />
        ) : null,
      )}
    </View>
  );
}

function DraggableTile({
  index,
  cell,
  gridSize,
  cellSize,
  cellFull,
  onDrop,
}: {
  index: number;
  cell: NonNullable<Cell>;
  gridSize: number;
  cellSize: number;
  cellFull: number;
  onDrop: (from: number, to: number) => void;
}) {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const baseX = col * cellFull;
  const baseY = row * cellFull;
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const dragging = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => {
      dragging.value = 1;
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(() => {
      const targetCol = Math.max(0, Math.min(gridSize - 1, Math.round((baseX + tx.value) / cellFull)));
      const targetRow = Math.max(0, Math.min(gridSize - 1, Math.round((baseY + ty.value) / cellFull)));
      const to = targetRow * gridSize + targetCol;
      dragging.value = 0;
      tx.value = withTiming(0, { duration: 120 });
      ty.value = withTiming(0, { duration: 120 });
      if (to !== index) runOnJS(onDrop)(index, to);
    });

  const aStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: dragging.value ? 1.12 : 1 },
    ],
    zIndex: dragging.value ? 100 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID={`grid-tile-${index}`}
        style={[
          { position: "absolute", left: baseX, top: baseY, width: cellSize, height: cellSize },
          aStyle,
        ]}
      >
        <PartTile family={cell.family} level={cell.level} size={cellSize} compact={cellSize < 70} />
      </Animated.View>
    </GestureDetector>
  );
}

function MiniTag({ on, label, color }: { on: boolean; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: 1.5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderColor: on ? color : colors.border,
        backgroundColor: on ? addAlpha(color, 0.16) : "transparent",
      }}
    >
      <Text style={{ color: on ? color : colors.muted, fontWeight: "900", fontSize: 11 }}>{label}</Text>
    </View>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: { color: colors.onSurface, fontSize: 28, fontWeight: "900", marginTop: -4 },
  headerTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 3 },
  tokenPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: addAlpha(colors.neonGold, 0.16),
    borderWidth: 1,
    borderColor: colors.neonGold,
  },
  tokenText: { color: colors.neonGold, fontWeight: "900", fontSize: 14 },
  cardHeading: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  specHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  tags: { flexDirection: "row", gap: 6 },
  emptyText: { color: colors.onSurfaceTertiary, fontSize: 14, lineHeight: 20 },
  crateCard: {
    width: 108,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  crateIcon: {
    width: 54,
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  crateTier: { color: colors.onCrate, fontWeight: "900", fontSize: 16 },
  crateTimer: { color: colors.onSurfaceTertiary, fontWeight: "800", fontSize: 13, marginBottom: 6 },
  crateBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    width: "100%",
  },
  crateBtnText: { fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  gridHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  gridInfo: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "700" },
  gridCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  slot: {
    position: "absolute",
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 10, marginBottom: 6 },
}));
