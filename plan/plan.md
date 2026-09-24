# Slipstream: Merge & Ride — Build Plan (Version 1)

A portrait, one-handed mobile game with two phases that feed each other: a swipe-to-dodge
highway **Run**, and a drag-to-merge **Garage** where parts you build make the next Run better.
Visual style: **2D minimalist / arcade** neon look. Progress is saved **on the device only**
(no login). Ads are wired for a real build, with safe placeholders in the preview.

## What Version 1 includes

### 1. The Run (action phase)
- One-thumb controls: swipe left/right to change lanes, swipe down to brake.
- A dense highway with cars and semi-trucks that get faster and denser the longer you survive.
- **Slipstream Meter**: near-misses (threading gaps between vehicles) fill the meter. When full,
  you trigger a short **invincibility boost** with a rising score multiplier that drops **loot crates**
  onto the road to collect.
- Distance + score tracking, with a live score multiplier readout.
- Crash ends the run and sends you to a run-summary screen.
- **Environments** shift as you survive: Neon City, Desert Highway, Rainy Pass. The Rainy Pass makes
  the road slick (controls slide more) unless your bike has an ABS module built.

### 2. The Garage (merge puzzle phase)
- A merge grid (starts **4x4**). Opening crates drops basic parts onto the grid.
- Drag two identical parts together to merge into the next level (Lv1 + Lv1 → Lv2, and so on).
- Three part families, each with a real effect on the next Run:
  - **Engine** (carburetor/engine block → up to a 155cc FI engine): higher top speed & acceleration.
  - **Braking** (brake pads → ABS module): sharper, later braking and control in the rain.
  - **Aesthetics** (visual flair: neon underglow, exhaust, fairings): cosmetic, shown on the bike.
- **Crate timers**: collected crates take real time (a few minutes) to unlock before their parts drop.
  You can wait, or use a rewarded ad to open instantly (see Ads).
- **Part synergy**: a high-level Engine next to a high-level Exhaust unlocks a **Turbo** active skill
  usable on the next Run.
- A live "bike spec" summary showing current top speed / handling / braking derived from your grid.

### 3. Prestige loop
- When the grid is maxed into a peak-tier bike, you can **Export** the bike: this resets the grid and
  bike to Lv1 and awards **Syndicate Tokens**.
- Tokens buy permanent account-wide upgrades:
  - Expanded garage grid (4x4 → 5x5).
  - Permanent score multiplier (+10%) and base handling (+5%).
  - Higher-tier crate drops (chance to drop Lv2/Lv3 parts).

### 4. Ads (your AdMob units)
Real ads only work in a **published/real-device build**, not in the preview. In the preview, every ad
shows a labeled placeholder wired to the exact same triggers, so the game logic is fully testable now.
- **Paced interstitial**: triggers every 3rd run (skippable), preloaded during play so it appears instantly.
- **Rewarded ads**:
  - **Second Wind** — after a crash on a strong run, watch to rewind ~3 seconds and continue.
  - **Crate Rushing** — skip a crate's unlock timer instantly.
  - **Grid Refresh** — when the grid is full and stuck, clear lowest parts for a randomized higher part.
- Your provided IDs are used for the real build; Google **test ads** are used in development builds to
  keep your AdMob account safe.

### 5. Sharing (replaces video clips for now)
- After a run, a **share** action posts a generated summary card of your score / top combo / distance
  (image + text) to any app on the device.
- The auto-recorded 15-second cinematic highlight video export is **deferred** (very heavy native video
  capture); this share card is the Version 1 stand-in.

## Explicitly deferred (not in Version 1)
- Auto-recorded 15s highlight videos exported to TikTok / YouTube.
- Cloud accounts / cross-device sync (device-only save for now).
- 3D / hyper-realistic graphics.

## Things to know before you approve
- **Ads and the preview**: you will NOT see real Google ads in the Expo Go preview — only placeholders.
  Real ads appear after you Publish and generate an iOS/Android build. This is a hard platform limit.
- **Publishing / GitHub**: I can't push to your GitHub repo from here. After the build is done, use the
  **"Save to GitHub"** button to connect your repo, and the **"Publish"** button (top-right) to generate
  the app build where real ads run. I'll flag this again at the end.
- **Feel vs. realism**: this will be a fun, responsive 2D arcade take on the concept — not a physics-grade
  racing simulator. Difficulty, speeds, and merge balance are tuned to feel good and can be adjusted after
  you play it.
- **Device save**: progress lives on the device. Reinstalling the app or switching phones loses progress
  (until/unless we add cloud accounts later).

## Assumptions I made (tell me if any are wrong)
- Grid starts at 4x4 and expands to 5x5 via prestige.
- Crate unlock timers use short durations for testing so you can see the loop quickly.
- Score-share card is acceptable in place of video export for Version 1.
