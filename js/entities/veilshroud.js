// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/entities/veilshroud.js — Veilshroud's phantom/lightning kit and its
// Echo (post-death lingering hazard). Extracted from entities.js. Must load
// after entities.js and before main.js.

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
        phantomCheckTimer: 0,
        phantomCheckInterval: 450,
        // Lightning after phantom exit
        lightningPending: false,
        lightningCountdown: 0,
        lightningCountdownDuration: 1500,
        lightningTargetX: 0,
        lightningTargetY: 0,
        lightningTargetRef: null,
        // Normal attack (−20% speed → interval × 1.25)
        shootTimer: 0,
        shootInterval: 500,
        // Energy Accumulation: tracks damage absorbed during Phantom
        _phantomAbsorb: 0,
    });
}

// VEILSHROUD UPDATE
function updateVeilshroud(enemy, deltaTime) {
    const dt = deltaTime / 16.67;

    // Movement (không di chuyển trong phantom)
    if (!enemy.inPhantom) {
        enemy.y += enemy.speed * dt;
    }

    // Va chạm người chơi
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.hitRadius) {
        playerTakesHit(enemy);
    }

    // Phantom check (chỉ khi không pending lightning)
    if (!enemy.inPhantom && !enemy.lightningPending) {
        enemy.phantomCheckTimer += deltaTime;
        if (enemy.phantomCheckTimer >= enemy.phantomCheckInterval) {
            enemy.phantomCheckTimer = 0;
            if (Math.random() < 0.40) {
                enemy.inPhantom = true;
                enemy.phantomTimer = 0;
                enemy._phantomAbsorb = 0;
            }
        }
    }

    // Phantom state duration
    if (enemy.inPhantom) {
        enemy.phantomTimer += deltaTime;
        if (enemy.phantomTimer >= enemy.phantomDuration) {
            enemy.inPhantom = false;
            enemy.phantomTimer = 0;
            enemy.phantomFadeTimer = 400;
            // Energy Accumulation: convert absorbed damage into shield
            const _eaAbsorbed = enemy._phantomAbsorb || 0;
            const _eaShield = Math.min(1200, Math.ceil((0.35 * _eaAbsorbed + 200) * 1.15));
            _addEnemyShield(enemy, _eaShield);
            enemy._phantomAbsorb = 0;
            _veilshroudBeginLightning(enemy);
        }
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
            enemy.lightningPending = false;
            enemy.lightningCountdown = 0;
            enemy.lightningTargetRef = null;
        }
    }

    // Normal attack: volley 2 viên / 400ms (không bắn khi phantom hoặc đang countdown)
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
}

function _veilshroudStrike(enemy) {
    const tx = enemy.lightningTargetX;
    const ty = enemy.lightningTargetY;
    // Lưu vị trí sét cuối để render vòng đỏ lưu lại sau khi đánh
    enemy._lastLightningX = tx;
    enemy._lastLightningY = ty;
    enemy._lastLightningTime = performance.now();

    // Tạo object sét, lưu targets bị trúng để render hiệu ứng riêng
    if (!window._veilshroudLightnings) window._veilshroudLightnings = [];
    const _lt = {
        x: tx, y: ty,
        life: 700, maxLife: 700,
        strikeRadius: 100,
        hitSentinelPositions: [],  // {x,y} mỗi sentinel bị trúng
        hitPlayer: false,
        playerHitPos: null,
    };
    window._veilshroudLightnings.push(_lt);

    _setShake(9, 350);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('phantom-strike', tx, ty);

    // Trúng người chơi
    if (Math.hypot(player.x - tx, player.y - ty) < player.hitRadius + 30) {
        _lt.hitPlayer = true;
        _lt.playerHitPos = { x: player.x, y: player.y };
        if (!_yuushaPierceRedirect(0.18, true)) playerTakesHit(enemy);
        addExplosion(player.x, player.y, 90, '#ff0033');
        createParticles(player.x, player.y, 35, '#ffffff', 4, 14);
        createParticles(player.x, player.y, 20, '#ff3355', 2, 8);
        _setShake(18, 500);
    }

    // Trúng sentinel trong phạm vi 100px
    for (const s of sentinels) {
        if (Math.hypot(s.x - tx, s.y - ty) < 100) {
            _lt.hitSentinelPositions.push({ x: s.x, y: s.y });
            const dmg = Math.ceil(s.maxHp * 0.18);
            dealDamage(s, { damage: dmg, percentDamage: 0, _vanguardTag: 'veil_lightning_' + tx, _noHitSfx: true });
            addExplosion(s.x, s.y, 60, '#ff1133');
            createParticles(s.x, s.y, 22, '#ffffff', 3, 10);
            createParticles(s.x, s.y, 14, '#ff3355', 2, 7);
        }
    }
    createParticles(tx, ty, 35, '#ff1133', 3, 10);
}

function _veilshroudFireVolley(enemy) {
    const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
    if (!target) return;
    const baseAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    for (let i = 0; i < 2; i++) {
        const a = baseAngle + (i - 0.5) * 0.22;
        const bulletHp = Math.max(10, Math.ceil(enemy.maxHp * 0.012));
        enemies.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(a) * 4.8, vy: Math.sin(a) * 4.8,
            damage: 2, size: 9,
            hp: bulletHp, maxHp: bulletHp,
            type: 'enemy_bullet', shield: 0, ownerRef: enemy
        });
    }
}

// VEILSHROUD ECHO UPDATE
function updateVeilshroudEcho(enemy, deltaTime) {
    enemy.echoTimer += deltaTime;

    // 0–3s: bắn đạn nhanh hơn (222ms, −10% fire rate so với 200ms gốc)
    if (enemy.echoTimer < 3000) {
        enemy.echoShootTimer += deltaTime;
        if (enemy.echoShootTimer >= (enemy.echoShootInterval || 222)) {
            enemy.echoShootTimer = 0;
            const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
            if (target) {
                const baseAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
                for (let i = 0; i < 2; i++) {
                    const a = baseAngle + (i - 0.5) * 0.22;
                    const bulletHp = Math.max(10, Math.ceil(enemy.echoOriginMaxHp * 0.012));
                    enemies.push({
                        x: enemy.x, y: enemy.y,
                        vx: Math.cos(a) * 4.8, vy: Math.sin(a) * 4.8,
                        damage: 2, size: 9,
                        hp: bulletHp, maxHp: bulletHp,
                        type: 'enemy_bullet', shield: 0, ownerRef: enemy
                    });
                }
            }
        }
    }

    // 5s: phát nổ
    if (enemy.echoTimer >= 5000 && !enemy.echoExplosionDone) {
        enemy.echoExplosionDone = true;
        _veilshroudEchoExplode(enemy);
        enemy.hp = 0; // xóa echo
    }
}

function _veilshroudEchoExplode(enemy) {
    const x = enemy.x, y = enemy.y, r = 300;
    addExplosion(x, y, 60, '#aa00ff');
    _setShake(12, 500);
    createParticles(x, y, 50, '#cc44ff', 2, 10);

    // Tạo vùng nổ tick
    if (!window._veilshroudExplosions) window._veilshroudExplosions = [];
    window._veilshroudExplosions.push({
        x, y,
        radius: r,
        life: 2000, maxLife: 2000,
        tickTimer: 0, tickInterval: 500,
        hitPlayerThisTick: false,
        originMaxHp: enemy.echoOriginMaxHp,
    });
}
