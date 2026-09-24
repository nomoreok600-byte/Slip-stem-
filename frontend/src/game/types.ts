export type Family = "engine" | "brake" | "aero";

export type Part = { family: Family; level: number };
export type Cell = Part | null;

export type Crate = {
  id: string;
  tier: number; // base part level potential
  readyAt: number; // epoch ms when it can be opened
};

export type Upgrades = {
  grid5: boolean; // 4x4 -> 5x5
  scoreMult: number; // +10% each level
  handling: number; // +5% each level
  higherTier: number; // higher tier crate drops (0..2)
};

export type Stats = {
  bestScore: number;
  totalRuns: number;
  runsSinceAd: number;
  bestCombo: number;
  bestDistance: number;
  exports: number;
};

export type GameState = {
  grid: Cell[];
  gridSize: number; // 4 or 5
  crates: Crate[];
  tokens: number;
  coins: number;
  daily: Daily;
  upgrades: Upgrades;
  stats: Stats;
};

export type DailyGoalType = "score" | "distance" | "crates" | "runs";

export type Daily = {
  dayKey: string; // YYYY-MM-DD the goal belongs to
  type: DailyGoalType;
  target: number;
  progress: number;
  claimed: boolean;
  streak: number;
  lastClaimDay: string | null;
};

export type RunResult = {
  score: number;
  distance: number;
  bestCombo: number;
  cratesCollected: number;
};

export type BikeSpec = {
  enginePts: number;
  brakePts: number;
  aeroPts: number;
  maxEngine: number;
  maxBrake: number;
  maxAero: number;
  hasABS: boolean;
  turbo: boolean;
  // normalized display 0..100
  speed: number;
  handling: number;
  braking: number;
};

export type RunModifiers = {
  speedMult: number;
  handling: number;
  hasABS: boolean;
  turbo: boolean;
  scoreMult: number;
  rainGrip: number; // 0..1, higher = more grip
};
