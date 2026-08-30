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
            if (bounced && window.AudioMgr) window.AudioMgr.playSfxAt('photokrystos-boomerang-bounce', b.x, b.y);
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
        const bounceMult = now < s.bounceBoostEnd ? 1.10 : 1.0;
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

function activateSkillD() {
    const currentTime = performance.now();
    if (typeof player !== 'undefined' && player._silenced) return;
    if (gameState !== "playing" || window._sigilPicker || skillDCharging || deathStar || currentTime - lastSkillD < skillDCooldown) return;
    _checkMirrorLaserProc();
    if (_hasBuff('dong_chay_luan_hoi')) {
        // Cycle of Flow: skip the charge phase entirely
        lastSkillD = currentTime;
        deathStar = { x: player.x, y: player.y - player.height, size: 10, maxSize: 120, vy: -1.8, activeTime: 0, nextMarkAt: 500, laserAt: -1, markedTargets: [] };
        if (window.AudioMgr) window.AudioMgr.startDeathStar();
        return;
    }
    skillDCharging = true;
    skillDChargeStartTime = performance.now();
    if (window.AudioMgr) window.AudioMgr.startSkillDCharge();
}

// Same untargetable-during-Skill-D filters used by both the pull loop and the
// mark step below — kept as one function so the two can never drift apart.
function _skillDCanTarget(enemy) {
    if (enemy.type === 'abyssal_chain') return false; // piercing, immune to Death Star
    if (enemy.type === 'veilshroud_echo') return false; // echo miễn CC
    if (enemy.inCoronation) return false; // untargetable during coronation
    if (enemy.type === 'veilshroud' && enemy.inPhantom) return false; // frozen during phantom
    return true;
}
function _skillDIsCCImmune(enemy) {
    return enemy.type === 'egregor' || enemy.type === 'dargruel' || enemy.type === 'leviathan' || enemy.type === 'goliath'
        || (enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0)
        || (enemy.type === 'aegis_core' && enemy.aegisInvulnerable);
}
// A Death Star kill (center instakill, Mark & Annihilate beam, or a
// CC-immune enemy finally dying from accumulated 30%-MaxHP ticks) refunds
// 0.25s off Skill D's own cooldown — mirrors Cycle of Flow's own
// clamp-to-now floor (js/entities.js) so the cooldown can never be pushed
// into the future. Spawning a spaceship is a SEPARATE passive (any enemy
// death within radius of the Death Star, regardless of what killed it — see
// handleEnemyKill in js/entities.js), not tied to this refund.
function _skillDOnKill(enemy) {
    if (!enemy._markedForDeath) return;
    lastSkillD = Math.min(performance.now(), lastSkillD - 250);
}

function updateSkillD(deltaTime) {
    if (skillDCharging) {
        if (performance.now() - skillDChargeStartTime >= skillDChargeTime) {
            skillDCharging = false;
            lastSkillD = performance.now();
            deathStar = {
                x: player.x, y: player.y - player.height,
                size: 10, maxSize: 120, vy: -1.8, activeTime: 0,
                nextMarkAt: 500, laserAt: -1, markedTargets: [],
            };
            if (window.AudioMgr) { window.AudioMgr.stopSkillDCharge(); window.AudioMgr.startDeathStar(); }
        }
    }
    if (deathStar) {
        let dt = deltaTime / 16.67;
        deathStar.y += deathStar.vy * dt;
        deathStar.activeTime += deltaTime;
        if (deathStar.size < deathStar.maxSize) deathStar.size += 1 * dt;

        const pullSpeed = 7; // buffed from the original 6 (+16.7%)
        // Contact radius matches the Death Star's actual visible outer edge
        // (SKILLD_CONTACT_MULT, js/config.js — keep in sync with the base
        // disc drawn at deathStar.size * 2.5 scaled by DS_SCALE = 2.0/2.8 in
        // js/render/skill-d.js if the visual footprint ever changes), plus
        // the target's own radius so it's edge-to-edge like every other
        // collision check in this game, not center-to-center — touching the
        // Death Star kills, enemies don't need to be dragged to its center.
        const _dsContactMult = SKILLD_CONTACT_MULT;
        for (let enemy of enemies) {
            if (!_skillDCanTarget(enemy)) continue;
            let dx = deathStar.x - enemy.x, dy = deathStar.y - enemy.y, d = Math.hypot(dx, dy);
            const _bhCCImmune = _skillDIsCCImmune(enemy);
            if (enemy.type !== 'embryo' && !_bhCCImmune) {
                if (d > 1) {
                    enemy.x += (dx / d) * pullSpeed * dt;
                    enemy.y += (dy / d) * pullSpeed * dt;
                }
                if (_hasBuff('coi_mong') && !enemy._yogMark) {
                    enemy._yogMark = true;
                    enemy._yogMarkStart = performance.now();
                    enemy._yogMarkAccum = 0;
                    applyVulnerability(enemy);
                }
            }
            if (d < deathStar.size * _dsContactMult + (enemy.size || 0) / 2) {
                // Death Star touches Marchosias's arc barrier: sword 25%, barrier takes impact, Mar not insta-killed
                if (enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0) {
                    if (Math.random() < 0.25) _tryTriggerMarchosiasCounter(enemy);
                } else if (enemy.type === 'leviathan' && enemy.afoShieldActive) {
                    enemy.afoHitCount = (enemy.afoHitCount || 0) + 1;
                } else {
                    // Tick once per 400ms instead of every FRAME — this loop
                    // runs every frame, so calling dealDamage directly would
                    // turn one touch of the Death Star into dozens of "hits"
                    // in under half a second. Fine for normal enemies
                    // (999999999 dmg kills on the first tick anyway), but for
                    // _bhCCImmune (Goliath, Egregor, Dargruel, Leviathan
                    // without its shield...) 30% MaxHP true damage on EVERY
                    // one of those ticks would wipe them out in a single
                    // touch — the exact bug where Warding Palm got "grazed
                    // once and died anyway" even though per-hit no longer has
                    // a cumulative cap.
                    // Goliath specifically gets a slower 1000ms tick (1/s
                    // instead of the usual 2.5/s) - every one of these still
                    // has to pass through Warding Palm's own per-hit 15%/35%
                    // MaxHP roll, so a tighter cap here keeps that from
                    // firing more often than intended while touching.
                    const _bhNow = performance.now();
                    const _bhTickInterval = enemy.type === 'goliath' ? 1000 : 400;
                    if (!enemy._bhNextTick || _bhNow >= enemy._bhNextTick) {
                        enemy._bhNextTick = _bhNow + _bhTickInterval;
                        if (_bhCCImmune) {
                            dealDamage(enemy, { damage: Math.ceil(enemy.maxHp * 0.30), isTrueDamage: true, _noBase60: true, _bypassIronBody: _hasBuff('tu_huyet'), _isSkillD: true });
                        } else {
                            dealDamage(enemy, { damage: enemy.maxHp * 999999999, _noBase60: true, _bypassIronBody: _hasBuff('tu_huyet'), _isSkillD: true });
                        }
                        _skillDOnKill(enemy);
                    }
                }
            }
        }

        // Dominator+/Digiform escort: while a dargruel/leviathan/goliath is
        // within the same spawn radius as the on-kill spaceship passive
        // (js/entities.js handleEnemyKill), drop a spaceship every 1s -
        // fires the instant one's first spotted, not waiting out the first
        // full second. Resets the moment none are in range so re-entering
        // fires immediately again too.
        {
            const _dsSpawnR = deathStar.size * SKILLD_CONTACT_MULT + 180;
            const _domSpotted = enemies.some(e => (e.type === 'dargruel' || e.type === 'leviathan' || e.type === 'goliath')
                && Math.hypot(e.x - deathStar.x, e.y - deathStar.y) <= _dsSpawnR);
            if (_domSpotted) {
                if (!deathStar._domDetected) {
                    deathStar._domDetected = true;
                    deathStar._domSpawnTimer = 1000;
                    spawnSkillDSpaceship(deathStar.x, deathStar.y);
                } else {
                    deathStar._domSpawnTimer -= deltaTime;
                    if (deathStar._domSpawnTimer <= 0) {
                        deathStar._domSpawnTimer = 1000;
                        spawnSkillDSpaceship(deathStar.x, deathStar.y);
                    }
                }
            } else {
                deathStar._domDetected = false;
            }
        }

        // Repeating mark -> laser cycle: every ~2s (1.5s telegraph + 2s CD
        // after firing) mark 3 targets (CC-immune ones first, since those
        // can't be pulled to the instant-kill center at all — otherwise the
        // 3 highest-current-HP valid targets), then fire a piercing true-
        // damage beam through each one out to the screen edge. Deliberately
        // NOT tagged _isSkillD — Warding Palm (js/entities.js) should only
        // ever react to the center pull-kill hit above, not this.
        if (deathStar.laserAt < 0 && deathStar.activeTime >= deathStar.nextMarkAt) {
            const valid = enemies.filter(_skillDCanTarget);
            let pool = valid.filter(_skillDIsCCImmune);
            if (pool.length === 0) pool = valid.filter(e => e.type !== 'embryo');
            pool.sort((a, b) => b.hp - a.hp);
            deathStar.markedTargets = pool.slice(0, 3);
            deathStar.laserAt = deathStar.activeTime + 1500;
        } else if (deathStar.laserAt >= 0 && deathStar.activeTime >= deathStar.laserAt) {
            // Same shake weight as Aegis Core's Lumen Nova (js/main.js) so the
            // volley reads with real impact instead of a flat visual-only beam.
            if (deathStar.markedTargets.length > 0) {
                _setShake(8, 200);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('laser-fire', deathStar.x, deathStar.y);
            }
            const reach = Math.hypot(canvas.width, canvas.height) * 1.5;
            for (const target of deathStar.markedTargets) {
                if (!enemies.includes(target) || target.hp <= 0) continue;
                const tdx = target.x - deathStar.x, tdy = target.y - deathStar.y;
                const tdist = Math.hypot(tdx, tdy) || 1;
                const ux = tdx / tdist, uy = tdy / tdist;
                const endX = deathStar.x + ux * reach, endY = deathStar.y + uy * reach;
                window.skillDLasers.push({ startX: deathStar.x, startY: deathStar.y, endX, endY, life: 1.0 });
                for (const enemy of enemies) {
                    if (!_skillDCanTarget(enemy) || enemy.hp <= 0) continue;
                    if (distToSegment(enemy, { x: deathStar.x, y: deathStar.y }, { x: endX, y: endY }) < enemy.size / 2 + 6) {
                        dealDamage(enemy, { damage: 100, percentDamage: 0.15, isTrueDamage: true, isPiercing: true });
                        _skillDOnKill(enemy);
                    }
                }
            }
            deathStar.markedTargets = [];
            deathStar.laserAt = -1;
            deathStar.nextMarkAt = deathStar.activeTime + 2000;
        }

        if (deathStar.y + deathStar.maxSize < 0) {
            deathStar.markedTargets.forEach(e => { if (e) e._skillDMarked = false; });
            deathStar = null;
            if (window.AudioMgr) window.AudioMgr.stopDeathStar();
        }
    }

    // Beam visuals fade independently of the logic above (life ticks down
    // every frame regardless of whether the Death Star that fired them is
    // still alive, matching how other short-lived FX arrays in this file work).
    for (let i = window.skillDLasers.length - 1; i >= 0; i--) {
        window.skillDLasers[i].life -= 0.05;
        if (window.skillDLasers[i].life <= 0) window.skillDLasers.splice(i, 1);
    }
    for (let i = window.skillDBolts.length - 1; i >= 0; i--) {
        window.skillDBolts[i].life -= 0.15;
        if (window.skillDBolts[i].life <= 0) window.skillDBolts.splice(i, 1);
    }

    updateSkillDSpaceships(deltaTime);

    if (_hasBuff('coi_mong')) {
        const _markNow = performance.now();
        for (const enemy of enemies) {
            if (enemy._yogMark && _markNow - enemy._yogMarkStart >= 1650) {
                const _expDmg = Math.ceil((enemy._yogMarkAccum || 0) * 0.60 + (enemy.maxHp - enemy.hp) * 0.35);
                if (_expDmg > 0) dealDamage(enemy, { damage: _expDmg, isTrueDamage: true, _yogExplosion: true });
                createParticles(enemy.x, enemy.y, 15, '#8b5cf6', 3, 8);
                enemy._yogMark = false;
                enemy._yogMarkAccum = 0;
            }
        }
    }
}

function _skillDFindHighestHpTarget() {
    let best = null, bestHp = -Infinity;
    for (const enemy of enemies) {
        if (enemy.type.startsWith('enemy_bullet')) continue;
        if (enemy.type === 'abyssal_chain') continue;
        if (enemy.type === 'veilshroud_echo') continue;
        if (enemy.inCoronation) continue;
        if (enemy.hp > bestHp) { best = enemy; bestHp = enemy.hp; }
    }
    return best;
}

// Fusion tiers: 2 same-tier ships within 50px merge into 1 higher tier
// (max Tier 3). Multipliers are cumulative vs Tier 1's own base stats —
// Tier 2 = Tier 1 stats x1.5, Tier 3 = Tier 2 stats x2 (= Tier 1 x3).
const SKILLD_SHIP_TIER_MULT = [0, 1, 1.5, 3]; // index by tier (1..3), [0] unused
const SKILLD_SHIP_TIER_COLOR = [null, '#00ffff', '#a855f7', '#ff2244']; // cyan / purple / red
const SKILLD_SHIP_BASE_HP = 560, SKILLD_SHIP_BASE_BOLT_DMG = 100,
      SKILLD_SHIP_BASE_CONTACT_DMG = 100, SKILLD_SHIP_BASE_CONTACT_PCT = 0.08;

function spawnSkillDSpaceship(x, y) {
    // Same size/speed formula as spawnMarchosiasMinion (js/entities.js) —
    // minion-scale, not bigger/faster.
    window.skillDSpaceships.push({
        x, y, size: 20 + Math.random() * 10,
        tier: 1, hp: SKILLD_SHIP_BASE_HP, maxHp: SKILLD_SHIP_BASE_HP,
        color: SKILLD_SHIP_TIER_COLOR[1],
        speed: (1 + Math.random() * 2) * 0.8 * 2.10,
        target: _skillDFindHighestHpTarget(), shootTimer: 250,
    });
}

// Runs once per frame before the main per-ship loop: any two same-tier
// ships within 50px of each other merge into one higher-tier ship at their
// midpoint. Builds the fused replacements separately and only mutates the
// array once at the end, so a freshly-spawned Tier 2/3 ship this frame
// isn't re-scanned as a fusion candidate in the same pass.
function _updateSkillDShipFusion() {
    const ships = window.skillDSpaceships;
    if (ships.length < 2) return; // nothing to fuse — skip the Set/array allocation below
    const fused = new Set();
    const newShips = [];
    for (let i = 0; i < ships.length; i++) {
        if (fused.has(i)) continue;
        const a = ships[i];
        if (a.tier >= 3) continue;
        for (let j = i + 1; j < ships.length; j++) {
            if (fused.has(j)) continue;
            const b = ships[j];
            if (b.tier !== a.tier) continue;
            if (Math.hypot(a.x - b.x, a.y - b.y) > 50) continue;
            const newTier = a.tier + 1;
            const mult = SKILLD_SHIP_TIER_MULT[newTier];
            const incMult = mult / SKILLD_SHIP_TIER_MULT[a.tier];
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            newShips.push({
                x: mx, y: my, size: ((a.size + b.size) / 2) * incMult,
                tier: newTier, hp: Math.round(SKILLD_SHIP_BASE_HP * mult), maxHp: Math.round(SKILLD_SHIP_BASE_HP * mult),
                color: SKILLD_SHIP_TIER_COLOR[newTier],
                speed: Math.max(a.speed, b.speed),
                target: _skillDFindHighestHpTarget(), shootTimer: 250,
            });
            addExplosion(mx, my, ((a.size + b.size) / 2) * 1.2, SKILLD_SHIP_TIER_COLOR[newTier]);
            fused.add(i); fused.add(j);
            break;
        }
    }
    if (fused.size > 0) {
        window.skillDSpaceships = ships.filter((_, idx) => !fused.has(idx)).concat(newShips);
    }
}

function updateSkillDSpaceships(deltaTime) {
    _updateSkillDShipFusion();
    const dt = deltaTime / 16.67;
    const _gfjDmg = gloryForJusticeActive ? 1.55 : 1;
    const _gfjFireRate = gloryForJusticeActive ? 1.2 : 1;
    for (let i = window.skillDSpaceships.length - 1; i >= 0; i--) {
        const ship = window.skillDSpaceships[i];
        const mult = SKILLD_SHIP_TIER_MULT[ship.tier || 1] * _gfjDmg;

        if (!ship.target || !enemies.includes(ship.target) || ship.target.hp <= 0) {
            // Old target died — re-acquire the current highest-HP enemy
            // instead of just drifting off, so the ship keeps hunting.
            ship.target = _skillDFindHighestHpTarget();
        }

        if (!ship.target) {
            // Nothing left to home on anywhere on screen — drift off.
            ship.y -= ship.speed * dt;
            if (ship.y < -100) { window.skillDSpaceships.splice(i, 1); continue; }
        } else {
            const dx = ship.target.x - ship.x, dy = ship.target.y - ship.y;
            const dist = Math.hypot(dx, dy) || 1;
            ship.x += (dx / dist) * ship.speed * dt;
            ship.y += (dy / dist) * ship.speed * dt;

            ship.shootTimer -= deltaTime;
            if (ship.shootTimer <= 0 && dist > ship.size / 2 + ship.target.size / 2) {
                ship.shootTimer = 250 / _gfjFireRate;
                window.skillDBolts.push({ x1: ship.x, y1: ship.y, x2: ship.target.x, y2: ship.target.y, life: 1.0 });
                dealDamage(ship.target, { damage: Math.round(SKILLD_SHIP_BASE_BOLT_DMG * mult), isTrueDamage: true, _statSrc: 'Skill D: Galactic Spaceships' });
            }

            if (dist < ship.size / 2 + ship.target.size / 2) {
                dealDamage(ship.target, { damage: Math.round(SKILLD_SHIP_BASE_CONTACT_DMG * mult), percentDamage: SKILLD_SHIP_BASE_CONTACT_PCT * mult, isTrueDamage: true, _statSrc: 'Skill D: Galactic Spaceships' });
                applyVulnerability(ship.target);
                addExplosion(ship.x, ship.y, ship.size * 0.8, ship.color || '#00ffff');
                window.skillDSpaceships.splice(i, 1);
                continue;
            }
        }

        if (ship.x < -100 || ship.x > canvas.width + 100) { window.skillDSpaceships.splice(i, 1); continue; }
    }
}

function activateSkillF() {
    const currentTime = performance.now();
    if (typeof player !== "undefined" && player._silenced) return; // Silence
    if (gameState === "playing" && !window._sigilPicker && skillFState === "ready" && currentTime - lastSkillF > skillFCooldown) {
        lastSkillF = currentTime;
        enemies.forEach(e => e.hitBySkillF = false);
        _checkMirrorLaserProc();
        if (_hasBuff('dong_chay_luan_hoi')) {
            // Cycle of Flow: skip the charge phase entirely
            skillFState = "sweeping";
            skillFSweepStart = currentTime;
            if (window.AudioMgr) window.AudioMgr.startSkillFFire();
            if (_hasBuff('song_luoi')) spawnPhotoBrangs(player.x, player.y, 2, true);
        } else {
            skillFState = "charging";
            skillFChargeStart = currentTime;
            if (window.AudioMgr) window.AudioMgr.startSkillFCharge();
        }
    }
}

function updateSkillF(deltaTime) {
    const currentTime = performance.now();
    if (skillFState === "charging" && currentTime - skillFChargeStart >= 1500) {
        skillFState = "sweeping";
        skillFSweepStart = currentTime;
        if (window.AudioMgr) { window.AudioMgr.stopSkillFCharge(); window.AudioMgr.startSkillFFire(); }
        if (_hasBuff('song_luoi')) {
            // Twin Blades: Skill F sweep now throws 2 boomerangs from the player instead of blade arcs
            spawnPhotoBrangs(player.x, player.y, 2, true);
        }
    }
    if (skillFState === "sweeping") {
        let sweepProgress = (currentTime - skillFSweepStart) / skillFSweepDuration;
        if (sweepProgress >= 1) {
            skillFState = "ready";
            if (window.AudioMgr) window.AudioMgr.stopSkillFFire();
            return;
        }
        let currentAngle = -Math.PI + Math.PI * sweepProgress;

        for (let enemy of enemies) {
            if (enemy.hitBySkillF) continue;
            if (enemy.type === 'abyssal_chain') continue; // piercing, immune to skill F
            if (enemy.type === 'veilshroud_echo') continue; // untargetable
            if (enemy.inCoronation) continue;
            let angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < canvas.width && angle < currentAngle && angle > currentAngle - 0.2) {
                if (enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0) {
                    if (Math.random() < 0.10) _tryTriggerMarchosiasCounter(enemy);
                } else if (enemy.type === 'leviathan' && enemy.afoShieldActive && !_hasBuff('tu_huyet')) {
                    enemy.afoHitCount = Math.min(250, (enemy.afoHitCount || 0) + 1);
                } else if (enemy.type === 'goliath') {
                    // Goliath: KHÔNG được set enemy.hp=0 trực tiếp như enemy
                    // thường — bỏ qua hẳn bất khả xâm phạm Alpha, Iron Body
                    // Fracture Step, VÀ tỉ lệ đỡ Warding Palm (Skill F) đã cài
                    // trong dealDamage. Phải đi qua dealDamage để mọi rule đó
                    // thực sự áp dụng.
                    dealDamage(enemy, { damage: 0, percentDamage: 0, _isSkillF: true, _statSrc: 'Skill F: Annihilation Sweep' });
                } else {
                    // Coronation Iron Body absorbs 1 hit — bypassed only with Death Mark (tu_huyet)
                    if (!_hasBuff('tu_huyet') && (enemy.ironBodyHits || 0) > 0) {
                        enemy.ironBodyHits--;
                        createParticles(enemy.x, enemy.y, 6, '#ffd700', 2, 7);
                        enemy.hitBySkillF = true;
                        continue;
                    }
                    enemy.shield = 0;
                    enemy.hp = 0;
                    // Leviathan: skill F bypasses dealDamage → trigger last rites manually
                    if (enemy.type === 'leviathan' && !enemy._deathLaserSpawned) {
                        dealDamage(enemy, { damage: 0, percentDamage: 0, _bypassIronBody: true, _isSkillF: true, _statSrc: 'Skill F: Annihilation Sweep' });
                    }
                }
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
    if (typeof player !== 'undefined' && player._silenced) return;
    if (gameState !== "playing" || window._sigilPicker || skillGActive || skillGCharge < 100) return;

    skillGActive = true;
    skillGCharge = 0;
    skillGEndTime = gameElapsedTime + 30000;
    skillGBorderOpacity = 0.01;
    _checkMirrorLaserProc();

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
    const explosionProps = { damage: 20, percentDamage: 0.09, _statSrc: 'Skill G: Tesla Coil' };
    const explosionRadius = ENERGY_ORB_SIZE * 5;

    energyOrbs.forEach(orb => {
        addExplosion(orb.x, orb.y, explosionRadius, 'cyan');
        enemies.forEach(enemy => {
            let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
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
            let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
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
        spawnTime: gameElapsedTime,
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
        const linkTime = gameElapsedTime;
        const dotMap = new Map();
        newOrb.linkedTo = { orb: closestUnlinkedOrb, id: linkId, linkTime: linkTime, dotTargets: dotMap };
        closestUnlinkedOrb.linkedTo = { orb: newOrb, id: linkId, linkTime: linkTime, dotTargets: dotMap };

        newOrb.lifetime = 5000;
        newOrb.spawnTime = gameElapsedTime;
        closestUnlinkedOrb.lifetime = 5000;
        closestUnlinkedOrb.spawnTime = gameElapsedTime;
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
                        const explosionProps = { damage: 10, percentDamage: 0.06, _statSrc: 'Skill G: Tesla Coil' };
                        const explosionRadius = orb.size * 5;
                        addExplosion(orb.x, orb.y, explosionRadius, 'cyan');
                        enemies.forEach(enemy => {
                            let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
                            if (Math.hypot(enemy.x - orb.x, enemy.y - orb.y) < explosionRadius + enemyRadius) {
                                dealDamage(enemy, explosionProps);
                            }
                        });
                        orbsToDestroy.add(orb);
                    }
                }
            } else {
                // Sigil: Chain Lightning — an energy orb that never paired into a
                // Tesla coil grants a stacking dmg buff, and (if Skill A has room)
                // gets siphoned into an extra Skill A orb instead of exploding.
                if (_hasBuff('set_day_chuyen') && skillGActive) {
                    if (!window._sdcDmgStacks) window._sdcDmgStacks = [];
                    window._sdcDmgStacks = window._sdcDmgStacks.filter(t => t > currentTime);
                    if (window._sdcDmgStacks.length < 6) window._sdcDmgStacks.push(currentTime + 5000);
                }
                if (_hasBuff('set_day_chuyen') && skillAOrbs.length < maxSkillAOrbs) {
                    const _orbSize = _hasBuff('xuyen_pha') ? 8 * 1.30 : 8;
                    skillAOrbs.push({ angle: 0, radius: 0, target: null, x: orb.x, y: orb.y, speed: 0, size: _orbSize, isDefensive: false });
                    createParticles(orb.x, orb.y, 10, '#00e5ff', 2, 5);
                    orbsToDestroy.add(orb);
                } else {
                    const explosionProps = { damage: 10, percentDamage: 0.06, _statSrc: 'Skill G: Tesla Coil' };
                    const explosionRadius = orb.size * 5;
                    addExplosion(orb.x, orb.y, explosionRadius, 'cyan');
                    enemies.forEach(enemy => {
                        let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
                        if (Math.hypot(enemy.x - orb.x, enemy.y - orb.y) < explosionRadius + enemyRadius) {
                            dealDamage(enemy, explosionProps);
                        }
                    });
                    orbsToDestroy.add(orb);
                }
            }
            continue;
        }

        if (orb.linkedTo && !linksProcessed.has(orb.linkedTo.id)) {
            const orb2 = orb.linkedTo.orb;
            if (!energyOrbs.includes(orb2)) {
                if (orb.linkedTo.dotTargets) orb.linkedTo.dotTargets.clear();
                orb.linkedTo = null;
                orb.spawnTime = gameElapsedTime;
                orb.lifetime = 5000;
                continue;
            }

            enemies.forEach(enemy => {
                if (enemy.type === 'abyssal_chain') return;
                if (enemy.type === 'veilshroud_echo') return; // untargetable
                if (enemy.inCoronation) return;               // untargetable during coronation
                let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
                const dist = distToSegment(enemy, orb, orb2);
                const linkThickness = ENERGY_ORB_SIZE / 2;
                if (dist < enemyRadius + linkThickness) {

                    if (!enemy.type.startsWith('enemy_bullet') && !(enemy.type === 'leviathan' && enemy.afoShieldActive)) {
                        enemy.y -= (enemy.speed * dt * 0.08);
                    }

                    if (enemy.type === 'dargruel' || enemy.type === 'thaelis') {
                        enemy.shootTimer += deltaTime * 0.30;
                    }

                    const dotMap = orb.linkedTo.dotTargets;
                    if (!dotMap.has(enemy)) {
                        dotMap.set(enemy, currentTime);
                    }
                    if (currentTime - dotMap.get(enemy) >= 125) {
                        const _teslaDmgMult = _hasBuff('ky_su_dien') ? 1.50 : 1;
                        dealDamage(enemy, { damage: 58 * _teslaDmgMult, percentDamage: 0.015 * _teslaDmgMult, isTeslaDot: true });
                        dotMap.set(enemy, currentTime);
                        if (_hasBuff('set_day_chuyen') && Math.random() < 0.50) {
                            let _closest = null, _closestDist = Infinity;
                            for (const _oe of enemies) {
                                if (_oe === enemy || _oe.type.startsWith('enemy_bullet') || _oe.inCoronation) continue;
                                const _d = Math.hypot(_oe.x - enemy.x, _oe.y - enemy.y);
                                if (_d < 150 && _d < _closestDist) { _closest = _oe; _closestDist = _d; }
                            }
                            if (_closest) {
                                dealDamage(_closest, { damage: 58 * _teslaDmgMult, percentDamage: 0.015 * _teslaDmgMult, isTeslaDot: true, isChainLightning: true });
                                chainLightningEffects.push({ x1: enemy.x, y1: enemy.y, x2: _closest.x, y2: _closest.y, lifetime: 200, maxLifetime: 200 });
                            }
                        }
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
    if (window.AudioMgr) window.AudioMgr.playSfxAt('tesla-coil-form', midX, midY);

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
            if (enemy.type === 'veilshroud_echo') return; // untargetable
            if (enemy.inCoronation) return;               // untargetable during coronation
            let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - coil.x, enemy.y - coil.y) < coil.auraRadius + enemyRadius) {
                if (!enemy.type.startsWith('enemy_bullet')) {
                    enemy.y -= (enemy.speed * dt * 0.08);
                }
            }
        });

        if (coil.hp <= 0) {
            const _coilDmgMult = _hasBuff('ky_su_dien') ? 1.50 : 1;
            const explosionProps = { damage: 20 * _coilDmgMult, percentDamage: 0.15 * _coilDmgMult, _statSrc: 'Skill G: Tesla Coil' };
            addExplosion(coil.x, coil.y, coil.auraRadius, 'electric_blue');
            enemies.forEach(enemy => {
                let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
                if (Math.hypot(enemy.x - coil.x, enemy.y - coil.y) < coil.auraRadius + enemyRadius) {
                    dealDamage(enemy, explosionProps);
                }
            });
            if (_hasBuff('ky_su_dien')) {
                skillGCharge = Math.min(100, skillGCharge + 10);
            }
            coil.dotTargets.clear();
            teslaCoils.splice(i, 1);
        }
    }
}

// MỚI: Hàm xử lý dịch chuyển khi dùng Shift
function executeShiftTeleport(direction) {
    if (!skillShiftActive) return;
    let chargeDuration = performance.now() - skillShiftChargeStart;
    let chargeRatio = Math.min(chargeDuration / skillShiftMaxCharge, 1);
    let maxDist = canvas.width / 2; // Tối đa đi được nửa màn hình
    let dist = chargeRatio * maxDist;

    if (direction === 'left') {
        player.x -= dist;
    } else if (direction === 'right') {
        player.x += dist;
    }

    // Giới hạn không cho người chơi bay khỏi màn hình
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));

    // Hiệu ứng dịch chuyển
    addExplosion(player.x, player.y, 60, 'purple');
    createParticles(player.x, player.y, 30, 'magenta', 3, 10);
    _setShake(10, 200);
    if (window.AudioMgr) window.AudioMgr.playSfx('shift-teleport');

    // Teleport used → 9s cooldown
    window._shiftTeleportUsed = true;
    cancelSkillShift();
}

function cancelSkillShift() {
    if (skillShiftActive) {
        const holdDuration = (performance.now() - skillShiftChargeStart) / 1000; // seconds
        skillShiftActive = false;
        window._shiftActive = false;
        if (window.AudioMgr) window.AudioMgr.exitTimeDomain();

        // If teleport (←/→) was used during domain → 9s CD (same as held ≥7s)
        const teleportUsed = !!window._shiftTeleportUsed;
        window._shiftTeleportUsed = false; // reset flag

        let effectiveCD;
        if (teleportUsed || holdDuration >= 7) {
            effectiveCD = 9000;                        // held ≥7s hoặc teleport → 9s (was 11s)
        } else if (holdDuration < 2) {
            effectiveCD = skillShiftCooldown * 0.10;   // −90% → 1.1s
        } else if (holdDuration < 5) {
            effectiveCD = skillShiftCooldown * 0.40;   // −60% → 4.4s
        } else {
            effectiveCD = skillShiftCooldown * 0.90;   // −10% → 9.9s
        }
        lastSkillShift = performance.now() - (skillShiftCooldown - effectiveCD);

        // Xóa tất cả enemy bullet trong vùng phạm vi Shift (bán kính = nửa màn hình)
        const shiftRadius = Math.min(canvas.width, canvas.height) * 0.45;
        enemies = enemies.filter(e => {
            if (!e.type.startsWith('enemy_bullet')) return true;
            return Math.hypot(e.x - player.x, e.y - player.y) > shiftRadius;
        });
    }
}
// Marchosias Blade, global array, không bị ngắt bởi bất kỳ nguồn nào
function updateMarchosiasBlades(deltaTime) {
    const dt = deltaTime / 16.67;
    for (let i = marchosiasBlades.length - 1; i >= 0; i--) {
        const blade = marchosiasBlades[i];

        // Nếu đang trong warning phase, đếm ngược delay
        if (!blade.active) {
            blade.delay -= deltaTime;
            if (blade.delay <= 0) {
                blade.active = true; // kích hoạt, bắt đầu bay
            }
            continue; // chưa active → không di chuyển, không hit
        }

        // Active, di chuyển bình thường
        blade.x += blade.vx * dt;
        blade.y += blade.vy * dt;

        // Hit player
        if (!blade.hitPlayer && Math.hypot(blade.x - player.x, blade.y - player.y) < blade.radius + player.hitRadius) {
            blade.hitPlayer = true;
            const _yHitsAlready = blade.hitEnemies.length;
            const _yPct = _yHitsAlready === 0 ? 0.27 : _yHitsAlready === 1 ? 0.23 : 0.21;
            if (typeof _yuushaPierceRedirect !== 'function' || !_yuushaPierceRedirect(_yPct, true)) playerTakesHit({ type: 'marchosias' });
            if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', blade.x, blade.y);
        }
        // Hit sentinel, damage scales down with number of sentinels already hit
        for (const s of sentinels) {
            if (!blade.hitEnemies.includes(s) && Math.hypot(blade.x - s.x, blade.y - s.y) < blade.radius + s.size) {
                // 1st sentinel hit: 30%, 2nd: 28%, 3rd+: 24%
                const hitsAlready = blade.hitEnemies.length;
                const pct = hitsAlready === 0 ? 0.27 : hitsAlready === 1 ? 0.23 : 0.21;
                dealDamage(s, { damage: (s.maxHp + (s.shield || 0)) * pct, _noHitSfx: true, _attackerType: 'marchosias' });
                blade.hitEnemies.push(s);
                addExplosion(s.x, s.y, 20, '#ff6600');
                if (window.AudioMgr) window.AudioMgr.playSfxAt('metal-hit', s.x, s.y);
            }
        }

        // Xóa khi ra ngoài màn hình (chỉ check khi đang bay)
        if (blade.active && (blade.x < -blade.radius || blade.x > canvas.width + blade.radius ||
            blade.y < -blade.radius || blade.y > canvas.height + blade.radius)) {
            marchosiasBlades.splice(i, 1);
        }
    }
}
// Soul Reaver DoT (Cắn nuốt linh hồn)
// Kẻ địch có soulReaver bị trừ 10 base + 5% MaxHP mỗi 0.5 giây (bỏ qua khiên)
function updateSoulReaverDoT(deltaTime) {
    const now = performance.now();
    for (const enemy of enemies) {
        if (!enemy.soulReaver) continue;
        // expiry runs regardless of GfJ so the debuff (and its heal/shield
        // reduction elsewhere) doesn't outlive its 2s duration on its own
        if (enemy.soulReaverEnd && now > enemy.soulReaverEnd) {
            enemy.soulReaver = false;
            continue;
        }
        if (!gloryForJusticeActive) continue; // DoT tick itself only runs with GfJ on
        if (enemy.type === 'embryo') continue; // CC-immune, bypass all status DoTs
        if (!enemy.soulReaverDotTimer) enemy.soulReaverDotTimer = 0;
        enemy.soulReaverDotTimer -= deltaTime;
        if (enemy.soulReaverDotTimer <= 0) {
            enemy.soulReaverDotTimer = 350; // 0.35 giây
            // Sát thương chuẩn bỏ qua khiên, áp thẳng vào HP
            const dotDmg = Math.ceil(60 + (enemy.maxHp || enemy.hp) * 0.055);
            enemy.hp -= dotDmg;
            enemy.hp = Math.max(0, enemy.hp);
            if (enemy.hp <= 0) enemy._markedForDeath = true;
            // Particle nhỏ màu cam để thể hiện DoT
            createParticles(
                enemy.x + (Math.random() - 0.5) * (enemy.size || 20),
                enemy.y + (Math.random() - 0.5) * (enemy.size || 20),
                3, '#FF4500', 1, 3
            );
        }
    }
}

// Blood Arrow (Libra buff 1): Sol Arrow queue/windup/flight

function _estimateSolArrowDR(enemy) {
    let dr = 0;
    if (enemy.type === 'egregor') {
        dr += 0.40;
        if (enemy._nullSlashPhase === 'charging') dr += 0.40;
        dr += Math.min(0.20, (enemy._tentaclesLost || 0) * 0.05);
    }
    if (enemy.demonGiftEndTime && performance.now() < enemy.demonGiftEndTime) {
        dr += (enemy.demonGiftStacks === 2) ? 0.40 : 0.20;
    }
    if (enemy.type === 'dargruel') {
        dr += Math.min(0.60, 0.50 + sentinels.length * 0.025);
        if (enemy.hp < enemy.maxHp * 0.6) {
            const hpPercent = (enemy.hp / enemy.maxHp) * 100;
            dr += Math.min(0.72, ((60 - hpPercent) * 1.5 / 100));
        }
    }
    if (enemy.type === 'thaelis') {
        const hpLostPct = (1 - enemy.hp / enemy.maxHp) * 100;
        dr += Math.min(0.95, hpLostPct * 0.025);
    }
    if (enemy.type === 'aegis_core') dr += 0.55;
    if (enemy.shield > 0 && enemy.aegisShieldReceived) dr += 0.18;
    if (enemy.type === 'marchosias') dr += 0.45;
    if (enemy.type === 'marchosias_minion' && enemy.DR) dr += enemy.DR;
    if (enemy.type === 'leviathan') dr += 0.60;
    if (enemy.type === 'embryo') dr += 0.90;
    if (enemy.type === 'veilshroud') {
        if (enemy._veilHealDRExpiry && performance.now() < enemy._veilHealDRExpiry) dr += 0.20;
        dr += enemy.inPhantom ? 0.99 : 0.40;
    }
    if (enemy.levEnvy) dr += 0.25;
    if (sentinels.includes(enemy)) {
        dr += 0.08;
        if (gloryForJusticeActive) dr += 0.30;
        if (sentinels.length >= 5 && sentinels.length < 12) dr += 0.10;
        if (enemy.sentinelParryBuff && performance.now() < enemy.sentinelParryBuffEnd) dr += 0.10;
    }
    return Math.min(0.99, dr);
}

function _solArrowValidTargets() {
    return enemies.filter(e =>
        !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation && e.hp > 0 && !e._markedForDeath
    );
}

function _pickSolArrowPrimaryTarget() {
    const validTargets = _solArrowValidTargets();
    if (validTargets.length === 0) return null;
    return validTargets.reduce((a, b) =>
        (a.hp + (a.shield || 0)) >= (b.hp + (b.shield || 0)) ? a : b
    );
}

// Random pick biased toward enemies sitting in denser clusters, excluding the
// primary's target (falls back to including it if nothing else is on screen).
function _pickSolArrowSecondaryTarget(exclude) {
    const validTargets = _solArrowValidTargets();
    if (validTargets.length === 0) return null;
    const pool = exclude ? validTargets.filter(e => e !== exclude) : validTargets;
    const candidates = pool.length > 0 ? pool : validTargets;
    const weights = candidates.map(e => {
        let nearby = 0;
        for (const other of candidates) {
            if (other !== e && Math.hypot(other.x - e.x, other.y - e.y) < 220) nearby++;
        }
        return 1 + nearby;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
        r -= weights[i];
        if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

// Direction-launch helper for the Spirit finale's Spinner: unlike
// _pickSolArrowSecondaryTarget's weighted-random pick, this deterministically
// returns whichever enemy sits in the single densest local cluster, reusing
// the same 220px neighbor-counting formula.
function _pickDensestEnemy() {
    const validTargets = _solArrowValidTargets();
    if (validTargets.length === 0) return null;
    let best = validTargets[0], bestCount = -1;
    for (const e of validTargets) {
        let nearby = 0;
        for (const other of validTargets) {
            if (other !== e && Math.hypot(other.x - e.x, other.y - e.y) < 220) nearby++;
        }
        if (nearby > bestCount) { bestCount = nearby; best = e; }
    }
    return best;
}

function _queueSolArrowOne(isPrimary, marked) {
    if (!window._solArrows) window._solArrows = [];
    if (!marked) {
        // No enemy on screen yet — bank the shot, it fires the instant one appears
        window._solArrows.push({ state: 'pending', isPrimary });
        return;
    }
    window._solArrows.push({
        state: 'windup', windupStart: performance.now(), windupDuration: 500,
        target: marked, x: player.x, y: player.y, vx: 0, vy: 0,
        hitEnemies: new Set(), isPrimary,
    });
    if (window.AudioMgr) window.AudioMgr.playSfx('skill-a-orb-lock');
}

// Every Skill A cast fires 3 arrows: 1 big one marking the highest-EP enemy,
// and 2 smaller ones marking random enemies (biased toward denser clusters).
function _queueSolArrow() {
    const primary = _pickSolArrowPrimaryTarget();
    _queueSolArrowOne(true, primary);
    for (let i = 0; i < 2; i++) {
        _queueSolArrowOne(false, primary ? _pickSolArrowSecondaryTarget(primary) : null);
    }
}

function updateSolArrows(deltaTime) {
    if (!window._solArrows || window._solArrows.length === 0) return;
    const dt = deltaTime / 16.67;
    const now = performance.now();
    for (let i = window._solArrows.length - 1; i >= 0; i--) {
        const arrow = window._solArrows[i];
        if (arrow.state === 'pending') {
            const marked = arrow.isPrimary
                ? _pickSolArrowPrimaryTarget()
                : _pickSolArrowSecondaryTarget(_pickSolArrowPrimaryTarget());
            if (marked) {
                arrow.state = 'windup';
                arrow.windupStart = now;
                arrow.windupDuration = 500;
                arrow.target = marked;
                arrow.x = player.x; arrow.y = player.y; arrow.vx = 0; arrow.vy = 0;
                arrow.hitEnemies = new Set();
                if (window.AudioMgr) window.AudioMgr.playSfx('skill-a-orb-lock');
            }
            continue;
        }
        if (arrow.state === 'windup') {
            arrow.x = player.x;
            arrow.y = player.y;
            if (now - arrow.windupStart >= arrow.windupDuration) {
                if (!enemies.includes(arrow.target) || arrow.target.hp <= 0) {
                    window._solArrows.splice(i, 1);
                    continue;
                }
                const dx = arrow.target.x - player.x, dy = arrow.target.y - player.y;
                const d = Math.hypot(dx, dy) || 1;
                const speed = 31.68 * (arrow.isPrimary ? 1 : 1.20);
                arrow.vx = (dx / d) * speed;
                arrow.vy = (dy / d) * speed;
                arrow.state = 'flying';
                if (window.AudioMgr) window.AudioMgr.playSfxAt('charged-shot', player.x, player.y);
            }
            continue;
        }
        if (arrow.state === 'flying') {
            arrow.x += arrow.vx * dt;
            arrow.y += arrow.vy * dt;
            const dmgMult = arrow.isPrimary ? 1 : 0.60;
            const hitRadius = arrow.isPrimary ? 9.2 : 8;
            for (const enemy of enemies) {
                if (enemy.type.startsWith('enemy_bullet') || enemy.type === 'abyssal_chain' || enemy.type === 'veilshroud_echo' || enemy.inCoronation || enemy.hp <= 0) continue;
                if (arrow.hitEnemies.has(enemy)) continue;
                if (Math.hypot(enemy.x - arrow.x, enemy.y - arrow.y) < enemy.size / 2 + hitRadius) {
                    arrow.hitEnemies.add(enemy);
                    if (enemy === arrow.target) {
                        const estDR = _estimateSolArrowDR(enemy);
                        const drBonus = Math.min(1.0, Math.floor(estDR * 100) * 0.02);
                        const _baMult = (1 + drBonus) * dmgMult;
                        // was primevalEnergy*0.20 (the Photokrystos 0-100 meter, a different
                        // "PE") - description always meant 20% of the TARGET's own effective
                        // HP like every other sigil's "%EP", fixed to actually do that
                        dealDamage(enemy, { damage: 400 * _baMult, percentDamage: 0.20 * _baMult, isTrueDamage: true, _statSrc: 'Sigil: Blood Arrow' });
                        applyVulnerability(enemy); applyVulnerability(enemy);
                        addExplosion(arrow.x, arrow.y, 60, '#f59e0b');
                        if (window.AudioMgr) window.AudioMgr.playSfxAt('dimensional-rift', arrow.x, arrow.y);
                        window._solArrows.splice(i, 1);
                        break;
                    } else {
                        dealDamage(enemy, { damage: 300 * dmgMult, _statSrc: 'Sigil: Blood Arrow' });
                        applyVulnerability(enemy); applyVulnerability(enemy);
                        createParticles(arrow.x, arrow.y, 8, '#f59e0b', 2, 5);
                    }
                }
            }
            if (arrow.state === 'flying' && (arrow.x < -50 || arrow.x > canvas.width + 50 || arrow.y < -50 || arrow.y > canvas.height + 50)) {
                window._solArrows.splice(i, 1);
            }
        }
    }
}

// Fires a single volley (1 large orb centered, 2 small orbs flanking) from the
// ghost's last spawn position toward a fresh random target.
function _fireShadowTwinVolley() {
    const validTargets = enemies.filter(e =>
        !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation && e.hp > 0 && !e._markedForDeath
    );
    if (validTargets.length === 0) return;

    const spawnX = window._shadowTwinSpawnX, spawnY = window._shadowTwinSpawnY;
    const tgt = validTargets[Math.floor(Math.random() * validTargets.length)];
    const orbSpeed = 20;
    const sideOff = 17.5; // lateral gap between the flanking small orbs and the center large orb
    const dx = tgt.x - spawnX, dy = tgt.y - spawnY;
    const d = Math.hypot(dx, dy) || 1;
    const vx = (dx / d) * orbSpeed, vy = (dy / d) * orbSpeed;
    const angle = Math.atan2(vy, vx);
    const px = -Math.sin(angle) * sideOff, py = Math.cos(angle) * sideOff;

    if (!window._shadowOrbs) window._shadowOrbs = [];
    window._shadowOrbs.push({ x: spawnX, y: spawnY, vx, vy, isLarge: true, hitEnemies: new Set() });
    window._shadowOrbs.push({ x: spawnX + px, y: spawnY + py, vx, vy, isLarge: false, hitEnemies: new Set() });
    window._shadowOrbs.push({ x: spawnX - px, y: spawnY - py, vx, vy, isLarge: false, hitEnemies: new Set() });
}

// Shadow Twin (Gemini buff 1): phantom ship fires 3 volleys, 200ms apart
function updateShadowTwin(deltaTime) {
    if (!_hasBuff('bong_doi')) return;
    const now = performance.now();
    if (window._shadowTwinGhosts) {
        window._shadowTwinGhosts = window._shadowTwinGhosts.filter(g => now - g.spawnTime < g.life);
    }

    if (window._shadowTwinVolleysPending > 0 && now >= (window._shadowTwinNextVolleyAt || 0)) {
        _fireShadowTwinVolley();
        window._shadowTwinVolleysPending--;
        window._shadowTwinNextVolleyAt = now + 200;
    }

    if (!window._bongDoiCharging) return;
    if (now - window._bongDoiChargeStart < 500) return; // 0.5s charge after the 6th auto-bullet hit
    window._bongDoiCharging = false;
    window._bongDoiCooldownEnd = now + 500; // 0.5s delay before it can trigger again

    const validTargets = enemies.filter(e =>
        !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation && e.hp > 0 && !e._markedForDeath
    );
    if (validTargets.length === 0) return;

    const side = Math.random() < 0.5 ? 'left' : 'right';
    const edgeInset = 50; // keeps the ghost ship's hull fully on-screen instead of clipped at x=0/canvas.width
    const spawnX = side === 'left' ? edgeInset : canvas.width - edgeInset;
    const spawnY = canvas.height / 2;

    if (!window._shadowTwinGhosts) window._shadowTwinGhosts = [];
    window._shadowTwinGhosts.push({ x: spawnX, y: spawnY, side, spawnTime: now, life: 700 });
    window._shadowTwinSpawnX = spawnX;
    window._shadowTwinSpawnY = spawnY;

    _fireShadowTwinVolley(); // volley 1 fires immediately
    window._shadowTwinVolleysPending = 2; // volleys 2 and 3 follow, 200ms apart
    window._shadowTwinNextVolleyAt = now + 200;
    if (window.AudioMgr) window.AudioMgr.playSfxAt('dimensional-rift', spawnX, spawnY);
}

function updateShadowOrbs(deltaTime) {
    if (!window._shadowOrbs || window._shadowOrbs.length === 0) return;
    const dt = deltaTime / 16.67;
    for (let i = window._shadowOrbs.length - 1; i >= 0; i--) {
        const orb = window._shadowOrbs[i];
        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;
        for (const enemy of enemies) {
            if (enemy.type.startsWith('enemy_bullet') || enemy.type === 'abyssal_chain' || enemy.type === 'veilshroud_echo' || enemy.inCoronation || enemy.hp <= 0) continue;
            if (orb.hitEnemies.has(enemy)) continue;
            if (Math.hypot(enemy.x - orb.x, enemy.y - orb.y) < enemy.size / 2 + (orb.isLarge ? 15 : 10)) {
                orb.hitEnemies.add(enemy);
                if (orb.isLarge) {
                    dealDamage(enemy, { damage: 180, percentDamage: 0.08, applySoulReaver: true, _noHitSfx: true, _statSrc: 'Shadow Twin' });
                } else {
                    dealDamage(enemy, { damage: 75, percentDamage: 0.03, applySoulReaver: true, _noHitSfx: true, _statSrc: 'Shadow Twin' });
                }
                applyVulnerability(enemy); applyVulnerability(enemy);
                createParticles(orb.x, orb.y, orb.isLarge ? 10 : 6, '#4fc3ff', 2, 6);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('skill-a-orb-hit', orb.x, orb.y);
            }
        }
        if (orb.x < -60 || orb.x > canvas.width + 60 || orb.y < -60 || orb.y > canvas.height + 60) {
            window._shadowOrbs.splice(i, 1);
        }
    }
}

// Aries: Gate of Babylon + Enuma Elish. Trigger sites are in entities.js's
// dealDamage (proc conditions + sequence creation); everything below is the
// per-frame timeline/collision, mirroring a Gilgamesh Gate-of-Babylon VFX
// spec ported for this project. Both fire from the player's position at the
// moment they trigger (snapshotted, not re-tracked as the player moves).

function _createGobSequence(startTime) {
    const fanAngle = Math.PI * 0.42, baseAngle = -Math.PI / 2;
    const startA = baseAngle - fanAngle / 2;
    const portals = [];
    for (let i = 0; i < 7; i++) {
        const pAngle = startA + i * (fanAngle / 6);
        const dist = 60 + Math.abs(i - 3) * 15;
        portals.push({
            x: player.x + Math.cos(pAngle) * dist,
            y: player.y + 20 + Math.sin(pAngle) * (dist * 0.6),
            angle: pAngle, weaponType: Math.floor(Math.random() * 3),
            scale: 0, alpha: 0, weaponOffset: 0,
        });
    }
    return { startTime, phase: 0, baseAngle, fanAngle, portals, swords: [] };
}

const GOB_SWORD_COUNT = 14, GOB_SWORD_SPEED = 20, GOB_SWORD_DMG_BASE = 50, GOB_SWORD_DMG_PCT = 0.04;

function updateGateOfBabylon(deltaTime) {
    if (!window._gobSequences || window._gobSequences.length === 0) return;
    const dt = deltaTime / 16.67;
    const now = performance.now();
    for (let si = window._gobSequences.length - 1; si >= 0; si--) {
        const seq = window._gobSequences[si];
        const elapsed = now - seq.startTime;

        if (elapsed < 100) {
            const p = elapsed / 100;
            seq.portals.forEach(pt => { pt.scale = p * 1.2; pt.alpha = p; });
        } else if (elapsed < 250) {
            seq.portals.forEach(pt => { pt.scale = 1.0; pt.alpha = 1.0; pt.weaponOffset = ((elapsed - 100) / 150) * 20; });
        } else if (seq.phase === 0) {
            seq.phase = 1;
            _setShake(3, 150);
            const startA = seq.baseAngle - seq.fanAngle / 2;
            const stepA = seq.fanAngle / (GOB_SWORD_COUNT - 1);
            for (let i = 0; i < GOB_SWORD_COUNT; i++) {
                const angle = startA + i * stepA;
                const pt = seq.portals[Math.min(seq.portals.length - 1, Math.floor(i / 2))];
                seq.swords.push({
                    x: pt.x, y: pt.y, angle,
                    vx: Math.cos(angle) * GOB_SWORD_SPEED, vy: Math.sin(angle) * GOB_SWORD_SPEED,
                    type: Math.floor(Math.random() * 3), alpha: 1.0, hitEnemies: new Set(),
                });
            }
        }

        if (elapsed >= 250) {
            seq.portals.forEach(pt => { pt.alpha = Math.max(0, pt.alpha - 0.05 * dt); pt.scale = Math.max(0, pt.scale - 0.05 * dt); });

            let activeSwords = 0;
            seq.swords.forEach(sw => {
                if (sw.alpha <= 0) return;
                activeSwords++;
                sw.x += sw.vx * dt;
                sw.y += sw.vy * dt;
                for (const en of enemies) {
                    if (sw.hitEnemies.has(en)) continue;
                    if (!_skillDCanTarget(en) || en.hp <= 0 || en._markedForDeath) continue;
                    const dx = sw.x - en.x, dy = sw.y - en.y, r = (en.size || 20) / 2;
                    if (dx * dx + dy * dy < r * r) {
                        sw.hitEnemies.add(en);
                        dealDamage(en, { damage: GOB_SWORD_DMG_BASE, percentDamage: GOB_SWORD_DMG_PCT, isTrueDamage: true, _isGobBlade: true, _noHitSfx: true, _statSrc: 'Aries: Gate of Babylon' });
                        if (window.AudioMgr) window.AudioMgr.playSfxAt('skill-a-orb-hit', sw.x, sw.y);
                        particles.push({ isGobImpact: true, x: en.x, y: en.y, angle: sw.angle, lifetime: 200, maxLifetime: 200 });
                        createParticles(sw.x, sw.y, 8, '#fef08a', 2, 6);
                    }
                }
                if (sw.x < -50 || sw.x > canvas.width + 50 || sw.y < -50 || sw.y > canvas.height + 50) {
                    sw.alpha -= 0.1 * dt;
                }
            });

            if (activeSwords === 0 && (!seq.portals[0] || seq.portals[0].alpha <= 0)) {
                window._gobSequences.splice(si, 1);
            }
        }
    }
}

function _eeFindPriorityTarget() {
    const valid = enemies.filter(e => _skillDCanTarget(e) && e.hp > 0 && !e._markedForDeath);
    if (valid.length === 0) return null;
    const priority = valid.filter(e => e.type === 'dargruel' || e.type === 'leviathan' || e.type === 'goliath');
    const pool = priority.length > 0 ? priority : valid;
    pool.sort((a, b) => b.hp - a.hp);
    return pool[0];
}

function _createEeSequence(startTime, target) {
    const ox = player.x, oy = player.y;
    return { startTime, phase: 0, x: ox, y: oy, angle: Math.atan2(target.y - oy, target.x - ox), beamWidth: 0, beamAlpha: 0, hitEnemies: new Set(), shockwaves: [], _lastShockwaveAt: 0 };
}

const EE_DMG_PCT = 0.15, EE_DMG_CAP = 16000, EE_BEAM_HALF = 50;

function updateEnumaElish(deltaTime) {
    if (!window._eeSequences || window._eeSequences.length === 0) return;
    const dt = deltaTime / 16.67;
    const now = performance.now();
    for (let si = window._eeSequences.length - 1; si >= 0; si--) {
        const seq = window._eeSequences[si];
        const elapsed = now - seq.startTime;

        // Windup sparks around the phantom while it winds the spear back
        if (elapsed >= 200 && elapsed < 600 && Math.random() > 0.5) {
            createParticles(seq.x + (Math.random() - 0.5) * 120, seq.y - Math.random() * 150, 2, '#dc2626', 2, 5);
        }

        if (elapsed >= 600 && seq.phase === 0) {
            seq.phase = 1;
            _setShake(12, 300);
            window._eeScreenFlash = 0.8;
            // release crack + the beam roar (reuses Leviathan Perseverance's
            // laser cue rather than a new asset - same "sustained beam" sound)
            if (window.AudioMgr) {
                window.AudioMgr.playSfxAt('enuma-elish-release', seq.x, seq.y);
                window.AudioMgr.playSfxAt('leviathan-perseverance', seq.x, seq.y);
            }
        }

        if (elapsed >= 600 && elapsed < 1200) {
            seq.beamAlpha = 1.0;
            seq.beamWidth = EE_BEAM_HALF * 2;
            const reach = Math.hypot(canvas.width, canvas.height) * 1.5;
            const endX = seq.x + Math.cos(seq.angle) * reach, endY = seq.y + Math.sin(seq.angle) * reach;
            for (const en of enemies) {
                if (!_skillDCanTarget(en) || en.hp <= 0 || en._markedForDeath) continue;
                if (distToSegment(en, { x: seq.x, y: seq.y }, { x: endX, y: endY }) >= EE_BEAM_HALF + (en.size || 20) / 2) continue;
                // ambient sparks off anything currently caught in the beam
                if (Math.random() > 0.7) createParticles(en.x, en.y, 5, '#fca5a5', 2, 5);
                if (seq.hitEnemies.has(en)) continue;
                seq.hitEnemies.add(en);
                const dmg = Math.min(EE_DMG_CAP, Math.ceil(en.maxHp * EE_DMG_PCT));
                dealDamage(en, { damage: dmg, isTrueDamage: true, _isEeSpear: true, _noHitSfx: true, _statSrc: 'Aries: Enuma Elish' });
                particles.push({ isEeSlash: true, x: en.x, y: en.y, angle: seq.angle + (Math.random() - 0.5) * 0.5, lifetime: 400, maxLifetime: 400 });
            }
            // Ring-shaped shockwaves drifting outward along the beam - the
            // "smoke rings" from the reference demo, spawned every ~50ms at a
            // random distance down the beam's length
            if (now - seq._lastShockwaveAt >= 50) {
                seq._lastShockwaveAt = now;
                seq.shockwaves.push({ dist: 100 + Math.random() * (reach - 100), scale: 0.1, alpha: 1.0 });
            }
        } else if (elapsed >= 1200) {
            seq.beamAlpha = Math.max(0, seq.beamAlpha - 0.05 * dt);
            seq.beamWidth = Math.max(0, seq.beamWidth - 4 * dt);
            if (seq.beamAlpha <= 0 && seq.shockwaves.length === 0) window._eeSequences.splice(si, 1);
        }

        if (seq.phase > 0) {
            seq.shockwaves.forEach(sw => { sw.scale += 0.2 * dt; sw.alpha -= 0.05 * dt; });
            seq.shockwaves = seq.shockwaves.filter(sw => sw.alpha > 0);
        }
    }
}

// Forest Guardian (Virgo buff 1) — bonus attack: while 5+ enemies are on screen,
// every 4s a vine-wrapped log sweeps across the screen.
function _validGoldenArrowTargets() {
    return enemies.filter(e =>
        !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation && e.hp > 0 && !e._markedForDeath
    );
}

function updateGoldenArrowSweep(deltaTime) {
    if (!_hasBuff('mui_ten_vang')) return;
    const now = performance.now();

    if (window._goldenArrowSweep) {
        const sw = window._goldenArrowSweep;
        const progress = (now - sw.startTime) / sw.duration;
        if (progress >= 1) {
            window._goldenArrowSweep = null;
            return;
        }
        const currentAngle = -Math.PI + Math.PI * progress;
        const range = canvas.width * 0.6;
        for (const enemy of _validGoldenArrowTargets()) {
            if (sw.hitEnemies.has(enemy)) continue;
            const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (dist < range && angle < currentAngle && angle > currentAngle - 0.2) {
                sw.hitEnemies.add(enemy);
                const missingHpBonus = Math.ceil((enemy.maxHp - enemy.hp) * 0.15);
                dealDamage(enemy, { damage: 1000 + missingHpBonus, percentDamage: 0.10, _statSrc: 'Virgo: Forest Guardian' });
                createParticles(enemy.x, enemy.y, 14, '#c9a227', 3, 8);
                createParticles(enemy.x, enemy.y, 8, '#5fae3a', 2, 6);
            }
        }
        return;
    }

    if (now < (window._goldenArrowNextSweepAt || 0)) return;
    // Manual count instead of _validGoldenArrowTargets().length — this idle
    // check runs every frame once off cooldown, no need to allocate a
    // filtered copy of `enemies` just to compare its length against 5.
    let _validCount = 0;
    for (const e of enemies) {
        if (!e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation && e.hp > 0 && !e._markedForDeath) {
            if (++_validCount >= 5) break;
        }
    }
    if (_validCount < 5) return;

    window._goldenArrowNextSweepAt = now + 4000;
    window._goldenArrowSweep = { startTime: now, duration: 1000, hitEnemies: new Set() };
    if (window.AudioMgr) window.AudioMgr.playSfxAt('egregor-nullslash-slash', player.x, player.y);
}

// Mirror Laser (Gemini buff 2) — bonus proc: every skill cast / auto-fire shot
// has a chance to fire a piercing, non-homing laser column. Chance starts at
// 5%, gains +0.3% pity per miss, resets to 5% on a successful trigger. 4s CD
// after the laser ends before it can roll again.
function _checkMirrorLaserProc() {
    if (!_hasBuff('guong_laze')) return;
    const now = performance.now();
    if (now < (window._mlProcCooldownEnd || 0)) return;
    if (Math.random() < (window._mlProcChance || 0.05)) {
        window._mlProcChance = 0.05;
        window._mlProcCooldownEnd = now + 3000 + 4000;
        if (!window._mirrorLaserColumns) window._mirrorLaserColumns = [];
        window._mirrorLaserColumns.push({ startTime: now, duration: 3000, lastTick: 0 });
        if (window.AudioMgr) window.AudioMgr.playSfxAt('skill-a-activate', player.x, player.y);
    } else {
        window._mlProcChance = Math.min(1, (window._mlProcChance || 0.05) + 0.003);
    }
}

function updateMirrorLaserColumns(deltaTime) {
    if (!window._mirrorLaserColumns || window._mirrorLaserColumns.length === 0) return;
    const now = performance.now();
    for (let i = window._mirrorLaserColumns.length - 1; i >= 0; i--) {
        const col = window._mirrorLaserColumns[i];
        if (now - col.startTime >= col.duration) { window._mirrorLaserColumns.splice(i, 1); continue; }
        if (now - col.lastTick >= 125) {
            col.lastTick = now;
            const laserX = player.x;
            enemies.forEach(enemy => {
                if (enemy.type === 'abyssal_chain') return;
                if (enemy.type === 'veilshroud_echo') return;
                if (enemy.inCoronation) return;
                if (enemy.y < player.y && Math.abs(enemy.x - laserX) < 100 / 2) {
                    if (enemy.type === 'marchosias' && enemy.arcBarrier && enemy.arcBarrier.hp > 0) {
                        const _src = { damage: 350, percentDamage: 0.18, isPiercing: true, _barrierPiercing: true, _statSrc: 'Sigil: Mirror Laser' };
                        checkMarchosiasArcBarrier(enemy, _src, enemy.x, enemy.y);
                        dealDamage(enemy, _src);
                    } else if (enemy.type === 'leviathan' && enemy.afoShieldActive) {
                        enemy.afoHitCount = (enemy.afoHitCount || 0) + 1;
                    } else {
                        dealDamage(enemy, { damage: 350, percentDamage: 0.18, isPiercing: true, _statSrc: 'Sigil: Mirror Laser' });
                    }
                }
            });
        }
    }
}