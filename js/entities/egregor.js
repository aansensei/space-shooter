// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/entities/egregor.js — Egregor (Plump Parasite, Elite): spawn, rage
// stacks, Psychic Tempest, Null Slash. Extracted from entities.js. Must
// load after entities.js and before main.js.

// EGREGOR, Plump Parasite (Elite)
function spawnEgregor() {
    const size = 160;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    const hp = Math.ceil(Math.min(4750, 2200 + hpFromTime * 72) * 1.15 * _walpurgisHpMult()); // +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size,
        y: -size,
        size, speed: 0.8,
        hp, maxHp: hp, _baseMaxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'egregor',
        // Mind Link, rage stacks
        _rageStacks: 0,
        _rageEndTimes: [],
        // Psychic Tempest
        _tempestPhase: 'ready',
        _tempestTargets: [],
        _tempestCooldownEnd: performance.now() + 8000,
        _tempestPending: false,
        _tempestOriginX: 0, _tempestOriginY: 0,
        // Null Slash
        _nullSlashPhase: 'ready',
        _nullSlashCooldownEnd: performance.now() + 3000,
        _nullSlashWindupTimer: 0,
        _nullSlashWindupDur: 3000,
        _nullSlashStrikeTimer: 0,
        _nullSlashAngle: 0,
        _nullSlashTargetX: 0,
        _nullSlashTargetY: 0,
        _nullSlashDmgDealt: false,
        _nullSlashTentPts: null,
        _nullSlashOriginX: 0,
        _nullSlashOriginY: 0,
        _dimBreakZoneSpawned: false,
        // Collective Mind tentacles
        _tentacleHps: null,   // initialized in updateEgregor on first tick
        _tentaclesLost: 0,
        // Visual
        _tentacles: null,
        _eyeBlinkTimers: [0, 0, 0, 0],
        _eyeNextBlinks: [2000, 2800, 1500, 3500],
    });
}

function updateEgregor(enemy, deltaTime) {
    const now = performance.now();
    const dt = deltaTime / 16.67;

    // Signature-monster crawl texture: two alternating one-shots cross-started
    // by AudioMgr so the loop never has a silent gap. startEgregorCrawl is a
    // no-op once already running; stopped from main.js when no Egregor remains.
    if (window.AudioMgr) {
        window.AudioMgr.startEgregorCrawl();
        window.AudioMgr.tickEgregorCrawl();
    }

    // Collective Mind, init tentacle HP pools on first tick
    if (!enemy._tentacleHps) {
        const tentHP = Math.ceil(enemy.maxHp * 0.80);
        enemy._tentacleHps = Array(10).fill(tentHP);
        enemy._tentaclesLost = 0;
    }
    // Sync lost count (source of truth: tentacleHps)
    enemy._tentaclesLost = enemy._tentacleHps.filter(hp => hp <= 0).length;

    // Rage stack decay (before movement so multipliers are current this frame)
    enemy._rageEndTimes = (enemy._rageEndTimes || []).filter(t => t > now);
    enemy._rageStacks = enemy._rageEndTimes.length;

    // Speed bonus from rage (+18% move speed per stack)
    const _speedMult = 1 + enemy._rageStacks * 0.18;
    // Rage active: Tempest 15% faster (flat bonus only)
    const _rageOn = (enemy._rageStacks > 0);
    const _tempestCD = 4000 * (_rageOn ? 0.85 : 1.0);

    // Move at 10% speed during NullSlash windup, full speed otherwise
    const _nsMoveMult = (enemy._nullSlashPhase === 'charging') ? 0.10 : 1.0;
    enemy.y += enemy.speed * _speedMult * _nsMoveMult * dt;
    if (enemy.x < enemy.size) enemy.x = enemy.size;
    if (enemy.x > canvas.width - enemy.size) enemy.x = canvas.width - enemy.size;

    _updateEgregorTempest(enemy, deltaTime, now, _tempestCD);
    _updateEgregorNullSlash(enemy, deltaTime, now);

    // Player body collision, 1.5s cooldown prevents per-frame life drain
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.hitRadius) {
        if (now >= (enemy._bodyHitCooldownEnd || 0)) {
            playerTakesHit(enemy);
            enemy._bodyHitCooldownEnd = now + 1500;
        }
    }
}

function _updateEgregorTempest(enemy, deltaTime, now, cooldown) {
    if (enemy._tempestPhase === 'ready') {
        if (now >= (enemy._tempestCooldownEnd || 0)) {
            const pool = _shuffleArray([player, ...sentinels]);
            const count = Math.min(3, pool.length);
            enemy._tempestTargets = [];
            for (let i = 0; i < count; i++) {
                enemy._tempestTargets.push({
                    target: pool[i],
                    tx: pool[i].x, ty: pool[i].y,
                    countdown: 1200, strikeLife: 0, strikeMaxLife: 700,
                    struck: false, _mainBolt: null, _outerBolt: null, _thinBolt: null,
                });
            }
            if (enemy._tempestTargets.length > 0) {
                enemy._tempestPhase = 'telegraphing';
                // Origin between gills (L2D gill center at y+25*sc from body center)
                const _gillSc = (enemy.size / 2) / 110;
                enemy._tempestOriginX = enemy.x;
                enemy._tempestOriginY = enemy.y + 25 * _gillSc;
            }
        }
        return;
    }

    if (enemy._tempestPhase === 'telegraphing') {
        // Rage: countdown expires 15% faster
        const _tempestTickMult = ((enemy._rageStacks || 0) > 0) ? (1 / 0.85) : 1.0;
        let allDone = true;
        for (const t of enemy._tempestTargets) {
            t.countdown -= deltaTime * _tempestTickMult;
            // No tracking: tx/ty are locked at targeting moment
            if (t.countdown > 0) allDone = false;
        }
        if (allDone) {
            const ox = enemy._tempestOriginX, oy = enemy._tempestOriginY;
            // Muzzle burst from gill area
            addExplosion(ox, oy, 65, '#8800cc');
            createParticles(ox, oy, 22, '#cc44ff', 4, 10);
            if (window.AudioMgr) window.AudioMgr.playSfxAt('egregor-tempest-strike', ox, oy);
            let _playerHit = false;
            const _hitSentinels = new Set();
            for (const t of enemy._tempestTargets) {
                t.struck = true; t.strikeLife = 700;
                t._mainBolt  = _egregorGenBolt(ox, oy, t.tx, t.ty, 16, 32);
                t._outerBolt = _egregorGenBolt(ox, oy, t.tx, t.ty, 12, 48);
                t._thinBolt  = _egregorGenBolt(ox, oy, t.tx, t.ty,  8, 18);
                t._branchA   = _egregorGenBolt(ox, oy, t.tx, t.ty, 10, 38);
                // Damage (radius 100px), player and each sentinel hit at most once per cast
                if (!_playerHit && Math.hypot(player.x - t.tx, player.y - t.ty) < 100) {
                    if (!_yuushaPierceRedirect(0.20, false)) playerTakesHit(enemy);
                    _playerHit = true;
                }
                for (const s of sentinels) {
                    if (!_hitSentinels.has(s) && Math.hypot(s.x - t.tx, s.y - t.ty) < 100) {
                        dealDamage(s, { damage: Math.ceil(s.maxHp * 0.20), isTrueDamage: false, _noHitSfx: true, _attackerType: 'egregor' });
                        _hitSentinels.add(s);
                    }
                }
            }
            enemy._tempestPhase = 'striking';
        }
        return;
    }

    if (enemy._tempestPhase === 'striking') {
        let anyAlive = false;
        for (const t of enemy._tempestTargets) {
            if (t.struck && t.strikeLife > 0) { t.strikeLife -= deltaTime; if (t.strikeLife > 0) anyAlive = true; }
        }
        if (!anyAlive) {
            enemy._tempestPhase = 'ready';
            enemy._tempestCooldownEnd = now + cooldown;
            enemy._tempestTargets = [];
        }
    }
}

function _egregorGenBolt(x1, y1, x2, y2, detail, jitter) {
    const pts = [{ x: x1, y: y1 }];
    const dx = x2 - x1, dy = y2 - y1;
    for (let i = 1; i < detail; i++) {
        const t = i / detail;
        const s = Math.sin(t * Math.PI);
        pts.push({ x: x1 + dx * t + (Math.random() - 0.5) * jitter * 2 * s, y: y1 + dy * t + (Math.random() - 0.5) * jitter * 2 * s });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
}

// Fire pending Tempest immediately (called when Egregor dies mid-telegraph)
function _forceFireEgregorTempest(enemy) {
    if (enemy._tempestPhase !== 'telegraphing' || !enemy._tempestTargets.length) return;
    const ox = enemy._tempestOriginX, oy = enemy._tempestOriginY;
    addExplosion(ox, oy, 65, '#8800cc');
    createParticles(ox, oy, 22, '#cc44ff', 4, 10);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('egregor-tempest-strike', ox, oy);
    let _playerHit = false;
    const _hitSentinels = new Set();
    for (const t of enemy._tempestTargets) {
        t.struck = true; t.strikeLife = 700;
        t._mainBolt  = _egregorGenBolt(ox, oy, t.tx, t.ty, 16, 32);
        t._outerBolt = _egregorGenBolt(ox, oy, t.tx, t.ty, 12, 48);
        t._thinBolt  = _egregorGenBolt(ox, oy, t.tx, t.ty,  8, 18);
        t._branchA   = _egregorGenBolt(ox, oy, t.tx, t.ty, 10, 38);
        if (!_playerHit && Math.hypot(player.x - t.tx, player.y - t.ty) < 100) {
            if (!_yuushaPierceRedirect(0.20, false)) playerTakesHit(enemy);
            _playerHit = true;
        }
        for (const s of sentinels) {
            if (!_hitSentinels.has(s) && Math.hypot(s.x - t.tx, s.y - t.ty) < 100) {
                dealDamage(s, { damage: Math.ceil(s.maxHp * 0.20), isTrueDamage: false, _noHitSfx: true, _attackerType: 'egregor' });
                _hitSentinels.add(s);
            }
        }
    }
    enemy._tempestPhase = 'striking';
}

function _updateEgregorNullSlash(enemy, deltaTime, now) {
    if (enemy._nullSlashPhase === 'ready') {
        if (now >= (enemy._nullSlashCooldownEnd || 0)) {
            enemy._nullSlashPhase = 'charging';
            enemy._nullSlashWindupTimer = 0;
            // Windup: base 3s (no rage) / 2.5s (rage active), −0.35s per stack, min 1s
            const _nsBase = ((enemy._rageStacks || 0) > 0) ? 2500 : 3000;
            enemy._nullSlashWindupDur = Math.max(1000, _nsBase - (enemy._rageStacks || 0) * 350);
            enemy._boonBaneVessel = 250;
            enemy._boonBaneVesselTotal = 0;
            enemy._nullSlashTentPts = null;
            // Windup drone plays at natural pace and is cut short below the
            // instant the strike begins, so its length always tracks the
            // actual (rage-shortened) windup rather than a fixed duration.
            if (window.AudioMgr) window.AudioMgr.startNullSlashWindup();
        }
        return;
    }

    if (enemy._nullSlashPhase === 'charging') {
        // Track player continuously during windup, lock angle+target only at the moment of release
        enemy._nullSlashAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy._nullSlashTargetX = player.x;
        enemy._nullSlashTargetY = player.y;

        enemy._nullSlashWindupTimer += deltaTime;
        if (enemy._nullSlashWindupTimer >= enemy._nullSlashWindupDur) {
            enemy._nullSlashPhase = 'striking';
            enemy._nullSlashStrikeTimer = 0;
            enemy._nullSlashDmgDealt = false;
            enemy._nullSlashOriginX = enemy.x;
            enemy._nullSlashOriginY = enemy.y;
            enemy._dimBreakZoneSpawned = false;
            if (window.AudioMgr) {
                window.AudioMgr.stopNullSlashWindup();
                window.AudioMgr.playSfxAt('egregor-nullslash-slash', enemy.x, enemy.y);
            }
        }
        return;
    }

    if (enemy._nullSlashPhase === 'striking') {
        enemy._nullSlashStrikeTimer += deltaTime;

        // Damage check at 460ms, arc tip crosses target at sweep midpoint
        if (!enemy._nullSlashDmgDealt && enemy._nullSlashStrikeTimer >= 460) {
            enemy._nullSlashDmgDealt = true;
            const sx = enemy._nullSlashTargetX, sy = enemy._nullSlashTargetY;
            const _ex = enemy.x, _ey = enemy.y;
            const _nsAng = enemy._nullSlashAngle;
            const _arcR = Math.hypot(sx - _ex, sy - _ey) + (enemy._rageStacks || 0) * 5;
            // Hit: inside the 180° sweep sector, within arcR+100px of Egregor
            const _inSlash = (tx, ty) => {
                if (Math.hypot(tx - _ex, ty - _ey) > _arcR + 100) return false;
                let dA = Math.atan2(ty - _ey, tx - _ex) - _nsAng;
                while (dA > Math.PI) dA -= 2 * Math.PI;
                while (dA < -Math.PI) dA += 2 * Math.PI;
                return Math.abs(dA) <= Math.PI / 2;
            };

            let _nsHitLanded = false;

            // Player hit
            if (_inSlash(player.x, player.y)) {
                if (typeof skillShiftActive !== 'undefined' && skillShiftActive) {
                    _triggerAccurateParry(); // Yog-Sothoth dodge, no life, no slow
                } else {
                    // Slow 50% for 1.5s, NO life loss
                    player._nullSlashSlowed = true;
                    player._nullSlashSlowEnd = now + 1500;
                    addExplosion(player.x, player.y, 90, '#6600cc');
                    createParticles(player.x, player.y, 25, '#aa44ff', 3, 10);
                    _setShake(12, 350);
                    _nsHitLanded = true;
                }
            }

            // Sentinel hits, all sentinels inside the arc sector
            const hitSents = sentinels.filter(s => _inSlash(s.x, s.y));
            const hc = hitSents.length;
            if (hc > 0) {
                const pct = hc === 1 ? 0.30 : hc === 2 ? 0.35 : 0.40;
                // Rage bonus: +5% per stack, max +25%
                const _nsRageMult = 1 + Math.min(0.30, Math.min(5, enemy._rageStacks || 0) * 0.06);
                for (const s of hitSents) {
                    dealDamage(s, { damage: Math.ceil(s.maxHp * pct * _nsRageMult), isTrueDamage: true, _noHitSfx: true, _attackerType: 'egregor' });
                    addExplosion(s.x, s.y, 65, '#7700dd');
                    createParticles(s.x, s.y, 18, '#cc44ff', 3, 7);
                }
                addExplosion(sx, sy, 140, '#5500bb');
                createParticles(sx, sy, 35, '#9933ff', 5, 14);
                createParticles(sx, sy, 15, '#ffffff', 4, 10);
                _setShake(14, 400);
                _nsHitLanded = true;
            }

            if (_nsHitLanded && window.AudioMgr) window.AudioMgr.playSfxAt('egregor-nullslash-hit', sx, sy);
        }

        // Spawn Dimension Break zone at start of retract (720ms) — independent world object
        if (!enemy._dimBreakZoneSpawned && enemy._nullSlashStrikeTimer >= 720) {
            enemy._dimBreakZoneSpawned = true;
            const ox = enemy._nullSlashOriginX, oy = enemy._nullSlashOriginY;
            const _dbArcR = Math.hypot(enemy._nullSlashTargetX - ox, enemy._nullSlashTargetY - oy)
                          + (enemy._rageStacks || 0) * 5;
            if (!window._dimBreakZones) window._dimBreakZones = [];
            window._dimBreakZones.push({
                cx: ox, cy: oy,
                arcR: _dbArcR,
                angle: enemy._nullSlashAngle,
                arcStart: enemy._nullSlashAngle - Math.PI / 2,
                spawnAt: now,
                expireAt: now + 1000
            });
            if (window.AudioMgr) window.AudioMgr.playSfxAt('dimension-break', ox, oy);
        }

        // Strike animation: 950ms (EXTEND 200 + SWEEP 520 + RETRACT 230)
        if (enemy._nullSlashStrikeTimer >= 950) {
            // Boon and Bane backlash: 50% of total accumulated in the Vessel, cap 40% MaxHP, bypasses all
            if ((enemy._boonBaneVesselTotal || 0) > 0) {
                const _backDmg = Math.min(
                    Math.ceil(enemy._boonBaneVesselTotal * 0.50),
                    Math.ceil(enemy.maxHp * 0.40)
                );
                dealDamage(enemy, { damage: _backDmg, isTrueDamage: true, _boonBaneBacklash: true, _noBase60: true });
                addExplosion(enemy.x, enemy.y, enemy.size * 0.7, '#cc00cc');
                createParticles(enemy.x, enemy.y, 22, '#880088', 3, 9);
                enemy._boonBaneVessel = 0;
                enemy._boonBaneVesselTotal = 0;
            }
            enemy._nullSlashPhase = 'ready';
            enemy._nullSlashCooldownEnd = now + 3500; // 3.5s CD
            enemy._nullSlashTentPts = null;
        }
    }
}
