// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/sigil-cancer.js — split out of the old monolithic js/skills.js.
// Cancer sigil: Tidal Flow's Riptide Surge (tide meter, overflow banking,
// whirlpool spawn/pull/burst/DOT, sentinel auto-replenish) and Lunar
// Aegis's Ocean Hunter execute.

// Cancer sigil (Tidal Flow / Riptide Surge): every point of damage a Gaia
// Barrier or Tidal Flow's own Iron Body layer absorbs feeds this meter (see
// dealDamage, entities/core.js). Once full, it holds at max and waits for
// the player to actually call it down (see _releaseTidalSurge, priority-
// bound to Space in js/input.js) - same "banked and ready, doesn't fire on
// its own" shape as Great Sage's stolen gems. Absorbing MORE while already
// full isn't wasted: it keeps banking into an overflow, capped at 30% of the
// meter, which becomes a head start on the next fill the instant this one
// is released - tanking hits while already "topped up" still pays off.
const TIDAL_SURGE_OVERFLOW_CAP = TIDAL_SURGE_METER_MAX * 0.30;
let _tidalSurgeOverflow = 0;
function _feedTidalSurgeMeter(amount) {
    if (amount <= 0) return;
    if (window._tidalSurgeReady) {
        _tidalSurgeOverflow = Math.min(TIDAL_SURGE_OVERFLOW_CAP, _tidalSurgeOverflow + amount);
        return;
    }
    _tidalSurgeMeter = Math.min(TIDAL_SURGE_METER_MAX, _tidalSurgeMeter + amount);
    if (_tidalSurgeMeter >= TIDAL_SURGE_METER_MAX) {
        window._tidalSurgeReady = true;
    }
}

// Space priority-release (js/input.js): fires the banked Riptide Surge.
// Whatever overflow was stacked up while already "ready" carries straight
// over as the new meter's starting value instead of being thrown away.
function _releaseTidalSurge() {
    if (!window._tidalSurgeReady) return;
    window._tidalSurgeReady = false;
    _tidalSurgeMeter = _tidalSurgeOverflow;
    _tidalSurgeOverflow = 0;
    _spawnTidalWhirlpool();
}

const TIDAL_SURGE_PULL_RADIUS = 110;
const TIDAL_SURGE_BURST_RADIUS = 150;
const TIDAL_SURGE_DAMAGE = 650;
const TIDAL_SURGE_DAMAGE_PCT = 0.25;
const TIDAL_SURGE_DOT_DAMAGE = 50;
const TIDAL_SURGE_DOT_PCT = 0.0025;
const TIDAL_SURGE_DOT_INTERVAL = 100;
const TIDAL_SURGE_MAX_WHIRLPOOLS = 10;

// One whirlpool per enemy currently on screen (capped, closest-to-player
// first) instead of one whirlpool trying to reach across the whole map -
// every enemy gets its own personal riptide right where it's standing,
// guaranteeing the pull always actually catches something. CC Immune still
// isn't pulled once it's spinning (see _updateTidalSurge), it just also
// starts right on top of its own vortex either way.
function _spawnTidalWhirlpool() {
    const targets = enemies.filter(e =>
        !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation);
    targets.sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
    const picked = targets.slice(0, TIDAL_SURGE_MAX_WHIRLPOOLS);
    if (picked.length === 0) {
        // Nothing on screen - just pop one near the player so the surge
        // isn't wasted with zero visual payoff.
        picked.push({ x: player.x, y: player.y - 150 });
    }
    picked.forEach(t => {
        _tidalSurgeEffects.push({ x: t.x, y: t.y, phase: 'spawn', timer: 0, hitEnemies: [], rot: 0, popAmount: 0, splashTimer: 0 });
    });
    // One shared ambient loop for the whole batch (stopped in _updateTidalSurge
    // once every whirlpool it spawned has finished), not one per instance.
    if (window.AudioMgr) window.AudioMgr.startCancerWhirlpool();
}

// Passive trickle into the tide meter whenever at least 1 sentinel is alive,
// regardless of whether they're actually getting hit - without this the
// whole Riptide Surge payoff never fires for a no-sentinel run or a run
// where sentinels just never take a hit. Absorbing real damage still fills
// it vastly faster (a single Gaia Barrier soak is most of the whole meter),
// so tanking hits stays the primary, intended way to trigger it. Scales with
// how many sentinels are actually up, rewarding keeping the squad alive.
function _tidalSurgePassiveRate(sentinelCount) {
    if (sentinelCount >= 3) return 75;
    if (sentinelCount === 2) return 60;
    if (sentinelCount === 1) return 50;
    return 0;
}

// Keeps Tidal Flow's own tide meter running even through a wipe - checks
// once a second, and if no real Sentinel is left, spawns 2 back in. Same
// 1s-check / 2s-cooldown shape as Taurus's own Yuusha Party replenish
// (_checkYuushaSentinelReplenish, js/yuusha-party.js), just with its own
// independent timer/cooldown state so the two sigils don't share a clock.
function _checkTidalSurgeSentinelReplenish(now) {
    if (now - (window._tidalReplenishLastCheck || 0) < 1000) return;
    window._tidalReplenishLastCheck = now;
    if (now < (window._tidalReplenishCooldownEnd || 0)) return;
    if (sentinels.length > 0) return;
    if (typeof spawnSentinel !== 'function') return;

    window._tidalReplenishCooldownEnd = now + 2000;
    spawnSentinel(player.x, player.y, false);
    spawnSentinel(player.x, player.y, false);
}

// Drags everything within TIDAL_SURGE_PULL_RADIUS toward the whirlpool's
// center (enemies and enemy bullets alike), `strength` scaling how hard
// (0-1). Shared by both the dedicated pulling phase and the first part of
// the bite phase, so nothing stops moving until the moment it's actually
// bitten.
function _pullEnemiesToward(w, strength, deltaTime, dur) {
    for (const enemy of enemies) {
        if (enemy.type === 'abyssal_chain' || enemy.type === 'veilshroud_echo' || enemy.inCoronation) continue;
        const d = Math.hypot(enemy.x - w.x, enemy.y - w.y);
        if (d > TIDAL_SURGE_PULL_RADIUS || d < 10) continue;
        enemy.x += (w.x - enemy.x) * strength * (deltaTime / dur) * 6;
        enemy.y += (w.y - enemy.y) * strength * (deltaTime / dur) * 6;
        // Wake trail: a couple of fading droplets left behind as it's dragged.
        if (Math.random() < (_gfxLevel === 0 ? 0.5 : (_gfxLevel === 1 ? 0.25 : 0))) {
            createParticles(enemy.x, enemy.y, 1, '#bff5ff', 0.2, 0.6);
        }
    }
}
function _updateTidalSurge(deltaTime) {
    if (_hasBuff('trieu_hoi')) {
        _checkTidalSurgeSentinelReplenish(performance.now());
        const _rate = _tidalSurgePassiveRate(sentinels.length);
        if (_rate > 0) _feedTidalSurgeMeter(_rate * (deltaTime / 1000));
    }
    if (!_tidalSurgeEffects.length) return;
    for (let i = _tidalSurgeEffects.length - 1; i >= 0; i--) {
        const w = _tidalSurgeEffects[i];
        w.timer += deltaTime;
        let done = false;

        // Rotation speeds up once the vortex is actually spinning (pulling/
        // bite), and popAmount (spiked at the bite/snap moment) decays back
        // down - both read by _drawWhirlpool, js/render/sigil-cancer.js.
        const spinning = w.phase === 'pulling' || w.phase === 'bite';
        w.rot = (w.rot || 0) + (deltaTime / 1000) * (0.5 + (spinning ? 2.5 : 0));
        if (w.popAmount > 0) w.popAmount = Math.max(0, w.popAmount - deltaTime / 300);

        // Pressure DOT: everything caught within the whirlpool's own pull
        // radius takes a small true-damage tick every 100ms for as long as
        // the whirlpool exists (all phases, not just while pulling) - a
        // standing reason to actually clear it out instead of just riding
        // out the pull.
        w.dotTimer = (w.dotTimer || 0) + deltaTime;
        if (w.dotTimer >= TIDAL_SURGE_DOT_INTERVAL) {
            w.dotTimer -= TIDAL_SURGE_DOT_INTERVAL;
            for (const enemy of enemies) {
                if (enemy.type.startsWith('enemy_bullet') || enemy.type === 'abyssal_chain' || enemy.type === 'veilshroud_echo' || enemy.inCoronation) continue;
                if (Math.hypot(enemy.x - w.x, enemy.y - w.y) > TIDAL_SURGE_PULL_RADIUS) continue;
                dealDamage(enemy, { damage: TIDAL_SURGE_DOT_DAMAGE, percentDamage: TIDAL_SURGE_DOT_PCT, isTrueDamage: true, _statSrc: 'Cancer: Riptide Surge (DOT)' });
            }
        }

        // Periodic foam splash + rising bubbles kicked up off the rim while
        // the vortex is active - tier-scaled like every other particle burst.
        if (spinning) {
            w.splashTimer = (w.splashTimer || 0) + deltaTime;
            if (w.splashTimer >= 220) {
                w.splashTimer = 0;
                const splashCount = _gfxLevel === 0 ? 2 : (_gfxLevel === 1 ? 1 : 0);
                for (let s = 0; s < splashCount; s++) {
                    const a = w.rot + s * Math.PI; // opposite sides of the rim
                    const sx = w.x + Math.cos(a) * 130, sy = w.y + Math.sin(a) * 130;
                    createParticles(sx, sy, 4, '#eaffff', 1, 3);
                    createParticles(sx, sy - 6, 2, '#5eead4', 0.5, 1.5);
                }
            }
        }

        if (w.phase === 'spawn') {
            if (w.timer >= 250) { w.phase = 'pulling'; w.timer = 0; }
        } else if (w.phase === 'pulling') {
            const dur = 800;
            const p = Math.min(1, w.timer / dur);
            _pullEnemiesToward(w, 1 - Math.pow(1 - p, 3), deltaTime, dur);
            if (p >= 1) {
                w.phase = 'bite'; w.timer = 0;
                if (window.AudioMgr) window.AudioMgr.playSfxAt('cancer-whale-splash', w.x, w.y);
            }
        } else if (w.phase === 'bite') {
            // Keeps dragging anything still caught right up until the whale
            // actually snaps its jaws (the 400ms mark below) instead of
            // cutting the pull off the instant the timed phase ends - things
            // right at the edge of the radius should still visibly reach
            // the center before getting bitten, not just stop short.
            if (w.timer < 400) _pullEnemiesToward(w, 1, deltaTime, 400);
            if (w.timer >= 400 && !w.burst) {
                w.burst = true;
                w.burstAt = performance.now(); // ripple draw uses this, not w.timer, so it survives the bite->fade phase reset below
                w.popAmount = 1.5;
                if (window.AudioMgr) window.AudioMgr.playSfxAt('cancer-whale-bite', w.x, w.y);
                for (const enemy of enemies) {
                    if (enemy.type.startsWith('enemy_bullet') || enemy.type === 'abyssal_chain' || enemy.type === 'veilshroud_echo' || enemy.inCoronation) continue;
                    if (w.hitEnemies.includes(enemy)) continue;
                    if (Math.hypot(enemy.x - w.x, enemy.y - w.y) <= TIDAL_SURGE_BURST_RADIUS) {
                        w.hitEnemies.push(enemy);
                        dealDamage(enemy, { damage: TIDAL_SURGE_DAMAGE, percentDamage: TIDAL_SURGE_DAMAGE_PCT, isTrueDamage: true, _statSrc: 'Cancer: Riptide Surge' });
                    }
                }
                // Splash burst as the whale snaps its jaws shut - a spray of
                // white foam + teal water flung outward from the impact point.
                createParticles(w.x, w.y - 30, 26, '#eaffff', 3, 9);
                createParticles(w.x, w.y - 30, 18, '#5eead4', 2, 7);
                if (typeof _setShake === 'function') _setShake(16, 500);
                window._sigilChromFlashEnd = performance.now() + 400;
            }
            if (w.timer >= 900) { w.phase = 'fade'; w.timer = 0; }
        } else if (w.phase === 'fade') {
            // Don't splice out an effect still mid-ripple: the wave rings
            // drawn off w.burstAt (js/render/sigil-cancer.js) run up to 1000ms
            // past the burst, longer than this phase's own 400ms fade-out.
            const rippleDone = !w.burst || performance.now() - w.burstAt >= 1000;
            if (w.timer >= 400 && rippleDone) done = true;
        }
        if (done) _tidalSurgeEffects.splice(i, 1);
    }
    // Whole batch finished (splice above can only empty it here, since the
    // early return above already catches an already-empty array) - stop the
    // shared ambient loop started in _spawnTidalWhirlpool.
    if (_tidalSurgeEffects.length === 0 && window.AudioMgr) window.AudioMgr.stopCancerWhirlpool();
}

// Cancer sigil (Lunar Aegis / Ocean Hunter): checked in dealDamage right
// after Death Mark's own ≤5% HP instakill, same exclusions (Goliath's own
// rules always take priority; coronation/echo are untargetable).
function _tryOceanHunterExecute(enemy) {
    if (!_hasBuff('giap_nguyet') || enemy.type === 'goliath' || enemy.hp <= 0) return;
    if (enemy.hp / (enemy.maxHp || enemy.hp) > 0.08) return;
    if (enemy.inCoronation || enemy.type === 'veilshroud_echo') return;
    enemy.hp = 0;
    enemy._markedForDeath = true;
    _oceanHunterBites.push({ x: enemy.x, y: enemy.y, spawnAt: performance.now(), duration: 500, fromLeft: Math.random() < 0.5 });
    createParticles(enemy.x, enemy.y, 20, '#ff5c5c', 2, 7);
    createParticles(enemy.x, enemy.y, 14, '#eaffff', 2, 6);
    createParticles(enemy.x, enemy.y, 12, '#5eead4', 2, 6);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('cancer-whale-bite', enemy.x, enemy.y);
    if (typeof _setShake === 'function') _setShake(15, 400);
    window._sigilChromFlashEnd = performance.now() + 350;
}

