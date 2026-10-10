// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/skill-f.js — split out of the old monolithic js/skills.js.
// Skill F: Annihilation Sweep - the sweep cast/cone/collision loop, and its
// Great Sage kill hook (Ransacked Treasury cone growth + gem grant).

// Records a Skill F kill for the Great Sage sigil: every kill widens the
// current sweep's cone (Ransacked Treasury), and a kill on an Elite-or-
// higher enemy also plunders that enemy's own gem, immediately, one of each
// kind held at a time (max 3)
function _onSkillFKill(enemy) {
    _leoRememberBurnKill(enemy);
    _skillFKillsThisSweep++;
    if (!_hasBuff('cuop_bao_tang')) return;
    _skillFHitFlashes.push({ x: enemy.x, y: enemy.y, r: (enemy.size || 20) + 5, time: performance.now() });
    if (window.AudioMgr) window.AudioMgr.playSfxAt('great-sage-hit', enemy.x, enemy.y);
    _grantGreatSageGem(enemy);
}

let _skillFLeftHeld = false, _skillFRightHeld = false;
window._echoSlashFx = [];

function _echoSlashBlocked(cx, cy, g) {
    return (typeof _urielBarrierBlocksPoint === 'function' && _urielBarrierBlocksPoint(g.x, g.y))
        || (typeof _urielBarrierBlocksSegment === 'function' && _urielBarrierBlocksSegment(cx, cy, g.x, g.y));
}

function _slashEcho(g, angle, cx, cy) {
    if (g._slashed || !Number.isFinite(g.x) || !Number.isFinite(g.y) || !Number.isFinite(angle)
        || _echoSlashBlocked(cx, cy, g)) return;
    g._slashed = true;
    if (window._echoSlashFx.length < 32) window._echoSlashFx.push({ x: g.x, y: g.y, angle, age: 0 });
    if (window.AudioMgr) window.AudioMgr.playSfxAt('spirit-arc-slash', g.x, g.y);
    const owner = g.owner;
    if (owner && owner._echoTrail === g.path) {
        let remaining = false;
        for (const other of window._goliathEchoes) {
            if (other !== g && !other._slashed && other.owner === owner && other.path === g.path) { remaining = true; break; }
        }
        if (!remaining) owner._echoTrailEnd = Math.min(owner._echoTrailEnd || Infinity, performance.now() + 180);
    }
}

// The radius expands the same cone used for Skill F's enemy hit test.
function _skillFSweepHits(x, y, radius, currentAngle, width) {
    const dx = skillFDirection * (x - player.x), dy = y - player.y;
    const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (d > canvas.width + radius) return false;
    if (a < currentAngle && a > currentAngle - width) return true;
    if (radius <= 0) return false;
    for (let i = 0; i < 2; i++) {
        const edge = currentAngle - i * width;
        const t = Math.max(0, Math.min(canvas.width, dx * Math.cos(edge) + dy * Math.sin(edge)));
        if (Math.hypot(dx - t * Math.cos(edge), dy - t * Math.sin(edge)) <= radius) return true;
    }
    return false;
}

function _trySlashEchoBySweep(g) {
    if (g._slashed || skillFState !== 'sweeping') return;
    const progress = (performance.now() - skillFSweepStart) / skillFSweepDuration;
    if (progress < 0 || progress >= 1) return;
    const angle = -Math.PI + Math.PI * progress;
    const width = _hasBuff('cuop_bao_tang') ? Math.min(0.2 * (1 + _skillFKillsThisSweep * 0.5), 0.9) : 0.2;
    if (_skillFSweepHits(g.x, g.y, GOLIATH_ECHO_HIT_RADIUS, angle, width)) {
        _slashEcho(g, skillFDirection === 1 ? angle : Math.PI - angle, player.x, player.y);
    }
}

function _slashEchoesCircle(x, y, radius, angle, sourceX, sourceY) {
    for (const g of window._goliathEchoes || []) {
        if (!g._slashed && Math.hypot(g.x - x, g.y - y) <= radius + GOLIATH_ECHO_HIT_RADIUS) {
            _slashEcho(g, angle, sourceX == null ? x : sourceX, sourceY == null ? y : sourceY);
        }
    }
}

function _slashEchoesLine(x, y, ex, ey, width) {
    const dx = ex - x, dy = ey - y, len2 = dx * dx + dy * dy;
    if (!Number.isFinite(len2) || len2 <= 0) return;
    for (const g of window._goliathEchoes || []) {
        const t = Math.max(0, Math.min(1, ((g.x - x) * dx + (g.y - y) * dy) / len2));
        if (Math.hypot(g.x - x - t * dx, g.y - y - t * dy) <= width + GOLIATH_ECHO_HIT_RADIUS) {
            _slashEcho(g, Math.atan2(dy, dx), x, y);
        }
    }
}

function _slashEchoesSector(x, y, angle, halfWidth, range) {
    for (const g of window._goliathEchoes || []) {
        const d = Math.hypot(g.x - x, g.y - y);
        const a = Math.atan2(g.y - y, g.x - x) - angle;
        const diff = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
        const extra = Math.asin(Math.min(1, GOLIATH_ECHO_HIT_RADIUS / Math.max(1, d)));
        if (d <= range + GOLIATH_ECHO_HIT_RADIUS && diff <= halfWidth + extra) _slashEcho(g, angle, x, y);
    }
}

function _trySlashEchoByProjectiles(g) {
    for (const arc of bladeArcProjectiles) {
        if (arc._fromSkillF && Math.hypot(g.x - arc.x, g.y - arc.y) <= arc.radius + GOLIATH_ECHO_HIT_RADIUS) {
            _slashEcho(g, Math.atan2(arc.vy, arc.vx), arc.originX == null ? player.x : arc.originX, arc.originY == null ? player.y : arc.originY);
        }
    }
    for (const b of photoBrangs) {
        if (b._fromSkillF && Math.hypot(g.x - b.x, g.y - b.y) <= (b._radius || BRANG_R_DEFAULT) + GOLIATH_ECHO_HIT_RADIUS) {
            _slashEcho(g, Math.atan2(b.vy, b.vx), b._originX, b._originY);
        }
    }
}

// Keyboard presses and joystick edges select the direction during charge.
function _updateSkillFDirection(pressedDirection) {
    if (skillFState === "charging" && !gamePaused && performance.now() - skillFChargeStart < 1500) {
        if (pressedDirection) {
            skillFDirection = pressedDirection;
        } else {
            if (keys.left && !_skillFLeftHeld) skillFDirection = -1;
            if (keys.right && !_skillFRightHeld) skillFDirection = 1;
        }
    }
    _skillFLeftHeld = !!keys.left;
    _skillFRightHeld = !!keys.right;
}

function activateSkillF() {
    const currentTime = performance.now();
    if (typeof player !== "undefined" && player._silenced) return; // Silence
    if (gameState !== "playing" || window._sigilPicker || window._kanadeCutscene) return;

    // Great Sage: releasing a banked gem takes priority over the normal
    // cast and never touches Skill F's own charge/cooldown cycle at all -
    // Annihilation Sweep already kills nearly everything it crosses each
    // pass, so bundling another full sweep onto every single gem spend was
    // redundant. Works whether Skill F itself is ready or on cooldown.
    if (_hasBuff('cuop_bao_tang') && _greatSageGems.length > 0) {
        // 72 Transformations: holding a full set of 3 different gems makes
        // the one being spent hit 1.65x as hard - a passive reward for
        // staying topped up, not a separate "burst all 3 at once" trigger.
        // Every press still spends exactly 1 gem (oldest first).
        const comboMult = (_hasBuff('bien_hoa_72') && _greatSageGems.length >= 3) ? 1.65 : 1;
        _castStolenGemAttack(_greatSageGems.shift(), comboMult);
        return;
    }

    const onCooldown = currentTime - lastSkillF <= skillFCooldown;
    if (skillFState === "ready" && !onCooldown) {
        lastSkillF = currentTime;
        _recordAdaptiveSkill('F');
        skillFDirection = 1;
        _skillFLeftHeld = !!keys.left;
        _skillFRightHeld = !!keys.right;
        enemies.forEach(e => e.hitBySkillF = false);
        _skillFKillsThisSweep = 0;
        _checkMirrorLaserProc();
        // Great Sage: every real Annihilation Sweep also phases the player
        // and every sentinel out for 1s, untargetable and immune like
        // Veilshroud's own ghost. Damage immunity is checked in
        // playerTakesHit (main.js) and dealDamage (entities/core.js).
        if (_hasBuff('cuop_bao_tang')) {
            window._greatSageStealthEnd = currentTime + 1000;
        }
        if (_hasBuff('dong_chay_luan_hoi')) {
            // Cycle of Flow: skip the charge phase entirely
            skillFDirection = keys.left && !keys.right ? -1 : 1;
            skillFState = "sweeping";
            skillFSweepStart = currentTime;
            if (window.AudioMgr) window.AudioMgr.startSkillFFire();
            if (_hasBuff('song_luoi')) spawnPhotoBrangs(player.x, player.y, 2, true, true);
        } else {
            skillFState = "charging";
            skillFChargeStart = currentTime;
            if (window.AudioMgr) window.AudioMgr.startSkillFCharge();
        }
    }
}

function updateSkillF(deltaTime) {
    for (let i = window._echoSlashFx.length - 1; i >= 0; i--) {
        window._echoSlashFx[i].age += deltaTime;
        if (window._echoSlashFx[i].age >= 300) window._echoSlashFx.splice(i, 1);
    }
    const currentTime = performance.now();
    if (skillFState === "charging") _updateSkillFDirection();
    if (skillFState === "charging" && currentTime - skillFChargeStart >= 1500) {
        skillFState = "sweeping";
        skillFSweepStart = currentTime;
        if (window.AudioMgr) { window.AudioMgr.stopSkillFCharge(); window.AudioMgr.startSkillFFire(); }
        if (_hasBuff('song_luoi')) {
            // Twin Blades: Skill F sweep now throws 2 boomerangs from the player instead of blade arcs
            spawnPhotoBrangs(player.x, player.y, 2, true, true);
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
        // Ransacked Treasury: the cone widens with every kill landed this
        // sweep, not with elapsed time, snowballing up to 4.5x its base width
        const coneHalfWidth = _hasBuff('cuop_bao_tang') ? Math.min(0.2 * (1 + _skillFKillsThisSweep * 0.5), 0.2 * 4.5) : 0.2;

        for (const g of window._goliathEchoes || []) _trySlashEchoBySweep(g);

        for (let enemy of enemies) {
            if (enemy.hitBySkillF) continue;
            if (enemy.type === 'abyssal_chain') continue; // piercing, immune to skill F
            if (enemy.type === 'veilshroud_echo') continue; // untargetable
            if (enemy.type === 'thaelis_cocoon') continue; // untargetable, only its Guards can be hit
            if (enemy.inCoronation) continue;
            if (enemy._stealthed) continue; // Uriel mid-Camouflage: fully invisible and untargetable
            // Uriel's death barrier occludes the sweep like a flashlight hitting a wall.
            if (typeof _urielBarrierBlocksSegment === 'function' && _urielBarrierBlocksSegment(player.x, player.y, enemy.x, enemy.y)) continue;
            if (_skillFSweepHits(enemy.x, enemy.y, 0, currentAngle, coneHalfWidth)) {
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
                    if (enemy.hp <= 0) _onSkillFKill(enemy);
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
                    _onSkillFKill(enemy);
                }
                enemy.hitBySkillF = true;
            }
        }

        let length = Math.random() * canvas.width;
        let px = player.x + skillFDirection * Math.cos(currentAngle) * length;
        let py = player.y + Math.sin(currentAngle) * length;
        particles.push({
            x: px, y: py,
            vx: skillFDirection * Math.cos(currentAngle + Math.PI / 2) * (Math.random() * 5 + 2),
            vy: Math.sin(currentAngle + Math.PI / 2) * (Math.random() * 5 + 2),
            lifetime: 200 + Math.random() * 100, maxLifetime: 300,
            size: Math.random() * 4 + 2, color: 'cyan'
        });
    }
}

