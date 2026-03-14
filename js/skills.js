function activateSkillA() {
    const currentTime = performance.now();
    if (gameState === "playing" && currentTime - lastSkillA >= skillACooldown) {
        if (skillAOrbs.length >= maxSkillAOrbs) return;
        lastSkillA = currentTime;
        skillAActive = true;
        const orbsToAdd = Math.min(15, maxSkillAOrbs - skillAOrbs.length);
        for (let i = 0; i < orbsToAdd; i++) {
            skillAOrbs.push({
                angle: 0, radius: 0, target: null,
                x: player.x, y: player.y, speed: 0, size: 8
            });
        }
        rebalanceSkillAOrbs();
    }
}

function rebalanceSkillAOrbs() {
    const untargetedOrbs = skillAOrbs.filter(orb => !orb.target);
    if (untargetedOrbs.length === 0) return;
    const orbsPerLayer = 20;
    const numLayers = Math.ceil(untargetedOrbs.length / orbsPerLayer);
    let orbIndex = 0;
    for (let layer = 0; layer < numLayers; layer++) {
        const layerRadius = 60 + layer * 35;
        const orbsInThisLayer = (layer === numLayers - 1) ? untargetedOrbs.length - orbIndex : orbsPerLayer;
        for (let i = 0; i < orbsInThisLayer; i++) {
            const orb = untargetedOrbs[orbIndex];
            orb.angle = (Math.PI * 2 / orbsInThisLayer) * i;
            orb.radius = layerRadius;
            orbIndex++;
        }
    }
}

function updateSkillA(deltaTime) {
    if (!skillAActive) return;
    let dt = deltaTime / 16.67;
    const rotationSpeed = 0.02 * dt;

    let availableEnemy = enemies.find(enemy => !enemy.isTargetedByA && enemy.type !== 'enemy_bullet' && Math.hypot(enemy.x - player.x, enemy.y - player.y) < skillASensorRadius);
    if (availableEnemy) {
        let availableOrb = skillAOrbs.find(orb => !orb.target);
        if (availableOrb) {
            availableOrb.target = availableEnemy;
            availableOrb.speed = 10;
            availableEnemy.isTargetedByA = true;
            rebalanceSkillAOrbs();
        }
    }
    for (let i = skillAOrbs.length - 1; i >= 0; i--) {
        let orb = skillAOrbs[i];
        if (orb.target) {
            if (!enemies.includes(orb.target) || orb.target.hp <= 0) {
                if (orb.target) orb.target.isTargetedByA = false;
                skillAOrbs.splice(i, 1);
                rebalanceSkillAOrbs();
                continue;
            }
            const dx = orb.target.x - orb.x, dy = orb.target.y - orb.y, dist = Math.hypot(dx, dy);
            orb.speed += 0.8 * dt;
            orb.x += (dx / dist) * orb.speed * dt;
            orb.y += (dy / dist) * orb.speed * dt;
            particles.push({
                x: orb.x, y: orb.y, vx: -(dx / dist) * 2, vy: -(dy / dist) * 2,
                lifetime: 200, maxLifetime: 200, size: 4, color: 'rgba(0, 255, 255, 0.7)'
            });
            if (dist < orb.target.size / 2 + orb.size) {
                dealDamage(orb.target, { damage: 10, percentDamage: 0.24 });
                orb.target.isTargetedByA = false;

                spawnScatteredProjectiles(orb.x, orb.y, 16, { damage: 4, percentDamage: 0.02 });
                addExplosion(orb.x, orb.y, 30, 'cyan');
                skillAOrbs.splice(i, 1);
                rebalanceSkillAOrbs();
            }
        } else {
            orb.angle += rotationSpeed / (Math.floor(orb.radius / 60) + 1);
            orb.x = player.x + Math.cos(orb.angle) * orb.radius;
            orb.y = player.y + Math.sin(orb.angle) * orb.radius;
        }
    }
    if (skillAOrbs.length === 0) skillAActive = false;
}

function spawnScatteredProjectiles(x, y, count, damageProps) {
    for (let i = 0; i < count; i++) {
        let angle = (Math.PI * 2 / count) * i;
        scatteredProjectiles.push({
            x, y,
            vx: Math.cos(angle) * 12, vy: Math.sin(angle) * 12,
            damage: damageProps.damage,
            percentDamage: damageProps.percentDamage || 0,
            size: 4, lifetime: 3000, maxLifetime: 3000
        });
    }
}

function updateScatteredProjectiles(deltaTime) {
    let dt = deltaTime / 16.67;
    for (let i = scatteredProjectiles.length - 1; i >= 0; i--) {
        let proj = scatteredProjectiles[i];
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.lifetime -= deltaTime;
        if (proj.lifetime <= 0) { scatteredProjectiles.splice(i, 1); continue; }

        if (proj.isBouncingBall) {
            if (proj.x < proj.size || proj.x > canvas.width - proj.size) { proj.vx *= -1; }
            if (proj.y < proj.size || proj.y > canvas.height - proj.size) { proj.vy *= -1; }
        }

        for (let enemy of enemies) {
            let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - proj.x, enemy.y - proj.y) < enemyRadius + proj.size) {
                if (proj.isBouncingBall) {
                    if (!proj.hitEnemies) proj.hitEnemies = [];
                    if (proj.hitEnemies.includes(enemy)) continue;
                    dealDamage(enemy, proj);
                    proj.hitEnemies.push(enemy);
                } else {
                    dealDamage(enemy, proj);
                    proj.lifetime = 0;
                    break;
                }
            }
        }
    }
}

function activateSkillS() {
    const currentTime = performance.now();
    if (gameState === "playing" && spirits.length < MAX_SPIRITS && currentTime - lastSkillS >= skillSCooldown) {
        lastSkillS = currentTime;
        spirits.push({
            x: player.x, y: player.y, shootTimer: 0,
            shotsFiredSinceBarrage: 0, duration: 35000,
            spawnTime: currentTime, isFinishing: false, finaleState: null,
        });
    }
}

function updateSpirits(deltaTime) {
    for (let i = spirits.length - 1; i >= 0; i--) {
        const spirit = spirits[i];
        if (spirit.isFinishing) {
            updateSpiritFinale(spirit, deltaTime);
            if (!spirit.isFinishing) spirits.splice(i, 1);
            continue;
        }
        if (performance.now() - spirit.spawnTime >= spirit.duration) {
            spirit.isFinishing = true; spirit.finaleState = 'moving';
            spirit.finaleTargetPos = { x: canvas.width / 2, y: canvas.height / 2 };
            continue;
        }

        let t = performance.now() / 1000 + i * 5;
        spirit.x += (player.x + Math.cos(t * 2) * 72 - spirit.x) * 0.1;
        spirit.y += (player.y + Math.sin(t * 2) * 72 - spirit.y) * 0.1;

        spirit.shootTimer -= deltaTime;
        let spiritFireRate = 65;
        if (gloryForJusticeActive) {
            spiritFireRate /= 1.40;
        }

        if (spirit.shootTimer <= 0) {
            spirit.shootTimer = spiritFireRate;
            let closest = findClosestEnemy(spirit.x, spirit.y);
            if (closest) {
                const speedMultiplier = (gloryForJusticeActive ? 1.25 : 1) * 1.10;
                spiritBullets.push({
                    x: spirit.x, y: spirit.y,
                    damage: 5, percentDamage: 0.04,
                    size: 7.2, lifetime: 2000, target: closest, speedMultiplier: speedMultiplier
                });
                spirit.shotsFiredSinceBarrage++;
            }
        }

        if (spirit.shotsFiredSinceBarrage >= 5) {
            spirit.shotsFiredSinceBarrage = 0;
            let closest = findClosestEnemy(spirit.x, spirit.y);
            let vx = 0, vy = -12;
            if (closest) {
                const d = Math.hypot(closest.x - spirit.x, closest.y - spirit.y);
                vx = (closest.x - spirit.x) / d * 12;
                vy = (closest.y - spirit.y) / d * 12;
            }
            bladeArcProjectiles.push({ x: spirit.x, y: spirit.y, vx, vy, radius: 125, damage: 10, percentDamage: 0.16, hitEnemies: [] });
        }
    }
}

function updateBladeArcProjectiles(deltaTime) {
    const dt = deltaTime / 16.67;
    for (let i = bladeArcProjectiles.length - 1; i >= 0; i--) {
        let arc = bladeArcProjectiles[i];
        arc.x += arc.vx * dt;
        arc.y += arc.vy * dt;
        if (arc.x < -arc.radius || arc.x > canvas.width + arc.radius || arc.y < -arc.radius || arc.y > canvas.height + arc.radius) {
            bladeArcProjectiles.splice(i, 1);
            continue;
        }
        for (let enemy of enemies) {
            if (arc.hitEnemies.includes(enemy)) continue;
            let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - arc.x, enemy.y - arc.y) < arc.radius + enemyRadius) {
                dealDamage(enemy, arc);
                arc.hitEnemies.push(enemy);
            }
        }
    }
}

function updateSpiritBullets(deltaTime) {
    let dt = deltaTime / 16.67;
    for (let i = spiritBullets.length - 1; i >= 0; i--) {
        let b = spiritBullets[i];
        if (b.target && enemies.includes(b.target)) {
            let dx = b.target.x - b.x, dy = b.target.y - b.y, d = Math.hypot(dx, dy);
            if (d > 0) {
                const speed = 8.8 * (b.speedMultiplier || 1);
                b.x += (dx / d) * speed * dt;
                b.y += (dy / d) * speed * dt;
            }
        } else { b.y -= 8.8 * dt * (b.speedMultiplier || 1); }
        b.lifetime -= deltaTime;
        for (let enemy of enemies) {
            let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - b.x, enemy.y - b.y) < enemyRadius + b.size) {
                dealDamage(enemy, b);
                b.lifetime = 0;
                createParticles(b.x, b.y, 5, 'lime', 1, 3);
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
                    particles.push({ isLaserLine: true, x1: spirit.x, y1: spirit.y, x2: enemy.x, y2: enemy.y, lifetime: 150, maxLifetime: 150, color: 'red' });
                    dealDamage(enemy, { damage: 10, percentDamage: 0.40 });
                });
            }
            if (spirit.finaleChargeTime <= 0) spirit.finaleState = 'firing';
            break;
        case 'firing':
            addExplosion(spirit.x, spirit.y, 200, 'red');
            screenShake = { intensity: 25, duration: 600 };
            for (let i = 0; i < 8; i++) {
                let angle = (Math.PI / 4) * i;
                scatteredProjectiles.push({
                    x: spirit.x, y: spirit.y,
                    vx: Math.cos(angle) * 15, vy: Math.sin(angle) * 15,
                    damage: 10, percentDamage: 0.25, size: 56, lifetime: 4000, isBouncingBall: true
                });
            }
            spirit.isFinishing = false;
            break;
    }
}

function activateSkillD() {
    const currentTime = performance.now();
    if (gameState !== "playing" || skillDCharging || blackHole || currentTime - lastSkillD < skillDCooldown) return;
    skillDCharging = true;
    skillDChargeStartTime = performance.now();
}

function updateSkillD(deltaTime) {
    if (skillDCharging) {
        if (performance.now() - skillDChargeStartTime >= skillDChargeTime) {
            skillDCharging = false;
            lastSkillD = performance.now();
            blackHole = {
                x: player.x, y: player.y - player.height,
                size: 10, maxSize: 120, vy: -2, activeTime: 0
            };
        }
    }
    if (blackHole) {
        let dt = deltaTime / 16.67;
        blackHole.y += blackHole.vy * dt;
        blackHole.activeTime += deltaTime;
        if (blackHole.size < blackHole.maxSize) blackHole.size += 1 * dt;

        const pullSpeed = 6;
        for (let enemy of enemies) {
            let dx = blackHole.x - enemy.x, dy = blackHole.y - enemy.y, d = Math.hypot(dx, dy);
            if (d > 1) {
                enemy.x += (dx / d) * pullSpeed * dt;
                enemy.y += (dy / d) * pullSpeed * dt;
            }
            if (d < blackHole.size / 2) {
                dealDamage(enemy, { damage: enemy.maxHp * 999999999 }); // Dùng sát thương siêu lớn để ép vỡ Khiên Vàng
            }
        }
        if (blackHole.y + blackHole.maxSize < 0) blackHole = null;
    }
}

function activateSkillF() {
    const currentTime = performance.now();
    if (gameState === "playing" && skillFState === "ready" && currentTime - lastSkillF > skillFCooldown) {
        lastSkillF = currentTime;
        skillFState = "charging";
        skillFChargeStart = currentTime;
        enemies.forEach(e => e.hitBySkillF = false);
    }
}

function updateSkillF(deltaTime) {
    const currentTime = performance.now();
    if (skillFState === "charging" && currentTime - skillFChargeStart >= 1500) {
        skillFState = "sweeping";
        skillFSweepStart = currentTime;
        screenShake = { intensity: 15, duration: skillFSweepDuration };
    }
    if (skillFState === "sweeping") {
        let sweepProgress = (currentTime - skillFSweepStart) / skillFSweepDuration;
        if (sweepProgress >= 1) {
            skillFState = "ready";
            return;
        }
        let currentAngle = (Math.PI) * sweepProgress - Math.PI;
        for (let enemy of enemies) {
            if (enemy.hitBySkillF) continue;
            let angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < canvas.width && angle < currentAngle && angle > currentAngle - 0.2) {
                dealDamage(enemy, { damage: enemy.maxHp * 999999999 }); // Ép vỡ khiên hoặc chết ngay
                enemy.hitBySkillF = true;
            }
        }

        let length = Math.random() * canvas.width;
        let px = player.x + Math.cos(currentAngle) * length;
        let py = player.y + Math.sin(currentAngle) * length;
        particles.push({
            x: px, y: py,
            vx: Math.cos(currentAngle + Math.PI / 2) * (Math.random() * 5 + 2),
            vy: Math.sin(currentAngle + Math.PI / 2) * (Math.random() * 5 + 2),
            lifetime: 200 + Math.random() * 100, maxLifetime: 300,
            size: Math.random() * 4 + 2, color: 'cyan'
        });
    }
}

function activateSkillG() {
    if (gameState !== "playing" || skillGActive || skillGCharge < 100) return;

    skillGActive = true;
    skillGCharge = 0;
    skillGEndTime = performance.now() + 30000;
    skillGBorderOpacity = 0.01;

    particles.push({
        isSkillGAura: true,
        x: player.x, y: player.y,
        lifetime: 1000, maxLifetime: 1000,
        radius: 0,
        maxRadius: canvas.width
    });
}

function endSkillG() {
    skillGActive = false;
    const explosionProps = { damage: 8, percentDamage: 0.08 };
    const explosionRadius = ENERGY_ORB_SIZE * 5;

    energyOrbs.forEach(orb => {
        addExplosion(orb.x, orb.y, explosionRadius, 'cyan');
        enemies.forEach(enemy => {
            let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - orb.x, enemy.y - orb.y) < explosionRadius + enemyRadius) {
                dealDamage(enemy, explosionProps);
            }
        });
    });
    energyOrbs = [];

    teslaCoils.forEach(coil => {
        if (coil.dotTargets) coil.dotTargets.clear();
        addExplosion(coil.x, coil.y, explosionRadius, 'cyan');
        enemies.forEach(enemy => {
            let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - coil.x, enemy.y - coil.y) < explosionRadius + enemyRadius) {
                dealDamage(enemy, explosionProps);
            }
        });
    });
    teslaCoils = [];
}

function spawnEnergyOrb(x, y) {
    if (y > boundaryY) return;

    const newOrb = {
        x, y,
        size: ENERGY_ORB_SIZE,
        spawnTime: performance.now(),
        lifetime: 5000,
        linkedTo: null,
        id: Math.random(),
        isMerging: false
    };

    energyOrbs.push(newOrb);
    tryLinkOrbs(newOrb);
}

function tryLinkOrbs(newOrb) {
    if (teslaCoils.length >= MAX_TESLA_COILS) return;

    let closestUnlinkedOrb = null;
    let minDis = Infinity;

    for (const orb of energyOrbs) {
        if (orb !== newOrb && !orb.linkedTo && !orb.isMerging) {
            const d = Math.hypot(orb.x - newOrb.x, orb.y - newOrb.y);
            if (d < minDis) {
                minDis = d;
                closestUnlinkedOrb = orb;
            }
        }
    }

    if (closestUnlinkedOrb) {
        const linkId = Math.random();
        const linkTime = performance.now();
        const dotMap = new Map();
        newOrb.linkedTo = { orb: closestUnlinkedOrb, id: linkId, linkTime: linkTime, dotTargets: dotMap };
        closestUnlinkedOrb.linkedTo = { orb: newOrb, id: linkId, linkTime: linkTime, dotTargets: dotMap };

        newOrb.lifetime = 5000;
        newOrb.spawnTime = performance.now();
        closestUnlinkedOrb.lifetime = 5000;
        closestUnlinkedOrb.spawnTime = performance.now();
    }
}

function updateEnergyOrbs(deltaTime, currentTime) {
    let dt = deltaTime / 16.67;
    let orbsToDestroy = new Set();
    let linksProcessed = new Set();
    let mergesToSpawn = new Set();

    for (let i = energyOrbs.length - 1; i >= 0; i--) {
        const orb = energyOrbs[i];
        if (!orb || orbsToDestroy.has(orb)) continue;

        if (orb.isMerging) {
            const mergeDuration = 500;
            let mergeProgress = (currentTime - orb.mergeStartTime) / mergeDuration;

            if (mergeProgress >= 1) {
                if (orb.linkedTo && !mergesToSpawn.has(orb.linkedTo.id)) {
                    spawnTeslaCoil(orb.mergeTarget.x, orb.mergeTarget.y);
                    mergesToSpawn.add(orb.linkedTo.id);
                }
                orbsToDestroy.add(orb);
                if (orb.linkedTo && energyOrbs.includes(orb.linkedTo.orb)) {
                    orbsToDestroy.add(orb.linkedTo.orb);
                }
            } else {
                let t = mergeProgress;
                let easedProgress = t * (2 - t);
                orb.x = orb.originalPos.x + (orb.mergeTarget.x - orb.originalPos.x) * easedProgress;
                orb.y = orb.originalPos.y + (orb.mergeTarget.y - orb.originalPos.y) * easedProgress;

                particles.push({
                    x: orb.x, y: orb.y, vx: 0, vy: 0,
                    lifetime: 200, maxLifetime: 200, size: orb.size * (1 - mergeProgress) + 2, color: 'cyan'
                });
            }
            continue;
        }

        if (currentTime - orb.spawnTime > orb.lifetime) {
            if (orb.linkedTo) {
                if (!linksProcessed.has(orb.linkedTo.id)) {
                    const orb2 = orb.linkedTo.orb;
                    if (energyOrbs.includes(orb2) && !orb2.isMerging) {
                        const midX = (orb.x + orb2.x) / 2;
                        const midY = (orb.y + orb2.y) / 2;

                        orb.isMerging = true;
                        orb.mergeStartTime = currentTime;
                        orb.mergeTarget = { x: midX, y: midY };
                        orb.originalPos = { x: orb.x, y: orb.y };

                        orb2.isMerging = true;
                        orb2.mergeStartTime = currentTime;
                        orb2.mergeTarget = { x: midX, y: midY };
                        orb2.originalPos = { x: orb2.x, y: orb2.y };

                        linksProcessed.add(orb.linkedTo.id);
                    } else if (!energyOrbs.includes(orb2)) {
                        const explosionProps = { damage: 8, percentDamage: 0.08 };
                        const explosionRadius = orb.size * 5;
                        addExplosion(orb.x, orb.y, explosionRadius, 'cyan');
                        enemies.forEach(enemy => {
                            let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;
                            if (Math.hypot(enemy.x - orb.x, enemy.y - orb.y) < explosionRadius + enemyRadius) {
                                dealDamage(enemy, explosionProps);
                            }
                        });
                        orbsToDestroy.add(orb);
                    }
                }
            } else {
                const explosionProps = { damage: 8, percentDamage: 0.08 };
                const explosionRadius = orb.size * 5;
                addExplosion(orb.x, orb.y, explosionRadius, 'cyan');
                enemies.forEach(enemy => {
                    let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;
                    if (Math.hypot(enemy.x - orb.x, enemy.y - orb.y) < explosionRadius + enemyRadius) {
                        dealDamage(enemy, explosionProps);
                    }
                });
                orbsToDestroy.add(orb);
            }
            continue;
        }

        if (orb.linkedTo && !linksProcessed.has(orb.linkedTo.id)) {
            const orb2 = orb.linkedTo.orb;
            if (!energyOrbs.includes(orb2)) {
                if (orb.linkedTo.dotTargets) orb.linkedTo.dotTargets.clear();
                orb.linkedTo = null;
                orb.spawnTime = performance.now();
                orb.lifetime = 5000;
                continue;
            }

            enemies.forEach(enemy => {
                let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;
                const dist = distToSegment(enemy, orb, orb2);
                const linkThickness = ENERGY_ORB_SIZE / 2;
                if (dist < enemyRadius + linkThickness) {

                    if (enemy.type !== 'enemy_bullet') {
                        enemy.y -= (enemy.speed * dt * 0.08);
                    } else {
                        enemy.x -= (enemy.vx * dt * 0.08);
                        enemy.y -= (enemy.vy * dt * 0.08);
                    }

                    if (enemy.type === 'boss' || enemy.type === 'mini-boss') {
                        enemy.shootTimer += deltaTime * 0.30;
                    }

                    const dotMap = orb.linkedTo.dotTargets;
                    if (!dotMap.has(enemy)) {
                        dotMap.set(enemy, currentTime);
                    }
                    if (currentTime - dotMap.get(enemy) >= 125) {
                        dealDamage(enemy, { damage: 6, percentDamage: 0.04, isTeslaDot: true });
                        dotMap.set(enemy, currentTime);
                    }
                } else {
                    if (orb.linkedTo.dotTargets.has(enemy)) {
                        orb.linkedTo.dotTargets.delete(enemy);
                    }
                }
            });
        }
    }

    if (orbsToDestroy.size > 0) {
        energyOrbs = energyOrbs.filter(orb => !orbsToDestroy.has(orb));
    }
}

function spawnTeslaCoil(midX, midY) {
    if (teslaCoils.length >= 4) return;

    addExplosion(midX, midY, 100, 'electric_blue');

    teslaCoils.push({
        x: midX, y: midY,
        hp: 30, maxHp: 30,
        size: TESLA_COIL_SIZE,
        auraRadius: TESLA_AURA_RADIUS,
        dotTargets: new Map(),
        id: Math.random()
    });
}

function updateTeslaCoils(deltaTime, currentTime) {
    let dt = deltaTime / 16.67;
    for (let i = teslaCoils.length - 1; i >= 0; i--) {
        const coil = teslaCoils[i];

        enemies.forEach(enemy => {
            let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - coil.x, enemy.y - coil.y) < coil.auraRadius + enemyRadius) {
                if (enemy.type !== 'enemy_bullet') {
                    enemy.y -= (enemy.speed * dt * 0.08);
                }
            }
        });

        if (coil.hp <= 0) {
            const explosionProps = { damage: 10, percentDamage: 0.15 };
            addExplosion(coil.x, coil.y, coil.auraRadius, 'electric_blue');
            enemies.forEach(enemy => {
                let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;
                if (Math.hypot(enemy.x - coil.x, enemy.y - coil.y) < coil.auraRadius + enemyRadius) {
                    dealDamage(enemy, explosionProps);
                }
            });

            coil.dotTargets.clear();
            teslaCoils.splice(i, 1);
        }
    }
}