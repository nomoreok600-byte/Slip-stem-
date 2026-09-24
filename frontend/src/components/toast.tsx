import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles } from "@/src/theme";

type ToastKind = "info" | "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };

type ToastContextValue = { show: (message: string, kind?: ToastKind) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, kind: ToastKind = "info") => {
      idRef.current += 1;
      setToast({ id: idRef.current, message, kind });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(
        ({ finished }) => finished && setToast(null),
      );
    }, 2200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, opacity]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          testID="toast"
          style={[
            styles.wrap,
            { top: insets.top + 12, opacity },
          ]}
        >
          <View
            style={[
              styles.toast,
              toast.kind === "success" && styles.success,
              toast.kind === "error" && styles.error,
            ]}
          >
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  toast: {
    backgroundColor: colors.surfaceInverse,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxWidth: "88%",
    borderWidth: 1,
    borderColor: colors.neonCyan,
    ...StyleSheet.flatten({ shadowColor: colors.neonCyan, shadowOpacity: 0.6, shadowRadius: 12 }),
  },
  success: { borderColor: colors.success },
  error: { borderColor: colors.error },
  text: { color: colors.onSurfaceInverse, fontWeight: "700", fontSize: 14, textAlign: "center" },
}));
