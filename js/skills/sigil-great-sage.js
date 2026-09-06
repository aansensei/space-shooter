// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/sigil-great-sage.js — split out of the old monolithic js/skills.js.
// Great Sage sigil (than): Ransacked Treasury's stolen gem attacks - per-
// gem flavor/color, lock-point targeting, the 8 scaled-down joker copies,
// and gem granting on an Elite-or-higher kill.

// Great Sage sigil: per-type flavor/color for each stolen gem, and the
// scaled-down player-usable copy of that enemy's own signature attack.
// light/mid/dark match GOLIATH_GEM_COLORS (js/render/enemy-goliath.js) for
// the 7 shared types, so a stolen gem reads as the same gem Goliath himself
// would have absorbed; 'goliath' has no boss-of-its-own gem so it gets its
// own color here.
const GREAT_SAGE_GEM_INFO = {
    thaelis:    { label: 'Tenacity Barrier',   light: '#e9ddff', mid: '#8b5cf6', dark: '#2d004d' },
    aegis_core: { label: 'Lumen Nova',         light: '#fff8e1', mid: '#fbbf24', dark: '#7a5a00' },
    marchosias: { label: 'Arc Barrier',        light: '#ccffe9', mid: '#10b981', dark: '#003322' },
    veilshroud: { label: 'Phantom Strike',     light: '#e6fffb', mid: '#2dd4bf', dark: '#0b3b3a' },
    egregor:    { label: 'Null Slash',         light: '#c9fff5', mid: '#14b8a6', dark: '#003344' },
    dargruel:   { label: 'Root Shockwave',     light: '#ffcccc', mid: '#991b1b', dark: '#3a0000' },
    leviathan:  { label: 'Perseverance Sweep', light: '#eafaff', mid: '#00e5ff', dark: '#1a0033' },
    goliath:    { label: 'Absolute Verdict',   light: '#f5d0fe', mid: '#a21caf', dark: '#1a0010' },
};

// Fires a scaled-down copy of the stolen enemy's own signature attack,
// centered on/near the player. comboMult is 1.5 when unleashed via 72
// Transformations (all 3 gems at once), 1 for a single spent gem.
// Nearest/toughest-enemy helpers used to lock a stolen attack's aim at the
// moment it's cast, matching how the real jokers lock their own aim once at
// mark-time instead of tracking continuously.
function _greatSageNearestEnemy() {
    let best = null, bestD = Infinity;
    for (const e of enemies) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < bestD) { bestD = d; best = e; }
    }
    return best;
}
function _greatSageToughestEnemy() {
    let best = null, bestHp = -1;
    for (const e of enemies) { if (e.maxHp > bestHp) { bestHp = e.maxHp; best = e; } }
    return best;
}
// Player-side mirror of Goliath's own _goliathLockTargets: picks the nearest
// enemy plus `count` more (random pick, no duplicates), filling any leftover
// slots with random on-screen points when there aren't enough enemies. A
// single locked point is too easy to just dodge out of before the attack
// resolves - matches the real Joker's multi-target lock (js/entities/goliath.js).
function _greatSageLockPoints(count) {
    // Guards against any enemy whose x/y aren't real numbers at this exact
    // instant (mid-transform, mid-teleport, etc. on whatever enemy type) -
    // a locked point is frozen for the rest of the effect's life, so a bad
    // read here would otherwise crash every future frame's render, not just
    // this one.
    const isValid = e => e && Number.isFinite(e.x) && Number.isFinite(e.y);
    const primary = _greatSageNearestEnemy();
    const points = [];
    const used = [];
    if (isValid(primary)) { points.push({ x: primary.x, y: primary.y, ref: primary }); used.push(primary); }
    else points.push({ x: player.x, y: player.y - 200, ref: null });
    const pool = enemies.filter(e => !used.includes(e) && isValid(e));
    _shuffleArray(pool).slice(0, count).forEach(e => points.push({ x: e.x, y: e.y, ref: e }));
    while (points.length < count + 1) {
        // Near the player, not some random spot clear across the map with
        // nothing anywhere near it (matches _goliathLockTargets's own
        // fallback, js/entities/goliath.js).
        const ang = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 140;
        points.push({ x: player.x + Math.cos(ang) * dist, y: player.y + Math.sin(ang) * dist, ref: null });
    }
    return points;
}

// Enqueues the stolen attack as a timed effect matching the real joker's own
// windup/telegraph/resolve shape (js/entities/goliath.js's
// _goliathUpdateJoker), just scaled down in duration since this is a bonus
// proc riding along a Skill F recast, not a standalone boss ultimate.
// Thaelis is the one exception - its real kit is a persistent passive, so
// its stolen copy applies as an instant timed shield with no windup.
function _castStolenGemAttack(type, comboMult) {
    const info = GREAT_SAGE_GEM_INFO[type];
    if (!info) return;
    comboMult = comboMult || 1;
    const now = performance.now();
    // Every stolen attack fires in a shared blue tone instead of the gem's
    // own color (that color is reserved for the gem's slot icon while it's
    // still banked). Reads as "borrowed power", visually distinct from
    // whichever enemy it was taken from the moment it's actually unleashed.
    createParticles(player.x, player.y, 16, '#3b82f6', 2, 8);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', player.x, player.y);

    if (type === 'thaelis') {
        // Tenacity Barrier: the player gets 1 Iron Body layer (blocks the
        // next hit outright), sentinels get a 3s window of 50% dodge chance
        // per hit instead — matching how the real barrier protects Goliath
        // as a whole rather than each individual hit the same way.
        window._greatSageIronBody = true;
        window._greatSageShieldEnd = Math.max(window._greatSageShieldEnd || 0, now + 3000 * comboMult);
        return;
    }
    if (type === 'aegis_core') {
        // Lumen Nova: marks lines toward 3 locked points (nearest enemy + 2
        // more, matching the real Joker's multi-lock), holds a brief
        // telegraph, then fires along each fixed line
        const angles = _greatSageLockPoints(2).map(p => Math.atan2(p.y - player.y, p.x - player.x));
        _greatSageEffects.push({ type: 'aegis', phase: 'telegraph', timer: 0, dur: 500, x: player.x, y: player.y, angles, comboMult });
        return;
    }
    if (type === 'marchosias') {
        // Arc Barrier's own sword windup: a brief windup, then blades are
        // thrown from wherever the player is standing AT FIRE TIME toward 3
        // locked target points (nearest enemy + 2 more) - matches the real
        // Sword (the eye tracks its owner live at fire time, only the
        // target point itself is what's locked at proc time).
        const targets = _greatSageLockPoints(2);
        _greatSageEffects.push({ type: 'sword_windup', timer: 0, dur: 500, targets, comboMult });
        return;
    }
    if (type === 'veilshroud') {
        // Phantom Strike: marks 3 locked points, waits, then a lightning
        // bolt lands on each - only actually hits whatever enemy is still
        // standing in that spot when it lands
        const points = _greatSageLockPoints(2);
        _greatSageEffects.push({ type: 'veilshroud', timer: 0, dur: 750, points, comboMult });
        return;
    }
    if (type === 'egregor') {
        // Null Slash: brief windup facing the nearest enemy, then a genuine
        // 180° arc slash centered on the player. R is the tentacle's reach
        // (distance to the locked target, clamped to a sane range).
        const target = _greatSageNearestEnemy();
        const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : -Math.PI / 2;
        // Uncapped reach, matching the real Null Slash (R = distance to the
        // locked target, no ceiling) instead of the clamped-down range this
        // had before - the tentacle should be able to stretch across the
        // whole screen just like Goliath's own version.
        const fullRange = Math.hypot(canvas.width, canvas.height);
        const R = target ? Math.min(fullRange, Math.hypot(target.x - player.x, target.y - player.y) + 25) : fullRange * 0.6;
        // x/y/angle/R here are just the starting values for the very first
        // render frame - the windup keeps re-locking them onto the player
        // and the current nearest enemy every frame below (see the resolve
        // loop), matching the real Null Slash's own "track continuously,
        // lock at release" behavior.
        _greatSageEffects.push({ type: 'egregor', phase: 'windup', timer: 0, dur: 500, x: player.x, y: player.y, angle, R, comboMult });
        return;
    }
    if (type === 'dargruel') {
        // Maou Haki: an expanding ring, not an instant flat-radius hit -
        // expands at the SAME rate as the real spawnBossShockwave (radius
        // += 12 per 16.67ms frame, js/entities/core.js), not a fixed 700ms
        // sprint to full screen - the real one takes ~2s to cross a normal
        // screen, this used to finish more than twice as fast.
        const fullRange = Math.hypot(canvas.width, canvas.height);
        _greatSageEffects.push({ type: 'shockwave', timer: 0, speed: 12, maxRadius: fullRange, x: player.x, y: player.y, hitEnemies: [], comboMult });
        return;
    }
    if (type === 'leviathan') {
        // Perseverance Sweep: short warning, then one full 360° rotation of
        // a sweeping beam around the player
        _greatSageEffects.push({ type: 'leviathan', phase: 'warn', timer: 0, warnDur: 300, sweepDur: 900, startAngle: Math.random() * Math.PI * 2, x: player.x, y: player.y, hitEnemies: [], comboMult });
        return;
    }
    if (type === 'goliath') {
        // Absolute Verdict: brief channel locked onto the toughest enemy on
        // screen, then a heavy piercing orb (reuses Blade Arc's projectile
        // system, same as the Marchosias sword above). x/y/angle are just
        // the starting values - the channel keeps re-locking them onto the
        // player and the current toughest enemy every frame below, matching
        // the real Verdict's own "track live, lock right before firing".
        const target = _greatSageToughestEnemy();
        const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : -Math.PI / 2;
        _greatSageEffects.push({ type: 'verdict', timer: 0, dur: 600, x: player.x, y: player.y, angle, comboMult });
        return;
    }
}

// Advances every pending stolen-attack effect, applying damage exactly once
// at the moment the real joker's own attack would resolve (line telegraph
// completing, sword windup finishing, lightning landing, arc slash firing,
// shockwave ring passing through, sweep beam crossing). Called once per
// frame from main.js's update loop, mirroring updateBladeArcProjectiles.
function _updateGreatSageEffects(deltaTime) {
    if (!_greatSageEffects.length) return;
    for (let i = _greatSageEffects.length - 1; i >= 0; i--) {
        const fx = _greatSageEffects[i];
        fx.timer += deltaTime;
        let done = false;

        if (fx.type === 'aegis') {
            if (fx.phase === 'telegraph' && fx.timer >= fx.dur) {
                fx.phase = 'fire'; fx.timer = 0; fx.dur = 150;
                const fullLen = Math.hypot(canvas.width, canvas.height);
                fx.angles.forEach(angle => {
                    const lineStart = { x: fx.x, y: fx.y };
                    const lineEnd = { x: fx.x + Math.cos(angle) * fullLen, y: fx.y + Math.sin(angle) * fullLen };
                    for (const enemy of enemies) {
                        if (distToSegment(enemy, lineStart, lineEnd) < (enemy.size || 20) + 15) {
                            dealDamage(enemy, { damage: 220 * fx.comboMult, percentDamage: 0.12 * fx.comboMult, _statSrc: 'Great Sage: Lumen Nova' });
                        }
                    }
                });
                createParticles(fx.x, fx.y, 10, '#fbbf24', 2, 6);
            } else if (fx.phase === 'fire' && fx.timer >= fx.dur) {
                done = true;
            }
        } else if (fx.type === 'sword_windup') {
            if (fx.timer >= fx.dur) {
                // Fires from the player's CURRENT position, aimed at each
                // locked target point - the target is what's frozen (set at
                // cast time), the launch point tracks live, exactly like the
                // real Sword's eye-tracks-live/target-is-locked split.
                fx.targets.forEach(t => {
                    const angle = Math.atan2(t.y - player.y, t.x - player.x);
                    bladeArcProjectiles.push({
                        x: player.x, y: player.y, originX: player.x, originY: player.y, _fireTime: performance.now(),
                        vx: Math.cos(angle) * 20, vy: Math.sin(angle) * 20,
                        radius: 44, damage: 260 * fx.comboMult, percentDamage: 0.13 * fx.comboMult,
                        hitEnemies: [], isPiercing: true, isGreatSageBlade: true, _statSrc: 'Great Sage: Arc Barrier',
                    });
                });
                done = true;
            }
        } else if (fx.type === 'veilshroud') {
            if (fx.timer >= fx.dur) {
                fx.points.forEach(pt => {
                    for (const enemy of enemies) {
                        if (Math.hypot(enemy.x - pt.x, enemy.y - pt.y) < (enemy.size || 20) + 30) {
                            dealDamage(enemy, { damage: 320 * fx.comboMult, percentDamage: 0.17 * fx.comboMult, isTrueDamage: true, _statSrc: 'Great Sage: Phantom Strike' });
                        }
                    }
                    createParticles(pt.x, pt.y, 14, '#2dd4bf', 3, 9);
                });
                done = true;
            }
        } else if (fx.type === 'egregor') {
            if (fx.phase === 'windup') {
                // Keeps re-locking onto the player's current position and
                // the current nearest enemy every frame of the windup,
                // freezing only the instant it fires - matches the real
                // Null Slash (tracks continuously, locks at release).
                // Without this the arc stayed pinned to wherever the gem was
                // cast from, so simply moving during the 500ms windup made
                // the whole slash connect with nothing.
                fx.x = player.x; fx.y = player.y;
                const target = _greatSageNearestEnemy();
                if (target) {
                    fx.angle = Math.atan2(target.y - fx.y, target.x - fx.x);
                    const fullRange = Math.hypot(canvas.width, canvas.height);
                    fx.R = Math.min(fullRange, Math.hypot(target.x - fx.x, target.y - fx.y) + 25);
                }
                if (fx.timer >= fx.dur) {
                    // Real Null Slash timing: extend 200ms, sweep 520ms, retract
                    // 230ms (950ms total) - kept exact so the tentacle-whip
                    // render's own extend/sweep/retract curve reads correctly.
                    fx.phase = 'strike'; fx.timer = 0; fx.dur = 950;
                    const arcR = fx.R;
                    for (const enemy of enemies) {
                        const d = Math.hypot(enemy.x - fx.x, enemy.y - fx.y);
                        if (d > arcR + (enemy.size || 20)) continue;
                        let dA = Math.atan2(enemy.y - fx.y, enemy.x - fx.x) - fx.angle;
                        while (dA > Math.PI) dA -= Math.PI * 2;
                        while (dA < -Math.PI) dA += Math.PI * 2;
                        if (Math.abs(dA) <= Math.PI / 2) {
                            dealDamage(enemy, { damage: 260 * fx.comboMult, percentDamage: 0.14 * fx.comboMult, _statSrc: 'Great Sage: Null Slash' });
                        }
                    }
                    if (typeof _setShake === 'function') _setShake(6, 150);
                }
            } else if (fx.phase === 'strike' && fx.timer >= fx.dur) {
                done = true;
            }
        } else if (fx.type === 'shockwave') {
            const curRadius = Math.min(fx.maxRadius, fx.speed * (fx.timer / 16.67));
            for (const enemy of enemies) {
                if (fx.hitEnemies.includes(enemy)) continue;
                if (Math.hypot(enemy.x - fx.x, enemy.y - fx.y) <= curRadius + 20) {
                    fx.hitEnemies.push(enemy);
                    // Matches the real Maou Haki: enemy bullets caught in the
                    // ring are wiped outright, real enemies take damage.
                    if (enemy.type.startsWith('enemy_bullet')) {
                        createParticles(enemy.x, enemy.y, 3, '#3b82f6', 1, 3);
                        enemy.hp = 0;
                    } else {
                        dealDamage(enemy, { damage: 190 * fx.comboMult, percentDamage: 0.11 * fx.comboMult, _statSrc: 'Great Sage: Root Shockwave' });
                    }
                }
            }
            if (curRadius >= fx.maxRadius) done = true;
        } else if (fx.type === 'leviathan') {
            if (fx.phase === 'warn' && fx.timer >= fx.warnDur) {
                fx.phase = 'sweeping'; fx.timer = 0;
            } else if (fx.phase === 'sweeping') {
                const curAngle = fx.startAngle + (fx.timer / fx.sweepDur) * Math.PI * 2;
                for (const enemy of enemies) {
                    if (fx.hitEnemies.includes(enemy)) continue;
                    const eAngle = Math.atan2(enemy.y - fx.y, enemy.x - fx.x);
                    let d = Math.abs(((curAngle - eAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                    if (d < 0.15) {
                        fx.hitEnemies.push(enemy);
                        dealDamage(enemy, { damage: 200 * fx.comboMult, percentDamage: 0.11 * fx.comboMult, _statSrc: 'Great Sage: Perseverance Sweep' });
                    }
                }
                if (fx.timer >= fx.sweepDur) done = true;
            }
        } else if (fx.type === 'verdict') {
            // Keeps re-locking onto the player's current position and the
            // current toughest enemy every frame of the channel, freezing
            // only at launch - matches the real Verdict (tracks live, locks
            // right before firing) instead of aiming at wherever both stood
            // when the gem was cast.
            fx.x = player.x; fx.y = player.y;
            const target = _greatSageToughestEnemy();
            if (target) fx.angle = Math.atan2(target.y - fx.y, target.x - fx.x);
            if (fx.timer >= fx.dur) {
                bladeArcProjectiles.push({
                    x: fx.x, y: fx.y,
                    vx: Math.cos(fx.angle) * 26, vy: Math.sin(fx.angle) * 26,
                    radius: 60, damage: 420 * fx.comboMult, percentDamage: 0.22 * fx.comboMult, isTrueDamage: true,
                    hitEnemies: [], isPiercing: true, isGreatSageVerdict: true, isGreatSageOrb: true, _statSrc: 'Great Sage: Absolute Verdict',
                });
                done = true;
            }
        }

        if (done) _greatSageEffects.splice(i, 1);
    }
}

// Plunders a killed Elite-or-higher enemy's own gem for Ransacked Treasury,
// one of each kind held at a time (max 3). Called for a kill by ANY method
// (handleEnemyKill, js/entities/core.js), not just a Skill F sweep kill.
// Maps Goliath's own _jokerState ability names (js/entities/goliath.js) to
// the gem-type strings used here.
const GOLIATH_JOKER_NAME_TO_GEM = {
    'Veilshroud': 'veilshroud', 'Thaelis': 'thaelis', 'Aegis Core': 'aegis_core',
    'Marchosias': 'marchosias', 'Egregor': 'egregor', 'Dargruel': 'dargruel', 'Leviathan': 'leviathan',
};
function _grantGreatSageGem(enemy) {
    if (!_hasBuff('cuop_bao_tang')) return;
    let gained = false;
    if (enemy.type === 'goliath') {
        // Goliath absorbed exactly 3 other bosses' powers on the way to True
        // Form - killing it steals those 3 gems directly instead of a single
        // generic one.
        Object.keys(enemy._jokerState || {}).forEach(name => {
            const gemType = GOLIATH_JOKER_NAME_TO_GEM[name];
            if (gemType && _greatSageGems.length < 3 && !_greatSageGems.includes(gemType)) {
                _greatSageGems.push(gemType);
                gained = true;
            }
        });
    } else if (SKILL_F_ELITE_TIERS.includes(enemy.type) && _greatSageGems.length < 3 && !_greatSageGems.includes(enemy.type)) {
        _greatSageGems.push(enemy.type);
        gained = true;
    }
    // Read by _drawGreatSageGemGrantBurst (js/render/player.js) for a one-time
    // flash on the ship the instant a gem actually lands, not just a duplicate
    // steal attempt that got skipped above.
    if (gained) window._greatSageGemGrantFlash = performance.now();
}

