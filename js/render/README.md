# js/render/ — Split Render Pipeline

## Why this folder exists

`js/render.js` grew to 9,481 lines and became hard to navigate and edit
safely. It was split into 16 feature-scoped files under `js/render/` — one
per enemy type, one per skill, plus shared core/fx/player files.

This was done as a **safety-net refactor**: the original `js/render.js` is
kept on disk, byte-for-byte, purely as a rollback target. `index.html` loads
**either** the split files under `js/render/` **or** the monolithic
`js/render.js` — never both at once. Whichever one is *not* wired into
`index.html` at a given time is inert dead weight on disk, not dead code —
treat it as a backup, not something to delete.

Check `index.html`'s script tags to see which mode is currently active.

## File map

| File | ~Lines | Contents |
|---|---|---|
| `core.js` | 1416 | Module state (quality flags, sprite caches), init helpers, background rendering, the main `draw()` orchestrator, the start screen. **Loaded first** — every other file reads globals/helpers this file defines (`_mobPerf`, `_gfxLevel`, sprite-cache getters, `_initMobilePerf`, `_GFX_PARTICLE_SCALE`, `_bgOffscreen` background cache, screen-shake offset). |
| `fx.js` | 1016 | Shared visual effects used by multiple other files: aegis lasers, persian tile pattern, dimensional rifts, dim-break zones, boss shockwaves, `drawChainLightning`, demon-gift aura, vanguard threads, sentinel draw, `drawPolygon` helper, explosion/particle draw, scattered projectiles, lightning-bolt line helpers (`_genBoltPoints`/`_strokeBoltPath`). |
| `player.js` | 1050 | Skill-Shift teleport arrows/portals (`drawSkillShiftEffects`), Final Defense, player aura, player bullets, `drawPlayer`, charge/laser visual effects. Depends on `core.js`. |
| `enemy-common.js` | 1091 | `drawEnemy()` — the type-dispatch entry point `draw()` in `core.js` calls for every enemy. Also: normal-enemy visuals, enemy bullets, Embryo, Vulnerability icon, Coronation fx. |
| `enemy-aegis-core.js` | 185 | Heavenly Aegis Core visuals. Self-contained, no cross-file calls besides `core.js`'s `_mobPerf`. |
| `enemy-thaelis.js` | 323 | Thaelis's own visuals (split out of the old shared `enemy-boss-thaelis.js`), plus its Reincarnation Cocoon and Guards, drawn over a commissioned sprite (`assets/images/game/enemies/thaelis-cocoon.png`). Calls `drawPolygon()` from `fx.js`. |
| `enemy-dargruel.js` | 335 | Dargruel's own visuals (the other half of the old shared `enemy-boss-thaelis.js`). |
| `enemy-marchosias.js` | 340 | Marchosias main body, minion, death-sword blade. Reassembled from three separate ranges in the original file. |
| `enemy-leviathan.js` | 360 | Leviathan body + `_drawLeviathanEffects` (standalone death-laser / Perseverance-sweep fx that survives Leviathan's own death — sat far from the main draw function in the original file, reassembled together here). |
| `enemy-veilshroud.js` | 505 | Veilshroud base body, Echo clone, lightning-strike/echo-explosion effects. Calls `_genBoltPoints`/`_strokeBoltPath` from `fx.js`. |
| `enemy-egregor.js` | 1068 | Egregor base body + Psychic Tempest / Null Slash telegraph and strike effects. Runs to the end of the original file — see **Incident** below, this boundary is where the split bug happened. |
| `skill-s-spirit.js` | 978 | Remembrance Spirit / Photokrystos: normal spirit, silk tail, primeval summon fx, boomerang, blade-arc projectile. Self-contained besides `core.js`. |
| `skill-a.js` | 118 | Thunder Orbs (`drawSkillA`). |
| `skill-d.js` | 259 | Cosmic Black Hole charge + hole (`drawSkillDCharging`). |
| `skill-f.js` | 262 | Annihilation Sweep (`drawSkillF`). |
| `skill-g.js` | 312 | Tesla Matrix barrier, energy orb, Tesla Coil. `drawTeslaCoil` calls `drawPolygon()` from `fx.js`. |
| `skill-buttons.js` | 292 | On-screen skill button UI. `drawSkillButton` (singular) is confirmed dead code (no caller) — kept as-is, not deleted, per repo convention of not removing unrelated dead code. |

## Load order

Fixed by `index.html`, and it matters — classic `<script>` tags share one
global scope but execute strictly in document order:

```
core.js               (must be first: defines shared state/helpers)
fx.js
player.js
enemy-common.js
enemy-aegis-core.js
enemy-thaelis.js
enemy-dargruel.js
enemy-marchosias.js
enemy-leviathan.js
enemy-veilshroud.js
enemy-egregor.js
skill-s-spirit.js
skill-a.js
skill-d.js
skill-f.js
skill-g.js
skill-buttons.js
```

`core.js` must load first. Everything else may in principle be reordered
relative to each other since they're mutually independent draw functions,
but keep the existing order unless there's a reason to change it.

## How the split was done

Each file was extracted from `render.js` with `sed -n 'START,ENDp'` over one
or more original line ranges, then reassembled by feature rather than by
original line position (e.g. `enemy-leviathan.js` merges two ranges that
were far apart in the original file). Every file's header comment records
which original line range(s) fed into it.

## Incident: 2026-07 blank-menu regression

**Symptom:** loading `index.html` with the split files active showed only
the background nebula — no title, no menu buttons, no sigil picker. This
did not reproduce under automated/headless testing, which made it look like
an environment-specific issue at first.

**Root cause:** the `sed` extraction for `enemy-egregor.js` dropped the
file's very last line — the closing `}` of `_drawEgregor()`, which was also
the last character of the original `render.js`. That left `enemy-egregor.js`
syntactically incomplete (`SyntaxError: Unexpected end of input`), which
aborted parsing of that whole `<script>` tag. Because each `<script src>` is
parsed independently, this didn't stop *other* files from loading — but any
call into a function `enemy-egregor.js` should have defined would throw a
`ReferenceError` the first time it ran, and depending on where that landed
in the frame loop it could break menu/UI updates that run later in the same
call chain.

**How it was found:** `node --check <file>` on each of the 16 split files
individually, ~1 second, no browser needed. This is the fastest possible
signal for this entire class of bug — try it before opening a browser.
Confirmed further with:
- A brace-balance count (`{` vs `}`) per file — `enemy-egregor.js` was the
  only one off by exactly one.
- A full multiset line-diff (blank lines and full-line comments stripped,
  both sides sorted) between `render.js` and all 16 split files
  concatenated — 0 differences after the fix. This is the way to verify a
  split is *complete*, since the split deliberately reorders code by
  feature, so a plain ordered `diff` against `render.js` is useless — it'll
  report the entire file as different even when nothing is actually wrong.

**Fix:** added the missing `}` back to the end of `enemy-egregor.js`.

## The caching trap

The browser caches each `<script src="...">` by its full URL, query string
included. **Editing a file's content without bumping its `?v=` query lets
the browser go on serving the previously-cached (possibly still-broken)
copy**, even after the source file on disk is fixed. During the incident
above, the fix was verified correct by `node --check` and the diff, but the
bug still appeared to persist in one more browser reload — because the
`?v=` tag on the `<script>` tags hadn't changed. Bumping the version
resolved it immediately.

**Rule:** any time a file under `js/render/` is edited, bump that file's
`?v=` query string in `index.html` before testing in a real browser tab —
don't rely on a hard refresh or dev-server cache headers to catch it for
you.

## Debugging checklist for future render/ issues

1. `node --check js/render/*.js` (loop over each file) — catches syntax
   errors in about a second, before touching a browser at all.
2. If that passes but something's still visibly broken, check brace balance
   per file and do the multiset line-diff against `render.js` described
   above — confirms nothing is missing or duplicated across the split.
3. Check for duplicate top-level `function`/`const`/`let`/`class` names
   across files — a name declared in two different `<script>` tags is a
   **fatal `SyntaxError`** for whichever tag parses second, since they share
   one global lexical scope. (`const`/`let` at top level of a classic
   `<script>` *are* visible to later `<script>` tags on the same page — the
   global lexical environment is shared per-page, not per-tag — so this
   isn't a scoping problem, it's strictly a duplicate-declaration problem.)
4. Bump the `?v=` query string for every file touched (see above) before
   judging a fix by reloading a real browser tab.
5. If a bug reproduces in a real browser but not in this project's own
   test/preview browser, suspect stale cache before suspecting an actual
   environment difference.

## Keeping render.js and js/render/ in sync

`js/render.js` is the rollback safety net and should be left untouched
*except* when a fix or feature that affects rendering also needs to be
applied there to keep it from silently rotting out of date. When you change
a function that lives in one of the `js/render/*.js` files, mirror the same
change into `render.js`'s copy of that function (and vice versa), so the
two stay content-identical modulo file boundaries and comments. The
multiset-diff method described above is the way to confirm they still
match.
