import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

import { BikeBadge } from "@/src/components/sprites";
import { makeStyles, useTheme } from "@/src/theme";

export function LoadingScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const bounce = useRef(new Animated.Value(0)).current;
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const stripe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
    dots.forEach((d, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 320, useNativeDriver: true }),
        ]),
      ).start();
    });
    Animated.loop(
      Animated.timing(stripe, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true }),
    ).start();
  }, [bounce, dots, stripe]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const scaleShadow = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] });
  const stripeX = stripe.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });

  return (
    <View style={styles.container}>
      <Text style={styles.studio}>MRB STUDIO</Text>
      <Text style={styles.title}>SLIPSTREAM</Text>
      <Text style={styles.subtitle}>MERGE & RIDE</Text>

      <View style={styles.stage}>
        <Animated.View style={[styles.shadow, { transform: [{ scaleX: scaleShadow }] }]} />
        <Animated.View style={{ transform: [{ translateY }] }}>
          <BikeBadge size={130} />
        </Animated.View>
      </View>

      <View style={styles.road}>
        <Animated.View style={[styles.stripes, { transform: [{ translateX: stripeX }] }]}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={i} style={styles.stripe} />
          ))}
        </Animated.View>
      </View>

      <View style={styles.loadingRow}>
        <Text style={styles.loadingText}>Revving up</Text>
        {dots.map((d, i) => (
          <Animated.Text key={i} style={[styles.dot, { opacity: d, transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}>
            .
          </Animated.Text>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  studio: { color: colors.brandPrimary, fontSize: 13, fontWeight: "900", letterSpacing: 5, marginBottom: 4 },
  title: {
    color: colors.onSurface,
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 1,
  },
  subtitle: { color: colors.brandSecondary, fontSize: 15, fontWeight: "900", letterSpacing: 6, marginTop: 2 },
  stage: { marginTop: 40, alignItems: "center", justifyContent: "flex-end", height: 170 },
  shadow: { position: "absolute", bottom: 6, width: 90, height: 16, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.18)" },
  road: { marginTop: 18, width: 220, height: 12, backgroundColor: colors.road, borderRadius: 6, overflow: "hidden", borderWidth: 3, borderColor: colors.outline },
  stripes: { flexDirection: "row", position: "absolute", left: 0, top: 3 },
  stripe: { width: 20, height: 4, borderRadius: 2, backgroundColor: colors.roadLine, marginRight: 20 },
  loadingRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 26 },
  loadingText: { color: colors.onSurfaceTertiary, fontSize: 16, fontWeight: "800" },
  dot: { color: colors.onSurfaceTertiary, fontSize: 22, fontWeight: "900" },
}));
