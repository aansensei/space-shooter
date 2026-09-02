# js/skills/: Split Skill/Sigil Logic

## Why this folder exists

`js/skills.js` grew to 3,502 lines and became hard to navigate and edit
safely. It was split into 13 feature-scoped files under `js/skills/`, one
per skill button, plus one per sigil mechanic that isn't pure picker/HUD data
(that part lives in `js/sigils/`, a separate earlier split).

Unlike the `js/render/` split, the original `js/skills.js` was **not** kept
on disk as a rollback target. The split was verified line-for-line before
deleting it: every original line range was confirmed to appear as an exact,
unmodified substring in its new file, and the only lines not accounted for
were the blank-line separators between sections. Git history is the rollback
path here if one is ever needed.

Every file is a plain global-scope script, same as before the split. There
is no import/export between them, and load order among them doesn't matter
(none has a top-level statement that reads another's top-level `const`/`let`
before that file has loaded; the one such cross-reference, `_castStolenGemAttack`'s neighbor `TIDAL_SURGE_OVERFLOW_CAP` reading `TIDAL_SURGE_METER_MAX`, points at `config.js`, which always loads first). They only need to
load somewhere after `config.js`/`js/sigils/*.js`/`js/entities/*.js` and
before `js/render/*.js`/`main.js`, matching where the single old
`<script src="js/skills.js">` tag used to sit.

## File map

| File | Contents |
|---|---|
| `skill-a.js` | Thunder Orbs: activate/rebalance/update, Dimensional Rift (a Skill A buff), and the shared scattered-projectiles system its own orb-burst uses. |
| `skill-s-spirit.js` | Remembrance Spirit, its own Photokrystos evolution, Photokrystos's boomerangs, the normal Spirit's Blade Arc/Spinner finale, and its plain bullets. The largest file here (~1,080 lines); it was one large, unified mechanic in the original too. |
| `skill-d.js` | Death Star (Draconic Annihilation): charge/pull/mark-and-annihilate, plus Galactic Spaceships (spawn/fusion/update). |
| `sigil-great-sage.js` | Great Sage sigil (`than`): Ransacked Treasury's stolen gem attacks, covering per-gem flavor/color, lock-point targeting, the 8 scaled-down joker copies, and gem granting on an Elite-or-higher kill. |
| `sigil-cancer.js` | Cancer sigil: Tidal Flow's Riptide Surge (tide meter, overflow banking, whirlpool spawn/pull/burst/DOT, sentinel auto-replenish) and Lunar Aegis's Ocean Hunter execute. |
| `skill-f.js` | Annihilation Sweep: the sweep cast/cone/collision loop, and its Great Sage kill hook (Ransacked Treasury cone growth + gem grant). |
| `skill-g.js` | Life Domain / Tesla Matrix: energy orb spawn/linking, Tesla coil spawn/update, and the whole charge/activate/end lifecycle. |
| `skill-shift.js` | Yog-Sothoth Domain teleport execution and cancellation (cooldown scaling by hold duration, the on-exit enemy-bullet wipe). |
| `misc-mechanics.js` | Enemy-side projectile mechanics that live here rather than in `entities/*.js`: Marchosias's own sword-throw blades, and the Soul Reaver curse's damage-over-time tick. |
| `sigil-libra.js` | Libra sigil: Blood Arrow's Sol Arrow queue/windup/flight (the 3-arrow volley Skill A fires when Libra is equipped) and its Astral Pierce pass-through variant. |
| `sigil-gemini.js` | Gemini sigil: Shadow Twin's phantom-volley proc (every 10th allied hit) and its orbs, plus Mirror Laser's bonus piercing-column proc. Reassembled from two separate ranges in the original file, since they weren't adjacent there. |
| `sigil-aries.js` | Aries sigil: Gate of Babylon's blade fan and Enuma Elish's spear thrust, both procing off allied hit counts (trigger sites are in `entities/core.js`'s `dealDamage`). This file is their per-frame timeline/collision. |
| `sigil-virgo.js` | Virgo sigil: Forest Guardian's Golden Arrow crit-sweep bonus attack (vine-wrapped log sweep while 5+ enemies are on screen). |

## Load order

Listed in `index.html` right where the old single `js/skills.js` tag used to
be, after `js/entities/goliath.js` and before `js/render/core.js`. Also
mirrored in `sw.js`'s `CORE_FILES` and `js/offline.js`'s `CORE_FILES` for
offline caching, same list of 13 files in the same order.
