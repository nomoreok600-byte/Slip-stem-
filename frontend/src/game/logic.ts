import { bikeById, DEFAULT_COSMETICS, FAMILIES, LEADERBOARD_MAX, MAX_LEVEL } from "./constants";
import type {
  BikeSpec,
  Cell,
  Crate,
  Daily,
  DailyGoalType,
  Family,
  GameState,
  LeaderboardEntry,
  Part,
  RunModifiers,
  RunResult,
  Upgrades,
  Weekly,
  WeeklyGoalType,
} from "./types";

let idCounter = 0;
export function uid(prefix = "id"): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function partValue(level: number): number {
  return Math.pow(2, level - 1);
}

export function randomFamily(): Family {
  return FAMILIES[Math.floor(Math.random() * FAMILIES.length)];
}

export function emptyGrid(size: number): Cell[] {
  return new Array(size * size).fill(null);
}

export function initialState(): GameState {
  const size = 4;
  const grid = emptyGrid(size);
  // seed a couple of starter parts so the garage isn't empty on first open
  grid[0] = { family: "engine", level: 1 };
  grid[1] = { family: "engine", level: 1 };
  grid[4] = { family: "brake", level: 1 };
  return {
    grid,
    gridSize: size,
    crates: [],
    tokens: 0,
    coins: 0,
    daily: makeDaily(todayKey(), 0, null),
    weekly: makeWeekly(weekKey()),
    upgrades: { grid5: false, scoreMult: 0, handling: 0, higherTier: 0 },
    stats: {
      bestScore: 0,
      totalRuns: 0,
      runsSinceAd: 0,
      bestCombo: 0,
      bestDistance: 0,
      exports: 0,
    },
    cosmetics: { ...DEFAULT_COSMETICS, ownedBikes: ["street"], ownedChars: ["rookie"] },
    leaderboard: [],
  };
}

// ---------- Leaderboard ----------
export function addToLeaderboard(
  board: LeaderboardEntry[],
  result: RunResult,
): LeaderboardEntry[] {
  const entry: LeaderboardEntry = {
    id: uid("lb"),
    score: result.score,
    distance: result.distance,
    combo: result.bestCombo,
    date: new Date().toISOString(),
  };
  return [...board, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, LEADERBOARD_MAX);
}

// ---------- Daily challenge ----------
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

function hashKey(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const GOAL_TYPES: DailyGoalType[] = ["score", "distance", "crates", "runs"];

export function makeDaily(dayKey: string, streak: number, lastClaimDay: string | null): Daily {
  const h = hashKey(dayKey);
  const type = GOAL_TYPES[h % GOAL_TYPES.length];
  const target =
    type === "score"
      ? 600 + (h % 5) * 200
      : type === "distance"
        ? 1500 + (h % 5) * 500
        : type === "crates"
          ? 4 + (h % 4)
          : 3 + (h % 3);
  return { dayKey, type, target, progress: 0, claimed: false, streak, lastClaimDay };
}

export function dailyLabel(d: Daily): string {
  switch (d.type) {
    case "score":
      return `Score ${d.target.toLocaleString()} in a single run`;
    case "distance":
      return `Ride ${d.target.toLocaleString()}m total today`;
    case "crates":
      return `Collect ${d.target} crates today`;
    case "runs":
      return `Complete ${d.target} runs today`;
  }
}

export function dailyRewards(streak: number): { tokens: number; coins: number; crate: boolean } {
  const s = Math.max(1, streak);
  return { tokens: 3 + Math.min(s, 7), coins: 150 + s * 25, crate: s % 3 === 0 };
}

// ---------- Weekly challenge (multi-day, cumulative) ----------
export function weekKey(d = new Date()): string {
  // ISO-ish week key: YYYY-Www based on Thursday of current week
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const WEEKLY_TYPES: WeeklyGoalType[] = ["distance", "score", "runs", "crates"];

export function makeWeekly(wk: string): Weekly {
  const h = hashKey(wk);
  const type = WEEKLY_TYPES[h % WEEKLY_TYPES.length];
  const target =
    type === "distance"
      ? 20000 + (h % 4) * 5000
      : type === "score"
        ? 40000 + (h % 4) * 15000
        : type === "runs"
          ? 20 + (h % 5) * 5
          : 25 + (h % 5) * 5;
  return { weekKey: wk, type, target, progress: 0, claimed: false };
}

export function weeklyLabel(w: Weekly): string {
  switch (w.type) {
    case "distance":
      return `Ride ${w.target.toLocaleString()}m this week`;
    case "score":
      return `Score ${w.target.toLocaleString()} total this week`;
    case "runs":
      return `Complete ${w.target} runs this week`;
    case "crates":
      return `Collect ${w.target} crates this week`;
  }
}

export function coinsForRun(distance: number, crates: number): number {
  return Math.floor(distance / 8) + crates * 5;
}

export function firstEmptyIndex(grid: Cell[]): number {
  return grid.findIndex((c) => c === null);
}

export function emptyCount(grid: Cell[]): number {
  return grid.reduce((n, c) => (c === null ? n + 1 : n), 0);
}

// Can the two cells merge? Same family + same level + not max.
export function canMerge(a: Cell, b: Cell): boolean {
  if (!a || !b) return false;
  return a.family === b.family && a.level === b.level && a.level < MAX_LEVEL;
}

// Returns a NEW grid after dropping `from` onto `to`.
// If merge valid -> merged tile at `to`, `from` cleared.
// If `to` empty -> move.
// If not mergeable & occupied -> swap.
export function applyDrop(grid: Cell[], from: number, to: number): Cell[] {
  if (from === to) return grid;
  const next = grid.slice();
  const a = next[from];
  const b = next[to];
  if (!a) return grid;
  if (b === null) {
    next[to] = a;
    next[from] = null;
    return next;
  }
  if (canMerge(a, b)) {
    next[to] = { family: a.family, level: a.level + 1 };
    next[from] = null;
    return next;
  }
  // swap
  next[to] = a;
  next[from] = b;
  return next;
}

// Are any merges possible anywhere (any two same family+level)?
export function hasMovesAvailable(grid: Cell[]): boolean {
  const seen: Record<string, number> = {};
  for (const c of grid) {
    if (!c || c.level >= MAX_LEVEL) continue;
    const key = `${c.family}:${c.level}`;
    seen[key] = (seen[key] ?? 0) + 1;
    if (seen[key] >= 2) return true;
  }
  return false;
}

export function isStuck(grid: Cell[]): boolean {
  return emptyCount(grid) === 0 && !hasMovesAvailable(grid);
}

// Parts produced by opening a crate.
export function crateParts(crate: Crate, upgrades: Upgrades): Part[] {
  const count = 2 + crate.tier; // 3..
  const baseLevel = Math.min(3, 1 + upgrades.higherTier + Math.max(0, crate.tier - 1));
  const parts: Part[] = [];
  for (let i = 0; i < count; i++) {
    const level = Math.max(1, baseLevel - (Math.random() < 0.4 ? 1 : 0));
    parts.push({ family: randomFamily(), level });
  }
  return parts;
}

// Drop parts into empty cells; returns { grid, dropped }.
export function dropParts(grid: Cell[], parts: Part[]): { grid: Cell[]; dropped: number } {
  const next = grid.slice();
  let dropped = 0;
  for (const p of parts) {
    const idx = firstEmptyIndex(next);
    if (idx === -1) break;
    next[idx] = p;
    dropped += 1;
  }
  return { grid: next, dropped };
}

export function maxLevelOf(grid: Cell[], family: Family): number {
  let m = 0;
  for (const c of grid) {
    if (c && c.family === family) m = Math.max(m, c.level);
  }
  return m;
}

export function sumValue(grid: Cell[], family: Family): number {
  let s = 0;
  for (const c of grid) {
    if (c && c.family === family) s += partValue(c.level);
  }
  return s;
}

function adjacentTurbo(grid: Cell[], size: number): boolean {
  for (let r = 0; r < size; r++) {
    for (let col = 0; col < size; col++) {
      const idx = r * size + col;
      const c = grid[idx];
      if (!c) continue;
      const neighbors = [
        r > 0 ? grid[idx - size] : null,
        r < size - 1 ? grid[idx + size] : null,
        col > 0 ? grid[idx - 1] : null,
        col < size - 1 ? grid[idx + 1] : null,
      ];
      for (const n of neighbors) {
        if (!n) continue;
        if (c.family === "engine" && c.level >= 4 && n.family === "aero" && n.level >= 4)
          return true;
      }
    }
  }
  return false;
}

export function deriveSpec(state: GameState): BikeSpec {
  const { grid, gridSize } = state;
  const enginePts = sumValue(grid, "engine");
  const brakePts = sumValue(grid, "brake");
  const aeroPts = sumValue(grid, "aero");
  const maxEngine = maxLevelOf(grid, "engine");
  const maxBrake = maxLevelOf(grid, "brake");
  const maxAero = maxLevelOf(grid, "aero");
  const hasABS = maxBrake >= 4;
  const turbo = adjacentTurbo(grid, gridSize);

  const bike = bikeById(state.cosmetics?.selectedBike);
  const speed = Math.min(100, Math.round((enginePts / 96) * 100) + bike.speed);
  const braking = Math.min(100, Math.round((brakePts / 96) * 100) + bike.braking);
  const handling = Math.min(
    100,
    Math.round(((brakePts + aeroPts) / 128) * 100 + state.upgrades.handling * 5) + bike.handling,
  );

  return {
    enginePts,
    brakePts,
    aeroPts,
    maxEngine,
    maxBrake,
    maxAero,
    hasABS,
    turbo,
    speed,
    handling,
    braking,
  };
}

export function deriveModifiers(state: GameState): RunModifiers {
  const spec = deriveSpec(state);
  const bike = bikeById(state.cosmetics?.selectedBike);
  const speedMult = 1 + Math.min(spec.enginePts / 96, 0.5) + bike.speed / 200;
  const handling =
    1 + Math.min(spec.brakePts / 96, 0.35) + 0.05 * state.upgrades.handling + bike.handling / 200;
  const scoreMult = 1 + 0.1 * state.upgrades.scoreMult;
  const rainGrip = spec.hasABS ? 1 : 0.45 + Math.min(spec.brakePts / 128, 0.35) + bike.braking / 400;
  return {
    speedMult,
    handling,
    hasABS: spec.hasABS,
    turbo: spec.turbo,
    scoreMult,
    rainGrip: Math.min(1, rainGrip),
  };
}

// Peak-tier: a maxed 155cc FI engine present.
export function canExport(state: GameState): boolean {
  return maxLevelOf(state.grid, "engine") >= MAX_LEVEL;
}

export function exportTokens(state: GameState): number {
  const total =
    sumValue(state.grid, "engine") +
    sumValue(state.grid, "brake") +
    sumValue(state.grid, "aero");
  const full = emptyCount(state.grid) === 0 ? 5 : 0;
  return Math.max(5, Math.floor(total / 8)) + full;
}

// After export: reset grid + bike to level 1, keep upgrades/tokens.
export function resetGridForExport(state: GameState): Cell[] {
  const grid = emptyGrid(state.gridSize);
  grid[0] = { family: "engine", level: 1 };
  grid[1] = { family: "brake", level: 1 };
  return grid;
}

// Grid refresh: remove all lowest-level parts, add one randomized higher part.
export function refreshGrid(grid: Cell[]): Cell[] {
  const levels = grid.filter((c): c is Part => !!c).map((c) => c.level);
  if (levels.length === 0) return grid;
  const minLevel = Math.min(...levels);
  const next: Cell[] = grid.map((c) => (c && c.level === minLevel ? null : c));
  const idx = firstEmptyIndex(next);
  if (idx !== -1) {
    next[idx] = { family: randomFamily(), level: Math.min(MAX_LEVEL - 1, minLevel + 2) };
  }
  return next;
}

export function resizeGrid(grid: Cell[], oldSize: number, newSize: number): Cell[] {
  const parts = grid.filter((c): c is Part => !!c);
  const next = emptyGrid(newSize);
  parts.forEach((p, i) => {
    if (i < next.length) next[i] = p;
  });
  return next;
}
