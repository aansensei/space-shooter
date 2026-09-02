// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/skill-g.js — split out of the old monolithic js/skills.js.
// Skill G: Life Domain / Tesla Matrix - energy orb spawn/linking, Tesla coil
// spawn/update, and the whole charge/activate/end lifecycle.

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

