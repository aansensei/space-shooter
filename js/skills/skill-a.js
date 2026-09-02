// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/skill-a.js — split out of the old monolithic js/skills.js.
// Skill A: Thunder Orbs (activate/update/rebalance), Dimensional Rift
// (a Skill A buff), and the shared scattered-projectiles system its own
// orb-burst uses.

// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
function updateDefensiveOrbs() {
    let currentDefensive = skillAOrbs.filter(o => o.isDefensive).length;
    let targetDefensive = Math.min(skillADefensiveCharges, skillAOrbs.length);
    let needed = targetDefensive - currentDefensive;

    if (needed > 0) {
        let nonDefensiveOrbs = _shuffleArray(skillAOrbs.filter(o => !o.isDefensive));
        for (let i = 0; i < needed && i < nonDefensiveOrbs.length; i++) {
            nonDefensiveOrbs[i].isDefensive = true;
        }
    } else if (needed < 0) {
        let defensiveOrbs = skillAOrbs.filter(o => o.isDefensive);
        for (let i = 0; i < -needed && i < defensiveOrbs.length; i++) {
            defensiveOrbs[i].isDefensive = false;
        }
    }
}

function activateSkillA() {
    const currentTime = performance.now();
    if (typeof player !== "undefined" && player._silenced) return; // Silence
    if (gameState !== "playing" || window._sigilPicker || currentTime - lastSkillA < _skillACooldown()) return;

    const canSpawnOrbs = skillAOrbs.length < maxSkillAOrbs;
    const hasSolJudgment = _hasBuff('mui_ten_apollo');
    if (!canSpawnOrbs && !hasSolJudgment) return; // nothing would happen — don't consume the cooldown

    lastSkillA = currentTime;
    if (window.AudioMgr) window.AudioMgr.playSfx('skill-a-activate');
    _checkMirrorLaserProc();

    if (canSpawnOrbs) {
        skillAActive = true;
        skillADefensiveCharges = 3;

        const orbsToAdd = Math.min(20, maxSkillAOrbs - skillAOrbs.length);
        const _orbSize = _hasBuff('xuyen_pha') ? 8 * 1.30 : 8; // Astral Pierce: +30% orb size
        for (let i = 0; i < orbsToAdd; i++) {
            skillAOrbs.push({
                angle: 0, radius: 0, target: null,
                x: player.x, y: player.y, speed: 0, size: _orbSize,
                isDefensive: false
            });
        }

        updateDefensiveOrbs();
        rebalanceSkillAOrbs();
    }
    if (hasSolJudgment) _queueSolArrow();
}

function rebalanceSkillAOrbs() {
    const untargetedOrbs = skillAOrbs.filter(orb => !orb.target);
    if (untargetedOrbs.length === 0) return;
    const orbsPerLayer = 20;
    const numLayers = Math.ceil(untargetedOrbs.length / orbsPerLayer);
    let orbIndex = 0;
    for (let layer = 0; layer < numLayers; layer++) {
        // 60px inner gap keeps orbs away from the player hitbox, 35px per layer keeps rings visually distinct
        const layerRadius = 60 + layer * 35;
        const orbsInThisLayer = (layer === numLayers - 1) ? untargetedOrbs.length - orbIndex : orbsPerLayer;
        for (let i = 0; i < orbsInThisLayer; i++) {
            const orb = untargetedOrbs[orbIndex];
            // divides a full circle evenly so orbs spread at equal angles around the player
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

    let availableEnemy = enemies.find(enemy => !enemy.isTargetedByA && !enemy.inCoronation && !enemy.type.startsWith('enemy_bullet') && enemy.type !== 'abyssal_chain' && enemy.type !== 'veilshroud_echo' && Math.hypot(enemy.x - player.x, enemy.y - player.y) <= skillASensorRadius);

    if (availableEnemy) {
        let availableOrb = skillAOrbs.find(orb => !orb.target && !orb.isDefensive && !orb._pierced);
        if (!availableOrb) availableOrb = skillAOrbs.find(orb => !orb.target && !orb._pierced);

        if (availableOrb) {
            availableOrb.target = availableEnemy;
            availableOrb.speed = 10;
            availableEnemy.isTargetedByA = true;
            if (window.AudioMgr) window.AudioMgr.playSfxAt('skill-a-orb-lock', availableOrb.x, availableOrb.y);

            if (availableOrb.isDefensive) {
                availableOrb.isDefensive = false;
                updateDefensiveOrbs();
            }
            rebalanceSkillAOrbs();
        }
    }
    for (let i = skillAOrbs.length - 1; i >= 0; i--) {
        let orb = skillAOrbs[i];
        // When player is silenced, orbs stop targeting and return to orbit
        const playerSilenced = typeof player !== 'undefined' && player._silenced;
        if (orb.target && playerSilenced) {
            // Release target, return to orbit
            orb.target.isTargetedByA = false;
            orb.target = null;
            orb.speed = 0;
        }
        if (orb._pierced) {
            orb.x += orb._pvx * dt;
            orb.y += orb._pvy * dt;
            particles.push({ x: orb.x, y: orb.y, vx: -orb._pvx * 0.1, vy: -orb._pvy * 0.1, lifetime: 200, maxLifetime: 200, size: 4, color: 'rgba(0, 200, 255, 0.7)' });
            if (orb.x < -100 || orb.x > canvas.width + 100 || orb.y < -100 || orb.y > canvas.height + 100) {
                skillAOrbs.splice(i, 1);
                updateDefensiveOrbs();
                rebalanceSkillAOrbs();
                continue;
            }
            for (const _pe of enemies) {
                if (_pe.type.startsWith('enemy_bullet') || _pe.type === 'abyssal_chain' || _pe.type === 'veilshroud_echo' || _pe.inCoronation || _pe.hp <= 0) continue;
                if (orb._pierceHits.has(_pe)) continue;
                if (Math.hypot(_pe.x - orb.x, _pe.y - orb.y) < _pe.size / 2 + orb.size) {
                    orb._pierceHits.add(_pe);
                    dealDamage(_pe, { damage: 200, percentDamage: 0.20, _noHitSfx: true, _statSrc: 'Skill A: Thunder Orbs' });
                    // Sát thương CHUẨN (true damage) thêm: 100 base + 15% HP đã mất của mục tiêu
                    if (_pe.hp > 0) dealDamage(_pe, { damage: 100 + Math.ceil((_pe.maxHp - _pe.hp) * 0.15), isTrueDamage: true, _noHitSfx: true, _statSrc: 'Skill A: Thunder Orbs' });
                    spawnScatteredProjectiles(orb.x, orb.y, 8, { damage: 8, percentDamage: 0.020 });
                    addExplosion(orb.x, orb.y, 20, 'cyan');
                    if (window.AudioMgr) window.AudioMgr.playSfxAt('skill-a-orb-hit', orb.x, orb.y);
                }
            }
            continue;
        }
        if (orb.target) {
            if (!enemies.includes(orb.target) || orb.target.hp <= 0) {
                if (orb.target) orb.target.isTargetedByA = false;
                skillAOrbs.splice(i, 1);
                updateDefensiveOrbs();
                rebalanceSkillAOrbs();
                continue;
            }
            const dx = orb.target.x - orb.x, dy = orb.target.y - orb.y, dist = Math.hypot(dx, dy);
            orb.speed += 0.8 * dt;
            orb.x += (dx / dist) * orb.speed * dt;
            orb.y += (dy / dist) * orb.speed * dt;
            particles.push({
                x: orb.x, y: orb.y, vx: -(dx / dist) * 2, vy: -(dy / dist) * 2,
                lifetime: 200, maxLifetime: 200, size: 4, color: orb.isDefensive ? 'rgba(255, 255, 0, 0.7)' : 'rgba(0, 255, 255, 0.7)'
            });
            if (dist < orb.target.size / 2 + orb.size) {
                // Detect actual damage dealt (not blocked by iron body / absoluteShield / evade)
                const _preTotal = orb.target.hp + (orb.target.shield || 0) + (orb.target._tenacityBarrier || 0);
                dealDamage(orb.target, { damage: 200, percentDamage: 0.20, _noHitSfx: true, _statSrc: 'Skill A: Thunder Orbs' });
                // Sát thương CHUẨN (true damage) thêm: 100 base + 15% HP đã mất của mục tiêu
                if (orb.target.hp > 0) dealDamage(orb.target, { damage: 100 + Math.ceil((orb.target.maxHp - orb.target.hp) * 0.15), isTrueDamage: true, _noHitSfx: true, _statSrc: 'Skill A: Thunder Orbs' });
                const _didDmg = orb.target.hp + (orb.target.shield || 0) + (orb.target._tenacityBarrier || 0) < _preTotal;
                orb.target.isTargetedByA = false;

                spawnScatteredProjectiles(orb.x, orb.y, 16, { damage: 8, percentDamage: 0.020 });
                addExplosion(orb.x, orb.y, 30, orb.isDefensive ? 'yellow' : 'cyan');
                if (window.AudioMgr) window.AudioMgr.playSfxAt('skill-a-orb-hit', orb.x, orb.y);
                if (_didDmg) spawnDimensionalRift(orb.x, orb.y);
                if (_hasBuff('xuyen_pha')) {
                    orb._pierced = true;
                    orb._pvx = (dx / dist) * orb.speed;
                    orb._pvy = (dy / dist) * orb.speed;
                    orb._pierceHits = new Set([orb.target]);
                    orb.target = null;
                } else {
                    skillAOrbs.splice(i, 1);
                }
                updateDefensiveOrbs();
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

// Dimensional Rift (Skill A buff)

function spawnDimensionalRift(x, y) {
    if (window.AudioMgr) window.AudioMgr.playSfxAt('dimensional-rift', x, y);
    const radius = 50;
    const numCracks = 6 + Math.floor(Math.random() * 5);
    const cracksInfo = [];
    for (let i = 0; i < numCracks; i++) {
        cracksInfo.push({
            baseAngle: (i / numCracks) * Math.PI * 2 + (Math.random() * 0.4),
            maxLength: radius * (1.1 + Math.random() * 0.5),
            hasSubBranch: Math.random() > 0.4,
        });
    }
    const rift = {
        x, y, radius, timer: 3000, maxTimer: 3000,
        cracksInfo, _chainCooldown: 0,
        _age: 0, _ringRot: 0, _particles: [],
    };
    dimensionalRifts.push(rift);
}

function updateDimensionalRifts(deltaTime) {
    const dt = deltaTime / 16.67;

    // Reset per-enemy rift flags before re-evaluating this frame
    for (const e of enemies) {
        e._inDimensionalRift = false;
        e._riftSlow = false;
    }

    for (let ri = dimensionalRifts.length - 1; ri >= 0; ri--) {
        const rift = dimensionalRifts[ri];
        rift.timer -= deltaTime;
        if (rift._chainCooldown > 0) rift._chainCooldown -= deltaTime;

        if (rift.timer <= 0) {
            dimensionalRifts.splice(ri, 1);
            continue;
        }

        // Animation state, drives ctx rendering each frame
        rift._age     += dt * 0.05;
        rift._ringRot -= 0.025 * dt;

        // Particle spawn (45% chance per frame, matches Pixi reference)
        if (Math.random() < 0.45) {
            const pA = Math.random() * Math.PI * 2;
            const pD = Math.random() * rift.radius * 1.1;
            rift._particles.push({
                x: rift.x + Math.cos(pA) * pD, y: rift.y + Math.sin(pA) * pD,
                vx: (Math.random() - 0.5) * 0.4, vy: -0.4 - Math.random() * 1.2,
                life: 1.0, isCyan: Math.random() > 0.5,
            });
        }
        for (let j = rift._particles.length - 1; j >= 0; j--) {
            const p = rift._particles[j];
            p.x += p.vx; p.y += p.vy; p.life -= 0.018;
            if (p.life <= 0) rift._particles.splice(j, 1);
        }

        for (const enemy of enemies) {
            const inRange = Math.hypot(enemy.x - rift.x, enemy.y - rift.y) <= rift.radius;

            // Bullet absorption (enemy_bullet* only)
            if (enemy.type.startsWith('enemy_bullet')) {
                const bd = Math.hypot(enemy.x - rift.x, enemy.y - rift.y);
                if (bd <= rift.radius * 2.5 && bd > 0) {
                    // Pull force toward center
                    const pullStr = 0.35 * dt * (1 - bd / (rift.radius * 2.5));
                    enemy.vx += ((rift.x - enemy.x) / bd) * pullStr;
                    enemy.vy += ((rift.y - enemy.y) / bd) * pullStr;
                    // Absorbed when inside core
                    if (bd < rift.radius * 0.45) enemy.hp = 0;
                }
                continue;
            }

            if (!inRange) continue;
            if (enemy.type === 'abyssal_chain' || enemy.type === 'veilshroud_echo') continue;
            if (enemy.type === 'embryo') continue; // CC-immune + special DR rules, fully exempt from all rift effects
            if (enemy.hp <= 0 || enemy.inCoronation) continue;

            // Mark for damage bonus & slow (egregor/dargruel/leviathan immune to slow; marchosias immune while Arc Shield active)
            enemy._inDimensionalRift = true;
            if (enemy.type !== 'egregor' && enemy.type !== 'dargruel' && enemy.type !== 'leviathan'
                && !(enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0)
                && !(enemy.type === 'aegis_core' && enemy.aegisInvulnerable)) enemy._riftSlow = true;

            // Apply Soul Reaver debuff
            enemy.soulReaver = true;
            enemy.soulReaverEnd = performance.now() + 2000;

            // Soul Devourer DoT, direct HP subtraction, bypasses DR
            if (!enemy._riftDotTimer) enemy._riftDotTimer = 0;
            enemy._riftDotTimer -= deltaTime;
            if (enemy._riftDotTimer <= 0) {
                enemy._riftDotTimer = 350;
                const dotDmg = Math.ceil(60 + (enemy.maxHp || enemy.hp) * 0.055);
                enemy.hp -= dotDmg;
                enemy.hp = Math.max(0, enemy.hp);
                if (enemy.hp <= 0) enemy._markedForDeath = true;
                createParticles(
                    enemy.x + (Math.random() - 0.5) * (enemy.size || 20),
                    enemy.y + (Math.random() - 0.5) * (enemy.size || 20),
                    3, '#d800ff', 1, 3
                );

                // 20% chain lightning chance per DoT tick
                if (Math.random() < 0.20 && rift._chainCooldown <= 0) {
                    rift._chainCooldown = 150;
                    const chainDmg = dotDmg * 0.50;
                    let chainCount = 0;
                    for (const other of enemies) {
                        if (chainCount >= 8) break;
                        if (other === enemy || other.type.startsWith('enemy_bullet')) continue;
                        if (other.type === 'veilshroud_echo' || other.type === 'embryo' || other.inCoronation) continue;
                        if (Math.hypot(other.x - enemy.x, other.y - enemy.y) < 150) {
                            dealDamage(other, { damage: chainDmg, isChainLightning: true, applySoulReaver: Math.random() < 0.60 });
                            chainLightningEffects.push({ x1: enemy.x, y1: enemy.y, x2: other.x, y2: other.y, lifetime: 250, maxLifetime: 250 });
                            chainCount++;
                        }
                    }
                }
            }
        }
    }
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
            if (enemy.type === 'abyssal_chain') continue;   // piercing, immune
            if (enemy.type === 'veilshroud_echo') continue; // untargetable
            if (enemy.inCoronation) continue;               // untargetable during coronation
            let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - proj.x, enemy.y - proj.y) < enemyRadius + proj.size) {
                if (proj.isBouncingBall) {
                    if (!proj.hitEnemies) proj.hitEnemies = [];
                    if (proj.hitEnemies.includes(enemy)) continue;
                    if (checkMarchosiasArcBarrier(enemy, proj, proj.x, proj.y)) { proj.hitEnemies.push(enemy); continue; }
                    dealDamage(enemy, proj);
                    proj.hitEnemies.push(enemy);
                } else {
                    if (checkMarchosiasArcBarrier(enemy, proj, proj.x, proj.y)) { proj.lifetime = 0; break; }
                    dealDamage(enemy, proj);
                    proj.lifetime = 0;
                    break;
                }
            }
        }
    }
}

