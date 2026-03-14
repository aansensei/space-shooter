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
    killCountForPassive++;
    if (killCountForPassive % 4 === 0) {
        spawnSentinel(player.x, player.y);
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
            damage: 6, percentDamage: 0.04, size: 6.5, type: 'player_auto'
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
    const rand = Math.random();
    let hasAegis = enemies.some(e => e.type === 'aegis_core');

    if (rand < 0.03) {
        const baseSize = (20 + Math.random() * 10);
        const size = baseSize * 10;
        let hp = ((((100 + Math.random() * 300) * 10) * 0.8) * 1.3) * 1.15;
        hp *= 1.05;
        enemies.push({
            x: Math.random() * (canvas.width - size) + size / 2, y: -size, size: size,
            speed: (1 + Math.random() * 2) * 0.8 * 0.85, hp: hp, maxHp: hp,
            isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
            type: 'boss', shootTimer: (autoFireInterval * 2) * 0.75,
            demonGift70Triggered: false, demonGift50Triggered: false, demonGift40Triggered: false, demonGift10Triggered: false, demonGift1Triggered: false
        });
    } else if (rand < 0.33) {
        const baseSize = (20 + Math.random() * 10);
        const size = baseSize * 5;
        let hp = (((100 + Math.random() * 300) * 0.8) * 1.3) * 1.15;
        hp *= 1.05;
        enemies.push({
            x: Math.random() * (canvas.width - size) + size / 2, y: -size, size: size,
            speed: (1 + Math.random() * 2) * 0.8 * 0.80, hp: hp, maxHp: hp,
            isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
            type: 'mini-boss', shootTimer: autoFireInterval * 2
        });
    } else if (rand < 0.53 && !hasAegis) {
        const baseSize = (20 + Math.random() * 10);
        const size = ((baseSize * 5) / 2) * 0.7;
        const hpFromTime = Math.floor((performance.now() - gameStartTime) / 10000);

        // SỬA Ở ĐÂY: HP cơ bản từ 385 -> 680
        let hp = Math.min(680, 385 + hpFromTime * 12);

        enemies.push({
            x: Math.random() * (canvas.width - size * 2) + size, y: -size, size: size,
            speed: (1 + Math.random() * 2) * 0.4, hp: hp, maxHp: hp,
            isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
            type: 'aegis_core', shootTimer: 3000,
            aegisInvulnerable: true, aegisShieldReceived: false
        });
    } else {
        const size = 20 + Math.random() * 10;
        const hpFromTime = Math.floor((performance.now() - gameStartTime) / 15000);
        let hp = Math.min(60, (Math.floor(Math.random() * 5) + 1 + hpFromTime));
        hp *= 1.05;
        enemies.push({
            x: Math.random() * (canvas.width - size * 2) + size, y: -size, size: size,
            speed: (1 + Math.random() * 2) * 0.8, hp: hp, maxHp: hp,
            isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
            type: 'normal'
        });
    }
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

function spawnSentinel(x, y) {
    for (let i = 0; i < 3; i++) {
        particles.push({ isSummonRing: true, x, y, lifetime: 500, maxLifetime: 500, radius: i * 20 });
    }
    createParticles(x, y, 30, '#00FFFF', 2, 8);

    if (sentinels.length >= MAX_SENTINELS) {
        sentinels.sort((a, b) => a.hp - b.hp);
        destroySentinel(sentinels[0]);
        sentinels.splice(0, 1);
    }
    sentinels.push({
        x, y, hp: 160, maxHp: 160, angle: -Math.PI / 2, shootTimer: 0,
        target: null, size: 15, shotsFiredSinceSpecial: 0,
        absoluteShield: false // MỚI: Thuộc tính khiên vàng
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
            damage: 2, size: 6, type: 'sentinel_death'
        });
    }
}

function updateSentinels(deltaTime) {
    let sentinelFireRate = 75;
    let activeCount = sentinels.length;

    if (activeCount > 5) sentinelFireRate /= 1.20;

    if (gloryForJusticeActive) {
        sentinelFireRate /= 1.40;
    }

    let swarmSpecialForced = activeCount >= 10;

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
            const speedMultiplier = gloryForJusticeActive ? 1.25 : 1;

            sentinel.shotsFiredSinceSpecial++;

            if (sentinel.shotsFiredSinceSpecial >= 4 || swarmSpecialForced) {
                if (!swarmSpecialForced) sentinel.shotsFiredSinceSpecial = 0;

                bullets.push({
                    x: sentinel.x + Math.cos(angle) * sentinel.size,
                    y: sentinel.y + Math.sin(angle) * sentinel.size,
                    damage: 6, percentDamage: 0.07, size: 30, type: 'sentinel_special',
                    target: sentinel.target, speedMultiplier: 1.12 * speedMultiplier,
                    sourceSentinel: sentinel
                });
            } else {
                bullets.push({
                    x: sentinel.x + Math.cos(angle) * sentinel.size,
                    y: sentinel.y + Math.sin(angle) * sentinel.size,
                    vx: Math.cos(angle) * 9 * speedMultiplier, vy: Math.sin(angle) * 9 * speedMultiplier,
                    damage: 4, percentDamage: 0.035, size: 7.8, type: 'sentinel_auto'
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
        if (enemy.type === 'enemy_bullet') continue;
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
        const healAmount = boss.maxHp * 0.15;
        const potentialHp = enemy.hp + healAmount;

        if (potentialHp > enemy.maxHp) {
            const overheal = potentialHp - enemy.maxHp;
            enemy.shield = (enemy.shield || 0) + Math.ceil(overheal * 0.21);
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
    if (enemy.type === 'aegis_core' && enemy.aegisInvulnerable) {
        if (source.damage > 0 || source.percentDamage > 0) {
            enemy.aegisInvulnerable = false;
            addExplosion(enemy.x, enemy.y, enemy.size * 1.5, 'white');
            return;
        }
    }

    // MỚI: Sentinel dùng Khiên Vàng bảo hiểm 1 lần
    if (enemy.absoluteShield) {
        if (source.damage > 0 || source.percentDamage > 0) {
            enemy.absoluteShield = false;
            addExplosion(enemy.x, enemy.y, enemy.size * 2, 'gold'); // Nổ vàng đẹp mắt
            return; // Hấp thụ hoàn toàn
        }
    }

    const oldHP = enemy.hp;
    enemy.shield = enemy.shield || 0;
    const enemyMaxHp = enemy.maxHp || enemy.hp;
    const effectiveHp = enemyMaxHp + enemy.shield;
    let totalDamage = Math.ceil(source.damage + (effectiveHp * (source.percentDamage || 0)));

    if (gloryForJusticeActive) {
        totalDamage = Math.ceil(totalDamage * 1.40);
    }

    let combinedDR = 0;
    if (enemy.demonGiftEndTime && performance.now() < enemy.demonGiftEndTime) {
        combinedDR += (enemy.demonGiftStacks === 2) ? 0.30 : 0.18;
    }

    if ((enemy.type === 'boss' || enemy.type === 'mini-boss') && enemy.hp < enemy.maxHp * 0.6) {
        const hpPercent = (enemy.hp / enemy.maxHp) * 100;
        const percentPointsLost = 60 - hpPercent;
        if (enemy.type === 'boss') {
            combinedDR += Math.min(0.72, (percentPointsLost * 1.5 / 100));
        } else if (enemy.type === 'mini-boss') {
            combinedDR += Math.min(0.52, (percentPointsLost / 100));
        }
    }

    // MỚI: Bản thân Aegis Core luôn có thêm 10% miễn thương cứng
    if (enemy.type === 'aegis_core') {
        combinedDR += 0.10;
    }

    // SỬA: Lớp khiên của Aegis Core giờ cho 15% miễn thương (thay vì 5%)
    if (enemy.shield > 0 && enemy.aegisShieldReceived) {
        combinedDR += 0.15;
    }
    // -----------------

    totalDamage = Math.ceil(totalDamage * (1 - combinedDR));

    const damageToShield = Math.min(enemy.shield, totalDamage);
    enemy.shield -= damageToShield;
    totalDamage -= damageToShield;
    enemy.hp -= totalDamage;

    const isChainable = gloryForJusticeActive && !source.isChainLightning && !source.isTeslaDot;
    const isBossOrMiniBossPresent = enemies.some(e => e.type === 'boss' || e.type === 'mini-boss');
    const now = performance.now();
    if (isChainable && isBossOrMiniBossPresent && now > chainLightningCooldownEnd) {
        chainLightningCooldownEnd = now + 250;
        screenShake = { intensity: 3, duration: 100 };
        const chainDamage = totalDamage * 0.21;
        let chainedCount = 0;
        for (const otherEnemy of enemies) {
            if (chainedCount >= 6) break;
            if (otherEnemy !== enemy && otherEnemy.type !== 'enemy_bullet' && Math.hypot(enemy.x - otherEnemy.x, enemy.y - otherEnemy.y) < 150) {
                dealDamage(otherEnemy, { damage: chainDamage, isChainLightning: true });
                chainLightningEffects.push({
                    x1: enemy.x, y1: enemy.y, x2: otherEnemy.x, y2: otherEnemy.y, lifetime: 250, maxLifetime: 250
                });
                chainedCount++;
            }
        }
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