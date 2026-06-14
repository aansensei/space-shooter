function loseLife() {
    if (playerAbsoluteShield) {
        playerAbsoluteShield = false;
        addExplosion(player.x, player.y, 150, 'gold');
        _setShake(15, 400);
        return;
    }

    if (lives === 1 && !hasTriggeredLastStand) {
        hasTriggeredLastStand = true;
        playerAbsoluteShield = true;
        sentinels.forEach(s => s.absoluteShield = true);

        _setShake(25, 800);
        createParticles(player.x, player.y, 150, 'gold', 4, 12);
        addExplosion(player.x, player.y, 250, 'gold');
        return;
    }

    lives--;
    window._hitVignetteStart = performance.now(); // trigger red border flash
}

function playerTakesHit(attacker) {
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

            // Orb Retaliation: curse the host of the attacker if targetable
            // abyssal_chain and veilshroud_echo never propagate curse, even to host
            // enemy_bullet traces to ownerRef (the enemy that fired it)
            let _curseTarget = attacker;
            if (attacker) {
                if (attacker.type === 'abyssal_chain' || attacker.type === 'veilshroud_echo') {
                    _curseTarget = null;
                } else if (attacker.type && attacker.type.startsWith('enemy_bullet')) {
                    _curseTarget = attacker.ownerRef || null;
                }
            }
            if (_curseTarget && _curseTarget.hp > 0
                && !(_curseTarget.type && _curseTarget.type.startsWith('enemy_bullet'))
                && _curseTarget.type !== 'abyssal_chain'
                && _curseTarget.type !== 'veilshroud_echo'
                && _curseTarget.type !== 'leviathan'
                && !_curseTarget.inCoronation
                && !(_curseTarget.type === 'marchosias' && _curseTarget.arcBarrier && _curseTarget.arcBarrier.hp > 0)
                && !(_curseTarget.type === 'aegis_core' && _curseTarget.aegisInvulnerable)) {
                _curseTarget.soulReaver = true;
                _curseTarget._orbRetaliationSlowEnd = performance.now() + 3000;
                createParticles(_curseTarget.x, _curseTarget.y, 12, '#d800ff', 2, 5);
            }

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
    _setShake(8, 200);

    // Tất cả sentinel nhận Iron Body 1.25s
    sentinels.forEach(s => {
        s.ironBody = true;
        s.ironBodyEnd = now + 1250;
    });
}

// Sentinel Parry buff
function _triggerSentinelParry(parrySentinel) {
    const now = performance.now();

    accurateParryActive = true;
    accurateParryEndTime = now + 4000;

    // Bright gold burst at the sentinel that parried
    addExplosion(parrySentinel.x, parrySentinel.y, parrySentinel.size * 3, '#ffdd00');
    addExplosion(parrySentinel.x, parrySentinel.y, parrySentinel.size * 1.5, '#ffffff');
    // Radial gold particles bursting outward
    for (let i = 0; i < 22; i++) {
        const a = (Math.PI * 2 / 22) * i;
        const spd = 5 + Math.random() * 7;
        particles.push({
            x: parrySentinel.x, y: parrySentinel.y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            color: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? '#ffe066' : '#ffaa00'),
            size: 3 + Math.random() * 4,
            lifetime: 400 + Math.random() * 200, maxLifetime: 600
        });
    }
    // Gold ring ripple at player
    addExplosion(player.x, player.y, 70, '#ffcc00');
    createParticles(player.x, player.y, 18, '#ffdd00', 2, 7);
    _setShake(7, 200);

    // All sentinels: DR buff 10% for 4s
    sentinels.forEach(s => {
        s.sentinelParryBuff = true;
        s.sentinelParryBuffEnd = now + 4000;
    });
}

function update(rawDeltaTime) {
    if (gameState !== "playing" || gamePaused) return;
    const currentTime = performance.now();

    // Mobile: pin player.y to boundaryY every frame, triệt để fix position
    if (typeof _platform !== 'undefined' && _platform === 'mobile') {
        player.y = boundaryY - 18;
    }

    // KIỂM TRA LÃNH ĐỊA THỜI GIAN: Tự hủy sau 8 giây
    if (skillShiftActive && currentTime - skillShiftChargeStart >= skillShiftMaxHold) {
        cancelSkillShift();
    }

    // THUẬT TOÁN BẺ CONG THỜI GIAN: Giảm 85% tốc độ mô phỏng
    // slowing deltaTime here auto-slows everything that uses it, no per-entity guards needed
    const timeScale = skillShiftActive ? 0.15 : 1.0;
    const deltaTime = rawDeltaTime * timeScale; // Bẻ cong deltaTime vật lý
    const dt = deltaTime / 16.67;

    // Tích lũy thời gian game thực tế (dùng cho HUD timer và spawn rate)
    gameElapsedTime += deltaTime;

    // Bẻ cong (kéo dài) các Timer hồi chiêu của phe người chơi và Enemy Spawn
    if (skillShiftActive) {
        // push timestamps forward so player cooldowns tick at real speed, not slowed speed
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
        finalDefense.playerCooldownEnd += delay;
        finalDefense.boundaryCooldownEnd += delay;
        lastEnemySpawn += delay;
    }

    // recalc every frame bc enemies spawn and die constantly
    gloryForJusticeActive = (enemies.filter(e => !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain').length > 4) || skillGActive ||
        (typeof spirits !== 'undefined' && spirits.some(s => s.isPhotokrystos && !s._done)) ||
        enemies.some(e => e.type === 'dargruel' || e.type === 'thaelis' || e.type === 'aegis_core' || e.type === 'marchosias' || e.type === 'veilshroud' || e.type === 'egregor' || e.type === 'leviathan');

    // Accurate Parry expiry
    if (accurateParryActive && performance.now() >= accurateParryEndTime) {
        accurateParryActive = false;
    }

    bossShockwaves.forEach(wave => {
        if (!wave.active) return;
        wave.radius += wave.speed * dt;

        if (wave._isBTMWave) {
            // BTM final shockwave: 10 + 99% MaxHP, bypasses ALL shields/Iron Body
            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                if (wave._hitEnemies.has(e)) continue;
                if (e.type === 'veilshroud_echo') continue; // untargetable
                if (e.inCoronation) continue;              // untargetable during coronation
                const d = Math.hypot(e.x - wave.x, e.y - wave.y);
                if (d < wave.radius + 20) {
                    wave._hitEnemies.add(e);
                    if (e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain') {
                        e.hp = 0; // clear bullets
                    } else if (e.type !== 'abyssal_chain') {
                        // Bypass everything: shields, DR, Iron Body, Absolute Shield
                        const maxHp = e.maxHp || e.hp;
                        const rawDmg = Math.ceil((wave._damage || 10) + maxHp * (wave._percentDamage || 0.99));
                        e.hp = Math.max(0, e.hp - rawDmg);
                        e.shield = 0;
                        e.absoluteShield = false;
                        e.aegisInvulnerable = false;
                        e.marchosiasParasiteShield = 0;
                        e.afoShieldActive = false; // AFO shield also bypassed
                        if (e.hp <= 0) e._markedForDeath = true;
                        // Leviathan: Phōtokrystos BTM wave bypasses dealDamage → trigger last rites
                        if (e.type === 'leviathan' && e.hp <= 0 && !e._deathLaserSpawned) {
                            dealDamage(e, { damage: 0, percentDamage: 0 });
                        }
                        createParticles(e.x, e.y, 6, '#00ffaa', 1, 4);
                    }
                }
            }
            if (wave.radius >= wave.maxRadius) wave.active = false;
            return;
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            let d = Math.hypot(bullets[i].x - wave.x, bullets[i].y - wave.y);
            if (d < wave.radius + 20) {
                createParticles(bullets[i].x, bullets[i].y, 3, 'purple', 1, 3);
                bullets.splice(i, 1);
            }
        }
        for (let i = spiritBullets.length - 1; i >= 0; i--) {
            if (spiritBullets[i].isPhoto) continue; // Phōtokrystos bullets immune to Maou Haki
            let d = Math.hypot(spiritBullets[i].x - wave.x, spiritBullets[i].y - wave.y);
            if (d < wave.radius + 20) {
                createParticles(spiritBullets[i].x, spiritBullets[i].y, 3, 'purple', 1, 3);
                spiritBullets.splice(i, 1);
            }
        }
        // photoBrangs are immune to Maou Haki (like bladeArcProjectiles)

        if (!wave._id) wave._id = 'shockwave_' + performance.now().toFixed(0);
        sentinels.forEach(sentinel => {
            if (!wave.hitSentinels.has(sentinel)) {
                let d = Math.hypot(sentinel.x - wave.x, sentinel.y - wave.y);
                if (d <= wave.radius) {
                    dealDamage(sentinel, { damage: (sentinel.maxHp + (sentinel.shield || 0)) * 0.35, _vanguardTag: wave._id });
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
                _setShake(8, 200);

                if (distToSegment(player, laser.start, laser.end) < player.hitRadius + 15) {
                    playerTakesHit();
                }

                if (!laser._id) laser._id = 'aegis_laser_' + performance.now().toFixed(0);
                sentinels.forEach(s => {
                    if (distToSegment(s, laser.start, laser.end) < s.size + 15) {
                        dealDamage(s, { damage: (s.maxHp + (s.shield || 0)) * 0.20, _vanguardTag: laser._id });
                        addExplosion(s.x, s.y, 20, 'red');
                    }
                });
            }
        } else {
            laser.duration -= deltaTime; // Laze mờ đi cũng chậm lại
        }
    });
    aegisLasers = aegisLasers.filter(l => !l.fired || l.duration > 0);

    if (skillGActive && gameElapsedTime > skillGEndTime) {
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

    // Silence/Root expiry
    if (player._silenced && currentTime >= player._silenceEnd) {
        player._silenced = false;
        player._rooted = false;
        player._silenceEnd = 0;
    }

    // Null Slash slow expiry
    if (player._nullSlashSlowed && currentTime >= player._nullSlashSlowEnd) {
        player._nullSlashSlowed = false;
    }
    const _nullSlashSpeedMult = (player._nullSlashSlowed) ? 0.50 : 1.0;

    // Dimension Break zone: 20% slow when player stands on the lingering rift arc
    let _dimBreakMult = 1.0;
    if (window._dimBreakZones) {
        window._dimBreakZones = window._dimBreakZones.filter(dbz => currentTime < dbz.expireAt);
        for (const dbz of window._dimBreakZones) {
            const _dbDx = player.x - dbz.cx, _dbDy = player.y - dbz.cy;
            const _dbDist = Math.hypot(_dbDx, _dbDy);
            if (Math.abs(_dbDist - dbz.arcR) < 45) {
                let _dbAng = Math.atan2(_dbDy, _dbDx) - dbz.angle;
                while (_dbAng >  Math.PI) _dbAng -= 2 * Math.PI;
                while (_dbAng < -Math.PI) _dbAng += 2 * Math.PI;
                if (Math.abs(_dbAng) <= Math.PI / 2 + 0.15) { _dimBreakMult = 0.80; }
            }
        }
    }

    if (keys.left && player.x > player.width / 2 && !player._rooted) player.x -= player.speed * _nullSlashSpeedMult * _dimBreakMult * dt;
    if (keys.right && player.x < canvas.width - player.width / 2 && !player._rooted) player.x += player.speed * _nullSlashSpeedMult * _dimBreakMult * dt;

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

    // Block auto-fire while silenced
    if (!player._silenced) fireAutoShot();

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
                    if (enemy.type === 'abyssal_chain') return;
                    if (enemy.type === 'veilshroud_echo') return; // untargetable
                    if (enemy.inCoronation) return; // untargetable during coronation
                    for (const clone of allLasers) {
                        const laserX = player.x + clone.xOffset;
                        if (enemy.y < player.y && Math.abs(enemy.x - laserX) < 100 / 2) {
                            // Laser vs Mar arc barrier: piercing — 30% body DR, barrier takes +15%, sword 25%
                            if (enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0) {
                                const _lSrc = { damage: 100, percentDamage: 0.16, isPiercing: true, _barrierPiercing: true };
                                checkMarchosiasArcBarrier(enemy, _lSrc, enemy.x, enemy.y);
                                dealDamage(enemy, _lSrc);
                                break;
                            } else if (enemy.type === 'leviathan' && enemy.afoShieldActive) {
                                // Laser hit Leviathan shield → count hits, no body damage
                                enemy.afoHitCount = (enemy.afoHitCount || 0) + 1;
                            } else {
                                dealDamage(enemy, { damage: 100, percentDamage: 0.16, isPiercing: true });
                            }
                            break;
                        }
                    }
                });
            }

            const pullRadius = 200, pullStrength = 0.05;
            enemies.forEach(enemy => {
                if (enemy.type.startsWith('enemy_bullet') || enemy.type === 'embryo' || enemy.type === 'abyssal_chain' || enemy.type === 'leviathan') return;
                if (enemy.type === 'veilshroud_echo') return; // untargetable
                if (enemy.inCoronation) return; // untargetable during coronation

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
                    type: 'apostle', shootTimer: 1000
                });
            }
        }

        if (enemy.type === 'aegis_core') {
            let healAmt = enemy.maxHp * 0.06 * (deltaTime / 1000);
            if (enemy._custosExpired) healAmt *= 1.20;
            let shieldAmt = enemy.maxHp * 0.40;
            let tickShieldAmt = enemy.maxHp * 0.08 * (deltaTime / 1000); // 8% MaxHP shield/s
            let auraRadius = canvas.width / 2;

            enemies.forEach(ally => {
                if (ally === enemy) {
                    // Aegis tự heal 50% hiệu quả (không heal khi đang chết)
                    if (!ally._markedForDeath && enemy.hp > 0) enemy.hp = Math.min(enemy.maxHp, enemy.hp + healAmt * 0.5);
                    return;
                }
                // Không heal/shield kẻ địch đã chết hoặc đang chết
                if (ally.hp <= 0 || ally._markedForDeath) return;
                // Leviathan đã kích hoạt death laser → không heal/shield
                if (ally.type === 'leviathan' && ally._deathLaserSpawned) return;
                // Void Echo không nhận heal/shield
                if (ally.type === 'veilshroud_echo') return;
                let d = Math.hypot(ally.x - enemy.x, ally.y - enemy.y);
                if (d <= auraRadius) {
                    let finalHeal = ally.soulReaver ? healAmt * 0.60 : healAmt;
                    if (ally.levEnvy) finalHeal *= 1.25; // Envy: +25% heal
                    if (ally.hp <= 0) return; // cannot heal at 0 HP
                    const veilNormal = ally.type === 'veilshroud' && !ally.inPhantom;
                    const newHp = ally.hp + finalHeal;
                    if (newHp > ally.maxHp) {
                        // Overheal: 50% of excess → shield
                        const overheal = newHp - ally.maxHp;
                        ally.hp = ally.maxHp;
                        let overshield = overheal * 0.5;
                        if (veilNormal) overshield *= 1.35; // Alteration: +35% shield
                        _addEnemyShield(ally, overshield);
                    } else {
                        ally.hp = Math.max(0, newHp);
                        // Alteration: nhận thêm khiên bằng lượng hồi phục
                        if (veilNormal) _addEnemyShield(ally, finalHeal);
                    }
                    if (veilNormal && finalHeal > 0) ally._veilHealDRExpiry = performance.now() + 3000;

                    if (!ally.aegisShieldReceived) {
                        let finalShield = ally.soulReaver ? shieldAmt * 0.60 : shieldAmt;
                        if (veilNormal) finalShield *= 1.35; // Alteration: +35% shield
                        _addEnemyShield(ally, finalShield);
                        ally.aegisShieldReceived = true;
                    }
                    // 8% MaxHP tick shield per second, always applies
                    const tsAmt = ally.soulReaver ? tickShieldAmt * 0.60 : tickShieldAmt;
                    const finalTs = veilNormal ? tsAmt * 1.35 : tsAmt; // Alteration: +35% shield
                    _addEnemyShield(ally, finalTs);
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
            if (enemy.type === 'veilshroud_echo') continue; // echo miễn CC

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
                    // Leviathan immune to CC while shield active, no slow, still takes dot
                    teslaSpeedMultiplier = 1.0;
                } else if (enemy.type === 'egregor' || enemy.type === 'dargruel') {
                    // CC immune, no slow
                    teslaSpeedMultiplier = 1.0;
                } else if ((enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0)
                    || (enemy.type === 'aegis_core' && enemy.aegisInvulnerable)) {
                    // CC immune, no slow
                    teslaSpeedMultiplier = 1.0;
                } else {
                    teslaSpeedMultiplier = 0.30;
                    if (enemy.type === 'dargruel' || enemy.type === 'thaelis' || enemy.type === 'aegis_core') {
                        teslaAttackSpeedMultiplier = 2.0;
                    }
                }

                if (enemy.hp <= 0) break;

                if (!coil.dotTargets) coil.dotTargets = new Map();
                if (!coil.dotTargets.has(enemy)) {
                    coil.dotTargets.set(enemy, currentTime); // Dot timer runs in real-time
                }

                if (currentTime - coil.dotTargets.get(enemy) >= 125) {
                    dealDamage(enemy, { damage: 100, percentDamage: 0.06, isTeslaDot: true });
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
            // LEVIATHAN: death laser đã được spawn trong dealDamage khi HP→0
            // Không cần spawn thêm ở đây nữa

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

            if (enemy.type === 'abyssal_chain') {
                // Chain consumed, no kill, no life loss, no explosion
                enemies.splice(i, 1); continue;
            }

            // VEILSHROUD: save pending Void Strike so it fires even after host dies
            if (enemy.type === 'veilshroud' && enemy.lightningPending) {
                if (!window._veilshroudPendingStrikes) window._veilshroudPendingStrikes = [];
                window._veilshroudPendingStrikes.push({
                    countdown: enemy.lightningCountdown,
                    duration: enemy.lightningCountdownDuration || 1500,
                    targetRef: enemy.lightningTargetRef,
                    targetX: enemy.lightningTargetX,
                    targetY: enemy.lightningTargetY,
                });
            }

            // VEILSHROUD: Void Echo, để lại bóng ma khi chết
            if (enemy.type === 'veilshroud' && !enemy._echoSpawned) {
                enemy._echoSpawned = true;
                enemies.push({
                    x: enemy.x, y: enemy.y,
                    size: enemy.size,
                    hp: 9999, maxHp: 9999,
                    isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
                    type: 'veilshroud_echo',
                    speed: 0,
                    echoTimer: 0,
                    echoShootTimer: 0,
                    echoShootInterval: 200,
                    echoOriginMaxHp: enemy.maxHp,
                    echoExplosionDone: false,
                });
            }

            // VEILSHROUD ECHO: đã xử lý explosion trong updateVeilshroudEcho, chỉ cần xóa entity
            if (enemy.type === 'veilshroud_echo') {
                enemies.splice(i, 1); continue;
            }

            // MARCHOSIAS: convert pending windups → blades on death (Skill F / Black Hole path)
            if (enemy.type === 'marchosias') {
                if (enemy.marchosiasWindups && enemy.marchosiasWindups.length > 0) {
                    const count = enemy.marchosiasWindups.length;
                    enemy.marchosiasWindups.forEach((windup, idx) => {
                        if (!windup.target) return;
                        const baseAngle = Math.atan2(windup.target.y - enemy.y, windup.target.x - enemy.x);
                        const spread = (idx - (count - 1) / 2) * 0.18;
                        const angle = baseAngle + spread;
                        marchosiasBlades.push({
                            x: enemy.x, y: enemy.y,
                            vx: Math.cos(angle) * 13.2, vy: Math.sin(angle) * 13.2,
                            angle, radius: 88,
                            delay: windup.timer > 0 ? windup.timer : 0,
                            active: windup.timer <= 0,
                            originX: enemy.x, originY: enemy.y,
                            targetX: windup.target.x, targetY: windup.target.y, // cho corridor style
                            hitEnemies: [], hitPlayer: false,
                        });
                    });
                    enemy.marchosiasWindups = [];
                }
                addExplosion(enemy.x, enemy.y, enemy.size * 1.2, '#00ff88');
                createParticles(enemy.x, enemy.y, 40, '#00ff88', 2, 8);
                for (let k = 0; k < 3; k++) {
                    const spawnAngle = (Math.PI * 2 / 3) * k;
                    spawnMarchosiasMinion(
                        enemy.x + Math.cos(spawnAngle) * enemy.size * 0.5,
                        enemy.y + Math.sin(spawnAngle) * enemy.size * 0.5,
                        enemy.maxHp
                    );
                }
            }

            if (!enemy.type.startsWith('enemy_bullet') && enemy.type !== 'embryo' && enemy.type !== 'veilshroud_echo') {
                if (!enemy.hatched && !enemy._coronationConsumed) handleEnemyKill(enemy);
            } else if (enemy.type !== 'embryo') {
                if (!enemy.isSplit) addExplosion(enemy.x, enemy.y, enemy.size, 'red');
            }
            // Apostle chết bình thường → cộng bonus coronation theo vị trí
            if (enemy.type === 'apostle' && !enemy.inCoronation && !enemy._coronationConsumed) {
                if (window._coronationDeathBonus === undefined) window._coronationDeathBonus = 0;
                window._coronationDeathBonus += enemy.y < canvas.height / 2 ? 0.0067 : 0.01;
            }

            // Egregor, Mind Link: rage stack on nearby death → immediate Tempest
            if (!enemy.type.startsWith('enemy_bullet') && enemy.type !== 'egregor') {
                const _dNow = performance.now();
                for (const _eg of enemies) {
                    if (_eg.type !== 'egregor' || _eg === enemy) continue;
                    if (Math.hypot(_eg.x - enemy.x, _eg.y - enemy.y) < 600) {
                        if (!_eg._rageEndTimes) _eg._rageEndTimes = [];
                        if (_eg._rageEndTimes.length < 5) {
                            _eg._rageEndTimes.push(_dNow + 8000);
                            _eg._rageStacks = _eg._rageEndTimes.length;
                            // +15% MaxHP and heal 15% MaxHP
                            _eg.maxHp = Math.ceil(_eg.maxHp * 1.15);
                            _eg.hp = Math.min(_eg.maxHp, _eg.hp + Math.ceil(_eg.maxHp * 0.15));
                            // Heal alive tentacles 15% of their max HP
                            if (_eg._tentacleHps) {
                                const _tMax = Math.ceil(_eg.maxHp * 0.78);
                                for (let _ti = 0; _ti < _eg._tentacleHps.length; _ti++) {
                                    if (_eg._tentacleHps[_ti] > 0)
                                        _eg._tentacleHps[_ti] = Math.min(_tMax, _eg._tentacleHps[_ti] + Math.ceil(_tMax * 0.15));
                                }
                            }
                        }
                        // Rage gained → fire Tempest immediately on next frame
                        if (_eg._tempestPhase === 'ready') _eg._tempestCooldownEnd = 0;
                    }
                }
            }

            // Egregor: fire pending Tempest even if body dies mid-telegraph
            if (enemy.type === 'egregor' && enemy._tempestPhase === 'telegraphing') {
                _forceFireEgregorTempest(enemy);
            }

            enemies.splice(i, 1);
            continue;
        }

        // Abyssal Chain movement + collision
        if (enemy.type === 'abyssal_chain') {
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;

            // Triangle molecule particles, spawn + update
            if (!enemy.molParticles) enemy.molParticles = [];
            // Spawn new triangle every ~80ms
            if (!enemy._lastMolSpawn || currentTime - enemy._lastMolSpawn > 80) {
                enemy._lastMolSpawn = currentTime;
                const perpAngle = Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2;
                const side = Math.random() < 0.5 ? 1 : -1;
                enemy.molParticles.push({
                    x: enemy.x + Math.cos(perpAngle) * side * (Math.random() * 6),
                    y: enemy.y + Math.sin(perpAngle) * side * (Math.random() * 6),
                    vx: (Math.random() - 0.5) * 1.5 - enemy.vx * 0.08,
                    vy: (Math.random() - 0.5) * 1.5 - enemy.vy * 0.08,
                    life: 500 + Math.random() * 300,
                    maxLife: 700,
                    size: 3 + Math.random() * 3,
                    angle: Math.random() * Math.PI * 2,
                    spin: (Math.random() - 0.5) * 0.12,
                    col: enemy.isDarkened ? (Math.random() < 0.5 ? '#880000' : '#330000') : (Math.random() < 0.5 ? '#cc44ff' : '#8800cc')
                });
            }
            // Update existing particles
            for (let mi = enemy.molParticles.length - 1; mi >= 0; mi--) {
                const mp = enemy.molParticles[mi];
                mp.x += mp.vx * dt;
                mp.y += mp.vy * dt;
                mp.angle += mp.spin * dt;
                mp.life -= deltaTime;
                if (mp.life <= 0) { enemy.molParticles.splice(mi, 1); }
            }

            // Hit player
            if (!enemy._hitPlayer && Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size + player.hitRadius) {
                enemy._hitPlayer = true;
                if (enemy.isDarkened) {
                    // Darkened chain: costs 1 life, no root/silence
                    playerTakesHit(enemy);
                } else {
                    // Normal chain: root & silence, no life loss
                    player._silenced = true;
                    player._silenceEnd = currentTime + 1000;
                    player._rooted = true;
                    _setShake(6, 250);
                    try { navigator.vibrate && navigator.vibrate(30); } catch (e) { }
                }
                // Chain is NOT consumed by hitting player, can still hit sentinel
            }

            // Hit sentinel
            if (enemy.hp > 0) {
                for (const s of sentinels) {
                    if (Math.hypot(enemy.x - s.x, enemy.y - s.y) < enemy.size + s.size) {
                        if (s.ironBody && currentTime < s.ironBodyEnd) {
                            // Iron Body: absorb but still consume chain
                        } else {
                            const _chainEpPct = enemy.isDarkened ? 0.20 : 0.15;
                            const rawDmgChain = Math.ceil((s.maxHp + (s.shield || 0)) * _chainEpPct);
                            if (sentinels.length >= 5) {
                                _applyVanguardDamage(rawDmgChain, 'chain_' + enemy.originX, true, s);
                            } else {
                                let _chainDmg = rawDmgChain;
                                if ((s._gaiaBarrier || 0) > 0) {
                                    _chainDmg = Math.ceil(_chainDmg * 0.80); // true dmg mitigation
                                    const _gAbsorb = Math.min(Math.ceil(_chainDmg * 0.99), s._gaiaBarrier);
                                    s._gaiaBarrier = Math.max(0, s._gaiaBarrier - _gAbsorb);
                                    if (s._gaiaBarrier <= 0) { addExplosion(s.x, s.y, s.size * 1.2, '#00ff88'); createParticles(s.x, s.y, 14, '#00ff88', 2, 7); }
                                    _chainDmg = Math.max(1, Math.ceil(_chainDmg * 0.01));
                                }
                                s.hp = Math.max(0, s.hp - _chainDmg);
                                if (s.hp <= 0) s._markedForDeath = true;
                            }
                        }
                        addExplosion(enemy.x, enemy.y, 30, enemy.isDarkened ? '#880011' : '#660033');
                        enemy.hp = 0; // consume chain
                        break;
                    }
                }
            }
            // Also consume chain if hit player but no sentinel nearby
            if (enemy._hitPlayer && enemy.hp > 0) { enemy.hp = 0; }

            // Off-screen, bay hết màn hình mới dừng
            if (enemy.x < -200 || enemy.x > canvas.width + 200 || enemy.y < -200 || enemy.y > canvas.height + 200) {
                enemies.splice(i, 1); // O(1) vì loop đi ngược, không cần indexOf
            }

        } else if (enemy.type.startsWith('enemy_bullet')) {
            enemy.x += enemy.vx * dt * teslaSpeedMultiplier * aegisSpeedMultiplier;
            enemy.y += enemy.vy * dt * teslaSpeedMultiplier * aegisSpeedMultiplier;

            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size + player.hitRadius) {
                playerTakesHit(enemy);
                enemy.hp = 0;
            }

            for (const sentinel of sentinels) {
                if (enemy.hp > 0 && Math.hypot(enemy.x - sentinel.x, enemy.y - sentinel.y) < enemy.size + sentinel.size) {
                    if (enemy.type === 'enemy_bullet_small') {
                        dealDamage(sentinel, { damage: (sentinel.maxHp + (sentinel.shield || 0)) * 0.15, _vanguardTag: 'bsm_' + Math.round(enemy.x) + '_' + Math.round(enemy.y) });
                    } else {
                        dealDamage(sentinel, { damage: enemy.hp, _vanguardTag: 'blt_' + Math.round(enemy.x) + '_' + Math.round(enemy.y) });
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
                    for (let j = 0; j < 6; j++) {
                        let angle = baseAngle + (j - 2.5) * 0.28;
                        enemies.push({
                            x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 3.73, vy: Math.sin(angle) * 3.73,
                            damage: 1, size: 10.8, hp: 60, maxHp: 60, type: 'enemy_bullet_small', shield: 0, ownerRef: enemy.ownerRef || null
                        });
                    }
                }
            }

        } else if (enemy.type === 'egregor') {
            updateEgregor(enemy, deltaTime);

        } else if (enemy.type === 'leviathan') {
            // Leviathan update handled by updateLeviathan()
            updateLeviathan(enemy, deltaTime);

        } else if (enemy.type === 'veilshroud') {
            updateVeilshroud(enemy, deltaTime);

        } else if (enemy.type === 'veilshroud_echo') {
            updateVeilshroudEcho(enemy, deltaTime);

        } else if (enemy.type !== 'embryo' && enemy.type !== 'marchosias_minion') {
            const _coronaSlow = (enemy.type === 'apostle' && enemy.inCoronation) ? 0.55 : 1.0;
            const _ccImmune = enemy.type === 'egregor' || enemy.type === 'dargruel' || enemy.type === 'leviathan'
                || (enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0)
                || (enemy.type === 'aegis_core' && enemy.aegisInvulnerable);
            const _riftSlowMul = (enemy._riftSlow && !_ccImmune) ? 0.65 : 1.0;
            const _orbSlowMul = (!_ccImmune && (enemy._orbRetaliationSlowEnd || 0) > currentTime) ? 0.75 : 1.0;
            enemy.y += enemy.speed * dt * teslaSpeedMultiplier * aegisSpeedMultiplier * _coronaSlow * _riftSlowMul * _orbSlowMul;

            if (!enemy.inCoronation && Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.hitRadius) {
                playerTakesHit(enemy);
                if (enemy.type === 'dargruel' || enemy.type === 'thaelis') {
                } else {
                    enemy.hp = 0;
                }
            }

            if (enemy.type === 'dargruel' || enemy.type === 'thaelis') {
                const thaelisTenacityBonus = (enemy.type === 'thaelis') ? Math.min(0.20, (1 - enemy.hp / enemy.maxHp) * 0.001 * 100) : 0;
                let currentShootTimer = (enemy.type === 'thaelis') ? 1000 / (1 + thaelisTenacityBonus) : (autoFireInterval * 2) * 0.75;
                if (gloryForJusticeActive) currentShootTimer *= 1.25;
                currentShootTimer *= teslaAttackSpeedMultiplier;

                // Maître suprême: normal attack +5% speed per sentinel, max +20%
                if (enemy.type === 'dargruel') {
                    const speedBonus = Math.min(0.20, sentinels.length * 0.05);
                    currentShootTimer *= (1 - speedBonus);
                }

                enemy.shootTimer -= deltaTime;
                if (enemy.shootTimer <= 0) {
                    enemy.shootTimer = currentShootTimer;
                    const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
                    if (target) {
                        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
                        if (enemy.type === 'thaelis') {
                            // Tenacity: +3.5% bullet speed per 0.5% HP lost, cap +25%
                            const thaelisBonusPct = Math.min(0.25, (1 - enemy.hp / enemy.maxHp) * 7.0);
                            const thaelisSpd = 3.36 * (1 + thaelisBonusPct);
                            // Fires 2 large projectiles per second with slight spread
                            for (const _spr of [-0.15, 0.15]) {
                                enemies.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle + _spr) * thaelisSpd, vy: Math.sin(angle + _spr) * thaelisSpd, damage: 2, size: 18, hp: 180, maxHp: 180, type: 'enemy_bullet_large', shield: 0, splitTimer: 600, ownerRef: enemy });
                            }
                        } else {
                            const bulletHp = Math.ceil(10 + Math.random() * 30);
                            enemies.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * (player.speed / 3), vy: Math.sin(angle) * (player.speed / 3), damage: 2, size: 15, hp: bulletHp, maxHp: bulletHp, type: 'enemy_bullet', shield: 0, ownerRef: enemy });
                        }
                    }
                }

                // Hắc Ám Xiềng Xích (Abyssal Chains), Dargruel only
                if (enemy.type === 'dargruel') {
                    if (!enemy.chainTimer && enemy.chainTimer !== 0) enemy.chainTimer = 0; // fire immediately on spawn
                    enemy.chainTimer -= deltaTime;
                    if (enemy.chainTimer <= 0) {
                        enemy.chainTimer = 2100;
                        const baseAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                        const spread = 0.28;
                        const angles4 = [-spread * 1.5, -spread * 0.5, spread * 0.5, spread * 1.5];
                        const chainSpeed = 10.75 * 0.9;
                        const darkenTriggered = Math.random() < (enemy._chainDarkenChance || 0.18);
                        if (darkenTriggered) enemy._chainDarkenChance = 0.18;
                        else enemy._chainDarkenChance = Math.min(1, (enemy._chainDarkenChance || 0.18) + 0.02);
                        const darkenIdx = darkenTriggered ? Math.floor(Math.random() * 4) : -1;
                        for (let ki = 0; ki < angles4.length; ki++) {
                            const a = baseAngle + angles4[ki];
                            enemies.push({
                                x: enemy.x, y: enemy.y,
                                vx: Math.cos(a) * chainSpeed,
                                vy: Math.sin(a) * chainSpeed,
                                size: 16, hp: 9999, maxHp: 9999,
                                type: 'abyssal_chain',
                                shield: 0, damage: 0,
                                originX: enemy.x, originY: enemy.y,
                                ownerRef: enemy,
                                piercing: true,
                                isDarkened: ki === darkenIdx
                            });
                        }
                    }
                    // hp=1 burst: fire immediately extra volley
                    if (enemy.hp <= 1 && !enemy._chainDeath) {
                        enemy._chainDeath = true;
                        const baseAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                        const spread = 0.28;
                        const _burstSpeed = 10.75 * 0.9;
                        [-spread * 1.5, -spread * 0.5, spread * 0.5, spread * 1.5].forEach(k => {
                            enemies.push({
                                x: enemy.x, y: enemy.y,
                                vx: Math.cos(baseAngle + k) * _burstSpeed,
                                vy: Math.sin(baseAngle + k) * _burstSpeed,
                                size: 16, hp: 9999, maxHp: 9999,
                                type: 'abyssal_chain', shield: 0, damage: 0,
                                originX: enemy.x, originY: enemy.y, ownerRef: enemy, piercing: true
                            });
                        });
                    }
                }
            }

            if (enemy.type === 'apostle') {
                // Coronation passive, runs every frame, handles its own 1s tick
                updateApostleCoronation(enemy, deltaTime);

                // Frozen during coronation animation
                if (!enemy.inCoronation) {
                    enemy.shootTimer -= deltaTime;
                    if (enemy.shootTimer <= 0) {
                        enemy.shootTimer = 1000;
                        const target = findClosestSentinelOrPlayer(enemy.x, enemy.y);
                        if (target) {
                            const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
                            enemies.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * (player.speed / 3), vy: Math.sin(angle) * (player.speed / 3), damage: enemy.hp, size: 10, hp: enemy.hp, maxHp: enemy.hp, type: 'enemy_bullet', shield: 0, ownerRef: enemy });
                        }
                    }
                }
            }

            // MARCHOSIAS
            if (enemy.type === 'marchosias') {
                // Trigger Sword khi HP còn <= 1% lần đầu tiên
                if (!enemy.swordLastStandTriggered && enemy.hp <= enemy.maxHp * 0.01) {
                    enemy.swordLastStandTriggered = true;
                    _fireMarchosiasDeathSwords(enemy);
                }

                // Arc barrier tracks player; tracking speed scales 0.08→0.133 over 3 minutes
                if (enemy.arcBarrier) {
                    if (enemy._arcBarrierReviveAt && gameElapsedTime >= enemy._arcBarrierReviveAt) {
                        enemy._arcBarrierReviveAt = null;
                        enemy.arcBarrier = { hp: enemy.maxHp, maxHp: enemy.maxHp, angle: enemy.arcBarrier.angle, hitCount: 0 };
                        enemy.DR = Math.max(0.45, (enemy.DR || 0.45) - 0.20);
                        enemy._barrierSwordsThisCycle = 0;
                        addExplosion(enemy.x, enemy.y, enemy.size * 0.9, '#00ff88');
                        createParticles(enemy.x, enemy.y, 25, '#00ff88', 2, 6);
                    }
                    if (enemy.arcBarrier.hp > 0) {
                        const targetAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                        let diff = targetAngle - enemy.arcBarrier.angle;
                        while (diff > Math.PI) diff -= Math.PI * 2;
                        while (diff < -Math.PI) diff += Math.PI * 2;
                        const _trackSpeed = 0.08 + 0.053 * Math.min(1, gameElapsedTime / 180000);
                        enemy.arcBarrier.angle += diff * _trackSpeed * dt;
                    }
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
                                type: 'enemy_bullet', shield: 0, ownerRef: enemy
                            });
                        }
                    }
                }

                // Counter windups, xử lý nhiều đòn song song, không giới hạn
                if (!enemy.marchosiasWindups) enemy.marchosiasWindups = [];
                for (let wi = enemy.marchosiasWindups.length - 1; wi >= 0; wi--) {
                    const windup = enemy.marchosiasWindups[wi];
                    windup.timer -= deltaTime;
                    if (windup.timer <= 0) {
                        if (!windup.target) { enemy.marchosiasWindups.splice(wi, 1); continue; }
                        const tx = windup.target.x, ty = windup.target.y;
                        const angle = Math.atan2(ty - enemy.y, tx - enemy.x);
                        marchosiasBlades.push({
                            x: enemy.x, y: enemy.y,
                            vx: Math.cos(angle) * 13.2, vy: Math.sin(angle) * 13.2,
                            angle: angle, radius: 88,
                            delay: 0, active: true,
                            originX: enemy.x, originY: enemy.y,
                            targetX: tx, targetY: ty, // corridor edge persistence
                            _fireTime: performance.now(), // launch aura
                            hitEnemies: [], hitPlayer: false,
                        });
                        // Ghost đã được push khi windup bắt đầu, chỉ cần xoá windup
                        enemy.marchosiasWindups.splice(wi, 1);
                    }
                }
                // Ghost timers: freezeTimer trước, rồi mới fadeTimer
                if (enemy._ghostWindups) {
                    for (let gi = enemy._ghostWindups.length - 1; gi >= 0; gi--) {
                        const gw = enemy._ghostWindups[gi];
                        if (gw.freezeTimer > 0) {
                            gw.freezeTimer -= deltaTime;
                            // Khi freeze vừa kết thúc: lock origin vào vị trí Mar hiện tại
                            if (gw.freezeTimer <= 0) {
                                gw.originX = enemy.x;
                                gw.originY = enemy.y;
                            }
                        } else {
                            gw.fadeTimer -= deltaTime;
                            if (gw.fadeTimer <= 0) enemy._ghostWindups.splice(gi, 1);
                        }
                    }
                }
            }

            // MARCHOSIAS MINION (handled in separate else-if below)
        } else if (enemy.type === 'marchosias_minion') {
            // Periodically scan for a valid host to attach to as parasite
            enemy._hostScanTimer = (enemy._hostScanTimer || 0) - deltaTime;
            if (enemy._hostScanTimer <= 0) {
                enemy._hostScanTimer = 500;
                const _nearHost = enemies.find(e =>
                    e !== enemy && e.hp > 0 && !e._markedForDeath &&
                    e.type !== 'marchosias_minion' && e.type !== 'marchosias' &&
                    e.type !== 'veilshroud_echo' &&
                    e.type !== 'abyssal_chain' &&
                    !e.type.startsWith('enemy_bullet') &&
                    Math.hypot(e.x - enemy.x, e.y - enemy.y) < 170
                );
                if (_nearHost) {
                    _nearHost.marchosiasParasiteShield = (_nearHost.marchosiasParasiteShield || 0) + enemy.hp;
                    createParticles(_nearHost.x, _nearHost.y, 12, '#00ff88', 2, 5);
                    enemy.hp = 0;
                    continue;
                }
            }
            const mmdx = player.x - enemy.x, mmdy = player.y - enemy.y;
            const mmd = Math.hypot(mmdx, mmdy);
            const _mmRiftSlow = enemy._riftSlow ? 0.65 : 1.0;
            const _mmOrbSlow = (enemy._orbRetaliationSlowEnd || 0) > currentTime ? 0.75 : 1.0;
            const _mmSlowMul = _mmRiftSlow * _mmOrbSlow;
            if (mmd > 0) { enemy.x += (mmdx / mmd) * enemy.speed * dt * _mmSlowMul; enemy.y += (mmdy / mmd) * enemy.speed * dt * _mmSlowMul; }
            enemy.shootTimer -= deltaTime;
            if (enemy.shootTimer <= 0) {
                enemy.shootTimer = 1000;
                const tgt = findClosestSentinelOrPlayer(enemy.x, enemy.y);
                if (tgt) {
                    const ang = Math.atan2(tgt.y - enemy.y, tgt.x - enemy.x);
                    enemies.push({ x: enemy.x, y: enemy.y, vx: Math.cos(ang) * (player.speed / 3), vy: Math.sin(ang) * (player.speed / 3), damage: enemy.hp, size: 10, hp: enemy.hp, maxHp: enemy.hp, type: 'enemy_bullet', shield: 0, ownerRef: enemy });
                }
            }
            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.size / 2 + player.hitRadius) {
                playerTakesHit(enemy); enemy.hp = 0;
            }
        }

        // Envy 1% MaxHP/s regen (applied to all envy-marked non-bullet enemies)
        if (enemy.levEnvy && enemy.hp > 0 && !enemy._markedForDeath &&
            !enemy.type.startsWith('enemy_bullet') && enemy.type !== 'embryo') {
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.01 * (deltaTime / 1000));
        }

        if (enemy.hp <= 0) {
            // LEVIATHAN: laser đã spawn trong dealDamage → die bình thường
            if (enemy.type === 'abyssal_chain') {
                enemies.splice(i, 1); continue;
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
                if (enemy.marchosiasWindups && enemy.marchosiasWindups.length > 0) {
                    const count = enemy.marchosiasWindups.length;
                    enemy.marchosiasWindups.forEach((windup, idx) => {
                        if (!windup.target) return;
                        const baseAngle = Math.atan2(windup.target.y - enemy.y, windup.target.x - enemy.x);
                        const spread = (idx - (count - 1) / 2) * 0.18;
                        const angle = baseAngle + spread;
                        marchosiasBlades.push({
                            x: enemy.x, y: enemy.y,
                            vx: Math.cos(angle) * 13.2, vy: Math.sin(angle) * 13.2,
                            angle, radius: 88,
                            delay: windup.timer > 0 ? windup.timer : 0,
                            active: windup.timer <= 0,
                            originX: enemy.x, originY: enemy.y,
                            targetX: windup.target.x, targetY: windup.target.y, // cho corridor style
                            hitEnemies: [], hitPlayer: false,
                        });
                    });
                    enemy.marchosiasWindups = [];
                }
                addExplosion(enemy.x, enemy.y, enemy.size * 1.2, '#00ff88');
                createParticles(enemy.x, enemy.y, 40, '#00ff88', 2, 8);
                for (let k = 0; k < 3; k++) {
                    const spawnAngle = (Math.PI * 2 / 3) * k;
                    const spawnX = enemy.x + Math.cos(spawnAngle) * enemy.size * 0.5;
                    const spawnY = enemy.y + Math.sin(spawnAngle) * enemy.size * 0.5;
                    spawnMarchosiasMinion(spawnX, spawnY, enemy.maxHp);
                }
            }

            // Egregor, Mind Link: rage stack on nearby death → immediate Tempest
            if (!enemy.type.startsWith('enemy_bullet') && enemy.type !== 'egregor') {
                const _dNow = performance.now();
                for (const _eg of enemies) {
                    if (_eg.type !== 'egregor' || _eg === enemy) continue;
                    if (Math.hypot(_eg.x - enemy.x, _eg.y - enemy.y) < 600) {
                        if (!_eg._rageEndTimes) _eg._rageEndTimes = [];
                        if (_eg._rageEndTimes.length < 5) {
                            _eg._rageEndTimes.push(_dNow + 8000);
                            _eg._rageStacks = _eg._rageEndTimes.length;
                            // +15% MaxHP and heal 15% MaxHP
                            _eg.maxHp = Math.ceil(_eg.maxHp * 1.15);
                            _eg.hp = Math.min(_eg.maxHp, _eg.hp + Math.ceil(_eg.maxHp * 0.15));
                            // Heal alive tentacles 15% of their max HP
                            if (_eg._tentacleHps) {
                                const _tMax = Math.ceil(_eg.maxHp * 0.78);
                                for (let _ti = 0; _ti < _eg._tentacleHps.length; _ti++) {
                                    if (_eg._tentacleHps[_ti] > 0)
                                        _eg._tentacleHps[_ti] = Math.min(_tMax, _eg._tentacleHps[_ti] + Math.ceil(_tMax * 0.15));
                                }
                            }
                        }
                        // Rage gained → fire Tempest immediately on next frame
                        if (_eg._tempestPhase === 'ready') _eg._tempestCooldownEnd = 0;
                    }
                }
            }

            if (!enemy.type.startsWith('enemy_bullet') && enemy.type !== 'embryo' && enemy.type !== 'veilshroud_echo') {
                if (!enemy.hatched && !enemy._coronationConsumed) handleEnemyKill(enemy);
            } else if (enemy.type !== 'embryo') {
                if (!enemy.isSplit) addExplosion(enemy.x, enemy.y, enemy.size, 'red');
            }
            // Apostle chết bình thường → cộng bonus coronation theo vị trí
            if (enemy.type === 'apostle' && !enemy.inCoronation && !enemy._coronationConsumed) {
                if (window._coronationDeathBonus === undefined) window._coronationDeathBonus = 0;
                window._coronationDeathBonus += enemy.y < canvas.height / 2 ? 0.0067 : 0.01;
            }

            // Egregor: fire pending Tempest even if body dies mid-telegraph
            if (enemy.type === 'egregor' && enemy._tempestPhase === 'telegraphing') {
                _forceFireEgregorTempest(enemy);
            }

            enemies.splice(i, 1);
            continue;
        }

        if (enemy.y > boundaryY + enemy.size / 2) {
            if (enemy.type === 'abyssal_chain') { enemies.splice(i, 1); continue; }
            if (enemy.type === 'veilshroud_echo') { /* echo stays at spawn, không xuống boundary */ continue; }
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
        if (lives <= 0) { gameState = "gameover"; _gameOverPlayTime = performance.now() - gameStartTime; showStartButton("Play Again"); showMainMenuButton(); }
    }

    // Skill Shift (Lãnh Địa): xóa toàn bộ enemy bullet, không cho spawn mới
    if (skillShiftActive) {
        // Abyssal Chains survive YOG, piercing, cannot be cleared by any means
        enemies = enemies.filter(e => e.type === 'abyssal_chain' || !e.type.startsWith('enemy_bullet'));
    }

    _updateWaveSystem(deltaTime, currentTime);

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        if (b.type === 'sentinel_special') {
            if (b.target && enemies.includes(b.target) && !b.target.inCoronation && b.target.hp > 0) {
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

                // ABYSSAL CHAIN: piercing, immune to all player attacks
                if (enemy.type === 'abyssal_chain') { continue; }
                // VEILSHROUD ECHO: untargetable / immune
                if (enemy.type === 'veilshroud_echo') { continue; }
                // CORONATION: apostle is immortal and untargetable
                if (enemy.inCoronation) { continue; }
                if (enemy.type === 'leviathan' && enemy.afoShieldActive) {
                    enemy.afoHitCount = (enemy.afoHitCount || 0) + 1;
                    createParticles(b.x, b.y, 2, '#00e5ff', 1, 3);
                    bullets.splice(i, 1);
                    break;
                }

                // MARCHOSIAS ARC BARRIER CHECK (all new mechanics handled in checkMarchosiasArcBarrier)
                if (enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0) {
                    if (checkMarchosiasArcBarrier(enemy, b, b.x, b.y)) {
                        bullets.splice(i, 1);
                        break;
                    }
                }

                if (b.type === 'player_charged') {
                    if (!b.hitEnemies) b.hitEnemies = [];
                    if (b.hitEnemies.includes(enemy)) continue;
                    dealDamage(enemy, { damage: (b.damage >= maxMultiplier ? 0 : b.damage), percentDamage: (b.damage >= maxMultiplier ? 0.07 : 0) });
                    b.hitEnemies.push(enemy);
                } else {
                    dealDamage(enemy, b);

                    if (b.type === 'sentinel_special' && b.sourceSentinel && b.sourceSentinel.hp > 0) {
                        b.sourceSentinel.hp = Math.min(b.sourceSentinel.maxHp, b.sourceSentinel.hp + 2);
                        createParticles(b.sourceSentinel.x, b.sourceSentinel.y, 5, 'lime', 1, 3);
                    }

                    bullets.splice(i, 1);
                    break;
                }
            }
        }
    }

    particles = particles.filter(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.lifetime -= deltaTime; if (p.lifetime > 0) return true; _releaseParticle(p); return false; });
    explosions = explosions.filter(e => { e.lifetime -= deltaTime; return e.lifetime > 0 });
    chainLightningEffects = chainLightningEffects.filter(e => { e.lifetime -= deltaTime; return e.lifetime > 0 });

    updateSentinels(deltaTime);
    // Blessing of the Primordial: passive while Phōtokrystos is active
    const _photoActive = typeof spirits !== 'undefined' && spirits.some(s => s.isPhotokrystos && !s._done);
    const _levOnField = enemies.some(e => e.type === 'leviathan' && e.hp > 0);
    sentinels.forEach(s => {
        // Base blessing DR: +15%, +5% more if Leviathan on field
        s._blessingDR = _photoActive ? (0.15 + (_levOnField ? 0.05 : 0)) : 0;
        s._blessingDmg = _photoActive ? 0.15 : 0;
        // Keep _blessingShield in sync, can't exceed actual shield
        if (s._blessingShield && s._blessingShield > (s.shield || 0)) {
            s._blessingShield = s.shield || 0;
        }
        if (!_photoActive) s._blessingShield = 0;
    });
    if (_photoActive) {
        // Leviathan on field: instant +50 shield (ignores cap, fires once per lev presence)
        if (_levOnField && !window._blessingLevShieldGiven) {
            window._blessingLevShieldGiven = true;
            sentinels.forEach(s => { s.shield = (s.shield || 0) + 50; });
        } else if (!_levOnField) {
            window._blessingLevShieldGiven = false;
        }

        // +1.75% maxHp every 0.75s to all sentinels
        if (!window._blessingRegenTimer) window._blessingRegenTimer = 0;
        window._blessingRegenTimer += deltaTime;
        if (window._blessingRegenTimer >= 750) {
            window._blessingRegenTimer = 0;
            sentinels.forEach(s => {
                const healAmt2 = (s.maxHp || 100) * 0.0175;
                s.hp = Math.min(s.maxHp || 100, s.hp + healAmt2);
            });
        }
        // +50 flat shield every 3s (capped at 50 for blessing portion)
        if (!window._blessingShieldTimer) window._blessingShieldTimer = 0;
        window._blessingShieldTimer += deltaTime;
        if (window._blessingShieldTimer >= 3000) {
            window._blessingShieldTimer = 0; window._blessingLevShieldGiven = false;
            sentinels.forEach(s => {
                const current = s._blessingShield || 0;
                const toAdd = Math.min(50 - current, 50);
                if (toAdd > 0) {
                    s.shield = (s.shield || 0) + toAdd;
                    s._blessingShield = Math.min(50, current + toAdd);
                }
            });
        }
    } else {
        window._blessingShieldTimer = 0;
        window._blessingLevShieldGiven = false;
    }
    // Gaia Protection: wave-based sentinel Max HP scaling, cap +60%
    if (!window._sentinelHpMilestone) window._sentinelHpMilestone = 0;
    if (!window._gaiaHpBonusPct) window._gaiaHpBonusPct = 0;
    if (!window._gaiaHpCumMult) window._gaiaHpCumMult = 1;
    if (!window._gaiaLastWaveApplied) window._gaiaLastWaveApplied = 0;
    const _applyGaia = (pct) => {
        if (window._gaiaHpBonusPct >= 60) return;
        const add = Math.min(pct, 60 - window._gaiaHpBonusPct);
        const factor = 1 + add / 100;
        window._gaiaHpBonusPct += add;
        window._gaiaHpCumMult *= factor;
        sentinels.forEach(s => {
            const old = s.maxHp;
            s.maxHp = Math.ceil(old * factor);
            s.hp = Math.min(s.maxHp, Math.ceil(s.hp * (s.maxHp / old)));
        });
    };
    if (_waveNumber >= 2 && window._sentinelHpMilestone < 1) {
        window._sentinelHpMilestone = 1;
        _applyGaia(5);
    }
    if (_waveNumber >= 6 && window._sentinelHpMilestone < 2) {
        window._sentinelHpMilestone = 2;
        _applyGaia(10);
    }
    if (_waveNumber >= 10 && window._sentinelHpMilestone < 3) {
        window._sentinelHpMilestone = 3;
        window._gaiaLastWaveApplied = 10;
        _applyGaia(15);
    }
    if (_waveNumber > 10 && window._gaiaHpBonusPct < 60) {
        if (window._gaiaLastWaveApplied < 10) window._gaiaLastWaveApplied = 10;
        while (window._gaiaLastWaveApplied < _waveNumber && window._gaiaHpBonusPct < 60) {
            window._gaiaLastWaveApplied++;
            _applyGaia(3);
        }
    }

    // Gaia Barrier pulse (GfJ): fires immediately on activation, then every 8s (5s after wave 10)
    // Barrier = 20% HP lost + 10% Max HP, non-stacking, replaces previous pulse; NOT part of shield/EP
    if (!window._gfjShieldTimer) window._gfjShieldTimer = 0;
    if (!window._gfjWasActive) window._gfjWasActive = false;
    if (gloryForJusticeActive) {
        const _gfjJustActivated = !window._gfjWasActive;
        window._gfjWasActive = true;
        if (!_gfjJustActivated) window._gfjShieldTimer += deltaTime;
        const _gfjInterval = _waveNumber >= 10 ? 5000 : 8000;
        if (_gfjJustActivated || window._gfjShieldTimer >= _gfjInterval) {
            window._gfjShieldTimer = 0;
            sentinels.forEach(s => {
                const lostHp = Math.max(0, Math.floor((s.maxHp || 100) - s.hp));
                const newBarrier = Math.floor(lostHp * 0.25 + (s.maxHp || 100) * 0.15);
                s._gaiaBarrier = newBarrier;
                s._gaiaBarrierMax = newBarrier;
            });
        }
    } else {
        window._gfjWasActive = false;
        window._gfjShieldTimer = 0;
    }

    updateSoulReaverDoT(deltaTime);
    updateSkillA(deltaTime);
    updateDimensionalRifts(deltaTime);
    updateScatteredProjectiles(deltaTime);
    updateSpirits(deltaTime);
    updateBladeArcProjectiles(deltaTime);
    updateSpiritBullets(deltaTime);
    updatePhotoBrangs(deltaTime);
    updateSkillD(deltaTime);
    updateSkillF(deltaTime);
    updateEnergyOrbs(deltaTime, gameElapsedTime);
    updateTeslaCoils(deltaTime, currentTime);
    updateMarchosiasBlades(deltaTime);

    // Update Leviathan handled inside enemies for loop above

    // Leviathan Perseverance beams (independent objects)
    if (!window._levPersBeams) window._levPersBeams = [];
    window._levPersBeams = window._levPersBeams.filter(beam => {
        if (beam.done) return false;
        const now2 = performance.now();
        const elapsed = now2 - beam.sweepStart;
        const progress = Math.min(1, elapsed / beam.duration); // 0→1 in 1800ms
        // 360° sweep: -π → +π
        beam.sweepCurrent = beam.sweepOrigin + progress * Math.PI * 2;
        beam.progress = progress;

        // Reset player hit flag each full rotation start
        if (progress < 0.02) beam.hitPlayer = false;

        // Angular hit check từ beam origin
        const angHit = (px, py, halfDeg) => {
            const tx = px - beam.ox, ty = py - beam.oy;
            if (tx * tx + ty * ty < 4) return false;
            let diff = Math.atan2(ty, tx) - beam.sweepCurrent;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            return Math.abs(diff) < (halfDeg * Math.PI / 180);
        };

        // Destroy player bullets in beam path
        bullets = bullets.filter(b => !angHit(b.x, b.y, 14));
        spiritBullets = spiritBullets.filter(b => !angHit(b.x, b.y, 14));
        skillAOrbs = skillAOrbs.filter(b => !angHit(b.x, b.y, 14));

        // Hit player
        if (angHit(player.x, player.y, 18)) {
            if (!beam.hitPlayer) { beam.hitPlayer = true; playerTakesHit(); }
        } else {
            beam.hitPlayer = false;
        }

        // Hit sentinels, route qua Vanguard Network nếu active, else direct true damage
        if (!beam.hitSentinels) beam.hitSentinels = new Map();
        const nowMs2 = performance.now();
        if (!beam.id) beam.id = 'pers_' + nowMs2;
        const ownerHits = Math.min(250, beam.ownerRef ? (beam.ownerRef.afoHitCount || 0) : 0);
        const scaledPct = 0.05; // flat 5% per tick
        sentinels.forEach(s => {
            if (angHit(s.x, s.y, 20)) {
                const last = beam.hitSentinels.get(s) || 0;
                if (nowMs2 - last > 80) {
                    beam.hitSentinels.set(s, nowMs2);
                    const ep = s.maxHp + (s.shield || 0);
                    const dmg = Math.min(Math.ceil(ep * 0.50), Math.ceil(ep * scaledPct * ownerHits));

                    if (sentinels.length >= 5) {
                        // Vanguard Network: dùng beam.id làm sourceTag cho AoE dampening
                        _applyVanguardDamage(dmg, beam.id, false, s);
                    } else {
                        // Trực tiếp (< 5 sentinels)
                        if (!(s.ironBody && nowMs2 < s.ironBodyEnd)) {
                            let _levDmg = dmg;
                            if ((s._gaiaBarrier || 0) > 0) {
                                const _gAbsorb = Math.min(Math.ceil(_levDmg * 0.99), s._gaiaBarrier);
                                s._gaiaBarrier = Math.max(0, s._gaiaBarrier - _gAbsorb);
                                if (s._gaiaBarrier <= 0) { addExplosion(s.x, s.y, s.size * 1.2, '#00ff88'); createParticles(s.x, s.y, 14, '#00ff88', 2, 7); }
                                _levDmg = Math.max(1, Math.ceil(_levDmg * 0.01));
                            }
                            s.hp = Math.max(0, s.hp - _levDmg);
                            if (s.hp <= 0) s._markedForDeath = true;
                        }
                    }
                    // Visual effect
                    addExplosion(s.x, s.y, s.size * 0.9, '#ff2200');
                    for (let p = 0; p < 6; p++) {
                        const a = beam.sweepCurrent + (Math.random() - 0.5) * 0.9;
                        particles.push({
                            x: s.x, y: s.y,
                            vx: Math.cos(a) * (3 + Math.random() * 6),
                            vy: Math.sin(a) * (3 + Math.random() * 6),
                            color: p < 2 ? '#ffffff' : '#ff3300',
                            size: 2 + Math.random() * 3,
                            lifetime: 200 + Math.random() * 100, maxLifetime: 300
                        });
                    }
                }
            }
        });

        if (progress >= 1) {
            beam.done = true;
            if (beam.ownerRef && !beam.ownerRef._deathLaserSpawned) {
                beam.ownerRef.perseveranceCooldown = performance.now() + 2000;
            }
            return false;
        }
        return true;
    });

    // Leviathan death lasers (independent objects)
    if (!window._levDeathLasers) window._levDeathLasers = [];
    window._levDeathLasers = window._levDeathLasers.filter(laser => {
        laser.elapsed = (laser.elapsed || 0) + deltaTime;
        const warnTime = laser.warnTime || 1200;
        const activeTime = laser.activeTime || 800;
        const isActive = laser.elapsed >= warnTime;
        const isDone = laser.elapsed >= warnTime + activeTime;
        if (isDone) return false;

        // Only deal damage during active phase
        if (isActive) {
            const dx = Math.cos(laser.angle), dy = Math.sin(laser.angle);

            // Angular hit: reliable at any distance
            const angHitLaser = (px, py, halfDeg) => {
                const tx = px - laser.ox, ty = py - laser.oy;
                const proj = tx * dx + ty * dy;
                if (proj < 0) return false;
                const dist = Math.hypot(tx, ty);
                if (dist < 1) return true;
                return (proj / dist) >= Math.cos(halfDeg * Math.PI / 180);
            };

            // Hit player (pixel distance OK, player is large target)
            const perpPlayer = Math.abs((player.x - laser.ox) * dy - (player.y - laser.oy) * dx);
            if (!laser.hitPlayer && perpPlayer < player.hitRadius + 25) {
                laser.hitPlayer = true;
                playerTakesHit();
            }

            // Hit sentinels, true damage: (hits/2) × (1%→3%), cap 50%
            if (!laser.hitSentinels) laser.hitSentinels = new Set();
            if (!laser.id) laser.id = 'lastrites_' + laser.angle.toFixed(4);
            const hits = laser.levHits || 1;
            const halfHits = hits / 2;
            const scaledPctLaser = 0.03; // flat 3% per hit
            sentinels.forEach(s => {
                if (!laser.hitSentinels.has(s) && angHitLaser(s.x, s.y, 15)) {
                    laser.hitSentinels.add(s);
                    const ep = s.maxHp + (s.shield || 0);
                    const dmg = Math.min(Math.ceil(ep * 0.55), Math.ceil(ep * scaledPctLaser * halfHits));
                    if (sentinels.length >= 5) {
                        _applyVanguardDamage(dmg, laser.id, false, s);
                    } else {
                        if (!(s.ironBody && performance.now() < s.ironBodyEnd)) {
                            let _levBeamDmg = dmg;
                            if ((s._gaiaBarrier || 0) > 0) {
                                const _gAbsorb = Math.min(Math.ceil(_levBeamDmg * 0.99), s._gaiaBarrier);
                                s._gaiaBarrier = Math.max(0, s._gaiaBarrier - _gAbsorb);
                                if (s._gaiaBarrier <= 0) { addExplosion(s.x, s.y, s.size * 1.2, '#00ff88'); createParticles(s.x, s.y, 14, '#00ff88', 2, 7); }
                                _levBeamDmg = Math.max(1, Math.ceil(_levBeamDmg * 0.01));
                            }
                            s.hp = Math.max(0, s.hp - _levBeamDmg);
                            if (s.hp <= 0) s._markedForDeath = true;
                        }
                    }
                }
            });
        }
        return true;
    });

    if (screenShake.duration > 0) screenShake.duration -= deltaTime;

    // Veilshroud lightning effects (visual timer decay)
    if (!window._veilshroudLightnings) window._veilshroudLightnings = [];
    window._veilshroudLightnings = window._veilshroudLightnings.filter(lt => {
        lt.life -= deltaTime;
        return lt.life > 0;
    });

    // Veilshroud pending Void Strikes (persist after host death)
    if (!window._veilshroudPendingStrikes) window._veilshroudPendingStrikes = [];
    window._veilshroudPendingStrikes = window._veilshroudPendingStrikes.filter(ps => {
        ps.countdown += deltaTime;
        if (ps.countdown >= ps.duration) {
            _veilshroudStrike({ lightningTargetX: ps.targetX, lightningTargetY: ps.targetY });
            return false;
        }
        return true;
    });

    // Veilshroud echo explosion zones
    if (!window._veilshroudExplosions) window._veilshroudExplosions = [];
    window._veilshroudExplosions = window._veilshroudExplosions.filter(ez => {
        ez.life -= deltaTime;
        ez.tickTimer += deltaTime;
        if (ez.tickTimer >= ez.tickInterval) {
            ez.tickTimer -= ez.tickInterval;
            ez.hitPlayerThisTick = false;

            // Damage ticks: sentinels
            for (const s of sentinels) {
                if (Math.hypot(s.x - ez.x, s.y - ez.y) < ez.radius) {
                    const dmg = Math.ceil((s.maxHp + (s.shield || 0)) * 0.02);
                    dealDamage(s, { damage: dmg, percentDamage: 0, _vanguardTag: 'veil_echo_expl' });
                    createParticles(s.x, s.y, 6, '#cc44ff', 1, 4);
                }
            }
            // Damage ticks: player, visual hit only, no life loss
            if (!ez.hitPlayerThisTick && Math.hypot(player.x - ez.x, player.y - ez.y) < ez.radius) {
                ez.hitPlayerThisTick = true;
                createParticles(player.x, player.y, 8, '#cc44ff', 2, 6);
            }
        }
        return ez.life > 0;
    });
}

const WAVE_SPAWN_DURATION = 15000;
const WAVE_REST_DURATION = 4000;
const WAVE_TEMPLATES = [
    { normals: 32, abnormals: 0,  elites: 0,  dominators: 0 },
    { normals: 38, abnormals: 6,  elites: 4,  dominators: 0 },
    { normals: 40, abnormals: 7,  elites: 6,  dominators: 2 },
    { normals: 44, abnormals: 8,  elites: 7,  dominators: 3 },
    { normals: 48, abnormals: 9,  elites: 8,  dominators: 4 },
    { normals: 52, abnormals: 11, elites: 9,  dominators: 5 },
    { normals: 56, abnormals: 12, elites: 10, dominators: 6 },
    { normals: 60, abnormals: 13, elites: 11, dominators: 7 },
    { normals: 64, abnormals: 14, elites: 12, dominators: 8 },
];

function _getWaveTemplate(waveNum) {
    if (waveNum <= WAVE_TEMPLATES.length) return WAVE_TEMPLATES[waveNum - 1];
    const extra = waveNum - WAVE_TEMPLATES.length;
    const last = WAVE_TEMPLATES[WAVE_TEMPLATES.length - 1];
    return {
        normals:    last.normals    + extra * 5,
        abnormals:  last.abnormals  + extra,
        elites:     last.elites     + extra,
        dominators: last.dominators + extra,
    };
}

function _buildWaveQueue(waveNum) {
    const tmpl = _getWaveTemplate(waveNum);
    const T = WAVE_SPAWN_DURATION;
    const queue = [];

    // Normals: trickle mix throughout the full window
    let remaining = tmpl.normals;
    const events = [];
    while (remaining > 0) {
        const isBurst = remaining >= 3 && Math.random() < 0.38;
        const count = isBurst ? Math.min(remaining, 2 + Math.floor(Math.random() * 3)) : 1;
        events.push(count);
        remaining -= count;
    }
    const normalGap = T / (events.length + 1);
    events.forEach((count, idx) => {
        const baseAt = Math.round(normalGap * (idx + 1));
        for (let j = 0; j < count; j++)
            queue.push({ tier: 'apostle', at: baseAt + j * 100 });
    });

    // Abnormals: 15%-72% of T, pair if 4+
    const abnPair = tmpl.abnormals >= 4;
    const abnGroups = abnPair ? Math.ceil(tmpl.abnormals / 2) : tmpl.abnormals;
    const abnStart = T * 0.15, abnEnd = T * 0.72;
    const abnSpan = abnGroups > 1 ? (abnEnd - abnStart) / (abnGroups - 1) : 0;
    for (let i = 0; i < tmpl.abnormals; i++) {
        const groupIdx = abnPair ? Math.floor(i / 2) : i;
        const pairOff = abnPair && (i % 2 === 1) ? 500 : 0;
        queue.push({ tier: 'abnormal', at: Math.round(abnStart + groupIdx * abnSpan + pairOff) });
    }

    // Elites: 20%-82% of T, min 2500ms gap so skills don't stack
    const ELITE_MIN_GAP = 2500;
    const eStart = T * 0.20, eEnd = T * 0.82;
    const eSpan = tmpl.elites > 1 ? (eEnd - eStart) / (tmpl.elites - 1) : 0;
    let eAt = 0;
    for (let i = 0; i < tmpl.elites; i++) {
        const natural = Math.round(eStart + i * eSpan);
        eAt = i === 0 ? natural : Math.max(natural, eAt + ELITE_MIN_GAP);
        queue.push({ tier: 'elite', at: eAt });
    }

    // Dominators: 35%-90% of T, min 3500ms gap
    const DOM_MIN_GAP = 3500;
    const dStart = T * 0.35, dEnd = T * 0.90;
    const dSpan = tmpl.dominators > 1 ? (dEnd - dStart) / (tmpl.dominators - 1) : 0;
    let dAt = 0;
    for (let i = 0; i < tmpl.dominators; i++) {
        const natural = Math.round(dStart + i * dSpan);
        dAt = i === 0 ? natural : Math.max(natural, dAt + DOM_MIN_GAP);
        queue.push({ tier: 'dominator', at: dAt });
    }

    return queue.sort((a, b) => a.at - b.at);
}

function _spawnWaveTier(tier) {
    const _now = performance.now();
    if (tier === 'abnormal') {
        const pool = [];
        if (enemies.filter(e => e.type === 'marchosias').length < 2) pool.push('marchosias');
        const vc = enemies.filter(e => e.type === 'veilshroud').length;
        const ec = enemies.filter(e => e.type === 'egregor').length;
        if (vc < 2 && ec === 0) pool.push('veilshroud');
        if (!pool.length) { spawnApostle(); return; }
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick === 'marchosias') spawnMarchosias(); else spawnVeilshroud();
    } else if (tier === 'elite') {
        const pool = [];
        if (enemies.filter(e => e.type === 'thaelis').length < 3) pool.push('thaelis');
        if (enemies.filter(e => e.type === 'aegis_core').length < 2) pool.push('aegis_core');
        const ec = enemies.filter(e => e.type === 'egregor').length;
        const vc = enemies.filter(e => e.type === 'veilshroud').length;
        const egrOk = !window._lastEgregorKillTime || (_now - window._lastEgregorKillTime) >= 6000;
        if (ec < 1 && vc === 0 && egrOk) pool.push('egregor');
        if (!pool.length) { spawnApostle(); return; }
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick === 'thaelis') spawnThaelis();
        else if (pick === 'aegis_core') spawnAegisCore();
        else spawnEgregor();
    } else if (tier === 'dominator') {
        const pool = [];
        if (enemies.filter(e => e.type === 'dargruel').length < 2) pool.push('dargruel');
        const levOk = !window._lastLeviathanKillTime || (_now - window._lastLeviathanKillTime) >= 8000;
        if (enemies.filter(e => e.type === 'leviathan').length < 1 && levOk) pool.push('leviathan');
        if (!pool.length) { spawnApostle(); return; }
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick === 'dargruel') spawnDargruel();
        else { spawnLeviathan(); _ensureLeviathanQuota(enemies[enemies.length - 1]); }
    }
}

function _updateWaveSystem(deltaTime, now) {
    if (_wavePhase === 'rest') {
        _waveRestTimer = Math.max(0, _waveRestTimer - deltaTime);
        if (_waveRestTimer <= 0) {
            _waveNumber++;
            if (_waveNumber >= 8 && (_waveNumber - 8) % 2 === 0) {
                _yuukiBonus = Math.min(1.50, _yuukiBonus + 0.15);
            }
            _waveQueue = _buildWaveQueue(_waveNumber);
            _waveQueueTimer = 0;
            _wavePhase = 'spawning';
            _waveAnnouncedAt = now;
        }
        return;
    }
    _waveQueueTimer += deltaTime;
    const _cap = (typeof _platform !== 'undefined' && _platform === 'mobile') ? 10 : Infinity;
    while (_waveQueue.length > 0 && _waveQueue[0].at <= _waveQueueTimer) {
        const entry = _waveQueue.shift();
        const active = enemies.filter(e => !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo').length;
        if (active < _cap) {
            if (entry.tier === 'apostle') spawnApostle();
            else _spawnWaveTier(entry.tier);
        }
    }
    if (_waveQueue.length === 0) {
        const _alive = enemies.filter(e => !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo').length;
        if (_alive === 0) {
            _wavePhase = 'rest';
            _waveRestTimer = 5000;
            _waveForceEndTimer = 0;
        } else {
            _waveForceEndTimer += deltaTime;
            if (_waveForceEndTimer >= 12000) {
                _wavePhase = 'rest';
                _waveRestTimer = 1000;
                _waveForceEndTimer = 0;
            }
        }
    }
}

function gameLoop(timeStamp) {
    if (!lastTimeStamp) lastTimeStamp = timeStamp;
    let deltaTime = timeStamp - lastTimeStamp;

    // Mobile 45fps throttle: skip frame if < 22ms since last
    if (typeof _platform !== 'undefined' && _platform === 'mobile') {
        if (deltaTime < 22) { // ~45fps cap
            requestAnimationFrame(gameLoop);
            return;
        }
    }

    lastTimeStamp = timeStamp;

    // deltaTime quá lớn → tab bị ẩn hoặc máy lag → pause và reset clock
    if (deltaTime > 500 && gameState === "playing" && !gamePaused) {
        gamePaused = true;
        showPauseScreen();
    }

    // Luôn vẽ (để màn hình không đóng băng), chỉ update khi không pause
    if (!gamePaused && !loading) {
        update(Math.min(deltaTime, 50)); // cap 50ms, tránh physics jump khi tab quay lại
    }
    draw(gamePaused || loading ? 0 : Math.min(deltaTime, 50));

    // Export object count cho quality tier system
    window._objectCount = (enemies ? enemies.length : 0)
        + (bullets ? bullets.length : 0)
        + (spiritBullets ? spiritBullets.length : 0)
        + (photoBrangs ? photoBrangs.length : 0);

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
    photoBrangs = []; primevalSummonEffect = null;
    primevalEnergy = 0; _spiritCooldownOverrideUntil = 0;
    window._blessingShieldTimer = 0;
    window._sentinelHpMilestone = 0;
    window._gaiaHpBonusPct = 0;
    window._gaiaHpCumMult = 1;
    window._gaiaLastWaveApplied = 0;
    window._gfjShieldTimer = 0;
    window._gfjWasActive = false;
    bossShockwaves = [];
    aegisLasers = [];
    marchosiasBlades = [];
    window._levDeathLasers = [];
    window._levPersBeams = [];
    window._dimBreakZones = [];
    window._lastLeviathanSpawnTime = null;
    window._lastLeviathanKillTime = null;
    window._lastEgregorKillTime = null;
    _waveNumber = 0; _wavePhase = 'rest'; _waveRestTimer = 0; _yuukiBonus = 0;
    _waveQueue = []; _waveQueueTimer = 0; _waveAnnouncedAt = 0; _waveForceEndTimer = 0;
    window._vanguardState = { recentDamage: [], fuseTriggered: false, fuseCooldownEnd: 0 };
    window._blessingRegenTimer = 0;
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
    // Mobile: tính ngược scale để player xuất hiện đúng đáy màn hình sau ctx.scale(0.78)
    if (typeof _platform !== 'undefined' && _platform === 'mobile') {
        player.y = boundaryY - 18;
    }
    gameStartTime = lastEnemySpawn = lastAutoFire = performance.now();
    gameElapsedTime = 0;
    laserActive = false; laserCooldownEnd = 0; charging = false; gamePaused = false;
    lastSkillA = -Infinity; lastSkillS = -Infinity; lastSkillD = -Infinity; lastSkillF = -Infinity;
    skillASensorRadius = Math.min(canvas.width, canvas.height) * 0.9;
    hideStartButton();
    hideMainMenuButton();
    lastTimeStamp = performance.now();
    // gameLoop đang chạy liên tục từ draw(16.67) ở cuối file, không cần khởi động lại
}

// Khởi động game loop một lần duy nhất khi trang loadaa
requestAnimationFrame(gameLoop);