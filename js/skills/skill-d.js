// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/skill-d.js — split out of the old monolithic js/skills.js.
// Skill D: Death Star (Draconic Annihilation) - charge/pull/mark-and-
// annihilate, plus its Galactic Spaceships (spawn/fusion/update).

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
            if (enemy.type !== 'embryo' && enemy.type !== 'thaelis_cocoon' && !_bhCCImmune) {
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

