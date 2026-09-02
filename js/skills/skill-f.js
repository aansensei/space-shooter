// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/skill-f.js — split out of the old monolithic js/skills.js.
// Skill F: Annihilation Sweep - the sweep cast/cone/collision loop, and its
// Great Sage kill hook (Ransacked Treasury cone growth + gem grant).

// Records a Skill F kill for the Great Sage sigil: every kill widens the
// current sweep's cone (Ransacked Treasury), and a kill on an Elite-or-
// higher enemy also plunders that enemy's own gem, immediately, one of each
// kind held at a time (max 3)
function _onSkillFKill(enemy) {
    _skillFKillsThisSweep++;
    if (!_hasBuff('cuop_bao_tang')) return;
    _skillFHitFlashes.push({ x: enemy.x, y: enemy.y, r: (enemy.size || 20) + 5, time: performance.now() });
    if (window.AudioMgr) window.AudioMgr.playSfxAt('great-sage-hit', enemy.x, enemy.y);
    _grantGreatSageGem(enemy);
}

function activateSkillF() {
    const currentTime = performance.now();
    if (typeof player !== "undefined" && player._silenced) return; // Silence
    if (gameState !== "playing" || window._sigilPicker) return;

    // Great Sage: releasing a banked gem takes priority over the normal
    // cast and never touches Skill F's own charge/cooldown cycle at all -
    // Annihilation Sweep already kills nearly everything it crosses each
    // pass, so bundling another full sweep onto every single gem spend was
    // redundant. Works whether Skill F itself is ready or on cooldown.
    if (_hasBuff('cuop_bao_tang') && _greatSageGems.length > 0) {
        // 72 Transformations: holding a full set of 3 different gems makes
        // the one being spent hit 1.5x as hard - a passive reward for
        // staying topped up, not a separate "burst all 3 at once" trigger.
        // Every press still spends exactly 1 gem (oldest first).
        const comboMult = (_hasBuff('bien_hoa_72') && _greatSageGems.length >= 3) ? 1.5 : 1;
        _castStolenGemAttack(_greatSageGems.shift(), comboMult);
        return;
    }

    const onCooldown = currentTime - lastSkillF <= skillFCooldown;
    if (skillFState === "ready" && !onCooldown) {
        lastSkillF = currentTime;
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
        // Ransacked Treasury: the cone widens with every kill landed this
        // sweep, not with elapsed time, snowballing up to 4.5x its base width
        const coneHalfWidth = _hasBuff('cuop_bao_tang') ? Math.min(0.2 * (1 + _skillFKillsThisSweep * 0.5), 0.2 * 4.5) : 0.2;

        for (let enemy of enemies) {
            if (enemy.hitBySkillF) continue;
            if (enemy.type === 'abyssal_chain') continue; // piercing, immune to skill F
            if (enemy.type === 'veilshroud_echo') continue; // untargetable
            if (enemy.inCoronation) continue;
            let angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < canvas.width && angle < currentAngle && angle > currentAngle - coneHalfWidth) {
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

