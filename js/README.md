# JavaScript Module Architecture

## Overview

The js folder contains the modules that together form the complete game engine
for Pisces Space Journey. All modules communicate through a shared global
namespace declared in config.js. There is no import or export syntax and no
bundler. Each file is a plain script loaded by index.html in a fixed sequence.

Load order enforced by index.html (check index.html directly if this list
ever looks stale — it is hand-maintained, not generated):

1. audio.js — AudioManager (BGM/SFX/mute), no dependency on config.js globals
2. background.js
3. config.js
4. js/sigils/*.js (core.js, the engine, loads first, then one file per sigil)
5. entities.js
6. js/skills/*.js (one file per skill button/sigil mechanic, 13 files)
7. render.js **or** js/render/*.js (16 files) — see below, only one of the two is active at a time
8. pixi-renderer.js
9. input.js
10. main.js

This sequence is mandatory. Every module after config.js references globals that
config.js declares at parse time, so any deviation causes reference errors on
startup.

## config.js

**Role:** Global state initialization and constants. This file runs first and
allocates every shared variable that the remaining five modules depend on.

Canvas bootstrap:

```js
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
```

Key globals declared in this file:

* gameState, lives, score, gameStartTime, gameElapsedTime
* player object with x, y, width, height, speed, hitRadius (5.75)
* Entity arrays: bullets, enemies, explosions, particles, chainLightningEffects, sentinels
* Skill cooldown constants: skillACooldown (6000ms), skillSCooldown (12000ms),
  skillDCooldown (12000ms), skillFCooldown (7000ms), skillShiftCooldown (11000ms)
* Skill timestamp variables: lastSkillA, lastSkillS, lastSkillD, lastSkillF, lastSkillShift
* Passive flags: gloryForJusticeActive, accurateParryActive, hasTriggeredLastStand,
  playerAbsoluteShield
* finalDefense object with playerShield, boundaryShield, playerCooldownEnd, boundaryCooldownEnd
* Laser config: overloadChargeTime (3000ms), laserDuration (12000ms),
  laserTickInterval (155ms), laserCooldownDuration (9000ms)
* Spawn config: initialSpawnInterval (1494ms), spawnDecreaseRate (50), minSpawnInterval (370ms)
* Auto fire: autoFireInterval (135ms)

The only function declared in this file is _setShake(intensity, duration), which
updates the screenShake object that render.js reads each frame.

## entities.js

**Role:** Entity lifecycle, collision geometry, and the complete damage
resolution pipeline. This is the largest behavioral module in the engine.

### Damage Pipeline

Every incoming hit resolves through a layered sequence before HP is decremented.
The checkMarchosiasArcShield function intercepts bullets before standard damage
resolution and computes the angular difference between the bullet trajectory and
the arc shield orientation:

```js
function checkMarchosiasArcShield(enemy, source, bx, by) {
    const bulletAngle = Math.atan2(by - enemy.y, bx - enemy.x);
    let diff = bulletAngle - enemy.arcShield.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) >= Math.PI / 4) return false;
    // applies 50% DR to shield pool only, triggers sword queue on each hit
}
```

### Enemy Finite State Machines

Each enemy archetype runs an independent FSM updated every frame.

**Marchosias sword queue:** _tryTriggerMarchosiasCounter pushes a windup object
onto enemy.marchosiasWindups with a 1000ms countdown. Multiple windups run in
parallel. At death, _fireMarchosiasDeathSwords fires all queued windups
simultaneously regardless of whether the host entity still exists.

**Thaelis Reincarnation:** At 0 HP the entity is replaced by three Embryo
objects each inheriting a portion of Thaelis max HP plus a fixed bonus.
Embryo objects have damagereduction set to 0.90 and ccImmune set to true
directly on the object.

**Leviathan All for One:** The entity holds a kill quota of 10 to 20. All incoming
damage evaluates to zero at the top of the resolution chain until the quota is
met. After quota fulfillment a Perseverance sweep fires as the combat opener.

**Leviathan Bulwark Barrier:** every 1s, while its shield hasn't reached the
2-layer cap, it gains a layer worth 0.5% Max HP per on-screen enemy (each
layer capped at 15% Max HP). Resets once the shield fully depletes.

### Vanguard Network and Fuse Protocol

When sentinels.length reaches 5 or more, incoming hits enter the shared damage
distribution path. The network tracks cumulative damage over the last 500ms
against a threshold equal to 26% of combined sentinel max HP. On threshold
breach, the lowest HP sentinel is removed and all remaining sentinels receive
ironBody set to true for 1250ms.

### Vulnerability System

Application rolls occur inside the damage resolution function. Each successful
roll instantly destroys 26% of the target's current shield HP. The debuff object
on each enemy tracks a stack count capped at 4 and a 3000ms refresh timer. When
all 4 stacks are present, vulnTrueDmgEnd is set on the enemy for 2500ms. During
this window hits still resolve against shield/barrier normally, then get an
extra bonus applied straight to HP as true damage — an additive kicker, not a
full bypass — that decays linearly from 40% to 20% of that hit's damage across
the window. updateVulnerabilityWindows() runs every frame and, the instant
vulnTrueDmgEnd passes, deals a flat 500 base true damage hit and resets
vulnStacks/vulnEndTime/vulnTrueDmgEnd to 0. Goliath additionally tracks
_vulnTrueDmgCooldownEnd, a 5000ms cooldown that starts counting from when the
window ends (vulnTrueDmgEnd + 5000), gating the next window from opening until
it passes — every other enemy type has no such cooldown.

## render.js / js/render/

**Role:** Complete Canvas 2D rendering pipeline. Draws every visible element
on screen each frame. Reads shared globals but never writes to them.

**This is now split into 16 files under `js/render/`** (core.js, fx.js,
player.js, one file per enemy type, one file per skill). The original
`js/render.js` is kept on disk untouched as a rollback safety net — only one
of the two (`render.js` or `js/render/*.js`) is wired into `index.html` at
any given time; check index.html's script tags to see which. **See
[js/render/README.md](render/README.md) for the full file map, load order,
why the split exists, and a documented incident + debugging checklist for
this exact area** — read that before making changes here if something in
rendering breaks after an edit.

The technical subsections below describe mechanisms that live inside this
pipeline; each notes which specific `js/render/*.js` file it's in.

### Mobile Performance Path (`js/render/core.js`)

```js
function _initMobilePerf() {
    Object.defineProperty(ctx, 'shadowBlur',
        { get: () => 0, set: () => {}, configurable: true });
    Object.defineProperty(ctx, 'shadowColor',
        { get: () => 'transparent', set: () => {}, configurable: true });
}
```

Intercepting the property descriptor means every ctx.shadowBlur assignment
anywhere in the codebase silently returns zero on mobile. No conditional checks
are required inside individual draw functions because the suppression operates
at the engine level.

### Adaptive Quality System (`js/render/core.js`)

Four quality levels are indexed by two constant arrays:

```js
const _GFX_PARTICLE_SCALE = [1.0, 0.65, 0.35, 0.2];
const _GFX_PARTICLE_CAP   = [350, 250,  150,  100];
```

Level 0 is full quality. Level 3 is minimum. The active level sets
window._particleScale and caps the particle array length each frame. Frame time
measurements drive level promotion and demotion automatically.

### Background Caching (`js/render/core.js`)

On mobile, static background layers are pre-rendered to an offscreen canvas
element and composited each frame with a single ctx.drawImage call:

```js
if (!_bgOffscreen) _bgOffscreen = document.createElement('canvas');
_bgOffscreen.width = canvas.width;
_bgOffscreen.height = canvas.height;
const oCtx = _bgOffscreen.getContext('2d');
_drawSpaceBgTo(oCtx, deltaTime, canvas.width, canvas.height);
ctx.drawImage(_bgOffscreen, 0, 0);
```

The cache invalidates on resize or quality level change. On desktop, the
background draws directly to ctx each frame without caching.

### Screen Shake (`js/render/core.js`)

```js
ctx.translate(
    Math.sin(_sNow * 0.025) * screenShake.intensity * _sFade * 0.38,
    Math.cos(_sNow * 0.019) * screenShake.intensity * _sFade * 0.38
);
```

Two independent sinusoidal offsets on the x and y axes produce an irregular
shake pattern. _sFade is a linear decay ratio (screenShake.duration / 500) that
reduces amplitude as the remaining duration approaches zero.

### Neon Bloom (technique used throughout `js/render/`, not centralized in one file)

Bloom is achieved by drawing each shape multiple times at increasing shadowBlur
radii and then drawing the fully opaque shape on top. This is a pure Canvas 2D
technique that requires no WebGL or CSS filter.

### Chain Lightning (`js/render/fx.js`, called from `js/render/core.js`'s draw loop)

Arc segments between targets use Math.sin displaced midpoints. Each segment
redraws every frame with an alpha value derived from the effect age, producing
a natural flickering appearance.

## skills.js / js/skills/

**Role:** Implementations of all six active skills, plus every sigil mechanic
that isn't pure picker/HUD data (that part lives in `js/sigils/`). Each
activation function reads cooldown timestamps from config.js, checks
player._silenced, then mutates shared entity arrays and state flags.

**Split into 13 files under `js/skills/`**, one per skill button or sigil
mechanic (skill-a.js, skill-s-spirit.js, skill-d.js, skill-f.js, skill-g.js,
skill-shift.js, sigil-great-sage.js, sigil-cancer.js, sigil-libra.js,
sigil-gemini.js, sigil-aries.js, sigil-virgo.js, misc-mechanics.js). See
[js/skills/README.md](skills/README.md) for the full file map. The technical
subsections below still describe the mechanisms by skill/sigil name; each
now maps onto exactly one of those files.

### Skill A (Thunder Orbs)

```js
function activateSkillA() {
    const currentTime = performance.now();
    if (typeof player !== "undefined" && player._silenced) return;
    if (gameState === "playing" && currentTime - lastSkillA >= skillACooldown) {
        lastSkillA = currentTime;
        skillADefensiveCharges = 3;
        // pushes up to 20 orb objects into skillAOrbs array
    }
}
```

rebalanceSkillAOrbs distributes untargeted orbs into concentric orbit layers.
Each layer holds up to 20 orbs evenly spaced by angle. Radius starts at 60px
and increments by 35px per additional layer.

**Dimensional Rift (on hit):** When a targeting orb hits an enemy and actually
deals damage (not blocked by iron body / absolute shield / evade), spawnDimensionalRift
creates a 50px radius zone lasting 3000ms. Enemies inside are slowed 35%,
receive Soul Reaver (2s duration, refreshed every frame while inside the zone)
+ Soul Devourer DoT (60 + 5.5% maxHp per 350ms, direct HP, skip embryo, only
ticks while Glory for Justice is active), and take +25% incoming damage.
Enemy bullets within 2.5× the
radius are pulled toward the center; bullets reaching the inner core (radius ×
0.45) are destroyed. The DoT has a 20% chance per tick to chain-lightning up
to 8 nearby enemies within 150px (independent of Glory for Justice).

**Orb Retaliation (on sacrifice):** When a defensive golden orb is consumed to
absorb a player hit, the attacker (excluding enemy_bullet, abyssal_chain,
veilshroud_echo, and inCoronation enemies) immediately receives Soul Reaver
(2s duration) + Soul Devourer DoT (60 + 5.5% maxHp per 350ms, direct HP, skip
embryo, only ticks while Glory for Justice is active) and a 25% movement slow
for 3 seconds (enemy._orbRetaliationSlowEnd). The slow stacks
multiplicatively with Dimensional Rift slow.

### Skill S (Remembrance Spirit and Photokrystos)

activateSkillS checks whether a spirit object already exists in the spirits
array. On first press it pushes a spirit object with a 35000ms duration timer.
If primevalEnergy reaches 100 before the spirit enters its Finale, pressing S
again sets a photokrystos flag on the spirit object. This switches its attack
pattern to 3 homing bullets per volley at 42ms intervals and activates the
Boomerang and Danger Not Today passive behaviors.

### Skill Shift (Yog-Sothoth Domain)

cancelSkillShift computes the hold duration and selects the appropriate cooldown
tier. Hold under 2000ms resolves to 1100ms. Hold of 2000 to 5000ms resolves to
4400ms. Hold of 5000 to 7000ms resolves to 9900ms. Teleport or hold over 7000ms
resolves to 9000ms. executeShiftTeleport moves player.x to the target coordinate
and records the teleport to enforce the maximum cooldown tier.

### Skill F (Annihilation Sweep)

activateSkillF sets skillFState to "charging" and records skillFChargeStart.
The update loop in main.js advances the state machine: after 1500ms it
transitions to "sweeping" for 1000ms and applies 999999999 damage to every
enemy object intersecting the beam geometry.

### Skill D (Death Star: Draconic Annihilation)

activateSkillD sets skillDCharging to true; after skillDChargeTime elapses
updateSkillD (js/skills/skill-d.js) spawns the deathStar object and pulls every
targetable, non-CC-immune enemy toward it at a fixed speed. Center contact
deals 999999999 damage (an instant kill) to normal enemies, or 30% MaxHP true
damage per 400ms tick to CC-immune ones (dargruel/leviathan/goliath/egregor/
marchosias-with-barrier/aegis-invulnerable). A separate Mark & Annihilate
cycle runs every ~2s (1.5s telegraph), marking 3 targets and firing a
piercing true-damage beam through each.

Galactic Spaceships (window.skillDSpaceships) spawn from two independent
triggers: any enemy death within radius of the Death Star (handleEnemyKill,
js/entities.js), and — since 2026-08-23 — a Dominator+/Digiform escort check
inside updateSkillD itself, which drops one spaceship the instant a
dargruel/leviathan/goliath enters that same radius, then one more every
1000ms for as long as one stays in range (state tracked on
deathStar._domDetected/_domSpawnTimer, reset the moment none remain in
range). Ships home on the current highest-HP enemy, fire true-damage bolts
in flight, deal contact damage + apply Vulnerability on impact, fuse with a
same-tier ship within 50px into a stronger tier, and receive the same
ally-wide buffs Sentinels get (Blessing, Gaia Protection/Barrier, Lunar
Aegis evade, Glory for Justice damage+fire rate) via updateSkillDSpaceships.

### Skill G (Tesla Matrix)

skillGCharge accumulates at 0.5 per enemy kill. At 100 activateSkillG sets
skillGActive to true, skillGEndTime to 30000ms from the current timestamp, and
immediately sets gloryForJusticeActive to true. Energy orb objects spawn at kill
locations during the duration. After 5000ms each paired orb set merges into a
Tesla Coil object that applies 6% EP damage every 50ms to all enemies within a
200px aura radius.

## input.js

**Role:** Keyboard and touch event routing, UI state transitions, and pause logic.
This module also exposes UI helper functions consumed by main.js and index.html.

### Keyboard Handler

The keydown listener routes inputs based on active game state flags. Arrow key
behavior changes when skillShiftActive is true, distinguishing teleport input
from normal movement:

```js
if (skillShiftActive) {
    if (e.code === "ArrowLeft")  { executeShiftTeleport('left');  return; }
    if (e.code === "ArrowRight") { executeShiftTeleport('right'); return; }
} else {
    if (e.code === "ArrowLeft")  keys.left  = true;
    if (e.code === "ArrowRight") keys.right = true;
}
```

The keyup handler on Space resolves the charge duration. If the hold is below
overloadChargeTime (3000ms) it fires a scaled charged bullet with a multiplier
proportional to the charge fraction. If the hold reaches 3000ms the overload
laser path activates instead.

### Auto-pause on Tab Switch

```js
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'playing' && !gamePaused) {
        gamePaused = true;
        showPauseScreen();
    }
});
```

This guarantees automatic pause on tab switch with no frame spike on resume.

### Pause Resume Sequence

The resume button triggers a 2000ms animated progress bar via requestAnimationFrame
before setting gamePaused to false. lastTimeStamp resets to performance.now() at
resume to eliminate the deltaTime spike that would otherwise result from the
accumulated pause duration.

## main.js

**Role:** Core game loop, hit priority arbitration, life management, auto-fire,
and enemy spawn scheduling.

### Time Scaling

When skillShiftActive is true the raw delta time is multiplied by 0.15 before
being passed to entity updates. All cooldown timestamps on the player side and
the enemy spawn timer are offset by the complementary 85% fraction each frame.
This keeps cooldowns advancing at real time while the simulation slows:

```js
const timeScale = skillShiftActive ? 0.15 : 1.0;
const deltaTime = rawDeltaTime * timeScale;

if (skillShiftActive) {
    let delay = rawDeltaTime * 0.85;
    lastAutoFire += delay;
    lastSkillA += delay;
    // all remaining cooldown timestamps receive the same offset
}
```

### Hit Priority Arbitration

```js
function playerTakesHit(attacker) {
    if (skillShiftActive) { _triggerAccurateParry(); return; }

    if (skillAActive && skillADefensiveCharges > 0 && skillAOrbs.length > 0) {
        skillADefensiveCharges--;
        // consume one orb object from skillAOrbs
        // if attacker is a targetable enemy: apply Soul Reaver + Soul Devourer DoT + 3s 25% slow
        return;
    }

    if (finalDefense.playerShield) {
        finalDefense.playerShield = false;
        finalDefense.playerCooldownEnd = performance.now() + 25000;
        return;
    }

    loseLife();
}
```

The chain resolves in priority order: Iron Body via skillShiftActive absorbs
the hit and triggers Accurate Parry. Orb Sacrifice consumes one defensive
charge and curses the attacker (if targetable). Final Defense Player Shield
absorbs one hit and starts a 25000ms regen timer. Last Stand triggers once
per game at the final life, granting Absolute
Shield to the player and all active sentinels. Only after all layers are
exhausted does loseLife() decrement the lives counter.

### Auto-fire

The auto-fire path checks performance.now() against lastAutoFire plus
autoFireInterval (135ms). Each volley pushes 5 bullet objects in a 45-degree
spread. Each bullet independently rolls a 28% chance to apply Vulnerability
on its target.

### Overload Laser

When the Space hold duration reaches 3000ms the laser activates. A damage tick
fires every 155ms for 12000ms total. Each tick applies 100 base damage plus 16%
of the target's Max HP. After the laser ends laserCooldownEnd is set to 9000ms
from the current timestamp.

### Enemy Spawn Scheduling

The spawn interval decreases from 1494ms by 50ms per spawn until it reaches
370ms. Each spawn rolls the enemy pool weighted by elapsed game time. Coronation
logic runs per Apostle each frame and probabilistically converts qualifying
Apostles into higher-tier enemies after a 2200ms transformation animation during
which the source entity is flagged immortal and untargetable.

### Glory for Justice Evaluation

The gloryForJusticeActive flag is evaluated each frame. It activates when
enemies.length exceeds 4, when any enemy of Elite class or above is present, or
when skillGActive is true. All allied damage multiplication by 1.55 and fire
rate multiplication by 1.4 apply while this flag reads true.

## pixi-renderer.js

**Role:** WebGL compositing overlay built on PixiJS v8. This module runs
entirely outside the Canvas 2D pipeline and renders high-frequency visual
effects that are prohibitively expensive when drawn with shadowBlur on a 2D
context. It attaches a transparent PixiJS canvas directly after gameCanvas in
the DOM and drives it through a separate render call at the end of each frame.

### Initialization and Feature Flag

The module is wrapped in an async IIFE that calls app.init and awaits its
resolution before proceeding. Initialization is non-blocking from the
perspective of main.js because pixi-renderer.js is loaded last and sets three
global hooks only after the PixiJS application is fully ready:

```js
window._pixiDrawBullets    = function(bullets, spiritBullets) { ... }
window._pixiDrawParticles  = function(particles) { ... }
window._pixiRender         = function() { ... }
```

render.js calls these hooks each frame when window._usePixi is true. If PixiJS
fails to load, all three hooks remain null and render.js falls back to its own
Canvas 2D implementations without any behavioral change.

The feature flag window._usePixi is defined through Object.defineProperty to
intercept the set operation. When set to true the PixiJS canvas becomes visible
and a shadowBlur soft-cap is installed on the main ctx instance:

```js
Object.defineProperty(ctx, 'shadowBlur', {
    get()  { return _ng.call(this); },
    set(v) { _ns.call(this, v > 0 ? Math.min(v, 8) : 0); },
    configurable: true,
});
```

This caps every ctx.shadowBlur write to 8px across the entire codebase without
modifying any individual draw call. A 20px blur becomes 8px and a 60px blur
becomes 8px. The cost reduction scales with the square of the original radius,
yielding a 56x reduction for the largest effects.

### Layer Stack

Seven PIXI.Container objects form the compositing stack. Containers are added
to app.stage in back-to-front order so that later containers render on top:

1. riftLayer: Dimensional Rift zones. Placed at the lowest Pixi layer so rift
   visuals appear just above the game canvas background and beneath all gameplay
   elements
2. nebulaLayer: Nebula atmosphere clouds drifting behind gameplay
3. trailLayer: Bullet trail ghost sprites
4. particleLayer: Explosion and hit particles
5. bulletLayer: Player bullets and enemy bullets redirected from Canvas 2D
6. spiritLayer: Spirit homing bullets with distinct texture
7. flashLayer: Hit flash feedback bursts on top of everything

### Sprite Pool

All layers use a shared sprite pool to avoid per-frame object allocation. The
pool is a plain array. Sprites are acquired with _acq() (pops from pool or
constructs a new PIXI.Sprite) and released with _rel() (pushes back). Layer
clears call removeChildren and return every removed sprite to the pool before
the next frame populates the layer.

### Texture Cache

Canvas 2D helper functions exported by render.js (_getBulletSprite,
_getSpiritSprite, _getGlowSprite) produce HTMLCanvasElement objects on demand.
The texture cache wraps each canvas in a PIXI.Texture.from call keyed by a
string combining type, rounded size, and graphics level. Repeated calls with
identical parameters return the cached texture without re-uploading to the GPU.

### Phase 3A: Nebula Atmosphere

Three nebula cloud sprites use a screen blend mode so they brighten the dark
space background without washing out bright gameplay elements. Each cloud holds
a velocity vector and wraps around the viewport edges when it drifts off screen.
The radial gradient texture for each cloud is generated once at initialization
time and reused every frame.

### Phase 3B: Bullet Trails

Before bulletLayer clears each frame, _spawnTrails records the current position
of every bullet as a trail entry with an initial alpha of 0.38. Each entry
decays by a factor of 0.50 per frame (_TRAIL_DECAY). Entries whose alpha falls
below 0.018 are removed. The trail cap (_TRAIL_CAP = 200) limits the maximum
number of simultaneous trail entries to prevent unbounded growth during heavy
bullet fire.

### Phase 3C: Hit Flash

The _checkHits function maintains a Map from enemy object references to their
last observed HP value. Each frame it compares current HP against the stored
value. When HP decreases, a flash entry is pushed at the enemy position with an
initial alpha of 0.88. Flash entries decay at a rate of 0.48 per frame and are
removed below 0.02. The Map is cleared when gameState leaves the playing state
to prevent stale references from accumulating across sessions.

### Phase 3D: Dimensional Rift Zones

Rift containers are created on demand through window._pixiSpawnRift and
destroyed through window._pixiDestroyRift. Both hooks are called by
spawnDimensionalRift and updateDimensionalRifts in js/skills/skill-a.js. The _riftContainers
Map stores the association between rift game objects and their PIXI.Container
instances.

Each container holds four child layers in fixed order:

1. Core graphic: three concentric filled circles in deep violet tones creating
   the void core effect
2. Ring graphic: two stroked circles plus 12 radial spike lines forming the
   energy ring
3. Cracks graphic: redrawn every frame with 4-segment jittered lines radiating
   from the center
4. Particle layer: a PIXI.Container accumulating floating antimatter particles

The animation loop inside _drawRifts runs every render call and advances the
following state per container:

```
container._riftAge += 0.05   // drives all periodic functions
core scale  = 1 + sin(age * 2.5) * 0.05
ring rotation -= 0.025 per frame
```

Crack rendering selects a glitch mode with 18% probability each frame. In
normal mode cracks draw as 0xd800ff lines at 1.5px width. In glitch mode cracks
draw as 0xffffff lines at 3.0px width with random angle and length variation.
Sub-branches in 0x00f5ff appear only during glitch frames on cracks that carry
the hasSubBranch flag. Particle color alternates between 0x00e5ff and 0xff007f
with 45% spawn probability per frame and a 0.018 per-frame alpha decay rate.

The container alpha scales linearly from 1.0 to 0.0 over the final 500ms of
the rift lifetime to produce a smooth fade-out.

### Canvas 2D Fallback

When window._usePixi is false, render.js calls _drawDimensionalRiftsCtx() which
draws a simplified rift representation using the main ctx. The fallback renders
a radial gradient void core and a rotating purple stroke ring with crack lines
drawn as straight segments from center to edge. No particles or per-frame crack
jitter are applied in the fallback path.



All modules share a single flat global namespace. config.js declares every
shared variable. All other modules read and write those variables directly by
name with no accessor or wrapper layer.

The render pipeline (render.js, or the js/render/*.js split — see above) reads
game state each frame and writes nothing back. entities.js owns damage
resolution and entity lifecycle mutations. js/skills/*.js owns skill activation
and cooldown timestamp updates. input.js owns event routing and UI element
transitions. main.js orchestrates the game loop and calls into all other modules
each frame.

This flat namespace design eliminates indirection and keeps cross-module calls
trivial at the cost of encapsulation. Any module can inspect any game state
variable at any time without an API layer.
