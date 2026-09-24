import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSound } from "@/src/audio";
import { useToast } from "@/src/components/toast";
import { CoinIcon, PlayerBike } from "@/src/components/sprites";
import { addAlpha } from "@/src/components/ui";
import {
  BIKES,
  BIKE_COLORS,
  CHARACTERS,
  HELMET_COLORS,
  OUTFIT_COLORS,
  bikeById,
  charById,
} from "@/src/game/constants";
import { useGame } from "@/src/game/store";
import type { BikeModel, ColorSlot } from "@/src/game/types";
import { makeStyles, useTheme } from "@/src/theme";

const OUTLINE = "#3A2E1E";
type Tab = "bikes" | "rider" | "paint";

export default function Shop() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, buyBike, selectBike, buyChar, selectChar, setColor } = useGame();
  const sound = useSound();
  const toast = useToast();
  const cos = state.cosmetics;
  const [tab, setTab] = useState<Tab>("bikes");

  const buzz = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
  };

  const onBuyBike = (id: BikeModel) => {
    const def = bikeById(id);
    if (cos.ownedBikes.includes(id)) {
      selectBike(id);
      sound.play("click");
      buzz();
      return;
    }
    if (state.coins < def.cost) {
      toast.show(`Need ${def.cost.toLocaleString()} coins`, "error");
      return;
    }
    buyBike(id);
    sound.play("coin");
    toast.show(`${def.name} unlocked!`, "success");
  };

  const onBuyChar = (id: string) => {
    const def = charById(id);
    if (cos.ownedChars.includes(id)) {
      selectChar(id);
      sound.play("click");
      buzz();
      return;
    }
    if (state.coins < def.cost) {
      toast.show(`Need ${def.cost.toLocaleString()} coins`, "error");
      return;
    }
    buyChar(id);
    sound.play("coin");
    toast.show(`${def.name} unlocked!`, "success");
  };

  const pickColor = (slot: ColorSlot, hex: string) => {
    setColor(slot, hex);
    sound.play("click");
    buzz();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable testID="shop-back-button" onPress={() => router.replace("/")} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>SHOP</Text>
        <View style={styles.coinPill}>
          <CoinIcon size={16} />
          <Text style={styles.coinText}>{state.coins.toLocaleString()}</Text>
        </View>
      </View>

      {/* segmented tabs */}
      <View style={styles.segment}>
        {(["bikes", "rider", "paint"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            testID={`shop-tab-${t}`}
            onPress={() => {
              setTab(t);
              buzz();
            }}
            style={[styles.segBtn, tab === t && styles.segBtnActive]}
          >
            <Text style={[styles.segText, tab === t && styles.segTextActive]}>
              {t === "bikes" ? "Bikes" : t === "rider" ? "Rider" : "Paint"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* live preview */}
        <View style={styles.preview} testID="shop-preview">
          <PlayerBike
            size={120}
            model={cos.selectedBike}
            bikeColor={cos.bikeColor}
            helmetColor={cos.helmetColor}
            outfitColor={cos.outfitColor}
          />
        </View>

        {tab === "bikes" &&
          BIKES.map((b) => {
            const owned = cos.ownedBikes.includes(b.id);
            const selected = cos.selectedBike === b.id;
            const affordable = state.coins >= b.cost;
            return (
              <View key={b.id} style={[styles.card, selected && styles.cardSelected]} testID={`shop-bike-${b.id}`}>
                <View style={styles.cardIcon}>
                  <PlayerBike size={62} model={b.id} bikeColor={owned && selected ? cos.bikeColor : b.color} helmetColor={cos.helmetColor} outfitColor={cos.outfitColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{b.name}</Text>
                  <Text style={styles.cardDesc}>{b.desc}</Text>
                  <View style={styles.statTagRow}>
                    <StatTag label="SPD" value={b.speed} color={colors.engine} />
                    <StatTag label="HND" value={b.handling} color={colors.aero} />
                    <StatTag label="BRK" value={b.braking} color={colors.brake} />
                  </View>
                </View>
                <Pressable
                  testID={`shop-bike-buy-${b.id}`}
                  onPress={() => onBuyBike(b.id)}
                  style={[
                    styles.buyBtn,
                    {
                      backgroundColor: selected
                        ? colors.success
                        : owned
                          ? colors.surfaceTertiary
                          : affordable
                            ? colors.neonGold
                            : colors.surfaceTertiary,
                    },
                  ]}
                >
                  {selected ? (
                    <Text style={[styles.buyText, { color: colors.onSuccess }]}>✓</Text>
                  ) : owned ? (
                    <Text style={[styles.buyText, { color: colors.onSurface }]}>USE</Text>
                  ) : (
                    <>
                      <CoinIcon size={14} />
                      <Text style={[styles.buyText, { color: colors.onCrate }]}>{b.cost.toLocaleString()}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })}

        {tab === "rider" &&
          CHARACTERS.map((c) => {
            const owned = cos.ownedChars.includes(c.id);
            const selected = cos.selectedChar === c.id;
            const affordable = state.coins >= c.cost;
            return (
              <View key={c.id} style={[styles.card, selected && styles.cardSelected]} testID={`shop-char-${c.id}`}>
                <View style={styles.cardIcon}>
                  <PlayerBike size={62} model={cos.selectedBike} bikeColor={cos.bikeColor} helmetColor={c.helmet} outfitColor={c.outfit} skin={c.skin} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{c.name}</Text>
                  <Text style={styles.cardDesc}>{c.desc}</Text>
                </View>
                <Pressable
                  testID={`shop-char-buy-${c.id}`}
                  onPress={() => onBuyChar(c.id)}
                  style={[
                    styles.buyBtn,
                    {
                      backgroundColor: selected
                        ? colors.success
                        : owned
                          ? colors.surfaceTertiary
                          : affordable
                            ? colors.neonGold
                            : colors.surfaceTertiary,
                    },
                  ]}
                >
                  {selected ? (
                    <Text style={[styles.buyText, { color: colors.onSuccess }]}>✓</Text>
                  ) : owned ? (
                    <Text style={[styles.buyText, { color: colors.onSurface }]}>USE</Text>
                  ) : (
                    <>
                      <CoinIcon size={14} />
                      <Text style={[styles.buyText, { color: colors.onCrate }]}>{c.cost.toLocaleString()}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })}

        {tab === "paint" && (
          <>
            <PaintRow title="Bike Paint" slot="bikeColor" swatches={BIKE_COLORS} current={cos.bikeColor} onPick={pickColor} />
            <PaintRow title="Helmet" slot="helmetColor" swatches={HELMET_COLORS} current={cos.helmetColor} onPick={pickColor} />
            <PaintRow title="Outfit" slot="outfitColor" swatches={OUTFIT_COLORS} current={cos.outfitColor} onPick={pickColor} />
            <Text style={styles.paintHint}>Colors apply instantly to your rider — tap the road to ride and show them off!</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatTag({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useStyles();
  if (value <= 0) return null;
  return (
    <View style={[styles.statTag, { borderColor: color, backgroundColor: addAlpha(color, 0.16) }]}>
      <Text style={[styles.statTagText, { color }]}>{label} +{value}</Text>
    </View>
  );
}

function PaintRow({
  title,
  slot,
  swatches,
  current,
  onPick,
}: {
  title: string;
  slot: ColorSlot;
  swatches: string[];
  current: string;
  onPick: (slot: ColorSlot, hex: string) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.paintCard}>
      <Text style={styles.paintTitle}>{title}</Text>
      <View style={styles.swatchWrap}>
        {swatches.map((hex) => {
          const active = current.toLowerCase() === hex.toLowerCase();
          return (
            <Pressable
              key={hex}
              testID={`paint-${slot}-${hex}`}
              onPress={() => onPick(slot, hex)}
              style={[styles.swatch, { backgroundColor: hex }, active && styles.swatchActive]}
            >
              {active ? <Text style={styles.swatchCheck}>✓</Text> : null}
            </Pressable>
          );
        })}
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
  headerTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 2 },
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
  segment: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  segBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 5,
  },
  segBtnActive: { backgroundColor: colors.brandPrimary },
  segText: { color: colors.muted, fontWeight: "900", fontSize: 14 },
  segTextActive: { color: "#FFFFFF" },
  preview: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 6,
    paddingVertical: 12,
    marginBottom: 16,
    height: 176,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 6,
  },
  cardSelected: { borderColor: colors.success },
  cardIcon: { width: 64, height: 92, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "900" },
  cardDesc: { color: colors.muted, fontSize: 12, fontWeight: "600", marginTop: 2, marginBottom: 6 },
  statTagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statTag: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 7, paddingVertical: 2 },
  statTagText: { fontWeight: "900", fontSize: 10 },
  buyBtn: {
    minWidth: 62,
    height: 40,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 5,
  },
  buyText: { fontWeight: "900", fontSize: 13 },
  paintCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderBottomWidth: 6,
  },
  paintTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "900", marginBottom: 10 },
  swatchWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: OUTLINE,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchActive: { borderColor: colors.success, borderWidth: 4 },
  swatchCheck: { color: "#FFFFFF", fontWeight: "900", fontSize: 18, textShadowColor: OUTLINE, textShadowRadius: 2, textShadowOffset: { width: 1, height: 1 } },
  paintHint: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 4, fontWeight: "600" },
}));
