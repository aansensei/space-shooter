function loseLife() {
    if (playerAbsoluteShield) {
        playerAbsoluteShield = false;
        addExplosion(player.x, player.y, 150, 'gold');
        screenShake = { intensity: 15, duration: 400 };
        return;
    }

    if (lives === 1 && !hasTriggeredLastStand) {
        hasTriggeredLastStand = true;
        playerAbsoluteShield = true;
        sentinels.forEach(s => s.absoluteShield = true);

        screenShake = { intensity: 25, duration: 800 };
        createParticles(player.x, player.y, 150, 'gold', 4, 12);
        addExplosion(player.x, player.y, 250, 'gold');
        return;
    }

    lives--;
}

function playerTakesHit() {
    // ƯU TIÊN 0: Yog-Sothoth - Miễn mọi sát thương trong Lãnh địa Thời Gian
    if (skillShiftActive) {
        // ACCURATE PARRY: đỡ được 1 đòn trong domain → kích hoạt buff
        _triggerAccurateParry();
        return;
    }

    // ƯU TIÊN 1: Hy sinh Lôi Quang Cầu VÀNG (Chiêu A)
    if (skillAActive && skillADefensiveCharges > 0 && skillAOrbs.length > 0) {
        skillADefensiveCharges--;

        let orbIndex = skillAOrbs.findIndex(orb => orb.isDefensive && !orb.target);
        if (orbIndex === -1) orbIndex = skillAOrbs.findIndex(orb => orb.isDefensive);
        if (orbIndex === -1) orbIndex = skillAOrbs.length - 1;

        if (orbIndex !== -1) {
            let orb = skillAOrbs.splice(orbIndex, 1)[0];

            addExplosion(orb.x, orb.y, 40, 'yellow');
            addExplosion(player.x, player.y, 80, 'gold');
            createParticles(player.x, player.y, 20, 'yellow', 2, 6);

            if (skillAOrbs.length === 0) skillAActive = false;
            else {
                updateDefensiveOrbs();
                rebalanceSkillAOrbs();
            }
            return;
        }
    }

    // ƯU TIÊN 2: Khiên phòng hộ cuối cùng (Final Defense)
    if (finalDefense.playerShield) {
        finalDefense.playerShield = false;
        finalDefense.playerCooldownEnd = performance.now() + 25000;
        addExplosion(player.x, player.y, 50, 'cyan');
        return;
    }

    // ƯU TIÊN 3: Last Stand -> Mất mạng
    loseLife();
}

function _triggerAccurateParry() {
    const now = performance.now();
    accurateParryActive = true;
    accurateParryEndTime = now + 4000;

    // Visual feedback
    addExplosion(player.x, player.y, 80, '#ffdd00');
    createParticles(player.x, player.y, 30, '#ffdd00', 3, 10);
    screenShake = { intensity: 8, duration: 200 };

    // Tất cả sentinel nhận khiên 25% Max HP
    sentinels.forEach(s => {
        const shieldGain = Math.ceil(s.maxHp * 0.25);
        s.shield = (s.shield || 0) + shieldGain;
    });
}

function update(rawDeltaTime) {
    if (gameState !== "playing" || gamePaused) return;
    const currentTime = performance.now();

    // KIỂM TRA LÃNH ĐỊA THỜI GIAN: Tự hủy sau 8 giây
    if (skillShiftActive && currentTime - skillShiftChargeStart >= skillShiftMaxHold) {
        cancelSkillShift();
    }

    // THUẬT TOÁN BẺ CONG THỜI GIAN: Giảm 85% tốc độ mô phỏng
    const timeScale = skillShiftActive ? 0.15 : 1.0;
    const deltaTime = rawDeltaTime * timeScale; // Bẻ cong deltaTime vật lý
    const dt = deltaTime / 16.67;

    // Tích lũy thời gian game thực tế (dùng cho HUD timer và spawn rate)
    gameElapsedTime += deltaTime;

    // Bẻ cong (kéo dài) các Timer hồi chiêu của phe người chơi và Enemy Spawn
    if (skillShiftActive) {
        let delay = rawDeltaTime * 0.85;
        lastAutoFire += delay;
        if (charging) chargeStartTime += delay;
        if (laserActive) {
            laserStartTime += delay;
            lastLaserTick += delay;
        }
        lastSkillA += delay;
        lastSkillS += delay;
        lastSkillD += delay;
        lastSkillF += delay;
        if (skillGActive) skillGEndTime += delay;
        finalDefense.playerCooldownEnd += delay;
        finalDefense.boundaryCooldownEnd += delay;
        lastEnemySpawn += delay;
    }

    gloryForJusticeActive = (enemies.filter(e => !e.type.startsWith('enemy_bullet')).length > 4) || skillGActive ||
        enemies.some(e => e.type === 'boss' || e.type === 'thaelis' || e.type === 'aegis_core' || e.type === 'marchosias');

    // Accurate Parry expiry
    if (accurateParryActive && performance.now() >= accurateParryEndTime) {
        accurateParryActive = false;
    }

    bossShockwaves.forEach(wave => {
        if (!wave.active) return;
        wave.radius += wave.speed * dt;

        for (let i = bullets.length - 1; i >= 0; i--) {
            let d = Math.hypot(bullets[i].x - wave.x, bullets[i].y - wave.y);
            if (d < wave.radius + 20) {
                createParticles(bullets[i].x, bullets[i].y, 3, 'purple', 1, 3);
                bullets.splice(i, 1);
            }
        }
        for (let i = spiritBullets.length - 1; i >= 0; i--) {
            let d = Math.hypot(spiritBullets[i].x - wave.x, spiritBullets[i].y - wave.y);
            if (d < wave.radius + 20) {
                createParticles(spiritBullets[i].x, spiritBullets[i].y, 3, 'purple', 1, 3);
                spiritBullets.splice(i, 1);
            }
        }

        sentinels.forEach(sentinel => {
            if (!wave.hitSentinels.has(sentinel)) {
                let d = Math.hypot(sentinel.x - wave.x, sentinel.y - wave.y);
                if (d <= wave.radius) {
                    dealDamage(sentinel, { damage: sentinel.maxHp * 0.25 });
                    wave.hitSentinels.add(sentinel);
                    addExplosion(sentinel.x, sentinel.y, 40, 'purple');
                }
            }
        });

        if (wave.radius >= wave.maxRadius) wave.active = false;
    });
    bossShockwaves = bossShockwaves.filter(w => w.active);

    aegisLasers.forEach(laser => {
        if (!laser.fired) {
            laser.delay -= deltaTime;
            if (laser.delay <= 0) {
                laser.fired = true;
                laser.duration = 200;
                screenShake = { intensity: 8, duration: 200 };

                if (distToSegment(player, laser.start, laser.end) < player.hitRadius + 15) {
                    playerTakesHit();
                }

                sentinels.forEach(s => {
                    if (distToSegment(s, laser.start, laser.end) < s.size + 15) {
                        dealDamage(s, { damage: s.maxHp * 0.18 });
                        addExplosion(s.x, s.y, 20, 'red');
                    }
                });
            }
        } else {
            laser.duration -= deltaTime; // Laze mờ đi cũng chậm lại
        }
    });
    aegisLasers = aegisLasers.filter(l => !l.fired || l.duration > 0);

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

    if (Math.random() < 0.6) {
        particles.push({
            x: player.x - 5.5 + (Math.random() * 2 - 1),
            y: player.y + 26,
            vx: (Math.random() - 0.5) * 0.5,
            vy: 4 + Math.random() * 3,
            lifetime: 100 + Math.random() * 100, maxLifetime: 200,
            size: Math.random() * 2 + 1, color: 'rgba(0, 255, 255, 0.7)'
        });
        particles.push({
            x: player.x + 5.5 + (Math.random() * 2 - 1),
            y: player.y + 26,
            vx: (Math.random() - 0.5) * 0.5,
            vy: 4 + Math.random() * 3,
            lifetime: 100 + Math.random() * 100, maxLifetime: 200,
            size: Math.random() * 2 + 1, color: 'rgba(0, 255, 255, 0.7)'
        });
    }

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
                            // Laser chạm khiên Mar → tính 1 hit, không damage Mar
                            if (enemy.type === 'marchosias' && enemy.arcShield && enemy.arcShield.hp > 0) {
                                if (Math.random() < 0.20) _tryTriggerMarchosiasCounter(enemy);
                            } else if (enemy.type === 'leviathan' && enemy.afoShieldActive) {
                                // Laser hit Leviathan shield → count hits, no body damage
                                enemy.afoHitCount = (enemy.afoHitCount || 0) + 1;
                            } else {
                                dealDamage(enemy, { damage: 10, percentDamage: 0.26 });
                            }
                            break;
                        }
                    }
                });
            }

            const pullRadius = 200, pullStrength = 0.05;
            enemies.forEach(enemy => {
                if (enemy.type.startsWith('enemy_bullet') || enemy.type === 'embryo') return;

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

        if (enemy.type === 'embryo') {
            enemy.hatchTimer -= deltaTime;
            if (enemy.hatchTimer <= 0) {
                enemy.hp = 0;
                enemy.hatched = true;
                enemies.push({
                    x: enemy.x, y: enemy.y, size: 20 + Math.random() * 10,
                    speed: (1 + Math.random() * 2) * 0.8,
                    hp: enemy.originalHpAtHatch + 60, maxHp: enemy.originalHpAtHatch + 60,
                    isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
                    type: 'normal', shootTimer: 1000
                });
            }
        }

        if (enemy.type === 'aegis_core') {
            let healAmt = enemy.maxHp * 0.0155 * (deltaTime / 1000);
            let shieldAmt = enemy.maxHp * 0.40;
            let auraRadius = canvas.width / 2;

            enemies.forEach(ally => {
                if (ally === enemy) {
                    // Aegis tự heal chính mình — 50% hiệu quả
                    let selfHeal = healAmt * 0.5;
                    enemy.hp = Math.min(enemy.maxHp, enemy.hp + selfHeal);
                    return;
                }
                let d = Math.hypot(ally.x - enemy.x, ally.y - enemy.y);
                if (d <= auraRadius) {
                    let finalHeal = ally.soulReaver ? healAmt * 0.75 : healAmt;
                    ally.hp = Math.min(ally.maxHp, ally.hp + finalHeal);

                    if (!ally.aegisShieldReceived) {
                        let finalShield = ally.soulReaver ? shieldAmt * 0.75 : shieldAmt;
                        ally.shield = (ally.shield || 0) + finalShield;
                        ally.aegisShieldReceived = true;
                    }
                }
            });

            enemy.shootTimer -= deltaTime;
            if (enemy.shootTimer <= 0) {
                enemy.shootTimer = 5000;
                createAegisTelegraph(enemy.x, enemy.y, player);
                let availableSents = [...sentinels].sort(() => 0.5 - Math.random()).slice(0, 3);
                availableSents.forEach(s => createAegisTelegraph(enemy.x, enemy.y, s));
            }
        }

        let teslaSpeedMultiplier = 1.0;
        let teslaAttackSpeedMultiplier = 1.0;
        let inTeslaAura = false;
        let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;

        let aegisSpeedMultiplier = 1.0;
        for (const aegis of enemies) {
            if (aegis.type === 'aegis_core') {
                if (Math.hypot(enemy.x - aegis.x, enemy.y - aegis.y) <= canvas.width / 2) {
                    aegisSpeedMultiplier = 1.05;
                    break;
                }
            }
        }

        for (const coil of teslaCoils) {
            if (coil.hp <= 0) continue;

            const distToCoil = Math.hypot(enemy.x - coil.x, enemy.y - coil.y);

            if (distToCoil < TESLA_AURA_RADIUS + enemyRadius) {
                inTeslaAura = true;

                if (enemy.type.startsWith('enemy_bullet')) {
                    teslaSpeedMultiplier = 0.50;
                    if (distToCoil < coil.size / 2 + enemy.size) {
                        coil.hp -= enemy.hp;
                        enemy.hp = 0;
                    }
                } else if (enemy.type === 'leviathan' && enemy.afoShieldActive) {
                    // Leviathan immune to CC while shield active — no slow, still takes dot
                    teslaSpeedMultiplier = 1.0;
                } else {
                    teslaSpeedMultiplier = 0.30;
                    if (enemy.type === 'boss' || enemy.type === 'thaelis' || enemy.type === 'aegis_core') {
                        teslaAttackSpeedMultiplier = 2.0;
                    }
                }

                if (enemy.hp <= 0) break;

                if (!coil.dotTargets) coil.dotTargets = new Map();
                if (!coil.dotTargets.has(enemy)) {
                    coil.dotTargets.set(enemy, currentTime); // Dot timer runs in real-time
                }

                if (currentTime - coil.dotTargets.get(enemy) >= 125) {
                    dealDamage(enemy, { damage: 10, percentDamage: 0.13, isTeslaDot: true });
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
            // Leviathan: chỉ die thực sự khi dyingLaserPhase đã xong (hp set về 0 bởi updateLeviathan)
            // updateLeviathan giữ hp=1 trong suốt dying phase, chỉ set hp=0 sau khi laser xong
            if (enemy.type === 'leviathan' && !enemy.dyingLaserPhase) {
                // hp xuống 0 nhưng chưa trigger dying phase — updateLeviathan sẽ handle
                // (Điều này không nên xảy ra vì updateLeviathan trigger dying tại hp<=1)
                continue;
            }
            if (enemy.type === 'leviathan' && enemy.dyingLaserPhase && !enemy.dyingLaserFired) {
                // Đang trong warning phase — giữ alive
                continue;
            }

            if (enemy.type === 'thaelis' && !enemy.reincarnated) {
                enemy.reincarnated = true;
                for (let k = 0; k < 3; k++) {
                    let angle = (Math.PI * 2 / 3) * k;
                    let eggHp = enemy.maxHp / 3 + 50 + Math.random() * 50;
                    enemies.push({
                        x: enemy.x + Math.cos(angle) * 30, y: enemy.y + Math.sin(angle) * 30,
                        size: 15, speed: 0, hp: eggHp, maxHp: eggHp, type: 'embryo',
                        shield: 0, hatchTimer: 3000, originalHpAtHatch: eggHp
                    });
                }
            }

            if (!enemy.type.startsWith('enemy_bullet') && enemy.type !== 'embryo') {
                if (!enemy.hatched) handleEnemyKill(enemy);
            } else if (enemy.type !== 'embryo') {
                if (!enemy.isSplit) addExplosion(enemy.x, enemy.y, enemy.size, 'red');
            }

            enemies.splice(i, 1);
            continue;
        }

        if (enemy.type.startsWith('enemy_bullet')) {
            enemy.x += enemy.vx * dt * teslaSpeedMultiplier * aegisSpeedMultiplier;
            enemy.y += enemy.vy * dt * teslaSpeedMultiplier * aegisSpeedMultiplier;

            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size + player.hitRadius) {
                playerTakesHit();
                enemy.hp = 0;
            }

            for (const sentinel of sentinels) {
                if (enemy.hp > 0 && Math.hypot(enemy.x - sentinel.x, enemy.y - sentinel.y) < enemy.size + sentinel.size) {
                    if (enemy.type === 'enemy_bullet_small') {
                        dealDamage(sentinel, { damage: sentinel.maxHp * 0.02 });
                    } else {
                        dealDamage(sentinel, { damage: enemy.hp });
                    }
                    enemy.hp = 0;
                    break;
                }
            }

            if (enemy.type === 'enemy_bullet_large') {
                enemy.splitTimer -= deltaTime;
                if (enemy.splitTimer <= 0) {
                    enemy.hp = 0;
                    enemy.isSplit = true;
                    const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
                    let baseAngle = target ? Math.atan2(target.y - enemy.y, target.x - enemy.x) : Math.PI / 2;
                    for (let j = -1; j <= 1; j++) {
                        let angle = baseAngle + j * 0.4;
                        enemies.push({
                            x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 3.73, vy: Math.sin(angle) * 3.73,
                            damage: 2, size: 10.8, hp: 60, maxHp: 60, type: 'enemy_bullet_small', shield: 0
                        });
                    }
                }
            }

        } else if (enemy.type === 'leviathan') {
            // Leviathan update handled by updateLeviathan()
            updateLeviathan(enemy, deltaTime);

        } else if (enemy.type !== 'embryo' && enemy.type !== 'marchosias_minion') {
            enemy.y += enemy.speed * dt * teslaSpeedMultiplier * aegisSpeedMultiplier;

            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.hitRadius) {
                playerTakesHit();
                if (enemy.type === 'boss' || enemy.type === 'thaelis') {
                } else {
                    enemy.hp = 0;
                }
            }

            if (enemy.type === 'boss' || enemy.type === 'thaelis') {
                let currentShootTimer = (enemy.type === 'thaelis') ? 1000 : (autoFireInterval * 2) * 0.75;
                if (gloryForJusticeActive) currentShootTimer *= 1.25;
                currentShootTimer *= teslaAttackSpeedMultiplier;

                enemy.shootTimer -= deltaTime;
                if (enemy.shootTimer <= 0) {
                    enemy.shootTimer = currentShootTimer;
                    const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
                    if (target) {
                        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
                        if (enemy.type === 'thaelis') {
                            enemies.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 3.36, vy: Math.sin(angle) * 3.36, damage: 2, size: 18, hp: 180, maxHp: 180, type: 'enemy_bullet_large', shield: 0, splitTimer: 600 });
                        } else {
                            const bulletHp = Math.ceil(10 + Math.random() * 30);
                            enemies.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * (player.speed / 3), vy: Math.sin(angle) * (player.speed / 3), damage: 2, size: 15, hp: bulletHp, maxHp: bulletHp, type: 'enemy_bullet', shield: 0 });
                        }
                    }
                }
            }

            if (enemy.type === 'normal') {
                enemy.shootTimer -= deltaTime;
                if (enemy.shootTimer <= 0) {
                    enemy.shootTimer = 1000;
                    const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
                    if (target) {
                        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
                        enemies.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * (player.speed / 3), vy: Math.sin(angle) * (player.speed / 3), damage: enemy.hp, size: 10, hp: enemy.hp, maxHp: enemy.hp, type: 'enemy_bullet', shield: 0 });
                    }
                }
            }

            // ── MARCHOSIAS ────────────────────────────────────────────
            if (enemy.type === 'marchosias') {
                // Trigger Sword khi HP còn <= 1% lần đầu tiên
                if (!enemy.swordLastStandTriggered && enemy.hp <= enemy.maxHp * 0.01) {
                    enemy.swordLastStandTriggered = true;
                    _fireMarchosiasDeathSwords(enemy);
                }

                // Khiên hướng về phía player — tâm cung luôn track player
                // Cung 90° (±45°) đặt ở hướng từ Marchosias → player
                if (enemy.arcShield) {
                    const targetAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                    // Xoay mượt về hướng player
                    let diff = targetAngle - enemy.arcShield.angle;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    enemy.arcShield.angle += diff * 0.08 * dt;
                }

                // Tấn công bình thường: 2 đạn/giây, target vị trí player hoặc sentinel gần nhất
                enemy.shootTimer -= deltaTime;
                if (enemy.shootTimer <= 0) {
                    enemy.shootTimer = 1000;
                    const bulletHp = Math.ceil(enemy.hp * 0.0125);
                    const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
                    if (target) {
                        for (let bshot = 0; bshot < 2; bshot++) {
                            const spreadA = (bshot - 0.5) * 0.18;
                            const baseA = Math.atan2(target.y - enemy.y, target.x - enemy.x);
                            const angle = baseA + spreadA;
                            enemies.push({
                                x: enemy.x, y: enemy.y,
                                vx: Math.cos(angle) * (player.speed / 3),
                                vy: Math.sin(angle) * (player.speed / 3),
                                damage: 2, size: 10,
                                hp: bulletHp, maxHp: bulletHp,
                                type: 'enemy_bullet', shield: 0
                            });
                        }
                    }
                }

                // Counter windups — xử lý nhiều đòn song song, không giới hạn
                if (!enemy.marchosiasWindups) enemy.marchosiasWindups = [];
                for (let wi = enemy.marchosiasWindups.length - 1; wi >= 0; wi--) {
                    const windup = enemy.marchosiasWindups[wi];
                    windup.timer -= deltaTime;
                    if (windup.timer <= 0) {
                        const tx = windup.target.x, ty = windup.target.y;
                        const angle = Math.atan2(ty - enemy.y, tx - enemy.x);
                        marchosiasBlades.push({
                            x: enemy.x, y: enemy.y,
                            vx: Math.cos(angle) * 13.2, vy: Math.sin(angle) * 13.2,
                            angle: angle, radius: 88,
                            delay: 0, active: true,
                            originX: enemy.x, originY: enemy.y,
                            hitEnemies: [], hitPlayer: false,
                        });
                        enemy.marchosiasWindups.splice(wi, 1);
                    }
                }
            }

            // ── MARCHOSIAS MINION (handled in separate else-if below) ──
        } else if (enemy.type === 'marchosias_minion') {
            const mmdx = player.x - enemy.x, mmdy = player.y - enemy.y;
            const mmd = Math.hypot(mmdx, mmdy);
            if (mmd > 0) { enemy.x += (mmdx / mmd) * enemy.speed * dt; enemy.y += (mmdy / mmd) * enemy.speed * dt; }
            enemy.shootTimer -= deltaTime;
            if (enemy.shootTimer <= 0) {
                enemy.shootTimer = 1000;
                const tgt = findClosestSentinelOrPlayer(enemy.x, enemy.y);
                if (tgt) {
                    const ang = Math.atan2(tgt.y - enemy.y, tgt.x - enemy.x);
                    enemies.push({ x: enemy.x, y: enemy.y, vx: Math.cos(ang) * (player.speed / 3), vy: Math.sin(ang) * (player.speed / 3), damage: enemy.hp, size: 10, hp: enemy.hp, maxHp: enemy.hp, type: 'enemy_bullet', shield: 0 });
                }
            }
            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.hitRadius) {
                playerTakesHit(); enemy.hp = 0;
            }
        }

        if (enemy.hp <= 0) {
            // Leviathan: giữ alive trong dying phase
            if (enemy.type === 'leviathan' && !enemy.dyingLaserPhase) {
                continue;
            }
            if (enemy.type === 'leviathan' && enemy.dyingLaserPhase && !enemy.dyingLaserFired) {
                continue;
            }

            if (enemy.type === 'thaelis' && !enemy.reincarnated) {
                enemy.reincarnated = true;
                for (let k = 0; k < 3; k++) {
                    let angle = (Math.PI * 2 / 3) * k;
                    let eggHp = enemy.maxHp / 3 + 50 + Math.random() * 50;
                    enemies.push({
                        x: enemy.x + Math.cos(angle) * 30, y: enemy.y + Math.sin(angle) * 30,
                        size: 15, speed: 0, hp: eggHp, maxHp: eggHp, type: 'embryo',
                        shield: 0, hatchTimer: 3000, originalHpAtHatch: eggHp
                    });
                }
            }

            // ASSIMILATION: Marchosias tách 3 robot nhỏ khi chết
            if (enemy.type === 'marchosias') {
                // Convert tất cả pending windups thành blades ngay lập tức (không để mất khi splice)
                if (enemy.marchosiasWindups && enemy.marchosiasWindups.length > 0) {
                    enemy.marchosiasWindups.forEach(windup => {
                        const tx = windup.target.x, ty = windup.target.y;
                        const angle = Math.atan2(ty - enemy.y, tx - enemy.x);
                        marchosiasBlades.push({
                            x: enemy.x, y: enemy.y,
                            vx: Math.cos(angle) * 13.2, vy: Math.sin(angle) * 13.2,
                            angle, radius: 88,
                            delay: windup.timer > 0 ? windup.timer : 0,
                            active: windup.timer <= 0,
                            originX: enemy.x, originY: enemy.y,
                            hitEnemies: [], hitPlayer: false,
                        });
                    });
                    enemy.marchosiasWindups = [];
                }
                _fireMarchosiasDeathSwords(enemy);
                addExplosion(enemy.x, enemy.y, enemy.size * 1.2, '#00ff88');
                createParticles(enemy.x, enemy.y, 40, '#00ff88', 2, 8);
                for (let k = 0; k < 3; k++) {
                    const spawnAngle = (Math.PI * 2 / 3) * k;
                    const spawnX = enemy.x + Math.cos(spawnAngle) * enemy.size * 0.5;
                    const spawnY = enemy.y + Math.sin(spawnAngle) * enemy.size * 0.5;
                    spawnMarchosiasMinion(spawnX, spawnY, enemy.maxHp);
                }
            }

            if (!enemy.type.startsWith('enemy_bullet') && enemy.type !== 'embryo') {
                if (!enemy.hatched) handleEnemyKill(enemy);
            } else if (enemy.type !== 'embryo') {
                if (!enemy.isSplit) addExplosion(enemy.x, enemy.y, enemy.size, 'red');
            }

            enemies.splice(i, 1);
            continue;
        }

        if (enemy.y > boundaryY + enemy.size / 2) {
            if (!enemy.type.startsWith('enemy_bullet')) {
                if (finalDefense.boundaryShield) {
                    finalDefense.boundaryShield = false;
                    finalDefense.boundaryCooldownEnd = performance.now() + 25000;
                    addExplosion(enemy.x, enemy.y, 100, 'cyan');
                    enemies.splice(i, 1);
                } else {
                    loseLife();
                    enemies.splice(i, 1);
                }
            } else {
                enemies.splice(i, 1);
            }
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
            let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - b.x, enemy.y - b.y) < enemyRadius + b.size) {

                // ── LEVIATHAN ALL FOR ONE SHIELD CHECK ──────────────
                if (enemy.type === 'leviathan' && enemy.afoShieldActive) {
                    enemy.afoHitCount = (enemy.afoHitCount || 0) + 1;
                    createParticles(b.x, b.y, 2, '#00e5ff', 1, 3);
                    bullets.splice(i, 1);
                    break;
                }

                // ── MARCHOSIAS ARC SHIELD CHECK ──────────────────────
                if (enemy.type === 'marchosias' && enemy.arcShield && enemy.arcShield.hp > 0) {
                    const bulletAngle = Math.atan2(b.y - enemy.y, b.x - enemy.x);
                    const shieldAngle = enemy.arcShield.angle;
                    let angleDiff = bulletAngle - shieldAngle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    if (Math.abs(angleDiff) < Math.PI / 4) {
                        // Trúng khiên — 50% DR, KHÔNG damage Mar
                        const effectiveHp = enemy.arcShield.maxHp;
                        let dmg = Math.ceil(b.damage + (effectiveHp * (b.percentDamage || 0)));
                        if (gloryForJusticeActive) dmg = Math.ceil(dmg * 1.55);
                        dmg = Math.ceil(dmg * 0.50);
                        const shieldWasAlive = enemy.arcShield.hp > 0;
                        enemy.arcShield.hp = Math.max(0, enemy.arcShield.hp - dmg);

                        // Mỗi đòn trúng khiên: 10% chance counter
                        if (Math.random() < 0.20) _tryTriggerMarchosiasCounter(enemy);
                        // Khiên vừa vỡ → counter ngay
                        if (shieldWasAlive && enemy.arcShield.hp <= 0) {
                            addExplosion(enemy.x, enemy.y, enemy.size * 0.7, '#00ff88');
                            _tryTriggerMarchosiasCounter(enemy);
                        }

                        createParticles(b.x, b.y, 3, '#aaffaa', 1, 4);
                        bullets.splice(i, 1);
                        break;
                    }
                }

                if (b.type === 'player_charged') {
                    if (!b.hitEnemies) b.hitEnemies = [];
                    if (b.hitEnemies.includes(enemy)) continue;
                    dealDamage(enemy, { damage: (b.damage >= maxMultiplier ? 10 : b.damage), percentDamage: (b.damage >= maxMultiplier ? 0.12 : 0) });
                    b.hitEnemies.push(enemy);
                } else {
                    dealDamage(enemy, b);

                    if (b.type === 'sentinel_special' && b.sourceSentinel && b.sourceSentinel.hp > 0) {
                        b.sourceSentinel.hp = Math.min(b.sourceSentinel.maxHp, b.sourceSentinel.hp + 4);
                        createParticles(b.sourceSentinel.x, b.sourceSentinel.y, 5, 'lime', 1, 3);
                    }

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
    updateSoulReaverDoT(deltaTime);
    updateSkillA(deltaTime);
    updateScatteredProjectiles(deltaTime);
    updateSpirits(deltaTime);
    updateBladeArcProjectiles(deltaTime);
    updateSpiritBullets(deltaTime);
    updateSkillD(deltaTime);
    updateSkillF(deltaTime);
    updateEnergyOrbs(deltaTime, currentTime);
    updateTeslaCoils(deltaTime, currentTime);
    updateMarchosiasBlades(deltaTime);

    // Update Leviathan handled inside enemies for loop above

    // Leviathan Perseverance sweep — xóa đạn phe player và check hit
    enemies.forEach(e => {
        if (e.type === 'leviathan' && e.perseveranceFiring) {
            const sweepAngle = e.perseveranceSweepCurrent;
            const sweepHalfWidth = 0.18; // ~10 độ mỗi bên
            // Xóa đạn phe player trong vùng quét (trừ những thứ immune)
            const immuneTypes = ['spirit_blade_arc', 'skill_f', 'black_hole', 'energy_link', 'tesla_lightning', 'overload_laser'];
            bullets = bullets.filter(b => {
                const a = Math.atan2(b.y - e.y, b.x - e.x);
                const diff = Math.abs(((a - sweepAngle) + Math.PI) % (Math.PI * 2) - Math.PI);
                if (diff < sweepHalfWidth && Math.hypot(b.x - e.x, b.y - e.y) < canvas.width) {
                    return false; // xóa đạn
                }
                return true;
            });
            spiritBullets = spiritBullets.filter(b => {
                const a = Math.atan2(b.y - e.y, b.x - e.x);
                const diff = Math.abs(((a - sweepAngle) + Math.PI) % (Math.PI * 2) - Math.PI);
                return diff >= sweepHalfWidth;
            });
            skillAOrbs = skillAOrbs.filter(b => {
                const a = Math.atan2(b.y - e.y, b.x - e.x);
                const diff = Math.abs(((a - sweepAngle) + Math.PI) % (Math.PI * 2) - Math.PI);
                return diff >= sweepHalfWidth;
            });
            // Hit player
            const pa = Math.atan2(player.y - e.y, player.x - e.x);
            const pdiff = Math.abs(((pa - sweepAngle) + Math.PI) % (Math.PI * 2) - Math.PI);
            if (pdiff < sweepHalfWidth && Math.hypot(player.x - e.x, player.y - e.y) < canvas.width * 0.8) {
                if (!e._persHitPlayer) { e._persHitPlayer = true; playerTakesHit(); }
            } else { e._persHitPlayer = false; }
            // Hit sentinels
            const hits = e.afoHitCount || 1;
            sentinels.forEach(s => {
                const sa = Math.atan2(s.y - e.y, s.x - e.x);
                const sdiff = Math.abs(((sa - sweepAngle) + Math.PI) % (Math.PI * 2) - Math.PI);
                if (sdiff < sweepHalfWidth) {
                    const pct = 0.002 + (hits / 1000) * 0.0015;
                    dealDamage(s, { damage: 0, percentDamage: Math.min(0.0035, pct) });
                }
            });
        }
    });

    // Leviathan death lasers — tồn tại độc lập sau khi Leviathan chết
    if (!window._levDeathLasers) window._levDeathLasers = [];
    window._levDeathLasers = window._levDeathLasers.filter(laser => {
        laser.elapsed = (laser.elapsed || 0) + deltaTime;
        if (!laser.active) return false;

        // Hit check khi laser đang active
        if (!laser.hitPlayer) {
            const dx = Math.cos(laser.angle), dy = Math.sin(laser.angle);
            // Kiểm tra khoảng cách vuông góc từ player đến đường thẳng laser
            const tx = player.x - laser.ox, ty = player.y - laser.oy;
            const proj = tx * dx + ty * dy;
            if (proj > 0) {
                const perpX = tx - proj * dx, perpY = ty - proj * dy;
                if (Math.hypot(perpX, perpY) < player.hitRadius + 10) {
                    laser.hitPlayer = true;
                    playerTakesHit();
                }
            }
        }
        sentinels.forEach(s => {
            if (!laser.hitSentinels) laser.hitSentinels = new Set();
            if (!laser.hitSentinels.has(s)) {
                const dx = Math.cos(laser.angle), dy = Math.sin(laser.angle);
                const tx = s.x - laser.ox, ty = s.y - laser.oy;
                const proj = tx * dx + ty * dy;
                if (proj > 0) {
                    const perpX = tx - proj * dx, perpY = ty - proj * dy;
                    if (Math.hypot(perpX, perpY) < s.size + 10) {
                        laser.hitSentinels.add(s);
                        const hits = laser.levHits || 1;
                        dealDamage(s, { damage: 0, percentDamage: (hits / 3) * 0.0015 });
                    }
                }
            }
        });

        return laser.elapsed < laser.lifetime;
    });

    if (screenShake.duration > 0) screenShake.duration -= deltaTime;
}

function gameLoop(timeStamp) {
    if (!lastTimeStamp) lastTimeStamp = timeStamp;
    let deltaTime = timeStamp - lastTimeStamp;
    lastTimeStamp = timeStamp;

    // deltaTime quá lớn → tab bị ẩn hoặc máy lag → pause và reset clock
    if (deltaTime > 200 && gameState === "playing" && !gamePaused) {
        gamePaused = true;
        showPauseScreen();
    }

    // Luôn vẽ (để màn hình không đóng băng), chỉ update khi không pause
    if (!gamePaused && !loading) {
        update(Math.min(deltaTime, 200));
    }
    draw(gamePaused || loading ? 0 : deltaTime);

    requestAnimationFrame(gameLoop); // luôn chạy loop
}

function startGame() {
    gameState = "playing"; lives = 12;
    score = 0;
    nextLifeMilestone = 500000;
    bullets = []; enemies = []; explosions = []; particles = [];
    skillAOrbs = []; scatteredProjectiles = [];
    skillADefensiveCharges = 0;

    // Reset Skill Shift
    skillShiftActive = false;
    skillShiftChargeStart = 0;
    lastSkillShift = -Infinity;

    spiritBullets = []; spiritParticles = []; bladeArcProjectiles = [];
    playerClones = []; sentinels = []; killCountForPassive = 0;
    spirits = []; blackHole = null;
    bossShockwaves = [];
    aegisLasers = [];
    marchosiasBlades = [];
    window._levDeathLasers = [];
    window._lastLeviathanSpawnTime = null;
    accurateParryActive = false;
    accurateParryEndTime = 0;
    skillAActive = false; skillDCharging = false; skillFState = "ready";
    finalDefense = { playerShield: true, boundaryShield: true, playerCooldownEnd: 0, boundaryCooldownEnd: 0 };

    hasTriggeredLastStand = false;
    playerAbsoluteShield = false;

    skillGCharge = 0;
    skillGActive = false;
    skillGEndTime = 0;
    skillGBorderOpacity = 0;
    energyOrbs = [];
    teslaCoils = [];

    player.x = canvas.width / 2;
    gameStartTime = lastEnemySpawn = lastAutoFire = performance.now();
    gameElapsedTime = 0;
    laserActive = false; laserCooldownEnd = 0; charging = false; gamePaused = false;
    lastSkillA = -Infinity; lastSkillS = -Infinity; lastSkillD = -Infinity; lastSkillF = -Infinity;
    skillASensorRadius = Math.min(canvas.width, canvas.height) * 0.9;
    hideStartButton();
    lastTimeStamp = performance.now();
    // gameLoop đang chạy liên tục từ draw(16.67) ở cuối file — không cần khởi động lại
}

// Khởi động game loop một lần duy nhất khi trang load
requestAnimationFrame(gameLoop);