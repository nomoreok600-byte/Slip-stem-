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

import { CRATE_MAX_MS, CRATE_MIN_MS, HIGHER_TIER_MAX, UPGRADE_COST, bikeById, charById } from "./constants";
import {
  addToLeaderboard,
  applyDrop,
  canExport,
  coinsForRun,
  crateParts,
  dailyRewards,
  deriveModifiers,
  deriveSpec,
  dropParts,
  emptyCount,
  exportTokens,
  initialState,
  isStuck,
  makeDaily,
  refreshGrid as refreshGridLogic,
  resetGridForExport,
  resizeGrid,
  todayKey,
  uid,
  yesterdayKey,
} from "./logic";
import type { BikeModel, ColorSlot, GameState, RunResult } from "./types";

const STORAGE_KEY = "slipstream.save.v1";

type Action =
  | { type: "hydrate"; state: GameState }
  | { type: "ensureDaily" }
  | { type: "claimDaily" }
  | { type: "recordRun"; result: RunResult }
  | { type: "clearRunsSinceAd" }
  | { type: "openCrate"; crateId: string }
  | { type: "rushCrate"; crateId: string }
  | { type: "openCrateCoins"; crateId: string; cost: number }
  | { type: "drop"; from: number; to: number }
  | { type: "refreshGrid" }
  | { type: "export" }
  | { type: "buy"; key: "grid5" | "scoreMult" | "handling" | "higherTier" }
  | { type: "buyBike"; id: BikeModel }
  | { type: "selectBike"; id: BikeModel }
  | { type: "buyChar"; id: string }
  | { type: "selectChar"; id: string }
  | { type: "setColor"; slot: ColorSlot; hex: string };

const COIN_OPEN_COST = 100;

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "hydrate":
      return action.state;

    case "ensureDaily": {
      const today = todayKey();
      if (state.daily.dayKey === today) return state;
      // new day -> fresh goal, keep streak (reset happens at claim time if broken)
      return { ...state, daily: makeDaily(today, state.daily.streak, state.daily.lastClaimDay) };
    }

    case "claimDaily": {
      const d = state.daily;
      if (d.claimed || d.progress < d.target) return state;
      const today = todayKey();
      const continues = d.lastClaimDay === yesterdayKey();
      const streak = continues ? d.streak + 1 : 1;
      const reward = dailyRewards(streak);
      const now = Date.now();
      const newCrates = reward.crate
        ? [{ id: uid("crate"), tier: 2, readyAt: now }]
        : [];
      return {
        ...state,
        tokens: state.tokens + reward.tokens,
        coins: state.coins + reward.coins,
        crates: [...state.crates, ...newCrates],
        daily: { ...d, claimed: true, streak, lastClaimDay: today },
      };
    }

    case "recordRun": {
      const { result } = action;
      const now = Date.now();
      const newCrates = [];
      for (let i = 0; i < result.cratesCollected; i++) {
        newCrates.push({
          id: uid("crate"),
          tier: 1 + (Math.random() < 0.25 ? 1 : 0),
          readyAt: now + CRATE_MIN_MS + Math.random() * (CRATE_MAX_MS - CRATE_MIN_MS),
        });
      }
      // daily progress
      const d = state.daily;
      let progress = d.progress;
      if (!d.claimed) {
        if (d.type === "score") progress = Math.max(progress, result.score);
        else if (d.type === "distance") progress += result.distance;
        else if (d.type === "crates") progress += result.cratesCollected;
        else if (d.type === "runs") progress += 1;
      }
      const coinsEarned = coinsForRun(result.distance, result.cratesCollected);
      return {
        ...state,
        coins: state.coins + coinsEarned,
        crates: [...state.crates, ...newCrates],
        daily: { ...d, progress },
        leaderboard: addToLeaderboard(state.leaderboard ?? [], result),
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

    case "openCrateCoins": {
      const crate = state.crates.find((c) => c.id === action.crateId);
      if (!crate) return state;
      if (state.coins < action.cost) return state;
      if (emptyCount(state.grid) <= 0) return state;
      const parts = crateParts(crate, state.upgrades);
      const { grid } = dropParts(state.grid, parts);
      return {
        ...state,
        coins: state.coins - action.cost,
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

    case "buyBike": {
      const c = state.cosmetics;
      if (c.ownedBikes.includes(action.id)) {
        return { ...state, cosmetics: { ...c, selectedBike: action.id } };
      }
      const def = bikeById(action.id);
      if (state.coins < def.cost) return state;
      return {
        ...state,
        coins: state.coins - def.cost,
        cosmetics: {
          ...c,
          ownedBikes: [...c.ownedBikes, action.id],
          selectedBike: action.id,
          bikeColor: def.color,
        },
      };
    }

    case "selectBike": {
      const c = state.cosmetics;
      if (!c.ownedBikes.includes(action.id)) return state;
      return { ...state, cosmetics: { ...c, selectedBike: action.id } };
    }

    case "buyChar": {
      const c = state.cosmetics;
      if (c.ownedChars.includes(action.id)) {
        const d = charById(action.id);
        return {
          ...state,
          cosmetics: { ...c, selectedChar: action.id, outfitColor: d.outfit, helmetColor: d.helmet },
        };
      }
      const def = charById(action.id);
      if (state.coins < def.cost) return state;
      return {
        ...state,
        coins: state.coins - def.cost,
        cosmetics: {
          ...c,
          ownedChars: [...c.ownedChars, action.id],
          selectedChar: action.id,
          outfitColor: def.outfit,
          helmetColor: def.helmet,
        },
      };
    }

    case "selectChar": {
      const c = state.cosmetics;
      if (!c.ownedChars.includes(action.id)) return state;
      const d = charById(action.id);
      return {
        ...state,
        cosmetics: { ...c, selectedChar: action.id, outfitColor: d.outfit, helmetColor: d.helmet },
      };
    }

    case "setColor":
      return { ...state, cosmetics: { ...state.cosmetics, [action.slot]: action.hex } };

    default:
      return state;
  }
}

type GameContextValue = {
  state: GameState;
  ready: boolean;
  recordRun: (result: RunResult) => void;
  clearRunsSinceAd: () => void;
  claimDaily: () => void;
  openCrate: (crateId: string) => void;
  openCrateCoins: (crateId: string) => void;
  rushCrate: (crateId: string) => void;
  drop: (from: number, to: number) => void;
  refreshGrid: () => void;
  exportBike: () => void;
  buy: (key: "grid5" | "scoreMult" | "handling" | "higherTier") => void;
  buyBike: (id: BikeModel) => void;
  selectBike: (id: BikeModel) => void;
  buyChar: (id: string) => void;
  selectChar: (id: string) => void;
  setColor: (slot: ColorSlot, hex: string) => void;
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
          const parsed = JSON.parse(raw) as Partial<GameState>;
          if (parsed && Array.isArray(parsed.grid)) {
            const base = initialState();
            const merged: GameState = {
              ...base,
              ...parsed,
              coins: parsed.coins ?? 0,
              daily: parsed.daily ?? base.daily,
              upgrades: { ...base.upgrades, ...(parsed.upgrades ?? {}) },
              stats: { ...base.stats, ...(parsed.stats ?? {}) },
              cosmetics: { ...base.cosmetics, ...(parsed.cosmetics ?? {}) },
              leaderboard: parsed.leaderboard ?? [],
            } as GameState;
            dispatch({ type: "hydrate", state: merged });
          }
        } catch {
          // ignore corrupt save
        }
      }
      hydrated.current = true;
      dispatch({ type: "ensureDaily" });
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
      claimDaily: () => dispatch({ type: "claimDaily" }),
      openCrate: (crateId) => dispatch({ type: "openCrate", crateId }),
      openCrateCoins: (crateId) => dispatch({ type: "openCrateCoins", crateId, cost: COIN_OPEN_COST }),
      rushCrate: (crateId) => dispatch({ type: "rushCrate", crateId }),
      drop: (from, to) => dispatch({ type: "drop", from, to }),
      refreshGrid: () => dispatch({ type: "refreshGrid" }),
      exportBike: () => dispatch({ type: "export" }),
      buy: (key) => dispatch({ type: "buy", key }),
      buyBike: (id) => dispatch({ type: "buyBike", id }),
      selectBike: (id) => dispatch({ type: "selectBike", id }),
      buyChar: (id) => dispatch({ type: "buyChar", id }),
      selectChar: (id) => dispatch({ type: "selectChar", id }),
      setColor: (slot, hex) => dispatch({ type: "setColor", slot, hex }),
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

export { canExport, exportTokens, isStuck, COIN_OPEN_COST };
