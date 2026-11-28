// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// js/skills/misc-mechanics.js — split out of the old monolithic js/skills.js.
// Enemy-side projectile mechanics that live here rather than in
// entities/*.js: Marchosias's own sword-throw blades, and the Soul Reaver
// curse's damage-over-time tick.

const MARCH_RAIN_RADIUS = 120, MARCH_RAIN_MS = 2000;
const MARCH_RAIN_BEATS = [600, 950, 1300, 1650];
const MARCH_SWORD_HIT_ATK = [1.75, 1.49, 1.36];
const _marchRainZones = [], _marchCutFx = [], _marchHitTargets = [], _marchExitedBlades = [];
let _marchClock = 0, _marchFrameDt = 0, _marchSlowMs = 0, _marchSfxAt = -Infinity;

function _resetMarchosiasEffects() {
    _marchRainZones.length = 0; _marchCutFx.length = 0; _marchHitTargets.length = 0; _marchExitedBlades.length = 0;
    _marchClock = 0; _marchSlowMs = 0; _marchFrameDt = 0; _marchSfxAt = -Infinity;
    for (let i = 0; i < sentinels.length; i++) sentinels[i]._marchRainNext = 0;
}

function _marchPlaySfx(name, x, y) {
    if (_marchClock - _marchSfxAt < 80 || !window.AudioMgr) return;
    _marchSfxAt = _marchClock;
    window.AudioMgr.playSfxAt(name, x, y);
}

function _marchBeginFrame(deltaTime) {
    _marchClock += deltaTime; _marchFrameDt = deltaTime / 16.67;
    _marchExitedBlades.length = 0;
    for (let i = 0; i < marchosiasBlades.length; i++) {
        const b = marchosiasBlades[i];
        b._sweepX = b.x; b._sweepY = b.y; b._sweepEndX = b._sweepEndY = null;
    }
    for (let i = _marchCutFx.length - 1; i >= 0; i--) {
        _marchCutFx[i].age += deltaTime;
        if (_marchCutFx[i].age >= 220) _marchCutFx.splice(i, 1);
    }
}

// I test relative motion so even opposite fast crossings cannot tunnel.
function _marchSweepHit(ax, ay, bx, by, radius) {
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const x = ax + dx * t, y = ay + dy * t;
    return x * x + y * y <= radius * radius;
}

function _marchCutsShot(p, ax, ay, radius = 4) {
    return _marchCutsPath(ax, ay, p.x, p.y, radius);
}

function _marchCutsPath(ax, ay, bx, by, radius = 4) {
    for (let i = 0; i < marchosiasBlades.length + _marchExitedBlades.length; i++) {
        const b = i < marchosiasBlades.length ? marchosiasBlades[i] : _marchExitedBlades[i - marchosiasBlades.length];
        if (!b.active || b.delay > 0) continue;
        const sx = Number.isFinite(b._sweepX) ? b._sweepX : b.x;
        const sy = Number.isFinite(b._sweepY) ? b._sweepY : b.y;
        const ex = Number.isFinite(b._sweepEndX) ? b._sweepEndX : sx + b.vx * _marchFrameDt;
        const ey = Number.isFinite(b._sweepEndY) ? b._sweepEndY : sy + b.vy * _marchFrameDt;
        if (!_marchSweepHit(ax - sx, ay - sy, bx - ex, by - ey, (b.radius || MARCH_SWORD_RADIUS) + radius)) continue;
        if (_gfxLevel < 2 && !_mobPerf && !window._fxOpts?.reducedMotion && _marchCutFx.length < 24) {
            const dx = bx - ax - (ex - sx), dy = by - ay - (ey - sy);
            const len2 = dx * dx + dy * dy;
            const t = len2 ? Math.max(0, Math.min(1, -((ax - sx) * dx + (ay - sy) * dy) / len2)) : 0;
            _marchCutFx.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, angle: b.angle, age: 0 });
        }
        return true;
    }
    return false;
}

function _marchSpawnRain(blade, x, y) {
    if (blade._rainCreated) return;
    blade._rainCreated = true;
    if (_marchRainZones.length >= 8) _marchRainZones.shift();
    _marchRainZones.push({ x, y, atk: blade.atk || 0, type: 'marchosias',
        age: 0, born: _marchClock, beat: 0, slowUsed: false, hitPlayer: false });
    _marchPlaySfx('metal-hit', x, y);
}

function _marchRainSlowMult(deltaTime) {
    _marchSlowMs = Math.max(0, _marchSlowMs - deltaTime);
    for (let i = 0; i < _marchRainZones.length; i++) {
        const z = _marchRainZones[i];
        if (z.slowUsed || z.age >= MARCH_RAIN_MS || Math.hypot(player.x - z.x, player.y - z.y) > MARCH_RAIN_RADIUS) continue;
        z.slowUsed = true;
        if (!(typeof _muiPlayerCCImmune === 'function' && _muiPlayerCCImmune()) && !_capBlocksSource(z, player, 'debuff')) _marchSlowMs = 750;
    }
    return _marchSlowMs > 0 ? 0.75 : 1;
}

function _updateMarchosiasRain(deltaTime) {
    for (let i = 0; i < _marchRainZones.length; i++) _marchRainZones[i].age += deltaTime;
    // I resolve overlapping beats in time order, including long frames.
    while (true) {
        let z = null, beatAt = Infinity;
        for (let i = 0; i < _marchRainZones.length; i++) {
            const candidate = _marchRainZones[i];
            if (candidate.beat >= MARCH_RAIN_BEATS.length || candidate.age < MARCH_RAIN_BEATS[candidate.beat]) continue;
            const at = candidate.born + MARCH_RAIN_BEATS[candidate.beat];
            if (at < beatAt) { z = candidate; beatAt = at; }
        }
        if (!z) break;
        z.beat++;
            if (!z.hitPlayer && Math.hypot(player.x - z.x, player.y - z.y) <= MARCH_RAIN_RADIUS) {
                z.hitPlayer = true;
                if (!_capBlocksSource(z, player, 'skill') && (typeof _yuushaPierceRedirect !== 'function'
                    || !_yuushaPierceRedirect(0.25 * z.atk, false, z))) playerTakesHit(z);
            }
            for (let j = 0; j < sentinels.length; j++) {
                const s = sentinels[j];
                if (s.hp <= 0 || beatAt < (s._marchRainNext || 0) || Math.hypot(s.x - z.x, s.y - z.y) > MARCH_RAIN_RADIUS) continue;
                s._marchRainNext = beatAt + 350;
                dealDamage(s, { damage: 0.25 * z.atk, _attackerType: 'marchosias', _noHitSfx: true, _capSource: z, _capKind: 'skill' });
            }
            _marchPlaySfx('spirit-arc-slash', z.x, z.y);
    }
    for (let i = _marchRainZones.length - 1; i >= 0; i--) if (_marchRainZones[i].age >= MARCH_RAIN_MS) _marchRainZones.splice(i, 1);
}

function updateMarchosiasBlades(deltaTime) {
    const dt = deltaTime / 16.67;
    for (let i = marchosiasBlades.length - 1; i >= 0; i--) {
        const blade = marchosiasBlades[i];
        blade.type = 'marchosias';
        let travelDt = dt;
        if (!blade.active) {
            blade.delay -= deltaTime;
            if (blade.delay > 0) continue;
            blade.active = true; travelDt = -blade.delay / 16.67; blade.delay = 0;
            _marchPlaySfx('spirit-arc-slash', blade.x, blade.y);
        }
        const ax = blade.x, ay = blade.y;
        blade._sweepX = ax; blade._sweepY = ay;
        blade.x += blade.vx * travelDt; blade.y += blade.vy * travelDt;
        blade._sweepEndX = blade.x; blade._sweepEndY = blade.y;
        blade._age = (blade._age || 0) + deltaTime;
        if (_capStopProjectile(blade, ax, ay, 'skill', false, blade.radius)) { marchosiasBlades.splice(i, 1); continue; }
        _marchHitTargets.length = 0;
        const dx = blade.x - ax, dy = blade.y - ay, len2 = dx * dx + dy * dy;
        for (let j = -1; j < sentinels.length; j++) {
            const target = j < 0 ? player : sentinels[j];
            if (j < 0 ? blade.hitPlayer : target.hp <= 0 || blade.hitEnemies.includes(target)) continue;
            const r = blade.radius + (j < 0 ? player.hitRadius : target.size);
            if (!_marchSweepHit(ax - target.x, ay - target.y, blade.x - target.x, blade.y - target.y, r)) continue;
            const px = ax - target.x, py = ay - target.y, dot = px * dx + py * dy;
            const t = px * px + py * py <= r * r ? 0 : len2 ? Math.max(0, (-dot - Math.sqrt(Math.max(0, dot * dot - len2 * (px * px + py * py - r * r)))) / len2) : 0;
            target._marchHitT = t;
            let index = _marchHitTargets.length;
            while (index > 0 && _marchHitTargets[index - 1]._marchHitT > t) {
                _marchHitTargets[index] = _marchHitTargets[index - 1]; index--;
            }
            _marchHitTargets[index] = target;
        }
        for (let j = 0; j < _marchHitTargets.length; j++) {
            const s = _marchHitTargets[j];
            _marchSpawnRain(blade, s.x, s.y);
            const coeff = MARCH_SWORD_HIT_ATK[Math.min(blade.hitEnemies.length, 2)];
            if (s === player) {
                blade.hitPlayer = true;
                if (typeof _yuushaPierceRedirect !== 'function' || !_yuushaPierceRedirect(coeff * (blade.atk || 0), false, blade)) playerTakesHit(blade);
            } else {
                dealDamage(s, { damage: (blade.atk || 0) * coeff, _noHitSfx: true, _attackerType: 'marchosias', _capSource: blade, _capKind: 'skill' });
                blade.hitEnemies.push(s);
                addExplosion(s.x, s.y, 20, '#ff6600');
            }
            _marchPlaySfx('metal-hit', s.x, s.y);
        }
        _marchHitTargets.length = 0;
        if (blade.x < -blade.radius || blade.x > canvas.width + blade.radius || blade.y < -blade.radius || blade.y > canvas.height + blade.radius) {
            _marchExitedBlades.push(blade); marchosiasBlades.splice(i, 1);
        }
    }
}
// Soul Reaver DoT (Cắn nuốt linh hồn)
// Kẻ địch có soulReaver bị trừ 10 base + 5% MaxHP mỗi 0.5 giây (bỏ qua khiên)
function updateSoulReaverDoT(deltaTime) {
    const now = performance.now();
    for (const enemy of enemies) {
        if (!enemy.soulReaver) continue;
        // expiry runs regardless of GfJ so the debuff (and its heal/shield
        // reduction elsewhere) doesn't outlive its 2s duration on its own
        if (enemy.soulReaverEnd && now > enemy.soulReaverEnd) {
            enemy.soulReaver = false;
            continue;
        }
        if (!gloryForJusticeActive) continue; // DoT tick itself only runs with GfJ on
        if (enemy.type === 'embryo') continue; // CC-immune, bypass all status DoTs
        if (!enemy.soulReaverDotTimer) enemy.soulReaverDotTimer = 0;
        enemy.soulReaverDotTimer -= deltaTime;
        if (enemy.soulReaverDotTimer <= 0) {
            enemy.soulReaverDotTimer = 350; // 0.35 giây
            // Routed through dealDamage (true damage, bypasses shield same
            // as before) instead of subtracting HP directly, so Iron Body,
            // Custos Aeternus, AFO shields, Arc Barrier, and Goliath's own
            // invincibility phases actually gate it like every other source.
            dealDamage(enemy, { damage: 0.069 * player.atk, isTrueDamage: true, _isSrDot: true, _statSrc: 'Soul Reaver' });
            // Particle nhỏ màu cam để thể hiện DoT
            createParticles(
                enemy.x + (Math.random() - 0.5) * (enemy.size || 20),
                enemy.y + (Math.random() - 0.5) * (enemy.size || 20),
                3, '#FF4500', 1, 3
            );
        }
    }
}

