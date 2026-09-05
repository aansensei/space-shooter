// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/skill-s-spirit.js — split out of the old monolithic js/skills.js.
// Skill S: Remembrance Spirit, its own Photokrystos evolution, Photokrystos's
// boomerangs, the normal Spirit's Blade Arc/Spinner finale, and its plain
// bullets.

function activateSkillS() {
    const currentTime = performance.now();
    if (typeof player !== "undefined" && player._silenced) return;
    if (gameState !== "playing" || window._sigilPicker) return;

    // Primeval Creation: transform normal spirit → Phōtokrystos
    const normalSpirit = spirits.find(sp => !sp.isFinishing && !sp.isPhotokrystos);
    if (primevalEnergy >= 100 && normalSpirit) {
        activatePrimevalCreation(normalSpirit);
        return;
    }

    // Block while any spirit is alive (Phōtokrystos blocks until BTM ends)
    if (spirits.length > 0) return;

    // Normal summon: standard 12s CD only
    if (currentTime - lastSkillS >= skillSCooldown) {
        lastSkillS = currentTime;
        _checkMirrorLaserProc();
        primevalEnergy = 0; // Energy only accumulates from this new spirit
        spirits.push({
            x: player.x, y: player.y, shootTimer: 0,
            shotsFiredSinceBarrage: 0, duration: 35000,
            spawnGameTime: gameElapsedTime, isFinishing: false, finaleState: null,
            isPhotokrystos: false, volleyCount: 0,
        });
    }
}

function activatePrimevalCreation(spirit) {
    if (!spirit || spirit.isFinishing) return;
    primevalEnergy = 0;
    // Start summoning circle at spirit's position
    primevalSummonEffect = {
        x: spirit.x, y: spirit.y,
        timer: 0, phase: 'converge', // converge → flash → done
        targetSpirit: spirit,
    };
    // Brief invuln on spirit during summon
    spirit._summoningUp = true;
    if (window.AudioMgr) {
        window.AudioMgr.playSfxAt('photokrystos-summon-converge', spirit.x, spirit.y);
        // Holy overlay wraps the entire summon sequence (converge + flash)
        window.AudioMgr.playSfxAt('photokrystos-summon-holy', spirit.x, spirit.y);
    }
}

function updateSpirits(deltaTime) {
    // Update summoning effect
    if (primevalSummonEffect) updatePrimevalSummonEffect(deltaTime);

    for (let i = spirits.length - 1; i >= 0; i--) {
        const spirit = spirits[i];

        // Phōtokrystos branch
        if (spirit.isPhotokrystos) {
            updatePhotokrystos(spirit, deltaTime);
            if (spirit._done) spirits.splice(i, 1);
            continue;
        }

        // Normal spirit
        if (spirit.isFinishing) {
            updateSpiritFinale(spirit, deltaTime);
            if (!spirit.isFinishing) spirits.splice(i, 1);
            continue;
        }
        // Block transformation if summon effect hasn't finished
        if (spirit._summoningUp) continue;

        if (gameElapsedTime - spirit.spawnGameTime >= spirit.duration) {
            spirit.isFinishing = true; spirit.finaleState = 'moving';
            spirit.finaleTargetPos = { x: canvas.width / 2, y: canvas.height / 2 };
            // Reset energy, spirit entered finale without Primeval Creation
            primevalEnergy = 0;
            continue;
        }

        let t = performance.now() / 1000 + i * 5;
        spirit.x += (player.x + Math.cos(t * 2) * 72 - spirit.x) * 0.1;
        spirit.y += (player.y + Math.sin(t * 2) * 72 - spirit.y) * 0.1;

        spirit.shootTimer -= deltaTime;
        let spiritFireRate = 54.2;
        if (gloryForJusticeActive) spiritFireRate /= 1.20;
        if (_hasBuff('cuc_han')) spiritFireRate /= 1.30; // Arctic Chill: +30% fire rate

        if (spirit.shootTimer <= 0) {
            spirit.shootTimer = spiritFireRate;
            let closest = findClosestEnemy(spirit.x, spirit.y);
            if (closest) {
                const speedMultiplier = (gloryForJusticeActive ? 1.30 : 1) * 1.32;
                spiritBullets.push({
                    x: spirit.x, y: spirit.y,
                    damage: 120, percentDamage: 0.005,
                    size: 7.2, lifetime: 2000, target: closest, speedMultiplier: speedMultiplier,
                    isSpirit: true, _statSrc: 'Skill S: Remembrance Spirit',
                });
                if (window.AudioMgr) window.AudioMgr.playSfx('spirit-autofire');
                spirit.shotsFiredSinceBarrage++;
            }
        }

        if (spirit.shotsFiredSinceBarrage >= 5) {
            spirit.shotsFiredSinceBarrage = 0;
            let closest = findClosestEnemy(spirit.x, spirit.y);
            let vx = 0, vy = -15.84;
            if (closest) {
                const d = Math.hypot(closest.x - spirit.x, closest.y - spirit.y);
                vx = (closest.x - spirit.x) / d * 15.84;
                vy = (closest.y - spirit.y) / d * 15.84;
            }
            if (_hasBuff('song_luoi')) {
                const baseDmg = 180 * 1.60, basePct = 0.046 * 1.60;
                const speed = 15.84;
                const baseAngle = Math.atan2(vy, vx);
                const sideOff = 22;
                const px = -Math.sin(baseAngle) * sideOff, py = Math.cos(baseAngle) * sideOff;
                // First blade: immediate
                player._empowerFlashStart = performance.now(); player._empowerFlashEnd = player._empowerFlashStart + 320;
                bladeArcProjectiles.push({ x: spirit.x - px, y: spirit.y - py, vx: Math.cos(baseAngle) * speed, vy: Math.sin(baseAngle) * speed, radius: 125, damage: baseDmg, percentDamage: basePct, hitEnemies: [], isSpirit: true, isPiercing: true, _barrierPiercing: true });
                // Second blade (extra): 15ms delay, +20% radius to bypass Iron Body on same frame
                if (!window._pendingBlades) window._pendingBlades = [];
                window._pendingBlades.push({
                    spawnAt: performance.now() + 15,
                    data: { x: spirit.x + px, y: spirit.y + py, vx: Math.cos(baseAngle) * speed, vy: Math.sin(baseAngle) * speed, radius: 150, damage: baseDmg, percentDamage: basePct, hitEnemies: [], isSpirit: true, isPiercing: true, _barrierPiercing: true }
                });
                // Third blade: 25% chance, fires straight down the middle 30ms later
                if (Math.random() < 0.25) {
                    window._pendingBlades.push({
                        spawnAt: performance.now() + 30,
                        data: { x: spirit.x, y: spirit.y, vx: Math.cos(baseAngle) * speed, vy: Math.sin(baseAngle) * speed, radius: 150, damage: baseDmg, percentDamage: basePct, hitEnemies: [], isSpirit: true, isPiercing: true, _barrierPiercing: true }
                    });
                }
                if (window.AudioMgr) window.AudioMgr.playSfxAt('spirit-arc-slash', spirit.x, spirit.y);
            } else {
                player._empowerFlashStart = performance.now(); player._empowerFlashEnd = player._empowerFlashStart + 320;
                bladeArcProjectiles.push({ x: spirit.x, y: spirit.y, vx, vy, radius: 125, damage: 180, percentDamage: 0.046, hitEnemies: [], isSpirit: true, isPiercing: true, _barrierPiercing: true });
                if (window.AudioMgr) window.AudioMgr.playSfxAt('spirit-arc-slash', spirit.x, spirit.y);
            }
        }
    }
}

// PHŌTOKRYSTOS UPDATE
function updatePhotokrystos(spirit, deltaTime) {
    if (window.AudioMgr) window.AudioMgr.tickPhotokrystosIdle();
    const now = gameElapsedTime;
    const age = now - spirit.spawnGameTime;
    const BTM_START = 37000; // Back to Motherland at 37s
    const DURATION = 40000;  // total 40s

    // Danger? Not Today! (DNT)
    const DNT_CD          = 10000; // 10s cooldown
    const DNT_AIM_DUR     = 100;   // 100ms lock-on
    const DNT_FIRE_DUR    = 2000;  // 2s laser
    const DNT_PENALTY_DUR = 3000;  // 3s -20% dmg penalty
    const DNT_BEAM_HALF   = 22;    // beam half-width for hit detection

    // Only check trigger when BTM is NOT active
    if (!spirit._btmStarted && !spirit._dntState) {
        if (!spirit._lastDnt || now - spirit._lastDnt >= DNT_CD) {
            const boundY = typeof boundaryY !== 'undefined' ? boundaryY : canvas.height - 10;
            let trigger = null;
            for (const e of enemies) {
                if (e.type.startsWith('enemy_bullet') || e.type === 'abyssal_chain') continue;
                if (e.hp <= 0) continue;
                const nearPlayer = Math.hypot(e.x - player.x, e.y - player.y) < 170;
                const nearBound  = e.y > boundY - 170;
                if (nearPlayer || nearBound) { trigger = e; break; }
            }
            if (trigger) {
                spirit._dntState = 'aiming';
                spirit._dntTimer = 0;
                spirit._dntAngle = Math.atan2(trigger.y - spirit.y, trigger.x - spirit.x);

                // Vine Bind: alongside the laser lock-on, Phōtokrystos roots
                // the enemy nearest the bottom boundary and the enemy
                // nearest the player (may be the same enemy) — vines grow
                // in over 1s, then a 2s 50% slow + green aura follows.
                let _vbNearBound = null, _vbNearBoundDist = Infinity;
                let _vbNearPlayer = null, _vbNearPlayerDist = Infinity;
                for (const e of enemies) {
                    if (e.type.startsWith('enemy_bullet') || e.type === 'abyssal_chain' || e.type === 'veilshroud_echo' || e.inCoronation) continue;
                    if (e.hp <= 0) continue;
                    const _dBound = Math.abs(boundY - e.y);
                    if (_dBound < _vbNearBoundDist) { _vbNearBoundDist = _dBound; _vbNearBound = e; }
                    const _dPlayer = Math.hypot(e.x - player.x, e.y - player.y);
                    if (_dPlayer < _vbNearPlayerDist) { _vbNearPlayerDist = _dPlayer; _vbNearPlayer = e; }
                }
                const _vbTargets = new Set();
                if (_vbNearBound) _vbTargets.add(_vbNearBound);
                if (_vbNearPlayer) _vbTargets.add(_vbNearPlayer);
                if (_vbTargets.size > 0) {
                    const _vbNow = performance.now();
                    for (const ve of _vbTargets) ve._vineStart = _vbNow;
                    if (window.AudioMgr) window.AudioMgr.playSfxAt('photokrystos-vine-bind', spirit.x, spirit.y);
                }
            }
        }
    }

    // DNT state machine
    if (spirit._dntState) {
        spirit._dntTimer += deltaTime;

        if (spirit._dntState === 'aiming') {
            // Re-lock to nearest threatening enemy every frame
            const _boundY2 = typeof boundaryY !== 'undefined' ? boundaryY : canvas.height - 10;
            let _best = null, _bestDist = Infinity;
            for (const e of enemies) {
                if (e.type.startsWith('enemy_bullet') || e.type === 'abyssal_chain') continue;
                if (e.hp <= 0) continue;
                if (Math.hypot(e.x - player.x, e.y - player.y) < 170 || e.y > _boundY2 - 170) {
                    const d = Math.hypot(e.x - spirit.x, e.y - spirit.y);
                    if (d < _bestDist) { _bestDist = d; _best = e; }
                }
            }
            if (_best) spirit._dntAngle = Math.atan2(_best.y - spirit.y, _best.x - spirit.x);
            if (spirit._dntTimer >= DNT_AIM_DUR) {
                spirit._dntState = 'firing';
                spirit._dntTimer = 0;
                spirit._dntBaseAngle = spirit._dntAngle; // freeze base for sweep
                if (window.AudioMgr) window.AudioMgr.playSfxAt('photokrystos-dnt-laser', spirit.x, spirit.y);
            }

        } else if (spirit._dntState === 'firing') {
            // Sweep ±20° around base angle over full fire duration
            const _sweepRange = 0.35; // ~20°
            const _sweepProg  = spirit._dntTimer / DNT_FIRE_DUR;
            spirit._dntAngle  = spirit._dntBaseAngle + (_sweepProg - 0.5) * 2 * _sweepRange;

            // Beam hit: check every frame
            const bDx = Math.cos(spirit._dntAngle);
            const bDy = Math.sin(spirit._dntAngle);
            for (let ei = enemies.length - 1; ei >= 0; ei--) {
                const e = enemies[ei];
                if (e.type.startsWith('enemy_bullet') || e.type === 'abyssal_chain') continue;
                if (e.hp <= 0) continue;
                // Perpendicular distance from beam line
                const ex = e.x - spirit.x, ey = e.y - spirit.y;
                const along = ex * bDx + ey * bDy;
                const perp  = Math.abs(ex * bDy - ey * bDx);
                if (along > 0 && perp < DNT_BEAM_HALF + (e.size || 20)) {
                    // Instant kill, bypass all shields/protections
                    e.shield = 0;
                    e.hp = 0;
                    if (e.type === 'leviathan' && !e._deathLaserSpawned) {
                        dealDamage(e, { damage: 0, percentDamage: 0, _statSrc: 'Skill S: Danger Not Today' });
                    }
                    addExplosion(e.x, e.y, (e.size || 20) * 0.9, '#00ffaa');
                    createParticles(e.x, e.y, 10, '#a0ffcc', 1.5, 4);
                }
            }
            if (spirit._dntTimer >= DNT_FIRE_DUR) {
                spirit._dntState = 'recovering';
                spirit._dntTimer = 0;
                spirit._dntPenaltyUntil = now + DNT_PENALTY_DUR;
                spirit._lastDnt = now; // CD bắt đầu tính sau khi beam kết thúc
            }

        } else if (spirit._dntState === 'recovering' && spirit._dntTimer >= DNT_PENALTY_DUR) {
            spirit._dntState = null;
            spirit._dntTimer = 0;
        }
    }

    // Duration: only start counting from first bullet
    if (!spirit._combatStartTime) {
        // waiting for first shot, don't count duration yet
        // BTM check below uses _combatAge
    }
    const _combatAge = spirit._combatStartTime ? (now - spirit._combatStartTime) : 0;

    // Back to Motherland phase
    if (_combatAge >= BTM_START && !spirit._btmStarted) {
        spirit._btmStarted = true;
        spirit._btmPhase = 'warming'; // warming(0.5s) → firing(3.5s) → releasing(0.5s) → done
        spirit._btmTimer = 0;
        spirit._btmTickTimer = 0;
        spirit._btmLightnings = []; // lightning bolt visuals for render
        // Thu hồi tức thì tất cả boomerang, xóa khỏi màn hình ngay lập tức
        photoBrangs.length = 0;
        if (window.AudioMgr) {
            window.AudioMgr.playSfxAt('photokrystos-btm-warming', spirit.x, spirit.y);
            window.AudioMgr.stopPhotokrystosIdle();
        }
    }

    if (spirit._btmStarted) {
        spirit._btmTimer += deltaTime;
        const BTM_WARM = 1200, BTM_FIRE = 3500, BTM_REL = 500; // warming extended to 1.2s for dramatic flight

        if (spirit._btmPhase === 'warming') {
            // Fly smoothly to screen center
            const targetX = canvas.width / 2;
            const targetY = canvas.height * 0.35; // slightly above center, dramatic position
            const flySpeed = Math.min(1, spirit._btmTimer / BTM_WARM); // 0→1 over warm period
            spirit.x += (targetX - spirit.x) * 0.08;
            spirit.y += (targetY - spirit.y) * 0.08;
        }
        if (spirit._btmPhase === 'warming' && spirit._btmTimer >= BTM_WARM) {
            spirit._btmPhase = 'firing';
            spirit._btmTimer = 0;
            if (window.AudioMgr) window.AudioMgr.playSfxAt('photokrystos-btm-firing', spirit.x, spirit.y);
        } else if (spirit._btmPhase === 'firing') {
            spirit._btmTickTimer += deltaTime;
            if (spirit._btmTickTimer >= 100) {
                spirit._btmTickTimer = 0;
                const dmgMult = gloryForJusticeActive ? 1.55 : 1;
                spirit._btmLightnings = []; // reset each tick
                // Hit ALL enemies on screen
                for (const e of enemies) {
                    if (e.type === 'abyssal_chain') continue;
                    if (e.type.startsWith('enemy_bullet')) {
                        // Destroy enemy bullets (except abyssal_chain, marchosiasBlades handled separately)
                        e.hp = 0;
                        continue;
                    }
                    dealDamage(e, {
                        damage: 20 * dmgMult, percentDamage: 0.35,
                        applyVuln: true, vulnChance: 0.15, isTrueDamage: true,
                        isPhoto: true, _statSrc: 'Skill S: Back to Motherland'
                    });
                    if (e.hp <= 0) e._btmKilled = true;
                    // Record lightning bolt for render
                    spirit._btmLightnings.push({ x: e.x, y: e.y });
                }
            }
            if (spirit._btmTimer >= BTM_FIRE) {
                spirit._btmPhase = 'releasing';
                spirit._btmTimer = 0;
                spawnPhotoBrangs(spirit.x, spirit.y, 5);
            }
        } else if (spirit._btmPhase === 'releasing') {
            // Final shockwave on entering releasing phase (fire once)
            if (!spirit._btmShockwaveFired) {
                spirit._btmShockwaveFired = true;
                bossShockwaves.push({
                    x: spirit.x, y: spirit.y,
                    radius: 0,
                    maxRadius: Math.hypot(canvas.width, canvas.height) * 1.2,
                    speed: 28,
                    hitSentinels: new Set(),
                    active: true,
                    _isBTMWave: true,
                    _hitEnemies: new Set(),
                    _damage: 10, _percentDamage: 0.99, // 10 + 99% MaxHP
                });
                for (let ei = enemies.length - 1; ei >= 0; ei--) {
                    if (enemies[ei].type.startsWith('enemy_bullet') && enemies[ei].type !== 'abyssal_chain') {
                        enemies[ei].hp = 0;
                    }
                }
                _setShake(30, 800);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('photokrystos-btm-shockwave', spirit.x, spirit.y);
            }
            if (spirit._btmTimer >= BTM_REL) {
                spirit._done = true;
                primevalEnergy = 0;
                // CD was already started at summon time, do NOT reset it here
                // Just unlock: spirits array will be empty → button unlocks naturally
            }
        }
        return; // BTM active, don't do normal movement/attacks
    }

    // DNT aiming/firing: spirit freezes, no normal attacks
    if (spirit._dntState === 'aiming' || spirit._dntState === 'firing') return;

    // Normal Phōtokrystos movement
    let t = now / 1000;
    const orbitR = 85; // slightly larger than normal (72)
    spirit.x += (player.x + Math.cos(t * 2) * orbitR - spirit.x) * 0.08;
    spirit.y += (player.y + Math.sin(t * 2) * orbitR - spirit.y) * 0.08;

    // Attack: 3 homing bullets per volley at 42ms
    spirit.shootTimer -= deltaTime;
    let photoFireRate = 42; // fire rate
    if (gloryForJusticeActive) photoFireRate /= 1.20;
    if (_hasBuff('cuc_han')) photoFireRate /= 1.30; // Arctic Chill: +30% fire rate
    if (spirit.shootTimer <= 0) {
        spirit.shootTimer = photoFireRate;
        const targets = [];
        // Find up to 3 distinct closest enemies. Fires every 42ms while
        // Photokrystos is active, so a full filter+sort of the whole
        // enemies array (incl. a Math.hypot per comparison) every single
        // volley adds up — tracking the 3 nearest by hand in one pass
        // avoids both the array allocation and the O(n log n) sort.
        let e0 = null, d0 = Infinity, e1 = null, d1 = Infinity, e2 = null, d2 = Infinity;
        for (const e of enemies) {
            if (e.type.startsWith('enemy_bullet') || e.type === 'abyssal_chain' || e.type === 'veilshroud_echo' || e.inCoronation || e.hp <= 0 || e._markedForDeath) continue;
            const d = Math.hypot(e.x - spirit.x, e.y - spirit.y);
            if (d < d0) { e2 = e1; d2 = d1; e1 = e0; d1 = d0; e0 = e; d0 = d; }
            else if (d < d1) { e2 = e1; d2 = d1; e1 = e; d1 = d; }
            else if (d < d2) { e2 = e; d2 = d; }
        }
        if (e0) {
            targets[0] = e0;
            targets[1] = e1 || e0;
            targets[2] = e2 || e1 || e0;
        }
        if (targets.length > 0) {
            // Duration starts from first shot
            if (!spirit._combatStartTime) spirit._combatStartTime = now;
            const dmgMult = gloryForJusticeActive ? 1.55 : 1;
            // -20% dmg penalty for 3s after DNT laser
            const dntMult = (spirit._dntPenaltyUntil && now < spirit._dntPenaltyUntil) ? 0.8 : 1;
            const speedMult = (gloryForJusticeActive ? 1.30 : 1) * 1.3;
            // All 3 homing, same damage (10 + 4.25% HP), apply Vulnerability
            for (let bi = 0; bi < 3; bi++) {
                spiritBullets.push({
                    x: spirit.x, y: spirit.y,
                    damage: 125 * dmgMult * dntMult, percentDamage: 0.017 * dntMult,
                    size: 8, lifetime: 2500, target: targets[bi], speedMultiplier: speedMult,
                    isSpirit: true, isPhoto: true, destroysEnemyBullets: true,
                    applyVuln: true, vulnChance: 0.15, _statSrc: 'Skill S: Photokrystos',
                });
            }
            spirit.volleyCount = (spirit.volleyCount || 0) + 1;
            if (window.AudioMgr) window.AudioMgr.playSfx('spirit-autofire');
        }
    }

    // Boomerang every 6 volleys
    if (spirit.volleyCount >= 6) {
        spirit.volleyCount = 0;
        let brangCount = 2;
        if (_hasBuff('song_luoi')) {
            if (Math.random() < 0.40) brangCount += 2;
            if (Math.random() < 0.40) brangCount += 2;
        }
        spawnPhotoBrangs(spirit.x, spirit.y, brangCount, _hasBuff('song_luoi'));
    }

}

const MAX_PHOTO_BRANGS = 10;
const MAX_BRANG_PENDING = 5;
function spawnPhotoBrangs(fromX, fromY, count, songLuoiActive) {
    const _photo = spirits.find(s => s.isPhotokrystos);
    const validTargets = enemies.filter(e =>
        !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation && e.hp > 0 && !e._markedForDeath
    );
    if (validTargets.length === 0) return;

    // Đếm brang đang active (không đang về)
    const activeCount = photoBrangs.filter(b => !b._recalling).length;
    const canNow = Math.max(0, MAX_PHOTO_BRANGS - activeCount);
    const throwNow = Math.min(count, canNow);
    const toQueue  = count - throwNow;

    // Queue những cái chưa đủ chỗ (tối đa 5 tích lũy)
    if (toQueue > 0 && _photo) {
        const spaceInQueue = MAX_BRANG_PENDING - (_photo._brangPending || 0);
        const actualQueue  = Math.min(toQueue, spaceInQueue);
        _photo._brangPending = (_photo._brangPending || 0) + actualQueue;
        // Gọi những cái cũ nhất về để nhường chỗ
        let toRecall = actualQueue;
        for (let _bi = 0; _bi < photoBrangs.length && toRecall > 0; _bi++) {
            if (!photoBrangs[_bi]._recalling) {
                photoBrangs[_bi]._recalling = true;
                toRecall--;
            }
        }
    }

    // Phóng ngay những cái đủ chỗ (base=2, extras từ song_luoi có +20% radius)
    if (throwNow > 0) { player._empowerFlashStart = performance.now(); player._empowerFlashEnd = player._empowerFlashStart + 320; }
    for (let b = 0; b < throwNow; b++) {
        const shuffled = _shuffleArray(validTargets);
        const first = shuffled[0];
        const dx = first.x - fromX, dy = first.y - fromY;
        const d = Math.hypot(dx, dy) || 1;
        const _isExtra = songLuoiActive && b >= 2;
        photoBrangs.push({
            x: fromX, y: fromY,
            vx: (dx / d) * 17.5, vy: (dy / d) * 17.5,
            targets: shuffled,
            targetIdx: 0,
            hitEnemies: [],
            rotation: Math.random() * Math.PI * 2,
            damage: 500, percentDamage: 0.070,
            lifetime: 9000,
            _radius: _isExtra ? 58 : 48,
        });
        if (window.AudioMgr) window.AudioMgr.playSfxAt('photokrystos-boomerang-throw', fromX, fromY);
    }
}

function updatePhotoBrangs(deltaTime) {
    const dt = deltaTime / 16.67;
    const BRANG_R_DEFAULT = 48; // base visual radius
    const _photo = spirits.find(s => s.isPhotokrystos); // dùng isPhotokrystos, không phải type

    for (let i = photoBrangs.length - 1; i >= 0; i--) {
        const b = photoBrangs[i];
        b.rotation += 0.42 * dt;

        // Recall mode: bay về phía tinh linh (nhanh hơn 60%)
        if (b._recalling) {
            if (_photo) {
                const _rdx = _photo.x - b.x, _rdy = _photo.y - b.y;
                const _rd  = Math.hypot(_rdx, _rdy) || 1;
                b.vx += (_rdx / _rd * 35 - b.vx) * 0.28; // 22 → 35 (+60%)
                b.vy += (_rdy / _rd * 35 - b.vy) * 0.28;
                b.x  += b.vx * dt;
                b.y  += b.vy * dt;
                if (_rd < 35) {
                    photoBrangs.splice(i, 1);
                    // Phóng pending nếu còn
                    if ((_photo._brangPending || 0) > 0) {
                        _photo._brangPending--;
                        spawnPhotoBrangs(_photo.x, _photo.y, 1);
                    }
                }
            } else {
                photoBrangs.splice(i, 1); // tinh linh đã biến mất
            }
            continue;
        }

        b.lifetime -= deltaTime;
        if (b.lifetime <= 0) {
            // Thu hồi thay vì biến mất
            if (_photo) { b._recalling = true; } else { photoBrangs.splice(i, 1); }
            continue;
        }

        // Cooldown per enemy to allow re-hit (every 200ms)
        b._hitCooldowns = b._hitCooldowns || new Map();
        const now_b = performance.now();

        // Find current target
        let tgt = null;
        while (b.targetIdx < b.targets.length) {
            const candidate = b.targets[b.targetIdx];
            if (candidate && enemies.includes(candidate) && candidate.type !== 'veilshroud_echo' && !candidate.inCoronation && candidate.hp > 0 && !candidate._markedForDeath) {
                tgt = candidate; break;
            }
            b.targetIdx++; // skip dead/gone targets
        }

        if (tgt) {
            const dx = tgt.x - b.x, dy = tgt.y - b.y;
            const d = Math.hypot(dx, dy) || 1;
            // Steer toward target
            const spd = 17.5;
            b.vx += (dx / d * spd - b.vx) * 0.18;
            b.vy += (dy / d * spd - b.vy) * 0.18;

            // Hit: any overlap between boomerang and enemy
            const BRANG_R = b._radius || BRANG_R_DEFAULT;
            const hitDist = (tgt.size / 2) + BRANG_R; // generous, any edge contact
            if (d < hitDist) {
                const lastHit = b._hitCooldowns.get(tgt) || 0;
                if (now_b - lastHit >= 200) { // can re-hit same enemy after 200ms
                    b._hitCooldowns.set(tgt, now_b);
                    if (window.AudioMgr) window.AudioMgr.playSfxAt('photokrystos-boomerang-hit', b.x, b.y);
                    // Cut mark: a quick radial spark burst plus 2 streak
                    // particles fired straight along the boomerang's own
                    // travel direction (both ways), reading as a slash
                    // across the enemy rather than a plain generic hit.
                    createParticles(tgt.x, tgt.y, 8, '#4ade80', 2, 6);
                    const _slashAngle = Math.atan2(b.vy, b.vx);
                    for (const _sgn of [1, -1]) {
                        const _sp = _acquireParticle();
                        _sp.x = tgt.x; _sp.y = tgt.y;
                        _sp.vx = Math.cos(_slashAngle) * _sgn * 9; _sp.vy = Math.sin(_slashAngle) * _sgn * 9;
                        _sp.lifetime = 160; _sp.maxLifetime = 160;
                        _sp.size = 2.5; _sp.color = '#e6ffeb';
                        particles.push(_sp);
                    }
                    const brangSrc = {
                        damage: Math.ceil((b.damage + (tgt.maxHp - tgt.hp) * 0.05) * (gloryForJusticeActive ? 1.55 : 1)),
                        percentDamage: b.percentDamage,
                        applyVuln: true, vulnChance: 0.15,
                        isTrueDamage: true, _barrierPiercing: true,
                        // Đánh dấu cho hiệu ứng "vết chém" riêng của Goliath (xem dealDamage)
                        _isSlashVfx: true,
                        // Boomerang CHỈ tồn tại ở dạng Photokrystos (spawnPhotoBrangs,
                        // gọi từ updatePhotokrystos) — đánh dấu cho Goliath's Warding
                        // Palm giảm riêng sát thương từ Photokrystos.
                        _isPhotoSourced: true,
                        _noHitSfx: true
                    };
                    if (!checkMarchosiasArcBarrier(tgt, brangSrc, b.x, b.y)) {
                        dealDamage(tgt, brangSrc);
                        if (_hasBuff('cuc_han') && Math.random() < 0.75) {
                            tgt._slowEnd = Math.max(tgt._slowEnd || 0, now_b + 2000);
                            tgt._slowFactor = Math.max(tgt._slowFactor || 1, 1 / 0.70);
                            const _cucCCImmune = tgt.type === 'goliath' || tgt.type === 'egregor' || tgt.type === 'dargruel' || tgt.type === 'leviathan'
                                || (tgt.type === 'marchosias' && tgt.arcBarrier && tgt.arcBarrier.hp > 0)
                                || (tgt.type === 'aegis_core' && tgt.aegisInvulnerable);
                            // CC-immune targets are never pulled - absolute, no exceptions.
                            if (!_cucCCImmune) {
                                const _cdx = b.x - tgt.x, _cdy = b.y - tgt.y;
                                const _cd = Math.hypot(_cdx, _cdy) || 1;
                                tgt.x += (_cdx / _cd) * 38;
                                tgt.y += (_cdy / _cd) * 38;
                            }
                        }
                        if (tgt.hp <= 0 && !tgt._spiritKillCounted) {
                            tgt._spiritKillCounted = true;
                            primevalEnergy = Math.min(100, primevalEnergy + 2 * (_hasBuff('dong_chay_luan_hoi') ? 1.50 : 1));
                        }
                    }
                    // Bounce to next target after hit
                    b.targetIdx++;
                }
            }
        } else {
            // No target: fly straight, bounce off screen edges (max 2 bounces)
            b._bounces = b._bounces || 0;
            let bounced = false;
            if (b.x < 0 || b.x > canvas.width) { b.vx = -b.vx; b._bounces++; bounced = true; }
            if (b.y < 0 || b.y > canvas.height) { b.vy = -b.vy; b._bounces++; bounced = true; }
            if (b._bounces >= 2 && !bounced) {
                // Check if new enemies appeared
                const newValid = enemies.filter(e =>
                    !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' &&
                    e.type !== 'veilshroud_echo' && !e.inCoronation &&
                    e.hp > 0 && !e._markedForDeath
                );
                if (newValid.length > 0) {
                    b.targets = _shuffleArray(newValid);
                    b.targetIdx = 0;
                    b._bounces = 0;
                } else {
                    // Không còn enemy: thu hồi
                    if (_photo) { b._recalling = true; } else { photoBrangs.splice(i, 1); }
                    continue;
                }
            }
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Destroy enemy bullets along path
        for (let ei = enemies.length - 1; ei >= 0; ei--) {
            const eb = enemies[ei];
            if (!eb.type.startsWith('enemy_bullet') || eb.type === 'abyssal_chain') continue;
            if (Math.hypot(eb.x - b.x, eb.y - b.y) < (b._radius || BRANG_R_DEFAULT) + eb.size) eb.hp = 0;
        }
    }
}

function updatePrimevalSummonEffect(deltaTime) {
    if (!primevalSummonEffect) return;
    const eff = primevalSummonEffect;
    eff.timer += deltaTime;

    if (eff.phase === 'converge' && eff.timer >= 1800) {
        eff.phase = 'flash';
        eff.timer = 0;
        if (window.AudioMgr) window.AudioMgr.playSfxAt('photokrystos-summon-flash', eff.x, eff.y);
    } else if (eff.phase === 'flash' && eff.timer >= 400) {
        // Transform the spirit
        const spirit = eff.targetSpirit;
        if (spirit && !spirit.isFinishing) {
            // The normal Spirit's life effectively ends here too (it becomes
            // Photokrystos) - launches a Spinner just like the natural finale.
            _launchSpinner(spirit.x, spirit.y);
            spirit.isPhotokrystos = true;
            spirit._summoningUp = false;
            spirit.spawnGameTime = gameElapsedTime; // reset 40s timer
            spirit.duration = 40000;
            spirit.shotsFiredSinceBarrage = 0;
            spirit.volleyCount = 0;
            spirit._btmStarted = false;
            spirit._done = false;
            if (window.AudioMgr) window.AudioMgr.startPhotokrystosIdle();
        }
        primevalSummonEffect = null;
    }

    // Move effect to follow spirit during converge
    if (eff.phase === 'converge' && eff.targetSpirit) {
        eff.x = eff.targetSpirit.x;
        eff.y = eff.targetSpirit.y;
    }
}

function updateBladeArcProjectiles(deltaTime) {
    const dt = deltaTime / 16.67;
    if (window._pendingBlades && window._pendingBlades.length > 0) {
        const _now = performance.now();
        window._pendingBlades = window._pendingBlades.filter(pb => {
            if (_now >= pb.spawnAt) { bladeArcProjectiles.push(pb.data); return false; }
            return true;
        });
    }
    for (let i = bladeArcProjectiles.length - 1; i >= 0; i--) {
        let arc = bladeArcProjectiles[i];
        arc.x += arc.vx * dt;
        arc.y += arc.vy * dt;
        if (arc.x < -arc.radius || arc.x > canvas.width + arc.radius || arc.y < -arc.radius || arc.y > canvas.height + arc.radius) {
            bladeArcProjectiles.splice(i, 1);
            continue;
        }
        for (let enemy of enemies) {
            if (enemy.type === 'abyssal_chain') continue; // piercing
            if (enemy.type === 'veilshroud_echo') continue; // untargetable
            if (enemy.inCoronation) continue;
            // Enemy bullets: destroy directly, no hitEnemies tracking (can re-detect each frame)
            if (enemy.type.startsWith('enemy_bullet')) {
                if (Math.hypot(enemy.x - arc.x, enemy.y - arc.y) < arc.radius + enemy.size) {
                    enemy.hp = 0;
                }
                continue;
            }
            if (arc.hitEnemies.includes(enemy)) continue;
            const enemyRadius = enemy.size / 2;
            if (Math.hypot(enemy.x - arc.x, enemy.y - arc.y) < arc.radius + enemyRadius) {
                if (checkMarchosiasArcBarrier(enemy, arc, arc.x, arc.y)) { arc.hitEnemies.push(enemy); continue; }
                const _arcBypass = _hasBuff('tu_huyet');
                const _arcSrc = (arc.isSpirit && arc.isPiercing)
                    ? { damage: arc.damage + Math.ceil((enemy.maxHp - enemy.hp) * 0.055), percentDamage: arc.percentDamage, isPiercing: true, _bypassIronBody: _arcBypass }
                    : arc;
                if (_arcBypass) _arcSrc._bypassIronBody = true;
                // Đánh dấu cho hiệu ứng "vết chém" riêng của Goliath (xem dealDamage)
                _arcSrc._isSlashVfx = true;
                dealDamage(enemy, _arcSrc);
                if (_hasBuff('cuc_han') && Math.random() < 0.75) {
                    enemy._slowEnd = Math.max(enemy._slowEnd || 0, performance.now() + 2000);
                    enemy._slowFactor = Math.max(enemy._slowFactor || 1, 1 / 0.70);
                    const _cucArcCCImmune = enemy.type === 'goliath' || enemy.type === 'egregor' || enemy.type === 'dargruel' || enemy.type === 'leviathan'
                        || (enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0)
                        || (enemy.type === 'aegis_core' && enemy.aegisInvulnerable);
                    // CC-immune targets are never pulled - absolute, no exceptions.
                    if (!_cucArcCCImmune) {
                        const _adx = arc.x - enemy.x, _ady = arc.y - enemy.y;
                        const _ad = Math.hypot(_adx, _ady) || 1;
                        enemy.x += (_adx / _ad) * 38;
                        enemy.y += (_ady / _ad) * 38;
                    }
                }
                // Primeval Creation: blade arc from spirit = +2%
                if (arc.isSpirit && enemy.hp <= 0 && !enemy._spiritKillCounted) {
                    enemy._spiritKillCounted = true;
                    primevalEnergy = Math.min(100, primevalEnergy + 2 * (_hasBuff('dong_chay_luan_hoi') ? 1.50 : 1));
                }
                // Mini arc blade on-hit: a crescent flash wrapping the enemy's
                // edge, dissolving into digital static - distinct from the
                // big Blade Arc's own hit feel.
                if (arc.isSpinnerBlade) {
                    createParticles(enemy.x, enemy.y, 6, '#e0ffff', 2, 6);
                    createParticles(enemy.x, enemy.y, 4, '#00ffff', 1, 4);
                }
                // Great Sage's stolen Absolute Verdict: the orb marks every
                // enemy it pierces with 1 Vulnerability stack and Soul Reaver,
                // real judgment against foes tough enough to shrug off a
                // single hit (Goliath's own Warding Palm/Inevitable DR chief
                // among them) instead of just one damage tick.
                if (arc.isGreatSageVerdict && enemy.hp > 0) {
                    applyVulnerability(enemy);
                    enemy.soulReaver = true;
                    enemy.soulReaverEnd = performance.now() + 2500;
                }
                arc.hitEnemies.push(enemy);
            }
        }
    }
}

// Fires the Spinner's 4-direction mini Arc Blade volley (cross pattern,
// N/E/S/W) - shared by both triggers that launch it: the periodic proximity
// check in updateSpiritSpinners() and the independent per-collision trigger
// on the Spinner's own body-contact hit.
function _fireSpinnerBlades(s, now) {
    // Arc-blade launch: a sudden 4-way crosshair flash of cyan light over
    // the Spinner, a beat before the blades snap out. Read by
    // drawSpiritSpinner() every frame while now < this.
    s._arcFlashEnd = now + 180;
    // Twin Blades (Sagittarius): doubles each direction into a pair (+60%
    // damage each, 2nd fires 15ms later at +20% radius) - the same
    // multiplier/stagger the Spirit's own Blade Arc gets from this sigil.
    const _twinBlades = _hasBuff('song_luoi');
    const _bladeDmg = _twinBlades ? 500 * 1.60 : 500;
    const _bladePct = _twinBlades ? 0.05 * 1.60 : 0.05;
    for (let d = 0; d < 4; d++) {
        const a = (Math.PI / 2) * d;
        bladeArcProjectiles.push({
            x: s.x, y: s.y, vx: Math.cos(a) * 15.84, vy: Math.sin(a) * 15.84,
            radius: 70, damage: _bladeDmg, percentDamage: _bladePct, hitEnemies: [],
            isPiercing: true, _barrierPiercing: true, isSpinnerBlade: true, _statSrc: s._statSrc,
        });
        if (_twinBlades) {
            if (!window._pendingBlades) window._pendingBlades = [];
            window._pendingBlades.push({
                spawnAt: now + 15,
                data: { x: s.x, y: s.y, vx: Math.cos(a) * 15.84, vy: Math.sin(a) * 15.84,
                    radius: 70 * 1.20, damage: _bladeDmg, percentDamage: _bladePct, hitEnemies: [],
                    isPiercing: true, _barrierPiercing: true, isSpinnerBlade: true, _statSrc: s._statSrc },
            });
        }
    }
    if (window.AudioMgr) window.AudioMgr.playSfxAt('spirit-arc-slash', s.x, s.y);
}

// Bouncing Spinner from the Spirit finale (replaces the old 8-ball burst).
// Speed is stored as a base vx/vy at spawn; the ramp/bounce-boost below are
// pure per-frame multipliers on top of it, so they rise and fall freely
// without ever needing to renormalize the velocity vector.
function updateSpiritSpinners(deltaTime) {
    const dt = deltaTime / 16.67;
    const now = performance.now();
    for (let i = spiritSpinners.length - 1; i >= 0; i--) {
        const s = spiritSpinners[i];
        s.lifetime -= deltaTime;
        if (s.lifetime <= 0) {
            // Despawn: a clean finish, not a fade - shatters inward into dust.
            addExplosion(s.x, s.y, s.size * 0.9, '#ff44aa');
            createParticles(s.x, s.y, 22, '#ff44aa', 3, 10);
            createParticles(s.x, s.y, 8, '#ffffff', 1, 4);
            if (window.AudioMgr) window.AudioMgr.playSfxAt('sentinel-explode', s.x, s.y);
            spiritSpinners.splice(i, 1);
            continue;
        }

        const age = now - s.spawnAt;
        // Launch ramp: +50% speed decaying to +10% over the first 2s, then
        // gone entirely - a one-time opening burst, not a lasting buff.
        const rampMult = age >= 2000 ? 1.0 : 1.5 - (0.4 * (age / 2000));
        const bounceMult = now < s.bounceBoostEnd ? 1.20 : 1.0;
        const speedMult = rampMult * bounceMult;

        s.x += s.vx * speedMult * dt;
        s.y += s.vy * speedMult * dt;

        // Clamp position to the wall (not just flip velocity) and force the
        // post-bounce direction with Math.abs - at the higher speeds the
        // launch ramp/bounce boost push it to, a plain "just negate vx" can
        // overshoot far enough that the next frame's move doesn't clear the
        // wall either, re-triggering the same flip and jittering in place
        // instead of bouncing cleanly away.
        let bounced = false, _bouncedXSign = 0, _bouncedYSign = 0;
        if (s.x < s.size) { s.x = s.size; s.vx = Math.abs(s.vx); bounced = true; _bouncedXSign = 1; }
        else if (s.x > canvas.width - s.size) { s.x = canvas.width - s.size; s.vx = -Math.abs(s.vx); bounced = true; _bouncedXSign = -1; }
        if (s.y < s.size) { s.y = s.size; s.vy = Math.abs(s.vy); bounced = true; _bouncedYSign = 1; }
        else if (s.y > canvas.height - s.size) { s.y = canvas.height - s.size; s.vy = -Math.abs(s.vy); bounced = true; _bouncedYSign = -1; }
        if (bounced) {
            s.bounceBoostEnd = now + 1000; // refreshes on each bounce, never stacks
            if (window.AudioMgr) window.AudioMgr.playSfxAt('spinner-bounce', s.x, s.y);
            // Small random angle jitter on every bounce so a near-axis
            // trajectory doesn't lock into a short repeating back-and-forth
            // path - keeps it actually covering the screen over its 5s life.
            const _jitter = (Math.random() - 0.5) * 0.5; // ±0.25 rad (~±14°)
            const _spd = Math.hypot(s.vx, s.vy);
            const _ang = Math.atan2(s.vy, s.vx) + _jitter;
            s.vx = Math.cos(_ang) * _spd;
            s.vy = Math.sin(_ang) * _spd;

            if (_hasBuff('song_luoi')) {
                // Ricochet Hunter: soft-lock the post-bounce direction partway
                // toward the nearest enemy roughly in front of it (60° cone),
                // instead of pure physics - a hunting shot, not a random one.
                const _validTargets = _solArrowValidTargets();
                let _bestEnemy = null, _bestAngDiff = Math.PI / 3;
                const _curAngle = Math.atan2(s.vy, s.vx);
                for (const e of _validTargets) {
                    let _diff = Math.abs(Math.atan2(e.y - s.y, e.x - s.x) - _curAngle);
                    if (_diff > Math.PI) _diff = Math.PI * 2 - _diff;
                    if (_diff < _bestAngDiff) { _bestAngDiff = _diff; _bestEnemy = e; }
                }
                if (_bestEnemy) {
                    const _targetAngle = Math.atan2(_bestEnemy.y - s.y, _bestEnemy.x - s.x);
                    let _angDiff = _targetAngle - _curAngle;
                    while (_angDiff > Math.PI) _angDiff -= Math.PI * 2;
                    while (_angDiff < -Math.PI) _angDiff += Math.PI * 2;
                    const _homeAngle = _curAngle + _angDiff * 0.45; // soft lock, not a full snap
                    const _spd2 = Math.hypot(s.vx, s.vy);
                    s.vx = Math.cos(_homeAngle) * _spd2;
                    s.vy = Math.sin(_homeAngle) * _spd2;
                }
                // Escalating damage: +15% per bounce, up to 3 stacks (+45%),
                // reset the instant it lands a body hit (see below).
                s._songLuoiStacks = Math.min(3, (s._songLuoiStacks || 0) + 1);
            }

            // Safety clamp: for a shallow-angle bounce, the jitter and (with
            // Ricochet Hunter) the homing pull can rotate far enough to send
            // the axis that just bounced back toward the wall it left,
            // triggering a second real bounce (and a second bounce sfx) one
            // frame later. Re-force that axis's sign one more time so a
            // single wall contact can never produce more than one bounce.
            if (_bouncedXSign > 0 && s.vx < 0) s.vx = -s.vx;
            else if (_bouncedXSign < 0 && s.vx > 0) s.vx = -s.vx;
            if (_bouncedYSign > 0 && s.vy < 0) s.vy = -s.vy;
            else if (_bouncedYSign < 0 && s.vy > 0) s.vy = -s.vy;
        }

        // Body-contact damage: no per-enemy cooldown right now (removed per
        // request, temporary) - deals damage every frame it's overlapping.
        for (const enemy of enemies) {
            if (enemy.type === 'abyssal_chain' || enemy.type === 'veilshroud_echo' || enemy.inCoronation) continue;
            const enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - s.x, enemy.y - s.y) >= enemyRadius + s.size) continue;
            if (checkMarchosiasArcBarrier(enemy, s, s.x, s.y)) continue;
            // Ricochet Hunter (Sagittarius): damage escalates +15% per wall
            // bounce since the last hit, up to +45% at 3 stacks, then resets
            // the instant it actually lands one - rewards a clean run of
            // bounces without a hit over chaining hits back to back.
            const _songLuoiMult = _hasBuff('song_luoi') ? 1 + 0.15 * (s._songLuoiStacks || 0) : 1;
            dealDamage(enemy, { damage: Math.round(200 * _songLuoiMult), percentDamage: 0.20 * _songLuoiMult, isTrueDamage: true, _statSrc: s._statSrc });
            if (_hasBuff('song_luoi')) s._songLuoiStacks = 0;
            // On-hit: a sharp crack - jagged magenta shards plus a quick
            // white flash at the contact point, selling the heavy true damage.
            createParticles(enemy.x, enemy.y, 8, '#ff44aa', 3, 8);
            createParticles(enemy.x, enemy.y, 3, '#ffffff', 2, 5);
            // Colliding with ANY target also fires the mini Arc Blade volley
            // immediately - independent of (on top of) the periodic 300ms
            // proximity trigger below, so a body hit always slashes too. Capped
            // per-enemy at 0.4s (body damage itself has no such cooldown) so
            // sitting on top of one target doesn't refire this every frame.
            if (!s._collisionBladeCooldowns) s._collisionBladeCooldowns = new Map();
            if (now >= (s._collisionBladeCooldowns.get(enemy) || 0)) {
                _fireSpinnerBlades(s, now);
                s._collisionBladeCooldowns.set(enemy, now + 400);
            }
            // Arctic Chill (Sagittarius): same slow+pull the Spirit's arc
            // slash already gets, extended to the Spinner's own body hit too.
            if (_hasBuff('cuc_han') && Math.random() < 0.75) {
                enemy._slowEnd = Math.max(enemy._slowEnd || 0, now + 2000);
                enemy._slowFactor = Math.max(enemy._slowFactor || 1, 1 / 0.70);
                const _cucSpinImmune = enemy.type === 'goliath' || enemy.type === 'egregor' || enemy.type === 'dargruel' || enemy.type === 'leviathan'
                    || (enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0)
                    || (enemy.type === 'aegis_core' && enemy.aegisInvulnerable);
                // CC-immune targets are never pulled - absolute, no exceptions.
                if (!_cucSpinImmune) {
                    const _sdx = s.x - enemy.x, _sdy = s.y - enemy.y, _sd = Math.hypot(_sdx, _sdy) || 1;
                    enemy.x += (_sdx / _sd) * 38; enemy.y += (_sdy / _sd) * 38;
                }
            }
        }

        // Every 300ms, if any enemy is close enough, slash 4 mini arc blades
        // in a fixed cross pattern - a secondary attack layered on the body.
        s.lastArcTick -= deltaTime;
        if (s.lastArcTick <= 0) {
            const _arcRange = s.size / 2 + 100;
            const _hasNearby = enemies.some(e =>
                !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo'
                && !e.inCoronation && e.hp > 0 && !e._markedForDeath
                && Math.hypot(e.x - s.x, e.y - s.y) < _arcRange
            );
            if (_hasNearby) {
                // Arctic Chill (Sagittarius): same +30% fire rate it already
                // gives the Spirit's own auto-fire, applied to the Spinner's
                // arc-slash beat.
                s.lastArcTick = _hasBuff('cuc_han') ? 300 / 1.30 : 300;
                _fireSpinnerBlades(s, now);
            } else {
                s.lastArcTick = 0; // keep checking every frame until an enemy comes into range
            }
        }
    }
}

function updateSpiritBullets(deltaTime) {
    let dt = deltaTime / 16.67;
    for (let i = spiritBullets.length - 1; i >= 0; i--) {
        let b = spiritBullets[i];
        if (b.vx !== undefined && b.vy !== undefined && b.target === null) {
            // Directional bullet (no homing)
            b.x += b.vx * dt;
            b.y += b.vy * dt;
        } else if (b.target && enemies.includes(b.target)) {
            let dx = b.target.x - b.x, dy = b.target.y - b.y, d = Math.hypot(dx, dy);
            if (d > 0) {
                const speed = 8.8 * (b.speedMultiplier || 1);
                b.x += (dx / d) * speed * dt;
                b.y += (dy / d) * speed * dt;
            }
        } else { b.y -= 8.8 * dt * (b.speedMultiplier || 1); }
        b.lifetime -= deltaTime;
        for (let enemy of enemies) {
            if (enemy.type === 'abyssal_chain') continue; // piercing
            if (enemy.type === 'veilshroud_echo') continue; // untargetable
            if (enemy.inCoronation) continue;
            // Phōtokrystos bullets destroy enemy bullets on contact
            if (b.destroysEnemyBullets && enemy.type.startsWith('enemy_bullet')) {
                if (Math.hypot(enemy.x - b.x, enemy.y - b.y) < b.size + enemy.size) {
                    enemy.hp = 0; // destroy bullet
                }
                continue;
            }
            let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - b.x, enemy.y - b.y) < enemyRadius + b.size) {
                if (checkMarchosiasArcBarrier(enemy, b, b.x, b.y)) {
                    b.lifetime = 0; break;
                }
                dealDamage(enemy, b);
                // Primeval Creation: +2% from spirit kills (handleEnemyKill gives +1.25% to others)
                if (b.isSpirit && enemy.hp <= 0 && !enemy._spiritKillCounted) {
                    enemy._spiritKillCounted = true;
                    primevalEnergy = Math.min(100, primevalEnergy + 2 * (_hasBuff('dong_chay_luan_hoi') ? 1.50 : 1));
                }
                b.lifetime = 0;
                createParticles(b.x, b.y, 5, b.isPhoto ? 'lime' : 'lime', 1, 3);
                break;
            }
        }
        if (b.lifetime <= 0 || b.y < 0) spiritBullets.splice(i, 1);
    }
}

function updateSpiritFinale(spirit, deltaTime) {
    if (!spirit || !spirit.isFinishing) return;
    const dt = deltaTime / 16.67;
    switch (spirit.finaleState) {
        case 'moving':
            const dx = spirit.finaleTargetPos.x - spirit.x, dy = spirit.finaleTargetPos.y - spirit.y;
            if (Math.hypot(dx, dy) < 5) {
                spirit.finaleState = 'charging'; spirit.finaleChargeTime = 2500; spirit.finaleLastLaserTick = 0;
                // Plays once for the whole charge, not per tick - retriggering
                // it every 100ms stacked overlapping copies into a harsh mess.
                if (window.AudioMgr) window.AudioMgr.playSfxAt('spirit-finale-laser', spirit.x, spirit.y);
            } else {
                spirit.x += dx * 0.1 * dt; spirit.y += dy * 0.1 * dt;
            }
            break;
        case 'charging':
            spirit.finaleChargeTime -= deltaTime;
            spirit.finaleLastLaserTick -= deltaTime;
            if (spirit.finaleLastLaserTick <= 0) {
                spirit.finaleLastLaserTick = 100;
                enemies.forEach(enemy => {
                    if (enemy.type === 'abyssal_chain') return;
                    if (enemy.type === 'veilshroud_echo') return; // untargetable
                    if (enemy.inCoronation) return;
                    particles.push({ isLaserLine: true, x1: spirit.x, y1: spirit.y, x2: enemy.x, y2: enemy.y, lifetime: 150, maxLifetime: 150, color: 'red' });
                    dealDamage(enemy, { damage: 10, percentDamage: 0.40, isSpiritLaser: true, isTrueDamage: true });
                });
            }
            if (spirit.finaleChargeTime <= 0) spirit.finaleState = 'firing';
            break;
        case 'firing': {
            addExplosion(spirit.x, spirit.y, 200, 'red');
            _setShake(25, 600);
            _launchSpinner(spirit.x, spirit.y);
            spirit.isFinishing = false;
            break;
        }
    }
}

// Spawns a Spinner at (x,y), aimed at whichever enemy sits in the densest
// local cluster (not the nearest one - it's meant to open on the crowd that
// gets the most value out of it). Shared by the finale's natural end
// (updateSpiritFinale's 'firing' case) and Primeval Creation's early
// transform into Photokrystos (updatePrimevalSummonEffect) - both represent
// the normal Spirit's life ending. Launch effects: a tight implosion of pink
// light, then a sharp starlight-shaped flash as it's ejected.
function _launchSpinner(x, y) {
    const _spinTarget = _pickDensestEnemy();
    // No enemies on screen: a random angle instead of a fixed direction - a
    // fixed straight-up launch means vx is always exactly 0, so the Spinner
    // just bounces up and down along one vertical line forever instead of
    // covering the screen.
    const _spinAngle = _spinTarget
        ? Math.atan2(_spinTarget.y - y, _spinTarget.x - x)
        : Math.random() * Math.PI * 2;
    const _spinSpeed = 15 * 1.15; // 15 = old bouncing ball's speed, +15%
    spiritSpinners.push({
        x, y, size: 56 * 1.5, // was 1.35, bumped bigger again
        vx: Math.cos(_spinAngle) * _spinSpeed, vy: Math.sin(_spinAngle) * _spinSpeed,
        spawnAt: performance.now(), lifetime: 5000,
        bounceBoostEnd: 0, lastArcTick: 0,
        _statSrc: 'Skill S: Spinner',
    });
    addExplosion(x, y, 22, '#ff44aa');
    createParticles(x, y, 18, '#ffffff', 5, 12);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('photokrystos-boomerang-throw', x, y);
}

