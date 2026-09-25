# Timeline Distortion — boss-fight random modifier system

## Concept

Kanade ("Administrator-class", runs the "Endless Nights Protocol" —
constantly duplicates/rewrites reality and timelines) destabilizes each
boss encounter into its own localized "timeline anomaly". Every **boss
wave**, the game rolls one paired effect (one half favors the enemy, one
half favors the player) and applies it for that fight only — no player
choice, it's imposed. This is now a full scripted cutscene starring Kanade
herself, not just a silent stat change with a banner popup.

## Scope (locked in)

- **Boss waves only**, not every 5th wave in general. Regular waves are
  unaffected.
- **Not cumulative across the run.** Effect is active only for that one
  boss encounter, fully removed when the fight ends. The next boss wave
  rolls an independent effect from the same pool.

## Cutscene sequence (NEW — this session's direction)

Triggers at the start of a boss wave, before the boss itself would
normally appear:

1. **Time freeze + overlay.** Gameplay pauses (enemies/bullets/spawns all
   hold in place) and a dark translucent overlay washes over the screen —
   reality visibly "stagnating" for a beat before Kanade appears.
2. **A portal opens.** Reuses the reality-gate visual already built for
   the Kanade prototype's `defeated` state (`drawRealityGate` in
   `kanade_boss_demo.html`) — same asset, no new art needed.
3. **Kanade walks out of the portal.** The mirror image of the prototype's
   existing "turn and walk in" defeated sequence, played in reverse (walk
   out, scale up from small to full, fade in) instead of walk-in/shrink/
   fade-out. Depends on the back-view art from `FIX_PROMPT_6_BACK_VIEW.txt`
   (she'd logically face away from camera, toward the portal, as she steps
   out of it, before turning to face forward) — **not yet drawn, currently
   blocked on that**.
4. **She stands, thinking.** A thought bubble appears above her (small UI
   element, not yet designed/built) — implies she's considering what to
   summon before doing it.
5. **She summons Goliath Alpha.** This is real game logic, not just a
   visual: the actual boss-spawn function fires and Goliath (Alpha phase)
   enters the arena for real, same as it does today, just triggered from
   this cutscene instead of the normal wave-start path.
6. **She performs the "Stack Overflow" effect.** She turns and casts (the
   prototype's existing `cast` state arm-raise gesture is the natural fit
   here) while the actual game-logic effect applies (see below) - the
   banner (`assets/images/game/effects/timeline-distortion-banner.png`)
   and the rolled icon (`timeline-distortion-enemy.png` /
   `timeline-distortion-player.png`, both already drawn - see Art status)
   display during this beat.
7. **She opens a portal and leaves.** Reuses the prototype's existing
   portal-close visual.
8. **Time unfreezes**, gameplay resumes with Goliath Alpha active and
   Stack Overflow in effect for that fight only.

## First effect: "Stack Overflow"

Mechanically: **removes the normal cap on every stack-based mechanic in
the game, both player-side and enemy-side, for the duration of that boss
fight.**

- **Player benefit:** stacking mechanics that normally cap out keep
  building past their usual ceiling — Tesla Coil stacks (normally capped
  at 5), Vulnerability stacks (normally capped at 4), Blood Arrow banked
  stacks, and any other player/ally stack system with an existing hard
  cap.
- **Enemy benefit:** any enemy-side/boss-side mechanic that scales via a
  capped stack/counter (Walpurgis-style escalation, boss-specific
  stacking buffs) also loses its cap.
- **Net effect:** a speed contest — killing the boss fast favors the
  player, dragging the fight out is increasingly risky for both sides.
- Implementation note: needs a single source-of-truth list of "capped
  stack mechanics" to temporarily uncap (both sides), not hardcoded
  per-mechanic inline.

## Art status

- ✅ **Done** — all placed directly in the real game asset folders (not
  just the prototype), matching the brief's exact paths:
  - `assets/images/game/effects/timeline-distortion-banner.png`
  - `assets/images/game/icons/timeline-distortion-enemy.png` (broken red
    hourglass — enemy-favoring)
  - `assets/images/game/icons/timeline-distortion-player.png` (intact
    gold/violet glowing hourglass — player-favoring)
- ✅ **Done** — Kanade's back-view art. `drawKanadeBack(t, opts)` added
  to `kanade_boss_demo.html` and wired into the `defeated` state: she
  turns within a bright particle flash (`defeatTurnBurstFired`, around
  `age/4600` progress `p ~0.245-0.295`) then the back view carries the
  walk-toward-the-gate phase. Syntax-checked clean, no console errors.
  Same function is reusable standalone for the cutscene's walk-out-of-
  portal beat (step 3 below), per the generic-use note appended to
  `FIX_PROMPT_6_BACK_VIEW.txt`.
- ⚠️ **Design decided, not built** — thought-bubble UI element for step
  4. AanSensei's call: keep it simple, a small speech/chat bubble with a
  3-dot "typing" indicator, same visual language as the game's existing
  Live2D dialogue boxes rather than a new custom design.

## First-encounter vs. speedrun skip (decided)

AanSensei's call: the **first** time a player ever reaches a boss wave,
the full Kanade cutscene plays forced, no skip available — this is the
player's first introduction to her and the mechanic. After that first
viewing, a new **"Skip Kanade animation"** toggle appears in Settings;
with it on, later boss waves still roll and apply the Timeline Distortion
effect (and still spawn the boss) but cut straight past the cutscene
visuals, for speedrun-focused replays. This answers part of open
question 3 below: normal boss-spawn logic always still fires either way,
only the cutscene presentation layer is skippable, and only after the
first mandatory viewing.

## Porting Kanade into the real render pipeline (scoped)

Investigated the real game's architecture to answer question 1 concretely
(all references below are current file:line as of this scoping):

- **New file, following the existing self-contained-module pattern.**
  Add `js/render/kanade-cutscene.js`, structurally closest to
  `js/render/skill-s-spirit.js` (per `js/render/README.md` line 33, the
  one file already described as "self-contained besides core.js"). It
  would be the first file in this folder to own an explicit phase/state
  field rather than pure elapsed-time math — `_drawStartScreen()` in
  `js/render/core.js:2706` (the title-screen Pisces intro) is the closest
  existing example of a self-phased, timer-driven sequence, and is a
  useful second reference. Must be added to `index.html`'s script list
  (after `core.js`, order otherwise flexible) with its own `?v=` tag, and
  mirrored into the monolithic `js/render.js` rollback copy per the
  folder's sync convention.
- **Time freeze reuses an existing pattern, not a new mechanism.** The
  sigil-picker overlay already does exactly this:
  `js/main.js:3302` gates the whole sim step with
  `if (!gamePaused && !loading && !window._sigilPicker) update(...)`, and
  `js/render/core.js:2702` draws `drawSigilPicker()` last, on top of
  everything, when `window._sigilPicker` is set. A `window._kanadeCutscene`
  flag added alongside `_sigilPicker` in that same gate, plus a
  `window._kanadeCutscene && drawKanadeCutscene()` call near
  `core.js:2702`, reproduces the freeze-and-overlay behavior with no new
  pause machinery. `draw()` already forces `deltaTime` to 0 while paused
  (`main.js:3315`) and keeps a stable frozen clock via `_frozenNow`
  (`main.js:3310`) for the overlay's own animation timing.
- **Boss-wave trigger hook.** Goliath's spawn is a plain
  `_waveNumber % 5 === 0` check inside `_updateWaveSystem()`
  (`main.js:3155-3159`, inside the wave-increment branch starting
  `main.js:3100`), dispatching through `_spawnWaveTier('goliath')` →
  `spawnGoliath()` (`main.js:2913-2914`). The cutscene trigger slots into
  this same branch: check the milestone, set `window._kanadeCutscene`
  instead of (or just before) calling `_spawnWaveTier('goliath')`
  directly, and have the cutscene's own step 5 (summon) call
  `spawnGoliath()` itself once Kanade's animation reaches that beat.
- **First-viewing flag.** Follows `js/background.js`'s plain-string
  `localStorage` convention (`background.js:173,177-179`) rather than
  `js/audio.js`'s JSON-blob convention, since this is a single boolean:
  `localStorage.getItem('kanadeIntroSeen')` /
  `localStorage.setItem('kanadeIntroSeen', 'true')`, each call in its own
  `try/catch`, matching both existing files' idiom exactly. This is a
  simple persisted-forever-on-this-browser flag, not per-run — matches
  every other persisted setting in the game (audio volumes, background
  brightness), so no new save-data concept needed. Answers the open
  save/profile question from the first-encounter decision above.

## Remaining open questions (need answers before coding starts)

1. **Full pool of effect pairs beyond "Stack Overflow"** — only one
   designed so far.
2. **Roll rate** — always triggers on every boss wave, or a chance to?

## Next step

Plan is now concrete on every previously-blocking item: back-view art is
done, thought-bubble style is decided, and the port has a grounded
integration plan (new `kanade-cutscene.js` + reuse of the existing
sigil-picker freeze/overlay pattern + the existing wave-milestone hook).
The only things left before writing code are the two questions directly
above (effect pool, roll rate) — everything else is ready to implement
once AanSensei gives the go-ahead.
