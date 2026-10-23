// Fixed pools share the simulation clock with every Umbral Serpent effect.
const TY_SERPENT_SPEED_MULT = 1.25;
// Each hunt has this chance to latch on for 3 bites, TY_SERPENT_FRENZY_GAP ms apart,
// before the serpent heads back to the ship for the usual 600ms.
const TY_SERPENT_FRENZY_CHANCE = 0.4, TY_SERPENT_FRENZY_GAP = 200;
const _tySerpents = Array.from({ length: 10 }, (_, id) => ({
    id, active: false, x: 0, y: 0, angle: 0, target: null, state: 0, chain: 0,
    nextBite: 0, spawnTime: 0, absorbAt: -1, biteFlashUntil: 0, segX: new Float32Array(10), segY: new Float32Array(10)
}));
const _tyDevours = Array.from({ length: 4 }, () => ({
    active: false, start: -10000, nextBite: 0, bites: 0, target: null, x: 0, y: 0,
    hitRefs: new Array(512), hitCounts: new Uint8Array(512), hitMasks: new Uint8Array(512), hitCount: 0
}));
const _tyShards = Array.from({ length: 16 }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, angle: 0, spawnTime: 0, lifeMs: 1100, burst: null, bit: 0
}));
const _tyArray = { active: false, start: 0, tick: 0, exploded: false, x: 0, y: 0 };
const _tyShield = { state: 0, stateTime: 0, hitAngle: 0, bites: 0, x: 0, y: 0 };
const _tyWave = { start: -10000, x: 0, y: 0 };
const _tyImpacts = Array.from({ length: 32 }, () => ({ active: false, x: 0, y: 0, at: 0, angle: 0, kind: 0 }));
const _tySource = { damage: 0, percentDamage: 0, isPiercing: true, _statSrc: '', _noHitSfx: true, _noBase60: true };

function _tyReset() {
    for (let i = 0; i < enemies.length; i++) { enemies[i]._tySlowEnd = 0; enemies[i]._tyLiftMs = 0; enemies[i]._tySerpentKill = false; }
    window._tyClock = 0; window._tyCharge = 0; window._tySpeedEnd = 0;
    window._tySwarmEnd = 0; window._tySwarmLimit = 0;
    window._tyFangStacks = 0; window._tyLastBite = -10000; window._tyDecayStacks = 0;
    _tyArray.active = false; _tyShield.state = 0; _tyShield.bites = 0; _tyWave.start = -10000;
    for (let i = 0; i < 32; i++) _tyImpacts[i].active = false;
    for (let i = 0; i < _tySerpents.length; i++) {
        const s = _tySerpents[i]; s.active = false; s.target = null; s.state = 0; s.chain = 0; s.absorbAt = -1;
    }
    for (let i = 0; i < 16; i++) _tyShards[i].active = false;
    for (let i = 0; i < 4; i++) {
        const d = _tyDevours[i]; d.active = false; d.start = -10000; d.target = null; d.hitRefs.fill(null); d.hitCount = 0;
    }
}
_tyReset();

function _tyIsTarget(e) {
    return _isEnemyTargetable(e) && e.hp > 0 && !e._markedForDeath && !e._deathPhase && !e.dyingLaserPhase;
}

function _tyChargeFlame(amount) {
    if (!_hasBuff('hac_viem_phe_hon')) return;
    const before = window._tyCharge;
    window._tyCharge = Math.min(10000, before + amount);
    if (before < 10000 && window._tyCharge === 10000 && window.AudioMgr) window.AudioMgr.playSfx('ty-flame-full');
}

function _tyOnEnemyKill(e) {
    _tyChargeFlame(300);
    if (e._tySerpentKill && window._tySwarmEnd > window._tyClock) {
        window._tySwarmEnd = Math.min(window._tySwarmLimit, window._tySwarmEnd + 2000);
        _tyImpact(e.x, e.y, 2);
    }
    e._tySerpentKill = false;
}

function _tyDamage(e, atk, pct, label, serpent) {
    const before = window._matchStats ? window._matchStats.allyDamage[label] || 0 : 0;
    _tySource.damage = player.atk * atk; _tySource.percentDamage = pct;
    _tySource._statSrc = label;
    if (serpent) e._tySerpentKill = true;
    dealDamage(e, _tySource);
    if (serpent && e.hp > 0 && !e._deathPhase) e._tySerpentKill = false;
    const hit = window._matchStats && (window._matchStats.allyDamage[label] || 0) > before;
    if (hit && (serpent || label === 'Umbral Serpent: Devour')) _tyImpact(e.x, e.y, serpent ? 0 : 1);
    if (hit && label === 'Umbral Serpent: Shards') _tyImpact(e.x, e.y, 3);
    return hit;
}

function _tyImpact(x, y, kind) {
    for (let i = 0; i < 32; i++) {
        const f = _tyImpacts[i]; if (f.active) continue;
        f.active = true; f.x = x; f.y = y; f.kind = kind; f.at = window._tyClock;
        f.angle = (i * 2.4 + window._tyClock * 0.001) % (Math.PI * 2);
        return;
    }
}

function _tyDamageMult() {
    return _hasBuff('van_xa_trieu_tran') ? 1 + window._tyFangStacks * 0.01 : 1;
}

function _tyOnSerpentBite() {
    window._tyFangStacks = Math.min(40, window._tyFangStacks + 1);
    window._tyDecayStacks = window._tyFangStacks;
    window._tyLastBite = window._tyClock;
    _tyChargeFlame(300);
    if (_tyShield.state === 0 || _tyShield.state === 2) { if (++_tyShield.bites >= 12) _tyRestoreShield(); }
}

function _tyOnShipHit(e, source) {
    if ((source.type !== 'player_auto' && source.type !== 'player_charged') || !_tyIsTarget(e)) return;
    _tyDetonate(e);
}

function _tyDetonate(e) {
    if (!_hasBuff('hac_viem_phe_hon') || window._tyCharge < 10000 || !_tyIsTarget(e)) return false;
    let d = null;
    for (let i = 0; i < 4; i++) {
        const candidate = _tyDevours[i];
        if (!candidate.active && window._tyClock - candidate.start >= 1600) { d = candidate; break; }
    }
    if (!d) return false;
    window._tyCharge = 0;
    d.active = true; d.start = window._tyClock; d.nextBite = window._tyClock;
    d.bites = 0; d.target = e; d.x = e.x; d.y = e.y; d.hitCount = 0; d.hitRefs.fill(null);
    window._tySpeedEnd = window._tyClock + 1000;
    lastSkillD -= 1000; lastSkillS -= 1000;
    if (window.AudioMgr) window.AudioMgr.playSfxAt('ty-devour', e.x, e.y);
    return true;
}

function _tyNearest(x, y, radius, latch) {
    let best = null, distance = radius * radius;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!_tyIsTarget(e)) continue;
        if (latch) {
            let n = 0;
            for (let j = 0; j < _tySerpents.length; j++) if (_tySerpents[j].active && _tySerpents[j].target === e) n++;
            if (n >= 2) continue;
        }
        const dx = x - e.x, dy = y - e.y, ds = dx * dx + dy * dy;
        if (ds < distance) { best = e; distance = ds; }
    }
    return best;
}

function _tySpawnShards(d) {
    for (let i = 0, n = 0; i < 16 && n < 4; i++) {
        const s = _tyShards[i]; if (s.active) continue;
        const a = Math.PI * (0.25 + n * 0.5);
        s.active = true; s.x = d.x; s.y = d.y; s.angle = a;
        s.vx = Math.cos(a) * 560; s.vy = Math.sin(a) * 560;
        s.spawnTime = window._tyClock; s.burst = d; s.bit = 1 << n; n++;
    }
}

function _tyPickArrayCenter() {
    let found = false;
    for (let i = 0; i < enemies.length; i++) if (_tyIsTarget(enemies[i])) { found = true; break; }
    let bx = player.x, by = player.y;
    if (found) {
        let best = -1, bestHp = -1;
        const maxY = Math.max(80, player.y - 200);
        for (let y = 80; y <= maxY; y += 80) for (let x = 40; x < canvas.width; x += 80) {
            let count = 0, hp = 0;
            for (let i = 0; i < enemies.length; i++) {
                const e = enemies[i]; if (!_tyIsTarget(e)) continue;
                const dx = x - e.x, dy = y - e.y;
                if (dx * dx + dy * dy <= 170 * 170) { count++; hp += e.hp; }
            }
            if (count > best || (count === best && hp > bestHp)) { best = count; bestHp = hp; bx = x; by = y; }
        }
        bx = Math.max(Math.min(170, canvas.width / 2), Math.min(canvas.width - Math.min(170, canvas.width / 2), bx));
        by = Math.max(Math.min(170, canvas.height / 2), Math.min(canvas.height - Math.min(170, canvas.height / 2), by));
    }
    _tyArray.x = bx; _tyArray.y = by;
}

function _tyOpenArray() {
    if (!_hasBuff('van_xa_trieu_tran')) return false;
    _tyPickArrayCenter();
    _tyArray.active = true; _tyArray.start = window._tyClock;
    _tyArray.tick = 1; _tyArray.exploded = false;
    window._tySwarmEnd = window._tyClock + 1430 + 8000;
    window._tySwarmLimit = window._tyClock + 1430 + 12000;
    _tyRestoreShield();
    _tyWave.start = window._tyClock; _tyWave.x = player.x; _tyWave.y = player.y;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (_tyIsTarget(e) && !_isCCImmune(e) && !_capIsGoliath(e)
            && Math.hypot(e.x - player.x, e.y - player.y) <= 220) e._tySlowEnd = window._tyClock + 2000;
    }
    if (window.AudioMgr) window.AudioMgr.playSfxAt('ty-array-open', _tyArray.x, _tyArray.y);
    return true;
}

function _tySpawnSerpents(x, y) {
    for (let i = 0; i < _tySerpents.length; i++) {
        const s = _tySerpents[i]; s.active = true; s.x = x; s.y = y; s.target = null; s.spawnTime = window._tyClock;
        s.state = 0; s.chain = 0; s.absorbAt = -1;
        s.nextBite = window._tyClock + 300 + i * 35; s.biteFlashUntil = 0; s.angle = i * Math.PI * 2 / _tySerpents.length;
        s.segX.fill(x); s.segY.fill(y);
    }
    if (window.AudioMgr) window.AudioMgr.playSfxAt('ty-serpents-rise', x, y);
}

function _tyRestoreShield() {
    if (!_hasBuff('van_xa_trieu_tran') || window._tySwarmEnd <= window._tyClock) return;
    _tyShield.state = 3; _tyShield.stateTime = window._tyClock; _tyShield.bites = 0;
}

function _tyBlockHit(attacker) {
    if (!_hasBuff('van_xa_trieu_tran') || window._tySwarmEnd <= window._tyClock
        || (_tyShield.state !== 1 && _tyShield.state !== 3)) return false;
    _tyShield.state = 2; _tyShield.stateTime = window._tyClock; _tyShield.bites = 0;
    _tyShield.x = player.x; _tyShield.y = player.y;
    _tyShield.hitAngle = attacker && Number.isFinite(attacker.x) && Number.isFinite(attacker.y)
        ? Math.atan2(attacker.y - player.y, attacker.x - player.x) : -Math.PI / 2;
    if (window.AudioMgr) window.AudioMgr.playSfxAt('ty-scale-break', player.x, player.y);
    return true;
}

function _tyArrayDamage(atk, pct, burst) {
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!_tyIsTarget(e) || Math.hypot(e.x - _tyArray.x, e.y - _tyArray.y) > 170) continue;
        if (burst && !_capIsGoliath(e)) e._tyLiftMs = Math.max(e._tyLiftMs || 0, 1250);
        _tyDamage(e, atk, pct, 'Umbral Serpent: Array', false);
    }
}

function _tyBeginFrame(ms) {
    if (gameState !== 'playing' || gamePaused || window._sigilPicker || window._kanadeCutscene) return;
    if (!_hasBuff('hac_viem_phe_hon') && !_hasBuff('van_xa_trieu_tran')) {
        if (window._tyClock > 0) _tyReset();
        return;
    }
    window._tyClock += ms; const now = window._tyClock;
    for (let i = 0; i < 32; i++) if (now - _tyImpacts[i].at >= 420) _tyImpacts[i].active = false;
    if (now - window._tyLastBite > 2000) {
        window._tyFangStacks = Math.max(0, window._tyDecayStacks * (1 - (now - window._tyLastBite - 2000) / 1000));
    }
    _tyChargeFlame(ms);
    if (_tyShield.state === 3 && now - _tyShield.stateTime >= 420) _tyShield.state = 1;
    if (_tyShield.state === 2 && now - _tyShield.stateTime >= 480) _tyShield.state = 0;
    if (now >= window._tySwarmEnd) {
        _tyShield.state = 0;
        for (let i = 0; i < _tySerpents.length; i++) {
            const s = _tySerpents[i];
            if (!s.active || s.state === 3) continue;
            s.state = 3; s.target = null; s.biteFlashUntil = 0;
        }
    }
    if (_tyArray.active) {
        const age = now - _tyArray.start;
        while (_tyArray.tick <= 5 && age >= 180 + _tyArray.tick * 250) { _tyArrayDamage(0.20, 0, false); _tyArray.tick++; }
        // The pull is Dominant: CC Immune enemies are dragged too, only Goliath holds its ground.
        if (age >= 180 && age < 1430) for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i]; if (!_tyIsTarget(e) || _capIsGoliath(e)) continue;
            const dx = _tyArray.x - e.x, dy = _tyArray.y - e.y, d = Math.hypot(dx, dy);
            if (d > 4 && d <= 170) { const pull = Math.min(d - 4, ms * 0.18); e.x += dx / d * pull; e.y += dy / d * pull; }
        }
        if (age >= 1430 && !_tyArray.exploded) {
            _tyArray.exploded = true; _tyArrayDamage(3, 0.015, true);
            if (now < window._tySwarmEnd) _tySpawnSerpents(_tyArray.x, _tyArray.y);
            _setShake(_mobPerf ? 5 : 9, 300);
            if (window.AudioMgr) window.AudioMgr.playSfxAt('ty-array-burst', _tyArray.x, _tyArray.y);
        }
        if (age >= 1950) _tyArray.active = false;
    }
    for (let i = 0; i < 4; i++) {
        const d = _tyDevours[i]; if (!d.active) continue;
        while (d.bites < 4 && now >= d.nextBite) {
            if (!_tyIsTarget(d.target) || !enemies.includes(d.target)) d.target = _tyNearest(d.x, d.y, 160, false);
            if (!d.target) { d.active = false; break; }
            d.x = d.target.x; d.y = d.target.y;
            _tyDamage(d.target, 0.60, 0, 'Umbral Serpent: Devour', false);
            d.bites++; d.nextBite += 120;
            if (d.bites === 4) _tySpawnShards(d);
        }
        if (now - d.start > 560) d.active = false;
    }
    for (let i = 0; i < 16; i++) {
        const s = _tyShards[i]; if (!s.active) continue;
        if (now - s.spawnTime >= s.lifeMs) { s.active = false; continue; }
        const travelMs = Math.min(ms, now - s.spawnTime);
        const ax = s.x, ay = s.y; s.x += s.vx * travelMs / 1000; s.y += s.vy * travelMs / 1000;
        const vx = s.x - ax, vy = s.y - ay, len2 = vx * vx + vy * vy;
        for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j]; if (!_tyIsTarget(e)) continue;
            const t = len2 > 0 ? Math.max(0, Math.min(1, ((e.x - ax) * vx + (e.y - ay) * vy) / len2)) : 0;
            if (Math.hypot(e.x - ax - t * vx, e.y - ay - t * vy) > (e.size || 30) / 2 + 7) continue;
            const d = s.burst; let k = 0;
            while (k < d.hitCount && d.hitRefs[k] !== e) k++;
            if (k === d.hitCount) {
                if (k === 512) continue;
                d.hitRefs[k] = e; d.hitCounts[k] = 0; d.hitMasks[k] = 0; d.hitCount++;
            }
            if (d.hitMasks[k] & s.bit) continue;
            d.hitMasks[k] |= s.bit;
            _tyDamage(e, 0.45 * (d.hitCounts[k]++ ? 0.25 : 1), 0, 'Umbral Serpent: Shards', false);
        }
    }
    for (let i = 0; i < _tySerpents.length; i++) {
        const s = _tySerpents[i]; if (!s.active) continue;
        const travelMs = Math.min(ms, now - s.spawnTime);
        if (travelMs <= 0) continue;
        const returning = s.state === 3;
        if (!returning) {
            if (!_tyIsTarget(s.target) || !enemies.includes(s.target)) {
                // A frenzy cut short by a kill still waits the full 600ms from its last bite.
                if (s.chain > 0) s.nextBite += 600 - TY_SERPENT_FRENZY_GAP;
                s.target = null; s.chain = 0;
            }
            if (!s.target && now >= s.nextBite) s.target = _tyNearest(s.x, s.y, Infinity, true);
        }
        const orbit = now * 0.0019 * TY_SERPENT_SPEED_MULT + i * Math.PI * 2 / _tySerpents.length;
        const tx = returning ? player.x : s.target ? s.target.x : player.x + Math.cos(orbit) * (55 + i * 3);
        const ty = returning ? player.y : s.target ? s.target.y : player.y + Math.sin(orbit * 1.13) * 35;
        const dx = tx - s.x, dy = ty - s.y, dist = Math.hypot(dx, dy);
        s.angle = Math.atan2(dy, dx);
        if (!returning) s.state = s.target ? 2 : 0;
        const step = Math.min(dist, travelMs * (returning || s.target ? 0.72 : 0.38) * TY_SERPENT_SPEED_MULT);
        if (returning && (s.absorbAt >= 0 || dist <= step + 8)) {
            s.x = player.x; s.y = player.y;
            if (s.absorbAt < 0) s.absorbAt = now;
            if (now - s.absorbAt >= 160) { s.active = false; continue; }
        } else if (dist > 0) { s.x += dx / dist * step; s.y += dy / dist * step; }
        if (!returning && s.target && dist <= step + (s.target.size || 30) / 2 && now >= s.nextBite) {
            const hit = _tyDamage(s.target, 0.35, 0, 'Umbral Serpent: Serpents', true);
            if (s.chain === 0) s.chain = Math.random() < TY_SERPENT_FRENZY_CHANCE ? 3 : 1;
            if (--s.chain > 0) s.nextBite = now + TY_SERPENT_FRENZY_GAP;
            else { s.target = null; s.nextBite = now + 600; }
            s.biteFlashUntil = now + 100;
            if (hit) _tyOnSerpentBite();
            if (window.AudioMgr) window.AudioMgr.playSfxAt('ty-bite', s.x, s.y);
        }
        s.segX[0] = s.x; s.segY[0] = s.y;
        for (let j = 1; j < 10; j++) {
            const dx = s.segX[j] - s.segX[j - 1], dy = s.segY[j] - s.segY[j - 1];
            const a = (dx || dy ? Math.atan2(dy, dx) : s.angle + Math.PI)
                + Math.sin(now * 0.012 - j * 0.65 + i) * 0.12 * Math.min(1, travelMs / 16.67);
            s.segX[j] = s.segX[j - 1] + Math.cos(a) * 4;
            s.segY[j] = s.segY[j - 1] + Math.sin(a) * 4;
        }
    }
}
