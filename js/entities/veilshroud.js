// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// js/entities/veilshroud.js — Veilshroud's phantom/lightning kit and its
// Echo (post-death lingering hazard, the Phantom Portal). Extracted from
// entities.js. Must load after entities.js and before main.js.

// Blast radius of the Phantom Portal's final collapse (was 300, +15%).
const VEIL_ECHO_BLAST_RADIUS = 345;

// Flat armor Veilshroud adds on top of its % DR, in the shared flat armor pool of dealDamage.
const VEILSHROUD_FLAT_DR = 30;

// Phantom Cycle: the next Phantom starts this long after the last one ended. It never rolls and never answers a hit.
const VEILSHROUD_CYCLE_MS = 3500;
const VEILSHROUD_FIRST_PHANTOM_MS = 2500;
// Veil Thresholds: HP fractions that each force one extra Phantom the first time it drops under them.
const VEILSHROUD_THRESHOLDS = [0.75, 0.50, 0.25];
// Static Veil: after each Phantom a field around Veilshroud scrambles incoming ally projectiles.
// Each projectile is rolled once, the first moment it is inside the field.
const STATIC_VEIL_MS = 3000;
const STATIC_VEIL_RADIUS = 170;
const STATIC_VEIL_SHOT_ERASE = 0.50;   // ship, Sentinel and spirit shots
const STATIC_VEIL_OTHER_ERASE = 0.15;  // every other ally projectile, such as Arc Blades
// Void Strike hits two columns: the first mark and one this far to its side.
const VEIL_STRIKE_SIDE_MIN = 200, VEIL_STRIKE_SIDE_SPAN = 80, VEIL_STRIKE_EDGE = 70;

function spawnVeilshroud() {
    const baseSize = 20 + Math.random() * 10;
    const size = baseSize * 5; // ~100–150px, bằng Thaelis
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    const hp = Math.ceil(Math.min(3300, 1320 + hpFromTime * 66) * 1.15 * _walpurgisHpMult()); // +15% global HP buff
    enemies.push({
        x: Math.random() * (canvas.width - size) + size / 2,
        y: -size,
        size,
        speed: 2.0,
        hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'veilshroud',
        // Phantom mechanic
        inPhantom: false,
        phantomTimer: 0,
        phantomDuration: 1500,
        phantomCheckTimer: VEILSHROUD_CYCLE_MS - VEILSHROUD_FIRST_PHANTOM_MS,
        phantomCheckInterval: VEILSHROUD_CYCLE_MS,
        // Lightning after phantom exit
        lightningPending: false,
        lightningCountdown: 0,
        lightningCountdownDuration: 1500,
        lightningTargetX: 0,
        lightningTargetY: 0,
        lightningTargetRef: null,
        // Normal volley cadence
        shootTimer: 0,
        shootInterval: 450,
        // Energy Accumulation: tracks damage absorbed during Phantom
        _phantomAbsorb: 0,
    });
    _enemySnapshotAtk(enemies[enemies.length - 1], 'veilshroud');
}

// Plays a Phantom cue for a Veilshroud or for Goliath's Veilshroud copy state. Each holder keeps one of two key slots
// so two Phantoms changing state in the same frame are not dropped by the per-key repeat guard. Returns the voice handle.
function _phantomCue(name, holder, x, y, slot) {
    if (!window.AudioMgr) return null;
    if (slot === undefined) {
        if (holder._phSlot === undefined) holder._phSlot = window._phantomSlotCtr = ((window._phantomSlotCtr | 0) + 1) & 1;
        slot = holder._phSlot;
    }
    return window.AudioMgr.playSfxAt(slot ? name + '-b' : name, x, y) || null;
}

// Cuts the hold and charge voices of a holder with a short fade. Safe to call when neither is playing.
function _phantomStopVoices(holder) {
    if (holder._phHoldVoice) { holder._phHoldVoice.cancel(0.08); holder._phHoldVoice = null; }
    if (holder._phChargeVoice) { holder._phChargeVoice.cancel(0.08); holder._phChargeVoice = null; }
}

// VEILSHROUD UPDATE
function updateVeilshroud(enemy, deltaTime) {
    const dt = deltaTime / 16.67;

    // Movement (không di chuyển trong phantom)
    const capX = enemy.x, capY = enemy.y;
    if (!enemy.inPhantom) {
        const _phoneSpeedMul = window._deviceTier === 'phone' ? 0.88 : 1.0;
        enemy.y += enemy.speed * _phoneSpeedMul * dt;
    }

    _capHoldBody(enemy, capX, capY);

    // The exit burst counts simulation time and cancels on Phantom reentry.
    if (enemy.type === 'veilshroud' && enemy._voidBurstTimer > 0) {
        if (enemy.hp <= 0 || enemy.inPhantom || !enemies.includes(enemy)) {
            enemy._voidBurstTimer = 0;
        } else {
            enemy._voidBurstTimer = Math.max(0, enemy._voidBurstTimer - deltaTime);
            if (enemy._voidBurstTimer === 0) {
                for (let i = 0; i < 10; i++) {
                    _veilshroudFireBullet(enemy, i * Math.PI * 2 / 10, 4.8 * 0.60);
                }
                _phantomCue('phantom-exit', enemy, enemy.x, enemy.y);
            }
        }
    }

    // Va chạm người chơi
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.hitRadius) {
        playerTakesHit(enemy);
    }

    // Phantom Cycle: the clock runs from the end of the last Phantom, and the next one waits for any lightning countdown to finish.
    if (!enemy.inPhantom) {
        enemy.phantomCheckTimer += deltaTime;
        if (enemy.phantomCheckTimer >= enemy.phantomCheckInterval && !enemy.lightningPending) {
            enemy.phantomCheckTimer = 0;
            enemy.inPhantom = true;
            enemy.phantomTimer = 0;
            enemy._phantomAbsorb = 0;
        }
    }
    // Veil Thresholds: dropping under each HP mark forces one Phantom, as soon as no lightning countdown is running.
    if (enemy.type === 'veilshroud' && enemy.hp > 0) {
        const frac = enemy.hp / enemy.maxHp;
        for (let i = 0; i < VEILSHROUD_THRESHOLDS.length; i++) {
            if (frac <= VEILSHROUD_THRESHOLDS[i] && !(enemy._veilThrDone & (1 << i))) {
                enemy._veilThrDone = (enemy._veilThrDone | (1 << i));
                enemy._veilThrPending = true;
            }
        }
        if (enemy._veilThrPending && !enemy.inPhantom && !enemy.lightningPending) {
            enemy._veilThrPending = false;
            enemy.phantomCheckTimer = 0;
            enemy.inPhantom = true;
            enemy.phantomTimer = 0;
            enemy._phantomAbsorb = 0;
        }
    }
    if (enemy.type === 'veilshroud') _staticVeilErase(enemy);

    // Phantom state duration
    if (enemy.inPhantom) {
        enemy.phantomTimer += deltaTime;
        if (enemy.phantomTimer >= enemy.phantomDuration) {
            enemy.inPhantom = false;
            enemy.phantomTimer = 0;
            enemy.phantomFadeTimer = 400;
            // Energy Accumulation: convert absorbed damage into shield
            const _eaAbsorbed = enemy._phantomAbsorb || 0;
            const _eaShield = Math.min(1500, Math.ceil((0.50 * _eaAbsorbed + 280) * 1.15));
            _addEnemyShield(enemy, _eaShield);
            enemy._phantomAbsorb = 0;
            if (enemy.type === 'veilshroud' && enemy.hp > 0 && enemies.includes(enemy)) {
                enemy._voidBurstTimer = 400;
                enemy._veilGuardUntil = gameElapsedTime + 750;
                enemy._staticVeilEnd = gameElapsedTime + STATIC_VEIL_MS;
                enemy._staticVeilId = (window._staticVeilSeq = (window._staticVeilSeq || 0) + 1);
            }
            _veilshroudBeginLightning(enemy);
        }
    }

    // Cues follow the state, so every way into Phantom is covered
    if (enemy.inPhantom && !enemy._phCued) {
        enemy._phCued = true;
        _phantomCue('phantom-enter', enemy, enemy.x, enemy.y);
        enemy._phHoldVoice = _phantomCue('phantom-hold', enemy, enemy.x, enemy.y);
    } else if (!enemy.inPhantom && enemy._phCued) {
        enemy._phCued = false;
        if (enemy._phHoldVoice) { enemy._phHoldVoice.cancel(0.08); enemy._phHoldVoice = null; }
        _phantomCue('phantom-exit', enemy, enemy.x, enemy.y);
    }

    // Post-phantom color fade-out
    if (!enemy.inPhantom && (enemy.phantomFadeTimer || 0) > 0) {
        enemy.phantomFadeTimer = Math.max(0, enemy.phantomFadeTimer - deltaTime);
    }

    // Lightning countdown & strike
    if (enemy.lightningPending) {
        enemy.lightningCountdown += deltaTime;
        // Vị trí vòng mục tiêu cố định tại chỗ đặt, không dí theo player
        if (enemy.lightningCountdown >= enemy.lightningCountdownDuration) {
            _veilshroudStrike(enemy);
            enemy._phChargeVoice = null;
            enemy.lightningPending = false;
            enemy.lightningCountdown = 0;
            enemy.lightningTargetRef = null;
        }
    }

    // Normal volleys fire every 450ms outside Phantom and the lightning countdown.
    if (!enemy.inPhantom && !enemy.lightningPending) {
        enemy.shootTimer += deltaTime;
        if (enemy.shootTimer >= enemy.shootInterval) {
            enemy.shootTimer = 0;
            _veilshroudFireVolley(enemy);
        }
    }
}

function _veilshroudBeginLightning(enemy) {
    // Chọn target ngẫu nhiên từ sentinels + player
    const pool = [...sentinels];
    pool.push(player);
    const target = pool[Math.floor(Math.random() * pool.length)];
    enemy.lightningPending = true;
    enemy.lightningCountdown = 0;
    enemy.lightningTargetRef = target;
    enemy.lightningTargetX = target.x;
    enemy.lightningTargetY = target.y;
    // the second mark sits to the side of the first, so a gap between the two columns always stays open
    const side = Math.random() < 0.5 ? -1 : 1, step = VEIL_STRIKE_SIDE_MIN + Math.random() * VEIL_STRIKE_SIDE_SPAN;
    let x2 = target.x + side * step;
    if (x2 < VEIL_STRIKE_EDGE || x2 > canvas.width - VEIL_STRIKE_EDGE) x2 = target.x - side * step;
    enemy.lightningTarget2X = Math.max(VEIL_STRIKE_EDGE, Math.min(canvas.width - VEIL_STRIKE_EDGE, x2));
    enemy.lightningTarget2Y = target.y;
    _phantomCue('phantom-lock', enemy, target.x, target.y);
    enemy._phChargeVoice = _phantomCue('phantom-charge', enemy, target.x, target.y);
}

// Void Strike lands on both marked columns together.
function _veilshroudStrike(enemy) {
    _veilshroudStrikeAt(enemy, enemy.lightningTargetX, enemy.lightningTargetY);
    if (enemy.lightningTarget2X !== undefined) _veilshroudStrikeAt(enemy, enemy.lightningTarget2X, enemy.lightningTarget2Y);
}

// Static Veil: ally projectiles inside the field are rolled once and erased on a hit of the dice.
function _staticVeilErase(enemy) {
    if (!(gameElapsedTime < (enemy._staticVeilEnd || 0)) || !(enemy.hp > 0)) return;
    const id = enemy._staticVeilId, r2 = STATIC_VEIL_RADIUS * STATIC_VEIL_RADIUS, ex = enemy.x, ey = enemy.y;
    const lists = [[bullets, STATIC_VEIL_SHOT_ERASE], [spiritBullets, STATIC_VEIL_SHOT_ERASE],
        [bladeArcProjectiles, STATIC_VEIL_OTHER_ERASE], [scatteredProjectiles, STATIC_VEIL_OTHER_ERASE]];
    for (let li = 0; li < lists.length; li++) {
        const list = lists[li][0], chance = lists[li][1];
        for (let j = list.length - 1; j >= 0; j--) {
            const b = list[j];
            if (b._staticVeilId === id || !Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
            const dx = b.x - ex, dy = b.y - ey;
            if (dx * dx + dy * dy > r2) continue;
            b._staticVeilId = id;
            if (Math.random() >= chance) continue;
            if (!_mobPerf && Math.random() < 0.6) createParticles(b.x, b.y, 2, '#b78cff', 1, 4);
            list.splice(j, 1);
        }
    }
}

function _veilshroudStrikeAt(enemy, tx, ty) {
    // Lưu vị trí sét cuối để render vòng đỏ lưu lại sau khi đánh
    enemy._lastLightningX = tx;
    enemy._lastLightningY = ty;
    enemy._lastLightningTime = performance.now();

    // Tạo object sét, lưu targets bị trúng để render hiệu ứng riêng
    if (!window._veilshroudLightnings) window._veilshroudLightnings = [];
    const _lt = {
        x: tx, y: ty, ownerRef: enemy,
        life: 700, maxLife: 700,
        strikeRadius: 100,
        hitSentinelPositions: [],  // {x,y} mỗi sentinel bị trúng
        hitPlayer: false,
        playerHitPos: null,
    };
    const capStopped = _capShields(enemy.x, enemy.y, tx, ty, 'laser', enemy);
    if (capStopped) { _lt.x = _capCross.x; _lt.y = _capCross.y; enemy._lastLightningX = _lt.x; enemy._lastLightningY = _lt.y; }
    window._veilshroudLightnings.push(_lt);

    _setShake(9, 350);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('phantom-strike', tx, ty);

    // Trúng người chơi
    if (Math.hypot(player.x - tx, player.y - ty) < player.hitRadius + 30 && !capStopped && !_capBlocksSource(enemy, player) && !_capShields(tx, ty, player.x, player.y, 'area', enemy)) {
        _lt.hitPlayer = true;
        _lt.playerHitPos = { x: player.x, y: player.y };
        if (!_yuushaPierceRedirect(enemy.atk || 0, false, enemy)) playerTakesHit(enemy);
        addExplosion(player.x, player.y, 90, '#ff0033');
        createParticles(player.x, player.y, 35, '#ffffff', 4, 14);
        createParticles(player.x, player.y, 20, '#ff3355', 2, 8);
        _setShake(18, 500);
    }

    // Trúng sentinel trong phạm vi 100px
    for (const s of sentinels) {
        if (Math.hypot(s.x - tx, s.y - ty) < 100 && !capStopped && !_capBlocksSource(enemy, s) && !_capShields(tx, ty, s.x, s.y, 'area', enemy)) {
            _lt.hitSentinelPositions.push({ x: s.x, y: s.y });
            // ATK category (docs/combat-scaling-rebalance.md Part 2): snapshotted
            // at launch, so a delayed post-death strike still uses the host's
            // real atk instead of reading a since-removed enemy.
            dealDamage(s, { damage: enemy.atk || 0, percentDamage: 0, _vanguardTag: 'veil_lightning_' + tx, _capSource: enemy, _noHitSfx: true });
            addExplosion(s.x, s.y, 60, '#ff1133');
            createParticles(s.x, s.y, 22, '#ffffff', 3, 10);
            createParticles(s.x, s.y, 14, '#ff3355', 2, 7);
        }
    }
    createParticles(_lt.x, _lt.y, 35, '#ff1133', 3, 10);
}

function _veilshroudFireVolley(enemy) {
    const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
    if (!target) return;
    const baseAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    for (let i = 0; i < 2; i++) {
        const a = baseAngle + (i - 0.5) * 0.22;
        _veilshroudFireBullet(enemy, a, 5.3);
    }
}

function _veilshroudFireBullet(enemy, a, speed) {
    const bulletHp = Math.max(10, Math.ceil(enemy.maxHp * 0.012));
    enemies.push({
        x: enemy.x, y: enemy.y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        // Own-Max-HP category (docs/combat-scaling-rebalance.md Part 2):
        // damage is a slice of Veilshroud's own bounded Max HP, decoupled
        // from bulletHp, which stays a pure interception pool.
        damage: 0.012 * _enemyHs(enemy), size: 9,
        hp: bulletHp, maxHp: bulletHp,
        type: 'enemy_bullet', shield: 0, ownerRef: enemy
    });
}

// VEILSHROUD ECHO UPDATE (Phantom Portal)
function updateVeilshroudEcho(enemy, deltaTime) {
    enemy.echoTimer += deltaTime;

    // 0–3s: instead of firing bullets, the rift spits out real apostles,
    // 2 every 600ms, each born straight out of the crack rather than
    // falling from off-screen. Each one telegraphs first (a dark patch
    // marking exactly where it'll appear) instead of just popping in.
    if (enemy.echoTimer < 3000) {
        enemy.echoShootTimer += deltaTime;
        if (enemy.echoShootTimer >= (enemy.echoShootInterval || 600)) {
            enemy.echoShootTimer = 0;
            const apostleHp = Math.max(60, Math.ceil((enemy.echoPhantomDmg || 0) * 0.30));
            if (!window._veilshroudPendingApostles) window._veilshroudPendingApostles = [];
            for (let i = 0; i < 2; i++) {
                const a = Math.random() * Math.PI * 2;
                const dist = enemy.size * (0.3 + Math.random() * 0.3);
                const size = 20 + Math.random() * 10;
                window._veilshroudPendingApostles.push({
                    x: enemy.x + Math.cos(a) * dist, y: enemy.y + Math.sin(a) * dist,
                    size, hp: apostleHp,
                    countdown: 450, duration: 450,
                });
            }
        }
    }

    // 5s: the rift collapses
    if (enemy.echoTimer >= 5000 && !enemy.echoExplosionDone) {
        enemy.echoExplosionDone = true;
        _veilshroudEchoExplode(enemy);
        enemy.hp = 0; // xóa echo
    }
}

function _veilshroudEchoExplode(enemy) {
    const x = enemy.x, y = enemy.y, r = VEIL_ECHO_BLAST_RADIUS;
    // Bright white core flash first (the collapse itself), violet burst after
    addExplosion(x, y, r * 0.5, '#ffffff');
    addExplosion(x, y, 90, '#aa00ff');
    if (window.AudioMgr) window.AudioMgr.playSfxAt('veilshroud-portal-collapse', x, y);
    _setShake(20, 600);
    createParticles(x, y, 70, '#cc44ff', 3, 13);
    createParticles(x, y, 30, '#ffffff', 2, 9);

    // The collapse erases any ally-side projectile caught in it, arc blades included
    bullets = bullets.filter(b => Math.hypot(b.x - x, b.y - y) >= r || _capBlocksSource(enemy, b, 'area'));
    bladeArcProjectiles = bladeArcProjectiles.filter(p => Math.hypot(p.x - x, p.y - y) >= r || _capBlocksSource(enemy, p, 'area'));

    // Caught in the collapse: -1 life outright, same save-system stack as
    // any other hit (Dream Realm, Great Sage, Yog-Sothoth, Skill A's own
    // defensive orb, Final Defense all still get first say via playerTakesHit).
    if (Math.hypot(player.x - x, player.y - y) < r) {
        playerTakesHit(enemy);
    }

    // Tạo vùng nổ tick
    if (!window._veilshroudExplosions) window._veilshroudExplosions = [];
    window._veilshroudExplosions.push({
        x, y,
        radius: r,
        life: 2000, maxLife: 2000,
        tickTimer: 0, tickInterval: 500,
        hitPlayerThisTick: false,
        originMaxHp: enemy.echoOriginMaxHp,
        // Own-Max-HP category (docs/combat-scaling-rebalance.md Part 2): Hs is
        // computed from the original host's real maxHp/h0, snapshotted onto
        // the echo at creation, never the echo's own placeholder 9999 maxHp.
        hs: Math.min(enemy.echoOriginMaxHp || enemy._h0 || 0, 2 * (enemy._h0 || enemy.echoOriginMaxHp || 0)),
        _shockwaveAge: 0, // drives the expanding ring in _drawVeilshroudEffects
    });
}
