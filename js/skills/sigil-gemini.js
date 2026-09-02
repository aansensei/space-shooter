// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/sigil-gemini.js — split out of the old monolithic js/skills.js.
// Gemini sigil: Shadow Twin's phantom-volley proc (every 10th allied hit)
// and its orbs, plus Mirror Laser's bonus piercing-column proc.

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