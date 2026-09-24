import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AdsProvider } from "@/src/ads";
import { SoundProvider } from "@/src/audio";
import { ErrorBoundary } from "@/src/components/error-boundary";
import { LoadingScreen } from "@/src/components/loading-screen";
import { ToastProvider } from "@/src/components/toast";
import { GameProvider, useGame } from "@/src/game/store";
import { queryClient } from "@/src/query-client";

LogBox.ignoreAllLogs(true);

const BG = "#FFF3D6";

function AppGate() {
  const { ready } = useGame();
  if (!ready) return <LoadingScreen />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: BG },
        animation: "fade",
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: BG }}>
          <SafeAreaProvider>
            <KeyboardProvider>
              <SoundProvider>
                <GameProvider>
                  <AdsProvider>
                    <ToastProvider>
                      <StatusBar style="dark" />
                      <AppGate />
                    </ToastProvider>
                  </AdsProvider>
                </GameProvider>
              </SoundProvider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
