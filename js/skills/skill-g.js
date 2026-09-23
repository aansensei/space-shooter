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
    const explosionProps = { damage: 0.023 * player.atk, _statSrc: 'Skill G: Tesla Coil' };
    const explosionRadius = ENERGY_ORB_SIZE * 5;

    energyOrbs.forEach(orb => {
        addExplosion(orb.x, orb.y, explosionRadius, 'cyan');
        enemies.forEach(enemy => {
            if (enemy._stealthed) return; // Uriel mid-Camouflage: fully invisible and untargetable
            let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - orb.x, enemy.y - orb.y) < explosionRadius + enemyRadius) {
                dealDamage(enemy, explosionProps);
            }
        });
    });
    energyOrbs = [];

    teslaCoils.forEach(coil => {
        addExplosion(coil.x, coil.y, explosionRadius, 'cyan');
        enemies.forEach(enemy => {
            if (enemy._stealthed) return; // Uriel mid-Camouflage: fully invisible and untargetable
            let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - coil.x, enemy.y - coil.y) < explosionRadius + enemyRadius) {
                dealDamage(enemy, explosionProps);
            }
        });
    });
    teslaCoils = [];
    teslaBolts = [];
    teslaRings = [];
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
                        const explosionProps = { damage: 0.0115 * player.atk, _statSrc: 'Skill G: Tesla Coil' };
                        const explosionRadius = orb.size * 5;
                        addExplosion(orb.x, orb.y, explosionRadius, 'cyan');
                        enemies.forEach(enemy => {
                            if (enemy._stealthed) return; // Uriel mid-Camouflage: fully invisible and untargetable
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
                    const explosionProps = { damage: 0.0115 * player.atk, _statSrc: 'Skill G: Tesla Coil' };
                    const explosionRadius = orb.size * 5;
                    addExplosion(orb.x, orb.y, explosionRadius, 'cyan');
                    enemies.forEach(enemy => {
                        if (enemy._stealthed) return; // Uriel mid-Camouflage: fully invisible and untargetable
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
                if (enemy._stealthed) return;                 // Uriel mid-Camouflage: fully invisible and untargetable
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
                    if (currentTime - dotMap.get(enemy) >= 250) {
                        const _teslaDmgMult = _hasBuff('ky_su_dien') ? 1.30 : 1; // docs/combat-scaling-rebalance.md Part 5
                        dealDamage(enemy, { damage: 0.08 * player.atk * _teslaDmgMult, isTeslaDot: true });
                        dotMap.set(enemy, currentTime);
                        if (_hasBuff('set_day_chuyen') && Math.random() < 0.50) {
                            let _closest = null, _closestDist = Infinity;
                            for (const _oe of enemies) {
                                if (_oe === enemy || _oe.type.startsWith('enemy_bullet') || _oe.inCoronation || _oe._stealthed) continue;
                                const _d = Math.hypot(_oe.x - enemy.x, _oe.y - enemy.y);
                                if (_d < 150 && _d < _closestDist) { _closest = _oe; _closestDist = _d; }
                            }
                            if (_closest) {
                                dealDamage(_closest, { damage: 0.08 * player.atk * _teslaDmgMult, isTeslaDot: true, isChainLightning: true });
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
        hp: 1, maxHp: 1, // coils have no health: this is only an alive flag the 500-bolt self-destruct clears
        stacks: [],
        size: TESLA_COIL_SIZE,
        auraRadius: TESLA_AURA_RADIUS,
        scanTimer: TESLA_BOLT_SCAN_MS,
        boltQueue: [],
        boltsFired: 0,
        flashMs: 0,
        empowerBurstMs: 0,
        muzzleAngle: 0,
        id: Math.random()
    });
}

function updateTeslaCoils(deltaTime, currentTime) {
    let dt = deltaTime / 16.67;
    // Each enemy gets pushed back once per frame no matter how many auras it
    // sits in, so stacked coils slow it instead of shoving it backward.
    const _pushed = new Set();
    for (let i = teslaCoils.length - 1; i >= 0; i--) {
        const coil = teslaCoils[i];

        enemies.forEach(enemy => {
            if (enemy.type === 'veilshroud_echo') return; // untargetable
            if (enemy.inCoronation) return;               // untargetable during coronation
            let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
            if (Math.hypot(enemy.x - coil.x, enemy.y - coil.y) < coil.auraRadius + enemyRadius) {
                if (!enemy.type.startsWith('enemy_bullet') && !_pushed.has(enemy)) {
                    _pushed.add(enemy);
                    enemy.y -= (enemy.speed * dt * 0.08);
                }
            }
        });

        _updateCoilBoltVolley(coil, deltaTime);

        if (coil.hp <= 0) {
            const _coilDmgMult = _hasBuff('ky_su_dien') ? 1.30 : 1; // docs/combat-scaling-rebalance.md Part 5
            const explosionProps = { damage: 0.023 * player.atk * _coilDmgMult, _statSrc: 'Skill G: Tesla Coil' };
            addExplosion(coil.x, coil.y, coil.auraRadius, 'electric_blue');
            teslaRings.push({ x: coil.x, y: coil.y, r0: coil.size, r1: coil.auraRadius * 1.15, life: 420, maxLife: 420 });
            enemies.forEach(enemy => {
                if (enemy._stealthed) return; // Uriel mid-Camouflage: fully invisible and untargetable
                let enemyRadius = enemy.type.startsWith('enemy_bullet') ? enemy.size : enemy.size / 2;
                if (Math.hypot(enemy.x - coil.x, enemy.y - coil.y) < coil.auraRadius + enemyRadius) {
                    dealDamage(enemy, explosionProps);
                }
            });
            if (_hasBuff('ky_su_dien')) {
                skillGCharge = Math.min(100, skillGCharge + 10);
            }
            teslaCoils.splice(i, 1);
        }
    }
}


// The coil's ring turns slowly; a pylon's world position comes from the
// clock alone, so render and firing agree without any stored state.
function teslaRingRot(now) { return now / 7000; }
function teslaPylonPos(coil, i, now) {
    const a = teslaRingRot(now) + i * Math.PI / 3;
    return { x: coil.x + Math.cos(a) * TESLA_PYLON_R, y: coil.y + Math.sin(a) * TESLA_PYLON_R, a: a };
}

// Speed multiplier from bolt-hit slows: the first active coil's slow is at
// full strength, each further coil adds only TESLA_OVERLAP_SLOW_EFFECT of it.
function teslaBoltSlowMult(enemy, now) {
    const m = enemy._teslaBoltSlows;
    if (!m) return 1;
    let n = 0;
    for (const k in m) { if (m[k] > now) n++; else delete m[k]; }
    if (n === 0) return 1;
    const slow = 1 - TESLA_BOLT_SLOW_MULT;
    return TESLA_BOLT_SLOW_MULT * Math.pow(1 - slow * TESLA_OVERLAP_SLOW_EFFECT, n - 1);
}

// Anything dealDamage() no-ops on, or that other skills already treat as
// untargetable, must not draw a bolt: Thaelis's Cocoon, Goliath before True
// Form and during its death sequence, Veilshroud mid-Phantom, a freshly
// revived Thaelis, plus the stealth/coronation/echo cases.
function _teslaBoltTargetable(e) {
    if (!e || e.hp <= 0 || e._markedForDeath || e._stealthed || e.inCoronation) return false;
    if (e.type.startsWith('enemy_bullet') || e.type === 'abyssal_chain' || e.type === 'veilshroud_echo') return false;
    if (e.type === 'thaelis_cocoon') return false;
    if (e.type === 'goliath' && (e.phase !== 'true_form' || e._deathPhase)) return false;
    if (e.type === 'veilshroud' && e.inPhantom) return false;
    if (e.type === 'thaelis' && e._reviveInvulnEnd && performance.now() < e._reviveInvulnEnd) return false;
    return true;
}

// Every TESLA_BOLT_SCAN_MS the coil picks up to TESLA_BOLT_MAX_TARGETS
// distinct enemies inside its aura (closest first), winds up for
// TESLA_BOLT_WINDUP_MS, then launches one homing bolt per target
// TESLA_BOLT_STAGGER_MS apart, so each enemy takes at most one bolt per
// scan. A coil that has launched TESLA_COIL_MAX_BOLTS bolts detonates itself.
function _updateCoilBoltVolley(coil, deltaTime) {
    if (coil.flashMs > 0) coil.flashMs = Math.max(0, coil.flashMs - deltaTime);
    if (coil.empowerBurstMs > 0) coil.empowerBurstMs = Math.max(0, coil.empowerBurstMs - deltaTime);
    if (coil.hp <= 0) return;

    // Each stack carries its own remaining time; every stack adds fire rate,
    // which speeds up the scan timer and the per-shot delays alike.
    for (let i = coil.stacks.length - 1; i >= 0; i--) {
        coil.stacks[i] -= deltaTime;
        if (coil.stacks[i] <= 0) coil.stacks.splice(i, 1);
    }
    const rate = 1 + TESLA_STACK_FIRE_RATE * coil.stacks.length;

    coil.scanTimer -= deltaTime * rate;
    if (coil.scanTimer <= 0) {
        coil.scanTimer += TESLA_BOLT_SCAN_MS;
        const inAura = [];
        for (const e of enemies) {
            if (!_teslaBoltTargetable(e)) continue;
            const er = e.size / 2;
            const d = Math.hypot(e.x - coil.x, e.y - coil.y);
            if (d < coil.auraRadius + er) inAura.push({ e, d });
        }
        inAura.sort((a, b) => a.d - b.d);
        coil.boltQueue = inAura.slice(0, TESLA_BOLT_MAX_TARGETS).map((t, i) => ({
            target: t.e, delay: TESLA_BOLT_WINDUP_MS + i * TESLA_BOLT_STAGGER_MS,
        }));
    }

    for (let q = coil.boltQueue.length - 1; q >= 0; q--) {
        const item = coil.boltQueue[q];
        item.delay -= deltaTime * rate;
        if (item.delay > 0) continue;
        coil.boltQueue.splice(q, 1);
        if (!_teslaBoltTargetable(item.target)) continue;
        _launchTeslaBolt(coil, item.target);
        if (coil.boltsFired >= TESLA_COIL_MAX_BOLTS) { coil.hp = 0; coil.boltQueue.length = 0; break; }
    }
}

function _launchTeslaBolt(coil, target) {
    const now = performance.now();
    // The bolt is released from the crystal core and flies out over the ring;
    // the pylon pointing closest to the target lights up as its conduit.
    const ang = Math.atan2(target.y - coil.y, target.x - coil.x);
    let best = 0, bestDiff = Infinity;
    for (let i = 0; i < 6; i++) {
        let d = teslaPylonPos(coil, i, now).a - ang;
        d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
        if (d < bestDiff) { bestDiff = d; best = i; }
    }
    // Stack bookkeeping: a full set of stacks makes THIS bolt the empowered
    // one and resets them to a single stack (its own); otherwise the shot adds a stack.
    const empowered = coil.stacks.length >= TESLA_STACK_MAX;
    if (empowered) coil.stacks.length = 0;
    coil.stacks.push(TESLA_STACK_MS);
    const boltStacks = empowered ? TESLA_STACK_MAX : coil.stacks.length;
    coil.boltsFired++;
    coil.flashMs = 200;
    coil.muzzleAngle = ang;
    coil.muzzlePylon = best;
    teslaBolts.push({
        x: coil.x, y: coil.y,
        angle: ang, speed: 13, target: target, life: 2200, trail: [],
        spawnAt: now, stacks: boltStacks, empowered: empowered, coilId: coil.id,
    });
    teslaRings.push({ x: coil.x, y: coil.y, r0: 6, r1: TESLA_COIL_VISUAL_R + 10, life: 220, maxLife: 220 });
    createParticles(coil.x, coil.y, empowered ? 16 : 9, empowered ? '#ffe9a8' : '#aaf6ff', 1, 6);
    // A few sparks kicked out along the firing pylon itself, not just the
    // core, so the shot visibly leaves the ring rather than just the middle.
    const tip = teslaPylonPos(coil, best, now);
    createParticles(tip.x, tip.y, empowered ? 8 : 4, '#e8ffff', 2, 8);
    if (window.AudioMgr) window.AudioMgr.playSfxAt('chain-lightning', coil.x, coil.y);
    if (empowered) {
        // The 5th shot gets its own moment: a screen shake, a wide golden
        // shockwave, and a full radial lightning burst (drawn in
        // js/render/skill-g.js while empowerBurstMs is counting down).
        _setShake(9, 220);
        teslaRings.push({ x: coil.x, y: coil.y, r0: TESLA_COIL_VISUAL_R, r1: TESLA_COIL_VISUAL_R + 110, life: 460, maxLife: 460, color: '#ffe9a8' });
        coil.empowerBurstMs = 320;
        if (window.AudioMgr) window.AudioMgr.playSfxAt('charged-shot', coil.x, coil.y);
    }
}

function updateTeslaBolts(deltaTime, currentTime) {
    const dt = deltaTime / 16.67;
    for (let r = teslaRings.length - 1; r >= 0; r--) {
        teslaRings[r].life -= deltaTime;
        if (teslaRings[r].life <= 0) teslaRings.splice(r, 1);
    }
    for (let i = teslaBolts.length - 1; i >= 0; i--) {
        const b = teslaBolts[i];
        b.life -= deltaTime;
        if (b.life <= 0) { teslaBolts.splice(i, 1); continue; }

        if (!_teslaBoltTargetable(b.target) || !enemies.includes(b.target)) {
            let best = null, bestD = 350;
            for (const e of enemies) {
                if (!_teslaBoltTargetable(e)) continue;
                const d = Math.hypot(e.x - b.x, e.y - b.y);
                if (d < bestD) { best = e; bestD = d; }
            }
            b.target = best;
        }

        if (b.target) {
            const want = Math.atan2(b.target.y - b.y, b.target.x - b.x);
            let diff = want - b.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const maxTurn = 0.14 * dt;
            b.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
        }

        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 7) b.trail.shift();
        b.x += Math.cos(b.angle) * b.speed * dt;
        b.y += Math.sin(b.angle) * b.speed * dt;

        if (b.target && Math.hypot(b.target.x - b.x, b.target.y - b.y) < b.target.size / 2 + 9) {
            const _mult = _hasBuff('ky_su_dien') ? 1.30 : 1;
            const hitTarget = b.target;
            addExplosion(b.x, b.y, 30, 'electric_blue');
            teslaRings.push({ x: b.x, y: b.y, r0: 6, r1: 30, life: 240, maxLife: 240 });
            createParticles(b.x, b.y, 6, '#ffffff', 2, 7);
            let _dmg = (TESLA_BOLT_DAMAGE + TESLA_STACK_ATK * b.stacks + (b.empowered ? TESLA_EMPOWER_ATK : 0)) * player.atk * _mult;
            if (b.empowered) {
                _dmg += TESLA_EMPOWER_LOST_HP * Math.max(0, hitTarget.maxHp - hitTarget.hp) + TESLA_EMPOWER_MAXHP * hitTarget.maxHp;
                hitTarget._rootEnd = Math.max(hitTarget._rootEnd || 0, currentTime + TESLA_EMPOWER_ROOT_MS);
                teslaRings.push({ x: b.x, y: b.y, r0: 10, r1: 62, life: 360, maxLife: 360 });
                createParticles(b.x, b.y, 12, '#ffe9a8', 2, 9);
            }
            dealDamage(hitTarget, {
                damage: _dmg,
                isPiercing: true, _teslaBolt: true, _statSrc: 'Skill G: Tesla Coil',
            });
            // Hit slow: fixed strength per coil, the timer just refreshes on
            // repeat hits from the same coil. Several coils overlap with
            // diminishing effect (see teslaBoltSlowMult). CC-immune enemies
            // ignore it in main.js.
            if (!hitTarget._teslaBoltSlows) hitTarget._teslaBoltSlows = {};
            hitTarget._teslaBoltSlows[b.coilId] = currentTime + TESLA_BOLT_SLOW_MS;
            teslaBolts.splice(i, 1);
            continue;
        }

        if (b.x < -60 || b.x > canvas.width + 60 || b.y < -60 || b.y > canvas.height + 60) teslaBolts.splice(i, 1);
    }
}
