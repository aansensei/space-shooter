// Returns true if the hit was absorbed by the arcShield
function checkMarchosiasArcShield(enemy, source, bx, by) {
    if (enemy.type !== 'marchosias' || !enemy.arcShield || enemy.arcShield.hp <= 0) return false;
    const bulletAngle = Math.atan2(by - enemy.y, bx - enemy.x);
    let diff = bulletAngle - enemy.arcShield.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) >= Math.PI / 4) return false; // outside 90° arc

    // Damage khiên — 50% DR, KHÔNG damage Mar
    const effectiveHp = enemy.arcShield.maxHp;
    let dmg = Math.ceil((source.damage || 0) + (effectiveHp * (source.percentDamage || 0)));
    if (gloryForJusticeActive) dmg = Math.ceil(dmg * 1.55);
    dmg = Math.ceil(dmg * 0.50);
    const shieldWasAlive = enemy.arcShield.hp > 0;
    enemy.arcShield.hp = Math.max(0, enemy.arcShield.hp - dmg);

    // Mỗi đòn trúng khiên: 10% chance kích hoạt Sword
    if (Math.random() < 0.10) {
        _tryTriggerMarchosiasCounter(enemy);
    }

    // Khiên vừa vỡ → kích hoạt luôn
    if (shieldWasAlive && enemy.arcShield.hp <= 0) {
        addExplosion(enemy.x, enemy.y, enemy.size * 0.7, '#00ff88');
        _tryTriggerMarchosiasCounter(enemy);
    }

    createParticles(bx, by, 3, '#aaffaa', 1, 4);
    return true; // đạn bị hấp thụ, KHÔNG damage Mar
}

// Kích hoạt Sword — không giới hạn số lần, có thể chạy song song nhiều windup
// Cooldown 0.75s giữa các lần trigger để tránh spam
function _tryTriggerMarchosiasCounter(enemy) {
    const now = performance.now();
    if (!enemy.marchosiasWindups) enemy.marchosiasWindups = [];
    // Cooldown 0.75s kể từ lần trigger gần nhất
    if (enemy.lastSwordTriggerTime && now - enemy.lastSwordTriggerTime < 650) return;
    enemy.lastSwordTriggerTime = now;
    enemy.marchosiasWindups.push({
        timer: 1000,
        target: { x: player.x, y: player.y }
    });
}

// Khi HP Mar <= 1% — bắn tất cả Sword còn thiếu ngay lập tức (dùng delay system)
function _fireMarchosiasDeathSwords(enemy) {
    if (!enemy.marchosiasWindups) enemy.marchosiasWindups = [];

    // Số windup đang pending
    const pendingWindups = enemy.marchosiasWindups.length;
    // Nếu không có gì đang pending thì tạo 3 đòn ngay
    const toFire = Math.max(1, 3 - pendingWindups);

    for (let i = 0; i < toFire; i++) {
        const spread = (i - (toFire - 1) / 2) * 0.22;
        const baseAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const angle = baseAngle + spread;
        marchosiasBlades.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(angle) * 13.2, vy: Math.sin(angle) * 13.2,
            angle: angle, radius: 88,
            delay: 1000, active: false,
            hitEnemies: [], hitPlayer: false,
            originX: enemy.x, originY: enemy.y,
        });
    }
}

// ── VULNERABILITY (Trọng Thương) ──────────────────────────────
function applyVulnerability(enemy) {
    const now = performance.now();
    const stacks = (enemy.vulnStacks || 0);
    if (stacks < 3) {
        // Lập tức giảm 24% khiên hiện tại
        if (enemy.shield > 0) {
            enemy.shield = Math.max(0, Math.floor(enemy.shield * 0.76));
        }
        enemy.vulnStacks = stacks + 1;
    }
    // Reset lại thời gian 3 giây mỗi khi cộng dồn
    enemy.vulnEndTime = now + 3000;
}

function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.hypot(p.x - projX, p.y - projY);
}

function handleEnemyKill(enemy) {
    score = Math.ceil(score + enemy.maxHp * 10);
    if (score >= nextLifeMilestone) {
        lives++;
        nextLifeMilestone += 500000;
        createParticles(player.x, player.y, 50, 'lime', 3, 8);
    }
    addExplosion(enemy.x, enemy.y, enemy.size);

    // Envy: nếu kẻ địch bị kill mang dấu Envy → báo cho Leviathan
    if (enemy.hasEnvy && enemy.envyLev && !enemy.envyLev.afoShieldBroken) {
        const lev = enemy.envyLev;
        lev.afoEnvyKills = (lev.afoEnvyKills || 0) + 1;
        // Projectile bay vào khiên Leviathan (visual)
        particles.push({
            isEnvyImpact: true,
            x: enemy.x, y: enemy.y,
            tx: lev.x, ty: lev.y,
            progress: 0, speed: 0.04,
            color: '#ff4444'
        });
    }

    killCountForPassive++;
    // 30% cơ hội nhận thêm 1 điểm kill (tiến nhanh hơn tới mốc 4)
    if (Math.random() < 0.30) killCountForPassive++;
    if (killCountForPassive % 4 === 0) {
        spawnSentinel(player.x, player.y, false);
    }

    if (skillGCharge < 100) {
        skillGCharge = Math.min(100, skillGCharge + 0.5);
    }
    if (skillGActive) {
        spawnEnergyOrb(enemy.x, enemy.y);
    }
}

function fireAutoShot() {
    const fireRateMultiplier = gloryForJusticeActive ? 1.40 : 1;
    if (performance.now() - lastAutoFire < autoFireInterval / fireRateMultiplier) return;
    lastAutoFire = performance.now();

    const speedMultiplier = gloryForJusticeActive ? 1.25 : 1;
    const numBullets = 5, spreadAngle = Math.PI / 4;
    const startAngle = -spreadAngle / 2, angleStep = spreadAngle / (numBullets - 1);
    const baseAngle = -Math.PI / 2;
    for (let i = 0; i < numBullets; i++) {
        const angle = baseAngle + startAngle + (i * angleStep);
        bullets.push({
            x: player.x, y: player.y - player.height / 2,
            vx: Math.cos(angle) * 11.2 * speedMultiplier, vy: Math.sin(angle) * 11.2 * speedMultiplier,
            damage: 6, percentDamage: 0.04, size: 6.5, type: 'player_auto',
            applyVuln: true, vulnChance: 0.25  // 25% khả năng gây Trọng Thương
        });
    }
}

function fireChargedBullet(multiplier) {
    const baseSize = 5;
    bullets.push({
        x: player.x, y: player.y - player.height / 2,
        vx: 0, vy: -10,
        damage: multiplier, size: (baseSize * multiplier) * 1.1,
        type: 'player_charged', hitEnemies: []
    });
    createParticles(player.x, player.y - player.height / 2, 3, 'yellow', 2, 4);
}

function spawnEnemy() {
    const elapsedSec = gameElapsedTime / 1000; // Dùng game time (bị slow bởi Yog-Sothoth)

    const dargruelCount = enemies.filter(e => e.type === 'boss').length;
    const thaelisCount = enemies.filter(e => e.type === 'thaelis').length;
    const aegisCount = enemies.filter(e => e.type === 'aegis_core').length;
    const marchosiasCount = enemies.filter(e => e.type === 'marchosias').length;
    const leviathanCount = enemies.filter(e => e.type === 'leviathan').length;
    const totalElite = dargruelCount + thaelisCount + aegisCount + marchosiasCount + leviathanCount;

    if (elapsedSec < 20) {
        spawnNormalEnemy();
        return;
    }

    if (elapsedSec < 30) {
        const marchosiasCountEarly = enemies.filter(e => e.type === 'marchosias').length;
        const tEarly = Math.min(1, (elapsedSec - 20) / 10);
        if (marchosiasCountEarly < 1 && Math.random() < 0.04 + tEarly * 0.04) {
            spawnMarchosias(); return;
        }
        spawnNormalEnemy();
        return;
    }

    const t = Math.min(1, (elapsedSec - 30) / 210);

    const dargruelRate = 0.04 + t * 0.09;
    const aegisRate = 0.06 + t * 0.08;
    const thaelisRate = 0.12 + t * 0.13;
    const marchosiasRate = 0.05 + t * 0.08;

    // Leviathan: unlock sau 36s, không có cooldown riêng
    const leviathanRate = elapsedSec >= 36 ? (0.02 + t * 0.04) : 0;

    const canSpawnDargruel = dargruelCount < 2 && totalElite < 6;
    const canSpawnAegis = aegisCount < 2 && totalElite < 6;
    const canSpawnThaelis = thaelisCount < 3 && totalElite < 6;
    const canSpawnMarchosias = marchosiasCount < 2 && totalElite < 6;
    const canSpawnLeviathan = leviathanCount < 1 && totalElite < 6;

    const rand = Math.random();
    let cursor = 0;

    if (canSpawnLeviathan && leviathanRate > 0 && rand < (cursor += leviathanRate)) {
        spawnLeviathan(); return;
    }
    if (canSpawnDargruel && rand < (cursor += dargruelRate)) {
        spawnDargruel(); return;
    }
    if (canSpawnAegis && rand < (cursor += aegisRate)) {
        spawnAegisCore(); return;
    }
    if (canSpawnThaelis && rand < (cursor += thaelisRate)) {
        spawnThaelis(); return;
    }
    if (canSpawnMarchosias && rand < (cursor += marchosiasRate)) {
        spawnMarchosias(); return;
    }

    spawnNormalEnemy();
}

function spawnDargruel() {
    const baseSize = (20 + Math.random() * 10);
    const size = baseSize * 10;
    // Base HP tăng thêm 12%
    let hp = ((((100 + Math.random() * 300) * 10) * 0.8) * 1.3) * 1.15 * 1.12;
    hp *= 1.05;
    enemies.push({
        x: Math.random() * (canvas.width - size) + size / 2, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.8 * 0.85, hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'boss', shootTimer: (autoFireInterval * 2) * 0.75,
        demonGift70Triggered: false, demonGift50Triggered: false,
        demonGift40Triggered: false, demonGift10Triggered: false, demonGift1Triggered: false
    });
}

function spawnThaelis() {
    const baseSize = (20 + Math.random() * 10);
    const size = baseSize * 5;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.min(680, 300 + hpFromTime * 12);
    enemies.push({
        x: Math.random() * (canvas.width - size) + size / 2, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.8 * 0.80 * 0.80,
        hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'thaelis', shootTimer: 1000, reincarnated: false
    });
}

function spawnAegisCore() {
    const baseSize = (20 + Math.random() * 10);
    const size = ((baseSize * 5) / 2) * 0.7;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.min(750, 400 + hpFromTime * 15);
    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.4, hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'aegis_core', shootTimer: 0,
        aegisInvulnerable: true, aegisShieldReceived: false
    });
}

function spawnMarchosias() {
    const baseSize = (20 + Math.random() * 10);
    const size = baseSize * 5;
    const speed = (1 + Math.random() * 2) * 0.4 * 0.9;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.min(2200, 1000 + hpFromTime * 30);

    const shieldHp = hp;

    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size, y: -size,
        size, speed, hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'marchosias',
        shootTimer: 1000,
        DR: 0.20,
        arcShield: {
            hp: shieldHp,
            maxHp: shieldHp,
            angle: 0,
            rotSpeed: 0.018,
            hitCount: 0,
        },
        counterState: null,
        counterTimer: 0,
        counterTarget: null,
        marchosiasBlades: [],
    });
}

function spawnMarchosiasMinion(parentX, parentY, parentMaxHp) {
    const size = 20 + Math.random() * 10;
    const inheritPct = 0.15 + Math.random() * 0.10;
    const hp = Math.ceil(parentMaxHp * inheritPct);

    const paraRange = size * 1.5;
    const host = enemies.find(e =>
        e !== null &&
        e.type !== 'marchosias_minion' &&
        !e.type.startsWith('enemy_bullet') &&
        Math.hypot(e.x - parentX, e.y - parentY) < paraRange
    );

    if (host) {
        host.marchosiasParasiteShield = (host.marchosiasParasiteShield || 0) + hp;
        createParticles(host.x, host.y, 20, '#00ff88', 2, 6);
        addExplosion(host.x, host.y, host.size * 0.8, '#00ff88');
    } else {
        const baseSpeed = (1 + Math.random() * 2) * 0.8;
        enemies.push({
            x: parentX + (Math.random() - 0.5) * 40,
            y: parentY + (Math.random() - 0.5) * 40,
            size, speed: baseSpeed * 1.35,
            hp, maxHp: hp,
            isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
            type: 'marchosias_minion',
            shootTimer: 1000,
        });
    }
}

function spawnNormalEnemy() {
    const size = 20 + Math.random() * 10;
    const hpFromTime = Math.floor(gameElapsedTime / 15000);
    let hp = Math.min(60, (Math.floor(Math.random() * 5) + 1 + hpFromTime));
    hp *= 1.05;
    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size, y: -size, size: size,
        speed: (1 + Math.random() * 2) * 0.8, hp: hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        type: 'normal', shootTimer: 1000
    });
}

function createAegisTelegraph(startX, startY, target) {
    let angle = Math.atan2(target.y - startY, target.x - startX);
    let length = Math.hypot(canvas.width, canvas.height);
    let endX = startX + Math.cos(angle) * length;
    let endY = startY + Math.sin(angle) * length;
    aegisLasers.push({
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        delay: 1000,
        fired: false,
        duration: 0
    });
}

function createParticles(x, y, count, color, minSpeed, maxSpeed) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed;
        particles.push({
            x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            lifetime: 300 + Math.random() * 200, maxLifetime: 300 + Math.random() * 200,
            size: 1 + Math.random() * 2, color: color
        });
    }
}

function addExplosion(x, y, size, color = 'orange') {
    let finalColor = color;
    if (color === 'electric_blue') {
        finalColor = '#00FFFF';
    }
    explosions.push({ x, y, size, lifetime: 500, maxLifetime: 500, color: finalColor });
    createParticles(x, y, 20, finalColor, 1, 5);
}

function spawnSentinel(x, y, forceNormal = false) {
    for (let i = 0; i < 3; i++) {
        particles.push({ isSummonRing: true, x, y, lifetime: 500, maxLifetime: 500, radius: i * 20 });
    }
    createParticles(x, y, 30, '#00FFFF', 2, 8);

    if (sentinels.length >= MAX_SENTINELS) {
        sentinels.sort((a, b) => a.hp - b.hp);
        destroySentinel(sentinels[0]);
        sentinels.splice(0, 1);
    }

    let currentTier = (sentinels.length + 1 >= 12) ? 3 : ((sentinels.length + 1 >= 5) ? 2 : 1);
    let initialMaxHp = (currentTier === 1) ? 389 : 299;

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
}

function destroySentinel(sentinel) {
    addExplosion(sentinel.x, sentinel.y, 80, '#00FFFF');
    screenShake = { intensity: 5, duration: 200 };
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
    let sentinelFireRate = 75;
    let damageMultiplier = 1.0;

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
        sentinelFireRate /= 1.40;
    }

    for (let i = 0; i < sentinels.length; i++) {
        let s = sentinels[i];
        let newTier = isTier3 ? 3 : (isTier2 ? 2 : 1);
        if (s.synergyTier !== newTier) {
            let oldMax = s.maxHp;
            s.maxHp = (newTier === 1) ? 389 : 299;
            s.hp = s.hp * (s.maxHp / oldMax);
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
            sentinel.hp--;
            const angle = sentinel.angle;
            const speedMultiplier = (gloryForJusticeActive ? 1.25 : 1) * herdSpeedBonus;

            sentinel.shotsFiredSinceSpecial++;

            if (sentinel.shotsFiredSinceSpecial >= 4 || swarmSpecialForced) {
                if (!swarmSpecialForced) sentinel.shotsFiredSinceSpecial = 0;

                bullets.push({
                    x: sentinel.x + Math.cos(angle) * sentinel.size,
                    y: sentinel.y + Math.sin(angle) * sentinel.size,
                    damage: 6 * damageMultiplier, percentDamage: 0.07 * damageMultiplier, size: 30, type: 'sentinel_special',
                    target: sentinel.target, speedMultiplier: 1.12 * speedMultiplier,
                    sourceSentinel: sentinel
                });
            } else {
                bullets.push({
                    x: sentinel.x + Math.cos(angle) * sentinel.size,
                    y: sentinel.y + Math.sin(angle) * sentinel.size,
                    vx: Math.cos(angle) * 9 * speedMultiplier, vy: Math.sin(angle) * 9 * speedMultiplier,
                    damage: 4 * damageMultiplier, percentDamage: 0.035 * damageMultiplier, size: 7.8, type: 'sentinel_auto'
                });
                particles.push({ x: sentinel.x + Math.cos(angle) * (sentinel.size + 5), y: sentinel.y + Math.sin(angle) * (sentinel.size + 5), vx: 0, vy: 0, lifetime: 100, maxLifetime: 100, size: 5, color: 'orange' });
            }
        }

        if (sentinel.hp <= 0) {
            destroySentinel(sentinel);
            sentinels.splice(i, 1);
        }
    }
}

function findClosestEnemy(x, y) {
    let closest = null, closestDist = Infinity;
    for (let enemy of enemies) {
        if (enemy.type.startsWith('enemy_bullet')) continue;
        let d = Math.hypot(enemy.x - x, enemy.y - y);
        if (d < closestDist) { closest = enemy; closestDist = d; }
    }
    return closest;
}

function findClosestSentinelOrPlayer(x, y) {
    let targets = [...sentinels, player];
    let closest = null, closestDist = Infinity;
    for (const target of targets) {
        const d = Math.hypot(target.x - x, target.y - y);
        if (d < closestDist) { closest = target; closestDist = d; }
    }
    return closest;
}

function triggerDemonGift(boss) {
    demonGiftEffect.active = true;
    demonGiftEffect.endTime = performance.now() + 4000;

    enemies.forEach(enemy => {
        if (enemy === boss) return;
        const healAmount = enemy.soulReaver ? (boss.maxHp * 0.15 * 0.75) : (boss.maxHp * 0.15);
        const potentialHp = enemy.hp + healAmount;

        if (potentialHp > enemy.maxHp) {
            const overheal = potentialHp - enemy.maxHp;
            let shieldGain = Math.ceil(overheal * 0.21);
            if (enemy.soulReaver) shieldGain *= 0.75;
            enemy.shield = (enemy.shield || 0) + shieldGain;
        }
        enemy.hp = Math.min(enemy.maxHp, potentialHp);

        enemy.demonGiftStacks = (enemy.demonGiftStacks || 0) + 1;
        if (enemy.demonGiftStacks > 2) enemy.demonGiftStacks = 2;
        enemy.demonGiftEndTime = performance.now() + 4000;
    });
}

function spawnBossShockwave(x, y) {
    bossShockwaves.push({
        x: x, y: y,
        radius: 0,
        maxRadius: Math.hypot(canvas.width, canvas.height),
        speed: 12,
        hitSentinels: new Set(),
        active: true
    });
    screenShake = { intensity: 20, duration: 600 };
}

function dealDamage(enemy, source) {
    if (enemy.marchosiasParasiteShield && enemy.marchosiasParasiteShield > 0) {
        const effectiveHpForParasite = (enemy.maxHp || enemy.hp) + (enemy.marchosiasParasiteShield || 0);
        let parasiteDmg = Math.ceil((source.damage || 0) + (effectiveHpForParasite * (source.percentDamage || 0)));
        if (gloryForJusticeActive) parasiteDmg = Math.ceil(parasiteDmg * 1.55);
        parasiteDmg = Math.max(0, parasiteDmg);

        if (parasiteDmg <= 0) {
        } else if (enemy.marchosiasParasiteShield >= parasiteDmg) {
            enemy.marchosiasParasiteShield -= parasiteDmg;
            return;
        } else {
            const overflow = parasiteDmg - enemy.marchosiasParasiteShield;
            enemy.marchosiasParasiteShield = 0;
            addExplosion(enemy.x, enemy.y, enemy.size * 0.6, '#00ff88');
            const origDmg = source.damage || 0;
            source = Object.assign({}, source, { damage: Math.max(0, origDmg - (parasiteDmg - overflow)) });
        }
    }

    if (enemy.type === 'aegis_core' && enemy.aegisInvulnerable) {
        if (source.damage > 0 || source.percentDamage > 0) {
            enemy.aegisInvulnerable = false;
            addExplosion(enemy.x, enemy.y, enemy.size * 1.5, 'white');
            return;
        }
    }

    if (enemy.absoluteShield) {
        if (source.damage > 0 || source.percentDamage > 0) {
            enemy.absoluteShield = false;
            addExplosion(enemy.x, enemy.y, enemy.size * 2, 'gold');
            return;
        }
    }

    if (source.applySoulReaver) {
        enemy.soulReaver = true;
    }

    const currentTime = performance.now();
    if (enemy.vulnStacks && enemy.vulnEndTime && currentTime > enemy.vulnEndTime) {
        enemy.vulnStacks = 0;
        enemy.vulnEndTime = 0;
    }

    const oldHP = enemy.hp;
    enemy.shield = enemy.shield || 0;
    const enemyMaxHp = enemy.maxHp || enemy.hp;
    const effectiveHp = enemyMaxHp + enemy.shield;
    let totalDamage = Math.ceil(source.damage + (effectiveHp * (source.percentDamage || 0)));

    if (gloryForJusticeActive) {
        totalDamage = Math.ceil(totalDamage * 1.55);
    }

    // Accurate Parry buff: +25% tất cả damage đầu ra trong 4s
    if (accurateParryActive && performance.now() < accurateParryEndTime) {
        totalDamage = Math.ceil(totalDamage * 1.25);
    }

    // Áp dụng tăng sát thương từ Trọng Thương (+25% mỗi stack)
    if (enemy.vulnStacks && enemy.vulnStacks > 0) {
        totalDamage = Math.ceil(totalDamage * (1 + enemy.vulnStacks * 0.25));
    }

    let combinedDR = 0;
    if (enemy.demonGiftEndTime && currentTime < enemy.demonGiftEndTime) {
        combinedDR += (enemy.demonGiftStacks === 2) ? 0.30 : 0.18;
    }

    if ((enemy.type === 'boss' || enemy.type === 'thaelis') && enemy.hp < enemy.maxHp * 0.6) {
        const hpPercent = (enemy.hp / enemy.maxHp) * 100;
        const percentPointsLost = 60 - hpPercent;
        if (enemy.type === 'boss') {
            combinedDR += Math.min(0.72, (percentPointsLost * 1.5 / 100));
        } else if (enemy.type === 'thaelis') {
            combinedDR += Math.min(0.52, (percentPointsLost / 100));
        }
    }

    if (enemy.type === 'aegis_core') {
        combinedDR += 0.10;
    }

    if (enemy.shield > 0 && enemy.aegisShieldReceived) {
        combinedDR += 0.15;
    }

    if (enemy.type === 'marchosias') {
        combinedDR += 0.20;
    }

    if (enemy.type === 'boss') {
        combinedDR += 0.15; // Dargruel base DR
    }

    if (enemy.type === 'leviathan') {
        combinedDR += 0.15; // Leviathan base DR (shield handled separately)
    }

    // Envy DR (cộng dồn cho mọi kẻ địch có Envy)
    if (enemy.hasEnvy && enemy.envyDR) {
        combinedDR += enemy.envyDR;
    }

    if (enemy.type === 'embryo') {
        combinedDR += 0.90;
    }

    let isSentinel = enemy.hasOwnProperty('shotsFiredSinceSpecial');
    if (isSentinel && gloryForJusticeActive) {
        combinedDR += 0.20; // Glory for Justice sentinel DR
    }
    // Tier 2 Herd Mentality: +10% DR thêm khi có 5-11 sentinels
    if (isSentinel && sentinels.length >= 5 && sentinels.length < 12) {
        combinedDR += 0.10;
    }

    combinedDR = Math.min(0.99, combinedDR);
    totalDamage = Math.ceil(totalDamage * (1 - combinedDR));
    totalDamage = Math.max(0, totalDamage);

    const damageToShield = Math.min(enemy.shield, totalDamage);
    enemy.shield -= damageToShield;
    totalDamage -= damageToShield;
    enemy.hp -= totalDamage;

    const isChainable = gloryForJusticeActive && !source.isChainLightning && !source.isTeslaDot;
    const isBossOrMiniBossPresent = enemies.some(e => e.type === 'boss' || e.type === 'thaelis');

    if (isChainable && isBossOrMiniBossPresent && currentTime > chainLightningCooldownEnd) {
        chainLightningCooldownEnd = currentTime + 150;
        screenShake = { intensity: 3, duration: 100 };
        const chainDamage = totalDamage * 0.30;
        let chainedCount = 0;
        for (const otherEnemy of enemies) {
            if (chainedCount >= 6) break;
            if (otherEnemy !== enemy && !otherEnemy.type.startsWith('enemy_bullet') && Math.hypot(enemy.x - otherEnemy.x, enemy.y - otherEnemy.y) < 150) {
                let debuff = Math.random() < 0.55;
                dealDamage(otherEnemy, { damage: chainDamage, isChainLightning: true, applySoulReaver: debuff });
                chainLightningEffects.push({
                    x1: enemy.x, y1: enemy.y, x2: otherEnemy.x, y2: otherEnemy.y, lifetime: 250, maxLifetime: 250
                });
                chainedCount++;
            }
        }
    }

    // Trigger Trọng thương: player auto 25%, tất cả nguồn khác 15% (bao gồm chain lightning và tesla)
    if (source.applyVuln && Math.random() < (source.vulnChance || 0)) {
        applyVulnerability(enemy);
    } else if (!source.applyVuln && Math.random() < 0.15) {
        applyVulnerability(enemy);
    }

    if (enemy.type === 'boss') {
        const oldPercent = oldHP / enemy.maxHp;
        const newPercent = enemy.hp / enemy.maxHp;
        if (oldPercent > 0.7 && newPercent <= 0.7 && !enemy.demonGift70Triggered) { triggerDemonGift(enemy); enemy.demonGift70Triggered = true; }
        if (oldPercent > 0.5 && newPercent <= 0.5 && !enemy.demonGift50Triggered) { spawnBossShockwave(enemy.x, enemy.y); enemy.demonGift50Triggered = true; }
        if (oldPercent > 0.4 && newPercent <= 0.4 && !enemy.demonGift40Triggered) { triggerDemonGift(enemy); enemy.demonGift40Triggered = true; }
        if (oldPercent > 0.1 && newPercent <= 0.1 && !enemy.demonGift10Triggered) { triggerDemonGift(enemy); enemy.demonGift10Triggered = true; }
        if (oldPercent > 0.01 && newPercent <= 0.01 && !enemy.demonGift1Triggered) { triggerDemonGift(enemy); enemy.demonGift1Triggered = true; }
    }
}
// ══════════════════════════════════════════════════════════
// LEVIATHAN — Dominator Class
// ══════════════════════════════════════════════════════════

function spawnLeviathan() {
    const baseSize = 25 + Math.random() * 5;
    const size = baseSize * 10;
    const hpFromTime = Math.floor(gameElapsedTime / 10000);
    let hp = Math.min(6000, 3000 + hpFromTime * 30);
    hp *= 1.05;

    const lev = {
        x: Math.random() * (canvas.width - size * 2) + size,
        y: -size,
        size,
        speed: (1 + Math.random() * 0.5) * 0.8 * 0.85 * 0.85,
        hp, maxHp: hp,
        type: 'leviathan',
        shield: 0,
        isTargetedByA: false, hitBySkillF: false, laserHit: false,

        afoShieldActive: true,
        afoEnvyMarked: true,      // mark ngay khi spawn
        afoEnvyKills: 0,
        afoEnvyTotal: 0,
        afoHitCount: 0,
        afoShieldBroken: false,

        perseveranceCooldown: Infinity,
        perseveranceCharging: false,
        perseveranceChargeStart: 0,
        perseveranceFiring: false,
        perseveranceSweepCurrent: null,

        shootTimer: 750,
        shootInterval: 750,

        dyingLaserPhase: false,
        dyingLaserTimer: 0,
        dyingLaserFired: false,
    };
    enemies.push(lev);
    // Áp Envy ngay tất cả kẻ địch hiện có trên màn hình
    _applyLeviathanEnvy(lev);
}

function _applyLeviathanEnvy(lev) {
    // Áp Envy lên TẤT CẢ kẻ địch trên màn hình (không giới hạn 6)
    const targets = enemies.filter(e =>
        e !== lev &&
        !e.type.startsWith('enemy_bullet') &&
        e.type !== 'embryo' &&
        e.type !== 'leviathan' &&
        !e.hasEnvy
    );
    targets.forEach(e => {
        e.hasEnvy = true;
        e.envyLev = lev;
        e.maxHp = Math.ceil(e.maxHp * 1.36);
        e.hp = Math.min(e.hp * 1.36, e.maxHp);
        e.envyShield = Math.ceil(lev.hp * 0.18);
        e.shield = (e.shield || 0) + e.envyShield;
        e.envyDR = 0.36;
        e.envyChainAngle = 0;
        e.envyGlowPhase = Math.random() * Math.PI * 2;
    });
    lev.afoEnvyTotal = targets.length;
    lev.afoEnvyKills = 0;
}

function updateLeviathan(enemy, deltaTime) {
    const now = performance.now();

    // === Death laser phase ===
    if (enemy.dyingLaserPhase) {
        enemy.dyingLaserTimer -= deltaTime;
        if (enemy.dyingLaserTimer <= 0 && !enemy.dyingLaserFired) {
            enemy.dyingLaserFired = true;
            if (!window._levDeathLasers) window._levDeathLasers = [];
            for (let k = 0; k < 9; k++) {
                const wingAngle = (Math.PI * 2 / 9) * k - Math.PI / 2;
                window._levDeathLasers.push({
                    ox: enemy.x, oy: enemy.y,
                    angle: wingAngle,
                    active: true,
                    lifetime: 900,     // tổng thời gian laser hiện
                    elapsed: 0,
                    hitPlayer: false,
                    hitSentinels: new Set(),
                    levHits: enemy.afoHitCount || 1
                });
            }
        }
        if (enemy.dyingLaserFired && enemy.dyingLaserTimer <= -900) {
            enemy.hp = -1;
        }
        return;
    }

    // === Di chuyển xuống ===
    enemy.y += enemy.speed * (deltaTime / 16.67);
    if (enemy.y > canvas.height + enemy.size) { enemy.hp = -1; return; }

    // === Khiên All for One ===
    if (enemy.afoShieldActive) {
        const needed = enemy.afoEnvyTotal || 6;
        if (enemy.afoEnvyKills >= needed && !enemy.afoShieldBroken) {
            enemy.afoShieldActive = false;
            enemy.afoShieldBroken = true;
            addExplosion(enemy.x, enemy.y, enemy.size * 3, '#00e5ff');
            for (let i = 0; i < 40; i++) {
                const a = Math.random() * Math.PI * 2;
                const spd = 3 + Math.random() * 8;
                particles.push({
                    x: enemy.x, y: enemy.y,
                    vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                    color: i % 2 === 0 ? '#00e5ff' : '#ffffff',
                    size: 4 + Math.random() * 5,
                    lifetime: 800, maxLifetime: 800
                });
            }
            screenShake = { intensity: 15, duration: 500 };
            // Bắt đầu charge Perseverance ngay
            enemy.perseveranceCharging = true;
            enemy.perseveranceChargeStart = now;
            enemy.shootTimer = 750;
        }
        if (enemy.afoShieldActive) return;
    }

    // === Perseverance ===
    if (enemy.perseveranceCharging) {
        if (now - enemy.perseveranceChargeStart >= 1000) {
            enemy.perseveranceCharging = false;
            enemy.perseveranceFiring = true;
            const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            enemy.perseveranceSweepCurrent = angleToPlayer - Math.PI * 0.6;
            enemy.perseveranceSweepEnd = angleToPlayer + Math.PI * 0.6;
        }
    }

    if (enemy.perseveranceFiring) {
        const sweepSpeed = (Math.PI * 1.2) / 1200;
        enemy.perseveranceSweepCurrent += sweepSpeed * deltaTime;
        if (enemy.perseveranceSweepCurrent >= enemy.perseveranceSweepEnd) {
            enemy.perseveranceFiring = false;
            enemy.perseveranceSweepCurrent = null;
            enemy.perseveranceCooldown = now + 3500;
        }
    } else if (!enemy.perseveranceCharging && enemy.afoShieldBroken) {
        if (now >= (enemy.perseveranceCooldown || 0)) {
            enemy.perseveranceCharging = true;
            enemy.perseveranceChargeStart = now;
        }
    }

    // === Normal attack — bắn MỌI LÚC ===
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
            const spread = 0.22;
            for (let i = -1; i <= 1; i++) {
                const a = baseAngle + i * spread;
                const bulletHp = Math.ceil(enemy.maxHp * 0.02);
                enemies.push({
                    x: enemy.x, y: enemy.y,
                    vx: Math.cos(a) * 5.5, vy: Math.sin(a) * 5.5,
                    hp: bulletHp, maxHp: bulletHp, size: 10,
                    type: 'enemy_bullet', isSplit: false
                });
            }
        }
    }
}