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

## Implemented (2026-06-24)
- Full playable Run with score/distance/combo/multiplier, meter+boost, crates,
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
