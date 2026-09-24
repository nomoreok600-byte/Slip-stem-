import { LinearGradient } from "expo-linear-gradient";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { adsAvailable, initAds, showInterstitialAd, showRewardedAd } from "@/src/admob";
import { makeStyles, useTheme } from "@/src/theme";

// Real AdMob native ads only run in a custom/EAS build. Expo Go and web get a
// labeled placeholder wired to the SAME triggers so the whole game loop is
// testable in preview.
export type RewardPlacement = "second-wind" | "crate-rush" | "grid-refresh";

type AdsContextValue = {
  showInterstitial: () => Promise<void>;
  showRewarded: (placement: RewardPlacement) => Promise<boolean>;
};

const AdsContext = createContext<AdsContextValue | null>(null);

const PLACEMENT_LABEL: Record<RewardPlacement, string> = {
  "second-wind": "Second Wind — rewind 3s & continue",
  "crate-rush": "Crate Rush — open crate instantly",
  "grid-refresh": "Grid Refresh — clear low parts",
};

type Overlay =
  | { kind: "interstitial"; resolve: () => void }
  | { kind: "rewarded"; placement: RewardPlacement; resolve: (v: boolean) => void }
  | null;

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const [overlay, setOverlay] = useState<Overlay>(null);

  useEffect(() => {
    if (adsAvailable) initAds();
  }, []);

  const showInterstitial = useCallback((): Promise<void> => {
    if (!adsAvailable) {
      return new Promise<void>((resolve) => setOverlay({ kind: "interstitial", resolve }));
    }
    return showInterstitialAd();
  }, []);

  const showRewarded = useCallback((placement: RewardPlacement): Promise<boolean> => {
    if (!adsAvailable) {
      return new Promise<boolean>((resolve) =>
        setOverlay({ kind: "rewarded", placement, resolve }),
      );
    }
    return showRewardedAd();
  }, []);

  const value = useMemo(
    () => ({ showInterstitial, showRewarded }),
    [showInterstitial, showRewarded],
  );

  return (
    <AdsContext.Provider value={value}>
      {children}
      <AdOverlay overlay={overlay} clear={() => setOverlay(null)} />
    </AdsContext.Provider>
  );
}

function AdOverlay({ overlay, clear }: { overlay: Overlay; clear: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (overlay?.kind !== "interstitial") return;
    setCountdown(3);
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [overlay]);

  if (!overlay) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent testID="ad-overlay">
      <View style={styles.backdrop}>
        <LinearGradient
          colors={[colors.neonMagenta, colors.neonPurple, colors.neonCyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Text style={styles.badge}>PREVIEW AD PLACEHOLDER</Text>
          {overlay.kind === "interstitial" ? (
            <>
              <Text style={styles.title}>Interstitial Ad</Text>
              <Text style={styles.sub}>
                Real Google ads show here after you publish & build. This placeholder keeps the
                loop testable.
              </Text>
              <Pressable
                testID="ad-interstitial-close"
                disabled={countdown > 0}
                onPress={() => {
                  overlay.resolve();
                  clear();
                }}
                style={[styles.btn, countdown > 0 && styles.btnDisabled]}
              >
                <Text style={styles.btnText}>
                  {countdown > 0 ? `Skip in ${countdown}s` : "Close ad"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>Rewarded Ad</Text>
              <Text style={styles.sub}>{PLACEMENT_LABEL[overlay.placement]}</Text>
              <Pressable
                testID="ad-rewarded-claim"
                onPress={() => {
                  overlay.resolve(true);
                  clear();
                }}
                style={styles.btn}
              >
                <Text style={styles.btnText}>Watch & claim reward</Text>
              </Pressable>
              <Pressable
                testID="ad-rewarded-skip"
                onPress={() => {
                  overlay.resolve(false);
                  clear();
                }}
                style={styles.skip}
              >
                <Text style={styles.skipText}>No thanks</Text>
              </Pressable>
            </>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

export function useAds(): AdsContextValue {
  const ctx = useContext(AdsContext);
  if (!ctx) throw new Error("useAds must be used within AdsProvider");
  return ctx;
}

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: { width: "100%", maxWidth: 380, borderRadius: 24, padding: 3 },
  badge: {
    color: colors.onSurfaceInverse,
    backgroundColor: "rgba(0,0,0,0.55)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
    paddingVertical: 10,
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 24,
  },
  sub: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    marginHorizontal: 20,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: "rgba(0,0,0,0.65)",
    marginTop: 28,
    marginHorizontal: 20,
    borderRadius: 14,
    paddingVertical: 16,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", textAlign: "center" },
  skip: { marginTop: 12, marginBottom: 22, paddingVertical: 10 },
  skipText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
}));
