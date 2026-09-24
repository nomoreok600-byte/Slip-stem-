# Slipstream: Merge & Ride — PRD

## Original problem statement
A portrait, one-handed mobile game combining an endless traffic-weaver "Run"
with an additive merge-puzzle "Garage". Near-misses fill a Slipstream meter →
invincibility boost + loot crates. Crates open (with timers) in the Garage and
drop parts onto a merge grid; merging identical parts builds a better bike
(engine/braking/aesthetics) that changes the next run (speed, ABS, turbo, rain
grip). A Prestige "Export" loop resets the grid for Syndicate Tokens spent on
permanent account-wide upgrades. Monetized with paced AdMob interstitials (every
3 runs) and rewarded ads (Second Wind, Crate Rush, Grid Refresh). Neon-cyberpunk
2D arcade style. Device-only save. AdMob IDs & package `com.mrbs.Slipstream`
provided by user.

## Architecture
- **Frontend**: Expo Router (React Native). Fully client-side game.
  - `app/index.tsx` — Home / main menu (title, stats, nav, bike spec).
  - `app/run.tsx` — The Run: RAF game loop, swipe/tap lane controls, traffic,
    Slipstream meter + boost, loot crates, environments (City/Desert/Rain),
    crash summary, Second Wind rewarded ad, share card, interstitial every 3 runs.
  - `app/garage.tsx` — Merge grid (drag & drop via gesture-handler + reanimated),
    crate timers + Rush rewarded ad, bike spec, Grid Refresh rewarded ad, Export.
  - `app/prestige.tsx` — Syndicate Token permanent upgrades.
  - `src/game/` — types, constants, pure logic (merge/spec/modifiers/crates),
    and `store.tsx` (reducer + persistence via `@/src/utils/storage`).
  - `src/ads.tsx` + `src/admob/{index.ts,index.web.ts}` — ad controller. Native
    AdMob only in a real build; web/Expo Go show labeled placeholder modal wired
    to identical triggers. Native module is platform-split so web bundles cleanly.
  - `src/theme.ts` — fixed dark neon theme tokens.
- **Backend**: default FastAPI template (unused by gameplay in v1).
- **Config**: `app.json` sets package `com.mrbs.Slipstream`, AdMob app id
  `ca-app-pub-8535851607967164~1873546298`. Ad unit IDs in `frontend/.env`.

## Core requirements (static)
- Two-phase loop (Run ↔ Garage) with tangible bike upgrades.
- Slipstream boost + loot crates; crate unlock timers.
- Prestige/Export → Syndicate Tokens → permanent upgrades.
- AdMob interstitial (paced) + 3 rewarded placements.
- Portrait, one-handed, device-only save.

## Cartoon Redesign + Audio + Daily Challenge (2026-06-25)
- Full cartoon visual overhaul of every screen (bright warm palette, chunky
  outlined UI, 3D-lip buttons) in `src/theme.ts` + `src/components/ui.tsx`.
- AI-generated (Gemini Nano Banana) cartoon backgrounds bundled in
  `assets/images/game/` (home, splash hero, city/desert/rain) via
  `scripts/gen_images.py`; registered in `src/assets.ts`.
- Crisp SVG cartoon vehicles/bike/parts/coin/crate in `src/components/sprites.tsx`
  (react-native-svg) — replaces the old colored rectangles.
- Animated cartoon Loading screen (`src/components/loading-screen.tsx`) shown
  until the device save hydrates.
- Synthesized CC0 audio (`scripts/gen_audio.py` → `assets/audio/*.wav`): music
  loop, engine loop, whoosh/coin/crash/boost/merge/click. `src/audio.tsx`
  SoundProvider with mute toggle (persisted); wired into run + garage + buttons.
- Coins currency: earned per run + Daily rewards; shown in pills; can instant-open
  a crate for 100 coins in the Garage.
- Daily Challenge (`src/components/daily-challenge.tsx` + store): a fresh goal each
  day (score/distance/crates/runs), progress bar, login streak, Claim reward
  (tokens + coins + occasional crate). Streak resets if a day is missed.
- Retested via testing agent (iteration_2): all 4 routes pass, tap-lane fix
  confirmed, no fatal errors.

## Implemented (2026-06-24)- Full playable Run with score/distance/combo/multiplier, meter+boost, crates,
  3 environments incl. rain slick handling (mitigated by ABS), turbo skill.
- Swipe AND tap lane controls (tap fix verified), brake, pause.
- Garage merge grid with drag-and-drop, crate open/rush, grid refresh, export.
- Prestige upgrades (grid 4×4→5×5, score mult, handling, higher-tier drops).
- Interstitial every 3 runs; rewarded Second Wind / Crate Rush / Grid Refresh
  (placeholder in preview, real AdMob in build).
- Share run-summary card (native share sheet).
- Persistent device save; toasts (no Alerts); neon UI.
- Passed frontend testing agent (all deterministic flows) + screenshot checks.

## Deferred / backlog
- P1: Auto-recorded 15s cinematic highlight video export to TikTok/YouTube.
- P1: Cloud accounts / cross-device sync + leaderboards (needs backend + auth).
- P2: Aesthetics visibly rendered on the in-run bike; sound/music; haptic polish.
- P2: More part synergies and daily challenges.

## Notes
- Real Google ads require Publish → native build; not visible in Expo Go/web.
- GitHub push is done via the "Save to GitHub" button (agent cannot push).

## Bikes, Riders, Paint, Leaderboard + polish (2026-06 session 2)
- **Cosmetics system** (`src/game/constants.ts` BIKES/CHARACTERS/color palettes,
  `types.ts` Cosmetics + LeaderboardEntry, `logic.ts`, `store.tsx` buyBike/
  selectBike/buyChar/selectChar/setColor). Coins buy bikes/riders; bikes give
  cosmetic + stat bonuses (speed/handling/braking) folded into deriveSpec/
  deriveModifiers. Syndicate Tokens remain for permanent upgrades.
- **Shop screen** (`app/shop.tsx`): 3 tabs — Bikes, Rider, Paint. Live rider
  preview, buy/USE/selected states, stat tags, paint swatches (bike/helmet/outfit)
  applied instantly.
- **Leaderboard** (`app/leaderboard.tsx`): local top-10 scores recorded each run,
  personal-best card, ranked rows.
- **Sprites overhaul** (`src/components/sprites.tsx`): customizable PlayerBike
  (model/colors/skin), spinning wheels (SpinWheel/Hubcap via `transform` rotate),
  crashed "KO" pose (dead=true, X-eyes + dizzy stars), boost flames; Car/Truck
  spinning hubcaps.
- **Run** (`app/run.tsx`): rider rendered with chosen cosmetics + live wheel spin;
  on crash the dead rider is shown on the road ~0.95s before the summary; "NEW
  BEST!" badge when beating best.
- **Home** (`app/index.tsx`): shows selected bike (bob + spin) with name pill →
  Shop; added Shop + Ranks nav cards.
- **Loading screen**: spinning badge wheel.
- **Audio**: richer synthesized SFX + fuller synthwave loop (`scripts/gen_audio.py`).

