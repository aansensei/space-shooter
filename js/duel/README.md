# js/duel/: Showdown Voyage

Showdown (Quyết Chiến) is the boss duel mode: one ship against Egregor the Overmind across 18 attacks in three forms.
It is a separate system from the Voyage code. It owns its own state machine, bullet pool, weapons, HUD, recap and audio
cues, and it only borrows the canvas, the player ship drawing and the audio manager. The mode is desktop only: it is locked
while the Mobile tab of the title screen is chosen and on touch screens.

The full rules and numbers live in the Showdown sections of [game_logic.md](../../game_logic.md). This file is a map of
the code.

## Loading

Every file is a plain global script loaded from `index.html` after the Voyage code, in this order: `duel-theme`,
`duel-bullets`, `duel-boss-weights`, `duel-boss-brain`, `duel-gestures-data`, `duel-gestures`, `duel-attacks`,
`duel-cinematics`, `duel-ui`, `duel-recap`, `duel-weapon-skills`, `duel-core`, `duel-debug`. Each one publishes a global
(`DuelCore`, `DuelAttacks`, ...) through a small wrapper, so the `.cjs` tools below can `require` the same files in Node.
`duel-core.js` exposes the live session as `window._duelSession` and a set of `window._duel*` hooks that the Voyage code
(`main.js`, `input.js`, the mode picker in `index.html`) calls.

## File map

| File | Contents |
|---|---|
| `duel-core.js` | The session: state machine (`opponent_select`, `weapon_select`, `pre_battle`, `playing`, transitions, `victory_burst`, `defeat_burst`, `result`), lives and shield, Shift and F, the HUD clock, quit and restart flows, low HP cockpit and ship reports, audio hooks for the opening cue and the battle theme. |
| `duel-attacks.js` | The 18 attack scripts and the controller: cues, emissions, telegraphs, gap bars, the nine boss skills, per attack HP. |
| `duel-bullets.js` | The pre allocated bullet pool, bullet styles baked once per colour, cancel motes. |
| `duel-boss-brain.js`, `duel-boss-weights.js` | Boss movement choices per attack and the weights behind them. |
| `duel-gestures.js`, `duel-gestures-data.js` | Egregor body gestures (roar, reach, recoil) driven by the attack cues. |
| `duel-weapon-skills.js` | The A button relic skill of each of the five weapons: cooldowns, hit budgets, drawing. |
| `duel-cinematics.js` | The opening (warning, portal, limbs, boss arrival, name card), skill cast ribbons, boss death, ship death, cockpit frame and ship report panels. |
| `duel-ui.js` | Opponent and weapon select screens, practice picker, HUD pieces, control tips, all Showdown strings (English and Vietnamese). |
| `duel-recap.js` | The Showdown Log recap: rank gauge, tabs, quit epitaph. |
| `duel-theme.js` | Colours, fonts and the ornate plate drawing shared by every Showdown screen. |
| `duel-debug.js` | The F4 debug panel (localhost only): jump to any attack or phase, god mode, speed, idle audio and skill effect buttons. |
| `duel-bench.cjs`, `duel-solver.cjs` | Node tools. The solver checks that all 18 attacks stay survivable on fixed seeds, the bench measures bullet throughput. |

## Running the mode

Serve the repo root (for example `npx serve . -l 8123`), open it on localhost, pick **Showdown Voyage** in the Voyage picker, then an opponent
and a weapon. Press F4 for the debug panel. The mode refuses to start while the Mobile tab is chosen and on touch devices.

```powershell
node js/duel/duel-solver.cjs
node js/duel/duel-bench.cjs
```

## Things to know before editing

* Attack HP, bullet counts, speeds and hit radii are balanced against the solver. Change them only together with a solver run.
* Player and boss time are separate: `enemyTimeScale` slows the boss and its bullets (Shift 0.35, F sweep 0.5) while the
  match clock `stats.timeSec` advances by game time.
* Audio goes through three buses in `js/audio.js` (`_duelSfxBus`, `_duelCueBus`, `_duelMusicBus`). Ship voice lines bypass
  the low HP muffle on purpose. The opening cue and the battle theme `egregor-theme.mp3` run on the music bus, and the
  battle theme is flagged `duelOnly` so it never enters the Voyage music rotation.
* Optional sound effects (`optional: true` in `DUEL_SOUNDS`) may be missing from `assets/audio/sfx/`. The game stays silent
  for them instead of failing.
* New assets must be listed in `sw.js` and `js/offline.js`, and `CACHE_VERSION` in `sw.js` bumped.
* Files use CRLF line endings. Edit them with an editor or a script, not with `sed -i`.
