// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/entities-sentinel.js — real Sentinel lifecycle (spawn, death, per-frame
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
        target: null, size: 15, shotsFiredSinceSpecial: 0,
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
    addExplosion(sentinel.x, sentinel.y, 80, '#00FFFF');
    _setShake(5, 200);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('sentinel-explode', sentinel.x, sentinel.y);
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 / 10) * i;
        bullets.push({
            x: sentinel.x, y: sentinel.y,
            vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
            damage: 2, percentDamage: 0.02, size: 6, type: 'sentinel_death'
        });
    }
}

function updateSentinels(deltaTime) {
    let activeCount = sentinels.length;
    let sentinelFireRate = 62.5; // 75 / 1.2 (+20% fire rate)
    let damageMultiplier = 1.0;

    if (_hasBuff('lai_kep') && (window._laiKepFireRateBonus || 0) > 0) {
        sentinelFireRate /= (1 + window._laiKepFireRateBonus);
    }

    if (_hasBuff('trieu_hoi')) {
        const _tNow = performance.now();
        for (const s of sentinels) {
            s.hp = Math.min(s.maxHp, s.hp + (s.maxHp * 0.03 / 1000) * deltaTime * 1.30);
            if (!s._trieuIronBody && _tNow >= (s._trieuIronBodyCooldownEnd || 0)) {
                s._trieuIronBody = true;
            }
        }
    }

    let isTier1 = activeCount < 5;
    let isTier2 = activeCount >= 5 && activeCount < 12;
    let isTier3 = activeCount >= 12;
    let swarmSpecialForced = activeCount >= 12;

    // Tier 1: +10% bullet speed (added below via herdSpeedBonus)
    const herdSpeedBonus = isTier1 ? 1.10 : 1.0;

    if (activeCount >= 5) {
        sentinelFireRate /= 1.20;
        damageMultiplier = 1.10;
    }

    if (gloryForJusticeActive) {
        sentinelFireRate /= 1.20;
    }

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

            sentinel.shotsFiredSinceSpecial++;

            if (sentinel.shotsFiredSinceSpecial >= 4 || swarmSpecialForced) {
                sentinel.shotsFiredSinceSpecial = 0;

                const _bDmg = 1 + (sentinel._blessingDmg || 0);
                bullets.push({
                    x: sentinel.x + Math.cos(angle) * sentinel.size,
                    y: sentinel.y + Math.sin(angle) * sentinel.size,
                    damage: 50 * damageMultiplier * _bDmg, percentDamage: 0.03 * damageMultiplier * _bDmg, size: 30, type: 'sentinel_special',
                    target: sentinel.target, speedMultiplier: 1.12 * speedMultiplier,
                    sourceSentinel: sentinel, _isSentinelBullet: true
                });
            } else {
                const _bDmg2 = 1 + (sentinel._blessingDmg || 0);
                bullets.push({
                    x: sentinel.x + Math.cos(angle) * sentinel.size,
                    y: sentinel.y + Math.sin(angle) * sentinel.size,
                    vx: Math.cos(angle) * 10.8 * speedMultiplier, vy: Math.sin(angle) * 10.8 * speedMultiplier,
                    damage: 30 * damageMultiplier * _bDmg2,
                    percentDamage: 0.015 * damageMultiplier * _bDmg2,
                    size: 7.8, type: 'sentinel_auto',
                    _isSentinelBullet: true,
                });
                const _mz = _acquireParticle(); _mz.x = sentinel.x + Math.cos(angle) * (sentinel.size + 5); _mz.y = sentinel.y + Math.sin(angle) * (sentinel.size + 5); _mz.lifetime = 100; _mz.maxLifetime = 100; _mz.size = 5; _mz.color = 'orange'; particles.push(_mz);
            }
        }

        if (sentinel.hp <= 0) {
            destroySentinel(sentinel);
            sentinels.splice(i, 1);
        }
    }
}
