// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// js/entities/sentinel.js — real Sentinel lifecycle (spawn, death, per-frame
// AI/fire loop). Extracted from entities.js. Must load after entities.js
// (uses its shared dealDamage/particle/targeting helpers) and before main.js.

function spawnSentinel(x, y, forceNormal = false) {
    for (let i = 0; i < 3; i++) {
        const _sr = _acquireParticle();
        _sr.isSummonRing = true; _sr.x = x; _sr.y = y;
        _sr.lifetime = 500; _sr.maxLifetime = 500; _sr.radius = i * 20;
        particles.push(_sr);
    }
    createParticles(x, y, 30, '#00FFFF', 2, 8);
    if (typeof _spearImpact === 'function') _spearImpact(x, y, true, '#7ff4ff', true);

    if (sentinels.length >= MAX_SENTINELS) {
        // BUG I fix: silent eviction, no explosion when at capacity
        sentinels.sort((a, b) => a.hp - b.hp);
        sentinels.splice(0, 1);
    }

    let currentTier = (sentinels.length + 1 >= 12) ? 3 : ((sentinels.length + 1 >= 5) ? 2 : 1);
    // Base HP tăng dần theo thời gian: 300 → 450 trong 5 phút đầu
    const hpScale = Math.min(1, gameElapsedTime / 300000); // 0→1 trong 5 phút
    const baseHpMin = 300, baseHpMax = 450;
    const baseHp = Math.round(baseHpMin + hpScale * (baseHpMax - baseHpMin));
    // Tier 1: base scaling, Tier 2-3: 299 fixed (herd mentality override)
    let initialMaxHp = (currentTier === 1) ? Math.max(389, baseHp) : 299;

    // 36% cơ hội sentinel có HP cao hơn 50%
    const isFortified = !forceNormal && Math.random() < 0.36;
    if (isFortified) {
        initialMaxHp = Math.ceil(initialMaxHp * 1.5);
    }

    sentinels.push({
        x, y, hp: initialMaxHp, maxHp: initialMaxHp, angle: -Math.PI / 2, shootTimer: 0,
        // shotsFiredSinceSpecial is only a marker the damage code uses to recognise a Sentinel
        target: null, size: 15, shotsFiredSinceSpecial: 0, _spearCd: 900 + Math.random() * 1600,
        absoluteShield: false,
        synergyTier: currentTier,
        isFortified
    });
    if (window.AudioMgr) window.AudioMgr.playSfxAt('sentinel-spawn', x, y);

    // Gaia Protection catch-up for late-spawned sentinels
    const _gaiaHpCumMult = window._gaiaHpCumMult || 1;
    if (_gaiaHpCumMult > 1) {
        const _ns = sentinels[sentinels.length - 1];
        _ns.maxHp = Math.ceil(_ns.maxHp * _gaiaHpCumMult);
        _ns.hp = _ns.maxHp;
    }

}

function destroySentinel(sentinel) {
    if (typeof _ammitHoard === 'function') _ammitHoard(sentinel.x, sentinel.y, null);
    addExplosion(sentinel.x, sentinel.y, 80, '#00FFFF');
    if (typeof _spearImpact === 'function') _spearImpact(sentinel.x, sentinel.y, true, sentinels.length >= 12 ? '#ffe39a' : '#7ff4ff', true);
    _setShake(5, 200);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('sentinel-explode', sentinel.x, sentinel.y);
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 / 10) * i;
        bullets.push({
            x: sentinel.x, y: sentinel.y,
            vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
            damage: 0.0023 * player.atk, size: 6, type: 'sentinel_death'
        });
    }
}

// Each Sentinel charges a golden spear every 2.5s. With a full swarm of twelve, every 12s all of them throw a spear at the
// strongest enemy at once after a short lock on.
const SENTINEL_SPEAR_CD = 2500;
const SENTINEL_SPEAR_DMG = 0.15;
const SENTINEL_VOLLEY_INTERVAL = 12000;
const SENTINEL_VOLLEY_LOCK = 500;
window._sentinelVolley = { timer: 0, phase: 'idle', lockLeft: 0, target: null, firedAt: -1e9 };

// Nearest enemy that no other spear has claimed in the last 1.4s, so a swarm spreads out instead of piling onto one target.
function _pickSpearTarget(s, now) {
    let best = null, bestD = Infinity, fallback = null, fallbackD = Infinity;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!_isEnemyTargetable(e)) continue;
        const d = Math.hypot(e.x - s.x, e.y - s.y);
        if (d < fallbackD) { fallback = e; fallbackD = d; }
        if ((e._spearClaimUntil || 0) <= now && d < bestD) { best = e; bestD = d; }
    }
    const t = best || fallback;
    if (t) t._spearClaimUntil = now + 1400;
    return t;
}

function _pickVolleyTarget() {
    let best = null, bestHp = -1;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!_isEnemyTargetable(e) || !(e.hp > 0)) continue;
        // Goliath only counts as a last resort, since spears barely hurt it
        const v = (e.hp + (e.shield || 0)) * (e.type === 'goliath' ? 0.001 : 1);
        if (v > bestHp) { best = e; bestHp = v; }
    }
    return best;
}

// Nearest enemy within reach that this spear has not pierced yet
function _spearNextTarget(b) {
    let best = null, bestD = 520;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!_isEnemyTargetable(e) || !(e.hp > 0) || b._hitList.indexOf(e) !== -1) continue;
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < bestD) { best = e; bestD = d; }
    }
    return best;
}

function _launchSentinelSpear(sentinel, target, volley, dmgMult, speedMul) {
    const full = sentinels.length >= 12;
    const angle = Math.atan2(target.y - sentinel.y, target.x - sentinel.x);
    bullets.push({
        x: sentinel.x + Math.cos(angle) * sentinel.size, y: sentinel.y + Math.sin(angle) * sentinel.size,
        damage: SENTINEL_SPEAR_DMG * player.atk * dmgMult * (1 + (sentinel._blessingDmg || 0)), size: 30, type: 'sentinel_special',
        target, speedMultiplier: speedMul, sourceSentinel: sentinel, _isSentinelBullet: true, _heading: angle,
        _spear: true, _volley: volley, _through: full ? 4 : 3, _hitList: [], _healPct: full ? 0.03 : 0.02
    });
    sentinel._lastSpearAt = performance.now();
    createParticles(sentinel.x + Math.cos(angle) * (sentinel.size + 6), sentinel.y + Math.sin(angle) * (sentinel.size + 6), volley ? 10 : 6, '#ffd36a', 2, volley ? 9 : 6);
}

function updateSentinels(deltaTime) {
    let activeCount = sentinels.length;
    // one shot every 83.3ms: the spear is its own cooldown attack, so the plain shots no longer cover its slot
    let sentinelFireRate = 83.3;
    let damageMultiplier = 1.0;

    if (_hasBuff('lai_kep') && (window._laiKepFireRateBonus || 0) > 0) {
        sentinelFireRate /= (1 + window._laiKepFireRateBonus);
    }

    if (_hasBuff('trieu_hoi')) {
        const _tNow = performance.now();
        for (const s of sentinels) {
            // docs/combat-scaling-rebalance.md Part 3: 2.5% T/s x1.20 = 3% T/s
            s.hp = Math.min(s.maxHp, s.hp + (s.maxHp * 0.025 / 1000) * deltaTime * 1.20);
            if (!s._trieuIronBody && _tNow >= (s._trieuIronBodyCooldownEnd || 0)) {
                s._trieuIronBody = true;
            }
        }
    }

    let isTier1 = activeCount < 5;
    let isTier2 = activeCount >= 5 && activeCount < 12;
    let isTier3 = activeCount >= 12;

    // Tier 1: +10% bullet speed (added below via herdSpeedBonus)
    const herdSpeedBonus = isTier1 ? 1.10 : 1.0;

    if (activeCount >= 5) {
        sentinelFireRate /= 1.20;
        damageMultiplier = 1.10;
    }

    if (gloryForJusticeActive) {
        sentinelFireRate /= 1.20;
    }

    let spearRate = 1;
    if (_hasBuff('lai_kep') && (window._laiKepFireRateBonus || 0) > 0) spearRate *= 1 + window._laiKepFireRateBonus;
    if (gloryForJusticeActive) spearRate *= 1.2;
    const nowMs = performance.now(), spearSpeed = (gloryForJusticeActive ? 1.25 : 1) * herdSpeedBonus;

    // the twelve Sentinel volley: lock on to the strongest enemy, then every Sentinel throws a spear at it together
    const vol = window._sentinelVolley;
    if (activeCount >= 12) {
        if (vol.phase === 'idle') {
            vol.timer += deltaTime;
            if (vol.timer >= SENTINEL_VOLLEY_INTERVAL - SENTINEL_VOLLEY_LOCK) {
                const t = _pickVolleyTarget();
                if (t) { vol.phase = 'lock'; vol.lockLeft = SENTINEL_VOLLEY_LOCK; vol.target = t; }
                else vol.timer = SENTINEL_VOLLEY_INTERVAL - SENTINEL_VOLLEY_LOCK - 700;
            }
        } else {
            vol.lockLeft -= deltaTime;
            if (!(vol.target && vol.target.hp > 0 && _isEnemyTargetable(vol.target) && enemies.includes(vol.target))) {
                const t = _pickVolleyTarget();
                if (t) vol.target = t; else { vol.phase = 'idle'; vol.timer = 0; vol.target = null; }
            }
            if (vol.phase === 'lock' && vol.lockLeft <= 0) {
                for (let i = 0; i < sentinels.length; i++) {
                    _launchSentinelSpear(sentinels[i], vol.target, true, damageMultiplier, 1.05 * spearSpeed);
                    sentinels[i]._spearCd = Math.max(sentinels[i]._spearCd, 1200);
                }
                _setShake(5, 260);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('charged-shot', vol.target.x, vol.target.y);
                vol.firedAt = nowMs; vol.phase = 'idle'; vol.timer = 0;
            }
        }
    } else { vol.timer = 0; vol.phase = 'idle'; vol.target = null; }

    for (let i = 0; i < sentinels.length; i++) {
        let s = sentinels[i];
        let newTier = isTier3 ? 3 : (isTier2 ? 2 : 1);
        if (s.synergyTier !== newTier) {
            let oldMax = s.maxHp;
            s.maxHp = (newTier === 1) ? 389 : 299;
            if (s.isFortified) s.maxHp = Math.ceil(s.maxHp * 1.5); // re-apply fortified bonus
            s.hp = Math.min(s.maxHp, s.hp * (s.maxHp / oldMax));
            s.synergyTier = newTier;
        }
    }

    for (let i = sentinels.length - 1; i >= 0; i--) {
        const sentinel = sentinels[i];
        sentinel.target = findClosestEnemy(sentinel.x, sentinel.y);

        if (sentinel.target) {
            const targetAngle = Math.atan2(sentinel.target.y - sentinel.y, sentinel.target.x - sentinel.x);
            let angleDiff = targetAngle - sentinel.angle;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            sentinel.angle += angleDiff * 0.1;
        }

        sentinel.shootTimer -= deltaTime;
        if (sentinel.shootTimer <= 0 && sentinel.target) {
            sentinel.shootTimer = sentinelFireRate;
            sentinel._lastFireTime = performance.now(); // drives the gun-arm recoil/muzzle-flash draw in fx.js
            const _bDR = sentinel._blessingDR || 0;
            const _hpCost = Math.max(0, 1 - _bDR); // Blessing: -15% cost
            sentinel.hp = Math.max(0, sentinel.hp - _hpCost);
            const angle = sentinel.angle;
            const speedMultiplier = (gloryForJusticeActive ? 1.25 : 1) * herdSpeedBonus;

            const _bDmg2 = 1 + (sentinel._blessingDmg || 0);
            bullets.push({
                x: sentinel.x + Math.cos(angle) * sentinel.size,
                y: sentinel.y + Math.sin(angle) * sentinel.size,
                vx: Math.cos(angle) * 10.8 * speedMultiplier, vy: Math.sin(angle) * 10.8 * speedMultiplier,
                damage: 0.0345 * player.atk * damageMultiplier * _bDmg2,
                size: 7.8, type: 'sentinel_auto',
                _isSentinelBullet: true,
            });
            const _mz = _acquireParticle(); _mz.x = sentinel.x + Math.cos(angle) * (sentinel.size + 5); _mz.y = sentinel.y + Math.sin(angle) * (sentinel.size + 5); _mz.lifetime = 100; _mz.maxLifetime = 100; _mz.size = 5; _mz.color = 'orange'; particles.push(_mz);
        }

        // the spear charges on its own clock and goes out as soon as there is a target, unless a volley is locking on
        if (sentinel._spearCd === undefined) sentinel._spearCd = 900;
        sentinel._spearCd -= deltaTime * spearRate;
        if (sentinel._spearCd <= 0) {
            if (sentinel.target && vol.phase !== 'lock') {
                const t = _pickSpearTarget(sentinel, nowMs);
                if (t) { _launchSentinelSpear(sentinel, t, false, damageMultiplier, spearSpeed); sentinel._spearCd = SENTINEL_SPEAR_CD; }
                else sentinel._spearCd = 200;
            } else sentinel._spearCd = 0;
        }

        if (sentinel.hp <= 0) {
            destroySentinel(sentinel);
            sentinels.splice(i, 1);
        }
    }
}
