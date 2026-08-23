// EXTRACTED FROM js/skills.js — Aries: Gate of Babylon + Enuma Elish.
// Copied VERBATIM (not reimplemented) so test-aries-vfx.html renders exactly
// what the real game renders. If the mechanic in js/skills.js changes, re-copy
// the block below from there (search "Aries: Gate of Babylon + Enuma Elish").
// The trigger wrapper at the bottom mimics the proc conditions that live in
// js/entities.js's dealDamage() (cong_babylon/enuma_elish blocks), since this
// harness doesn't load the real damage pipeline.

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

const GOB_SWORD_COUNT = 14, GOB_SWORD_SPEED = 20, GOB_SWORD_DMG_BASE = 40, GOB_SWORD_DMG_PCT = 0.03;

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

const EE_DMG_PCT = 0.14, EE_DMG_CAP = 12000, EE_BEAM_HALF = 50;

function updateEnumaElish(deltaTime) {
    if (!window._eeSequences || window._eeSequences.length === 0) return;
    const dt = deltaTime / 16.67;
    const now = performance.now();
    for (let si = window._eeSequences.length - 1; si >= 0; si--) {
        const seq = window._eeSequences[si];
        const elapsed = now - seq.startTime;

        if (elapsed >= 200 && elapsed < 600 && Math.random() > 0.5) {
            createParticles(seq.x + (Math.random() - 0.5) * 120, seq.y - Math.random() * 150, 2, '#dc2626', 2, 5);
        }

        if (elapsed >= 600 && seq.phase === 0) {
            seq.phase = 1;
            _setShake(12, 300);
            window._eeScreenFlash = 0.8;
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
                if (Math.random() > 0.7) createParticles(en.x, en.y, 5, '#fca5a5', 2, 5);
                if (seq.hitEnemies.has(en)) continue;
                seq.hitEnemies.add(en);
                const dmg = Math.min(EE_DMG_CAP, Math.ceil(en.hp * EE_DMG_PCT));
                dealDamage(en, { damage: dmg, isTrueDamage: true, _isEeSpear: true, _noHitSfx: true, _statSrc: 'Aries: Enuma Elish' });
                particles.push({ isEeSlash: true, x: en.x, y: en.y, angle: seq.angle + (Math.random() - 0.5) * 0.5, lifetime: 400, maxLifetime: 400 });
            }
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

// --- Harness-only trigger wrapper -----------------------------------------
// Mirrors the proc conditions from js/entities.js's dealDamage() (search
// "cong_babylon" / "enuma_elish" there) since this page doesn't load the
// real damage pipeline.
function dealDamageAndMaybeTriggerAries(enemy, source) {
    dealDamage(enemy, source);
    const now = performance.now();

    if (_hasBuff('cong_babylon') && now >= (window._gobCooldownEnd || 0)) {
        window._gobCooldownEnd = now + 4500;
        window._gobSequences = window._gobSequences || [];
        window._gobSequences.push(_createGobSequence(now));
    }

    if (_hasBuff('enuma_elish')) {
        window._eeHitCounter = (window._eeHitCounter || 0) + 1;
        if (window._eeHitCounter >= 40) {
            window._eeHitCounter = 0;
            const target = _eeFindPriorityTarget();
            if (target) {
                window._eeSequences = window._eeSequences || [];
                window._eeSequences.push(_createEeSequence(now, target));
            }
        }
    }
}
