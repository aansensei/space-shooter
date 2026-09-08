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
        // Cocoon is fully untargetable (dealDamage() no-ops on it) - without
        // this it wins primary-target picks on HP alone and every arrow
        // wastes itself hitting it instead of an actually-killable Guard.
        && e.type !== 'thaelis_cocoon'
    );
}

function _pickSolArrowPrimaryTarget() {
    const validTargets = _solArrowValidTargets();
    if (validTargets.length === 0) return null;
    return validTargets.reduce((a, b) =>
        (a.hp + (a.shield || 0)) >= (b.hp + (b.shield || 0)) ? a : b
    );
}

// Random pick biased toward enemies sitting in denser clusters, excluding
// every enemy already in excludeList (falls back to the full target pool,
// repeats allowed, once every enemy on screen has already been used once).
function _pickSolArrowSecondaryTarget(excludeList) {
    const validTargets = _solArrowValidTargets();
    if (validTargets.length === 0) return null;
    const excludeSet = excludeList && excludeList.length ? new Set(excludeList) : null;
    const pool = excludeSet ? validTargets.filter(e => !excludeSet.has(e)) : validTargets;
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

// Dark Fantasy ink-wash redesign: visual tuning shared between this file
// (particle/bloom spawning below) and the draw code in render/skill-a.js.
// vecScale feeds the arrowhead's own ctx.scale() for its bezier shape;
// every other field is already a final on-screen pixel size.
const SOL_ARROW_CFG = {
    primary: {
        vecScale: 2.8,
        color: 'rgba(220, 10, 20, 0.95)', inkColor: 'rgba(5, 0, 5, 0.9)', glint: 'rgba(255, 200, 150, 1.0)',
        trailRate: 7, dropletBase: 5, mistBase: 9, tendrilBase: 2.4,
        impactSize: 220, numPetals: 8, numStamens: 16, petalLen: 75, stamenLen: 120,
    },
    secondary: {
        vecScale: 1.5,
        color: 'rgba(180, 10, 15, 0.9)', inkColor: 'rgba(10, 0, 5, 0.8)', glint: 'rgba(255, 150, 100, 0.8)',
        trailRate: 3, dropletBase: 3, mistBase: 5, tendrilBase: 1.4,
        impactSize: 90, numPetals: 6, numStamens: 10, petalLen: 40, stamenLen: 60,
    },
};

// Maps onto the real Full/Medium/Low/Min quality tiers (window._gfxLevel,
// see render/core.js) - each step down only trims what's actually costly at
// that tier (shadowBlur, particle/petal counts), never removes a whole
// phase. Medium stays close to Full on purpose; Low is where shadowBlur
// turns off entirely, matching every other effect in the game.
function _solArrowGfxTier() {
    const lvl = window._gfxLevel || 0;
    if (lvl <= 0) return { shadowMul: 1.0, trailMul: 1.0, petalMul: 1.0, mistChance: 1.0 };
    if (lvl === 1) return { shadowMul: 0.6, trailMul: 0.85, petalMul: 1.0, mistChance: 0.85 };
    if (lvl === 2) return { shadowMul: 0, trailMul: 0.5, petalMul: 0.75, mistChance: 0.5 };
    return { shadowMul: 0, trailMul: 0.25, petalMul: 0.5, mistChance: 0.25 };
}

function _spawnSolArrowParticle(p) {
    p.drag = p.drag || 1.0;
    window._solArrowParticles = window._solArrowParticles || [];
    window._solArrowParticles.push(p);
}

function _spawnSolArrowFlash(x, y, size, color) {
    window._solArrowParticles = window._solArrowParticles || [];
    window._solArrowParticles.push({ x, y, vx: 0, vy: 0, ax: 0, ay: 0, drag: 1, type: 'flash', size, color, life: 0, maxLife: 18 });
}

// On-hit blood-flower bloom (a red spider lily / higanbana silhouette) -
// replaces the old flat gold addExplosion() on Blood Arrow's primary-target
// hit. Plain object + petals/stamens arrays, matching how _solArrows itself
// is a plain-state-object array rather than a class.
function _spawnSolArrowLily(x, y, isPrimary, angleOffset) {
    const cfg = isPrimary ? SOL_ARROW_CFG.primary : SOL_ARROW_CFG.secondary;
    const gfx = _solArrowGfxTier();
    const petalCount = Math.max(4, Math.round(cfg.numPetals * gfx.petalMul));
    const stamenCount = Math.max(4, Math.round(cfg.numStamens * gfx.petalMul));
    const lily = { x, y, isPrimary, cfg, angleOffset: angleOffset || 0, life: 0, maxLife: 160, petals: [], stamens: [] };
    for (let i = 0; i < petalCount; i++) {
        lily.petals.push({
            angle: (Math.PI * 2 / petalCount) * i + (Math.random() - 0.5) * 0.6 + lily.angleOffset,
            length: cfg.petalLen * (0.8 + Math.random() * 0.4),
            curl: (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.5),
            delay: Math.random() * 15,
        });
    }
    for (let i = 0; i < stamenCount; i++) {
        lily.stamens.push({
            angle: (Math.PI * 2 / stamenCount) * i + (Math.random() - 0.5) * 0.9 + lily.angleOffset,
            length: cfg.stamenLen * (0.8 + Math.random() * 0.4),
            curl: (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.4),
            delay: 10 + Math.random() * 20,
        });
    }
    window._solArrowLilies = window._solArrowLilies || [];
    window._solArrowLilies.push(lily);
    _spawnSolArrowFlash(x, y, cfg.impactSize * 0.7, 'rgba(255, 180, 180, 0.95)');
}

function updateSolArrowParticles(deltaTime) {
    const arr = window._solArrowParticles;
    if (!arr || arr.length === 0) return;
    const dt = deltaTime / 16.67;
    for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.life += dt;
        if (p.life >= p.maxLife) { arr.splice(i, 1); continue; }
        p.vx += p.ax * dt; p.vy += p.ay * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const dragFactor = Math.pow(p.drag, dt);
        p.vx *= dragFactor; p.vy *= dragFactor;
        if (p.type === 'droplet') p.scale *= Math.pow(0.96, dt);
        else if (p.type === 'mist' || p.type === 'charge_mist') p.scale += 0.6 * dt;
        else if (p.type === 'shard') { p.angle = (p.angle || 0) + (p.rotSpeed || 0) * dt; p.scale *= Math.pow(0.985, dt); }
    }
}

function updateSolArrowLilies(deltaTime) {
    const arr = window._solArrowLilies;
    if (!arr || arr.length === 0) return;
    const dt = deltaTime / 16.67;
    const gfx = _solArrowGfxTier();
    for (let i = arr.length - 1; i >= 0; i--) {
        const lily = arr[i];
        lily.life += dt;
        if (lily.life > 20 && lily.life < 110 && Math.random() < 0.5 * dt * gfx.mistChance) {
            _spawnSolArrowParticle({
                x: lily.x + (Math.random() - 0.5) * 25, y: lily.y + (Math.random() - 0.5) * 25,
                vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2.5 - 0.5,
                ax: 0, ay: 0, drag: 0.98,
                type: 'mist', scale: (lily.cfg.mistBase * 0.8) * (1.5 + Math.random()),
                color: lily.cfg.inkColor, life: 0, maxLife: 70 + Math.random() * 40,
            });
        }
        if (lily.life >= lily.maxLife) arr.splice(i, 1);
    }
}

function _queueSolArrowOne(isPrimary, marked) {
    if (!window._solArrows) window._solArrows = [];
    // Per-arrow phase offset so the body's liquid wobble (see drawSolArrows)
    // undulates independently instead of every arrow breathing in sync.
    const bloodPhase = Math.random() * Math.PI * 2;
    if (!marked) {
        // No enemy on screen yet — bank the shot, it fires the instant one appears
        window._solArrows.push({ state: 'pending', isPrimary, bloodPhase });
        return;
    }
    window._solArrows.push({
        state: 'windup', windupStart: performance.now(), windupDuration: 500,
        target: marked, x: player.x, y: player.y, vx: 0, vy: 0,
        hitEnemies: new Set(), isPrimary, bloodPhase,
    });
    if (window.AudioMgr) window.AudioMgr.playSfx('skill-a-orb-lock');
}

// Every Skill A cast fires 5 arrows: 1 big one marking the toughest enemy on
// screen (highest current HP+shield), and 4 smaller ones each preferring a
// different enemy from the big one and from every other small arrow already
// queued this same volley (still biased toward denser clusters among
// whatever's left to pick from) - only repeats a target once every enemy on
// screen has already been marked once.
function _queueSolArrow() {
    const primary = _pickSolArrowPrimaryTarget();
    _queueSolArrowOne(true, primary);
    const used = primary ? [primary] : [];
    for (let i = 0; i < 4; i++) {
        const target = primary ? _pickSolArrowSecondaryTarget(used) : null;
        _queueSolArrowOne(false, target);
        if (target) used.push(target);
    }
}

function updateSolArrows(deltaTime) {
    const dt = deltaTime / 16.67;
    const now = performance.now();
    const gfx = _solArrowGfxTier();
    for (let i = (window._solArrows || []).length - 1; i >= 0; i--) {
        const arrow = window._solArrows[i];
        if (arrow.state === 'pending') {
            const marked = arrow.isPrimary
                ? _pickSolArrowPrimaryTarget()
                : _pickSolArrowSecondaryTarget([_pickSolArrowPrimaryTarget()]);
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
            // Ink-red energy converging on the player while charging (Dark
            // Fantasy ink-wash redesign) - only the volley's primary arrow
            // drives this so 5 queued arrows charging together don't spawn
            // 5x the particles/flash for what is really one shared windup.
            if (arrow.isPrimary) {
                let crate = 4 * dt * gfx.trailMul;
                let cwhole = Math.floor(crate);
                if (Math.random() < (crate - cwhole)) cwhole++;
                for (let ci = 0; ci < cwhole; ci++) {
                    const dist = 14 + Math.random() * 20;
                    const ang = Math.random() * Math.PI * 2;
                    const speed = 1.6;
                    _spawnSolArrowParticle({
                        x: player.x + Math.cos(ang) * dist, y: player.y + Math.sin(ang) * dist,
                        vx: -Math.cos(ang) * speed, vy: -Math.sin(ang) * speed,
                        ax: 0, ay: 0, drag: 0.97,
                        type: 'mist', scale: 1.5 + Math.random() * 1.5, color: 'rgba(220, 10, 20, 0.35)',
                        life: 0, maxLife: 30,
                    });
                }
                // Wider inward-spiraling mist ring, converging on the player
                // from well outside the small local puff above - the bigger,
                // more dramatic charge-up read from the standalone VFX demo.
                let mrate = 5 * dt * gfx.trailMul;
                let mwhole = Math.floor(mrate);
                if (Math.random() < (mrate - mwhole)) mwhole++;
                for (let mi = 0; mi < mwhole; mi++) {
                    const mdist = 130 + Math.random() * 80;
                    const mang = Math.random() * Math.PI * 2;
                    const mspeed = 4.5;
                    _spawnSolArrowParticle({
                        x: player.x + Math.cos(mang) * mdist, y: player.y + Math.sin(mang) * mdist,
                        vx: -Math.cos(mang) * mspeed + Math.sin(mang) * 2.0, vy: -Math.sin(mang) * mspeed - Math.cos(mang) * 2.0,
                        ax: 0, ay: 0, drag: 0.97,
                        type: 'charge_mist', scale: 2.5 + Math.random() * 2, color: 'rgba(220, 10, 20, 0.35)',
                        life: 0, maxLife: 40,
                    });
                }
                // Slow-building glow at the charge point, brightest right as
                // the windup finishes.
                const glowT = Math.min(1, (now - arrow.windupStart) / arrow.windupDuration);
                _spawnSolArrowFlash(player.x, player.y, 90 * glowT, 'rgba(180, 0, 10, 0.2)');
            }
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
                // Bright ignition burst + launch sfx the instant the volley
                // fires - once per volley (primary only), since all 5 arrows
                // leave together and this should read as one shot, not five.
                if (arrow.isPrimary) {
                    _spawnSolArrowFlash(player.x, player.y, 220, 'rgba(255, 50, 50, 0.95)');
                    if (window.AudioMgr) window.AudioMgr.playSfxAt('blood-arrow-launch', player.x, player.y);
                }
            }
            continue;
        }
        if (arrow.state === 'flying') {
            arrow.x += arrow.vx * dt;
            arrow.y += arrow.vy * dt;

            // Trail: droplets/mist/tendrils breaking off the flight path,
            // same shared visual language as the charge and impact phases.
            const cfg = arrow.isPrimary ? SOL_ARROW_CFG.primary : SOL_ARROW_CFG.secondary;
            let trate = cfg.trailRate * dt * gfx.trailMul;
            let twhole = Math.floor(trate);
            if (Math.random() < (trate - twhole)) twhole++;
            const speedNow = Math.hypot(arrow.vx, arrow.vy) || 1;
            for (let ti = 0; ti < twhole; ti++) {
                const rnd = Math.random();
                if (rnd < 0.3) {
                    _spawnSolArrowParticle({
                        x: arrow.x, y: arrow.y,
                        vx: arrow.vx * 0.15 + (Math.random() - 0.5) * 3, vy: arrow.vy * 0.15 + (Math.random() - 0.5) * 3,
                        ax: 0, ay: 0, drag: 0.92,
                        type: 'droplet', scale: cfg.dropletBase * (0.6 + Math.random() * 0.6),
                        color: cfg.color, life: 0, maxLife: 20 + Math.random() * 20,
                    });
                } else if (rnd < 0.6) {
                    _spawnSolArrowParticle({
                        x: arrow.x + (Math.random() - 0.5) * 10, y: arrow.y + (Math.random() - 0.5) * 10,
                        vx: arrow.vx * 0.02, vy: arrow.vy * 0.02 + (Math.random() - 0.5) * 1,
                        ax: 0, ay: 0, drag: 0.98,
                        type: 'mist', scale: cfg.mistBase * (0.8 + Math.random() * 0.7),
                        color: cfg.inkColor, life: 0, maxLife: 35 + Math.random() * 25,
                    });
                } else if (rnd < 0.8) {
                    _spawnSolArrowParticle({
                        x: arrow.x, y: arrow.y,
                        vx: arrow.vx * 0.3 + (Math.random() - 0.5) * 2, vy: arrow.vy * 0.3 + (Math.random() - 0.5) * 2,
                        ax: -(arrow.vx / speedNow) * 0.5, ay: -(arrow.vy / speedNow) * 0.5, drag: 0.88,
                        type: 'tendril', scale: cfg.tendrilBase, color: cfg.color,
                        life: 0, maxLife: 12 + Math.random() * 12,
                        angle: Math.atan2(arrow.vy, arrow.vx) + (Math.random() - 0.5) * 0.6,
                    });
                } else {
                    // Small blood-chunk fragments peeling off sideways from
                    // the wobbling wing, distinct from the fine ink-mist and
                    // thin tendrils above - the "little pieces" breaking off
                    // a moving mass of blood, not just a spray of dust.
                    const side = Math.random() < 0.5 ? -1 : 1;
                    const perpX = -(arrow.vy / speedNow), perpY = arrow.vx / speedNow;
                    _spawnSolArrowParticle({
                        x: arrow.x + perpX * side * cfg.vecScale * 8, y: arrow.y + perpY * side * cfg.vecScale * 8,
                        vx: arrow.vx * 0.1 + perpX * side * 1.5 + (Math.random() - 0.5), vy: arrow.vy * 0.1 + perpY * side * 1.5 + (Math.random() - 0.5),
                        ax: 0, ay: 0.15, drag: 0.94,
                        type: 'shard', scale: cfg.dropletBase * (0.8 + Math.random() * 0.5), color: cfg.color,
                        angle: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.3,
                        life: 0, maxLife: 25 + Math.random() * 20,
                    });
                }
            }

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
                        // Blood-flower bloom (red spider lily / higanbana) instead of a flat gold explosion
                        _spawnSolArrowLily(arrow.x, arrow.y, arrow.isPrimary, Math.atan2(arrow.vy, arrow.vx));
                        if (window.AudioMgr) window.AudioMgr.playSfxAt('blood-arrow-impact', arrow.x, arrow.y);
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
    // Runs even with no arrows left in flight - the impact bloom's own
    // lingering mist particles need to keep animating after the arrow that
    // spawned them is long gone.
    updateSolArrowParticles(deltaTime);
    updateSolArrowLilies(deltaTime);
}

