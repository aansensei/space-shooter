// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/entities/raphael.js — Wisdom King mechanic: a hit tally that builds
// while Custos Aeternus is up, and the Wisdom Orb it periodically launches
// once that tally hits a multiple of 80. Rendering lives in
// js/render/enemy-raphael.js (_drawRaphaelWisdomOrbs/_drawRaphaelWisdomZones).

const _raphaelWisdomOrbImg = new Image();
_raphaelWisdomOrbImg.src = 'assets/images/game/enemies/raphael-wisdom-orb.png';

// Called from dealDamage (entities/core.js) on every hit that lands while
// Custos is up, DoT ticks included - this tally is deliberately separate
// from (and not throttled like) the 20-hit Custos-break counter, so a
// burst of rapid attacks that only counts once or twice toward breaking
// the shield still fully "teaches" the Wisdom King.
function _raphaelRegisterWisdomHit(enemy) {
    enemy._wisdomHitCount = (enemy._wisdomHitCount || 0) + 1;
    if (enemy._wisdomHitCount % 80 === 0) _raphaelSpawnWisdomOrb(enemy);
}

// Picks the straight line out of Raphael that pierces the most targets
// (Sentinels + the player) at once, rather than a fixed or random
// direction - the "wisdom" in Wisdom Orb is choosing the smartest shot,
// not just firing one. Candidate angles are each target's own bearing from
// Raphael; for each candidate, every other target within a ~7° cone of
// that same bearing counts as "also on this line". A line that happens to
// also catch the player gets a small tie-break bonus, since a shot that
// only threatens Sentinels is worth less than one that threatens the
// player too.
function _raphaelBestWisdomAngle(enemy) {
    const candidates = [];
    for (const s of sentinels) { if (s.hp > 0) candidates.push({ x: s.x, y: s.y, isPlayer: false }); }
    candidates.push({ x: player.x, y: player.y, isPlayer: true });

    const ANGLE_TOL = 0.12; // ~7 degrees
    let bestAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    let bestScore = -1;
    for (const c of candidates) {
        const ang = Math.atan2(c.y - enemy.y, c.x - enemy.x);
        let count = 0, hitsPlayer = false;
        for (const c2 of candidates) {
            const ang2 = Math.atan2(c2.y - enemy.y, c2.x - enemy.x);
            let diff = Math.abs(ang - ang2);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff <= ANGLE_TOL) { count++; if (c2.isPlayer) hitsPlayer = true; }
        }
        const score = count + (hitsPlayer ? 0.5 : 0);
        if (score > bestScore) { bestScore = score; bestAngle = ang; }
    }
    return bestAngle;
}

// Gathers for GATHER_MS (light dust pulling in, a portal seam cracking
// open - see the render side) before actually launching, matching the
// "cổng mở ra, lấp ló quả cầu" telegraph the design called for. Speed then
// ramps up from LAUNCH_SPEED_MIN to LAUNCH_SPEED_MAX instead of an instant
// full-speed shot.
const RAPHAEL_WISDOM_GATHER_MS = 650;
const RAPHAEL_WISDOM_LAUNCH_SPEED_MIN = 3;
const RAPHAEL_WISDOM_LAUNCH_SPEED_MAX = 22;
const RAPHAEL_WISDOM_ACCEL = 0.6;
const RAPHAEL_WISDOM_LIFE_MS = 4500;

function _raphaelSpawnWisdomOrb(enemy) {
    const ang = _raphaelBestWisdomAngle(enemy);
    raphaelWisdomOrbs.push({
        x: enemy.x, y: enemy.y, ang, enemy,
        phase: 'gather', gatherTimer: RAPHAEL_WISDOM_GATHER_MS,
        speed: RAPHAEL_WISDOM_LAUNCH_SPEED_MIN,
        life: RAPHAEL_WISDOM_LIFE_MS,
        hitTargets: [], playerHit: false,
        // Own-Max-HP category (docs/combat-scaling-rebalance.md Part 2):
        // snapshotted at spawn so a later buff to Raphael's own Max HP
        // doesn't retroactively change an orb already in flight.
        atk: 0.01875 * _enemyHs(enemy),
    });
    addExplosion(enemy.x, enemy.y, enemy.size * 0.9, '#ffe27a');
    if (window.AudioMgr) window.AudioMgr.playSfxAt('raphael-wisdom-charge', enemy.x, enemy.y);
}

function updateRaphaelWisdomOrbs(deltaTime) {
    const dt = deltaTime / 16.67;
    for (let i = raphaelWisdomOrbs.length - 1; i >= 0; i--) {
        const o = raphaelWisdomOrbs[i];

        if (o.phase === 'gather') {
            o.gatherTimer -= deltaTime;
            if (o.gatherTimer <= 0) {
                o.phase = 'launch';
                o._launchAt = performance.now(); // drives the launch-flash render burst
                if (window.AudioMgr) window.AudioMgr.playSfxAt('raphael-wisdom-launch', o.x, o.y);
            }
            continue;
        }

        o.speed = Math.min(RAPHAEL_WISDOM_LAUNCH_SPEED_MAX, o.speed + RAPHAEL_WISDOM_ACCEL * dt);
        o.x += Math.cos(o.ang) * o.speed * dt;
        o.y += Math.sin(o.ang) * o.speed * dt;
        o.life -= deltaTime;

        if (o.life <= 0 || o.x < -80 || o.x > canvas.width + 80 || o.y < -80 || o.y > canvas.height + 80) {
            raphaelWisdomOrbs.splice(i, 1);
            continue;
        }

        for (const s of sentinels) {
            if (s.hp <= 0 || o.hitTargets.includes(s)) continue;
            if (Math.hypot(s.x - o.x, s.y - o.y) < (s.size || 20) + 21) {
                o.hitTargets.push(s);
                dealDamage(s, { damage: o.atk, isTrueDamage: true, isPiercing: true, _statSrc: 'Wisdom Orb' });
                // Zone inherits the same own-Max-HP basis as the orb itself
                // (0.00375*Hs/s = 0.25 x the orb's own 0.01875*Hs hit, per
                // the spec's stated per-second rate), not the target's HP.
                raphaelWisdomZones.push({ x: s.x, y: s.y, radius: 62, life: 1500, maxLife: 1500, atkPerSec: o.atk * 0.20 });
                createParticles(s.x, s.y, 20, '#ffe27a', 2, 7);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('raphael-wisdom-impact', s.x, s.y);
            }
        }

        if (!o.playerHit && Math.hypot(player.x - o.x, player.y - o.y) < (player.hitRadius || 6) + 21) {
            o.playerHit = true;
            playerTakesHit({ type: 'raphael' });
            player._wisdomOrbSlowed = true;
            player._wisdomOrbSlowEnd = performance.now() + 1000;
            createParticles(player.x, player.y, 20, '#ffe27a', 2, 7);
            if (window.AudioMgr) window.AudioMgr.playSfxAt('raphael-wisdom-impact', player.x, player.y);
        }
    }

    // Wind-rush texture while any Wisdom Orb is actually in flight - reuses
    // Uriel's Holy Sword hover loop rather than a dedicated clip, same
    // shared-loop convention as that sword's own hover (entities/uriel.js):
    // tracks whether ANY orb is currently in the launch phase, not
    // per-instance, only toggling on the 0->1 / 1->0 transition.
    // Uriel's own swords may be sharing this same loop at the same time
    // (both are on-screen elites) - only actually stop it once neither
    // source still needs it, so one finishing doesn't cut the other off.
    const _hasOrbsInFlight = raphaelWisdomOrbs.some(o => o.phase === 'launch');
    if (window.AudioMgr) {
        if (_hasOrbsInFlight && !window._raphaelWisdomOrbsInFlight) window.AudioMgr.startUrielSwordHover();
        else if (!_hasOrbsInFlight && window._raphaelWisdomOrbsInFlight && !window._urielSwordsInFlight) window.AudioMgr.stopUrielSwordHover();
    }
    window._raphaelWisdomOrbsInFlight = _hasOrbsInFlight;
}

function updateRaphaelWisdomZones(deltaTime) {
    let _playerInAnyZone = false;
    for (let i = raphaelWisdomZones.length - 1; i >= 0; i--) {
        const z = raphaelWisdomZones[i];
        z.life -= deltaTime;
        if (z.life <= 0) { raphaelWisdomZones.splice(i, 1); continue; }

        for (const s of sentinels) {
            if (s.hp <= 0) continue;
            if (Math.hypot(s.x - z.x, s.y - z.y) <= z.radius) {
                dealDamage(s, { damage: z.atkPerSec * (deltaTime / 1000), isTrueDamage: true, _noHitSfx: true, _statSrc: 'Wisdom Orb zone' });
            }
        }
        if (Math.hypot(player.x - z.x, player.y - z.y) <= z.radius) _playerInAnyZone = true;
    }
    player._inWisdomZone = _playerInAnyZone;
}
