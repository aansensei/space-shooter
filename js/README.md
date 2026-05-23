# JavaScript Module Architecture

## Overview

The js folder contains six modules that together form the complete game engine
for Pisces Space Journey. All modules communicate through a shared global
namespace declared in config.js. There is no import or export syntax and no
bundler. Each file is a plain script loaded by index.html in a fixed sequence.

Load order enforced by index.html:

1. config.js
2. entities.js
3. render.js
4. skills.js
5. input.js
6. main.js

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

**Leviathan All for One:** The entity holds a kill quota of 6 to 9. All incoming
damage evaluates to zero at the top of the resolution chain until the quota is
met. After quota fulfillment a Perseverance sweep fires as the combat opener.

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
all 4 stacks are present, a trueDamageWindow flag is set on the enemy for 2000ms.
During this window all player-sourced hits bypass shield absorption entirely.

## render.js

**Role:** Complete Canvas 2D rendering pipeline. This file draws every visible
element on screen each frame. It reads shared globals but never writes to them.

### Mobile Performance Path

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

### Adaptive Quality System

Four quality levels are indexed by two constant arrays:

```js
const _GFX_PARTICLE_SCALE = [1.0, 0.65, 0.35, 0.2];
const _GFX_PARTICLE_CAP   = [350, 250,  150,  100];
```

Level 0 is full quality. Level 3 is minimum. The active level sets
window._particleScale and caps the particle array length each frame. Frame time
measurements drive level promotion and demotion automatically.

### Background Caching

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

### Screen Shake

```js
ctx.translate(
    Math.sin(_sNow * 0.025) * screenShake.intensity * _sFade * 0.38,
    Math.cos(_sNow * 0.019) * screenShake.intensity * _sFade * 0.38
);
```

Two independent sinusoidal offsets on the x and y axes produce an irregular
shake pattern. _sFade is a linear decay ratio (screenShake.duration / 500) that
reduces amplitude as the remaining duration approaches zero.

### Neon Bloom

Bloom is achieved by drawing each shape multiple times at increasing shadowBlur
radii and then drawing the fully opaque shape on top. This is a pure Canvas 2D
technique that requires no WebGL or CSS filter.

### Chain Lightning

Arc segments between targets use Math.sin displaced midpoints. Each segment
redraws every frame with an alpha value derived from the effect age, producing
a natural flickering appearance.

## skills.js

**Role:** Implementations of all six active skills. Each activation function
reads cooldown timestamps from config.js, checks player._silenced, then mutates
shared entity arrays and state flags.

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

### Skill D (Cosmic Black Hole)

activateSkillD sets skillDCharging to true and records the activation timestamp.
After 2000ms main.js spawns a blackHole object. Each frame the update loop
pulls enemy positions toward blackHole.x and blackHole.y. Enemies within the
center threshold radius receive 999999999 damage. Entities with the ccImmune
flag are not displaced but are still destroyed on center contact.

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
function playerTakesHit() {
    if (skillShiftActive) { _triggerAccurateParry(); return; }

    if (skillAActive && skillADefensiveCharges > 0 && skillAOrbs.length > 0) {
        skillADefensiveCharges--;
        // consume one orb object from skillAOrbs
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
charge. Final Defense Player Shield absorbs one hit and starts a 25000ms regen
timer. Last Stand triggers once per game at the final life, granting Absolute
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

## Inter-module Communication

All six modules share a single flat global namespace. config.js declares every
shared variable. All other modules read and write those variables directly by
name with no accessor or wrapper layer.

render.js reads game state each frame and writes nothing back. entities.js owns
damage resolution and entity lifecycle mutations. skills.js owns skill activation
and cooldown timestamp updates. input.js owns event routing and UI element
transitions. main.js orchestrates the game loop and calls into all other modules
each frame.

This flat namespace design eliminates indirection and keeps cross-module calls
trivial at the cost of encapsulation. Any module can inspect any game state
variable at any time without an API layer.
