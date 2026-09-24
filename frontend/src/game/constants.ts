import type { BikeDef, BikeModel, CharacterDef, Cosmetics, Family } from "./types";

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

// ---- Cosmetics: bikes, riders, paint ----
export const BIKES: BikeDef[] = [
  { id: "street", name: "Street 250", cost: 0, color: "#2F9BE0", speed: 0, handling: 0, braking: 0, desc: "Reliable starter commuter." },
  { id: "sport", name: "Sport RR", cost: 1200, color: "#FF5A5F", speed: 10, handling: 6, braking: 2, desc: "Lightweight track weapon." },
  { id: "cruiser", name: "Road Cruiser", cost: 2400, color: "#7ED957", speed: 4, handling: 4, braking: 12, desc: "Heavy, planted, unshakeable." },
  { id: "chopper", name: "Chopper X", cost: 4200, color: "#FF8A3D", speed: 8, handling: 2, braking: 10, desc: "Big-bore boulevard bruiser." },
  { id: "neon", name: "Neon Blade", cost: 7000, color: "#B06BFF", speed: 14, handling: 10, braking: 4, desc: "Electric hyper-naked." },
  { id: "moto", name: "Moto GP", cost: 12000, color: "#FFC02E", speed: 18, handling: 14, braking: 8, desc: "Factory prototype racer." },
];

export const CHARACTERS: CharacterDef[] = [
  { id: "rookie", name: "Rookie", cost: 0, skin: "#E9B48C", outfit: "#FF7A3D", helmet: "#F2F4F7", desc: "Every legend starts here." },
  { id: "racer", name: "Pro Racer", cost: 700, skin: "#D89A6A", outfit: "#2F9BE0", helmet: "#FF5A5F", desc: "Podium-hungry pro." },
  { id: "ninja", name: "Night Ninja", cost: 1600, skin: "#C98A5E", outfit: "#2C2A33", helmet: "#111318", desc: "Silent and swift." },
  { id: "punk", name: "Neon Punk", cost: 3000, skin: "#F0C09A", outfit: "#B06BFF", helmet: "#7ED957", desc: "Loud, bright, fearless." },
];

export const BIKE_COLORS = ["#2F9BE0", "#FF5A5F", "#7ED957", "#FF8A3D", "#B06BFF", "#FFC02E", "#1E2A38", "#FF4FA3"];
export const HELMET_COLORS = ["#F2F4F7", "#FF5A5F", "#2F9BE0", "#111318", "#7ED957", "#FFC02E", "#B06BFF", "#FF8A3D"];
export const OUTFIT_COLORS = ["#FF7A3D", "#2F9BE0", "#7ED957", "#B06BFF", "#FF5A5F", "#2C2A33", "#FFC02E", "#1E2A38"];

export const DEFAULT_COSMETICS: Cosmetics = {
  ownedBikes: ["street"],
  selectedBike: "street",
  ownedChars: ["rookie"],
  selectedChar: "rookie",
  bikeColor: "#2F9BE0",
  helmetColor: "#F2F4F7",
  outfitColor: "#FF7A3D",
};

export const LEADERBOARD_MAX = 10;

export function bikeById(id: BikeModel | undefined): BikeDef {
  return BIKES.find((b) => b.id === id) ?? BIKES[0];
}

export function charById(id: string | undefined): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
