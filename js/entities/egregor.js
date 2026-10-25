// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/entities/egregor.js — Egregor (Plump Parasite, Elite): spawn, rage
// stacks, Psychic Tempest, Null Slash. Extracted from entities.js. Must
// load after entities.js and before main.js.

// EGREGOR, Plump Parasite (Elite)
const _egregorTempestEchoes = new Array(24).fill(null);
let _egregorTempestEchoCursor = 0;
const _egregorTempestScars = new Float32Array(24 * 3);
let _egregorTempestScarCursor = 0;

// A fixed cosmetic draw count keeps target randomness stable across casts.
function _egregorTempestVisualSeed(t) {
    let phase = 0;
    for (let i = 0; i < 84; i++) phase += Math.random();
    t._vfxPhase = phase;
}

function _egregorTempestScar(t) {
    const i = _egregorTempestScarCursor * 3;
    _egregorTempestScars[i] = t.tx; _egregorTempestScars[i + 1] = t.ty; _egregorTempestScars[i + 2] = performance.now() + 700;
    _egregorTempestScarCursor = (_egregorTempestScarCursor + 1) % 24;
}

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
        _tentHitAt: new Float32Array(10),
        _tentLostAt: new Float32Array(10),
        _mindLinkFx: new Float32Array(8 * 3),
        _mindLinkCursor: 0,
        _visualRage: 0,
        _egSpawnAt: performance.now(),
        _spawnTime: performance.now() - 600,
        _eyeBlinkTimers: new Float32Array(4),
        _eyeNextBlinks: new Float32Array([2000, 2800, 1500, 3500]),
    });
    _enemySnapshotAtk(enemies[enemies.length - 1], 'egregor');
}

function updateEgregor(enemy, deltaTime) {
    const now = performance.now();
    const dt = deltaTime / 16.67;
    enemy._visualRage += ((enemy._rageStacks || 0) - enemy._visualRage) * Math.min(1, deltaTime / 350);
    if (Math.abs(enemy._visualRage - (enemy._rageStacks || 0)) < 0.01) enemy._visualRage = enemy._rageStacks || 0;

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
    const _phoneSpeedMul = window._deviceTier === 'phone' ? 0.88 : 1.0;
    const capX = enemy.x, capY = enemy.y;
    enemy.y += enemy.speed * _phoneSpeedMul * _speedMult * _nsMoveMult * dt;
    _capHoldBody(enemy, capX, capY);
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

function _egregorMindLinkVisual(enemy, x, y, now) {
    if (!enemy._mindLinkFx) return;
    const i = enemy._mindLinkCursor * 3;
    enemy._mindLinkFx[i] = x; enemy._mindLinkFx[i + 1] = y; enemy._mindLinkFx[i + 2] = now;
    enemy._mindLinkCursor = (enemy._mindLinkCursor + 1) % 8;
    enemy._ragePulseAt = now;
}

// Tempest sound cues fire from the cast timers so they stay in step with the strike. The -b and -c keys give each target its own voice.
const _TEMPEST_CUE_SUFFIX = ['', '-b', '-c'];
function _egregorTempestCue(name, enemy, t) {
    const a = window.AudioMgr; if (!a) return;
    const key = 'egregor-tempest-' + name + _TEMPEST_CUE_SUFFIX[Math.max(0, enemy._tempestTargets.indexOf(t)) % 3];
    if (t.target === player) a.playSfx(key); else a.playSfxAt(key, t.tx, t.ty);
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
                    struck: false, blocked: false, impact: false, rage: enemy._rageStacks || 0,
                });
            }
            if (enemy._tempestTargets.length > 0) {
                enemy._tempestPhase = 'telegraphing';
                enemy._tempestPlantPulse = false;
                // Origin between gills (L2D gill center at y+25*sc from body center)
                const _gillSc = (enemy.size / 2) / 110;
                enemy._tempestOriginX = enemy.x;
                enemy._tempestOriginY = enemy.y + 25 * _gillSc;
                enemy._tempestTentacle = enemy._tentacleHps ? enemy._tentacleHps.findIndex(hp => hp > 0) : 0;
                const plantAngle = enemy._tempestTentacle / 10 * Math.PI * 2;
                enemy._tempestPlantX = enemy.x + Math.cos(plantAngle) * enemy.size * 0.7;
                enemy._tempestPlantY = enemy.y + Math.sin(plantAngle) * enemy.size * 0.7 + enemy.size * 0.3;
                enemy._tempestVeinsCue = false;
                if (window.AudioMgr) window.AudioMgr.playSfxAt('egregor-tempest-plant', enemy._tempestPlantX, enemy._tempestPlantY);
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
            if (t.countdown > 0) {
                const elapsed = 1200 - t.countdown;
                if (!enemy._tempestVeinsCue && elapsed >= 80 && window.AudioMgr) {
                    enemy._tempestVeinsCue = true;
                    window.AudioMgr.playSfxAt('egregor-tempest-veins', enemy._tempestPlantX, enemy._tempestPlantY);
                }
                if (!t._cuePortal && elapsed >= 250 + enemy._tempestTargets.indexOf(t) * 120) { t._cuePortal = true; _egregorTempestCue('portal', enemy, t); }
                if (!t._cueWarn && t.countdown <= 300) { t._cueWarn = true; _egregorTempestCue('warn', enemy, t); }
            }
        }
        if (allDone) {
            const ox = enemy._tempestOriginX, oy = enemy._tempestOriginY;
            // The planted well releases the pressure pulse.
            addExplosion(enemy._tempestPlantX ?? ox, enemy._tempestPlantY ?? oy, 65, '#8800cc');
            createParticles(enemy._tempestPlantX ?? ox, enemy._tempestPlantY ?? oy, 22, '#cc44ff', 4, 10);
            let _playerHit = false;
            const _hitSentinels = new Set();
            for (const t of enemy._tempestTargets) {
                t.struck = true; t.strikeLife = 700;
                t.x = ox; t.y = oy; t.type = 'egregor'; t.ownerRef = enemy;
                _egregorTempestScar(t);
                _egregorTempestVisualSeed(t);
                t.blocked = _capShields(ox, oy, t.tx, t.ty, 'laser', enemy);
                _egregorTempestCue(t.blocked ? 'blocked' : 'burst', enemy, t);
                if (t.blocked) continue;
                // Damage (radius 100px), player and each sentinel hit at most once per cast
                if (!_playerHit && Math.hypot(player.x - t.tx, player.y - t.ty) < 100 && !_capBlocksSource(t, player) && !_capShields(t.tx, t.ty, player.x, player.y, 'area', enemy)) {
                    if (!_yuushaPierceRedirect(0.015 * _enemyHs(enemy), false, t)) playerTakesHit(enemy);
                    _playerHit = true;
                    t.impact = true;
                }
                for (const s of sentinels) {
                    if (!_hitSentinels.has(s) && Math.hypot(s.x - t.tx, s.y - t.ty) < 100 && !_capBlocksSource(t, s) && !_capShields(t.tx, t.ty, s.x, s.y, 'area', enemy)) {
                        // Own-Max-HP category (docs/combat-scaling-rebalance.md Part 2)
                        dealDamage(s, { damage: 0.015 * _enemyHs(enemy), isTrueDamage: false, _noHitSfx: true, _attackerType: 'egregor', _capSource: enemy });
                        _hitSentinels.add(s);
                        t.impact = true;
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
            if (t.struck && t.strikeLife > 0) {
                t.strikeLife -= deltaTime; if (t.strikeLife > 0) anyAlive = true;
                const since = 700 - t.strikeLife, slams = t._cueSlams || 0;
                if (!t.blocked && slams < 3 && since >= 60 + slams * 70) { t._cueSlams = slams + 1; _egregorTempestCue('slam', enemy, t); }
                if (!t._cueRetreat && since >= 450) { t._cueRetreat = true; _egregorTempestCue('retreat', enemy, t); }
            }
        }
        if (!anyAlive) {
            enemy._tempestPhase = 'ready';
            enemy._tempestCooldownEnd = now + cooldown;
            enemy._tempestTargets = [];
        }
    }
}

// Fire pending Tempest immediately (called when Egregor dies mid-telegraph)
function _forceFireEgregorTempest(enemy) {
    if (enemy._tempestPhase !== 'telegraphing' || !enemy._tempestTargets.length) return;
    const ox = enemy._tempestOriginX, oy = enemy._tempestOriginY;
    addExplosion(enemy._tempestPlantX ?? ox, enemy._tempestPlantY ?? oy, 65, '#8800cc');
    createParticles(enemy._tempestPlantX ?? ox, enemy._tempestPlantY ?? oy, 22, '#cc44ff', 4, 10);
    let _playerHit = false;
    const _hitSentinels = new Set();
    for (const t of enemy._tempestTargets) {
        t.struck = true; t.strikeLife = 700;
        t.x = ox; t.y = oy; t.type = 'egregor'; t.ownerRef = enemy;
        _egregorTempestScar(t);
        _egregorTempestVisualSeed(t);
        t._echoAt = performance.now();
        _egregorTempestEchoes[_egregorTempestEchoCursor] = t;
        _egregorTempestEchoCursor = (_egregorTempestEchoCursor + 1) % _egregorTempestEchoes.length;
        t.blocked = _capShields(ox, oy, t.tx, t.ty, 'laser', enemy);
                _egregorTempestCue(t.blocked ? 'blocked' : 'burst', enemy, t);
        if (t.blocked) continue;
        if (!_playerHit && Math.hypot(player.x - t.tx, player.y - t.ty) < 100 && !_capBlocksSource(t, player) && !_capShields(t.tx, t.ty, player.x, player.y, 'area', enemy)) {
            if (!_yuushaPierceRedirect(0.015 * _enemyHs(enemy), false, t)) playerTakesHit(enemy);
            _playerHit = true;
            t.impact = true;
        }
        for (const s of sentinels) {
            if (!_hitSentinels.has(s) && Math.hypot(s.x - t.tx, s.y - t.ty) < 100 && !_capBlocksSource(t, s) && !_capShields(t.tx, t.ty, s.x, s.y, 'area', enemy)) {
                dealDamage(s, { damage: 0.015 * _enemyHs(enemy), isTrueDamage: false, _noHitSfx: true, _attackerType: 'egregor', _capSource: enemy });
                _hitSentinels.add(s);
                t.impact = true;
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
            if (_inSlash(player.x, player.y) && !_capBlocksSource(enemy, player, 'debuff')) {
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
            const hitSents = sentinels.filter(s => _inSlash(s.x, s.y) && !_capBlocksSource(enemy, s));
            const hc = hitSents.length;
            if (hc > 0) {
                // Lost-HP/enrage category (docs/combat-scaling-rebalance.md
                // Part 2): coefficient scales with victim count, output then
                // rises the more of its own HP Egregor has already lost.
                const coeff = hc === 1 ? 1.50 : hc === 2 ? 1.75 : 2.00;
                const _nsDmg = coeff * enemy.atk * _enemyEnrageMult(enemy);
                for (const s of hitSents) {
                    dealDamage(s, { damage: _nsDmg, isTrueDamage: true, _noHitSfx: true, _attackerType: 'egregor', _capSource: enemy });
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
                cx: ox, cy: oy, ownerRef: enemy,
                arcR: _dbArcR,
                angle: enemy._nullSlashAngle,
                arcStart: enemy._nullSlashAngle - Math.PI / 2,
                spawnAt: now,
                expireAt: now + 1000,
                rage: enemy._rageStacks || 0,
                fxEnd: now + 1800
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
