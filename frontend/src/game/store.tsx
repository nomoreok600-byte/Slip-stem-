import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { storage } from "@/src/utils/storage";

import { CRATE_MAX_MS, CRATE_MIN_MS, HIGHER_TIER_MAX, UPGRADE_COST } from "./constants";
import {
  applyDrop,
  canExport,
  crateParts,
  deriveModifiers,
  deriveSpec,
  dropParts,
  exportTokens,
  initialState,
  isStuck,
  refreshGrid as refreshGridLogic,
  resetGridForExport,
  resizeGrid,
  uid,
} from "./logic";
import type { GameState, RunResult } from "./types";

const STORAGE_KEY = "slipstream.save.v1";

type Action =
  | { type: "hydrate"; state: GameState }
  | { type: "recordRun"; result: RunResult }
  | { type: "clearRunsSinceAd" }
  | { type: "openCrate"; crateId: string }
  | { type: "rushCrate"; crateId: string }
  | { type: "drop"; from: number; to: number }
  | { type: "refreshGrid" }
  | { type: "export" }
  | { type: "buy"; key: "grid5" | "scoreMult" | "handling" | "higherTier" };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "hydrate":
      return action.state;

    case "recordRun": {
      const { result } = action;
      // add collected crates with random unlock timers
      const now = Date.now();
      const newCrates = [];
      for (let i = 0; i < result.cratesCollected; i++) {
        newCrates.push({
          id: uid("crate"),
          tier: 1 + (Math.random() < 0.25 ? 1 : 0),
          readyAt: now + CRATE_MIN_MS + Math.random() * (CRATE_MAX_MS - CRATE_MIN_MS),
        });
      }
      return {
        ...state,
        crates: [...state.crates, ...newCrates],
        stats: {
          ...state.stats,
          bestScore: Math.max(state.stats.bestScore, result.score),
          bestDistance: Math.max(state.stats.bestDistance, result.distance),
          bestCombo: Math.max(state.stats.bestCombo, result.bestCombo),
          totalRuns: state.stats.totalRuns + 1,
          runsSinceAd: state.stats.runsSinceAd + 1,
        },
      };
    }

    case "clearRunsSinceAd":
      return { ...state, stats: { ...state.stats, runsSinceAd: 0 } };

    case "openCrate": {
      const crate = state.crates.find((c) => c.id === action.crateId);
      if (!crate) return state;
      const parts = crateParts(crate, state.upgrades);
      const { grid } = dropParts(state.grid, parts);
      return {
        ...state,
        grid,
        crates: state.crates.filter((c) => c.id !== action.crateId),
      };
    }

    case "rushCrate":
      return {
        ...state,
        crates: state.crates.map((c) =>
          c.id === action.crateId ? { ...c, readyAt: Date.now() } : c,
        ),
      };

    case "drop":
      return { ...state, grid: applyDrop(state.grid, action.from, action.to) };

    case "refreshGrid":
      return { ...state, grid: refreshGridLogic(state.grid) };

    case "export": {
      if (!canExport(state)) return state;
      const tokens = state.tokens + exportTokens(state);
      return {
        ...state,
        tokens,
        grid: resetGridForExport(state),
        stats: { ...state.stats, exports: state.stats.exports + 1 },
      };
    }

    case "buy": {
      const u = state.upgrades;
      if (action.key === "grid5") {
        if (u.grid5 || state.tokens < UPGRADE_COST.grid5) return state;
        return {
          ...state,
          tokens: state.tokens - UPGRADE_COST.grid5,
          gridSize: 5,
          grid: resizeGrid(state.grid, state.gridSize, 5),
          upgrades: { ...u, grid5: true },
        };
      }
      if (action.key === "scoreMult") {
        const cost = UPGRADE_COST.scoreMult(u.scoreMult);
        if (state.tokens < cost) return state;
        return {
          ...state,
          tokens: state.tokens - cost,
          upgrades: { ...u, scoreMult: u.scoreMult + 1 },
        };
      }
      if (action.key === "handling") {
        const cost = UPGRADE_COST.handling(u.handling);
        if (state.tokens < cost) return state;
        return {
          ...state,
          tokens: state.tokens - cost,
          upgrades: { ...u, handling: u.handling + 1 },
        };
      }
      if (action.key === "higherTier") {
        if (u.higherTier >= HIGHER_TIER_MAX) return state;
        const cost = UPGRADE_COST.higherTier(u.higherTier);
        if (state.tokens < cost) return state;
        return {
          ...state,
          tokens: state.tokens - cost,
          upgrades: { ...u, higherTier: u.higherTier + 1 },
        };
      }
      return state;
    }

    default:
      return state;
  }
}

type GameContextValue = {
  state: GameState;
  ready: boolean;
  recordRun: (result: RunResult) => void;
  clearRunsSinceAd: () => void;
  openCrate: (crateId: string) => void;
  rushCrate: (crateId: string) => void;
  drop: (from: number, to: number) => void;
  refreshGrid: () => void;
  exportBike: () => void;
  buy: (key: "grid5" | "scoreMult" | "handling" | "higherTier") => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // hydrate from storage once
  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = await storage.getItem<string>(STORAGE_KEY, "");
      if (alive && raw) {
        try {
          const parsed = JSON.parse(raw) as GameState;
          if (parsed && Array.isArray(parsed.grid)) {
            dispatch({ type: "hydrate", state: parsed });
          }
        } catch {
          // ignore corrupt save
        }
      }
      hydrated.current = true;
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // persist on change (after hydration)
  useEffect(() => {
    if (!hydrated.current) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      ready,
      recordRun: (result) => dispatch({ type: "recordRun", result }),
      clearRunsSinceAd: () => dispatch({ type: "clearRunsSinceAd" }),
      openCrate: (crateId) => dispatch({ type: "openCrate", crateId }),
      rushCrate: (crateId) => dispatch({ type: "rushCrate", crateId }),
      drop: (from, to) => dispatch({ type: "drop", from, to }),
      refreshGrid: () => dispatch({ type: "refreshGrid" }),
      exportBike: () => dispatch({ type: "export" }),
      buy: (key) => dispatch({ type: "buy", key }),
    }),
    [state, ready],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

// convenience selectors
export function useBikeSpec() {
  const { state } = useGame();
  return useMemo(() => deriveSpec(state), [state]);
}

export function useRunModifiers() {
  const { state } = useGame();
  return useMemo(() => deriveModifiers(state), [state]);
}

export { canExport, exportTokens, isStuck };
