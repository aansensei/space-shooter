// Pisces: Space Journey. (c) 2024 An Nguyen. Licensed under the MIT License.
// Dawn Herald uses simulation time and bounded reusable needle and effect pools.

function _dauCanTarget(e) {
    return !!(e && e.hp > 0 && !e._markedForDeath && !e._deathPhase && !e.inCoronation
        && !e._stealthed && !e.type.startsWith('enemy_bullet')
        && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && e.type !== 'embryo'
        && e.type !== 'thaelis_cocoon');
}

const _dauKnockbackMax = 256;

function _dauCanPush(e) {
    return e && e.hp > 0 && !e.type.startsWith('enemy_bullet')
        && e.type !== 'abyssal_chain' && e.type !== 'veilshroud_echo' && e.type !== 'thaelis_cocoon'
        && !e.inCoronation && !e._stealthed && !e._deathPhase && !e.dyingLaserPhase;
}

function _dauPush(e) {
    if (!_dauCanPush(e)) return;
    // Two kinds of enemy cannot keep a push, so they recoil and settle back:
    // True Form Goliath, who rewrites his position from the weave path every
    // frame, and anything without room for the whole push below the top edge.
    const recoil = (e.type === 'goliath' && e.phase === 'true_form') || e.y - e.size / 2 < DAU_KNOCKBACK_PX;
    for (let i = 0; i < _dauKnockbackMax; i++) {
        const k = window._dauKnockbacks[i];
        if (k.target) continue;
        k.target = e; k.age = 0; k.recoil = recoil;
        k.distance = DAU_KNOCKBACK_PX;
        e._dauPushFlashMs = DAU_KNOCKBACK_MS;
        return;
    }
}

function _dauAdvanceKnockback(deltaTime) {
    for (let i = 0; i < _dauKnockbackMax; i++) {
        const k = window._dauKnockbacks[i], e = k.target;
        if (!e) continue;
        if (!_dauCanPush(e) || enemies.indexOf(e) < 0) { e._dauLift = 0; k.target = null; continue; }
        if (k.recoil) {
            k.age += deltaTime;
            const rise = 1 - Math.min(1, k.age / DAU_KNOCKBACK_MS);
            const settle = Math.max(0, Math.min(1, (k.age - DAU_KNOCKBACK_MS) / DAU_KNOCKBACK_RECOVER_MS));
            // Overlapping crows add up, so the lift is rebuilt from zero each frame.
            if (e._dauLiftStamp !== window._dauClock) { e._dauLiftStamp = window._dauClock; e._dauLift = 0; }
            e._dauLift += k.distance * (1 - rise * rise) * (1 - settle * settle * (3 - 2 * settle));
            if (settle >= 1) k.target = null;
            continue;
        }
        const before = Math.min(1, k.age / DAU_KNOCKBACK_MS);
        k.age += deltaTime;
        const after = Math.min(1, k.age / DAU_KNOCKBACK_MS);
        const movement = k.distance * ((1 - before) * (1 - before) - (1 - after) * (1 - after));
        if (e.y > e.size / 2) e.y -= Math.min(movement, e.y - e.size / 2);
        if (after >= 1) k.target = null;
    }
}

// A recoil sits on top of the enemy's own position. _dauBeginFrame takes it off
// before anything moves and this puts the current lift back once the enemy loop
// is done, so no movement code ever reads or overwrites it.
function _dauEndFrame() {
    for (let i = 0; i < _dauKnockbackMax; i++) {
        const k = window._dauKnockbacks[i], e = k.target;
        if (!e || !k.recoil || e._dauLiftApplied || !e._dauLift) continue;
        e.y -= e._dauLift; e._dauLiftApplied = e._dauLift;
    }
}

function _dauClosest(x, y) {
    let target = null, best = Infinity;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!_dauCanTarget(e)) continue;
        const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
        if (d < best) { best = d; target = e; }
    }
    return target;
}

function _dauEmit(kind, x, y, life, scale = 1) {
    const fx = window._dauFx[window._dauFxCursor];
    window._dauFxCursor = (window._dauFxCursor + 1) % DAU_FX_MAX;
    fx.kind = kind; fx.x = x; fx.y = y; fx.age = 0; fx.life = life;
    fx.scale = scale;
}

function _dauAddNeedle(kind, x, y, target, star) {
    const list = window._dauNeedles;
    if (list.length >= DAU_FX_MAX) return;
    let needle = null;
    for (let i = 0; i < DAU_FX_MAX; i++) {
        if (!window._dauNeedlePool[i].active) { needle = window._dauNeedlePool[i]; break; }
    }
    if (!needle) return;
    needle.active = true; needle.kind = kind; needle.x = x; needle.y = y;
    needle.sx = x; needle.sy = y; needle.target = target; needle.age = 0;
    needle.angle = -Math.PI / 2; needle.star = star; needle.pinMs = 0;
    list.push(needle);
}

function _dauStarNeedles() {
    const top = window._dauStarTargets;
    top.length = 0;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!_dauCanTarget(e)) continue;
        let pos = 0;
        while (pos < top.length && top[pos].maxHp >= e.maxHp) pos++;
        if (pos >= DAU_STAR_NEEDLES) continue;
        if (top.length < DAU_STAR_NEEDLES) top.length++;
        for (let j = top.length - 1; j > pos; j--) top[j] = top[j - 1];
        top[pos] = e;
    }
    for (let i = 0; i < top.length; i++) {
        _dauAddNeedle(1, canvas.width * (0.20 + i * 0.10), 28 + (i % 3) * 22, top[i], i);
    }
}

function _dauPinAllowed(e) {
    return e.type !== 'egregor' && e.type !== 'dargruel' && e.type !== 'leviathan'
        && !(e.type === 'goliath' && e.phase === 'true_form')
        && !(e.type === 'marchosias' && e.arcBarrier && e.arcBarrier.hp > 0)
        && !(e.type === 'raphael' && e.raphaelInvulnerable) && !e._urielCCImmune
        && !(typeof _goliathDebuffImmune === 'function' && _goliathDebuffImmune(e));
}

const _dauReturnSource = { damage: 0, isTrueDamage: true, _noHitSfx: true, _statSrc: 'Golden Needle' };
const _dauStarSource = { damage: 0, isTrueDamage: true, _noHitSfx: true, _statSrc: 'Golden Needle' };

function _dauUpdateNeedles(deltaTime, currentTime) {
    const list = window._dauNeedles;
    for (let i = list.length - 1; i >= 0; i--) {
        const n = list[i];
        n.age += deltaTime;
        let target = n.target;
        if (n.kind === 2) {
            n.pinMs -= deltaTime;
            if (target && target.hp > 0 && n.pinMs > 0) { n.x = target.x; n.y = target.y; continue; }
        } else {
            if (!_dauCanTarget(target) || enemies.indexOf(target) < 0) {
                target = n.kind === 0 ? _dauClosest(n.x, n.y) : null;
                n.target = target;
            }
            if (target) {
                if (n.kind === 1 && n.age < 350) continue;
                const dx = target.x - n.x, dy = target.y - n.y, dist = Math.hypot(dx, dy);
                const travel = (n.kind === 0 ? 1.4 : 3.6) * deltaTime;
                n.angle = Math.atan2(dy, dx);
                if (dist > travel + target.size * 0.25) {
                    n.x += dx / dist * travel; n.y += dy / dist * travel;
                    continue;
                }
                const source = n.kind === 0 ? _dauReturnSource : _dauStarSource;
                source.damage = (n.kind === 0 ? DAU_NEEDLE_RETURN_ATK : DAU_STAR_NEEDLE_ATK) * player.atk;
                dealDamage(target, source);
                _dauEmit(1, target.x, target.y, 360);
                if (window.AudioMgr) window.AudioMgr.playSfxAt('blood-arrow-impact', target.x, target.y);
                if (n.kind === 1 && _dauPinAllowed(target)) {
                    target._rootEnd = currentTime + DAU_PIN_MS;
                    target._dauPinEnd = target._rootEnd;
                    n.kind = 2; n.pinMs = DAU_PIN_MS; n.x = target.x; n.y = target.y;
                    continue;
                }
            }
        }
        n.active = false; n.target = null;
        list[i] = list[list.length - 1]; list.pop();
    }
}

function _dauCanReceiveDaybreak(e) {
    if (!e || e.hp <= 0) return false;
    if (e.type && e.type.startsWith('enemy_bullet')) return false;
    if (e.type === 'abyssal_chain' || e.type === 'veilshroud_echo' || e.type === 'embryo') return false;
    if (e.inCoronation) return false;
    if (e.type === 'goliath' && typeof _goliathDebuffImmune === 'function' && _goliathDebuffImmune(e)) return false;
    return true;
}

// A turned skill usually reaches its caster before the ring does, so it carries
// the Daybreak evade rule itself, and it passes ordinary Iron Body layers.
const _dauReflectSource = { damage: 0, percentDamage: 0, isTrueDamage: true, _noHitSfx: true, _bypassIronBody: true, _dauReflect: true, _statSrc: 'Golden Needle: Reflect' };

function _dauReflectOwner(kind, p) {
    return kind === 'raphael' ? p.enemy : kind === 'dargruel' ? p.ownerRef : p.owner;
}

function _dauReflectEligible(kind, p) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p._jokerState) return false;
    if (p.life !== undefined && p.life <= 0) return false;
    if (kind === 'marchosias' && (p.delay > 0 || p.active === false)) return false;
    if (kind === 'raphael' && p.phase !== 'launch') return false;
    if (kind === 'dargruel' && (p.type !== 'abyssal_chain' || p.hp <= 0)) return false;
    const owner = _dauReflectOwner(kind, p);
    // Only the native Verdict and Meteor arrays accept a Goliath owner.
    return kind === 'verdict' || kind === 'meteor' || !owner || owner.type !== 'goliath';
}

function _dauAddReflection(kind, p) {
    const list = window._dauReflections;
    if (list.length >= DAU_FX_MAX) return false;
    for (let i = 0; i < DAU_FX_MAX; i++) {
        const r = window._dauReflectPool[i];
        if (r.active) continue;
        const nativeSpeed = kind === 'raphael' ? Math.max(p.speed || 0, RAPHAEL_WISDOM_LAUNCH_SPEED_MAX) / 16.67
            : Math.hypot(p.vx || 0, p.vy || 0) / (kind === 'meteor' || kind === 'verdict' ? 1000 : 16.67);
        r.active = true; r.kind = kind; r.x = p.x; r.y = p.y; r.age = 0;
        r.target = _dauReflectOwner(kind, p); r.speed = Math.max(1.4, nativeSpeed * 1.5);
        r.angle = Math.atan2(-(p.vy || Math.sin(p.ang || 0)), -(p.vx || Math.cos(p.ang || 0)));
        list.push(r);
        _dauEmit(4, p.x, p.y, 300, kind === 'verdict' ? 1.6 : 1);
        return true;
    }
    return false;
}

function _dauReflectArray(ring, previousRadius, list, kind) {
    if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if (!_dauReflectEligible(kind, p) || ring._hitEnemies.has(p)) continue;
        const dx = p.x - ring.x, dy = p.y - ring.y;
        if (dx * dx + dy * dy > ring.radius * ring.radius) { ring._ahead.add(p); continue; }
        ring._hitEnemies.add(p);
        if (previousRadius !== 0 && !ring._ahead.has(p)) continue;
        const success = Math.random() < DAU_REFLECT_CHANCE;
        if (!success || ring.reflected >= DAU_REFLECT_MAX || !_dauAddReflection(kind, p)) continue;
        ring.reflected++;
        for (let j = i; j < list.length - 1; j++) list[j] = list[j + 1];
        list.pop();
    }
}

function _dauUpdateReflections(deltaTime) {
    const list = window._dauReflections;
    for (let i = list.length - 1; i >= 0; i--) {
        const r = list[i];
        r.age += deltaTime;
        let target = r.target;
        if (!_dauCanTarget(target) || enemies.indexOf(target) < 0) {
            target = _dauClosest(r.x, r.y); r.target = target;
        }
        if (target) {
            const dx = target.x - r.x, dy = target.y - r.y, dist = Math.hypot(dx, dy);
            const travel = r.speed * deltaTime;
            r.angle = Math.atan2(dy, dx);
            if (dist > travel + target.size * 0.25) {
                r.x += dx / dist * travel; r.y += dy / dist * travel;
                continue;
            }
            const def = DAU_REFLECT[r.kind];
            _dauReflectSource.damage = def.atk * player.atk;
            _dauReflectSource.percentDamage = def.percentDamage;
            dealDamage(target, _dauReflectSource);
            _dauEmit(r.kind === 'verdict' ? 6 : 5, target.x, target.y, r.kind === 'verdict' ? 850 : 600);
            if (window.AudioMgr) window.AudioMgr.playSfxAt('blood-arrow-impact', target.x, target.y);
            if (r.kind === 'verdict' && typeof _setShake === 'function' && (window._gfxLevel || 0) < 3) _setShake(8, 250);
        }
        r.active = false; r.target = null;
        list[i] = list[list.length - 1]; list.pop();
    }
}

function _dauHasDaybreak(enemy) {
    return !!(enemy && enemy._dauCrowId === window._dauCrowId && window._dauDaybreakMs > 0);
}

// Killing a Daybreak enemy brings the next crow closer, up to a cap per crow.
function _dauOnEnemyKill(e) {
    if (!_dauHasDaybreak(e) || window._dauCrowRefund >= DAU_KILL_REFUND_MAX_MS) return;
    const gain = Math.min(DAU_KILL_REFUND_MS, DAU_KILL_REFUND_MAX_MS - window._dauCrowRefund);
    window._dauCrowRefund += gain;
    window._dauCrowTimer += gain;
}

function _dauTriggerCrow() {
    window._dauCrowTimer = 0;
    window._dauCrowRefund = 0;
    window._dauCrowCounter = (window._dauCrowCounter || 0) + 1;
    window._dauCrowId = window._dauCrowCounter;
    window._dauDaybreakMs = DAU_DAYBREAK_MS;
    window._dauBurstMs = 0;
    window._dauBurstX = player.x; window._dauBurstY = player.y;
    if (window.AudioMgr) window.AudioMgr.playSfx('dau-crow');
    if (typeof _setShake === 'function' && (window._gfxLevel || 0) < 3) _setShake(7, 240);
    if (_hasBuff('tu_hoa_cham')) _dauStarNeedles();

    const px = (typeof player !== 'undefined' && Number.isFinite(player.x))
        ? player.x
        : ((typeof canvas !== 'undefined' && canvas.width) ? canvas.width / 2 : 400);
    const py = (typeof player !== 'undefined' && Number.isFinite(player.y))
        ? player.y
        : ((typeof canvas !== 'undefined' && canvas.height) ? canvas.height / 2 : 300);
    const maxR = (typeof canvas !== 'undefined' && canvas.width && canvas.height)
        ? Math.hypot(canvas.width, canvas.height)
        : 1000;

    window._dauRings = window._dauRings || [];
    if (window._dauRings.length >= DAU_FX_MAX) window._dauRings.shift();
    window._dauRings.push({
        crowId: window._dauCrowId,
        x: px,
        y: py,
        radius: 0,
        maxRadius: maxR,
        returns: 0,
        reflected: 0,
        _hitEnemies: new Set(),
        _ahead: new Set(),
    });
}

function _dauBeginFrame(deltaTime, currentTime) {
    if (typeof _hasBuff !== 'function' || !_hasBuff('kim_ke_bao_hieu')
        || (typeof gameState !== 'undefined' && gameState !== 'playing')
        || (typeof gamePaused !== 'undefined' && gamePaused)
        || (typeof window !== 'undefined' && (window._sigilPicker || window._kanadeCutscene))) return;

    window._dauDaybreakMs = Math.max(0, (window._dauDaybreakMs || 0) - deltaTime);
    window._dauClock += deltaTime;
    _dauAdvanceKnockback(deltaTime);
    window._dauBurstMs += deltaTime;
    for (let i = 0; i < DAU_FX_MAX; i++) {
        const fx = window._dauFx[i];
        if (fx.age < fx.life) fx.age += deltaTime;
    }
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e._dauSunMs > 0) e._dauSunMs = Math.max(0, e._dauSunMs - deltaTime);
        if (e._dauFlashMs > 0) e._dauFlashMs = Math.max(0, e._dauFlashMs - deltaTime);
        if (e._dauPushFlashMs > 0) e._dauPushFlashMs = Math.max(0, e._dauPushFlashMs - deltaTime);
        if (e._dauLiftApplied) { e.y += e._dauLiftApplied; e._dauLiftApplied = 0; }
        if (e._dauRevealPending && !e._stealthed) {
            e._dauRevealPending = false; _dauEmit(2, e.x, e.y, 600);
        }
    }
    window._dauCrowTimer = (window._dauCrowTimer || 0) + deltaTime;
    if (window._dauCrowTimer >= DAU_CROW_INTERVAL_MS) {
        const remainder = window._dauCrowTimer % DAU_CROW_INTERVAL_MS;
        _dauTriggerCrow();
        window._dauCrowTimer = remainder;
    }

    const rings = window._dauRings;
    _dauUpdateNeedles(deltaTime, currentTime);
    _dauUpdateReflections(deltaTime);
    if (!rings || !rings.length) return;

    for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        const previousRadius = ring.radius;
        ring.radius += DAU_RING_SPEED * deltaTime;
        if (_hasBuff('tu_hoa_cham')) {
            _dauReflectArray(ring, previousRadius, marchosiasBlades, 'marchosias');
            _dauReflectArray(ring, previousRadius, window._urielHolySwords, 'uriel');
            _dauReflectArray(ring, previousRadius, raphaelWisdomOrbs, 'raphael');
            _dauReflectArray(ring, previousRadius, enemies, 'dargruel');
            _dauReflectArray(ring, previousRadius, window._goliathMeteors, 'meteor');
            _dauReflectArray(ring, previousRadius, window._goliathOrbs, 'verdict');
        }

        if (typeof enemies !== 'undefined') {
            for (let j = 0; j < enemies.length; j++) {
                const e = enemies[j];
                if (!e || ring._hitEnemies.has(e)) continue;
                const d = Math.hypot(e.x - ring.x, e.y - ring.y);
                if (d > ring.radius) { ring._ahead.add(e); continue; }
                ring._hitEnemies.add(e);
                // The ring only sweeps what it has seen ahead of its edge. Anything
                // first seen behind the edge spawned after the ring had passed.
                if (previousRadius === 0 || ring._ahead.has(e)) {
                    if (e.type && e.type.startsWith('enemy_bullet')) {
                        if (e.hp <= 0) continue;
                        e.hp = 0;
                        _dauEmit(0, e.x, e.y, 420);
                        if (_hasBuff('tu_hoa_cham') && ring.returns < DAU_NEEDLE_RETURN_MAX) {
                            ring.returns++;
                            _dauAddNeedle(0, e.x, e.y, _dauClosest(e.x, e.y), -1);
                        }
                    } else {
                        _dauPush(e);
                        if (_dauCanPush(e)) _dauEmit(3, e.x, e.y, 420, Math.max(0.7, e.size / 60));
                        if (e.type === 'uriel' && e._camoPhase === 'stealthed') {
                            e._camoTimer = Math.max(e._camoTimer || 0, 1750);
                            e._dauRevealPending = true;
                        }
                        if (_dauCanReceiveDaybreak(e) && ring.crowId === window._dauCrowId) {
                            e._dauCrowId = ring.crowId;
                            e._dauSunMs = window._dauDaybreakMs + 300;
                            e._dauFlashMs = 180;
                        }
                    }
                }
            }
        }

        if (ring.radius >= ring.maxRadius) {
            rings.splice(i, 1);
        }
    }
}

function _dauReset() {
    window._dauCrowTimer = 0;
    window._dauCrowRefund = 0;
    window._dauCrowCounter = 0;
    window._dauCrowId = 0;
    window._dauDaybreakMs = 0;
    window._dauClock = 0; window._dauBurstMs = 2000;
    window._dauBurstX = 0; window._dauBurstY = 0; window._dauFxCursor = 0;
    window._dauRings = window._dauRings || []; window._dauRings.length = 0;
    window._dauNeedles = window._dauNeedles || []; window._dauNeedles.length = 0;
    window._dauStarTargets = window._dauStarTargets || []; window._dauStarTargets.length = 0;
    window._dauReflections = window._dauReflections || []; window._dauReflections.length = 0;
    if (!window._dauReflectPool) {
        window._dauReflectPool = [];
        for (let i = 0; i < DAU_FX_MAX; i++) window._dauReflectPool.push({ active: false, kind: '', x: 0, y: 0, age: 0, speed: 0, angle: 0, target: null });
    }
    for (let i = 0; i < DAU_FX_MAX; i++) { window._dauReflectPool[i].active = false; window._dauReflectPool[i].target = null; }
    if (!window._dauFx) {
        window._dauFx = []; window._dauNeedlePool = [];
        for (let i = 0; i < DAU_FX_MAX; i++) {
            window._dauFx.push({ kind: 0, x: 0, y: 0, age: 0, life: 0, scale: 1 });
            window._dauNeedlePool.push({ active: false, target: null });
        }
    }
    if (!window._dauKnockbacks) {
        window._dauKnockbacks = [];
        for (let i = 0; i < _dauKnockbackMax; i++) window._dauKnockbacks.push({ target: null, age: 0, distance: 0, recoil: false });
    }
    for (let i = 0; i < _dauKnockbackMax; i++) window._dauKnockbacks[i].target = null;
    for (let i = 0; i < DAU_FX_MAX; i++) {
        window._dauFx[i].life = 0;
        window._dauNeedlePool[i].active = false; window._dauNeedlePool[i].target = null;
    }
    if (typeof enemies !== 'undefined') {
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i]) {
                enemies[i]._dauCrowId = 0; enemies[i]._dauSunMs = 0;
                enemies[i]._dauFlashMs = 0; enemies[i]._dauRevealPending = false;
                enemies[i]._dauPushFlashMs = 0; enemies[i]._dauLift = 0; enemies[i]._dauLiftApplied = 0;
                if (enemies[i]._rootEnd === enemies[i]._dauPinEnd) enemies[i]._rootEnd = 0;
                enemies[i]._dauPinEnd = 0;
            }
        }
    }
}

_dauReset();
