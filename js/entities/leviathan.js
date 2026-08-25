// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/entities/leviathan.js — Leviathan (Dominator): spawn, Envy mark, All
// for One shield, Perseverance sweep, normal attack. Extracted from
// entities.js. Must load after entities.js and before main.js.

// LEVIATHAN, Dominator Class

function spawnLeviathan() {
    const baseSize = 25 + Math.random() * 5;
    const size = baseSize * 10;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.min(15435, 8820 + hpFromTime * 55);
    hp = Math.ceil(hp * 1.05 * 1.15 * _walpurgisHpMult()); // +15% global HP buff (stacks with Leviathan's own +5%)

    // Y = random 6-9 kills để trigger announcement Perseverance → vỡ khiên
    const killQuota = 10 + Math.floor(Math.random() * 11); // 10–20

    const lev = {
        x: Math.random() * (canvas.width - size * 2) + size,
        y: -size,
        size,
        speed: (1 + Math.random() * 0.5) * 0.8 * 0.85 * 0.85 * 1.3, // ~1.5 u/s
        hp, maxHp: hp,
        type: 'leviathan',
        shield: 0,
        isTargetedByA: false, hitBySkillF: false, laserHit: false,

        // All for One
        afoShieldActive: true,
        afoShieldBroken: false,
        afoKillCount: 0,
        afoKillQuota: killQuota,
        afoHitCount: 0,

        // Announcement sweep (quota met → one sweep → shield breaks)
        afoAnnouncePending: false, // quota just met, waiting to start charge
        afoAnnouncing: false,      // announcement sweep in progress

        // Perseverance (normal cycle after shield broken)
        perseveranceCharging: false,
        perseveranceChargeStart: 0,
        perseveranceFiring: false,
        perseveranceSweepOrigin: 0,
        perseveranceSweepStart: 0,
        perseveranceSweepProgress: 0,
        perseveranceSweepCurrent: null,
        perseveranceCooldown: 0,

        shootTimer: 750,
        shootInterval: 750,

        dyingLaserPhase: false,
        dyingLaserTimer: 0,
        dyingLaserFired: false,

        // Bulwark Barrier
        _levBarrierTimer: 0,
        _levBarrierLayers: 0,
        _levHalfHpTriggered: false,
    };
    enemies.push(lev);
    // Thủ Lĩnh Bầy Đàn: đánh dấu Envy lên tất cả enemy hiện có
    _applyLeviathanEnvy(lev);
}

function _ensureLeviathanQuota(lev) {
    const killable = enemies.filter(e =>
        e !== lev &&
        e.type !== 'leviathan' &&
        !e.type.startsWith('enemy_bullet') &&
        e.type !== 'abyssal_chain' &&
        e.type !== 'veilshroud_echo' &&
        !e.inCoronation
    ).length;
    const needed = lev.afoKillQuota - killable;
    for (let i = 0; i < needed; i++) spawnApostle();
}

function _applyLeviathanEnvy(lev) {
    enemies.forEach(e => {
        if (e === lev) return;
        if (e.type.startsWith('enemy_bullet') || e.type === 'embryo' || e.type === 'abyssal_chain') return;
        if (e.levEnvy) return; // already marked
        e.levEnvy = true;
        e.levEnvyLev = lev;
    });
}

function updateLeviathan(enemy, deltaTime) {
    const now = performance.now();

    // Đã die (hp=0 set bởi dealDamage) → skip, main loop sẽ splice
    if (enemy.hp <= 0) return;

    // MOVE DOWN
    enemy.y += enemy.speed * (deltaTime / 16.67);
    if (enemy.y > canvas.height + enemy.size) { enemy.hp = 0; return; }

    // Re-apply Envy to enemies that spawned after this Leviathan
    enemy._levEnvyRecheckTimer = (enemy._levEnvyRecheckTimer || 0) + deltaTime;
    if (enemy._levEnvyRecheckTimer >= 2500) {
        enemy._levEnvyRecheckTimer = 0;
        _applyLeviathanEnvy(enemy);
    }

    // Bulwark Barrier (passive): every 1s, if the shield hasn't reached its
    // cap of 2 layers, gain 1 more layer worth 1.2% MaxHP per on-screen
    // enemy (each layer individually capped at 25% MaxHP). Resets once the
    // shield is fully depleted so it builds back up from scratch.
    enemy._levBarrierTimer = (enemy._levBarrierTimer || 0) + deltaTime;
    if (enemy._levBarrierTimer >= 1000) {
        enemy._levBarrierTimer -= 1000;
        if ((enemy.shield || 0) <= 0) enemy._levBarrierLayers = 0;
        if ((enemy._levBarrierLayers || 0) < 2) {
            const _onScreenEnemies = enemies.filter(e =>
                e !== enemy && !e.type.startsWith('enemy_bullet') &&
                e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation
            ).length;
            const _levLayerVal = Math.min(enemy.maxHp * 0.25, enemy.maxHp * 0.012 * _onScreenEnemies);
            if (_levLayerVal > 0) {
                enemy.shield = (enemy.shield || 0) + _levLayerVal;
                _goliathTrackResourceGain(enemy, _levLayerVal);
                enemy._levBarrierLayers = (enemy._levBarrierLayers || 0) + 1;
                createParticles(enemy.x, enemy.y, 6, '#00e5ff', 2, 6);
            }
        }
    }

    // PHASE 2: ALL FOR ONE SHIELD
    if (enemy.afoShieldActive) {
        if (enemy.afoKillCount >= enemy.afoKillQuota && !enemy.afoAnnouncePending && !enemy.afoAnnouncing) {
            enemy.afoAnnouncePending = true;
            enemy.perseveranceCharging = true;
            enemy.perseveranceChargeStart = now;
        }

        if (enemy.afoAnnouncePending || enemy.afoAnnouncing) {
            if (enemy.perseveranceCharging) {
                if (now - enemy.perseveranceChargeStart >= 1000) {
                    enemy.perseveranceCharging = false;
                    enemy.afoAnnouncePending = false;
                    enemy.afoAnnouncing = true;
                    _spawnPerseveranceBeam(enemy, now);
                }
            }
            if (enemy.afoAnnouncing && !_hasPersBeam(enemy)) {
                // Sweep done → BREAK THE SHIELD
                enemy.afoAnnouncing = false;
                enemy.afoShieldActive = false;
                enemy.afoShieldBroken = true;
                // Grace period the instant the Iron Body shield breaks: 1s of
                // 90% DR plus a fresh barrier layer worth 50% Max HP (a shield
                // pool, absorbed like normal — not another Iron Body).
                enemy._afoBreakGraceEnd = now + 1000;
                enemy.shield = (enemy.shield || 0) + enemy.maxHp * 0.50;
                if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', enemy.x, enemy.y);
                addExplosion(enemy.x, enemy.y, enemy.size * 3, '#00e5ff');
                if (!window._levShieldBreaks) window._levShieldBreaks = [];
                window._levShieldBreaks.push({ x: enemy.x, y: enemy.y, size: enemy.size, spawnAt: now, duration: 700, _seed: Math.random() * Math.PI * 2 });
                for (let i = 0; i < 40; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const _sp = _acquireParticle();
                    _sp.x = enemy.x; _sp.y = enemy.y;
                    _sp.vx = Math.cos(a) * (3 + Math.random() * 8);
                    _sp.vy = Math.sin(a) * (3 + Math.random() * 8);
                    _sp.color = i % 2 === 0 ? '#00e5ff' : '#ffffff';
                    _sp.size = 4 + Math.random() * 5; _sp.lifetime = 800; _sp.maxLifetime = 800;
                    particles.push(_sp);
                }
                _setShake(15, 500);
                enemy.perseveranceCooldown = now + 2000;
                enemy.shootTimer = 750;
            }
        }

        if (enemy.afoShieldActive) return;
    }

    // PHASE 3: POST-SHIELD, PERSEVERANCE + ATTACK

    // Perseverance cycle
    if (enemy.perseveranceCharging) {
        if (now - enemy.perseveranceChargeStart >= 1000) {
            enemy.perseveranceCharging = false;
            _spawnPerseveranceBeam(enemy, now);
        }
    } else if (!_hasPersBeam(enemy) && enemy.afoShieldBroken) {
        if (now >= (enemy.perseveranceCooldown || 0)) {
            enemy.perseveranceCharging = true;
            enemy.perseveranceChargeStart = now;
        }
    }

    // Normal attack
    if (enemy.afoShieldBroken) {
        enemy.shootTimer -= deltaTime;
        if (enemy.shootTimer <= 0) {
            enemy.shootTimer = enemy.shootInterval;
            const targets = [...sentinels, player];
            let nearest = null, minDist = Infinity;
            targets.forEach(t => {
                const d = Math.hypot(t.x - enemy.x, t.y - enemy.y);
                if (d < minDist) { minDist = d; nearest = t; }
            });
            if (nearest) {
                const baseAngle = Math.atan2(nearest.y - enemy.y, nearest.x - enemy.x);
                for (let i = -1; i <= 1; i++) {
                    const a = baseAngle + i * 0.22;
                    const bulletHp = Math.ceil(enemy.maxHp * 0.02);
                    enemies.push({
                        x: enemy.x, y: enemy.y,
                        vx: Math.cos(a) * 5.5, vy: Math.sin(a) * 5.5,
                        hp: bulletHp, maxHp: bulletHp, size: 10,
                        type: 'enemy_bullet', isSplit: false, ownerRef: enemy
                    });
                }
            }
        }
    }
}

// Spawn Perseverance beam, quét 360° toàn bản đồ
function _spawnPerseveranceBeam(enemy, now) {
    if (!window._levPersBeams) window._levPersBeams = [];
    if (window.AudioMgr) window.AudioMgr.playSfxAt('leviathan-perseverance', enemy.x, enemy.y);
    window._levPersBeams.push({
        ox: enemy.x, oy: enemy.y,
        sweepOrigin: -Math.PI,        // bắt đầu từ -180°
        sweepStart: now,
        duration: 1800,               // 1.8s quét đủ 360°
        done: false,
        ownerRef: enemy,
        hitPlayer: false,
        hitSentinels: new Map()       // Map cho cooldown per-sentinel
    });
}

// Check xem enemy Lev có beam đang active không
function _hasPersBeam(enemy) {
    if (!window._levPersBeams) return false;
    return window._levPersBeams.some(b => b.ownerRef === enemy && !b.done);
}
