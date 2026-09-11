# Uriel (new Abnormal-tier enemy): design + implementation plan

Status: design finalized, not yet built. Fantasy: a herald-king that
shields the whole horde and punishes the player for breaking its
covenant. It never rushes the player; it hangs back, buffs everything,
and answers every broken ward with a judgment.

## 1. Base stats

| Stat | Value | Notes |
|---|---|---|
| Tier | Abnormal (Veilshroud / Thaelis class) | added to the `_spawnWaveTier('abnormal')` pool (js/main.js:2678) |
| HP | `ceil( min(3600, 1500 + t10*60) * 1.15 * _walpurgisHpMult() )` | `t10 = floor(gameElapsedTime / 10000)`. ~1725 at 0:00, ~4140 at 3:00 (pre-Walpurgis). Sits between Veilshroud and Marchosias. |
| Speed | `1.4` (raw `speed` field) | plus the "Against Chaos" dodge-speed stacks below |
| Size | `(20 + Math.random()*10) * 5` (~100-150) | matches every abnormal/elite body |
| Base DR | **40%** | added as its own branch in `combinedDR` (js/entities/core.js:906) |
| Flat DR | 0 (base) | Camouflage adds a temporary +200 flat DR for 2s, see 4.2 |
| Per-hit cap | **30% Max HP** per hit | same shape as Veilshroud's Phantom cap (js/entities/core.js:1187), always on for Uriel |
| Evade | special, see 4.3 (30-40% scaling, self-decaying) | table entry in js/entities/core.js:687 is only the fallback; real value comes from the passive |
| On-screen CAP | **1** | enforced by `enemies.filter(e => e.type === 'uriel').length < 1` in the spawn pool |
| Normal attack | **none** | Uriel fires no bullets. Its whole threat is the covenant buffs plus the Holy Sword. (Open question 6.1 if you want a filler attack.) |

## 2. Movement

Uriel never travels straight down toward the player. For its whole
lifetime it patrols the **upper half of the arena only** (`y` clamped to
`<= canvas.height * 0.5`), weaving side to side across the full width.

- Pick a waypoint: `x` in `[size, canvas.width - size]`, `y` in
  `[size, canvas.height * 0.5]`.
- Ease toward it at `speed` (times any Against-Chaos speed multiplier).
  On arrival, pick a new waypoint. Bias new waypoints away from the
  current one so it actually roams rather than hovering.
- It does not despawn by leaving the bottom of the screen the way normal
  enemies do; it only leaves via death or, briefly, Camouflage.

## 3. Spawn rules

- **Never spawns on Goliath waves** (`waveNumber % 5 === 0`).
- **Spawn cooldown 5s**: `performance.now() - window._lastUrielSpawn >= 5000`
  before it can be picked from the abnormal pool again.
- CAP 1 (above).
- Pool guard, all three conditions, added to `_spawnWaveTier('abnormal')`:
  `waveNumber % 5 !== 0 && (now - (window._lastUrielSpawn||0)) >= 5000 && urielCount < 1`.
  Set `window._lastUrielSpawn = performance.now()` inside `spawnUriel()`.

## 4. Abilities

### 4.1 Covenant King (Thệ Ước Vương): signature

**Self:**
- Every 2s Uriel refreshes **1 layer of Iron Body** on itself (does not
  stack past 1; gets the first layer immediately on spawn). Implement as
  `enemy._selfIBTimer`; on tick set `enemy.ironBodyHits = Math.max(enemy.ironBodyHits, 1)`.

**Horde buff (while Uriel is alive):**
- Scans every 1s over all living non-bullet, non-Uriel enemies and grants
  each:
  - **Infinite CC Immunity**: `enemy._urielCCImmune = true` (cleared on
    Uriel death / Camouflage-independent; see touch points).
  - **A Uriel Iron Body layer**: `enemy._urielIB = true`, refreshed
    every **5s** per enemy (`enemy._urielIBAt` timestamp), granted
    immediately the first time an enemy is scanned. Kept separate from
    the generic `ironBodyHits` so its consumption is detectable.
- When a hit lands on an enemy that has `_urielIB === true`
  (in `dealDamage`, checked right beside the existing `ironBodyHits`
  block, js/entities/core.js:1060):
  - the hit is fully negated,
  - `enemy._urielIB = false`,
  - `enemy._urielIBAt = performance.now()` (starts its 5s re-grant timer),
  - `window._urielIBConsumed = (window._urielIBConsumed || 0) + 1`.

**Judgment (Holy Sword):**
- Every time `_urielIBConsumed` reaches a **multiple of 3**, Uriel tries
  to fire **1 Holy Sword**. It can only actually fire while Uriel is
  visible (not mid-Camouflage). If the trigger lands while
  `_stealthed` is true (stealthing, stealthed, or reappearing), it is
  **queued** (`_urielSwordQueued++`) instead of charging. Same if a
  charge is already underway and Camouflage triggers mid-charge: the
  in-progress charge is cancelled and banked as a queued shot rather
  than firing invisibly. Queued shots release automatically, one at a
  time, the instant Uriel is visible and not already charging/firing
  (checked every frame: `_urielSwordQueued > 0 && phase idle && not
  mid-Camouflage` -> decrement the queue and start a normal charge).
- **Charge-up (0.5s):** energy visibly gathers into Uriel's core
  (particles pulling inward, brightening) before release - a real
  "tụ lực" windup, not an instant snap-fire. Wings flare open during
  the whole charge + fire window.
  - Aim point = the player's position **as it was 100ms ago** (keep a
    small ring buffer `player._posHistory` of `{t, x, y}`, ~10 entries),
    sampled at the moment the charge finishes and the sword actually
    launches (not when the charge started).
  - Spawns at Uriel's current position, travels in a **straight line**
    toward that point, does not track after launch.
  - Release: a sharp bright flash burst at the instant of launch
    ("bắn cái đùng"), then the projectile travels at
    `speed ~48 px/frame (~2880/s at 60fps, i.e. ~13 px/frame/~780px-s
    baseline +30%)`, hit radius `~46`, lifetime until off-screen,
    `_urielHolySword` tag.
  - **On hitting the player:** `playerTakesHit({ type: 'uriel_holysword' })`
    (all protection layers still get first say, exactly like every other
    lethal hit), and apply the **Judged** debuff:
    `player._urielJudgedEnd = performance.now() + 3000`.
  - **On hitting a Sentinel:** `30% Max HP` true damage. It pierces (one
    sword can clip several Sentinels along its line).
- **Judged (3s):** while `performance.now() < player._urielJudgedEnd`,
  every player hit that resolves to a life loss (after the protection
  stack) costs **1 extra life** (net -2). Hook in `playerTakesHit` after
  the save/negate checks, before the life is decremented.

### 4.2 Camouflage (Ngụy Trang)

- **Trigger:** each single time any enemy loses a Uriel Iron Body layer
  (the same `_urielIBConsumed` increment as above).
- **Cooldown 3s**, measured from the moment the previous stealth ends
  (not from when it started).
- **Effect:** Uriel enters stealth for **1.5s**:
  - fully invisible, removed from the drawn field,
  - `not targetable` by anything (`_stealthed` flag checked in every
    target-selection filter, same pattern as `veilshroud_echo` /
    `inCoronation`),
  - full Iron Body for the 1.5s (`_stealthIBEnd`).
- **On stealth end:** Uriel gains a shield worth **20% Max HP** and
  **+200 flat DR for 2s** (`_camoFlatDREnd`). Then the 3s cooldown starts.

### 4.3 Against Chaos (Chống Lại Hỗn Mang): passive

- **Base evade** = `0.30 + 0.01 * (living non-bullet enemy count)`,
  **capped at 0.40**.
- Each time Uriel **successfully dodges** a hit:
  - `-5% evade for 1s`, **stacking** (`_dodgeEvadePenalty`, each stack its
    own 1s timer, summed),
  - `+5% move speed`, same 1s stacking window, **capped at +40% total**.
- Net evade each frame = `clamp(baseEvade - sum(activePenalties), 0, 0.40)`.
  Feed this into the evade lookup at js/entities/core.js:685 as a
  `enemy.type === 'uriel'` special case rather than the flat tier table.

### 4.4 Protection (Bảo Vệ): on-death barrier

On death Uriel does **not** just disappear. It leaves a **stationary
barrier** at the death spot for **3s**:

- **Size:** width = **1.2x Uriel's body diameter** (`~240-360px` wide
  wall), centered on the death spot, horizontal. Tune from there.
- **Visual: a dedicated AI-drawn asset**, not a recolor of any existing
  enemy. Direction: Ophanim / Metatron iconography, a "wheel within a
  wheel" of gold-brass rings covered in eyes and angelic script,
  rotating around a blinding white-gold core, reading as an instrument
  of divine judgment rather than a generic sci-fi forcefield. See the
  prompt below. The engine still handles all motion and the 3s
  fade-in/out procedurally (rotation, alpha, dissipation); the art is
  only the static surface texture.
  Asset: `assets/images/game/enemies/uriel-barrier.png`.
- **Blocks everything player-side, and cannot be removed or pierced:**
  - normal bullets: deleted on contact,
  - piercing projectiles (Spirit Arc Blade, Boomerang, etc.): stopped,
    not passed through,
  - **Skill F** beam: occluded. The beam is blocked at the barrier line
    like a flashlight hitting a wall, nothing past it is lit or damaged,
  - **Skill D** core: cannot pass. It stops at the barrier and waits out
    the full 3s, then continues (never consumed),
  - **Overload Laser**: occluded, does not pass through,
  - it is never a valid target for allies (Sentinels, Yuusha Party,
    Spirits all skip it).
- The barrier itself has Iron Body and CC Immunity (it is not meant to be
  destroyed, only waited out).
- After 3s it vanishes with a small dissipation effect.

This barrier is the heaviest implementation piece: each of Skill F,
Skill D, and Overload Laser needs a line/segment-vs-barrier occlusion
test added to its own hit resolution. See touch points.

### 4.5 AI art prompts

Both assets: magenta-keyed (`#FF00FF`, flat, no gradient), same pipeline
as the Soul Reaver icon. Chroma-key and tag `@aansensei` on arrival, same
as every other in-game asset.

**Holy Sword** (`uriel-holy-sword.png`), final approved version:

> Game asset: a single projectile sprite of a colossal holy greatsword
> for a video game. Side view, blade pointing straight up. Render only
> the sword, nothing else: no scene, no hands, no ground, no background
> objects. Make it genuinely imposing and oversized: a massive, brutally
> wide double-edged blade, far larger and heavier than a normal sword,
> filling nearly the full height of the frame. Radiant polished
> silver-white steel with deep engraved gold filigree and glowing runes
> running the length of a broad fuller, a large outstretched angel-wing
> crossguard, and a haloed pommel set with a burning core. The blade
> blazes with clean white-gold light, edges razor-bright, shedding a few
> soft light motes. Front-lit, bold, heavy silhouette that still reads
> clearly when scaled down to about 90 pixels. Centered vertically with
> even margin on all sides. The entire background is one flat, uniform
> pure magenta (#FF00FF): no gradient, no glow bleeding onto the
> magenta, no drop shadow. No text, no border. Square image, painterly
> game-art style for a dark sci-fi space shooter.

**Barrier** (`uriel-barrier.png`), Ophanim / Metatron direction:

> Game asset: a single, highly ornate barrier wall texture for a video
> game, inspired by the Biblical Ophanim and the angel Metatron. A
> "wheel within a wheel" construct: concentric gold-brass rings rotating
> around a blinding white-gold core. The rings are engraved with rows of
> angelic Enochian-like script and studded with numerous small radiant
> eyes set into the metal, in the classic "wheels full of eyes"
> iconography. Intricate clockwork-angelic detail: interlocking gears,
> feathered wing motifs fused into the ring edges, faint secondary
> halos. It should read as a mechanical instrument of divine judgment,
> awe-inspiring and slightly uncanny rather than simply decorative, and
> visually distinct from any conventional sci-fi forcefield or shield.
> Overall shape: wide and rectangular like a horizontal barrier wall
> segment, tallest at the center where the main wheel sits, tapering
> toward both ends. Rendered as a single flat 2D texture, straight-on,
> no perspective. Bold and high-contrast so it still reads if stretched
> horizontally. The entire background outside the barrier shape is one
> flat, uniform pure magenta (#FF00FF): no gradient, no glow bleeding
> onto the magenta, no drop shadow. No text, no human figures, no
> border. Square image, painterly game-art style for a dark sci-fi
> space shooter.

## 5. New state / fields introduced

| Field | Owner | Meaning |
|---|---|---|
| `enemy._urielCCImmune` | every enemy | infinite CC immunity while Uriel lives |
| `enemy._urielIB` | every enemy | unspent Uriel Iron Body layer |
| `enemy._urielIBAt` | every enemy | last time this enemy's `_urielIB` was consumed (drives 5s re-grant) |
| `window._urielIBConsumed` | global | running count of consumed Uriel IB layers; %3 → Holy Sword, each +1 → Camouflage try |
| `window._lastUrielSpawn` | global | spawn cooldown clock |
| `window._urielHolySwords` | global array | active Holy Sword projectiles |
| `window._urielBarriers` | global array | active on-death barriers |
| `player._posHistory` | player | ring buffer for the 100ms-lagged aim point |
| `player._urielJudgedEnd` | player | "hits cost +1 life" window |
| `enemy._stealthed`, `_stealthIBEnd`, `_camoCDReadyAt`, `_camoFlatDREnd` | Uriel | Camouflage state |
| `enemy._selfIBTimer`, `_urielScanTimer`, `_dodgeEvadePenalties[]`, `_dodgeSpeedBuffs[]`, `_wpX/_wpY` | Uriel | internal timers / movement |

Reset all `window._uriel*` in `startGame()` next to the other
`window._*` resets. Clear `enemy._urielCCImmune` / `_urielIB` on every
enemy the frame Uriel stops existing (dead, not just Camouflaged), so
the horde loses the buff cleanly.

## 6. Locked decisions

1. **No normal attack.** Uriel deals zero direct DPS; its threat is the
   covenant buffs plus the Holy Sword.
2. **Barrier width = 1.2x Uriel's body diameter** (~240-360px).
3. **Judged window = 3s** (net -2 lives per hit while active).
4. **Against Chaos speed stacking is capped at +40%** total.
5. **Skill D core sits and waits** at the barrier for the full 3s, then
   continues. It is never consumed.
6. **CC Immunity covers every player CC**: Death Star pull, Tesla slow,
   Rift slow, Orb slow, Cuc Han slow, root, silence, vine, than menh.

## 6b. Remaining balance flag

- **Judged** is still a hard punish (a single graze inside the 3s window
  is -2 lives). Ship it as-is and watch the playtest; if it is too swingy,
  the cheapest dial is "extra life loss once per Judged window" rather
  than every hit.

## 7. Implementation touch points

| Step | File / location |
|---|---|
| `spawnUriel()` | new `js/entities/uriel.js` (own file, mirror `veilshroud.js`) |
| `updateUriel(enemy, deltaTime)` | `js/entities/uriel.js`: movement, self-IB, 1s horde scan, Camouflage, Holy Sword fire, dodge-buff decay |
| dispatch update | wherever `updateVeilshroud` / `updateMarchosias` are called in `js/main.js`'s enemy loop |
| spawn pool | `_spawnWaveTier('abnormal')`, `js/main.js:2678` (add Uriel with the 3 guards from section 3) |
| evade | `js/entities/core.js:685` (special-case `'uriel'`), and add `'uriel': _evadeAbnormal` to the table at :687 as the fallback |
| base DR branch | `js/entities/core.js:906` (`if (enemy.type === 'uriel') combinedDR += 0.40;` plus the 2s `_camoFlatDREnd` +200 flat, subtracted after the % pass like Leviathan's +350 at :1124) |
| per-hit 30% cap | `js/entities/core.js` near :1187, add an `enemy.type === 'uriel'` cap |
| Uriel IB consume hook | `js/entities/core.js:1060`, right beside the `ironBodyHits` block |
| CC immunity | `js/main.js:1448` `_ccImmune` expression (`|| enemy._urielCCImmune`), plus the Death Star pull CC checks and any other `_ccImmune` computations |
| Judged (+1 life) | `playerTakesHit` (js/main.js), after protection resolves, before life decrement |
| player pos history | push into `player._posHistory` once per frame in the main update |
| Holy Sword update + collision | `js/main.js` enemy-fx tail (near the Veilshroud echo section ~:2547) |
| death barrier | new `window._urielBarriers` updater in the same fx tail; occlusion tests in Skill F (`js/skills/skill-f.js`), Skill D (`js/skills/skill-d.js`), Overload Laser (`js/skills/skill-g.js` / laser code), and the normal-bullet collision loop |
| render | new `js/render/enemy-uriel.js` (body, halo, wings, covenant scan ring, stealth fade, barrier). **Everything drawn procedurally in canvas.** dispatch from `js/render/core.js` / `enemy-common.js` |
| art assets | **two** external PNGs, both AI-drawn + magenta-keyed (prompts in section 4.5): `assets/images/game/enemies/uriel-holy-sword.png` (Holy Sword projectile, drawn rotated to its travel vector) and `assets/images/game/enemies/uriel-barrier.png` (Ophanim/Metatron surface texture for the on-death barrier; motion, alpha and dissipation still coded in canvas, this is only the static art layer). Nothing else. |
| guide.html card | EN + VI, in the Abnormal section next to Veilshroud |
| README.md | enemy entry |
| versioning | bump every touched `?v=` in index.html + `sw.js` CACHE_VERSION; add `js/entities/uriel.js` + `js/render/enemy-uriel.js` + `assets/images/game/enemies/uriel-holy-sword.png` to `sw.js` CORE_FILES and `js/offline.js` |

## 8. Verification checklist

1. `node -c` on every touched file.
2. Debug console: spawn Uriel, confirm it patrols the top half and never
   crosses mid-screen; confirm it never appears on wave 5/10/15; confirm
   only 1 at a time and a 5s gap between spawns.
3. Spawn Uriel + several apostles: every apostle shows CC immunity and a
   Uriel IB layer within 1s; a new apostle spawned afterward also gets
   both within 1s.
4. Break 3 granted IB layers: exactly one Holy Sword fires, aimed at
   where the player was ~100ms earlier; each single break also triggers
   Camouflage (respecting the 3s post-stealth cooldown).
5. Take a Holy Sword hit: 1 life lost through the normal save stack, then
   for 3s the next hits cost 2 lives each; confirm Dream Realm / Great
   Sage / Yog / Final Defense still intercept.
6. Camouflage: Uriel vanishes 1.5s, untargetable and unhittable, then
   reappears with a 20% Max HP shield and visibly tankier for 2s.
7. Against Chaos: evade reads 30% + 1%/enemy up to 40%; a dodge drops it
   5% for 1s and speeds Uriel up 5% for 1s, both stacking, speed capped
   at +40%.
8. Kill Uriel: barrier appears for 3s, stationary; normal bullets die on
   it, piercing stops, Skill F is occluded, Skill D core waits, Overload
   Laser is blocked, allies never target it; it disappears after 3s and
   the horde loses CC immunity + Uriel IB the same frame Uriel died.
