import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { storage } from "@/src/utils/storage";

export type Sfx = "click" | "merge" | "coin" | "whoosh" | "crash" | "boost";

const SFX_SOURCES: Record<Sfx, any> = {
  click: require("@/assets/audio/click.wav"),
  merge: require("@/assets/audio/merge.wav"),
  coin: require("@/assets/audio/coin.wav"),
  whoosh: require("@/assets/audio/whoosh.wav"),
  crash: require("@/assets/audio/crash.wav"),
  boost: require("@/assets/audio/boost.wav"),
};
const MUSIC_SOURCE = require("@/assets/audio/music.wav");
const ENGINE_SOURCE = require("@/assets/audio/engine.wav");

const MUTE_KEY = "slipstream.muted.v1";

type SoundContextValue = {
  muted: boolean;
  toggleMuted: () => void;
  play: (name: Sfx) => void;
  startMusic: () => void;
  stopMusic: () => void;
  startEngine: () => void;
  stopEngine: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const sfxPlayers = useRef<Partial<Record<Sfx, AudioPlayer>>>({});
  const musicRef = useRef<AudioPlayer | null>(null);
  const engineRef = useRef<AudioPlayer | null>(null);
  const musicWanted = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      } catch {}
      const saved = await storage.getItem<boolean>(MUTE_KEY, false);
      mutedRef.current = !!saved;
      setMuted(!!saved);
    })();
    return () => {
      try {
        Object.values(sfxPlayers.current).forEach((p) => p?.remove());
        musicRef.current?.remove();
        engineRef.current?.remove();
      } catch {}
    };
  }, []);

  const getSfx = (name: Sfx): AudioPlayer | null => {
    try {
      if (!sfxPlayers.current[name]) {
        sfxPlayers.current[name] = createAudioPlayer(SFX_SOURCES[name]);
      }
      return sfxPlayers.current[name]!;
    } catch {
      return null;
    }
  };

  const play = (name: Sfx) => {
    if (mutedRef.current) return;
    try {
      const p = getSfx(name);
      if (!p) return;
      p.seekTo(0);
      p.volume = 0.7;
      p.play();
    } catch {}
  };

  const startMusic = () => {
    musicWanted.current = true;
    if (mutedRef.current) return;
    try {
      if (!musicRef.current) {
        musicRef.current = createAudioPlayer(MUSIC_SOURCE);
        musicRef.current.loop = true;
        musicRef.current.volume = 0.4;
      }
      musicRef.current.play();
    } catch {}
  };

  const stopMusic = () => {
    musicWanted.current = false;
    try {
      musicRef.current?.pause();
    } catch {}
  };

  const startEngine = () => {
    if (mutedRef.current) return;
    try {
      if (!engineRef.current) {
        engineRef.current = createAudioPlayer(ENGINE_SOURCE);
        engineRef.current.loop = true;
        engineRef.current.volume = 0.35;
      }
      engineRef.current.seekTo(0);
      engineRef.current.play();
    } catch {}
  };

  const stopEngine = () => {
    try {
      engineRef.current?.pause();
    } catch {}
  };

  const toggleMuted = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    storage.setItem(MUTE_KEY, next);
    if (next) {
      try {
        musicRef.current?.pause();
        engineRef.current?.pause();
      } catch {}
    } else if (musicWanted.current) {
      startMusic();
    }
  };

  const value = useMemo<SoundContextValue>(
    () => ({ muted, toggleMuted, play, startMusic, stopMusic, startEngine, stopEngine }),
    [muted],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
