// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/entities/uriel.js — Uriel, the Covenant King. A herald-boss that never
// attacks the player directly: it shields the whole horde (Covenant King),
// punishes a broken ward with a Holy Sword (Judgment), vanishes and comes
// back tankier (Camouflage), dodges more the fuller the horde still is
// (Against Chaos), and leaves a stationary barrier at its death spot
// (Protection). Must load after entities/core.js and before main.js.

function spawnUriel() {
    const baseSize = 20 + Math.random() * 10;
    const size = baseSize * 5;
    const t10 = Math.floor(gameElapsedTime / 10000);
    const hp = Math.ceil(Math.min(3600, 1500 + t10 * 60) * 1.15 * _walpurgisHpMult());
    window._lastUrielSpawn = performance.now();
    enemies.push({
        x: size / 2 + Math.random() * (canvas.width - size),
        y: size / 2 + Math.random() * (canvas.height * 0.5 - size),
        wpX: 0, wpY: 0,
        size, speed: 1.4,
        hp, maxHp: hp,
        isTargetedByA: false, hitBySkillF: false, laserHit: false, shield: 0,
        ironBodyHits: 1, // Covenant King grants its own first Iron Body layer immediately on spawn
        type: 'uriel',
        _selfIBTimer: 0,
        _urielScanTimer: 0,
        _stealthed: false, _camoPhase: 'idle', _camoTimer: 0,
        _stealthIBEnd: 0, _camoCDReadyAt: 0, _camoFlatDREnd: 0,
        _swordCharging: false, _swordFiring: false, _swordChargeStart: 0, _swordReleaseAt: 0,
        _urielSwordQueued: 0,
        _urielEvade: 0.99, _dodgeSpeedBuffs: [],
        _fxScanRings: [], _fxSelfPulses: [], _fxChargeMotes: [], _fxIronBursts: [],
    });
    _urielPickWaypoint(enemies[enemies.length - 1]);
}

function _urielPickWaypoint(enemy) {
    enemy.wpX = enemy.size / 2 + Math.random() * (canvas.width - enemy.size);
    enemy.wpY = enemy.size / 2 + Math.random() * (canvas.height * 0.5 - enemy.size);
}

// Against Chaos: starts at 99% evade, permanently down 3% every time a hit
// actually lands, floored at 40% (never recovers on its own).
function _urielCurrentEvade(enemy) {
    if (enemy._urielEvade === undefined) enemy._urielEvade = 0.99;
    return enemy._urielEvade;
}

function _urielSpeedMult(enemy) {
    const now = performance.now();
    enemy._dodgeSpeedBuffs = (enemy._dodgeSpeedBuffs || []).filter(t => now < t);
    return 1 + Math.min(0.40, enemy._dodgeSpeedBuffs.length * 0.05);
}

// Called from dealDamage (entities/core.js) on a successful Against Chaos
// evade roll: leaves Uriel faster while it lasts (stacking +5% move speed,
// capped +40%, 1s window per stack).
function _urielOnDodge(enemy) {
    const now = performance.now();
    enemy._dodgeSpeedBuffs = (enemy._dodgeSpeedBuffs || []).filter(t => now < t);
    if (enemy._dodgeSpeedBuffs.length < 8) enemy._dodgeSpeedBuffs.push(now + 1000);
}

// Called from dealDamage (entities/core.js) every time a hit actually
// lands on Uriel's own body (evade roll failed): permanently knocks 3% off
// Against Chaos's own evade (floor 40%), and a hexagonal facet ring flashes
// outward, reading as "a real layer of protection just ate that".
function _urielOnHitLanded(enemy) {
    enemy._urielEvade = Math.max(0.40, (enemy._urielEvade === undefined ? 0.99 : enemy._urielEvade) - 0.03);
    enemy._fxIronBursts = enemy._fxIronBursts || [];
    enemy._fxIronBursts.push({ t: 0 });
}

// Called from dealDamage (entities/core.js) every time a granted Uriel Iron
// Body layer on ANY enemy absorbs a hit. Feeds Camouflage (tries every
// time) and Judgment (tries every 3rd consumption).
function _urielOnIBConsumed() {
    window._urielIBConsumed = (window._urielIBConsumed || 0) + 1;
    const uriel = enemies.find(e => e.type === 'uriel' && e.hp > 0);
    if (!uriel) return;
    _urielTriggerCamo(uriel);
    if (window._urielIBConsumed % 3 === 0) _urielTriggerSword(uriel);
}

function _urielTriggerCamo(enemy) {
    const now = performance.now();
    if (enemy._camoPhase !== 'idle' || now < (enemy._camoCDReadyAt || 0)) return;
    // A charge already underway gets cancelled and banked as a queued shot
    // rather than firing invisibly.
    if (enemy._swordCharging) {
        enemy._swordCharging = false;
        enemy._urielSwordQueued = (enemy._urielSwordQueued || 0) + 1;
    }
    // A brief visible windup (energy gathering in) before it actually
    // vanishes, rather than snapping straight to invisible.
    enemy._camoPhase = 'stealthing';
    enemy._camoTimer = 0;
    enemy.ironBodyHits = Math.max(enemy.ironBodyHits, 999);
}

function _urielUpdateCamouflage(enemy, deltaTime) {
    const now = performance.now();
    enemy._camoTimer = (enemy._camoTimer || 0) + deltaTime;
    if (enemy._camoPhase === 'stealthing') {
        if (enemy._camoTimer >= 300) {
            enemy._camoPhase = 'stealthed';
            enemy._camoTimer = 0;
            enemy._stealthed = true;
            enemy._stealthIBEnd = now + 1500;
            window._urielMotes = window._urielMotes || [];
            for (let k = 0; k < 10; k++) {
                const a = Math.random() * Math.PI * 2;
                window._urielMotes.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * 0.9, vy: Math.sin(a) * 0.9, life: 1, glow: true });
            }
        }
    } else if (enemy._camoPhase === 'stealthed') {
        if (enemy._camoTimer >= 1500) {
            enemy._stealthed = false;
            enemy._camoCDReadyAt = now + 3000;
            _addEnemyShield(enemy, Math.ceil(enemy.maxHp * 0.20));
            enemy._camoFlatDREnd = now + 2000;
            enemy._camoPhase = 'shielded';
            enemy._camoTimer = 0;
            createParticles(enemy.x, enemy.y, 20, '#fff4cc', 3, 9);
        }
    } else if (enemy._camoPhase === 'shielded') {
        if (enemy._camoTimer >= 2000) {
            enemy._camoPhase = 'idle';
            enemy._camoTimer = 0;
        }
    }
}

// Judgment (Holy Sword). Queues instead of charging while Uriel is
// stealthed; queued shots auto-release from updateUriel() the instant it's
// visible and free again.
function _urielTriggerSword(enemy) {
    if (enemy._stealthed || enemy._swordCharging || enemy._swordFiring) {
        enemy._urielSwordQueued = (enemy._urielSwordQueued || 0) + 1;
        return;
    }
    _urielStartSword(enemy);
}

function _urielStartSword(enemy) {
    enemy._swordCharging = true;
    enemy._swordChargeStart = performance.now();
}

function _urielUpdateSword(enemy) {
    const now = performance.now();
    if (enemy._swordCharging && now - enemy._swordChargeStart >= 500) {
        enemy._swordCharging = false;
        enemy._swordFiring = true;
        enemy._swordReleaseAt = now;
        _urielLaunchSword(enemy);
    } else if (enemy._swordFiring && now - enemy._swordReleaseAt > 250) {
        enemy._swordFiring = false;
    }
}

function _urielLaunchSword(enemy) {
    const hist = player._posHistory || [];
    const now = performance.now();
    let aim = { x: player.x, y: player.y };
    for (const p of hist) { if (now - p.t >= 100) aim = p; }
    const ang = Math.atan2(aim.y - enemy.y, aim.x - enemy.x);
    const spd = 806 / 60; // 806px/s baseline, expressed per 16.67ms frame like every other enemy projectile
    window._urielHolySwords = window._urielHolySwords || [];
    window._urielHolySwords.push({
        x: enemy.x, y: enemy.y, ang,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        life: 1, _releaseFlash: 1, hitSentinels: [],
    });
    _setShake(6, 150);
    addExplosion(enemy.x, enemy.y, enemy.size * 0.6, '#fff4cc');
    if (window.AudioMgr) window.AudioMgr.playSfxAt('uriel-holy-sword', enemy.x, enemy.y);
}

function updateUriel(enemy, deltaTime) {
    const dt = deltaTime / 16.67;

    _urielUpdateCamouflage(enemy, deltaTime);

    // Movement: patrol the upper half only, weaving between waypoints,
    // never rushing the player. Frozen while stealthed.
    if (!enemy._stealthed) {
        const dx = enemy.wpX - enemy.x, dy = enemy.wpY - enemy.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) {
            _urielPickWaypoint(enemy);
        } else {
            const sp = enemy.speed * _urielSpeedMult(enemy);
            enemy.x += (dx / dist) * sp * dt;
            enemy.y += (dy / dist) * sp * dt;
        }
    }

    // Self Iron Body: refresh 1 layer every 2s (never stacks past 1). A
    // soft white pulse ring sells the moment the layer actually refreshes.
    enemy._selfIBTimer += deltaTime;
    if (enemy._selfIBTimer >= 2000) {
        enemy._selfIBTimer = 0;
        if (!enemy._stealthed) enemy.ironBodyHits = Math.max(enemy.ironBodyHits, 1);
        enemy._fxSelfPulses.push({ t: 0 });
    }

    // Horde scan: every 1s, grant CC immunity + a Uriel Iron Body layer
    // (re-granted every 5s per enemy) to every other living enemy. A gold
    // ring expands outward from the body each time the scan actually fires.
    enemy._urielScanTimer += deltaTime;
    if (enemy._urielScanTimer >= 1000) {
        enemy._urielScanTimer = 0;
        enemy._fxScanRings.push({ r: enemy.size / 2, t: 0 });
        const now = performance.now();
        for (const e of enemies) {
            if (e === enemy || e.type === 'uriel' || e.hp <= 0 || e.type.startsWith('enemy_bullet')) continue;
            e._urielCCImmune = true;
            if (!e._urielIB && (!e._urielIBAt || now - e._urielIBAt >= 5000)) {
                e._urielIB = true;
            }
        }
    }

    // Idle ambient motes drifting up off the body while visible - a
    // constant small tell that something alive/holy is hovering there.
    if (!enemy._stealthed && Math.random() < 0.5) {
        window._urielMotes = window._urielMotes || [];
        window._urielMotes.push({
            x: enemy.x + (Math.random() - 0.5) * enemy.size * 0.8,
            y: enemy.y + enemy.size * 0.3,
            vy: -(0.3 + Math.random() * 0.23), life: 1,
        });
    }

    // Charge motes: while Judgment charges, particles gather in from
    // around the body and converge on its current position.
    if (enemy._swordCharging && Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2;
        const dist = (enemy.size / 2) * (1.8 + Math.random() * 1.4);
        enemy._fxChargeMotes.push({ x: enemy.x + Math.cos(a) * dist, y: enemy.y + Math.sin(a) * dist, t: 0, dur: 0.35 + Math.random() * 0.15 });
    }

    // Decay every short-lived fx array (dt in seconds to match the
    // 0-1s-ish lifetimes these were tuned against).
    const dtSec = deltaTime / 1000;
    for (let i = enemy._fxSelfPulses.length - 1; i >= 0; i--) { enemy._fxSelfPulses[i].t += dtSec; if (enemy._fxSelfPulses[i].t > 0.5) enemy._fxSelfPulses.splice(i, 1); }
    for (let i = enemy._fxScanRings.length - 1; i >= 0; i--) { enemy._fxScanRings[i].t += dtSec; enemy._fxScanRings[i].r += dtSec * 260; if (enemy._fxScanRings[i].t > 1.1) enemy._fxScanRings.splice(i, 1); }
    for (let i = enemy._fxIronBursts.length - 1; i >= 0; i--) { enemy._fxIronBursts[i].t += dtSec; if (enemy._fxIronBursts[i].t > 0.5) enemy._fxIronBursts.splice(i, 1); }
    for (let i = enemy._fxChargeMotes.length - 1; i >= 0; i--) {
        const m = enemy._fxChargeMotes[i]; m.t += dtSec;
        const p = Math.min(1, m.t / m.dur);
        m.cx = m.x + (enemy.x - m.x) * (p * p); m.cy = m.y + (enemy.y - m.y) * (p * p);
        if (p >= 1) enemy._fxChargeMotes.splice(i, 1);
    }

    _urielUpdateSword(enemy);

    if (enemy._urielSwordQueued > 0 && !enemy._swordCharging && !enemy._swordFiring && !enemy._stealthed) {
        enemy._urielSwordQueued--;
        _urielStartSword(enemy);
    }
}

// Fired once from the fx tail (main.js) every frame: moves Holy Swords,
// resolves their player/Sentinel hits, and counts down active death
// barriers. Barrier occlusion itself is checked at each hazard's own hit
// test (skill-d.js, skill-f.js, main.js's bullet loop and Overload Laser).
function _updateUrielEffects(deltaTime) {
    const dt = deltaTime / 16.67;
    const now = performance.now();

    const motes = window._urielMotes;
    if (motes && motes.length) {
        for (let i = motes.length - 1; i >= 0; i--) {
            const m = motes[i];
            m.y += m.vy * dt; if (m.vx) m.x += m.vx * dt;
            m.life -= dt * 0.6;
            if (m.life <= 0) motes.splice(i, 1);
        }
    }

    const swords = window._urielHolySwords;
    if (swords && swords.length) {
        for (let i = swords.length - 1; i >= 0; i--) {
            const s = swords[i];
            s.x += s.vx * dt; s.y += s.vy * dt;
            if (s._releaseFlash > 0) s._releaseFlash -= dt * 0.08;

            // Fading motion trail, plus the odd sparkle mote flung off the
            // blade mid-flight - reads as a real flying weapon, not a
            // sprite sliding across the screen.
            s.trail = s.trail || [];
            s.trail.push({ x: s.x, y: s.y, time: now });
            while (s.trail.length > 0 && now - s.trail[0].time > 300) s.trail.shift();
            if (Math.random() < 0.4) {
                window._urielMotes = window._urielMotes || [];
                window._urielMotes.push({ x: s.x + (Math.random() - 0.5) * 30, y: s.y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, life: 1, glow: true });
            }

            if (!s._hitPlayer && Math.hypot(s.x - player.x, s.y - player.y) < 46 + player.hitRadius) {
                s._hitPlayer = true;
                if (playerTakesHit({ type: 'uriel_holysword' })) {
                    player._urielJudgedEnd = performance.now() + 3000;
                }
                addExplosion(s.x, s.y, 60, '#ffe27a');
                createParticles(s.x, s.y, 20, '#fff4cc', 3, 9);
            }
            for (const sen of sentinels) {
                if (sen.hp <= 0 || s.hitSentinels.includes(sen)) continue;
                if (Math.hypot(s.x - sen.x, s.y - sen.y) < 46 + sen.size / 2) {
                    s.hitSentinels.push(sen);
                    dealDamage(sen, { damage: Math.ceil(sen.maxHp * 0.30), isTrueDamage: true, isPiercing: true, _statSrc: 'Uriel: Holy Sword' });
                    addExplosion(sen.x, sen.y, 40, '#bfe0ff');
                }
            }
            if (s.x < -100 || s.x > canvas.width + 100 || s.y < -100 || s.y > canvas.height + 100) {
                swords.splice(i, 1);
            }
        }
    }

    const barriers = window._urielBarriers;
    if (barriers && barriers.length) {
        for (let i = barriers.length - 1; i >= 0; i--) {
            const b = barriers[i];
            b.life -= deltaTime;
            if (b.life <= 0) {
                // Dispersal sparkle right as it fully vanishes.
                window._urielMotes = window._urielMotes || [];
                for (let k = 0; k < 20; k++) {
                    window._urielMotes.push({ x: b.x + (Math.random() - 0.5) * b.w, y: b.y, vy: -(0.33 + Math.random() * 0.5), life: 1 });
                }
                barriers.splice(i, 1);
            }
        }
    }
}

// Death barrier (Protection): a stationary wall at the death spot,
// 1.2x Uriel's own body diameter wide, blocking everything player-side for
// 3s. Occlusion checks below are shared by skill-d.js, skill-f.js, and
// main.js's bullet / Overload Laser hit tests.
function _urielSpawnBarrier(enemy) {
    window._urielBarriers = window._urielBarriers || [];
    window._urielBarriers.push({
        x: enemy.x, y: enemy.y,
        w: enemy.size * 1.2, h: enemy.size * 0.9,
        life: 3000, maxLife: 3000,
    });
}

function _urielBarrierRect(b) {
    return { x0: b.x - b.w / 2, y0: b.y - b.h / 2, x1: b.x + b.w / 2, y1: b.y + b.h / 2 };
}

function _urielBarrierBlocksPoint(x, y) {
    const barriers = window._urielBarriers;
    if (!barriers || !barriers.length) return false;
    for (const b of barriers) {
        const r = _urielBarrierRect(b);
        if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return true;
    }
    return false;
}

// Liang-Barsky segment-vs-rect clip: true if the (x1,y1)-(x2,y2) segment
// crosses the barrier's rectangle anywhere along its length.
function _urielBarrierBlocksSegment(x1, y1, x2, y2) {
    const barriers = window._urielBarriers;
    if (!barriers || !barriers.length) return false;
    for (const b of barriers) {
        const r = _urielBarrierRect(b);
        let t0 = 0, t1 = 1;
        const dx = x2 - x1, dy = y2 - y1;
        const p = [-dx, dx, -dy, dy];
        const q = [x1 - r.x0, r.x1 - x1, y1 - r.y0, r.y1 - y1];
        let blocked = true;
        for (let k = 0; k < 4; k++) {
            if (p[k] === 0) {
                if (q[k] < 0) { blocked = false; break; }
            } else {
                const t = q[k] / p[k];
                if (p[k] < 0) { if (t > t1) { blocked = false; break; } if (t > t0) t0 = t; }
                else { if (t < t0) { blocked = false; break; } if (t < t1) t1 = t; }
            }
        }
        if (blocked) return true;
    }
    return false;
}
