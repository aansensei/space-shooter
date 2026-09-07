// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/skills/sigil-libra.js — split out of the old monolithic js/skills.js.
// Libra sigil: Blood Arrow's Sol Arrow queue/windup/flight (the 3-arrow
// volley Skill A fires when Libra is equipped) and its Astral Pierce
// pass-through variant.

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
    // Cocoon itself can't be damaged directly at all - the closest estimate
    // this DR-based formula has for "immune", so Sol Arrow doesn't rate it
    // as a juicy target over the Guards actually protecting it.
    if (enemy.type === 'thaelis_cocoon') dr += 0.99;
    if (enemy.type === 'thaelis_guard') dr += THAELIS_COCOON_GUARD_DR;
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

// Every Skill A cast fires 3 arrows: 1 big one marking the toughest enemy on
// screen (highest current HP+shield), and 2 smaller ones marking random
// enemies (biased toward denser clusters).
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
                        // "PE") - description always meant 20% of the TARGET's own Max HP
                        // like every other sigil's %-based hits, fixed to actually do that
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

