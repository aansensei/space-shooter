function update(deltaTime) {
    if (gameState !== "playing" || gamePaused) return;
    const currentTime = performance.now();
    const dt = deltaTime / 16.67;

    gloryForJusticeActive = (enemies.filter(e => e.type !== 'enemy_bullet').length > 4) || skillGActive;

    if (skillGActive && currentTime > skillGEndTime) {
        endSkillG();
    }
    if (skillGActive) {
        if (skillGBorderOpacity < 0.5) {
            skillGBorderOpacity = Math.min(0.5, skillGBorderOpacity + 0.01 * dt);
        }
    } else {
        if (skillGBorderOpacity > 0) {
            skillGBorderOpacity = Math.max(0, skillGBorderOpacity - 0.01 * dt);
        }
    }

    if (currentTime > finalDefense.playerCooldownEnd) {
        if (!finalDefense.playerShield) finalDefense.playerShield = true;
    }
    if (currentTime > finalDefense.boundaryCooldownEnd) {
        if (!finalDefense.boundaryShield) finalDefense.boundaryShield = true;
    }

    if (keys.left && player.x > player.width / 2) player.x -= player.speed * dt;
    if (keys.right && player.x < canvas.width - player.width / 2) player.x += player.speed * dt;

    fireAutoShot();

    if (charging && !laserActive && currentTime - chargeStartTime >= overloadChargeTime && currentTime >= laserCooldownEnd) {
        laserActive = true; laserStartTime = currentTime; charging = false;
        lastLaserTick = 0;
        playerClones = [];
        const cloneSpacing = 150;
        for (let i = -2; i <= 2; i++) {
            if (i === 0) continue;
            playerClones.push({ xOffset: i * cloneSpacing });
        }
    }

    if (laserActive) {
        if (currentTime - laserStartTime >= laserDuration) {
            laserActive = false; laserCooldownEnd = currentTime + laserCooldownDuration; playerClones = [];
        } else {
            const allLasers = [{ xOffset: 0 }, ...playerClones];

            if (currentTime - lastLaserTick > laserTickInterval) {
                lastLaserTick = currentTime;
                enemies.forEach(enemy => {
                    for (const clone of allLasers) {
                        const laserX = player.x + clone.xOffset;
                        if (enemy.y < player.y && Math.abs(enemy.x - laserX) < 100 / 2) {
                            dealDamage(enemy, { damage: 10, percentDamage: 0.24 });
                            break;
                        }
                    }
                });
            }

            const pullRadius = 200, pullStrength = 0.05;
            enemies.forEach(enemy => {
                if (enemy.type === 'enemy_bullet') return;
                let closestLaserX = player.x + allLasers.reduce((prev, curr) =>
                    Math.abs(enemy.x - (player.x + curr.xOffset)) < Math.abs(enemy.x - (player.x + prev.xOffset)) ? curr : prev, { xOffset: 0 }).xOffset;
                let dist = Math.abs(enemy.x - closestLaserX);
                if (dist < pullRadius && enemy.y < player.y) {
                    enemy.x += (closestLaserX - enemy.x) * pullStrength * dt;
                }
            });
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];

        let teslaSpeedMultiplier = 1.0;
        let teslaAttackSpeedMultiplier = 1.0;
        let inTeslaAura = false;
        let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;

        for (const coil of teslaCoils) {
            if (coil.hp <= 0) continue;

            const distToCoil = Math.hypot(enemy.x - coil.x, enemy.y - coil.y);

            if (distToCoil < TESLA_AURA_RADIUS + enemyRadius) {
                inTeslaAura = true;

                if (enemy.type === 'enemy_bullet') {
                    teslaSpeedMultiplier = 0.50;
                    if (distToCoil < coil.size / 2 + enemy.size) {
                        coil.hp -= enemy.hp;
                        enemy.hp = 0;
                    }
                } else {
                    teslaSpeedMultiplier = 0.30;
                    if (enemy.type === 'boss' || enemy.type === 'mini-boss') {
                        teslaAttackSpeedMultiplier = 2.0;
                    }
                }

                if (enemy.hp <= 0) break;

                if (!coil.dotTargets) coil.dotTargets = new Map();
                if (!coil.dotTargets.has(enemy)) {
                    coil.dotTargets.set(enemy, currentTime);
                }

                if (currentTime - coil.dotTargets.get(enemy) >= 50) {
                    dealDamage(enemy, { damage: 10, percentDamage: 0.10, isTeslaDot: true });
                    coil.dotTargets.set(enemy, currentTime);
                }
            }
            if (enemy.hp <= 0) break;
        }

        if (!inTeslaAura) {
            for (const coil of teslaCoils) {
                if (coil.dotTargets && coil.dotTargets.has(enemy)) {
                    coil.dotTargets.delete(enemy);
                }
            }
        }

        if (enemy.hp <= 0) {
            if (enemy.type !== 'enemy_bullet') handleEnemyKill(enemy);
            else addExplosion(enemy.x, enemy.y, enemy.size, 'red');
            enemies.splice(i, 1);
            continue;
        }

        if (enemy.type === 'enemy_bullet') {
            enemy.x += enemy.vx * dt * teslaSpeedMultiplier;
            enemy.y += enemy.vy * dt * teslaSpeedMultiplier;

            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size + player.width / 2) {
                if (finalDefense.playerShield) {
                    finalDefense.playerShield = false;
                    finalDefense.playerCooldownEnd = performance.now() + 30000;
                    addExplosion(enemy.x, enemy.y, 50, 'cyan');
                } else {
                    lives--;
                }
                enemy.hp = 0;
            }
            for (const sentinel of sentinels) {
                if (enemy.hp > 0 && Math.hypot(enemy.x - sentinel.x, enemy.y - sentinel.y) < enemy.size + sentinel.size) {
                    dealDamage(sentinel, { damage: enemy.hp });
                    enemy.hp = 0;
                    break;
                }
            }
        } else {
            enemy.y += enemy.speed * dt * teslaSpeedMultiplier;

            if (enemy.type === 'boss' || enemy.type === 'mini-boss') {
                let currentShootTimer = (autoFireInterval * 2) * 0.75;
                if (gloryForJusticeActive) currentShootTimer *= 1.25;
                currentShootTimer *= teslaAttackSpeedMultiplier;

                enemy.shootTimer -= deltaTime;
                if (enemy.shootTimer <= 0) {
                    enemy.shootTimer = currentShootTimer;
                    const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
                    if (target) {
                        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
                        const bulletHp = Math.ceil(10 + Math.random() * 30);
                        enemies.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * (player.speed / 3), vy: Math.sin(angle) * (player.speed / 3), damage: 2, size: 15, hp: bulletHp, maxHp: bulletHp, type: 'enemy_bullet', shield: 0 });
                    }
                }
            }
        }

        if (enemy.hp <= 0) {
            if (enemy.type !== 'enemy_bullet') handleEnemyKill(enemy);
            else addExplosion(enemy.x, enemy.y, enemy.size, 'red');
            enemies.splice(i, 1);
            continue;
        }

        if (enemy.y > boundaryY + enemy.size / 2) {
            if (enemy.type !== 'enemy_bullet') {
                if (finalDefense.boundaryShield) {
                    finalDefense.boundaryShield = false;
                    finalDefense.boundaryCooldownEnd = performance.now() + 30000;
                    addExplosion(enemy.x, enemy.y, 100, 'cyan');
                    enemies.splice(i, 1);
                } else {
                    lives--;
                    enemies.splice(i, 1);
                }
            } else {
                enemies.splice(i, 1);
            }
        } else if (enemy.type !== 'enemy_bullet' && Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.width / 2) {
            if (finalDefense.playerShield) {
                finalDefense.playerShield = false;
                finalDefense.playerCooldownEnd = performance.now() + 30000;
                addExplosion(enemy.x, enemy.y, 100, 'cyan');
            } else {
                lives--;
            }
            enemies.splice(i, 1);
        }
        if (lives <= 0) { gameState = "gameover"; showStartButton("Chơi Lại"); }
    }

    const elapsedTime = currentTime - gameStartTime;
    let currentSpawnInterval = Math.max(initialSpawnInterval - spawnDecreaseRate * (elapsedTime / 1000), minSpawnInterval);
    if (currentTime - lastEnemySpawn > currentSpawnInterval) {
        spawnEnemy(); lastEnemySpawn = currentTime;
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        if (b.type === 'sentinel_special') {
            if (b.target && enemies.includes(b.target)) {
                const dx = b.target.x - b.x, dy = b.target.y - b.y, d = Math.hypot(dx, dy);
                const speed = (9 * 0.65) * (b.speedMultiplier || 1);
                if (d > 0) { b.x += (dx / d) * speed * dt; b.y += (dy / d) * speed * dt; }
            } else {
                if (!b.vxInitial) { b.vxInitial = 0; b.vyInitial = -(9 * 0.65) * (b.speedMultiplier || 1); }
                b.x += b.vxInitial * dt; b.y += b.vyInitial * dt;
            }
        } else { b.x += b.vx * dt; b.y += b.vy * dt; }

        if (b.y < -b.size || b.x < -b.size || b.x > canvas.width + b.size) { bullets.splice(i, 1); continue; }

        for (let enemy of enemies) {
            let enemyRadius = (enemy.type === 'enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - b.x, enemy.y - b.y) < enemyRadius + b.size) {
                if (b.type === 'player_charged') {
                    if (!b.hitEnemies) b.hitEnemies = [];
                    if (b.hitEnemies.includes(enemy)) continue;
                    dealDamage(enemy, { damage: (b.damage >= maxMultiplier ? 10 : b.damage), percentDamage: (b.damage >= maxMultiplier ? 0.12 : 0) });
                    b.hitEnemies.push(enemy);
                } else {
                    dealDamage(enemy, b);
                    bullets.splice(i, 1);
                    break;
                }
            }
        }
    }

    particles = particles.filter(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= deltaTime; return p.lifetime > 0 });
    explosions = explosions.filter(e => { e.lifetime -= deltaTime; return e.lifetime > 0 });
    chainLightningEffects = chainLightningEffects.filter(e => { e.lifetime -= deltaTime; return e.lifetime > 0 });

    updateSentinels(deltaTime);
    updateSkillA(deltaTime);
    updateScatteredProjectiles(deltaTime);
    updateSpirits(deltaTime);
    updateBladeArcProjectiles(deltaTime);
    updateSpiritBullets(deltaTime);
    updateSkillD(deltaTime);
    updateSkillF(deltaTime);
    updateEnergyOrbs(deltaTime, currentTime);
    updateTeslaCoils(deltaTime, currentTime);

    if (screenShake.duration > 0) screenShake.duration -= deltaTime;
}

function gameLoop(timeStamp) {
    if (!lastTimeStamp) lastTimeStamp = timeStamp;
    let deltaTime = timeStamp - lastTimeStamp;
    if (deltaTime > 1000) { gamePaused = true; showStartButton("Tiếp Tục"); requestAnimationFrame(gameLoop); return; }
    lastTimeStamp = timeStamp;
    if (!gamePaused && !loading) { update(deltaTime); draw(); }
    requestAnimationFrame(gameLoop);
}

function startGame() {
    gameState = "playing"; lives = 15; score = 0;
    nextLifeMilestone = 500000;
    bullets = []; enemies = []; explosions = []; particles = [];
    skillAOrbs = []; scatteredProjectiles = [];
    spiritBullets = []; spiritParticles = []; bladeArcProjectiles = [];
    playerClones = []; sentinels = []; killCountForPassive = 0;
    spirits = []; blackHole = null;
    skillAActive = false; skillDCharging = false; skillFState = "ready";
    finalDefense = { playerShield: true, boundaryShield: true, playerCooldownEnd: 0, boundaryCooldownEnd: 0 };

    skillGCharge = 0;
    skillGActive = false;
    skillGEndTime = 0;
    skillGBorderOpacity = 0;
    energyOrbs = [];
    teslaCoils = [];

    player.x = canvas.width / 2;
    gameStartTime = lastEnemySpawn = lastAutoFire = performance.now();
    laserActive = false; laserCooldownEnd = 0; charging = false; gamePaused = false;
    lastSkillA = -Infinity; lastSkillS = -Infinity; lastSkillD = -Infinity; lastSkillF = -Infinity;
    skillASensorRadius = Math.min(canvas.width, canvas.height) * 0.9;
    hideStartButton();
    if (lastTimeStamp === 0) { lastTimeStamp = performance.now(); requestAnimationFrame(gameLoop); }
}

draw();