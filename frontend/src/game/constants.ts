import type { Family } from "./types";

export const MAX_LEVEL = 6;

export const PART_NAMES: Record<Family, string[]> = {
  engine: [
    "", // index 0 unused
    "Carburetor",
    "Engine Block",
    "Fuel Pump",
    "Turbo Kit",
    "FI System",
    "155cc FI",
  ],
  brake: ["", "Brake Pad", "Rotor", "Caliper", "ABS Sensor", "ABS Module", "Track ABS"],
  aero: ["", "Decal", "Exhaust", "Underglow", "Fairing", "Streetfighter", "Neon Body"],
};

export const FAMILY_LABEL: Record<Family, string> = {
  engine: "Engine",
  brake: "Braking",
  aero: "Aero",
};

// short glyph shown on the tile (kept as 1-2 chars, not an emoji icon font)
export const FAMILY_GLYPH: Record<Family, string> = {
  engine: "ENG",
  brake: "BRK",
  aero: "AER",
};

export const FAMILIES: Family[] = ["engine", "brake", "aero"];

// crate unlock durations kept short so the loop is quick to test
export const CRATE_MIN_MS = 30_000;
export const CRATE_MAX_MS = 90_000;

// ---- Upgrade costs (Syndicate Tokens) ----
export const UPGRADE_COST = {
  grid5: 25,
  scoreMult: (level: number) => 10 * (level + 1),
  handling: (level: number) => 8 * (level + 1),
  higherTier: (level: number) => 15 * (level + 1),
};

export const HIGHER_TIER_MAX = 2;

// ---- Run tuning ----
export const RUN = {
  lanes: 4,
  baseSpeed: 300, // px/sec world scroll at start
  maxTimeRamp: 2.0, // multiplies base speed as time goes
  rampSeconds: 90, // seconds to reach max ramp
  playerHeight: 58,
  playerWidthRatio: 0.62, // of lane width
  spawnBase: 0.78, // seconds between spawns at start
  spawnMin: 0.34,
  meterPerNearMiss: 14,
  meterMax: 100,
  boostSeconds: 5,
  brakeSeconds: 0.55,
  brakeFactor: 0.42,
  crateSpawnEvery: 0.75, // during boost
  secondWindScore: 400, // min score to offer second wind
  envDistance: 1500, // distance per environment segment
};

export const ENVIRONMENTS = [
  { key: "city", name: "Neon City", rain: false },
  { key: "desert", name: "Desert Highway", rain: false },
  { key: "rain", name: "Rainy Pass", rain: true },
] as const;
