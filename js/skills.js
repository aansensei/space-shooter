function updateDefensiveOrbs() {
    let currentDefensive = skillAOrbs.filter(o => o.isDefensive).length;
    let targetDefensive = Math.min(skillADefensiveCharges, skillAOrbs.length);
    let needed = targetDefensive - currentDefensive;

    if (needed > 0) {
        let nonDefensiveOrbs = skillAOrbs.filter(o => !o.isDefensive);
        nonDefensiveOrbs.sort(() => 0.5 - Math.random());
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
    if (gameState === "playing" && currentTime - lastSkillA >= skillACooldown) {
        if (skillAOrbs.length >= maxSkillAOrbs) return;
        lastSkillA = currentTime;
        skillAActive = true;
        skillADefensiveCharges = 3;

        const orbsToAdd = Math.min(20, maxSkillAOrbs - skillAOrbs.length);
        for (let i = 0; i < orbsToAdd; i++) {
            skillAOrbs.push({
                angle: 0, radius: 0, target: null,
                x: player.x, y: player.y, speed: 0, size: 8,
                isDefensive: false
            });
        }

        updateDefensiveOrbs();
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

    let availableEnemy = enemies.find(enemy => !enemy.isTargetedByA && !enemy.inCoronation && !enemy.type.startsWith('enemy_bullet') && enemy.type !== 'abyssal_chain' && enemy.type !== 'veilshroud_echo' && Math.hypot(enemy.x - player.x, enemy.y - player.y) < skillASensorRadius);

    if (availableEnemy) {
        let availableOrb = skillAOrbs.find(orb => !orb.target && !orb.isDefensive);
        if (!availableOrb) availableOrb = skillAOrbs.find(orb => !orb.target);

        if (availableOrb) {
            availableOrb.target = availableEnemy;
            availableOrb.speed = 10;
            availableEnemy.isTargetedByA = true;

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
                dealDamage(orb.target, { damage: 110, percentDamage: 0.18 });
                const _didDmg = orb.target.hp + (orb.target.shield || 0) + (orb.target._tenacityBarrier || 0) < _preTotal;
                orb.target.isTargetedByA = false;

                spawnScatteredProjectiles(orb.x, orb.y, 16, { damage: 5, percentDamage: 0.015 });
                addExplosion(orb.x, orb.y, 30, orb.isDefensive ? 'yellow' : 'cyan');
                if (_didDmg) spawnDimensionalRift(orb.x, orb.y);
                skillAOrbs.splice(i, 1);

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

            // Mark for damage bonus & slow (egregor/dargruel/leviathan immune to slow)
            enemy._inDimensionalRift = true;
            if (enemy.type !== 'egregor' && enemy.type !== 'boss' && enemy.type !== 'leviathan') enemy._riftSlow = true;

            // Apply Soul Reaver debuff
            enemy.soulReaver = true;

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
                    if (checkMarchosiasArcShield(enemy, proj, proj.x, proj.y)) { proj.hitEnemies.push(enemy); continue; }
                    dealDamage(enemy, proj);
                    proj.hitEnemies.push(enemy);
                } else {
                    if (checkMarchosiasArcShield(enemy, proj, proj.x, proj.y)) { proj.lifetime = 0; break; }
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
    if (gameState !== "playing") return;

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
        if (gloryForJusticeActive) spiritFireRate /= 1.50;

        if (spirit.shootTimer <= 0) {
            spirit.shootTimer = spiritFireRate;
            let closest = findClosestEnemy(spirit.x, spirit.y);
            if (closest) {
                const speedMultiplier = (gloryForJusticeActive ? 1.30 : 1) * 1.32;
                spiritBullets.push({
                    x: spirit.x, y: spirit.y,
                    damage: 60, percentDamage: 0.0055,
                    size: 7.2, lifetime: 2000, target: closest, speedMultiplier: speedMultiplier,
                    isSpirit: true,
                });
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
            bladeArcProjectiles.push({ x: spirit.x, y: spirit.y, vx, vy, radius: 125, damage: 110, percentDamage: 0.08, hitEnemies: [], isSpirit: true, isPiercing: true });
        }
    }
}

// PHŌTOKRYSTOS UPDATE
function updatePhotokrystos(spirit, deltaTime) {
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
                        dealDamage(e, { damage: 0, percentDamage: 0 });
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
                        applyVuln: true, vulnChance: 0.15, isTrueDamage: true
                    });
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
    if (gloryForJusticeActive) photoFireRate /= 1.50;
    if (spirit.shootTimer <= 0) {
        spirit.shootTimer = photoFireRate;
        const targets = [];
        // Find up to 3 distinct closest enemies
        const allValid = enemies.filter(e =>
            !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && !e.inCoronation && e.hp > 0 && !e._markedForDeath
        ).sort((a, b) => Math.hypot(a.x - spirit.x, a.y - spirit.y) - Math.hypot(b.x - spirit.x, b.y - spirit.y));
        if (allValid.length > 0) {
            targets[0] = allValid[0];
            targets[1] = allValid[Math.min(1, allValid.length - 1)];
            targets[2] = allValid[Math.min(2, allValid.length - 1)];
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
                    damage: 100 * dmgMult * dntMult, percentDamage: 0.014 * dntMult,
                    size: 8, lifetime: 2500, target: targets[bi], speedMultiplier: speedMult,
                    isSpirit: true, isPhoto: true, destroysEnemyBullets: true,
                    applyVuln: true, vulnChance: 0.15,
                });
            }
            spirit.volleyCount = (spirit.volleyCount || 0) + 1;
        }
    }

    // Boomerang every 6 volleys
    if (spirit.volleyCount >= 6) {
        spirit.volleyCount = 0;
        spawnPhotoBrangs(spirit.x, spirit.y, 2);
    }

}

const MAX_PHOTO_BRANGS = 10;
const MAX_BRANG_PENDING = 5;
function spawnPhotoBrangs(fromX, fromY, count) {
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

    // Phóng ngay những cái đủ chỗ
    for (let b = 0; b < throwNow; b++) {
        const shuffled = [...validTargets].sort(() => Math.random() - 0.5);
        const first = shuffled[0];
        const dx = first.x - fromX, dy = first.y - fromY;
        const d = Math.hypot(dx, dy) || 1;
        photoBrangs.push({
            x: fromX, y: fromY,
            vx: (dx / d) * 17.5, vy: (dy / d) * 17.5,
            targets: shuffled,
            targetIdx: 0,
            hitEnemies: [],
            rotation: Math.random() * Math.PI * 2,
            damage: 350, percentDamage: 0.07,
            lifetime: 9000,
        });
    }
}

function updatePhotoBrangs(deltaTime) {
    const dt = deltaTime / 16.67;
    const BRANG_R = 48; // visual radius, any overlap = hit
    const _photo = spirits.find(s => s.isPhotokrystos); // dùng isPhotokrystos, không phải type

    for (let i = photoBrangs.length - 1; i >= 0; i--) {
        const b = photoBrangs[i];
        b.rotation += 0.22 * dt;

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
            const hitDist = (tgt.size / 2) + BRANG_R; // generous, any edge contact
            if (d < hitDist) {
                const lastHit = b._hitCooldowns.get(tgt) || 0;
                if (now_b - lastHit >= 200) { // can re-hit same enemy after 200ms
                    b._hitCooldowns.set(tgt, now_b);
                    const brangSrc = {
                        damage: b.damage * (gloryForJusticeActive ? 1.55 : 1),
                        percentDamage: b.percentDamage,
                        applyVuln: true, vulnChance: 0.15,
                        isTrueDamage: true
                    };
                    if (!checkMarchosiasArcShield(tgt, brangSrc, b.x, b.y)) {
                        dealDamage(tgt, brangSrc);
                        if (tgt.hp <= 0 && !tgt._spiritKillCounted) {
                            tgt._spiritKillCounted = true;
                            primevalEnergy = Math.min(100, primevalEnergy + 2);
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
            if (b._bounces >= 2 && !bounced) {
                // Check if new enemies appeared
                const newValid = enemies.filter(e =>
                    !e.type.startsWith('enemy_bullet') && e.type !== 'abyssal_chain' &&
                    e.type !== 'veilshroud_echo' && !e.inCoronation &&
                    e.hp > 0 && !e._markedForDeath
                );
                if (newValid.length > 0) {
                    b.targets = [...newValid].sort(() => Math.random() - 0.5);
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
            if (Math.hypot(eb.x - b.x, eb.y - b.y) < BRANG_R + eb.size) eb.hp = 0;
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
    } else if (eff.phase === 'flash' && eff.timer >= 400) {
        // Transform the spirit
        const spirit = eff.targetSpirit;
        if (spirit && !spirit.isFinishing) {
            spirit.isPhotokrystos = true;
            spirit._summoningUp = false;
            spirit.spawnGameTime = gameElapsedTime; // reset 40s timer
            spirit.duration = 40000;
            spirit.shotsFiredSinceBarrage = 0;
            spirit.volleyCount = 0;
            spirit._btmStarted = false;
            spirit._done = false;
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
                if (checkMarchosiasArcShield(enemy, arc, arc.x, arc.y)) { arc.hitEnemies.push(enemy); continue; }
                dealDamage(enemy, arc);
                // Primeval Creation: blade arc from spirit = +2%
                if (arc.isSpirit && enemy.hp <= 0 && !enemy._spiritKillCounted) {
                    enemy._spiritKillCounted = true;
                    primevalEnergy = Math.min(100, primevalEnergy + 2);
                }
                arc.hitEnemies.push(enemy);
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
                if (checkMarchosiasArcShield(enemy, b, b.x, b.y)) {
                    b.lifetime = 0; break;
                }
                dealDamage(enemy, b);
                // Primeval Creation: +2% from spirit kills (handleEnemyKill gives +1.25% to others)
                if (b.isSpirit && enemy.hp <= 0 && !enemy._spiritKillCounted) {
                    enemy._spiritKillCounted = true;
                    primevalEnergy = Math.min(100, primevalEnergy + 2);
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
                    dealDamage(enemy, { damage: 10, percentDamage: 0.40, isSpiritLaser: true });
                });
            }
            if (spirit.finaleChargeTime <= 0) spirit.finaleState = 'firing';
            break;
        case 'firing':
            addExplosion(spirit.x, spirit.y, 200, 'red');
            _setShake(25, 600);
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
    if (typeof player !== 'undefined' && player._silenced) return;
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
            if (enemy.type === 'abyssal_chain') continue; // piercing, immune to black hole
            if (enemy.type === 'veilshroud_echo') continue; // echo miễn CC
            if (enemy.inCoronation) continue; // untargetable during coronation
            if (enemy.type === 'veilshroud' && enemy.inPhantom) continue; // frozen during phantom
            let dx = blackHole.x - enemy.x, dy = blackHole.y - enemy.y, d = Math.hypot(dx, dy);
            const _bhCCImmune = enemy.type === 'egregor' || enemy.type === 'boss';
            if (enemy.type !== 'embryo' && !(enemy.type === 'leviathan' && enemy.afoShieldActive) && !_bhCCImmune) {
                if (d > 1) {
                    enemy.x += (dx / d) * pullSpeed * dt;
                    enemy.y += (dy / d) * pullSpeed * dt;
                }
            }
            if (d < blackHole.size / 2) {
                // Blackhole chạm khiên Mar → tính 1 hit liên tục, không insta-kill Mar qua khiên
                if (enemy.type === 'marchosias' && enemy.arcShield && enemy.arcShield.hp > 0) {
                    if (Math.random() < 0.10) _tryTriggerMarchosiasCounter(enemy);
                } else if (enemy.type === 'leviathan' && enemy.afoShieldActive) {
                    enemy.afoHitCount = (enemy.afoHitCount || 0) + 1;
                } else if (_bhCCImmune) {
                    dealDamage(enemy, { damage: Math.ceil(enemy.maxHp * 0.30), isTrueDamage: true });
                } else {
                    dealDamage(enemy, { damage: enemy.maxHp * 999999999 });
                }
            }
        }
        if (blackHole.y + blackHole.maxSize < 0) blackHole = null;
    }
}

function activateSkillF() {
    const currentTime = performance.now();
    if (typeof player !== "undefined" && player._silenced) return; // Silence
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
    }
    if (skillFState === "sweeping") {
        let sweepProgress = (currentTime - skillFSweepStart) / skillFSweepDuration;
        if (sweepProgress >= 1) {
            skillFState = "ready";
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
                if (enemy.type === 'marchosias' && enemy.arcShield && enemy.arcShield.hp > 0) {
                    if (Math.random() < 0.10) _tryTriggerMarchosiasCounter(enemy);
                } else if (enemy.type === 'leviathan' && enemy.afoShieldActive) {
                    enemy.afoHitCount = Math.min(250, (enemy.afoHitCount || 0) + 1);
                } else {
                    // Instant kill, bypass tất cả damage calc, clear quái ngay lập tức
                    enemy.shield = 0;
                    enemy.hp = 0;
                    // Leviathan: skill F bypasses dealDamage → trigger last rites manually
                    if (enemy.type === 'leviathan' && !enemy._deathLaserSpawned) {
                        dealDamage(enemy, { damage: 0, percentDamage: 0 });
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
    if (gameState !== "playing" || skillGActive || skillGCharge < 100) return;

    skillGActive = true;
    skillGCharge = 0;
    skillGEndTime = gameElapsedTime + 30000;
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
    const explosionProps = { damage: 10, percentDamage: 0.06 };
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
                        const explosionProps = { damage: 10, percentDamage: 0.06 };
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
                const explosionProps = { damage: 10, percentDamage: 0.06 };
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

                    if (enemy.type === 'boss' || enemy.type === 'thaelis') {
                        enemy.shootTimer += deltaTime * 0.30;
                    }

                    const dotMap = orb.linkedTo.dotTargets;
                    if (!dotMap.has(enemy)) {
                        dotMap.set(enemy, currentTime);
                    }
                    if (currentTime - dotMap.get(enemy) >= 125) {
                        dealDamage(enemy, { damage: 45, percentDamage: 0.012, isTeslaDot: true });
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
            const explosionProps = { damage: 10, percentDamage: 0.12 };
            addExplosion(coil.x, coil.y, coil.auraRadius, 'electric_blue');
            enemies.forEach(enemy => {
                let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
                if (Math.hypot(enemy.x - coil.x, enemy.y - coil.y) < coil.auraRadius + enemyRadius) {
                    dealDamage(enemy, explosionProps);
                }
            });

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

    // Teleport used → 9s cooldown
    window._shiftTeleportUsed = true;
    cancelSkillShift();
}

function cancelSkillShift() {
    if (skillShiftActive) {
        const holdDuration = (performance.now() - skillShiftChargeStart) / 1000; // seconds
        skillShiftActive = false;
        window._shiftActive = false;

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
            playerTakesHit();
        }
        // Hit sentinel, damage scales down with number of sentinels already hit
        for (const s of sentinels) {
            if (!blade.hitEnemies.includes(s) && Math.hypot(blade.x - s.x, blade.y - s.y) < blade.radius + s.size) {
                // 1st sentinel hit: 30%, 2nd: 28%, 3rd+: 24%
                const hitsAlready = blade.hitEnemies.length;
                const pct = hitsAlready === 0 ? 0.27 : hitsAlready === 1 ? 0.23 : 0.21;
                dealDamage(s, { damage: (s.maxHp + (s.shield || 0)) * pct });
                blade.hitEnemies.push(s);
                addExplosion(s.x, s.y, 20, '#ff6600');
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
    if (!gloryForJusticeActive) return; // chỉ active khi Glory for Justice bật
    const now = performance.now();
    for (const enemy of enemies) {
        if (!enemy.soulReaver) continue;
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